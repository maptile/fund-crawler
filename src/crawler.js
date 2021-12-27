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

async function basicElementFinder(page){
  const html = '<table class="basic">' + await page.innerHTML('table.info') + '</table>';
  return html;
}

async function historyElementFinder(page){
  await page.waitForSelector('#jdzftable div.jdzfnew');
  const html = await page.innerHTML('#jdzftable');

  return html;
}

async function managerElementFinder(page){
  const tables = await page.$$('table.comm.jloff');

  const managerInfo = await tables[0].innerHTML();
  const managementInfo = await tables[1].innerHTML();
  const html = `<table class="manager">${managerInfo}</table><table class="management">${managementInfo}</table>`;

  return html;
}

async function scoreElementFinder(page){
  await page.waitForSelector('#fundgradetable tbody tr');
  const html = '<table class="score">' + await page.innerHTML('#fundgradetable') + '</table>';

  return html;
}

async function riskElementFinder(page){
  const html = '<table class="risk">' + await page.innerHTML('table.fxtb') + '</table>';

  const indexFundSpecial = await page.$('#jjzsfj table.fxtb');

  let html2 = '';
  if(indexFundSpecial){
    html2 = '<table class="track">' + await page.innerHTML('#jjzsfj table.fxtb') + '</table>';
  }

  return html + html2;
}

async function turnoverAndCentralizationFinder(page){
  let hasCentralization;
  try{
    await page.waitForSelector('#qscctable table', {
      timeout: 500
    });

    hasCentralization = true;
  } catch(e){
    hasCentralization = false;
  }

  let html1 = '';

  if(hasCentralization){
    html1 = '<table class="centralization">' + await page.innerHTML('#qscctable table') + '</table>';
  }

  let hasTurnover;
  try{
    await page.waitForSelector('#hsltable table', {
      timeout: 500
    });

    hasTurnover = true;
  } catch(e){
    hasTurnover = false;
  }

  let html2 = '';

  if(hasTurnover){
    html2 = '<table class="turnover">' + await page.innerHTML('#hsltable table') + '</table>';
  }

  return html1 + html2;
}

async function top10HoldingsFinder(page){
  let hasTop10;

  try{
    await page.waitForSelector('#cctable div table', {
      timeout: 500
    });

    hasTop10 = true;
  } catch(e){
    hasTop10 = false;
  }

  if(hasTop10){
    const tables = await page.$$('#cctable div table');
    return '<table class="top10Holdings">' + await tables[0].innerHTML() + '</table>';
  }

  return '';
}

const crawlers = [{
  type: 'basic',
  url: _.template('http://fundf10.eastmoney.com/jbgk_<%=fundCode%>.html'),
  elementFinder: basicElementFinder
}, {
  type: 'history',
  url: _.template('http://fundf10.eastmoney.com/jdzf_<%=fundCode%>.html'),
  elementFinder: historyElementFinder
}, {
  type: 'manager',
  url: _.template('http://fundf10.eastmoney.com/jjjl_<%=fundCode%>.html'),
  elementFinder: managerElementFinder
}, {
  type: 'score',
  url: _.template('http://fundf10.eastmoney.com/jjpj_<%=fundCode%>.html'),
  elementFinder: scoreElementFinder
}, {
  type: 'risk',
  url: _.template('http://fundf10.eastmoney.com/tsdata_<%=fundCode%>.html'),
  elementFinder: riskElementFinder
}, {
  type: 'turnoverAndCentralization',
  url: _.template('http://fundf10.eastmoney.com/ccbdzs_<%=fundCode%>.html'),
  elementFinder: turnoverAndCentralizationFinder
}, {
  type: 'top10Holdings',
  url: _.template('http://fundf10.eastmoney.com/ccmx_<%=fundCode%>.html'),
  elementFinder: top10HoldingsFinder
}];

async function execute(crawler, context, fundCode){
  const page = await context.newPage();
  await page.goto(crawler.url({fundCode}));
  await sleep(1);

  const result = await crawler.elementFinder(page);

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
