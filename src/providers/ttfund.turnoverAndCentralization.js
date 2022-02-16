const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-turnoverAndCentralization';
const HEADER = [
  '前十持仓占比',
  '换手率',
];

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

  return [centralization, turnoverRate];
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract
};
