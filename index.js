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
        logger.error(e.message + e.stack);
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

    let vpns=[];
    
    if( options.useVpn == true){
        try{
            vpns = await ListVPNs(options.proxy); 
            const countries = Array.from(new Set(vpns.map(vpn => vpn.countryShort)));
            vpns = filter(vpns);
            vpns = vpns.sort((a, b) => (b.score - a.score));
            vpns = vpns.slice ( 0, Math.ceil( vpns.length /2) ); // 하위 1/2는 버린다.
            vpns = vpns.sort(() => Math.random() * 10);
            logger.info(`available Proxies : ${vpns.length}`);
        }catch(e){
            logger.error(e.message);
            process.exit();
            return;
        }
        
        await easyVpn.disconnect();
    }

    browserPage = await naverService.initBrowser();

    if( options.useVpn == false)
        vpns=[{}]

    for( let vpnIndex = 0 ; vpnIndex < vpns.length ; vpnIndex++){
        if( options.useVpn == true){
            let vpn = vpns[ vpnIndex ];
            logger.info(`trying to get IP from ${vpnIndex+1}th proxy. ${vpn.ip} ${vpn.countryShort}`);
            try{
                await easyVpn.connect(vpn);
                logger.info(`IP changing was completed`);
            }catch(e){
                logger.error(`can't connect VPN ${vpn.ip}`);
                continue;
            }
        }

        // shuffle item array
        options.items = options.items.sort(() => Math.random() * 10 );

        for( let i=0 ; i < options.items.length; i++){
            let optionItem = options.items[i];
            let retry = optionItem.count || 1;
            for( j = 0 ; j < retry; j++){
                try{
                    // shuffle user agent array
                    options.user_agents = options.user_agents.sort(() => Math.random() * 10);

                    let user_agents_length = Math.ceil( options.user_agents.length * Math.random()); 

                    for( let k = 0 ; k < options.user_agents.length && k < user_agents_length; k++){
                        
                        logger.info(`[${optionItem.keyword}]  ${options.user_agents[k]}`)
/*
                        await naverService.findAndClick( browserPage,encodeURI( optionItem.keyword.split(' ').join('+') ), 
                                                        optionItem.ca_mid, options.user_agents[k],
                                                        options.scroll 
                                                        );
*/
                        await naverService.findAndClick( browserPage, optionItem.keyword, 
                                                        optionItem.ca_mid, options.user_agents[k],
                                                        options.scroll 
                        );

                        try{
                            await naverService.clearCookie(browserPage);
                        }catch(e){
                            logger.error(e.message + e.stack);
                        }
                                                
                    }
                }catch(e){
                    logger.error(e.message + e.stack);
                    continue;
                }
            }
        }

        if( options.useVpn == true){
            await easyVpn.disconnect();
            logger.info(`IP was recovered.`);
        }
    }    
    naverService.closeBrowser();
    process.exit();
    
})();

