const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-top10Holdings';
const HEADER = [
  '前十持仓股票',
];

const urlTemplate = _.template('http://fundf10.eastmoney.com/ccmx_<%=code%>.html');

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

  // TODO: it seems can't 'use #cctable div table.comm.tzxq:first tbody tr' to get all tr
  // so use this way
  const rows = $('#cctable div table.comm.tzxq:first').find('tr');

  let text = [];
  for(const row of rows){
    const name = $(row).find('td:nth(2)').text();

    // reason: [see above]
    // so we should check if name is empty
    if(!name){
      continue;
    }

    const percentage = $(row).find('td:nth(6)').text();
    text.push(name + '(' + percentage + ')');
  }

  return [text.join(' ')];
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract
};
