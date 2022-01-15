const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-turnoverAndCentralization';

const urlTemplate = _.template('http://fundf10.eastmoney.com/ccbdzs_<%=code%>.html');

async function crawl(code, options){
  const page = await options.context.newPage();
  await page.goto(urlTemplate({code}));
  await utils.sleep(1);

  const html = await page.innerHTML('html')

  await utils.sleep(0.5);
  page.close();

  await utils.sleep(1);
  return html;
}

async function extract(content, options){
  if(!options){
    options = {};
  }

  const $ = cheerio.load(content);

  const centralization = utils.strPercentageToNumber($('#qscctable table tbody tr td:nth(1)').text());

  const turnoverRate = utils.strPercentageToNumber($('#hsltable table tbody tr td:nth(1)').text());

  const results = [];

  if(options.returnField){
    results.push([
      '前十持仓占比',
      '换手率',
    ]);
  }

  results.push([centralization, turnoverRate]);

  return results;
}

module.exports = {
  name: PROVIDER_NAME,
  crawl,
  extract
};
