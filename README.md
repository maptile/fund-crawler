# 天天基金抓取器

This tool is used to crawl [ttfund](https://1234567.com.cn) mutual fund data based on which fund you are interested with(via config file).

## 特点

- 可配置需要抓取的基金代码列表
- 抓取基金基本信息、购买费率、基金经理、评级、风险（夏普比率、标准差、历史涨幅）等
- 抓取资料和提取数据分两步进行，这样在后期调整提取逻辑时，无需重新抓取
- 抓取结果保存为html格式
- 提取数据保存为csv格式
- 附带excel模板，可以直接将抓取结果贴入对应sheet，以便合并展示

## 使用方法

### 安装

因为是通过playwright抓取数据，所以需要先安装playwright

```
npx playwright install
git clone https://github.com/maptile/ttfund-crawler.git
cd ttfund-crawler
npm i
```

### 配置

打开`config.js`，编辑watchedFunds数组，数组内容为需要抓取的基金代码，如000000, 000001等。

### 抓取数据

默认以headless方式开启chromium抓取，所以看不到界面输出。
```
npm start crawl
```

如果想看chromium的访问内容，可以执行

```
npm start -- crawl --headless false
```

抓取结果会按分类，放在./results中

### 提取数据

```
npm start extract
```

提取的结果会放在./results中，csv格式

### 汇总结果

1. 打开templates/template1.xlsx
1. 第一列输入关注的基金代码，需要使用字符类型
1. 打开./results/basic.csv，记得将第一列“代码”设置为文本类型
1. 将内容粘贴到template1.xlsx中对应的sheet中
1. 重复上述操作，直到把所有csv都贴进去

## 常见问题

* 如果贴好了csv，但第一个sheet（基金）没有显示正确的内容，那么请核对每一个sheet的代码是否是相同的类型

## 示例

![Sample Screen Shot](/screenshot.png)

## 计划

以下为一些想法，未进行重要程度排序。

- [X] 重构：让抓取器只抓取页面，将html分析等放在extractor中
- [X] 抓取基金换手率
- [X] 基金股票前十持仓集中度
- [X] 基金持仓前十
- [X] 基金评级只抓取最近6个月的数据
- [ ] 重构：提取数据的结果放到一个csv中，便于后续使用
- [ ] 抓取分红
- [ ] 抓取ETF基金的跟踪指数，以及指数的市盈率、市净率等
- [ ] 抓取晨星评级
- [ ] 容器化
- [ ] 自动生成excel
- [ ] 自动生成网页
