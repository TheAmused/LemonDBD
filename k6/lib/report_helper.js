export function generateHtmlSummary(data, options = {}) {
  const title = options.title || 'LemonDBD K6 Performance Test Report';
  const metrics = (data && data.metrics) || {};

  function getMetric(name, stat = 'p(95)') {
    if (metrics[name] && metrics[name].values) {
      const v = metrics[name].values[stat];
      return v !== undefined ? (typeof v === 'number' ? v.toFixed(2) : v) : 'N/A';
    }
    return 'N/A';
  }

  const reqDurationP95 = getMetric('http_req_duration', 'p(95)');
  const reqDurationP99 = getMetric('http_req_duration', 'p(99)');
  const reqDurationAvg = getMetric('http_req_duration', 'avg');
  const reqFailedRate = getMetric('http_req_failed', 'rate');
  const totalReqs = getMetric('http_reqs', 'count');
  const vusMax = getMetric('vus_max', 'value') !== 'N/A'
    ? getMetric('vus_max', 'value')
    : (getMetric('vus', 'max') !== 'N/A' ? getMetric('vus', 'max') : getMetric('vus', 'value'));

  const parsedFailedRate = parseFloat(reqFailedRate);
  const isFailed = !isNaN(parsedFailedRate) && parsedFailedRate > 0.01;
  const failedDisplay = !isNaN(parsedFailedRate) ? `${(parsedFailedRate * 100).toFixed(2)}%` : '0.00%';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
    .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    h1 { color: #f59e0b; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .stat { background: #0f172a; padding: 1rem; border-radius: 6px; border: 1px solid #1e293b; }
    .label { font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; }
    .value { font-size: 1.8rem; font-weight: bold; color: #38bdf8; margin-top: 0.3rem; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h1>&#127819; ${title}</h1>
    <p>Generated at: ${new Date().toISOString()}</p>
    <div class="grid">
      <div class="stat"><div class="label">Total Requests</div><div class="value">${totalReqs}</div></div>
      <div class="stat"><div class="label">Max VUs</div><div class="value">${vusMax}</div></div>
      <div class="stat"><div class="label">Avg Duration</div><div class="value">${reqDurationAvg} ms</div></div>
      <div class="stat"><div class="label">p95 Duration</div><div class="value">${reqDurationP95} ms</div></div>
      <div class="stat"><div class="label">p99 Duration</div><div class="value">${reqDurationP99} ms</div></div>
      <div class="stat"><div class="label">Failure Rate</div><div class="value ${isFailed ? 'fail' : 'pass'}">${failedDisplay}</div></div>
    </div>
  </div>
</body>
</html>`;
}

export const generateHtmlReport = generateHtmlSummary;
export default {
  generateHtmlSummary,
  generateHtmlReport,
};
