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
    logger.debug('autoScroll');
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
            }, _delay || 700);
        });
    },delay);
    logger.debug('auto scroll end')
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

async function visitBlogAndClick( browserPage, blogId, clickLatest, userAgent ){
    let url = `https://blog.naver.com/${blogId}`;
    if( userAgent )
        await browserPage.setUserAgent(userAgent);
    try{
        await browserPage.goto(url);
    }catch(e){
        return;
    }
    await browserPage.waitForNavigation();
    await autoScroll(browserPage,600);

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

    await frame.click("#"+el.id,{button: 'middle'});
          
    let pages = await Browser.pages();
    let npage = pages[pages.length-1];
    await npage.setViewport({
        width:WIDTH,
        height:HEIGHT
        });             

    try{ 
//        await npage.waitForNavigation();
        await autoScroll(npage,600);
    }catch(e){
        logger.error('error in auto scrolling detail view'+e);
    }

    await npage.close();
}

async function findAndClick( browserPage, keyword, categoryMid, userAgent, delay ){
    logger.debug(`findItem : key: ${keyword} mid: ${categoryMid} ${userAgent}`);
    
    if( userAgent )
        await browserPage.setUserAgent(userAgent);
    let url = '';

    url = `https://search.shopping.naver.com/search/all?query=${keyword}&cat_id=&frm=NVSHATC`;
    

    await browserPage.goto( url);
//    await browserPage.waitForNavigation();
    await autoScroll(browserPage,delay);

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
                await autoScroll(npage,delay);
            }catch(e){}
            await npage.close();
            return;
        }
    }

    logger.info("can't find ");
}

module.exports = {
    initBrowser,
    closeBrowser,
    autoScroll,
    findAndClick,
    clearCookie,
    visitUrl,
    visitBlogAndClick
}