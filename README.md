# 基金抓取器

This tool is used to crawl [ttfund](https://1234567.com.cn) and [morningstar](https://www.morningstar.cn) mutual fund data based on which fund you are interested with(via config file).

## 特点

- 可配置需要抓取的基金代码列表
- 抓取基金基本信息、购买费率、基金经理、评级、风险（夏普比率、标准差、历史涨幅）等
- 抓取资料和提取数据分两步进行，这样在后期调整提取逻辑时，无需重新抓取
- 抓取结果保存为json格式
- 提取数据保存为csv格式

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

将`config.sample.js`复制为`config.js`，并编辑watchedFunds数组，数组内容为需要抓取的基金代码，如000000, 000001等。

如果需要抓取晨星的数据，可以在morningstar一节中填入用户名和密码，登陆时可以自动填充（可选步骤）。

### 抓取数据

默认以带有UI的方式开启chromium抓取，为的是能看到抓取过程。
```
npm start -- crawl
```

如果感觉一切顺利，想批量抓取，最好以headless的方式，这样不会影响电脑的使用。

```
npm start -- crawl --headless
```

抓取结果会按分类，放在./results中

### 抓取结果

抓取结果会放在./results/rawdata中，一个基金编号一个文件。

文件结构为：

```
{
  "code": "000000", // 基金编号
  "timestamp": 1644933847903, // 抓取时间
  "content": {
    "morningstar": {}, // 抓取到的晨星内容
    "ttfund": {} // 抓取到的天天基金内容
  }
}
```

### 提取数据

```
npm start -- extract
```

提取的结果会放在./results/output.csv中

## 常见问题

* 打开的CSV，基金编码为数字（开头的0丢了）。需要在打开时，将第一列设置为“文本”类型。
* 无法抓到晨星评级。暂时无解决办法。临时方案为：
  * 在基金搜索结果中，按三年评级排序，复制列表内容到excel
  * 找到最后一个三年五星的基金，在excel里将该基金编码之前的基金都写上5
  * 找到最后一个三年四星的基金，在excel里将该基金编码之前的基金都写上4
  * 同理，可以按五年评级排序，找到五年评级中的四、五星基金
  * 再使用类似vlookup的方式，将数据整合起来

## 示例

![Sample Screen Shot](/screenshot.png)

## 计划

- [X] 重构：让抓取器只抓取页面，将html分析等放在extractor中
- [X] 抓取基金换手率
- [X] 基金股票前十持仓集中度
- [X] 基金持仓前十
- [X] 基金评级只抓取最近6个月的数据
- [X] 将配置文件变成config.sample.js，并默认不提交config.js
- [X] 抓取晨星数据
- [X] 建立一个文件格式，保存每个基金的抓取结果和抓取事件，以便实行增量抓取
- [X] 可以将数据提取结果合并到一个csv中，便于后续使用
- [ ] 支持从零开始抓取数据
  - [ ] 从天天基金的基金列表按4433规则抓取符合条件的基金代码
  - [ ] 从晨星抓取3年5星，5年4-5星的基金代码
  - [ ] 使用--append, --replace参数将抓取的结果保存到config.js中
- [ ] 抓取分红
- [ ] 抓取ETF基金的跟踪指数，以及指数的市盈率、市净率等
- [ ] 容器化
- [ ] 自动生成excel
- [ ] 自动生成网页
