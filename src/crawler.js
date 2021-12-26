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

async function basicPage(context, fundCode){
  const page = await context.newPage();
  await page.goto(`http://fundf10.eastmoney.com/jbgk_${fundCode}.html`);
  await sleep(1);
  const html = '<table class="basic">' + await page.innerHTML('table.info') + '</table>';

  await writeToFile(path.join(ROOT, 'basic'), `${fundCode}.html`, html);
  await sleep(0.5);
  page.close();
}

async function historyPage(context, fundCode){
  const page = await context.newPage();
  await page.goto(`http://fundf10.eastmoney.com/jdzf_${fundCode}.html`);
  await sleep(1);
  await page.mouse.wheel(0, 689);
  await sleep(0.2);
  await page.waitForSelector('#jdzftable div.jdzfnew');
  const html = await page.innerHTML('#jdzftable');
  await writeToFile(path.join(ROOT, 'history'), `${fundCode}.html`, html);
  await sleep(1);
  page.close();
}

async function managerPage(context, fundCode){
  const page = await context.newPage();
  await page.goto(`http://fundf10.eastmoney.com/jjjl_${fundCode}.html`);
  await sleep(1);
  const tables = await page.$$('table.comm.jloff');

  const managerInfo = await tables[0].innerHTML();
  const managementInfo = await tables[1].innerHTML();
  const html = `<table class="manager">${managerInfo}</table><table class="management">${managementInfo}</table>`
  await writeToFile(path.join(ROOT, 'manager'), `${fundCode}.html`, html);
  await sleep(0.5);

  page.close();
}

async function scorePage(context, fundCode){
  const page = await context.newPage();
  await page.goto(`http://fundf10.eastmoney.com/jjpj_${fundCode}.html`);
  await page.waitForSelector('#fundgradetable tbody tr');
  await sleep(1);
  const html = '<table class="score">' + await page.innerHTML('#fundgradetable') + '</table>';

  await writeToFile(path.join(ROOT, 'score'), `${fundCode}.html`, html);
  await sleep(0.5);

  page.close();
}

async function riskPage(context, fundCode){
  const page = await context.newPage();
  await page.goto(`http://fundf10.eastmoney.com/tsdata_${fundCode}.html`);

  await sleep(1);
  const html = '<table class="risk">' + await page.innerHTML('table.fxtb') + '</table>';

  const indexFundSpecial = await page.$('#jjzsfj table.fxtb');

  let html2 = '';
  if(indexFundSpecial){
    html2 = '<table class="track">' + await page.innerHTML('#jjzsfj table.fxtb') + '</table>';
  }

  await writeToFile(path.join(ROOT, 'risk'), `${fundCode}.html`, html + html2);
  await sleep(0.5);

  page.close();
}

async function run() {
  const browser = await chromium.launch({headless: false, slowMo: 50});
  const context = await browser.newContext({
    // javaScriptEnabled: false,
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
    await basicPage(context, fundCode);
    await historyPage(context, fundCode);
    await managerPage(context, fundCode);
    await scorePage(context, fundCode);
    await riskPage(context, fundCode);
    await sleep(1);
  }

  await browser.close();
}

module.exports = {
  run
}

