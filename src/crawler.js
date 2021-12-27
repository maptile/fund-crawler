const {chromium} = require('playwright');
const path = require('path');
const {writeFile, stat, mkdir} = require('fs/promises');
const _ = require('lodash');
const config = require('../config');
const ROOT = './results';

async function sleep(s){
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, s * 1000);
  });
}

function strToBool(str){
  if(_.isBoolean(str)){
    return str;
  }

  if(!str){
    return false;
  }

  if(str === 'true' || str === 'y' || str === 'Y' || str === '1'){
    return true;
  }

  return false;
}

async function writeToFile(directory, filename, content){
  try{
    await stat(directory);
  } catch(e){
    await mkdir(directory, {recursive: true});
  }

  await writeFile(path.join(directory, filename), content, {encoding: 'utf-8'});
}

const crawlers = [{
  type: 'basic',
  url: _.template('http://fundf10.eastmoney.com/jbgk_<%=fundCode%>.html'),
}, {
  type: 'history',
  url: _.template('http://fundf10.eastmoney.com/jdzf_<%=fundCode%>.html'),
}, {
  type: 'manager',
  url: _.template('http://fundf10.eastmoney.com/jjjl_<%=fundCode%>.html'),
}, {
  type: 'score',
  url: _.template('http://fundf10.eastmoney.com/jjpj_<%=fundCode%>.html'),
}, {
  type: 'risk',
  url: _.template('http://fundf10.eastmoney.com/tsdata_<%=fundCode%>.html'),
}, {
  type: 'turnoverAndCentralization',
  url: _.template('http://fundf10.eastmoney.com/ccbdzs_<%=fundCode%>.html'),
}, {
  type: 'top10Holdings',
  url: _.template('http://fundf10.eastmoney.com/ccmx_<%=fundCode%>.html'),
}];

async function execute(crawler, context, fundCode){
  const page = await context.newPage();
  await page.goto(crawler.url({fundCode}));
  await sleep(1);

  const result = await page.innerHTML('html')

  await writeToFile(path.join(ROOT, crawler.type), `${fundCode}.html`, result);
  await sleep(0.5);
  page.close();
}

async function run(options) {
  const defaultOptions = {
    headless: true
  };

  options = _.assign(defaultOptions, options);

  options.headless = strToBool(options.headless);

  if(options.headless){
    console.log('Crawling in headless mode, so there is no visual output, just waiting to complete');
  }

  const browser = await chromium.launch({headless: options.headless, slowMo: 50});
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

  const total = config.watchedFunds.length;
  let index = 1;
  for(const fundCode of config.watchedFunds){
    console.log(index + '/' + total, fundCode);
    index++;

    for(const crawler of crawlers){
      await execute(crawler, context, fundCode);
    }

    await sleep(1);
  }

  await browser.close();
}

module.exports = {
  run
};
