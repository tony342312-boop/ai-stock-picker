# AI 选股评分卡 V1

这是一个本地运行的第一版选股研究工具。它不自动下单，也不把社交热度当成买入确认；核心是把股票拆成可复核的几个问题：财务质量是否过关、增长和行业景气是否配合、预期是否上修、价格和流动性是否确认，以及是否触发硬否决。

## 现在能做什么

- 导入 CSV 候选池，按统一字段打分。
- 输出三层结论：`候选买入`、`值得深挖`、`观察/回避`。
- 先执行 veto：重大财务/治理红旗、极差流动性、负 ROE 且盈利恶化、过高杠杆、现金流严重背离。
- 四组信号评分：质量与财务、增长与景气、估值与预期差、市场确认与可交易性。
- 标记来源可信度：公告/交易所/监管披露为高，商业或聚合数据为中，社交/论坛为低。
- 为每只股票生成一段 AI 研究提示词，用于后续写投资备忘录或做人工复核。

## 使用

直接打开 [index.html](./index.html)。页面会自动载入内置样例，也可以点击 `导入 CSV` 使用自己的候选池。

也可以复制 [data/sample-stocks.csv](./data/sample-stocks.csv) 的表头作为模板。

## CSV 字段

数值字段默认用百分数的数值本身，例如 `roe=15` 表示 15%。`ocf_to_net_income` 用倍数，例如 `1.1`。`avg_daily_turnover_million` 用百万货币单位。

必备字段：

```text
symbol,name,sector,industry,theme,roe,operating_margin,debt_to_equity,ocf_to_net_income,revenue_growth,eps_growth,industry_momentum_6m,estimate_revision_eps,estimate_revision_revenue,relative_strength_6m,relative_strength_12m,post_earnings_reaction,avg_daily_turnover_million,pe_forward,industry_pe_forward,drawdown_from_52w,volatility_1y,red_flags,catalysts,notes,data_source,source_date
```

## V1 权重

| 组别 | 权重 | 作用 |
| --- | ---: | --- |
| 质量与财务 | 30% | 先筛掉财务质量差、利润不可信、杠杆过重的公司 |
| 增长与景气 | 25% | 判断个股增长和行业顺风是否同向 |
| 估值与预期差 | 25% | 估值先做行业内比较，重点看一致预期修订 |
| 市场确认与可交易性 | 20% | 检查相对强弱、财报后反应和流动性 |

## 运行测试

```powershell
npm test
```

测试不需要安装依赖，只使用 Node.js 内置模块。

## 下一步

- 接入真实数据源：美股优先可用 SEC EDGAR + Alpha Vantage/Polygon/FMP；A 股可先用 Tushare/AKShare/东方财富接口，再抽样对照交易所公告。
- 增加回测模块：先做滚动窗口、固定调仓频率、交易成本、幸存者偏差和前视偏差检查。
- 增加二级股票池：pre-profit 创新药、强周期困境反转、小市值高弹性主题股不应与成熟盈利公司共用同一张评分卡。

本工具只用于研究和流程管理，不构成投资建议。
