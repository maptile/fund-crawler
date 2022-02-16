const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-history';
const HEADER = [
  '今年来',
  '近1周',
  '近1月',
  '近3月',
  '近6月',
  '近1年',
  '近2年',
  '近3年',
  '近5年',
  '成立来'
];

const urlTemplate = _.template('http://fundf10.eastmoney.com/jdzf_<%=code%>.html');

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

  $('#jdzftable ul.fcol').remove();

  const indicators = $('#jdzftable ul');

  const row = [];

  for(const indicator of indicators){
    row.push(utils.strPercentageToNumber($(indicator).find('li:nth(1)').text()));
  }

  return row;
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract
};
