const axios = require('axios');
var cheerio = require('cheerio');
var winston = require('winston');

const moment = require('moment');
const puppeteer = require('puppeteer');
require('winston-daily-rotate-file');

const { combine, timestamp, printf } = winston.format;

let fs = require('fs');
const path = require('path');
let browserPage;
let Browser;

const WIDTH = 1900;
const HEIGHT = 1200;


var transport = new winston.transports.DailyRotateFile({
    filename: 'hitman-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  });

  const logFormat = printf(info => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
  });

  var logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        logFormat,
      ),
    transports: [
      transport
    ]
  });

/**
 * search https://search.shopping.naver.com/search/all? query=%EC%B2%9C%EC%97%B0+%ED%94%84%EB%A1%9C%ED%8F%B4%EB%A6%AC%EC%8A%A4+%EB%89%B4%EC%A7%88%EB%9E%9C%EB%93%9C &cat_id=&frm=NVSHATC
 * paging https://search.shopping.naver.com/search/all?frm=NVSHATC&origQuery=%EC%B2%9C%EC%97%B0%20%ED%94%84%EB%A1%9C%ED%8F%B4%EB%A6%AC%EC%8A%A4%20%EB%89%B4%EC%A7%88%EB%9E%9C%EB%93%9C &pagingIndex=2&pagingSize=40&productSet=total&query=%EC%B2%9C%EC%97%B0%20%ED%94%84%EB%A1%9C%ED%8F%B4%EB%A6%AC%EC%8A%A4%20%EB%89%B4%EC%A7%88%EB%9E%9C%EB%93%9C&sort=rel&timestamp=&viewType=list
 */

const HEADER = {
    'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
}

function loadConfig( filePath ){
    logger.debug('loading config: '+filePath);
    
	var data = fs.readFileSync(__dirname + path.sep + param,'utf8');
	try{
        logger.debug( data);
		return JSON.parse(data);
	}catch(e){
		logger.error("can't parse config.cfg. use default value:");
        logger.error(e.message);
        return {};
	}
}

async function initBrowser(){
    const options = {
       headless: false,
      slowMo: true,
      args: [
//        `--window-size=${WIDTH},${HEIGHT}`,
        '--start-maximized' ,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    };
    const device = puppeteer.devices['iPhone X'];
    
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setViewport({
    'width':WIDTH,
    'height':HEIGHT
    }); 
    Browser = browser;
    return page;
}

async function closeBrowser(){
    let pages = await Browser.pages();

    for( i=0; i < pages.length ;i++){
        await pages[i].close();
    }
    await Browser.close();
}

async function autoScroll(page){
    
    await page.evaluate(async (timeout) => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 1000);
        });
    });
}

async function naverLogin(user, pwd){
    logger.debug(`trying to login ${user} ${pwd}`)
    const loginUrl = "https://nid.naver.com/nidlogin.login";
    
    const naver_id = user;
    const naver_pw = pwd;
    
    await browserPage.goto(loginUrl);
    
    await browserPage.evaluate((id, pw) => {
        document.querySelector('#id').value = id;
        document.querySelector('#pw').value = pw;
    }, naver_id, naver_pw);
    
    await browserPage.click('.btn_global');
    await browserPage.waitForNavigation();

}

async function puppeteer_findItem( keyword, categoryMid, pageIdx ){
    logger.debug(`findItem : key: ${keyword} mid: ${categoryMid} idx:${pageIdx}`);
    let found = false;

    let url = '';
    if( !pageIdx ){
        url = `https://search.shopping.naver.com/search/all?query=${keyword}&cat_id=&frm=NVSHATC`;
    }else{
        url= `https://search.shopping.naver.com/search/all?frm=NVSHATC&origQuery=${keyword}&pagingIndex=${pageIdx}&pagingSize=20&productSet=total&query=${keyword}&sort=rel&timestamp=&viewType=list`
    }

    await browserPage.goto( url)
    await autoScroll(browserPage);

    const linkList = await browserPage.evaluate(() => {
                                            let els = Array.from(document.querySelectorAll('[class^="basicList_link"]'));
                                            
                                            let links = els.map( el =>{
                                                el.id = 'link_'+ Math.floor(Math.random() * 1000); 
                                                
                                              return{
                                               "nclick" : el.getAttribute('data-nclick'),
                                               "href" : el.getAttribute('href'),
                                               id: el.id
                                              }
                                            })
                                            return links;
                                        }
                                        );


    for( i = 0; i < linkList.length ; i++){
        el = linkList[i];
        if( !el.nclick )
            continue;
        if( el  && el.nclick.indexOf(categoryMid) > 0 ){
            logger.debug(`click to  ${el.nclick} id:${el.id}`);
            await browserPage.click("#"+el.id);
            
            let pages = await Browser.pages();

            let npage = pages[pages.length-1];
            await npage.setViewport({
                width:WIDTH,
                height:HEIGHT
                });             
            try{ 
                await npage.waitForNavigation();
                await autoScroll(npage,1500);
            }catch(e){}
            await npage.close();
            return;
        }
    }

    logger.info("can't find ");
}


(async function main(){
	var options={};
	
    param = process.argv[2] || 'conf.cfg';

    if( !process.argv[2]){
	 param = "conf" + path.sep + param;
    } 

    options = loadConfig( param );
    
    if( !options.items || options.items.length == 0 ){
        logger.error("can't find item");
        logger.error( JSON.stringify(options));
        return;
    }

    initBrowser().then(
      
        async (init) =>{
            browserPage = init;

          for( let user of options.users ){
              logger.info(`login with id:${user.id} pwd:${user.pwd} `)
              await  naverLogin(user.id,user.pwd);

                for( let i of options.items ){
                    let retry = i.count || 10;
                    for( j = 0 ; j < retry; j++){
                        logger.info(`trying to find  ${i.keyword} ${j}`  );
                        await puppeteer_findItem( encodeURI( i.keyword.replaceAll(' ','+') ), i.ca_mid);
                    }
                 }

                const client = await browserPage.target().createCDPSession();
                 await client.send('Network.clearBrowserCookies');
                await client.send('Network.clearBrowserCache');
            }            
             closeBrowser();
             process.exit();
        }
    );
})();


//뉴질랜드 플로 폴리 폴리스 1000mg 90캡슐