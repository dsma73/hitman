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
//    try{
    await npage.goto( url);
//    await npage.waitForNavigation();

    if( opt.shouldScroll ){
        await autoScroll(npage);
    }
    setTimeout(()=> npage.close(),1000*2)
  // }catch(e){
  //      logger.error(e);
  //      npage.close();
   //     Promise.resolve();
   // }

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
        
    /*
    let pages = await Browser.pages();
    let npage = pages[pages.length-1];
    await npage.setViewport({
        width:WIDTH,
        height:HEIGHT
        });             

    try{ 
//        await npage.waitForNavigation();
        await autoScroll(npage,delay);
    }catch(e){
        logger.error('error in auto scrolling detail view'+e);
        await new Promise((resolve, reject) => 
                setTimeout(()=>resolve(),1000*3)
            );
    }

    await npage.close();

*/



}

function isMobile(userAgent) {
    return /iPhone|iPad|iPod|Android/i.test(userAgent);
};

async function findAndClick( browserPage, keyword, categoryMid, userAgent, delay ){
    logger.debug(`findItem : key: ${keyword} mid: ${categoryMid} ${userAgent}`);

    let url = '';
    let selector;
    let attribute="";

    if( userAgent ){
        await browserPage.setUserAgent(userAgent);
        if( isMobile(userAgent)){
            url = `https://m.search.naver.com/search.naver?sm=mtb_hty.top&where=m&query=${keyword}`;    

        }else{
            url = `https://search.shopping.naver.com/search/all?query=${keyword}&cat_id=&frm=NVSHATC`;
        }
    }
    try{
        await browserPage.goto( url);
    }catch(e){
        logger.error("can't go to "+url +" reason: "+e.message);
        return;
    }

    if( isMobile(userAgent)){
        await new Promise((resolve, reject) => 
            setTimeout(()=>resolve(),1000*3)
        ) ;
    }else{
        await autoScroll(browserPage,delay);
    }

    let linkList;

    if( isMobile(userAgent ) ){
        linkList = await browserPage.evaluate(() => {
                                                let els = Array.from(document.querySelectorAll('.product'));
                                                
                                                let links = els.map( el =>{
                                                    el.id = 'link_'+ Math.floor(Math.random() * 1000); 
                                                    
                                                    parent = el.parentElement;
                                                return{
                                                    nclick : parent.getAttribute('data-nvmid'),
                                                    href : el.getAttribute('href'),
                                                    id: el.id
                                                }
                                                })
                                                return links;
                                            }
                                            );
    }else{
        linkList = await browserPage.evaluate(() => {
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
            await browserPage.focus("#"+el.id);
            await browserPage.click("#"+el.id);
            
            let pages = await Browser.pages();

            let npage = pages[pages.length-1];
            await npage.setViewport({
                width:WIDTH,
                height:HEIGHT
                });             

            await autoScroll(browserPage,delay);

            if( isMobile(userAgent)){

            }else{
                await npage.close();            
            }
                return;
            }
    }
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