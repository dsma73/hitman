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

const WIDTH = 1200;
const HEIGHT = 900;

var transport = new winston.transports.DailyRotateFile({
    filename: 'woo-%DATE%.log',
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



const HEADER = {
    'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
}

function loadConfig( filePath ){
    logger.debug('loading config: '+filePath);
    
	var data = fs.readFileSync(__dirname + path.sep + param,'utf8');
	try{
        logger.info( data);
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
        `--window-size=${WIDTH},${HEIGHT}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    };
    const device = puppeteer.devices['iPhone X'];
    
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setViewport({
    width:WIDTH,
    height:HEIGHT
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
    await page.evaluate(async () => {
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
            }, 100);
        });
    });
}


async function loadPage( ){
    
    let pages = await Browser.pages();
    let npage = pages[pages.length-1];

    const client = await npage.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    let url = `https://map.naver.com/v5/search/%EC%84%B1%EB%82%A8%EC%84%A4%EB%B9%84/place/31022964?placePath=%3Fentry=pll%26from=nx%26fromNxList=true&c=14154930.9410483,4501436.4309725,15,0,0,0,dh`;

    try{
        await npage.goto( url);
        await npage.waitForNavigation();
 
        await new Promise((r,err) =>{
            setTimeout(()=>{
                logger.debug("close page");
                r();
            },3000)
        });

    }catch(e){return;}
  
    return;
}


(async function main(){
	var options={};
	
    param = process.argv[2] || 'woo.cfg';

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
 
            for( let i of options.items ){
                let retry = i.count || 100;
                for( j = 0 ; j < retry; j++){
                    logger.info(`try to load ${j}`)
                    await loadPage( );
                }
               
             }    
             closeBrowser();
             process.exit();
        }
    );


})();



