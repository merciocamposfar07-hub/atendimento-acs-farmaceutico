const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const base=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const support=read('central-suporte-moradores-v1.js');
const unified=read('conecta-acesso-unificado-v1.js');
const agenda=read('painel-oficial-agendas-vagas.html');
const agendaCard=read('agenda-whatsapp-card-v1.js');

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
assert(support.includes('SESSAO_UNICA_PAINEL_V2')&&support.includes('if(!hasAnySession())return;'),
  'A Central não pode abrir painel administrativo antes da sessão remota existir; isso reexibiria PIN dentro do painel.');
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

assert(base.includes("HEALTH_CACHE_PREFIX='portalTacsHealthConfirmedV1:'")&&base.includes('function renderHealthCache(areaId)'),
  'Saúde geral deve exibir a última confirmação válida imediatamente enquanto sincroniza em segundo plano.');
assert(base.includes('HEALTH_DISPLAY_CACHE_TTL=86400000'),
  'Saúde geral deve reaproveitar a última confirmação por 24h apenas para pintura imediata, mantendo sincronização em segundo plano.');
assert(base.includes('function renderHealthInstant(areaId)')&&base.includes('renderModules();renderHealthInstant(selectedAreaId);if(!skipHealth)refreshHealth()'),
  'Abertura local por PIN deve pintar Saúde geral antes da confirmação remota.');
assert(base.includes("healthPostIsolated('admin_moradores_status'"),
  'Saúde geral não pode ocupar o transporte global da Central para consultar moradores.');
assert(base.includes("jsonp('publico_conteudo_status'"),
  'Saúde geral deve usar o status leve de conteúdo, sem carregar recados/campanhas completos.');
assert(base.includes("if(confirmadoAnterior){\n    renderConfirmedNotification(confirmadoAnterior,areaId);"),
  'Notificações devem mostrar a última confirmação válida imediatamente enquanto revalidam.');
assert(base.includes("var confirmadoAnterior=readConfirmedNotification(areaId)"),
  'Notificações confirmadas não devem voltar para Confirmando a cada navegação quando há confirmação recente.');
assert(agenda.includes("portalTacsAgendaAreaSnapshotV1:"),
  'Agendas deve reutilizar snapshot confirmado da área mesmo quando a sessão recebe novo token.');
assert(!agendaCard.includes("b.id='atualizarPaginaAgendasFlutuante'"),
  'Agenda não pode recriar o botão flutuante Atualizar página.');
assert(unified.includes("selectRoleFromTap('admin',e)")&&unified.includes("selectRoleFromTap('tacs',e)")&&unified.includes("selectRoleFromTap('morador',e)"),
  'Os três perfis devem usar o mesmo controlador de toque.');
assert(!unified.includes("setTimeout(function(){showRole('admin')},0)")&&!unified.includes("setTimeout(function(){showRole('tacs')},0)"),
  'Administrador e TACS não podem usar atraso artificial na troca de perfil.');
assert(unified.includes("focusRoleField(role)"),
  'A troca de perfil deve manter a caixa de identificação/PIN disponível para digitação.');

console.log('Central Administrativa: navegação direta sem iframe, retorno BFCache e Agenda no iPhone validados.');
