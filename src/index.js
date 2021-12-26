/* globals
   process
*/
const argv = require('minimist')(process.argv.slice(2));
const crawler = require('./crawler.js');
const extractor = require('./extractor.js');

function run(){
  if(!Array.isArray(argv._)){
    return help();
  }

  switch(argv._[0]){
    case 'crawl':
      return crawler.run(argv);
    case 'extract':
      return extractor.run(argv);
    default:
      return help();
  }
}

function help(){
  console.log(`
Usage:
npm start crawl     -- to crawl from ttfund based on config and save crawled file
npm start extract   -- to extract crawled file and generate CSV file
`);
}

run();
