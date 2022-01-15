const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');
const domUtils = require('../lib/domUtils');

const urlTemplate = _.template('http://fundf10.eastmoney.com/jbgk_<%=code%>.html');

const PROVIDER_NAME = 'ttfund-basic';
const HEADER = [
  '基金简称',
  '基金类型',
  '距今年数',
  '资产规模(亿元)',
  '基金公司',
  '基金经理人',
  '管理费率',
  '托管费率',
  '销售服务费率',
  '最高认购费率',
  '最高赎回费率',
];

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

  const table = $('table.info');

  const foundDate = utils.strToDate(domUtils.getTableNextCellText($, table, '成立日期/规模').split('/')[0].trim());
  const years = utils.howManyYears(foundDate); // 距今年数

  const name = domUtils.getTableNextCellText($, table, '基金简称');
  const type = domUtils.getTableNextCellText($, table, '基金类型');
  const amount = utils.strToNumber(domUtils.getTableNextCellText($, table, '资产规模'));
  const company = domUtils.getTableNextCellText($, table, '基金管理人');
  const manager = domUtils.getTableNextCellText($, table, '基金经理人');
  const manageRate = utils.strPercentageToNumber(domUtils.getTableNextCellText($, table, '管理费率'));
  const manageRate2 = utils.strPercentageToNumber(domUtils.getTableNextCellText($, table, '托管费率'));
  const salesRate = utils.strPercentageToNumber(domUtils.getTableNextCellText($, table, '销售服务费率'));
  const buyRate = utils.strPercentageToNumber(table.find('tr:nth(8) td:nth(0) span:nth(1) span').text());
  const sellRate = utils.strPercentageToNumber(domUtils.getTableNextCellText($, table, '最高赎回费率'));

  return [name, type, years, amount, company, manager, manageRate, manageRate2, salesRate, buyRate, sellRate];
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract
};
