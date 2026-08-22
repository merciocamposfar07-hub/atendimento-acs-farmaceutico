const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'audit-artifacts');
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.AUDIT_BASE_URL || 'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/';
const pages = [
  { name: 'portal-morador', path: '' },
  { name: 'central-admin', path: 'central-administrativa-tacs.html' },
  { name: 'agendas-vagas', path: 'painel-oficial-agendas-vagas.html' },
  { name: 'profissionais-servicos', path: 'painel-oficial-profissionais-servicos.html' },
  { name: 'recados-campanhas', path: 'painel-oficial-recados-campanhas.html' }
];
const viewports = [
  { name: 'iphone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'android', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false }
];
const modes = [
  { name: 'live-readonly', backendDelay: 0, blockBackend: false, blockOneSignal: false },
  { name: 'slow-readonly', backendDelay: 1800, blockBackend: false, blockOneSignal: false },
  { name: 'backend-offline', backendDelay: 0, blockBackend: true, blockOneSignal: true }
];
const engines = { chromium, firefox, webkit };
const results = [];

function pct(values, p) {
  if (!values.length) return 0;
  const a = values.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))];
}
function safeName(s) { return s.replace(/[^a-z0-9_-]+/gi, '-'); }

async function inspectPage(browserName, browser, pageDef, vp, mode) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    locale: 'pt-BR',
    timezoneId: 'America/Recife',
    serviceWorkers: 'allow'
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const blockedWrites = [];
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!/ERR_FAILED|Failed to fetch|NetworkError|Load failed/i.test(t)) consoleErrors.push(t.slice(0, 500));
    }
  });

  await context.route('**/*', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();
    let host = '';
    try { host = new URL(url).hostname; } catch (_) {}
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      blockedWrites.push(`${method} ${url}`);
      return route.abort('blockedbyclient');
    }
    const isBackend = host === 'script.google.com' || host.endsWith('.googleusercontent.com');
    const isOneSignal = /onesignal/i.test(host) || /OneSignalSDK/i.test(url);
    if ((mode.blockBackend && isBackend) || (mode.blockOneSignal && isOneSignal)) return route.abort('internetdisconnected');
    if (mode.backendDelay && isBackend) await new Promise((r) => setTimeout(r, mode.backendDelay));
    return route.continue();
  });

  const url = new URL(pageDef.path, BASE).href;
  const started = Date.now();
  let navError = '';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  } catch (e) {
    navError = String(e && e.message || e).slice(0, 800);
  }
  const settleMs = mode.name === 'slow-readonly' ? 3200 : 1800;
  await page.waitForTimeout(settleMs).catch(() => {});
  const wallMs = Date.now() - started;

  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((x) => x.name === 'first-contentful-paint');
    const frames = [];
    await new Promise((resolve) => {
      let prev = 0, count = 0;
      function tick(ts) {
        if (prev) frames.push(ts - prev);
        prev = ts;
        count += 1;
        if (count >= 31) resolve(); else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const offenders = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (!visible(el)) return;
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 3 || r.left < -3) {
        offenders.push({
          tag: el.tagName,
          id: el.id || '',
          className: String(el.className || '').slice(0, 100),
          left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width)
        });
      }
    });
    const buttons = [...document.querySelectorAll('button,.btn,.botao,[role="button"]')].filter(visible);
    const tooSmallButtons = buttons.map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.id || '', text: String(el.textContent || '').trim().slice(0, 80), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter((b) => b.h < 44 || b.w < 44).slice(0, 20);
    const bodyText = String(document.body && document.body.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      href: location.href,
      title: document.title,
      bodyTextLength: bodyText.length,
      bodySample: bodyText.slice(0, 180),
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 3,
      overflowOffenders: offenders.slice(0, 20),
      tooSmallButtons,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadMs: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null,
      responseEndMs: nav ? Math.round(nav.responseEnd) : null,
      fcpMs: fcp ? Math.round(fcp.startTime) : null,
      frameIntervals: frames
    };
  }).catch((e) => ({ evalError: String(e && e.message || e) }));

  const frameP95 = metrics.frameIntervals ? Math.round(pct(metrics.frameIntervals, .95) * 10) / 10 : null;
  const critical = [];
  if (navError) critical.push('NAVIGATION_ERROR');
  if (pageErrors.length) critical.push('PAGE_ERROR');
  if (metrics.evalError) critical.push('EVALUATION_ERROR');
  if (metrics.bodyTextLength != null && metrics.bodyTextLength < 60) critical.push('BODY_NEAR_EMPTY');
  if (metrics.horizontalOverflow) critical.push('HORIZONTAL_OVERFLOW');
  if (frameP95 != null && frameP95 > 150) critical.push('MAIN_THREAD_RESPONSE_GT_150MS');

  const result = {
    browser: browserName,
    page: pageDef.name,
    viewport: vp.name,
    mode: mode.name,
    url,
    wallMs,
    frameP95,
    navError,
    pageErrors,
    consoleErrors,
    blockedWrites: blockedWrites.length,
    metrics,
    critical
  };

  const shouldScreenshot = mode.name === 'live-readonly' && vp.name !== 'desktop' || critical.length;
  if (shouldScreenshot) {
    const file = safeName(`${browserName}-${pageDef.name}-${vp.name}-${mode.name}.png`);
    await page.screenshot({ path: path.join(OUT, file), fullPage: true }).catch(() => {});
    result.screenshot = file;
  }
  await context.close();
  return result;
}

(async () => {
  for (const [browserName, launcher] of Object.entries(engines)) {
    const browser = await launcher.launch({ headless: true });
    try {
      for (const pageDef of pages) {
        for (const vp of viewports) {
          for (const mode of modes) {
            const r = await inspectPage(browserName, browser, pageDef, vp, mode);
            results.push(r);
            console.log(`${browserName} ${pageDef.name} ${vp.name} ${mode.name}: ${r.wallMs}ms critical=${r.critical.join(',') || 'none'}`);
          }
        }
      }
    } finally {
      await browser.close();
    }
  }

  const criticalResults = results.filter((r) => r.critical.length);
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    mode: 'READ_ONLY_BROWSER_AUDIT',
    productionWritesBlocked: true,
    scenarios: results.length,
    criticalScenarios: criticalResults.length,
    browsers: [...new Set(results.map((r) => r.browser))],
    pages: [...new Set(results.map((r) => r.page))],
    viewports: [...new Set(results.map((r) => r.viewport))],
    modes: [...new Set(results.map((r) => r.mode))],
    wallMedianMs: Math.round(pct(results.map((r) => r.wallMs), .5)),
    wallP95Ms: Math.round(pct(results.map((r) => r.wallMs), .95)),
    frameP95WorstMs: Math.max(...results.map((r) => Number(r.frameP95 || 0))),
    results
  };
  fs.writeFileSync(path.join(OUT, 'browser-matrix.json'), JSON.stringify(summary, null, 2));

  let md = '# Matriz de navegadores e latência V1\n\n';
  md += `Cenários: **${summary.scenarios}** | cenários críticos: **${summary.criticalScenarios}** | mediana total: **${summary.wallMedianMs} ms** | P95 total: **${summary.wallP95Ms} ms**.\n\n`;
  md += 'Todas as requisições de escrita (POST/PUT/PATCH/DELETE) foram bloqueadas pelo teste. Nenhum envio, reserva, reparo ou gravação de produção é permitido nesta matriz.\n\n';
  md += '| Navegador | Página | Tela | Rede | Total ms | FCP ms | DOM ms | Frame P95 ms | Overflow | Crítico |\n|---|---|---|---|---:|---:|---:|---:|---|---|\n';
  for (const r of results) {
    const m = r.metrics || {};
    md += `| ${r.browser} | ${r.page} | ${r.viewport} | ${r.mode} | ${r.wallMs} | ${m.fcpMs ?? ''} | ${m.domContentLoadedMs ?? ''} | ${r.frameP95 ?? ''} | ${m.horizontalOverflow ? 'SIM' : 'não'} | ${r.critical.join(', ') || 'não'} |\n`;
  }
  fs.writeFileSync(path.join(OUT, 'browser-matrix.md'), md);
  console.log(`BROWSER_MATRIX_V1 scenarios=${summary.scenarios} critical=${summary.criticalScenarios}`);
  if (criticalResults.length) process.exitCode = 2;
})().catch((e) => {
  console.error(e && e.stack || e);
  process.exit(3);
});
