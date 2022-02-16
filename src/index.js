/* globals
   process
*/

const getopts = require('getopts');

const defaultArgs = {
};

function getArguments(){
  const options = getopts(process.argv.slice(2), {
    alias: {
      h: 'help'
    },
    boolean: ['h'],
    default: defaultArgs
  });

  return options;
}

function printUsage(){
  console.log(`
Usage:
npm start crawl     -- to crawl from ttfund based on config and save crawled file
npm start extract   -- to extract crawled file and generate CSV file

This software is intend to help user to crawl mutual fund infomation and form a csv result
Usage: npm start -- <command> [<args>]

Available commands(using -h to see all args):
  crawl                   Crawl mutual fund info from various websites
  extract                 Extract crawled data
  combine                 Combine extracted data into single CSV

Examples(the first "--" means to pass arguments to src/index.js not to npm itself):
  npm start -- crawl -h                                     See crawl args
  npm start -- extract                                      Extract crawled data to CSV
`);
}

async function start(){
  const args = getArguments();

  if(!Array.isArray(args._) || args._.length == 0){
    printUsage();
    process.exit(1);
    return;
  }

  switch(args._[0]){
    case 'crawl':
      require('./crawl').run();
      break;
    case 'extract':
      require('./extract').run();
      break;
    case 'login':
      require('./login').run();
      break;
    default:
      printUsage();
      process.exit(1);
      return;
  }
}

module.exports = {
  start
};
