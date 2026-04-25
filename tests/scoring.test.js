import assert from "node:assert/strict";
import { scoreStock, scoreUniverse } from "../src/scoring.js";

const today = new Date("2026-04-25T00:00:00");

const strong = {
  symbol: "TST",
  name: "Test Quality",
  roe: 20,
  operating_margin: 20,
  debt_to_equity: 40,
  ocf_to_net_income: 1.2,
  revenue_growth: 18,
  eps_growth: 20,
  industry_momentum_6m: 12,
  estimate_revision_eps: 7,
  estimate_revision_revenue: 4,
  relative_strength_6m: 12,
  relative_strength_12m: 18,
  post_earnings_reaction: 4,
  avg_daily_turnover_million: 500,
  pe_forward: 18,
  industry_pe_forward: 22,
  red_flags: "",
  data_source: "SEC EDGAR + IBES",
  source_date: "2026-04-20"
};

const risky = {
  ...strong,
  symbol: "RISK",
  roe: -10,
  eps_growth: -20,
  debt_to_equity: 260,
  ocf_to_net_income: -0.5,
  red_flags: "监管立案",
  data_source: "Social media forum"
};

const strongScore = scoreStock(strong, today);
assert.equal(strongScore.output, "候选买入");
assert.equal(strongScore.vetoes.length, 0);
assert.ok(strongScore.totalScore >= 80);
assert.equal(strongScore.sourceReliability.level, "high");

const riskyScore = scoreStock(risky, today);
assert.equal(riskyScore.output, "观察/回避");
assert.ok(riskyScore.vetoes.length >= 3);
assert.equal(riskyScore.sourceReliability.level, "low");

const universe = scoreUniverse([risky, strong], today);
assert.equal(universe[0].row.symbol, "TST");
assert.equal(universe[1].row.symbol, "RISK");

console.log("scoring tests passed");
