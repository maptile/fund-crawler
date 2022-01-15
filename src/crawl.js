/* globals
   process
*/

const {writeFile, stat, mkdir} = require('fs/promises');
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

async function getBrowserContext(args){
  if(!browser){
    browser = await chromium.launch({headless: args.headless, slowMo: 50});
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
      log4.info(`crawl using ${provider.name}`);

      const content = await provider.crawl(code, args);

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
