const {readdir, readFile, writeFile} = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');
const ROOT = './results';

async function writeToFile(filename, rows){
  const text = rows.map((r) => (r.join(','))).join('\n');

  await writeFile(filename, text, {encoding: 'utf-8'});
}

function strToDate(str){
  return new Date(str.replace('年', '-').replace('月', '-').replace('日', '') + 'T00:00:00+0800');
}

function strTimeSpanToYears(str){
  const yearRegex = new RegExp('\\d+(?=年)');
  const dayRegex = new RegExp('\\d+(?=天)');

  const yearResult = str.match(yearRegex);
  const dayResult = str.match(dayRegex);

  let totalDays = 0;
  if(yearResult){
    const years = parseInt(yearResult[0]);
    totalDays += years * 365;
  }

  if(dayResult){
    const days = parseInt(dayResult[0]);
    totalDays += days;
  }

  return Math.round(totalDays / 365 * 10) / 10;
}

function strPercentageToNumber(str){
  const num = parseFloat(str.replace('%', ''));

  if(isNaN(num)){
    return '--';
  }

  return Math.round(num * 100) / 10000;
}

function howManyYears(date){
  const diff = (new Date()).getTime() - date.getTime();

  return Math.round(diff / 1000 / 60 / 60 / 24 / 365 * 100) / 100;
}

function getTableCellText($, text){
  const th = $('th').filter((i, h) => {
    return $(h).text() == text;
  });

  return th.next().text();
}

function getTableRow($, table, text){
  const tr = table.find('tr').filter((i, row) => {
    return $(row).text().indexOf(text) >= 0;
  });

  return tr;
}

async function extractBasic(){
  const category = 'basic';
  const dir = path.join(ROOT, category);

  const filenames = await readdir(dir);

  const results = [[
    '代码',
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
  ]];

  for(const filename of filenames){
    const fundCode = filename.replace('.html', '');
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    const foundDate = strToDate(getTableCellText($, '成立日期/规模').split('/')[0].trim());
    const years = howManyYears(foundDate); // 距今年数

    const name = getTableCellText($, '基金简称').trim();
    const type = getTableCellText($, '基金类型').trim();
    const amount = getTableCellText($, '资产规模').split('亿元')[0].trim();
    const company = getTableCellText($, '基金管理人');
    const manager = getTableCellText($, '基金经理人');
    const manageRate = strPercentageToNumber(getTableCellText($, '管理费率').split('%')[0]);
    const manageRate2 = strPercentageToNumber(getTableCellText($, '托管费率').split('%')[0]);
    const salesRate = strPercentageToNumber(getTableCellText($, '销售服务费率').split('%')[0]);
    const buyRate = strPercentageToNumber($('tr:nth(8)').find('td:nth(0) span:nth(1)').find('span').text().split('%')[0]);
    const sellRate = strPercentageToNumber(getTableCellText($, '最高赎回费率').split('%')[0]);

    results.push([fundCode, name, type, years, amount, company, manager, manageRate, manageRate2, salesRate, buyRate, sellRate]);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractHistory(){
  const category = 'history';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
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
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    $('ul.fcol').remove();

    const indicators = $('ul');

    const row = [filename.replace('.html', '')];

    for(const indicator of indicators){
      const zhangfu = parseFloat($(indicator).find('li:nth(1)').text().replace('%', ''));

      if(isNaN(zhangfu)){
        row.push(0);
      } else {
        row.push(Math.round(zhangfu * 100) / 10000);
      }
    }

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractManager(){
  const category = 'manager';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
    '基金经理',
    '任职期间',
    '任职回报'
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    const managerRow = $('table.manager tbody tr:first');

    const managerName = managerRow.find('td:nth(2)').text().trim().replace(/ /g, '、');
    const manageTime = strTimeSpanToYears(managerRow.find('td:nth(3)').text());
    const manageReturns = strPercentageToNumber(managerRow.find('td:nth(4)').text());

    const row = [filename.replace('.html', ''), managerName, manageTime, manageReturns];

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractRisk(){
  const category = 'risk';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
    '标准差-近1年',
    '标准差-近2年',
    '标准差-近3年',
    '夏普比率-近1年',
    '夏普比率-近2年',
    '夏普比率-近3年',
    '跟踪指数',
    '跟踪误差'
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    const sdRow = getTableRow($, $('table:nth(0)'), '标准差');
    const last1YearSd = strPercentageToNumber($(sdRow).find('td:nth(1)').text());
    const last2YearSd = strPercentageToNumber($(sdRow).find('td:nth(2)').text());
    const last3YearSd = strPercentageToNumber($(sdRow).find('td:nth(3)').text());

    const sharpRow = getTableRow($, $('table:nth(0)'), '夏普比率');
    const last1YearSharp = $(sharpRow).find('td:nth(1)').text();
    const last2YearSharp = $(sharpRow).find('td:nth(2)').text();
    const last3YearSharp = $(sharpRow).find('td:nth(3)').text();

    let tracking = '';
    let trackingError = '';

    const trackingTable = $('table:nth(1)');

    if(trackingTable){
      tracking = trackingTable.find('tr:nth(1) td:nth(0)').text();
      trackingError = strPercentageToNumber(trackingTable.find('tr:nth(1) td:nth(1)').text());
    }

    const row = [
      filename.replace('.html', ''),
      last1YearSd, last2YearSd, last3YearSd,
      last1YearSharp, last2YearSharp, last3YearSharp,
      tracking, trackingError
    ];

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractScore(){
  const category = 'score';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
    '招商',
    '上证三年',
    '上证五年',
    '济安金信',
    '晨星'
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    const row = [filename.replace('.html', '')];

    const trs = $('table tbody tr');

    for(const tr of trs){
      const tds = $(tr).find('td');

      for(let i = 0; i < tds.length; i++){
        const td = tds[i];
        const text = $(td).text();
        if(text.indexOf('★') >= 0 && !row[i]){
          row[i] = text.length;
        }
      }
    }

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractTurnoverAndCentralization(){
  const category = 'turnoverAndCentralization';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
    '前十持仓占比',
    '换手率',
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    // WHY: can't use table.centralization tbody tr:first td:nth(1) to locate the element.
    // very strange
    const centralization = strPercentageToNumber($('table.centralization tbody tr td:nth(1)').text());

    const turnoverRate = strPercentageToNumber($('table.turnover tbody tr td:nth(1)').text());

    const row = [filename.replace('.html', ''), centralization, turnoverRate];

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function extractTop10Holdings(){
  const category = 'top10Holdings';
  const dir = path.join(ROOT, category);
  const filenames = await readdir(dir);

  const results = [[
    '代码',
    '前十持仓股票',
  ]];

  for(const filename of filenames){
    const fileContent = await readFile(path.join(dir, filename), {encoding: 'utf-8'});

    const $ = cheerio.load(fileContent);

    const rows = $('table.top10Holdings tbody tr');

    let text = [];
    for(const row of rows){
      const name = $(row).find('td:nth(2)').text();
      const percentage = $(row).find('td:nth(6)').text();
      text.push(name + '(' + percentage + ')');
    }

    const row = [filename.replace('.html', ''), text.join(' ')];

    results.push(row);
  }

  await writeToFile(path.join(ROOT, category + '.csv'), results);
}

async function run() {
  await extractBasic();
  await extractHistory();
  await extractManager();
  await extractRisk();
  await extractScore();
  await extractTurnoverAndCentralization();
  await extractTop10Holdings();
}

module.exports = {
  run
};

