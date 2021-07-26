'use strict';
const winston = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, printf } = winston.format;
const logFormat = printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

var fileLog = new winston.transports.DailyRotateFile({
  filename: 'hitman-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat)

});

const logger =  winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        logFormat,
      ),
      handleExceptions: true,
      json: false,
      colorize: true,
    }
    ),
    fileLog
  ],
  exitOnError: false,
});

module.exports = logger;
