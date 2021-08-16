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
const filePath = path.join(os.tmpdir(), 'openvpnconf');
const puppeteer = require('puppeteer');
const nordvpn = require('./src/nordvpn');

function loadConfig( filePath ){
    logger.debug('loading config: '+filePath);
    
	var data = fs.readFileSync(__dirname + path.sep + param,'utf8');
	try{
        data =  JSON.parse(data);
        if( data.vpns)    
            data.vpns.sort((a,b) => { return Math.random () - Math.random()} );        
        return data;
	}catch(e){
		logger.error("can't parse config.cfg. use default value:");
        logger.error(e);
        return {};
	}
}


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
    let vpns = [];

    if( options.useVpn == true){
        try{
            await nordvpn.disconnect();
            vpns = nordvpn.getVpns(options);
        }catch(e){
            logger.error(e.message);
            logger.error(e.stack);
            process.exit();
        }

    }

    browserPage = await naverService.initBrowser();

    if( options.useVpn == false)
        vpns=[{}]

    for( let vpnIndex = 0 ;   vpnIndex < vpns.length ; vpnIndex++){
        if( options.useVpn){
            let vpn = vpns[ vpnIndex ];
            try{
                await nordvpn.connect(vpn);
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
            await nordvpn.disconnect();
            logger.info(`IP was recovered.`);
        }
    }    

    naverService.closeBrowser();
    process.exit();
    
})();

