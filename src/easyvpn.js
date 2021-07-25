'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const execa = require('execa');
const Promise = require('bluebird');
const which = require('which');
const prompt = require('prompt');
const split = require('split');
const logger = require('./logger');
var ps = require('ps-node');
const { SIGINT } = require('constants');
 
const filePath = path.join(os.tmpdir(), 'openvpnconf');

let connectionProc;

const save = (vpn) => {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath, { overwrite: true });
    writer.write(vpn.config, resolve);
    writer.close();
    writer.on('error', reject)
    resolve();
  });
};

const SUCCESS_MSG = "Initialization Sequence Completed";
let _timer;
let _resolved  = false;

const startOpenvpn = async (options = []) => {

  const openvpn = `"${which.sync('openvpn')}"`;
  const proc = execa(openvpn, ['--config', `"${filePath}"`].concat(options), { shell: true });
  connectionProc = proc;
  const TIME_OUT = 1000 * 60  ;
 
  let _reject;
  let _resolve;
  _resolved = false;

  proc.stdout.pipe( 
    split().on('data', (message) => {
      logger.debug(message);
      if( message.indexOf(SUCCESS_MSG) >= 0  ){
        clearTimeout(_timer);
        _resolved = true;
        _resolve();
      }
    })
  );

  proc.stderr.on('data', data => logger.error(data.toString()));
  proc.on('close', code => {
      logger.debug(`child process exited with code ${code}`)
      connectionProc = null;
      _reject(); 
    }
    );

  process.on('exit', () => proc.kill());
  process.on('SIGINT', () => proc.kill());

  _timer = setTimeout(()=>{
    if( _resolved )
      return;
    logger.error("Connetion Timeout.")
    connectionProc = null;
    _reject();
  }, TIME_OUT)

  return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    }    
  );
};

async function connect (vpn) {
  try{
    await save(vpn);
  }catch(e){
    logger.error(e);
    logger.error("can't save vpn");
    Promise.reject();    
  }

  try{
    await startOpenvpn();
  }catch(e){
    logger.error(e);
    logger.error("can't connect vpn")
    throw e;
  }
};

async function disconnect(){

    try{
      logger.debug(`trying to release IP `);

      ps.lookup({
        command: 'openvpn',
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
  return new Promise(resolve => setTimeout(resolve, 1000 * 10));
}

module.exports ={
    connect,
    disconnect
}
