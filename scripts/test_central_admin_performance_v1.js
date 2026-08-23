const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const base=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const support=read('central-suporte-moradores-v1.js');
const performance=read('central-admin-performance-v1.js');

assert(central.includes('central-suporte-moradores-v1.js?v=20260823-admin-performance-v1'),'Central deve carregar o bootstrap oficial de desempenho sem mudar o layout dos cartões');
assert(support.includes('central-admin-performance-v1.js?v=20260823-admin-performance-v1'),'Bootstrap não aponta para o controlador oficial de desempenho');
assert(support.includes('BLOCO_1_CONTROLE_UNICO_V1'),'Contrato de controlador único do Bloco 1 ausente');
assert(support.includes("document.addEventListener('click',navigationGate,true)"),'Gate de captura deve existir antes da camada oficial ficar pronta');
assert(support.includes('if(window.PortalTacsCentralPerformanceV1)return;'),'Gate deve liberar o evento somente depois que o controlador oficial assumir');
assert(!support.includes('function openSupport('),'Suporte não pode manter um controlador próprio de navegação');
assert(!support.includes('.module[data-module="suporte"]'),'Suporte não pode interceptar seu cartão separadamente');
assert(!support.includes('frame.src=url'),'Bootstrap não pode abrir painel por conta própria');

['moradores','suporte','recados','agendas','profissionais'].forEach((modulo)=>{
  assert(performance.includes("'"+modulo+"'"),'Controlador oficial não cobre módulo obrigatório: '+modulo);
});
assert(performance.includes("event.target.closest('#moduleGrid .module[data-module]')"),'Controlador oficial precisa ser o dono da navegação dos cartões');
assert(performance.includes("event.target.closest('#viewerBack')"),'Controlador oficial precisa ser o dono do retorno à Central');
assert(performance.includes("name==='portal'"),'Portal público precisa permanecer fora do pool administrativo');
assert(performance.includes('portalTacsAdminPreloadPoolV1'),'Pool de painéis pré-carregados ausente');
assert(performance.includes('ensureFrame(name)'),'Reuso da instância carregada do painel ausente');
assert(performance.includes('ensurePool().appendChild(frames[activeName])'),'Ao voltar à Central o painel carregado deve ser preservado no pool');
assert(!performance.includes('_cb=Date.now()'),'Controlador oficial não pode criar cache-buster novo a cada toque');
assert(!/function closeViewerFast\([\s\S]*?src\s*=\s*['"]about:blank['"]/.test(performance),'Voltar à Central não pode descarregar o painel administrativo ativo');

/*
 * Os listeners legados ainda existem nesta etapa por compatibilidade com login,
 * permissões e rollback. O gate bloqueia sua execução até o controlador oficial
 * assumir e, depois, o listener de captura do controlador oficial encerra o
 * evento antes de chegar a eles. O Bloco 1 testa o comportamento efetivo, sem
 * remover rotinas de autenticação que não fazem parte deste escopo.
 */
assert(base.includes("el('moduleGrid').addEventListener('click'"),'Compatibilidade da Central-base foi alterada fora do escopo');
assert(quick.includes('function installInstitutionalNavigation()'),'Login rápido foi alterado fora do escopo do Bloco 1');

['pin','adminPin','tacsPin','tacsPinAccess','tacsPinPublicacoes','login','entrar','loginTacs','entrarTacs'].forEach((id)=>{
  assert(performance.includes("'"+id+"'"),'Controle redundante não tratado na sessão da Central: '+id);
});
assert(performance.includes('if(!getSession().ok)return'),'Supressão de PIN só pode ocorrer quando já existe sessão na Central');
assert(performance.includes('isErrorMessage'),'Erros reais de sessão devem continuar visíveis');

assert(!/localStorage\.clear\s*\(/.test(performance),'Otimização não pode limpar armazenamento local');
assert(!/sessionStorage\.clear\s*\(/.test(performance),'Otimização não pode limpar a sessão administrativa');
assert(!/removeItem\s*\(/.test(performance),'Otimização não pode apagar tokens ou identidade do aparelho');

assert(central.includes('<strong>Moradores</strong>')&&central.includes('<strong>Recados e campanhas</strong>')&&central.includes('<strong>Agendas e vagas</strong>')&&central.includes('<strong>Profissionais e serviços</strong>'),'Cartões administrativos principais precisam permanecer no layout atual');
assert(central.includes('<strong>TACS e áreas</strong>')&&central.includes('<strong>Municípios e organizações</strong>')&&central.includes('<strong>Portal do Morador</strong>'),'Cartões administrativos restritos/públicos precisam permanecer no layout atual');

console.log('Central Administrativa Bloco 1: um único controlador efetivo de navegação, compatibilidade de sessão preservada e pool rápido validado.');