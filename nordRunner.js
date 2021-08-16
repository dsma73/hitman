const logger = require('./src/logger');
const puppeteer = require('puppeteer');
const nordVpn = require('./src/nordvpn');
const naverService = require('./src/naverService')
const path = require('path');
const fs = require('fs');
var schedule = require('node-schedule');

function loadConfig( filePath ){
    logger.debug('loading config: '+filePath);
    
	var data = fs.readFileSync(__dirname + path.sep + param,'utf8');
	try{
        logger.debug( data);

		data =  JSON.parse(data);
        if( data.items )
            data.items.sort((a,b) => { return Math.random () - Math.random()} );                
        if( data.vpns)    
            data.vpns.sort((a,b) => { return Math.random () - Math.random()} );                
        if( data.user_agents )
            data.user_agents.sort((a,b) => { return Math.random () - Math.random()} );                    

        return data;
	}catch(e){
		logger.error("can't parse config.cfg. use default value:");
        logger.error(e.message + e.stack);
        return {};
	}
}

async function nordRunner(options){

    options = options || {};

    let vpns = [];

    if( options.useVpn == true){
        try{
            await nordVpn.disconnect();
            vpns = nordVpn.getVpns(options);
        }catch(e){
            logger.error(e.message);
            logger.error(e.stack);
            process.exit();
        }

    }

    browserPage = await naverService.initBrowser();

    if( options.useVpn == false)
        vpns=[{}]

    let started = false;

    for( let vpnIndex = 0 ; vpnIndex < vpns.length ; vpnIndex++){
        let vpn = vpns[ vpnIndex ];

        if( options.useVpn == true){
            try{
                await nordVpn.connect(vpn);
                logger.info(`IP changing was completed`);
            }catch(e){
                logger.error(`can't connect VPN ${vpn.ip}`);
                continue;
            }
        }

        // shuffle item array
        options.items = options.items.sort((a,b) =>  Math.random() - Math.random());

        for( let i=0 ; i < options.items.length; i++){
            let optionItem = options.items[i];
            let retry = optionItem.count || 1;
            for( j = 0 ; j < retry; j++){
                try{
                    // shuffle user agent array
                    options.user_agents = options.user_agents.sort(() => Math.random() * 10);

                    for( let k = 0 ; k < options.user_agents.length ; k++){
                        
                        logger.info(`[${optionItem.keyword}]  ${options.user_agents[k]}`)

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
            await nordVpn.disconnect();
            logger.info(`IP was recovered.`);
        }
    }    
    naverService.closeBrowser();
}

( function main(){
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

    if( options.schedule ){
        logger.info(`nordRunner will be runned by ${options.schedule} `);
        var j = schedule.scheduleJob(options.schedule, async function(){  // this for one hour
            logger.info('start job');
            await nordRunner(options);
            logger.info('close job')
        });
    }else{
        logger.info('just run once')
        nordRunner(options);
    }
})();