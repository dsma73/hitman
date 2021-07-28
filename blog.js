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
	
    param = process.argv[2] || 'blog.cfg';

    if( !process.argv[2]){
	 param = "conf" + path.sep + param;
    } 

    try{
        options = loadConfig( param );
    }catch(e){
        logger.error("can't parse config.");
        process.exit(1);
    }

    let vpns;
    if( options.useVpn){
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
    }

    browserPage = await naverService.initBrowser();

    if( options.useVpn == false)
        vpns=[{}]

    for( let vpnIndex = 0 ;   vpnIndex < vpns.length ; vpnIndex++){
        if( options.useVpn){
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
        }


        for( let i=0 ; i < options.blogs.length; i++){
            let optionItem = options.blogs[i];

            logger.info(`trying to visit  [${optionItem.blog}]`  );
            for( let k = 0 ; k < options.user_agents.length ; k++){
                let userAgentString = options.user_agents[k];
                try{
                    await naverService.visitBlogAndClick(browserPage,optionItem.blog,optionItem.click == 'latest',userAgentString,options.scroll); 
                }catch(e){
                    logger.error(e);
                    continue;
                }

                try{
                    await naverService.clearCookie(browserPage);
                }catch(e){}                
            }
        }


        if( options.useVpn){
            await easyVpn.disconnect();
            logger.info(`IP was recovered.`);
    
        }
    }    

    naverService.closeBrowser();
    process.exit();
    
})();

