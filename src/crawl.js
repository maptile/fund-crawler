/* globals
   process
*/

const {readFile, writeFile, stat, mkdir} = require('fs/promises');
const path = require('path');
const getopts = require('getopts');
const {chromium} = require('playwright');

const config = require('../config.js');
const env = require('./lib/env');

const getOptsHelper = require('./lib/getOptsHelper');

const utils = require('./lib/utils');

const colorLogger = require('./lib/colorLogger');
const log = colorLogger.getLogger();
const log4 = colorLogger.getLogger(4);
const log8 = colorLogger.getLogger(8);
const SAVE_DIR = path.join(env.getAppDir(), './results/rawdata');

const providers = utils.requireAllFiles(path.resolve('./src/providers'));

let browser;

// Define all available arguments
const allAvailableArguments = [
  {name: 'append', type: Boolean, defaultValue: false, description: 'Whether append crawled fund code to config.js'},
  {name: 'replace', type: Boolean, defaultValue: false, description: 'Whether replace config.js using crawled fund code'},
  {name: 'headless', type: Boolean, defaultValue: false, description: 'Whether using headless(no UI) chromium to crawl website'},
  {name: 'verbose', alias: 'v', description: 'Verbose mode'},
  {name: 'help', alias: 'h', type: Boolean, description: 'Show help'}
];

function getArguments(){
  const options = getopts(process.argv.slice(2), getOptsHelper.getDef(allAvailableArguments));

  return options;
}

function printUsage(){
  log.info(`
Crawl mutual fund info from various providers

Usage:

npm start -- crawl <args>

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

async function usingAuthFile(){
  const authFile = path.join(env.getAppDir(), 'auth.json');
  try{
    await stat(authFile);
    const auth = await readFile(authFile);

    return JSON.parse(auth);
  } catch(e){
    return {};
  }
}

async function getBrowserContext(args){
  if(!browser){
    browser = await chromium.launch({headless: args.headless, slowMo: 50});
  }

  const contextOptions = {
    screen: {
      width: 1920,
      height: 1080
    },
    viewport: {
      width: 1920,
      height: 1080
    },
    storageState: await usingAuthFile()
  };

  const context = await browser.newContext(contextOptions);

  return context;
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

  if(args.headless){
    console.log('Crawling in headless mode, so there is no visual output, just waiting to complete');
  }

  const context = await getBrowserContext(args);

  const fundCodeCount = config.watchedFunds.length;

  log.info(`total ${fundCodeCount} funds to crawl`);

  args.context = context;
  args.config = config;

  const timestamp = new Date().getTime();

  let index = 1;
  for(const code of config.watchedFunds){
    log.info(`processing ${index} of ${fundCodeCount}`);
    index++;

    const fundData = {
      code,
      timestamp,
      content: {}
    };

    for(const provider of providers){
      if(utils.isDisabledProvider(config, provider)){
        log.debug(`provider ${provider.name} is disabled in config, skip it`);
        continue;
      }

      let timesLeft = 3;
      let content;

      do{
        log4.info(`crawl using ${provider.name}`);
        try{
          content = await provider.crawl(code, args);
          break;
        } catch(e){
          log4.error(e);
          log4.info('will try later...');
          await utils.sleep(5);
          timesLeft--;
        }
      } while(timesLeft > 0);

      if(!content){
        throw new Error('Crawled content is empty ');
      }

      fundData.content[provider.name] = content;
    }

    log.info(`writing to ${code}.json`);

    await writeToFile(SAVE_DIR, `${code}.json`, JSON.stringify(fundData, null, 2));
  }

  await browser.close();

  log.info('Done');
}

module.exports = {
  run
};
