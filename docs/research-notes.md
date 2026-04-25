# 策略调查摘要

## 结论

你原来的骨架成立，但 V1 应该更像“研究流程控制台”，而不是“自动买入模型”。最稳的落地顺序是：

```text
主题/行业池 -> 财务质量硬过滤 -> 相对估值与预期修订 -> 价格确认与流动性 -> 风险 veto -> 一页式卡片
```

## 公开依据

- Fama-French 五因子框架把盈利能力和投资强度纳入资产定价解释变量，说明“质量/盈利能力”不只是财报爱好者的主观偏好。
- AQR 的 Quality Minus Junk 把高质量公司概括为盈利、增长、安全、分红/管理良好等维度，并提供了长期跨市场数据集。
- S&P Quality Index 方法论使用 ROE、应计项和财务杠杆来定义质量，和 V1 的质量过滤高度一致。
- MSCI Momentum Indexes 使用剔除最近 1 个月后的 6 个月和 12 个月价格表现，并做波动率调整，支持“价格确认”而不是追逐短期热度。
- MSCI 2025 年 Analyst Sentiment 研究把销售、EPS、现金流、目标价、评级等修订做成等权复合指标，支持把“情绪面”主要解释为“预期修订”。
- CFA Institute 的回测和模型验证材料强调滚动窗口、交易成本、幸存者偏差、前视偏差和结构性断点，这正是 V1 不做过度精细权重的原因。

## 信息源准确性分层

| 来源 | 可信度 | 用法 |
| --- | --- | --- |
| 监管披露、交易所公告、SEC EDGAR、上市公司定期报告 | 高 | 作为财务事实、重大事件和风险 veto 的优先来源 |
| LSEG I/B/E/S、FactSet、Bloomberg、Wind、Choice | 高到中 | 适合一致预期、分析师修订、同行估值；成本较高，需要授权 |
| Alpha Vantage、Tushare、AKShare、东方财富、Yahoo 等聚合源 | 中 | 适合 V1 原型和初筛；关键字段要抽样核对 |
| 社交平台、论坛、股吧、雪球、短视频 | 低 | 只用于发现线索和叙事变化，不作为买入确认 |

## 可用技能与插件

- Binance 插件：本会话可用，但它覆盖的是币安公开市场数据、衍生品、期权等，不适合股票基本面选股 V1。
- Hugging Face 插件/技能：后续如果要做新闻/研报/社媒文本分类、情绪模型或本地 NLP，可以用。
- GitHub 插件/技能：后续提交仓库、开 PR、处理 CI 时有用。
- Notion 插件/技能：如果你想把每次复盘、个股卡片和主题池沉淀进 Notion，可以用。
- Excel 技能：如果要把评分卡导出为 xlsx、公式表、图表看板，可以用。

## V1 不做的事

- 不自动下单。
- 不用社交热度作为买入确认。
- 不把“产业链地位”“叙事强度”“稀缺性”重复计分。
- 不把 pre-profit 创新药、困境反转、强周期拐点和成熟盈利公司放进同一套分数。

## 参考链接

- Fama and French five-factor model: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2601662
- AQR Quality Minus Junk: https://www.aqr.com/Insights/Research/Working-Paper/Quality-Minus-Junk
- AQR QMJ datasets: https://www.aqr.com/insights/datasets/quality-minus-junk-factors-monthly
- S&P Quality Indices methodology: https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-quality-indices.pdf
- MSCI Momentum methodology: https://www.msci.com/indexes/documents/methodology/2_MSCI_Momentum_Indexes_Methodology_20231120.pdf
- MSCI Analyst Sentiment: https://www.msci.com/downloads/web/msci-com/research-and-insights/paper/analyst-sentiment-from-factor-to-indexation/Analyst%20Sentiment.pdf
- CFA Institute Backtesting and Simulation: https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2025/backtesting-and-simulation
- CFA Institute Investment Model Validation: https://rpc.cfainstitute.org/en/research/foundation/2024/investment-model-validation
- ESMA social media investment recommendations: https://www.esma.europa.eu/cs/press-news/esma-news/esma-addresses-investment-recommendations-made-social-media-platforms
- SEC EDGAR APIs: https://www.sec.gov/edgar/sec-api-documentation
- Alpha Vantage API docs: https://www.alphavantage.co/documentation/
- AKShare PyPI: https://pypi.org/project/akshare/
- OpenBB Open Data Platform: https://openbb.co/products/odp/
