const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-manager';

const urlTemplate = _.template('http://fundf10.eastmoney.com/jjjl_<%=code%>.html');

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

  const managerTable = $('table.comm.jloff:first');
  const managerRow = managerTable.find('tbody tr:first');

  const managerName = managerRow.find('td:nth(2)').text().trim().replace(/ /g, '、');
  const manageTime = utils.strTimeSpanToYears(managerRow.find('td:nth(3)').text());
  const manageReturns = utils.strPercentageToNumber(managerRow.find('td:nth(4)').text());

  const results = [];

  if(options.returnField){
    results.push([
      '基金经理',
      '任职期间',
      '任职回报'
    ]);
  }

  results.push([managerName, manageTime, manageReturns]);

  return results;
}

module.exports = {
  name: PROVIDER_NAME,
  crawl,
  extract
};
