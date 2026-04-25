import { SAMPLE_CSV } from "./sampleData.js";
import { schemaFields, scoreUniverse } from "./scoring.js";

const state = {
  rows: [],
  scored: [],
  selectedSymbol: "",
  filter: "all",
  query: "",
  minScore: 0,
  sourceName: ""
};

const els = {
  csvInput: document.querySelector("#csvInput"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  searchInput: document.querySelector("#searchInput"),
  minScoreInput: document.querySelector("#minScoreInput"),
  minScoreOutput: document.querySelector("#minScoreOutput"),
  resultsBody: document.querySelector("#resultsBody"),
  detailPanel: document.querySelector("#detailPanel"),
  datasetMeta: document.querySelector("#datasetMeta"),
  statCount: document.querySelector("#statCount"),
  statCandidate: document.querySelector("#statCandidate"),
  statVeto: document.querySelector("#statVeto"),
  statLowSource: document.querySelector("#statLowSource"),
  segments: Array.from(document.querySelectorAll(".segment"))
};

els.loadSampleBtn.addEventListener("click", () => loadCsv(SAMPLE_CSV, "内置样例"));
els.csvInput.addEventListener("change", handleFile);
els.exportBtn.addEventListener("click", exportScoredCsv);
els.clearBtn.addEventListener("click", clearData);
els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  render();
});
els.minScoreInput.addEventListener("input", (event) => {
  state.minScore = Number(event.target.value);
  els.minScoreOutput.textContent = String(state.minScore);
  render();
});

for (const segment of els.segments) {
  segment.addEventListener("click", () => {
    state.filter = segment.dataset.filter;
    for (const item of els.segments) item.classList.toggle("active", item === segment);
    render();
  });
}

loadCsv(SAMPLE_CSV, "内置样例");

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  loadCsv(text, file.name);
  event.target.value = "";
}

function loadCsv(csvText, sourceName) {
  const rows = parseCsv(csvText);
  state.rows = rows;
  state.scored = scoreUniverse(rows);
  state.selectedSymbol = state.scored[0]?.row.symbol ?? "";
  state.sourceName = sourceName;
  render();
}

function clearData() {
  state.rows = [];
  state.scored = [];
  state.selectedSymbol = "";
  state.sourceName = "";
  render();
}

function render() {
  const rows = filteredRows();
  renderStats();
  renderTable(rows);
  renderDetail(rows.find((item) => item.row.symbol === state.selectedSymbol) ?? rows[0]);
  els.datasetMeta.textContent = state.scored.length
    ? `${state.sourceName}，${state.scored.length} 只股票，已按 veto 和分数排序`
    : "未载入数据";
}

function filteredRows() {
  return state.scored.filter((item) => {
    const row = item.row;
    const haystack = `${row.symbol} ${row.name} ${row.sector} ${row.industry} ${row.theme}`.toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    const matchesFilter = state.filter === "all" || item.output === state.filter;
    const matchesScore = item.totalScore >= state.minScore;
    return matchesQuery && matchesFilter && matchesScore;
  });
}

function renderStats() {
  els.statCount.textContent = String(state.scored.length);
  els.statCandidate.textContent = String(state.scored.filter((item) => item.output === "候选买入").length);
  els.statVeto.textContent = String(state.scored.filter((item) => item.vetoes.length).length);
  els.statLowSource.textContent = String(
    state.scored.filter((item) => item.sourceReliability.level === "low").length
  );
}

function renderTable(rows) {
  if (!rows.length) {
    els.resultsBody.innerHTML = `<tr><td colspan="8">没有匹配的股票。请调整筛选或导入 CSV。</td></tr>`;
    return;
  }

  els.resultsBody.innerHTML = rows
    .map((item) => {
      const selected = item.row.symbol === state.selectedSymbol ? " selected" : "";
      return `<tr class="${selected}" data-symbol="${escapeHtml(item.row.symbol)}">
        <td>
          <div class="stock-cell">
            <span class="stock-symbol">${escapeHtml(item.row.symbol || "NA")}</span>
            <span class="stock-name">${escapeHtml(item.row.name || "未命名")} · ${escapeHtml(item.row.industry || item.row.sector || "未填行业")}</span>
          </div>
        </td>
        <td>${pill(item.output, outputColor(item.output, item.vetoes))}</td>
        <td><span class="score">${item.totalScore}</span></td>
        <td>${bar(item.groups.quality.score)}</td>
        <td>${bar(item.groups.growth.score)}</td>
        <td>${bar(item.groups.expectation.score)}</td>
        <td>${bar(item.groups.market.score)}</td>
        <td>${item.vetoes.length ? pill("veto", "red") : pill(item.sourceReliability.label, sourceColor(item.sourceReliability.level))}</td>
      </tr>`;
    })
    .join("");

  for (const row of els.resultsBody.querySelectorAll("tr[data-symbol]")) {
    row.addEventListener("click", () => {
      state.selectedSymbol = row.dataset.symbol;
      render();
    });
  }
}

function renderDetail(item) {
  if (!item) {
    els.detailPanel.innerHTML = `<div class="empty-state"><h2>选择一只股票</h2><p>评分卡会在这里显示硬过滤、四组信号、来源可信度、催化与红旗。</p></div>`;
    return;
  }

  const row = item.row;
  const riskItems = [
    ...item.vetoes.map((text) => ({ text, type: "bad" })),
    ...item.warnings.map((text) => ({ text, type: "warn" }))
  ];

  els.detailPanel.innerHTML = `
    <div class="detail-title">
      <div>
        <h2>${escapeHtml(row.symbol)} ${escapeHtml(row.name)}</h2>
        <p>${escapeHtml(row.industry || row.sector || "未填行业")} · ${escapeHtml(row.theme || "未填主题")}</p>
      </div>
      <div class="score-ring" style="--score-deg:${item.totalScore * 3.6}deg">${item.totalScore}</div>
    </div>

    <div class="detail-section">
      ${pill(item.output, outputColor(item.output, item.vetoes))}
      ${pill(`来源${item.sourceReliability.label}`, sourceColor(item.sourceReliability.level))}
      ${item.sourceAge ? pill(`${item.sourceAge}天`, item.sourceAge > 120 ? "amber" : "blue") : ""}
    </div>

    <div class="detail-section">
      <h3>四组信号</h3>
      <div class="signal-grid">
        ${signal("质量", item.groups.quality.score)}
        ${signal("增长", item.groups.growth.score)}
        ${signal("预期估值", item.groups.expectation.score)}
        ${signal("市场确认", item.groups.market.score)}
      </div>
    </div>

    <div class="detail-section">
      <h3>关键字段</h3>
      <div class="kv-grid">
        ${kv("ROE", format(row.roe, "%"))}
        ${kv("OCF/净利润", format(row.ocf_to_net_income, "x"))}
        ${kv("收入增长", format(row.revenue_growth, "%"))}
        ${kv("EPS 修订", format(row.estimate_revision_eps, "%"))}
        ${kv("6M 相对强弱", format(row.relative_strength_6m, "%"))}
        ${kv("日均成交额", format(row.avg_daily_turnover_million, "百万"))}
      </div>
    </div>

    <div class="detail-section">
      <h3>风险与否决</h3>
      <ul class="reason-list">
        ${
          riskItems.length
            ? riskItems.map((risk) => `<li class="${risk.type}">${escapeHtml(risk.text)}</li>`).join("")
            : `<li class="good">未触发硬否决；仍需人工核对最新公告、业绩预告和估值假设。</li>`
        }
      </ul>
    </div>

    <div class="detail-section">
      <h3>催化与备注</h3>
      <ul class="reason-list">
        <li class="good">催化：${escapeHtml(row.catalysts || "未填")}</li>
        <li>备注：${escapeHtml(row.notes || "未填")}</li>
        <li>来源：${escapeHtml(row.data_source || "未填")}；${escapeHtml(item.sourceReliability.detail)}</li>
      </ul>
    </div>

    <div class="detail-section">
      <h3>AI 研究提示词</h3>
      <textarea id="promptBox" class="prompt-box" readonly>${escapeHtml(item.aiPrompt)}</textarea>
      <div class="copy-row">
        <button id="copyPromptBtn" class="button secondary" type="button">复制提示词</button>
      </div>
    </div>
  `;

  els.detailPanel.querySelector("#copyPromptBtn").addEventListener("click", async () => {
    const prompt = els.detailPanel.querySelector("#promptBox").value;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      els.detailPanel.querySelector("#promptBox").select();
    }
  });
}

function parseCsv(csvText) {
  const rows = [];
  const parsedRows = parseCsvRows(csvText).filter((row) => row.some((cell) => cell.trim()));
  if (!parsedRows.length) return rows;

  const headers = parsedRows[0].map((header) => header.trim());
  for (const values of parsedRows.slice(1)) {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function exportScoredCsv() {
  if (!state.scored.length) return;
  const headers = [
    "output",
    "score",
    "vetoes",
    "warnings",
    "source_reliability",
    ...schemaFields
  ];
  const lines = [
    headers.join(","),
    ...state.scored.map((item) =>
      [
        item.output,
        item.totalScore,
        item.vetoes.join("; "),
        item.warnings.join("; "),
        item.sourceReliability.label,
        ...schemaFields.map((field) => item.row[field] ?? "")
      ]
        .map(csvEscape)
        .join(",")
    )
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scored-stocks-v1.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function pill(text, color) {
  return `<span class="pill ${color}">${escapeHtml(text)}</span>`;
}

function bar(score) {
  const width = Math.max(0, Math.min(100, (score / 2) * 100));
  return `<div class="mini-bars"><div class="bar"><span style="width:${width}%"></span></div></div>`;
}

function signal(label, score) {
  return `<div class="signal"><span>${label}</span><strong>${score.toFixed(2)}</strong>${bar(score)}</div>`;
}

function kv(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function outputColor(output, vetoes) {
  if (vetoes.length || output === "观察/回避") return "red";
  if (output === "候选买入") return "green";
  return "amber";
}

function sourceColor(level) {
  if (level === "high") return "green";
  if (level === "low") return "red";
  if (level === "unknown") return "amber";
  return "blue";
}

function format(value, suffix) {
  if (!Number.isFinite(value)) return "缺失";
  if (suffix === "x") return `${value.toFixed(2)}x`;
  if (suffix === "百万") return `${value.toFixed(0)}百万`;
  return `${value.toFixed(1)}${suffix}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
