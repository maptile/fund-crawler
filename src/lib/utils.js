/* globals
   process
*/

const log4js = require('log4js');
const logger = log4js.getLogger('helper');

const moment = require('moment');
const readline = require('readline');
const _ = require('lodash');

const fs = require('fs');
const path = require('path');

const env = require('./env');

const root = env.getAppDir();

const SIX_MONTH_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function sliceDays(beginDate, endDate){
  const days = [];

  const firstDayBegin = moment.utc(beginDate.format('YYYY-MM-DD'), 'YYYY-MM-DD');
  const firstDayEnd = moment.utc(firstDayBegin).add(1, 'day').subtract(1, 'ms');

  if(firstDayEnd.isSame(endDate) || firstDayEnd.isAfter(endDate)){
    return [{
      begin: beginDate.valueOf(),
      end: endDate.valueOf()
    }];
  } else {
    days.push({
      begin: beginDate.valueOf(),
      end: firstDayEnd.valueOf()
    });
  }

  const nextDayBegin = firstDayBegin;
  const nextDayEnd = firstDayEnd;

  while(nextDayEnd.isBefore(endDate) || nextDayEnd.isSame(endDate)){
    nextDayBegin.add(1, 'day');
    nextDayEnd.add(1, 'day');

    if(nextDayEnd.isAfter(endDate)){
      days.push({
        begin: nextDayBegin.valueOf(),
        end: endDate.valueOf()
      });
    } else {
      days.push({
        begin: nextDayBegin.valueOf(),
        end: nextDayEnd.valueOf()
      });
    }
  }

  return days;
}

async function confirm(text){
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(text, (answer) => {
      rl.close();

      resolve(answer);
    });
  });
}

function isTrue(value){
  if(_.isNull(value) || _.isUndefined(value)){
    return false;
  }

  if(_.isBoolean(value)){
    return value;
  }

  if(_.isNumber(value)){
    return value == 1;
  }

  if(_.isString(value)){
    value = value.toLowerCase();

    if(value == '1' || value == 'y' || value == 'yes' || value == 't' || value == 'true'){
      return true;
    }

    return false;
  }

  return value;
}

async function sleep(s){
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, s * 1000);
  });
}

function getRelativeRootPath(pathToCompare){
  return path.relative(root, pathToCompare);
}

function requireAllFiles(dirname, filter){
  const dir = getRelativeRootPath(dirname);
  logger.trace(`Loading all files in ${dir}`);

  const files = fs.readdirSync(dirname).filter((file) => {
    return fs.lstatSync(path.join(dirname, file)).isFile()
      && !file.startsWith('.');
  }).filter((file) => {
    if(filter && _.isFunction(filter)){
      return filter(file);
    }

    return true;
  });

  const importedFiles = [];

  files.forEach((file) => {
    try{
      importedFiles.push(require(path.join(dirname, file)));
    } catch(e){
      logger.error(`Failed to require [${path.join(dirname, file)}]`);
      throw e;
    }
  });

  logger.debug(`Loaded ${files.length} files in ${dir}: ${files.join(', ')}`);

  return importedFiles;
}

function requireAllDirectories(dirname, filter){
  logger.trace(`Loading all directories in ${getRelativeRootPath(dirname)}`);

  const dirs = fs.readdirSync(dirname).filter((file) => {
    return fs.lstatSync(path.join(dirname, file)).isDirectory()
      && !file.startsWith('.');
  }).filter((file) => {
    if(filter && _.isFunction(filter)){
      return filter(file);
    }

    return true;
  });

  const importedFiles = [];

  dirs.forEach((dir) => {
    const location = path.join(dirname, dir, 'index.js');

    try{
      fs.accessSync(location);
    } catch(e){
      logger.warn(`${location} is not exist, ignore directory ${dir}`);
      return;
    }

    try{
      importedFiles.push(require(location));
    } catch(e){
      logger.error(`Failed to require [${location}]`);
      throw e;
    }
  });

  logger.debug(`Loaded ${dirs.length} directories in ${getRelativeRootPath(dirname)}: ${dirs.join(', ')}`);

  return importedFiles;
}

function strToDate(str){
  return new Date(str.replace('年', '-').replace('月', '-').replace('日', '') + 'T00:00:00+0800');
}

function strTimeSpanToYears(str){
  const yearRegex = new RegExp(/\d+(?=年)/);
  const dayRegex = new RegExp(/\d+(?=天)/);

  const yearResult = str.match(yearRegex);
  const dayResult = str.match(dayRegex);

  let totalDays = 0;
  if(yearResult){
    const years = parseInt(yearResult[0]);
    totalDays += years * 365;
  }

  if(dayResult){
    const days = parseInt(dayResult[0]);
    totalDays += days;
  }

  return Math.round(totalDays / 365 * 10) / 10;
}

function strPercentageToNumber(str){
  const percentageRegex = new RegExp(/-{0,1}\d*\.{0,1}\d+(?=%)/);

  const percentage = str.match(percentageRegex);

  if(!percentage){
    return '';
  }

  const num = parseFloat(percentage[0]);

  return Math.round(num * 100) / 10000;
}

function strPercentageValueToNumber(str){
  const num = parseFloat(str);

  return Math.round(num * 100) / 10000;
}

function strToNumber(str){
  const numberRegex = new RegExp(/-{0,1}\d*\.{0,1}\d+/);

  const number = str.match(numberRegex);

  if(!number){
    return '';
  }

  const num = parseFloat(number[0]);

  return num;
}

function howManyYears(date){
  const diff = (new Date()).getTime() - date.getTime();

  return Math.round(diff / 1000 / 60 / 60 / 24 / 365 * 100) / 100;
}

function isOlderThan6Months(strDate){
  const parts = strDate.split('-');

  if(parts.length != 3){
    return true;
  }

  // can use strDate directly since the timezone does not seriously effect the result
  const diff = (new Date()).getTime() - (new Date(strDate)).getTime();

  if(diff > SIX_MONTH_MS){
    return true;
  }

  return false;
}

function isDisabledProvider(config, provider){
  const disabledProviders = _.get(config, ['providerSettings', 'disable'], []);

  return _.some(disabledProviders, (disabled) => {
    return provider.name.startsWith(disabled);
  });
}

module.exports = {
  confirm,
  howManyYears,
  isOlderThan6Months,
  isTrue,
  requireAllDirectories,
  requireAllFiles,
  sleep,
  sliceDays,
  strPercentageToNumber,
  strPercentageValueToNumber,
  strTimeSpanToYears,
  strToDate,
  strToNumber,
  isDisabledProvider,
};
