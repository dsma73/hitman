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


const filePath = path.join(os.tmpdir(), 'openvpnconf');

const save = (vpns) => {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath, { overwrite: true });
    writer
      .on('open', () => {
        //TODO 이미 선택한 서버는 빼는 기능 넣어야 함
        vpns = vpns.sort((a, b) => (b.score - a.score));
        const chain = vpns.slice(0, 2).map((vpn) => {
          return new Promise(resolve => writer.write(vpn.config, resolve));
        });

        Promise.all(chain)
          .then(() => writer.close());
      })
      .on('error', reject)
      .once('close', resolve);
  });
};


const startOpenvpn = async (options = []) => {
  logger.info('Starting openvpn...');
  
  const openvpn = `"${which.sync('openvpn')}"`;
  const proc = execa(openvpn, ['--config', `"${filePath}"`].concat(options), { shell: true });
  const SUCCESS_MSG = "Initialization Sequence Completed";
  const TIME_OUT = 1000 * 60 * 3 ;
  let _resolve;
  let _reject;
  let timer;
  proc.stdout.pipe( 
    split().on('data', (message) => {
      logger.info(message);
      if( message.indexOf(SUCCESS_MSG) >= 0  ){
        clearTimeout(timer);
        _resolve();
      }
    })
  );

  proc.stderr.on('data', data => logger.error(data.toString()));
  proc.on('close', code => {
      logger.info(`child process exited with code ${code}`)
      _reject(); 
    }
    );

  process.on('exit', () => proc.kill());
  process.on('SIGINT', () => proc.kill());

  timer = setTimeout(()=>{
    logger.error("Connetion Timeout.")
    _reject();
  }, TIME_OUT)

  return new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    }    
  );
};

async function connectVpn (vpns,_logger) {
  logger = _logger;
  logger.info('Start VPN');
  try{
    await save(vpns);
    await startOpenvpn();
  }catch(e){
    logger.error(e.message);
    Promise.reject();
  }
};

module.exports =  connectVpn;
