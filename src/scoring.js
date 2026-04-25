const NUMBER_FIELDS = [
  "roe",
  "operating_margin",
  "debt_to_equity",
  "ocf_to_net_income",
  "revenue_growth",
  "eps_growth",
  "estimate_revision_eps",
  "estimate_revision_revenue",
  "relative_strength_6m",
  "relative_strength_12m",
  "industry_momentum_6m",
  "post_earnings_reaction",
  "avg_daily_turnover_million",
  "pe_forward",
  "industry_pe_forward",
  "drawdown_from_52w",
  "volatility_1y"
];

const VETO_PATTERN =
  /fraud|delist|negative equity|audit qualified|监管立案|退市|财务造假|重大诉讼|无法表示意见|保留意见|st\b/i;

export function normalizeRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim();
    normalized[cleanKey] = typeof value === "string" ? value.trim() : value;
  }

  for (const field of NUMBER_FIELDS) {
    normalized[field] = parseNumber(normalized[field]);
  }

  normalized.symbol = text(normalized.symbol).toUpperCase();
  normalized.name = text(normalized.name);
  normalized.sector = text(normalized.sector);
  normalized.industry = text(normalized.industry);
  normalized.theme = text(normalized.theme);
  normalized.red_flags = text(normalized.red_flags);
  normalized.catalysts = text(normalized.catalysts);
  normalized.notes = text(normalized.notes);
  normalized.data_source = text(normalized.data_source);
  normalized.source_date = text(normalized.source_date);

  return normalized;
}

export function scoreStock(rawRow, today = new Date()) {
  const row = normalizeRow(rawRow);
  const quality = scoreQuality(row);
  const growth = scoreGrowth(row);
  const expectation = scoreExpectation(row);
  const market = scoreMarket(row);
  const vetoes = collectVetoes(row);
  const warnings = collectWarnings(row, today);
  const sourceReliability = classifySource(row.data_source);
  const sourceAge = sourceAgeDays(row.source_date, today);

  if (sourceReliability.level === "low") {
    warnings.push("信息源可信度低，仅适合作为线索，不能作为买入确认");
  }

  if (Number.isFinite(sourceAge) && sourceAge > 120) {
    warnings.push(`信息源已超过 ${sourceAge} 天，需刷新后再决策`);
  }

  const weighted =
    quality.score * 0.3 + growth.score * 0.25 + expectation.score * 0.25 + market.score * 0.2;
  const totalScore = Math.round((weighted / 2) * 100);
  const groupColors = {
    quality: colorForGroup(quality.score),
    growth: colorForGroup(growth.score),
    expectation: colorForGroup(expectation.score),
    market: colorForGroup(market.score)
  };

  const output = classifyOutput(totalScore, groupColors, vetoes);

  return {
    row,
    totalScore,
    output,
    vetoes,
    warnings,
    sourceReliability,
    sourceAge,
    groups: {
      quality,
      growth,
      expectation,
      market
    },
    groupColors,
    aiPrompt: buildAiPrompt(row, totalScore, output, vetoes, warnings, {
      quality,
      growth,
      expectation,
      market
    })
  };
}

export function scoreUniverse(rows, today = new Date()) {
  return rows
    .map((row) => scoreStock(row, today))
    .sort((a, b) => {
      if (a.vetoes.length !== b.vetoes.length) return a.vetoes.length - b.vetoes.length;
      return b.totalScore - a.totalScore;
    });
}

function scoreQuality(row) {
  const parts = [
    metricScore(row.roe, 15, 8, "ROE"),
    metricScore(row.operating_margin, 15, 8, "经营利润率"),
    invertedMetricScore(row.debt_to_equity, 60, 120, "资产负债/权益压力"),
    metricScore(row.ocf_to_net_income, 1, 0.7, "经营现金流/净利润")
  ];
  return group("质量与财务", parts);
}

function scoreGrowth(row) {
  const parts = [
    metricScore(row.revenue_growth, 15, 5, "收入增长"),
    metricScore(row.eps_growth, 15, 5, "EPS 增长"),
    metricScore(row.industry_momentum_6m, 8, 0, "行业 6M 动量")
  ];
  return group("增长与景气", parts);
}

function scoreExpectation(row) {
  const valuationRatio =
    row.pe_forward && row.industry_pe_forward ? row.pe_forward / row.industry_pe_forward : NaN;
  const valuation = Number.isFinite(valuationRatio)
    ? {
        label: "行业相对估值",
        value: valuationRatio,
        score: valuationRatio <= 0.85 ? 2 : valuationRatio <= 1.1 ? 1 : 0,
        text: `${formatNumber(valuationRatio, 2)}x 行业中位`
      }
    : missingPart("行业相对估值");

  const parts = [
    valuation,
    metricScore(row.estimate_revision_eps, 5, 0, "EPS 一致预期修订"),
    metricScore(row.estimate_revision_revenue, 3, 0, "收入一致预期修订")
  ];
  return group("估值与预期差", parts);
}

function scoreMarket(row) {
  const parts = [
    metricScore(row.relative_strength_6m, 10, 0, "6M 相对强弱"),
    metricScore(row.relative_strength_12m, 15, 0, "12M 相对强弱"),
    metricScore(row.post_earnings_reaction, 3, 0, "财报后反应"),
    metricScore(row.avg_daily_turnover_million, 300, 50, "日均成交额")
  ];
  return group("市场确认与可交易性", parts);
}

function group(name, parts) {
  const valid = parts.filter((part) => Number.isFinite(part.score));
  const score = valid.length
    ? valid.reduce((sum, part) => sum + part.score, 0) / valid.length
    : 0;
  return {
    name,
    score,
    label: colorForGroup(score),
    parts
  };
}

function metricScore(value, green, yellow, label) {
  if (!Number.isFinite(value)) return missingPart(label);
  const score = value >= green ? 2 : value >= yellow ? 1 : 0;
  return { label, value, score, text: `${formatNumber(value, 1)}%` };
}

function invertedMetricScore(value, greenMax, yellowMax, label) {
  if (!Number.isFinite(value)) return missingPart(label);
  const score = value <= greenMax ? 2 : value <= yellowMax ? 1 : 0;
  return { label, value, score, text: `${formatNumber(value, 1)}%` };
}

function missingPart(label) {
  return { label, value: NaN, score: NaN, text: "缺失" };
}

function collectVetoes(row) {
  const vetoes = [];

  if (VETO_PATTERN.test(row.red_flags)) {
    vetoes.push("重大红旗触发硬否决");
  }

  if (Number.isFinite(row.avg_daily_turnover_million) && row.avg_daily_turnover_million < 30) {
    vetoes.push("流动性过低，真实交易成本不可控");
  }

  if (Number.isFinite(row.roe) && row.roe < 0 && Number.isFinite(row.eps_growth) && row.eps_growth < 0) {
    vetoes.push("负 ROE 且盈利继续恶化，不适用成熟盈利型评分卡");
  }

  if (Number.isFinite(row.debt_to_equity) && row.debt_to_equity > 220) {
    vetoes.push("杠杆显著过高，资本结构风险优先否决");
  }

  if (Number.isFinite(row.ocf_to_net_income) && row.ocf_to_net_income < 0) {
    vetoes.push("经营现金流与利润严重背离");
  }

  return vetoes;
}

function collectWarnings(row) {
  const warnings = [];

  if (Number.isFinite(row.ocf_to_net_income) && row.ocf_to_net_income < 0.7) {
    warnings.push("经营现金流/净利润偏低，需要核对收入确认和应收账款");
  }

  if (Number.isFinite(row.drawdown_from_52w) && row.drawdown_from_52w > 40) {
    warnings.push("距 52 周高点回撤较大，需确认趋势是否已经破坏");
  }

  if (Number.isFinite(row.volatility_1y) && row.volatility_1y > 60) {
    warnings.push("年化波动偏高，仓位和止损要更保守");
  }

  if (Number.isFinite(row.estimate_revision_eps) && row.estimate_revision_eps < 0) {
    warnings.push("EPS 一致预期下修，暂不把叙事当作确认信号");
  }

  return warnings;
}

function classifyOutput(totalScore, colors, vetoes) {
  if (vetoes.length) return "观察/回避";
  const greenCount = Object.values(colors).filter((color) => color === "green").length;
  if (totalScore >= 70 && greenCount >= 3 && colors.market !== "red") return "候选买入";
  if (totalScore >= 55) return "值得深挖";
  return "观察/回避";
}

function classifySource(source) {
  const value = source.toLowerCase();
  if (!value) return { level: "unknown", label: "未注明", detail: "缺少来源，不能进入正式候选池" };
  if (/sec|edgar|10-k|10-q|exchange|annual report|quarterly report|巨潮|上交所|深交所|港交所|公告/.test(value)) {
    return { level: "high", label: "高", detail: "公告、交易所或监管披露，适合作为基础事实" };
  }
  if (/ibes|lseg|factset|bloomberg|wind|choice|alpha vantage|tushare|akshare|eastmoney|东方财富|同花顺|vendor/.test(value)) {
    return { level: "medium", label: "中", detail: "聚合或商业数据源，适合量化筛选，关键字段需抽样核对" };
  }
  if (/x\.com|twitter|reddit|stocktwits|youtube|雪球|股吧|论坛|social|wechat|微信/.test(value)) {
    return { level: "low", label: "低", detail: "社交或论坛来源，只适合发现线索" };
  }
  return { level: "medium", label: "中", detail: "未识别来源类型，默认按中等可信处理" };
}

function colorForGroup(score) {
  if (score >= 1.5) return "green";
  if (score >= 0.8) return "amber";
  return "red";
}

function buildAiPrompt(row, totalScore, output, vetoes, warnings, groups) {
  const lines = [
    "请作为严谨的股票研究助理，基于下面的一页式评分卡，输出一份只用于研究的投资备忘录。",
    "要求：先列关键事实，再列可证伪假设；不要因为市场叙事给额外加分；必须区分事实、推断和待核验数据；最后给出需要补充的数据清单。",
    "",
    `股票：${row.symbol} ${row.name}`,
    `行业/主题：${row.industry || row.sector || "未填"} / ${row.theme || "未填"}`,
    `系统层级：${output}，V1 分数：${totalScore}`,
    `硬否决：${vetoes.length ? vetoes.join("；") : "无"}`,
    `风险提示：${warnings.length ? warnings.join("；") : "无"}`,
    "",
    `质量分：${formatNumber(groups.quality.score, 2)} / 2`,
    `增长分：${formatNumber(groups.growth.score, 2)} / 2`,
    `预期估值分：${formatNumber(groups.expectation.score, 2)} / 2`,
    `市场确认分：${formatNumber(groups.market.score, 2)} / 2`,
    "",
    `ROE：${formatField(row.roe, "%")}；经营利润率：${formatField(row.operating_margin, "%")}；债务/权益：${formatField(row.debt_to_equity, "%")}；OCF/净利润：${formatField(row.ocf_to_net_income, "x")}`,
    `收入增长：${formatField(row.revenue_growth, "%")}；EPS 增长：${formatField(row.eps_growth, "%")}；行业动量：${formatField(row.industry_momentum_6m, "%")}`,
    `EPS 预期修订：${formatField(row.estimate_revision_eps, "%")}；收入预期修订：${formatField(row.estimate_revision_revenue, "%")}；Forward PE：${formatField(row.pe_forward, "x")}；行业 PE：${formatField(row.industry_pe_forward, "x")}`,
    `6M 相对强弱：${formatField(row.relative_strength_6m, "%")}；12M 相对强弱：${formatField(row.relative_strength_12m, "%")}；财报后反应：${formatField(row.post_earnings_reaction, "%")}；日均成交额：${formatField(row.avg_daily_turnover_million, "百万")}`,
    "",
    `催化：${row.catalysts || "未填"}`,
    `红旗：${row.red_flags || "未填"}`,
    `备注：${row.notes || "未填"}`,
    `数据来源：${row.data_source || "未填"}；来源日期：${row.source_date || "未填"}`
  ];
  return lines.join("\n");
}

function sourceAgeDays(sourceDate, today) {
  if (!sourceDate) return NaN;
  const parsed = new Date(`${sourceDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return NaN;
  const start = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((end - start) / 86400000));
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[%,$，]/g, "").trim();
  if (!cleaned) return NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatNumber(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "NA";
}

function formatField(value, suffix) {
  if (!Number.isFinite(value)) return "缺失";
  if (suffix === "x") return `${formatNumber(value, 2)}x`;
  if (suffix === "百万") return `${formatNumber(value, 0)}百万`;
  return `${formatNumber(value, 1)}${suffix}`;
}

export const schemaFields = [
  "symbol",
  "name",
  "sector",
  "industry",
  "theme",
  "roe",
  "operating_margin",
  "debt_to_equity",
  "ocf_to_net_income",
  "revenue_growth",
  "eps_growth",
  "industry_momentum_6m",
  "estimate_revision_eps",
  "estimate_revision_revenue",
  "relative_strength_6m",
  "relative_strength_12m",
  "post_earnings_reaction",
  "avg_daily_turnover_million",
  "pe_forward",
  "industry_pe_forward",
  "drawdown_from_52w",
  "volatility_1y",
  "red_flags",
  "catalysts",
  "notes",
  "data_source",
  "source_date"
];
