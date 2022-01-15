const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const PROVIDER_NAME = 'ttfund-rating';

const urlTemplate = _.template('http://fundf10.eastmoney.com/jjpj_<%=code%>.html');

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

  const table = $('#fundgradetable');

  const row = [];

  const trs = table.find('tbody tr');

  for(const tr of trs){
    const tds = $(tr).find('td');

    const date = $(tds[0]).text();

    if(utils.isOlderThan6Months(date)){
      continue;
    }

    for(let i = 0; i < tds.length; i++){
      const td = tds[i];
      const text = $(td).text();
      if(text.indexOf('★') >= 0 && !row[i]){
        row[i] = text.length;
      }
    }
  }

  const results = [];

  if(options.returnField){
    results.push([
      '招商',
      '上证三年',
      '上证五年',
      '济安金信',
      '晨星'
    ]);
  }

  results.push(row);

  return results;
}

module.exports = {
  name: PROVIDER_NAME,
  crawl,
  extract
};
