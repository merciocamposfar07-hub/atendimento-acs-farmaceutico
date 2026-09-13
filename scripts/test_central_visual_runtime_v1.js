'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('central-administrativa-tacs.html', 'utf8');
const guard = html.match(/<script id="cscVisualContractGuardJs20260913">([\s\S]*?)<\/script>/)[1];
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function check() {
  const dom = new JSDOM('<!doctype html><html><head><style>'+styles+'</style></head><body class="csc-central"><main><button id="centralAction">Moradores</button></main><footer id="cscPlatformFooter"></footer><div id="viewer" class="viewer csc-native-viewer"><div class="viewer-bar"></div><div id="nativeModuleHost" class="csc-native-module-host">Agenda confirmada</div><div id="nativeMoradoresHost" class="csc-native-module-host" hidden>Moradores confirmados</div><iframe id="viewerFrame" hidden></iframe><footer id="viewerFooter" class="viewer-platform-footer"></footer></div></body></html>', {
    url: 'https://example.test/atendimento-acs-farmaceutico/central-administrativa-tacs.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window, d = w.document;
  const failures = [];
  function verify(fn) { try { fn(); } catch (e) { failures.push(e.message); } }
  try {
    w.eval(guard);
    await wait(1700);
    let mutations = 0;
    const observer = new w.MutationObserver(records => { mutations += records.length; });
    observer.observe(d.documentElement, { subtree: true, childList: true, attributes: true });
    await wait(250);
    verify(() => assert.equal(mutations, 0, 'Interface ociosa não pode reescrever rodapé/estilos continuamente'));
    verify(() => assert.equal(w.getComputedStyle(d.getElementById('nativeMoradoresHost')).display, 'none', 'Host oculto não pode reaparecer sob o painel ativo'));
    const agenda = d.getElementById('nativeModuleHost');
    const viewer = d.getElementById('viewer');
    viewer.hidden = true;
    viewer.classList.remove('csc-native-viewer');
    // Mesmo contrato executado pelo closeViewer real: ocultar, sem remover DOM.
    verify(() => assert.equal(w.getComputedStyle(viewer).display, 'none', 'Voltar deve liberar a Central imediatamente, sem esperar observador'));
    await wait(100);
    verify(() => assert.equal(w.getComputedStyle(viewer).display, 'none', 'Observador não pode reabrir painel fechado'));
    viewer.classList.add('csc-native-viewer');viewer.hidden = false;
    await wait(100);
    verify(() => assert.equal(d.getElementById('nativeModuleHost'), agenda, 'Reabertura preserva o nó e os dados confirmados'));
    verify(() => assert.equal(agenda.textContent, 'Agenda confirmada'));
    viewer.classList.replace('csc-native-viewer', 'csc-frame-viewer');
    agenda.hidden = true;
    d.getElementById('viewerFrame').hidden = false;
    await wait(100);
    verify(() => assert.equal(w.getComputedStyle(agenda).display, 'none', 'Troca para módulo legado não exibe host anterior'));
    observer.disconnect();
  } finally { w.close(); }
  assert.deepEqual(failures, [], failures.join('\n'));
  console.log('CENTRAL_VISUAL_RUNTIME_OK: repouso sem mutações; voltar imediato; um host visível; DOM e dados preservados.');
}
check().catch(e => { console.error(e.message); process.exitCode = 1; });
