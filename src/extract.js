/* globals
   process
*/
const path = require('path');
const {readdir, readFile, writeFile} = require('fs/promises');
const getopts = require('getopts');

const utils = require('./lib/utils');

const getOptsHelper = require('./lib/getOptsHelper');
const env = require('./lib/env');

const colorLogger = require('./lib/colorLogger');
const log = colorLogger.getLogger();
const log4 = colorLogger.getLogger(4);

const READ_DIR = path.join(env.getAppDir(), './results/rawdata');
const SAVE_DIR = path.join(env.getAppDir(), './results');

const providers = utils.requireAllFiles(path.resolve('./src/providers'));

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
Extract crawled webpages to CSV

Usage:

npm start -- extract <args>

Arguments:

${getOptsHelper.getUsage(allAvailableArguments).join('\n')}
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

  log.debug('reading saved results from', READ_DIR);

  const filenames = await readdir(READ_DIR);
  const filenameCount = filenames.length;

  log.info(`total ${filenames.length} files to process`);

  let index = 1;

  const result = [];

  let header = ['代码'];

  for(const provider of providers){
    header = header.concat(provider.header);
  }

  result.push(header);

  for(const filename of filenames){
    log.info(`processing ${index} of ${filenameCount}`);
    index++;

    const fileFullName = path.join(READ_DIR, filename);

    log.debug('reading', fileFullName);
    const content = await readFile(fileFullName, {encoding: 'utf-8'});

    const parsed = JSON.parse(content);

    const options = {};

    let row = [parsed.code];

    log4.info(parsed.code);
    for(const provider of providers){
      log4.info(`extract using ${provider.name}`);
      const data = await provider.extract(parsed.content[provider.name], options);

      row = row.concat(data);
    }

    result.push(row);
  }

  const outputStr = result.map((row) => {
    return row.join(',');
  }).join('\n');

  await writeFile(path.join(SAVE_DIR, 'output.csv'), outputStr, {encoding: 'utf-8'});
  log.info('Done');
}

module.exports = {
  run
};
