const puppeteer = require('puppeteer');
const logger = require('./logger');

let Browser;

const WIDTH = 1900;
const HEIGHT = 1200;

const HEADER = {
    'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
}

async function initBrowser(){
    const options = {
       headless: false,
      slowMo: true,
      args: [
//        `--window-size=${WIDTH},${HEIGHT}`,
        '--start-maximized' ,
        '--single-process', 
        '--no-zygote',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    };
    const device = puppeteer.devices['iPhone X'];
    
    const browser = await puppeteer.launch(options);
    let pages = await browser.pages();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.setViewport({
    'width':WIDTH,
    'height':HEIGHT
    }); 
    Browser = browser;
    return page;
}

async function clearCookie(_page){
    try{
        const client = await _page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
    }catch(e){}
}

async function closeBrowser(){
    let pages = await Browser.pages();

    for( i=0; i < pages.length ;i++){
        await pages[i].close();
    }
    await Browser.close();
}

async function autoScroll(page,delay){
   
    await page.evaluate(async (_delay) => {
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
            }, _delay || 500);
        });
    },delay || 500);

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

async function visitUrl( url,opt){
    opt = opt || {};

    opt.timeout = opt.timeout || 1000 * 3;
    let npage = await Browser.newPage();

    if( opt.userAgent )
        await npage.setUserAgent(opt.userAgent);

    await npage.goto( url);

    if( opt.shouldScroll ){
        await autoScroll(npage);
    }
    setTimeout(()=> npage.close(),opt.timeout)
}

async function sleepBrowser(delayTime){
    delayTime = delayTime || 10;
    await new Promise((resolve, reject) => 
        setTimeout(()=>resolve(),1000 * delayTime)
    ) ;
}

async function visitBlogAndClick( browserPage, blogId, clickLatest, userAgent,delay ){
    delay = delay || 1000;

    let url = `https://blog.naver.com/${blogId}`;
    if( userAgent )
        await browserPage.setUserAgent(userAgent);
    try{
        await browserPage.goto(url);
    }catch(e){
        return;
    }
    await autoScroll(browserPage,delay);

    const linkList = await browserPage.evaluate(() => {
        let els=[];
        document.querySelectorAll('iframe').forEach( item =>{
                let thumbnails = item.contentWindow.document.body.querySelectorAll('#PostThumbnailAlbumViewArea > ul > li> a');

                if( thumbnails && thumbnails.length > 0){
                    els = Array.from( thumbnails);
                }
            }
        )

        let links = els.map( el =>{
            el.id = 'link_'+ Math.floor(Math.random() * 1000); 
            
          return{
           "href" : el.getAttribute('href'),
           id: el.id
          }
        });
        return links;
    }
    );

    let el = linkList[0];

    if( !clickLatest ){
        el =linkList[Math.floor(Math.random() * linkList.length)];
    }

    logger.debug(`click to ${el.id}`);

    const frame = await browserPage.frames().find(frame => frame.name() === 'mainFrame');
    await frame.click("#"+el.id);
    try{ 
          await browser.waitForNavigation();
          await autoScroll(browserPage,delay);
    }catch(e){
        await new Promise((resolve, reject) => 
        setTimeout(()=>resolve(),1000*3)
        ) ;
    }

    return;

}

function isMobile(userAgent) {
    return /iPhone|iPad|iPod|Android/i.test(userAgent);
};

async function findAndClick( browserPage, keyword, categoryMid, userAgent, delay ){

    const npage = await Browser.newPage();
    logger.info(`findItem : key: ${keyword} mid: ${categoryMid} ${userAgent}`);

    let url = '';
    let selector;
    let attribute="";

    if( userAgent ){
        await npage.setUserAgent(userAgent);
        if( isMobile(userAgent)){
            url = `https://m.shopping.naver.com/`;    
            const mobile = puppeteer.devices['iPhone X']
            await npage.emulate(mobile)
        }else{
            url = `https://shopping.naver.com/`;
            await npage.setViewport({width:1800, height:1100})
//            await npage.waitFor(1000);
        }
    }
    try{
        await npage.goto( url);
        await sleepBrowser(1);
    }catch(e){
        logger.error("can't go to "+url +" reason: "+e.message);
        return "";
    }

    await npage.focus('[name="query"]');    
    await npage.evaluate((_keyword) => {
        document.querySelector("[name='query']").value = _keyword ;
    }, keyword);


    await sleepBrowser(1)

    if( isMobile(userAgent)){
        await npage.keyboard.press("Enter");
    }else{
        await npage.click("[_clickcode='search']");
    }
    await sleepBrowser(4)

    let linkList;

    if( isMobile(userAgent ) ){
        linkList = await npage.evaluate(() => {
                                                let els = Array.from(document.querySelectorAll('[class^="product_info_main"]'));
                                                
                                                let links = els.map( el =>{
                                                    el.id = 'link_'+ Math.floor(Math.random() * 1000); 
                                                    
                                                    parent = el.parentElement;
                                                return{
                                                    nclick : el.getAttribute('data-nclick'),
                                                    href : el.getAttribute('href'),
                                                    id: el.id
                                                }
                                                })
                                                return links;
                                            }
                                            );
    }else{
        linkList = await npage.evaluate(() => {
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
    }



    for( i = 0; i < linkList.length ; i++){
        el = linkList[i];
        if( !el.nclick )
            continue;
        if( el  && el.nclick.indexOf(categoryMid) >= 0 ){
            logger.debug(`click to  ${el.nclick} id:${el.id}`);

            await npage.evaluate((_id)=>{
                let el = document.querySelector('#'+_id);
                el.scrollIntoView();
            },el.id);
        

            await npage.focus("#"+el.id);
            await sleepBrowser(1);
            await npage.click("#"+el.id);

            await autoScroll(npage,delay);

            if( !isMobile(userAgent)){
                await sleepBrowser(1);
                let pages = await Browser.pages();                
                let lastpage = pages[pages.length-1];
                await autoScroll(lastpage, delay);
                await lastpage.close();            
            }
                break;
            }
    }
    try{
        await npage.close();
    }catch(e){

    }
    return "";
}



async function clearBrowser(){
    try{
      logger.debug(`trying to release IP `);
  
      ps.lookup({
        command: 'Chromium',
        }, function(err, resultList ) {
        if (err) {
            throw new Error( err );
        }
     
        resultList.forEach(function( proc ){
            if( proc ){
                process.kill(proc.pid,SIGINT);
            }
        });
    });
  
    }catch(e){}
  
  }

module.exports = {
    initBrowser,
    closeBrowser,
    autoScroll,
    findAndClick,
    clearCookie,
    visitUrl,
    visitBlogAndClick,
    clearBrowser
}