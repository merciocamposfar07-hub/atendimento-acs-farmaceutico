const fs = require('fs');

const js = fs.readFileSync('central-administrativa-tacs.js', 'utf8');
const html = fs.readFileSync('central-administrativa-tacs.html', 'utf8');

function ok(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('OK:', message);
}

ok(js.includes('CORRECAO_CIRURGICA_ISOLAMENTO_SUPERFICIES_20260917_V1'), 'marker do bloco isolado presente');
ok(js.includes("function ensureAdminUbsHost(){return ensureIsolatedSurfaceHost('nativeUbsHost')}"), 'UBS possui host exclusivo');
ok(js.includes("function ensurePendingModuleHost(){return ensureIsolatedSurfaceHost('nativePendingHost')}"), 'prévia pendente possui host exclusivo');

const ubsStart = js.indexOf('function showAdminUbs(');
const ubsEnd = js.indexOf('function normalizeEmbeddedPanelFrame(', ubsStart);
ok(ubsStart >= 0 && ubsEnd > ubsStart, 'trecho showAdminUbs localizado');
const ubs = js.slice(ubsStart, ubsEnd);
ok(ubs.includes('var host=ensureAdminUbsHost()'), 'showAdminUbs usa host exclusivo');
ok(!ubs.includes("var host=el('nativeModuleHost')"), 'UBS não reutiliza o host de Agendas');
ok(ubs.includes("var base=el('viewerFrame');if(base)base.hidden=true;"), 'UBS oculta o frame legado antes de renderizar');

const pendingStart = js.indexOf('function showPendingModuleShell(');
const pendingEnd = js.indexOf('function shellHasUnsaved(', pendingStart);
ok(pendingStart >= 0 && pendingEnd > pendingStart, 'trecho showPendingModuleShell localizado');
const pending = js.slice(pendingStart, pendingEnd);
ok(pending.includes('host=ensurePendingModuleHost()'), 'prévia pendente usa host exclusivo');
ok(!pending.includes("host=el('nativeModuleHost')"), 'prévia pendente não reutiliza o host de Agendas');

const agendaStart = js.indexOf('function showNativeAgenda(');
const agendaEnd = js.indexOf('/* TAREFA_17_MORADORES_NATIVOS_V1', agendaStart);
ok(agendaStart >= 0 && agendaEnd > agendaStart, 'trecho showNativeAgenda localizado');
const agenda = js.slice(agendaStart, agendaEnd);
ok(agenda.includes("var host=el('nativeModuleHost')"), 'Agendas mantém seu host nativo original');

ok(js.includes("if(kind!=='ubs'){var u=el('nativeUbsHost');if(u)u.hidden=true}"), 'troca de painel oculta a superfície UBS');
ok(js.includes("if(kind!=='pending'){var pending=el('nativePendingHost');if(pending)pending.hidden=true}"), 'troca de painel oculta a superfície pendente');
ok(js.includes("var ubsHost=el('nativeUbsHost');if(ubsHost&&ubsHost.parentNode)ubsHost.remove()"), 'reset remove host UBS isolado');
ok(js.includes("var pendingHost=el('nativePendingHost');if(pendingHost&&pendingHost.parentNode)pendingHost.remove()"), 'reset remove host pendente isolado');
ok(html.includes('/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260917-isolamento-superficies-v1'), 'Safari recebe revisão nova do JavaScript da Central');

console.log('SUPERFICIES_PAINEIS_20260917_OK');
