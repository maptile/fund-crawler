/* globals
   process
*/
const path = require('path');
const {readdir, readFile} = require('fs/promises');
const getopts = require('getopts');

const utils = require('./lib/utils');

const getOptsHelper = require('./lib/getOptsHelper');
const env = require('./lib/env');

const colorLogger = require('./lib/colorLogger');
const log = colorLogger.getLogger();

const SAVE_DIR = path.join(env.getAppDir(), './results');

const providers = utils.requireAllFiles(path.resolve('./src/providers'));

// Define all available arguments
const allAvailableArguments = [
  {name: 'website', alias: 'w', type: String, required: true, defaultValue: 'ttfund', description: `Extract crawled webpages to CSV. Available values are:
      ttfund              Tiantian Fund https://www.1234567.com.cn/
      morningstar         Morning Start https://www.morningstar.cn/
      xstock              X-Stock http://x-stock.axiaoxin.com/fund`},
  {name: 'verbose', alias: 'v', description: 'Verbose mode'},
  {name: 'help', alias: 'h', type: Boolean, description: 'Show help'}
];

function getArguments(){
  const options = getopts(process.argv.slice(2), getOptsHelper.getDef(allAvailableArguments));

  return options;
}

function printUsage(){
  log.info(`
Extract crawled webpages to CSV

Usage:

npm start -- extract -w ttfund

Arguments:

${getOptsHelper.getUsage(allAvailableArguments).join('\n')}

Examples:

npm start -- extract -w ttfund
`);
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

  const filenames = await readdir(SAVE_DIR);

  for(const filename of filenames){
    const content = await readFile(path.join(SAVE_DIR, filename), {encoding: 'utf-8'});

    const parsed = JSON.parse(content);

    for(const provider of providers){
      const r = await provider.extract(parsed.content[provider.name]);

      console.log(r);
    }
  }

  log.info('Done');
}

module.exports = {
  run
};
