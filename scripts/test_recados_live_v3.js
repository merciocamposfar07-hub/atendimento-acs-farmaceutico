'use strict';

const assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const REV = '20260816-recados-live-v3';
const LIVE = 'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area=JAPARANDUBA&v=' + REV + '&_=' + Date.now();

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdom: ' + (e && e.message || e)));
  vc.on('error', e => errors.push('console: ' + e));

  const dom = await JSDOM.fromURL(LIVE, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.fetch = (input, options) => {
        const target = new URL(String(input), window.location.href).href;
        return global.fetch(target, options);
      };
      window.alert = () => {};
      window.matchMedia = window.matchMedia || (() => ({
        matches: false,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
      }));
      if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:mock';
      if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
    }
  });

  const { window } = dom;
  for (let i = 0; i < 30; i += 1) {
    await sleep(250);
    const status = window.document.getElementById('loginStatus');
    const entrar = window.document.getElementById('entrar');
    if (status && entrar && !entrar.disabled && !/Verificando|Executando/.test(status.textContent || '')) break;
  }

  const doc = window.document;
  const status = doc.getElementById('loginStatus');
  const entrar = doc.getElementById('entrar');
  const tacsTab = doc.getElementById('loginTacsTab');
  const adminTab = doc.getElementById('loginAdminTab');
  const tacsLogin = doc.getElementById('tacsLogin');
  const adminLogin = doc.getElementById('adminLogin');

  assert(status, 'Status de login não existe no painel ao vivo.');
  assert(entrar, 'Botão Entrar não existe no painel ao vivo.');
  assert(!entrar.disabled, 'Botão Entrar permaneceu bloqueado no painel ao vivo. Status: ' + status.textContent);
  assert(!/Verificando o painel administrativo oficial|Executando testes internos/.test(status.textContent || ''), 'Painel ao vivo ficou travado na verificação: ' + status.textContent);
  assert(tacsTab && adminTab && tacsLogin && adminLogin, 'Abas de acesso não foram montadas.');

  tacsTab.click();
  await sleep(50);
  assert(!tacsLogin.classList.contains('oculto'), 'A aba TACS não respondeu ao clique.');
  assert(adminLogin.classList.contains('oculto'), 'A aba TACS não ocultou o login administrativo.');

  adminTab.click();
  await sleep(50);
  assert(!adminLogin.classList.contains('oculto'), 'A aba Administrador não respondeu ao clique.');

  const contrast = doc.getElementById('alternarContraste');
  assert(contrast, 'Controle técnico de contraste foi removido do DOM e pode quebrar o script legado.');
  assert(window.getComputedStyle(contrast).display === 'none' || window.getComputedStyle(contrast.parentElement).display === 'none', 'Botão de contraste ainda está visível.');

  for (let i = 0; i < 20; i += 1) {
    if (doc.querySelectorAll('#campMonthTabs .camp-month-tab').length === 12) break;
    await sleep(150);
  }
  const monthTabs = Array.from(doc.querySelectorAll('#campMonthTabs .camp-month-tab'));
  assert.strictEqual(monthTabs.length, 12, 'Campanhas no mês não exibiu os 12 meses.');
  assert.strictEqual(monthTabs[0].textContent.trim(), 'Janeiro');
  assert.strictEqual(monthTabs[11].textContent.trim(), 'Dezembro');

  const fatal = errors.filter(e => !/Not implemented: navigation to another Document/.test(e));
  if (fatal.length) console.log('Avisos capturados:', fatal.slice(0, 10));

  console.log('LIVE_RECADOS_V3_OK');
  console.log('STATUS=' + status.textContent.trim());
  console.log('MESES=' + monthTabs.map(x => x.textContent.trim()).join(','));
  dom.window.close();
})().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
