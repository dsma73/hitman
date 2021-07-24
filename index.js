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
const vpnConnect = require('./easyvpn');


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
    try{
        let vpns = await ListVPNs(options.proxy); 
        const countries = Array.from(new Set(vpns.map(vpn => vpn.countryShort)));
        vpns = filter(vpns);
//        await vpnConnect(vpns,logger);
    }catch(e){
        logger.error("can't connect VPN");
        process.exit();
        return;
    }

    browserPagee = await naverService.initBrowser();

    for( let i of options.items ){
        let retry = i.count || 10;
        for( j = 0 ; j < retry; j++){
            logger.info(`trying to find  ${i.keyword} ${j}`  );
            try{
                await naverService.findAndClick( browserPagee,encodeURI( i.keyword.split(' ').join('+') ), i.ca_mid);
            }catch(e){
                logger.error(e);
                continue;
            }
        }
        }
    naverService.closeBrowser();
    logger.info("completed.");
     //       process.exit();
        
    
})();


//뉴질랜드 플로 폴리 폴리스 1000mg 90캡슐