const _ = require('lodash');
const cheerio = require('cheerio');
const utils = require('../lib/utils');

const colorLogger = require('../lib/colorLogger');
const log4 = colorLogger.getLogger(4);
const log8 = colorLogger.getLogger(8);

const PROVIDER_NAME = 'morningstar';
const HEADER = [
    '风格箱',
    '今年以来',
    '2021',
    '2020',
    '2019',
    '2018',
    '2017',
    '2016',
    '2015',
    '一年回报',
    '二年回报（年化）',
    '三年回报（年化）',
    '五年回报（年化）',
    '十年回报（年化）',
    '最差三个月回报',
    '最差六个月回报',
    '标准差（%）-三年',
    '标准差（%）-五年',
    '标准差（%）-十年',
    '晨星风险系数-三年',
    '晨星风险系数-五年',
    '晨星风险系数-十年',
    '夏普比率-三年',
    '夏普比率-五年',
    '夏普比率-十年',
    '阿尔法系数（%）',
    '贝塔系数',
    'R平方'
];

async function crawl(code, options){
  const page = await options.context.newPage();
  await page.goto('http://www.morningstar.cn/main/default.aspx');
  await page.waitForLoadState('networkidle');
  await page.click('#quickquery input.queryTxt');

  for(const character of code){
    await page.keyboard.press(character);
  }

  let waitTimesLeft = 50;
  while((await page.$$('.ac_results ul li')).length != 1){
    if(waitTimesLeft <= 0){
      throw new Error('Too many waits');
    }
    waitTimesLeft-=1;
    log8.info('waiting for search result');
    await page.waitForTimeout(100);
  }

  const [fundPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.keyboard.press('Enter')
  ]);

  await fundPage.waitForLoadState('networkidle');
  const html = await fundPage.innerHTML('html');

  await fundPage.close();
  await page.close();

  return html;
}

function findMatchedItem($, el, texts, callback){
  el = $(el);

  for(let i = 0; i < el.length; i++){
    const li = $(el[i]);

    if(texts.indexOf(li.text()) > -1){
      callback(li.text(), i);
    }
  }
}

function extractYearReturn($){
  const years = [];
  const returns = [];
  const doms = $('#qt_per li');

  const rowTitles = ['今年以来', '总回报'];
  findMatchedItem($, doms, rowTitles, (text, index) => {
    if(text == rowTitles[0]){
      _.range(8).forEach((i) => { // NOTE: i starting from 0
        years.push($(doms[index + i]).text());
      });
    }

    if(text == rowTitles[1]){
      _.range(1, 9).forEach((i) => { // NOTE: i starting from 1
        returns.push(utils.strPercentageValueToNumber($(doms[index + i]).text()));
      });
    }
  });

  return _.zipObject(years, returns);
}

function extractHistoryReturn($){
  const doms = $('#qt_return1 li');

  const result = {};
  const rowTitles = ['一年回报', '二年回报（年化）', '三年回报（年化）', '五年回报（年化）', '十年回报（年化）'];
  findMatchedItem($, doms, rowTitles, (text, index) => {
    result[text] = utils.strPercentageValueToNumber($(doms[index + 1]).text());
  });

  return result;
}

function extractWorstReturn($){
  const doms = $('#qt_worst li');

  const result = {};
  const rowTitles = ['最差三个月回报', '最差六个月回报'];
  findMatchedItem($, doms, rowTitles, (text, index) => {
    result[text] = utils.strPercentageValueToNumber($(doms[index + 1]).text());
  });

  return result;
}

function extractRisk($){
  const doms = $('#qt_risk li');

  const result = {};
  const rowTitles = ['标准差（%）', '晨星风险系数', '夏普比率'];
  findMatchedItem($, doms, rowTitles, (text, index) => {
    if(text == rowTitles[0]){
      result[text + '-三年'] = utils.strPercentageValueToNumber($(doms[index + 1]).text());
      result[text + '-五年'] = utils.strPercentageValueToNumber($(doms[index + 3]).text());
      result[text + '-十年'] = utils.strPercentageValueToNumber($(doms[index + 5]).text());
    } else {
      result[text + '-三年'] = utils.strToNumber($(doms[index + 1]).text());
      result[text + '-五年'] = utils.strToNumber($(doms[index + 3]).text());
      result[text + '-十年'] = utils.strToNumber($(doms[index + 5]).text());
    }
  });

  return result;
}

function extractRiskStats($){
  const doms = $('#qt_riskstats li');

  const result = {};
  const rowTitles = ['阿尔法系数（%）', '贝塔系数', 'R平方'];
  findMatchedItem($, doms, rowTitles, (text, index) => {
    if(text == rowTitles[0]){
      result[text] = utils.strPercentageValueToNumber($(doms[index + 1]).text());
    } else {
      result[text] = utils.strToNumber($(doms[index + 1]).text());
    }
  });

  return result;
}

async function extract(content, options){
  if(!options){
    options = {};
  }

  const $ = cheerio.load(content);

  const styleBoxName = $('.category').text();

  const yearReturn = extractYearReturn($);

  const historyReturn = extractHistoryReturn($);

  const worstReturn= extractWorstReturn($);

  const risk = extractRisk($);

  const riskStats = extractRiskStats($);

  const data = _.assign({}, {'风格箱': styleBoxName}, yearReturn, historyReturn, worstReturn, risk, riskStats);

  return [
    data['风格箱'],
    data['今年以来'],
    data['2021'],
    data['2020'],
    data['2019'],
    data['2018'],
    data['2017'],
    data['2016'],
    data['2015'],
    data['一年回报'],
    data['二年回报（年化）'],
    data['三年回报（年化）'],
    data['五年回报（年化）'],
    data['十年回报（年化）'],
    data['最差三个月回报'],
    data['最差六个月回报'],
    data['标准差（%）-三年'],
    data['标准差（%）-五年'],
    data['标准差（%）-十年'],
    data['晨星风险系数-三年'],
    data['晨星风险系数-五年'],
    data['晨星风险系数-十年'],
    data['夏普比率-三年'],
    data['夏普比率-五年'],
    data['夏普比率-十年'],
    data['阿尔法系数（%）'],
    data['贝塔系数'],
    data['R平方']
  ];
}

async function login(options){
  const page = await options.context.newPage();
  await page.goto('https://www.morningstar.cn/');
  await page.click('text="登录"');

  log4.info('waiting for page fully loaded');

  await page.fill('#emailTxt', _.get(options, ['config', 'providerSettings', 'morningstar', 'credential', 'username'], ''));
  await page.fill('#pwdValue', _.get(options, ['config', 'providerSettings', 'morningstar', 'credential', 'password'], ''));

  log4.info('please type recapchar code and click login button');

  await page.waitForURL('https://www.morningstar.cn/main/default.aspx', {
    timeout: 5 * 60 * 1000
  });

  log4.info('done');

  await page.context().storageState({ path: 'auth.json' });
}

module.exports = {
  name: PROVIDER_NAME,
  header: HEADER,
  crawl,
  extract,
  login
};

