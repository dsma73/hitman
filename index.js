const axios = require('axios');
var winston = require('winston');
const naverService = require('./src/naverService')
const path = require('path');
const os = require('os');
const fs = require('fs');
const execa = require('execa');
const Promise = require('bluebird');
const which = require('which');
const prompt = require('prompt');
const logger = require('./src/logger');
const ListVPNs = require('./src/api');
const filePath = path.join(os.tmpdir(), 'openvpnconf');
const puppeteer = require('puppeteer');
const easyVpn = require('./src/easyvpn');

function loadConfig( filePath ){
    logger.debug('loading config: '+filePath);
    
	var data = fs.readFileSync(__dirname + path.sep + param,'utf8');
	try{
        logger.debug( data);
		return JSON.parse(data);
	}catch(e){
		logger.error("can't parse config.cfg. use default value:");
        logger.error(e);
        return {};
	}
}

function filter(vpns){
    return vpns.filter(vpn =>{
  
          return vpn.countryNames.indexOf('kr') !== -1;
        }
       );
  };

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

    let vpns;
    
    try{
         vpns = await ListVPNs(options.proxy); 
        const countries = Array.from(new Set(vpns.map(vpn => vpn.countryShort)));
        vpns = filter(vpns);
        logger.info(`Available proxies :  ${vpns.length}`)
        vpns = vpns.sort((a, b) => (b.score - a.score));
    }catch(e){
        logger.error("can't connect VPN");
        logger.error(e.message);
        process.exit();
        return;
    }
    await easyVpn.disconnect();
    browserPage = await naverService.initBrowser();
    const FIRST_URL = "https://map.naver.com/v5/search/%EC%84%B1%EB%82%A8%EC%84%A4%EB%B9%84/place/31022964?placePath=%3Fentry=pll%26from=nx%26fromNxList=true&c=14154930.9410483,4501436.4309725,15,0,0,0,dh"

    for( let vpnIndex = 0 ; vpnIndex < vpns.length ; vpnIndex++){
        let vpn = vpns[ vpnIndex ];
        logger.info(`trying to get IP from ${vpnIndex+1}th proxy. ${vpn.ip} ${vpn.countryShort}`);
        try{
            await easyVpn.connect(vpn);
            logger.info(`IP changing was completed`);
        }catch(e){
            logger.error(e);
            logger.error(`can't connect VPN ${vpn.ip}`);
            continue;
        }

        for( let i=0 ; i < options.items.length; i++){
            let optionItem = options.items[i];
            let retry = i.count || 1;
            for( j = 0 ; j < retry; j++){
                try{
                    for( let k = 0 ; k < options.user_agents.length ; k++){
                        let userAgentString = options.user_agents[k];
                        let opt ={
                            shouldScroll:true,
                            userAgent:userAgentString
                        }
                        logger.info(`trying to find  [${optionItem.keyword}] with ${userAgentString}`  );
                        await naverService.findAndClick( browserPage,encodeURI( optionItem.keyword.split(' ').join('+') ), optionItem.ca_mid, options.user_agents[k]);
                    }
                }catch(e){
                    logger.error(e);
                    continue;
                }
            }
        }
        await naverService.clearCookie(browserPage);
        await easyVpn.disconnect();
        logger.info(`IP was recovered.`);
    }    

    naverService.closeBrowser();
    process.exit();
    
})();

