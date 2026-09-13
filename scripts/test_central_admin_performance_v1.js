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
 * Contrato vigente a partir da Tarefa 10:
 * a Central é o shell persistente visível. O contorno antigo de navegação direta
 * continua apenas como fallback quando o shell canônico não estiver disponível.
 */
assert(!/central-admin-performance-v1\.js\?v=/.test(central),
  'Central não deve reinstalar o antigo host de preload oculto.');
assert(/central-suporte-moradores-v1\.js\?v=[^"']+/.test(central),
  'Central deve preservar a camada de compatibilidade Safari.');
assert(base.includes('TAREFA_10_SHELL_PERSISTENTE_V1'),
  'Shell persistente canônico da Tarefa 10 ausente.');
assert(base.includes('function ensureShellFrame(name,url,title,routeId)')&&base.includes('function showShellFrame(name,frame,title,routeId)'),
  'Central deve manter host persistente por rota interna do módulo.');
assert(base.includes("var shellFrames={},shellActiveModule='',shellActiveRoute='',shellScopeKey=''"),
  'Pool de módulos/rotas persistentes não foi criado.');
assert(base.includes('TAREFA_15_NAVEGACAO_INTERNA_V1')&&base.includes('voltar:closeViewer'),
  'Extensão de navegação interna da Tarefa 15 deve preservar o shell da Tarefa 10.');
['moradores','suporte','recados','agendas','profissionais','territorio','municipios','portal'].forEach((modulo)=>{
  assert(base.includes("name==='"+modulo+"'"),
    'Roteador canônico não cobre módulo obrigatório: '+modulo);
});
assert(!base.includes('AGENDA_DIRECT_NAV_V1'),
  'Agenda não deve continuar presa ao fallback de navegação direta.');
assert(!/if\(name==='agendas'\)\{location\.assign\(/.test(base),
  'Agenda deve abrir no shell persistente, não por troca de página.');
const closeStart=base.indexOf('function closeViewer()');
const closeEnd=base.indexOf('function loadContext(',closeStart);
const closeBlock=base.slice(closeStart,closeEnd);
assert(!/about:blank/.test(closeBlock),
  'Voltar à Central não pode destruir o módulo carregado.');
assert(base.includes('function resetModuleShell()')&&base.includes("frame.src='about:blank'"),
  'Shell deve descarregar módulos somente em reset explícito.');
assert(base.includes("resetModuleShell();selectedAreaId=normArea(this.value)"),
  'Troca de área deve eliminar módulos do escopo anterior.');
assert(base.includes('cancelarOperacaoAtivaSemCallback();\n  resetModuleShell();'),
  'Logoff deve descarregar o shell autenticado.');
assert(base.includes('TAREFA_10_AGENDA_LAZY_VISIBLE_V1'),
  'Agenda precisa iniciar o carregamento somente depois que o shell estiver visível.');
assert(central.includes('cscTask10PersistentShellStyle')&&central.includes('.viewer.csc-shell-viewer:not([hidden])'),
  'Viewer da Tarefa 10 deve ser uma superfície visível, não iframe oculto.');
assert(quick.includes('TAREFA_10_ROUTER_UNICO_V1')&&quick.includes("if(window.ConectaCentralShellV1&&typeof window.ConectaCentralShellV1.abrir==='function')"),
  'Login rápido não pode reinstalar um segundo roteador.');
assert(support.includes('TAREFA_10_SHELL_PERSISTENTE_V1')&&support.includes("if(window.ConectaCentralShellV1&&typeof window.ConectaCentralShellV1.abrir==='function')"),
  'Fallback Safari precisa ceder ao shell canônico.');
assert(support.includes('location.assign(url)'),
  'Fallback de navegação direta deve permanecer disponível apenas para ambientes sem shell.');
assert(support.includes('function restoreModuleTouchState()')&&support.includes("window.addEventListener('pageshow'"),
  'Proteções de BFCache/touch continuam preservadas como fallback.');

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

console.log('Central Administrativa: shell persistente visível, sessão única, BFCache e Agenda sem troca de página validados.');
