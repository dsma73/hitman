'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const execa = require('execa');
const logger = require('./logger');
const which = require('which');
const process = require('process');
const split = require('split');
const { SIGINT } = require('constants');

const CONF_DIR = "vpn_conf";
let connectionProc;

const SUCCESS_MSG = "Initialization Sequence Completed";
let _timer;
let _resolved  = false;


const startOpenvpn = async (vpnServer) => {

    const TIME_OUT = 1000 * 10  ;

    try{
      const NordVPN = `"${which.sync('NordVPN')}"`;
      logger.info(`trying to connect VPN [${vpnServer}]`);      
      const proc = execa(NordVPN, ['-c -n ', `"${vpnServer}"` ], { shell: true });
    
      proc.stdout.pipe( 
        split().on('data', (message) => {
          logger.debug(message);
        })
      );
      proc.stderr.on('data', data => logger.error(data.toString()));

    }catch(e){
      logger.error("can't connect VPN "+vpnServer);
      logger.error(e.message);
      logger.error(e.stack);
    }
      await new Promise((resolve, reject) => 
          setTimeout(()=>resolve(), TIME_OUT)
      ) ;

  };

  async function disconnect(){
    logger.info(`trying to disconnect VPN `);
    const TIME_OUT = 1000 * 10  ;

    try{
      const NordVPN = `"${which.sync('NordVPN')}"`;
      const proc = execa(NordVPN, ['-d'], { shell: true });

      proc.stdout.pipe( 
        split().on('data', (message) => {
          logger.debug(message);
        })
      );
      proc.stderr.on('data', data => logger.error(data.toString()));
    }catch(e){
      logger.error(e.message);
      logger.error(e.stack);
    }

    await new Promise((resolve, reject) => 
        setTimeout(()=>resolve(), TIME_OUT)
    ) ;
}  

async function cleanBrowser(){
  
}

function getVpns(options){
  const PREFIX="South Korea #";
  let result = [];


  options.vpns.forEach( f =>{
    result.push( PREFIX+f);
  } );
    
    return result;
}

async function connect(vpnServer){
    await startOpenvpn(vpnServer);
}


module.exports ={
    connect,
    disconnect,
    cleanBrowser,
    getVpns
}
