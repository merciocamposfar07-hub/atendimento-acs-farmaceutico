const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'audit-artifacts');
fs.mkdirSync(OUT, { recursive: true });

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const findings = [];
function add(severity, area, file, detail, evidence) {
  findings.push({ severity, area, file, detail, evidence: evidence || '' });
}

const criticalFiles = [
  'index.html',
  'PADRAO_TECNICO_PORTAL_TACS.md',
  'admin-ui-standard.inline.css',
  'portal-public-data.js',
  'moradores-autofill.js',
  'central-tacs-login-rapido-v1.js',
  'portal-notification-health.js',
  'portal-notification-repair-v9.js',
  'service-worker.js',
  'painel-oficial-agendas-vagas.html',
  'painel-oficial-profissionais-servicos.html',
  'painel-oficial-recados-campanhas.html',
  'central-administrativa-tacs.html'
];
for (const file of criticalFiles) {
  if (!exists(file)) add('CRITICA', 'integridade', file, 'Arquivo crítico ausente.');
}

if (exists('PADRAO_TECNICO_PORTAL_TACS.md')) {
  const s = read('PADRAO_TECNICO_PORTAL_TACS.md');
  if (!s.includes('fonte de verdade')) add('ALTA', 'layout', 'PADRAO_TECNICO_PORTAL_TACS.md', 'Documento não declara fonte de verdade.');
  if (!s.includes('admin-ui-standard.inline.css')) add('ALTA', 'layout', 'PADRAO_TECNICO_PORTAL_TACS.md', 'Fonte visual administrativa não está vinculada no padrão técnico.');
  if (!s.includes('funcionalidade + território + segurança + gravação + reedição + auditoria + acessibilidade + layout + desempenho')) add('ALTA', 'governança', 'PADRAO_TECNICO_PORTAL_TACS.md', 'Contrato final de manutenção não foi encontrado.');
}

if (exists('admin-ui-standard.inline.css')) {
  const css = read('admin-ui-standard.inline.css');
  const required = [
    '--tacs-petroleo:#073a55', '--tacs-borda:#69c7e7', 'overflow-x:hidden',
    'touch-action:manipulation', ':focus-visible', '@media(max-width:430px)',
    '@media(prefers-reduced-motion:reduce)'
  ];
  required.forEach((token) => {
    if (!css.toLowerCase().includes(token.toLowerCase())) add('ALTA', 'layout', 'admin-ui-standard.inline.css', `Token visual obrigatório ausente: ${token}`);
  });
}

// Duplicidade de scripts por caminho, ignorando query-string/cache-buster.
for (const file of criticalFiles.filter((f) => f.endsWith('.html') && exists(f))) {
  const html = read(file);
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Map();
  for (const src of srcs) {
    const canonical = src.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
    if (seen.has(canonical)) add('ALTA', 'carregamento', file, `Script carregado mais de uma vez: ${canonical}`, `${seen.get(canonical)} | ${src}`);
    else seen.set(canonical, src);
  }
}

// URLs diferentes de deployments Apps Script em arquivos centrais: risco de fallback para versão antiga.
const apiFiles = criticalFiles.filter((f) => exists(f)).concat(['agenda-config.js'].filter(exists));
const deploymentMap = new Map();
for (const file of apiFiles) {
  const text = read(file);
  const ids = [...text.matchAll(/https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/exec/g)].map((m) => m[1]);
  for (const id of new Set(ids)) {
    if (!deploymentMap.has(id)) deploymentMap.set(id, []);
    deploymentMap.get(id).push(file);
  }
}
if (deploymentMap.size > 1) {
  add('ALTA', 'transporte', 'múltiplos arquivos', `Foram encontrados ${deploymentMap.size} deployment IDs do Apps Script nos arquivos centrais.`, JSON.stringify(Object.fromEntries(deploymentMap), null, 2));
}

// Esperas longas, reloads e navegação forçada.
const timingFiles = ['moradores-autofill.js','central-tacs-login-rapido-v1.js','portal-public-data.js','portal-notification-repair-v9.js','service-worker.js'];
for (const file of timingFiles) {
  if (!exists(file)) continue;
  const text = read(file);
  const waits = [...text.matchAll(/setTimeout\s*\([^,]+,\s*(\d{4,6})\s*\)/g)].map((m) => Number(m[1])).filter((n) => n >= 5000);
  if (waits.length) add('MEDIA', 'latência', file, `Timeouts explícitos >=5s: ${waits.join(', ')} ms.`);
  if (/location\.reload\s*\(/.test(text)) add('ALTA', 'navegação', file, 'Há location.reload() explícito; candidato a hidratação sem recarga, mantendo fallback até homologação.');
  if (/clients\.matchAll[\s\S]{0,500}navigate\s*\(/.test(text)) add('ALTA', 'service-worker', file, 'Service Worker contém navegação forçada de clientes durante ciclo de ativação.');
}

if (exists('moradores-autofill.js')) {
  const s = read('moradores-autofill.js');
  if (/setTimeout\([\s\S]{0,180}startJsonp[\s\S]{0,120},\s*6000\)/.test(s) || s.includes('}, 6000);')) {
    add('ALTA', 'moradores', 'moradores-autofill.js', 'Busca pode aguardar bridge por ~6s antes de iniciar fallback JSONP; em rede degradada isso amplifica a espera percebida.');
  }
  if (s.includes('attempt < 2') && s.includes('}, 6500);')) {
    add('ALTA', 'moradores', 'moradores-autofill.js', 'Fallback JSONP pode repetir tentativas de 6,5s; revisar para transporte adaptativo sem duplicar escrita.');
  }
}

if (exists('portal-public-data.js')) {
  const s = read('portal-public-data.js');
  if (s.includes('CACHE_MAX_MS=15*60*1000')) add('MEDIA', 'estado', 'portal-public-data.js', 'Snapshot público pode permanecer visualmente válido por até 15 min; revalidação é em segundo plano.');
  if (s.includes('TIMEOUT_MS=25000')) add('MEDIA', 'latência', 'portal-public-data.js', 'Timeout de leitura pública configurado em 25s.');
}

if (exists('service-worker.js')) {
  const s = read('service-worker.js');
  if (/caches\.keys/.test(s) && /registration\.unregister/.test(s)) add('ALTA', 'service-worker', 'service-worker.js', 'Worker principal limpa caches e se desregistra; manter apenas se necessário e validar impacto em reabertura/refresh.');
}

const severityRank = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 };
findings.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) || a.file.localeCompare(b.file));

const summary = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY_AUDIT',
  productionChanged: false,
  counts: findings.reduce((acc, f) => ((acc[f.severity] = (acc[f.severity] || 0) + 1), acc), {}),
  findings
};
fs.writeFileSync(path.join(OUT, 'static-audit.json'), JSON.stringify(summary, null, 2));
let md = '# Auditoria arquitetural estática V1\n\n';
md += `Gerada em: ${summary.generatedAt}\n\nModo: **somente leitura / sem implantação**.\n\n`;
md += '| Severidade | Área | Arquivo | Achado |\n|---|---|---|---|\n';
for (const f of findings) md += `| ${f.severity} | ${f.area} | \`${f.file}\` | ${f.detail.replace(/\|/g,'\\|')} |\n`;
md += '\n## Observações\n\n- Achados não autorizam alteração automática.\n- Funções atuais devem ser preservadas até regressão, A/B ou shadow mode comprovar equivalência.\n- A existência de múltiplos deployments não prova falha por si só; sinaliza risco de fallback para backend antigo quando a configuração principal não é carregada.\n';
fs.writeFileSync(path.join(OUT, 'static-audit.md'), md);
console.log(JSON.stringify(summary.counts));
console.log('STATIC_AUDIT_V1_OK');
