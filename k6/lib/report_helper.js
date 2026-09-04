/**
 * LemonDBD K6 Performance Testing Suite - Production-Grade HTML Report Helper
 * Generates an interactive, modern, user-friendly performance dashboard.
 * 100% self-contained and offline-compatible (zero CDN or remote dependencies).
 */

export function generateHtmlSummary(data, options = {}) {
  const title = options.title || 'LemonDBD K6 Performance Benchmark Report';
  const metrics = (data && data.metrics) || {};
  const state = (data && data.state) || {};
  const rootGroup = (data && data.root_group) || {};

  function getMetricValue(name, stat) {
    if (metrics[name] && metrics[name].values) {
      const val = metrics[name].values[stat];
      return val !== undefined && val !== null ? val : null;
    }
    return null;
  }

  function formatNum(val, decimals = 2) {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(decimals);
    }
    return val;
  }

  function formatMs(val) {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      return val >= 1000 ? `${(val / 1000).toFixed(2)} s` : `${val.toFixed(2)} ms`;
    }
    return val;
  }

  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Duration
  const testDurationMs = state.testRunDurationMs || 0;
  const durationStr = testDurationMs > 0
    ? (testDurationMs >= 60000
        ? `${Math.floor(testDurationMs / 60000)}m ${((testDurationMs % 60000) / 1000).toFixed(1)}s`
        : `${(testDurationMs / 1000).toFixed(1)}s`)
    : 'N/A';

  // Core KPIs
  const totalReqs = getMetricValue('http_reqs', 'count') || 0;
  const reqRate = getMetricValue('http_reqs', 'rate') || 0;
  const vusMax = getMetricValue('vus_max', 'value') || getMetricValue('vus', 'max') || getMetricValue('vus', 'value') || 1;
  const reqDurationAvg = getMetricValue('http_req_duration', 'avg');
  const reqDurationMed = getMetricValue('http_req_duration', 'med');
  const reqDurationMin = getMetricValue('http_req_duration', 'min');
  const reqDurationP90 = getMetricValue('http_req_duration', 'p(90)');
  const reqDurationP95 = getMetricValue('http_req_duration', 'p(95)');
  const reqDurationP99 = getMetricValue('http_req_duration', 'p(99)');
  const reqDurationMax = getMetricValue('http_req_duration', 'max');

  const reqFailedRate = getMetricValue('http_req_failed', 'rate') || 0;
  const reqFailedCount = getMetricValue('http_req_failed', 'fails') || 0;
  const reqPassCount = getMetricValue('http_req_failed', 'passes') || totalReqs;
  const dataReceived = getMetricValue('data_received', 'count') || 0;
  const dataSent = getMetricValue('data_sent', 'count') || 0;

  // Threshold compliance
  const thresholdRows = [];
  let allThresholdsPassed = true;

  for (const [metricName, metricData] of Object.entries(metrics)) {
    if (metricData.thresholds) {
      for (const [rule, result] of Object.entries(metricData.thresholds)) {
        const passed = result && result.ok !== false;
        if (!passed) allThresholdsPassed = false;
        thresholdRows.push({
          metric: metricName,
          rule,
          passed,
        });
      }
    }
  }

  // Checks evaluation
  let checksTotal = 0;
  let checksPassed = 0;
  function countChecks(group) {
    if (group.checks) {
      for (const c of group.checks) {
        checksTotal += (c.passes || 0) + (c.fails || 0);
        checksPassed += (c.passes || 0);
      }
    }
    if (group.groups) {
      for (const g of group.groups) {
        countChecks(g);
      }
    }
  }
  countChecks(rootGroup);
  const checksRate = checksTotal > 0 ? (checksPassed / checksTotal) * 100 : 100;

  // Architectural Tiers
  const tiers = [
    { label: 'Overall HTTP Requests', metricKey: 'http_req_duration', type: 'baseline' },
    { label: 'Frontend SSR Pages', metricKey: 'http_req_duration{type:ssr}', type: 'ssr' },
    { label: 'Static Assets (Nginx)', metricKey: 'http_req_duration{type:static}', type: 'static' },
    { label: 'Database Write Transactions', metricKey: 'http_req_duration{type:write}', type: 'write' },
    { label: 'Heavy Queries & Filters', metricKey: 'http_req_duration{type:query}', type: 'query' },
    { label: 'User Authentication / Hashing', metricKey: 'auth_duration', type: 'auth' },
  ];

  const populatedTiers = tiers
    .map(t => {
      const m = metrics[t.metricKey];
      if (!m || !m.values) return null;
      return {
        label: t.label,
        key: t.metricKey,
        type: t.type,
        avg: m.values['avg'] || 0,
        med: m.values['med'] || 0,
        p95: m.values['p(95)'] || 0,
        p99: m.values['p(99)'] || 0,
        max: m.values['max'] || 0,
      };
    })
    .filter(Boolean);

  // Determine overall status
  const overallPassed = allThresholdsPassed && reqFailedRate < 0.05 && checksRate >= 99;

  // Generate SVG chart bars
  const maxTierP95 = Math.max(...populatedTiers.map(t => t.p95 || 0), 10);
  const svgChartBars = populatedTiers
    .map((t, idx) => {
      const y = 35 + idx * 55;
      const widthP50 = Math.max(2, Math.min(480, (t.med / maxTierP95) * 480));
      const widthP95 = Math.max(2, Math.min(480, (t.p95 / maxTierP95) * 480));
      return `
        <g class="bar-group">
          <text x="10" y="${y - 8}" class="bar-label">${t.label}</text>
          <text x="590" y="${y - 8}" class="bar-val" text-anchor="end">p95: ${t.p95.toFixed(1)}ms | med: ${t.med.toFixed(1)}ms</text>
          <!-- Background track -->
          <rect x="10" y="${y}" width="580" height="20" rx="4" fill="#1e293b" />
          <!-- p95 bar -->
          <rect x="10" y="${y}" width="${widthP95}" height="20" rx="4" fill="#f59e0b" opacity="0.8" />
          <!-- p50 bar -->
          <rect x="10" y="${y}" width="${widthP50}" height="20" rx="4" fill="#38bdf8" />
        </g>
      `;
    })
    .join('');

  const svgHeight = Math.max(120, 45 + populatedTiers.length * 55);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-sub: #162032;
      --border: #1f293d;
      --border-sub: #27354f;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent-lemon: #f59e0b;
      --accent-cyan: #38bdf8;
      --pass: #10b981;
      --fail: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #111827 0%, #172033 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .header-left h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--accent-lemon);
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .header-left p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.35rem;
    }
    .status-badge {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.6rem 1.4rem;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-transform: uppercase;
    }
    .status-pass {
      background: rgba(16, 185, 129, 0.15);
      color: var(--pass);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-fail {
      background: rgba(239, 68, 68, 0.15);
      color: var(--fail);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .kpi-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }
    .kpi-value {
      font-size: 1.9rem;
      font-weight: 700;
      color: var(--accent-cyan);
      margin: 0.4rem 0 0.1rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .kpi-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .text-pass { color: var(--pass) !important; }
    .text-fail { color: var(--fail) !important; }

    /* Section Card */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .data-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: var(--card-sub);
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .data-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover { background: rgba(255,255,255,0.02); }

    /* Percentile Spectrum Grid */
    .pct-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .pct-item {
      background: var(--card-sub);
      border: 1px solid var(--border-sub);
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
    }
    .pct-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    .pct-value {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      margin-top: 0.25rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Status Pill */
    .pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pill-pass { background: rgba(16, 185, 129, 0.2); color: var(--pass); }
    .pill-fail { background: rgba(239, 68, 68, 0.2); color: var(--fail); }

    /* SVG Chart */
    .chart-container {
      width: 100%;
      overflow-x: auto;
      margin-top: 0.5rem;
    }
    .bar-label { fill: #f1f5f9; font-size: 12px; font-weight: 600; font-family: sans-serif; }
    .bar-val { fill: #94a3b8; font-size: 11px; font-family: monospace; }
    
    .legend {
      display: flex;
      gap: 1.5rem;
      font-size: 0.8rem;
      margin-top: 0.75rem;
      color: var(--text-muted);
    }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; }
    .legend-box { width: 12px; height: 12px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1>&#127819; ${title}</h1>
        <p>Executed at: ${new Date().toISOString()} &bull; Duration: ${durationStr} &bull; Target: http://localhost</p>
      </div>
      <div>
        <span class="status-badge ${overallPassed ? 'status-pass' : 'status-fail'}">
          ${overallPassed ? '&#10003; PASSED' : '&#10007; FAILED'}
        </span>
      </div>
    </header>

    <!-- Top KPI Grid -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Requests</div>
        <div class="kpi-value">${formatNum(totalReqs, 0)}</div>
        <div class="kpi-sub">${formatNum(reqRate, 1)} req/s avg</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Max Concurrency</div>
        <div class="kpi-value">${vusMax}</div>
        <div class="kpi-sub">Virtual Users (VUs)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">p95 Latency (SLA)</div>
        <div class="kpi-value ${reqDurationP95 > 400 ? 'text-fail' : ''}">${formatMs(reqDurationP95)}</div>
        <div class="kpi-sub">Median: ${formatMs(reqDurationMed)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Failure Rate</div>
        <div class="kpi-value ${reqFailedRate > 0.01 ? 'text-fail' : 'text-pass'}">${(reqFailedRate * 100).toFixed(2)}%</div>
        <div class="kpi-sub">${formatNum(reqFailedCount, 0)} failed reqs</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Network I/O</div>
        <div class="kpi-value" style="font-size: 1.4rem;">${formatBytes(dataReceived)}</div>
        <div class="kpi-sub">Sent: ${formatBytes(dataSent)}</div>
      </div>
    </section>

    <!-- Latency Percentile Spectrum -->
    <section class="card">
      <div class="card-title">&#9201; Response Time Percentile Spectrum</div>
      <div class="pct-grid">
        <div class="pct-item"><div class="pct-label">Min</div><div class="pct-value">${formatMs(reqDurationMin)}</div></div>
        <div class="pct-item"><div class="pct-label">Median (p50)</div><div class="pct-value">${formatMs(reqDurationMed)}</div></div>
        <div class="pct-item"><div class="pct-label">Average</div><div class="pct-value">${formatMs(reqDurationAvg)}</div></div>
        <div class="pct-item"><div class="pct-label">p90</div><div class="pct-value">${formatMs(reqDurationP90)}</div></div>
        <div class="pct-item"><div class="pct-label">p95 (SLA)</div><div class="pct-value" style="color: var(--accent-lemon);">${formatMs(reqDurationP95)}</div></div>
        <div class="pct-item"><div class="pct-label">p99</div><div class="pct-value">${formatMs(reqDurationP99)}</div></div>
        <div class="pct-item"><div class="pct-label">Max</div><div class="pct-value">${formatMs(reqDurationMax)}</div></div>
      </div>
    </section>

    <!-- Architectural Tier Breakdown -->
    ${populatedTiers.length > 0 ? `
    <section class="card">
      <div class="card-title">&#127959; Architectural Workload Breakdown</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Workload Tier</th>
            <th>Tag / Identifier</th>
            <th>Average</th>
            <th>Median (p50)</th>
            <th>p95 Latency</th>
            <th>p99 Latency</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          ${populatedTiers.map(t => `
            <tr>
              <td style="font-family: inherit; font-weight: 600;">${t.label}</td>
              <td style="color: var(--text-muted);">${t.key}</td>
              <td>${formatMs(t.avg)}</td>
              <td>${formatMs(t.med)}</td>
              <td style="color: var(--accent-lemon); font-weight: 700;">${formatMs(t.p95)}</td>
              <td>${formatMs(t.p99)}</td>
              <td>${formatMs(t.max)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Visual Comparison Chart -->
      <div class="chart-container" style="margin-top: 1.5rem;">
        <svg width="100%" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}" preserveAspectRatio="xMidYMid meet">
          ${svgChartBars}
        </svg>
        <div class="legend">
          <div class="legend-item"><div class="legend-box" style="background: #38bdf8;"></div> Median (p50)</div>
          <div class="legend-item"><div class="legend-box" style="background: #f59e0b;"></div> p95 Latency</div>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- SLA Threshold Compliance Checklist -->
    ${thresholdRows.length > 0 ? `
    <section class="card">
      <div class="card-title">&#128220; SLA Threshold Compliance Checklist</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Metric / Tag Scope</th>
            <th>Target SLA Rule</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${thresholdRows.map(r => `
            <tr>
              <td style="font-family: inherit; font-weight: 600;">${r.metric}</td>
              <td style="color: var(--accent-cyan);">${r.rule}</td>
              <td>
                <span class="pill ${r.passed ? 'pill-pass' : 'pill-fail'}">
                  ${r.passed ? '&#10003; PASS' : '&#10007; FAIL'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    ` : ''}

  </div>
</body>
</html>`;
}

export const generateHtmlReport = generateHtmlSummary;
export default {
  generateHtmlSummary,
  generateHtmlReport,
};
