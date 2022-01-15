const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');
const domUtils = require('../lib/domUtils');

const PROVIDER_NAME = 'ttfund-risk';
const HEADER = [
  '标准差-近1年',
  '标准差-近2年',
  '标准差-近3年',
  '夏普比率-近1年',
  '夏普比率-近2年',
  '夏普比率-近3年',
  '跟踪指数',
  '跟踪误差',
  '风险等级',
  '同类风险等级'
];

const urlTemplate = _.template('http://fundf10.eastmoney.com/tsdata_<%=code%>.html');

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

  const riskInAllFunds = $('.allfxdj:first').find('li span.chooseLow').text();
  const riskInSameTypeFunds = $('.allfxdj:nth(1)').find('li span.chooseLow').text()

  const table = $('table.fxtb:first');

  const sdRow = domUtils.getTableRow($, table, '标准差');
  const last1YearSd = utils.strPercentageToNumber($(sdRow).find('td:nth(1)').text());
  const last2YearSd = utils.strPercentageToNumber($(sdRow).find('td:nth(2)').text());
  const last3YearSd = utils.strPercentageToNumber($(sdRow).find('td:nth(3)').text());

  const sharpRow = domUtils.getTableRow($, table, '夏普比率');
  const last1YearSharp = $(sharpRow).find('td:nth(1)').text();
  const last2YearSharp = $(sharpRow).find('td:nth(2)').text();
  const last3YearSharp = $(sharpRow).find('td:nth(3)').text();

  let tracking = '';
  let trackingError = '';

  const trackingIndexTable = $('table.fxtb:nth(1)');

  if(trackingIndexTable){
    tracking = trackingIndexTable.find('tr:nth(1) td:nth(0)').text();
    trackingError = utils.strPercentageToNumber(trackingIndexTable.find('tr:nth(1) td:nth(1)').text());
  }

  return [
    last1YearSd, last2YearSd, last3YearSd,
    last1YearSharp, last2YearSharp, last3YearSharp,
    tracking, trackingError,
    riskInAllFunds, riskInSameTypeFunds
  ];
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract
};
