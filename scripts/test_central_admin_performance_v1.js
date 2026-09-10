const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const base=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const support=read('central-suporte-moradores-v1.js');

/*
 * Contrato vigente no iPhone: navegação administrativa direta.
 * O host persistente de iframes foi aposentado porque podia manter a Agenda
 * carregando em um viewer invisível e aparentar travamento no Safari.
 */
assert(!/central-admin-performance-v1\.js\?v=/.test(central),
  'Central não deve reinstalar o antigo host persistente de iframes.');
assert(/central-suporte-moradores-v1\.js\?v=[^"']+/.test(central),
  'Central deve carregar a proteção de navegação direta com revisão explícita.');
assert(support.includes('CENTRAL_IOS_PAINT_GUARD_V3'),
  'Proteção de pintura/navegação do iPhone ausente.');
assert(support.includes('function installSafeNavigation()'),
  'Navegação direta segura dos cartões ausente.');
assert(support.includes("document.addEventListener('click',function(event)"),
  'Navegação segura precisa interceptar o toque antes do listener legado.');
assert(support.includes('event.stopImmediatePropagation()'),
  'Listener legado não pode abrir um segundo destino em paralelo.');
assert(support.includes('location.assign(url)'),
  'Painéis administrativos devem abrir por navegação direta.');
assert(support.includes("document.addEventListener('click',function(event)")&&support.includes('},true);'),
  'Interceptação de navegação precisa operar em fase de captura.');

['moradores','suporte','recados','agendas','profissionais','territorio','municipios','portal'].forEach((modulo)=>{
  assert(support.includes("name==='"+modulo+"'"),
    'Navegação direta não cobre módulo obrigatório: '+modulo);
});
assert(support.includes("if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html"),
  'Agendas e vagas não aponta para a página oficial por navegação direta.');
assert(support.includes("from='&from=central'"),
  'Painéis diretos precisam preservar o retorno à Central.');

assert(support.includes('#viewer,#portalTacsCentralRefreshV1,#portalTacsAdminPreloadPoolV1{display:none!important}'),
  'Viewer/host legado deve permanecer desativado no iPhone.');
assert(support.includes("if(frame){try{frame.src='about:blank'}catch(e){}}"),
  'Iframe legado deve ser descarregado no bootstrap.');
assert(support.includes('function restoreModuleTouchState()'),
  'Restauração do estado tátil após BFCache ausente.');
assert(support.includes("button.style.removeProperty('pointer-events')"),
  'Cartão não pode voltar do BFCache com toque bloqueado.');
assert(support.includes("window.addEventListener('pageshow'"),
  'Retorno pelo histórico do Safari precisa ser tratado.');

assert(base.includes('AGENDA_DIRECT_NAV_V1'),
  'Fallback da Central-base para Agendas sem iframe foi removido.');
assert(/if\(name==='agendas'\)\{location\.assign\(/.test(base),
  'Fallback da Agenda precisa navegar diretamente.');
assert(base.includes("el('viewerFrame').src='about:blank'"),
  'Retorno da Central-base deve descarregar viewer legado.');
assert(quick.includes('function installInstitutionalNavigation()'),
  'Compatibilidade do login rápido foi alterada fora do escopo.');

assert(!/localStorage\.clear\s*\(/.test(support),
  'Proteção de navegação não pode limpar identidade local.');
assert(!/sessionStorage\.clear\s*\(/.test(support),
  'Proteção de navegação não pode limpar a sessão administrativa.');
assert(support.includes('portalTacsAdminTokenV1')&&support.includes('portalTacsTerritorioTokenV1'),
  'Navegação direta deve preservar as chaves de sessão existentes.');

assert(central.includes('<strong>Moradores</strong>')&&
       central.includes('<strong>Recados e campanhas</strong>')&&
       central.includes('<strong>Agendas e vagas</strong>')&&
       central.includes('<strong>Profissionais e serviços</strong>'),
  'Cartões administrativos principais precisam permanecer no layout atual');
assert(central.includes('<strong>TACS e áreas</strong>')&&
       central.includes('<strong>Municípios e organizações</strong>')&&
       central.includes('<strong>Portal do Morador</strong>'),
  'Cartões administrativos restritos/públicos precisam permanecer no layout atual');

console.log('Central Administrativa: navegação direta sem iframe, retorno BFCache e Agenda no iPhone validados.');
