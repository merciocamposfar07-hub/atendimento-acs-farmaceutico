'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'moradores-autofill.js'), 'utf8');

assert.match(source, /var HEDGE_DELAY_MS = 1250;/);
assert.match(source, /var BRIDGE_LIMIT_MS = 6500;/);
assert.match(source, /var activeBridgeTimeout = null;/);
assert.match(source, /var activeJsonpTimeout = null;/);
assert.match(source, /var adaptiveHedgeTimer = null;/);
assert.match(source, /startJsonp\(doc, token, 0, true\)/);
assert.match(source, /token === completedRequestId/);
assert.match(source, /returnedArea !== expectedArea/);
assert.doesNotMatch(source, /activeTimeout/);
assert.doesNotMatch(source, /method\s*=\s*['"]POST['"]/i);

function currentSameDelay(seconds) {
  if (seconds <= 6) return seconds;
  if (seconds <= 6.5) return 6 + seconds;
  return 6 + 6.5 + 0.7 + 6.5 + 0.7 + 6.5;
}

function adaptiveSameDelay(seconds) {
  if (seconds <= 6.5) return seconds;
  return 1.25 + 6.5 + 0.7 + 6.5 + 0.7 + 6.5;
}

const cliffCurrent = currentSameDelay(6.1);
const cliffAdaptive = adaptiveSameDelay(6.1);
const worstCurrent = currentSameDelay(7);
const worstAdaptive = adaptiveSameDelay(7);
assert.equal(cliffCurrent, 12.1);
assert.equal(cliffAdaptive, 6.1);
assert.ok(worstAdaptive < worstCurrent);

let seed = 0x5a17c9ef;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}
function normal() {
  const u1 = Math.max(1e-12, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function logNormalFromMedianP95(median, p95) {
  const mu = Math.log(median);
  const sigma = Math.max(0.01, (Math.log(p95) - mu) / 1.6448536269514722);
  return Math.exp(mu + sigma * normal());
}
function percentile(values, p) {
  const sorted = values.slice().sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}
function currentFlow(draw) {
  const bridge = draw();
  if (bridge <= 6) return bridge;
  let t = 6;
  for (let attempt=0; attempt<3; attempt++) {
    const jsonp = draw();
    if (jsonp <= 6.5) return t + jsonp;
    t += 6.5;
    if (attempt < 2) t += 0.7;
  }
  return t;
}
function adaptiveFlow(draw) {
  const bridge = draw();
  const jsonp0 = draw();
  const candidates = [];
  if (bridge <= 6.5) candidates.push(bridge);
  if (jsonp0 <= 6.5) candidates.push(1.25 + jsonp0);
  if (candidates.length) return Math.min(...candidates);
  let t = 1.25 + 6.5;
  for (let attempt=1; attempt<3; attempt++) {
    t += 0.7;
    const jsonp = draw();
    if (jsonp <= 6.5) return t + jsonp;
    t += 6.5;
  }
  return t;
}

const scenarios = {
  boa: {median:0.45,p95:1.10},
  normal: {median:1.10,p95:3.20},
  rural_instavel: {median:2.20,p95:8.50},
  degradada: {median:3.80,p95:14.00}
};
const samples = 100000;
const report = {samplesPorCenario:samples, hedgeMs:1250, bridgeLimitMs:6500, cliff:{current:cliffCurrent,adaptive:cliffAdaptive,reductionPct:+((1-cliffAdaptive/cliffCurrent)*100).toFixed(1)}, worstDeterministic:{current:worstCurrent,adaptive:worstAdaptive,reductionPct:+((1-worstAdaptive/worstCurrent)*100).toFixed(1)}, scenarios:{}};

for (const [name, cfg] of Object.entries(scenarios)) {
  const current = [], adaptive = [];
  for (let i=0;i<samples;i++) current.push(currentFlow(()=>logNormalFromMedianP95(cfg.median,cfg.p95)));
  for (let i=0;i<samples;i++) adaptive.push(adaptiveFlow(()=>logNormalFromMedianP95(cfg.median,cfg.p95)));
  const row = {
    current:{p50:+percentile(current,.50).toFixed(3),p95:+percentile(current,.95).toFixed(3)},
    adaptive:{p50:+percentile(adaptive,.50).toFixed(3),p95:+percentile(adaptive,.95).toFixed(3)}
  };
  row.p95ReductionPct = +((1-row.adaptive.p95/row.current.p95)*100).toFixed(1);
  report.scenarios[name] = row;
}

assert.ok(report.scenarios.normal.adaptive.p95 <= report.scenarios.normal.current.p95);
assert.ok(report.scenarios.rural_instavel.adaptive.p95 < report.scenarios.rural_instavel.current.p95);
assert.ok(report.scenarios.degradada.adaptive.p95 < report.scenarios.degradada.current.p95);
console.log('AUTOFILL_ADAPTATIVO_V1_OK ' + JSON.stringify(report));
