/* globals
   process
*/

const {readFile, writeFile, stat, mkdir} = require('fs/promises');
const path = require('path');
const getopts = require('getopts');
const {chromium} = require('playwright');
const _ = require('lodash');

const config = require('../config.js');
const env = require('./lib/env');

const getOptsHelper = require('./lib/getOptsHelper');

const utils = require('./lib/utils');

const colorLogger = require('./lib/colorLogger');
const log = colorLogger.getLogger();
const log4 = colorLogger.getLogger(4);
const SAVE_DIR = path.join(env.getAppDir(), './results/rawdata');

const providers = utils.requireAllFiles(path.resolve('./src/providers'));

let browser;

// Define all available arguments
const allAvailableArguments = [
  {name: 'verbose', alias: 'v', description: 'Verbose mode'},
  {name: 'help', alias: 'h', type: Boolean, description: 'Show help'}
];

function getArguments(){
  const options = getopts(process.argv.slice(2), getOptsHelper.getDef(allAvailableArguments));

  return options;
}

function printUsage(){
  log.info(`
Login to providers

Usage:

npm start -- login

Arguments:

${getOptsHelper.getUsage(allAvailableArguments).join('\n')}
`);
}

async function writeToFile(directory, filename, content){
  const fullFileName = path.join(directory, filename);
  log.debug('writing to file', fullFileName);

  try{
    await stat(directory);
  } catch(e){
    log.debug(`directory ${directory} does not exist, creating...`);
    await mkdir(directory, {recursive: true});
    log.debug('created');
  }

  await writeFile(fullFileName, content, {encoding: 'utf-8'});
  log.debug('wrote');
}

async function getBrowserContext(){
  if(!browser){
    browser = await chromium.launch({headless: false, slowMo: 50});
  }

  const context = await browser.newContext({
    screen: {
      width: 1920,
      height: 1080
    },
    viewport: {
      width: 1920,
      height: 1080
    }
  });

  return context;
}

function isDisabledProvider(provider){
  const disabledProviders = _.get(config, ['providerSettings', 'disable'], []);

  return _.some(disabledProviders, (disabled) => {
    return provider.name.startsWith(disabled);
  });
}

async function run(){
  const args = getArguments();

  log.debug(`args: ${JSON.stringify(args, null, 2)}`);

  if(args.help){
    printUsage();
    process.exit(0);
    return;
  }

  if(args.verbose){
    colorLogger.debug(true);
    log.debug('Verbose mode');
  }

  log.debug('Validating arguments');

  const validateResult = getOptsHelper.validate(args, allAvailableArguments);

  if(validateResult.hasError){
    printUsage();
    log.error(`Parameter ${validateResult.parameter} is ${validateResult.error}`);
    process.exit(1);
    return;
  }

  const context = await getBrowserContext();

  args.context = context;
  args.config = config;

  for(const provider of providers){
    if(isDisabledProvider(provider)){
      log.info(`provider ${provider.name} is disabled in config, skip it`);
      continue;
    }

    log.info(`login to ${provider.name}`);

    if(provider.login && _.isFunction(provider.login)){
      await provider.login(args);
    }
  }

  await browser.close();

  log.info('Done');
}

module.exports = {
  run
};
