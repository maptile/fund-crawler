const {chromium} = require('playwright');
const path = require('path');
const {writeFile, stat, mkdir} = require('fs/promises');
const config = require('../config');
const ROOT = './results';

async function sleep(s){
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, s * 1000);
  });
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

async function run() {
  const browser = await chromium.launch({headless: false, slowMo: 50});
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
    console.log(index + '/' + total);
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
