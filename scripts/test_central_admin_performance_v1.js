const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const base=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const support=read('central-suporte-moradores-v1.js');
const performance=read('central-admin-performance-v1.js');

const directController='central-admin-performance-v1.js?v=20260823-central-navigation-v2';
assert(central.includes('rel="preload" as="script" href="/atendimento-acs-farmaceutico/'+directController+'"'),'Central deve iniciar o download do controlador rápido durante a leitura do HTML');
assert(central.includes('<script src="/atendimento-acs-farmaceutico/'+directController+'"></script>'),'Controlador rápido deve ser carregado diretamente pela Central');
assert(central.indexOf(directController)<central.indexOf('central-tacs-login-rapido-v1.js'),'Controlador rápido precisa carregar antes do login rápido instalar compatibilidades de navegação');
assert(central.indexOf(directController)<central.indexOf('central-suporte-moradores-v1.js'),'Controlador rápido precisa estar pronto antes do bootstrap de suporte');
assert(central.includes('central-suporte-moradores-v1.js?v=20260823-admin-performance-v1'),'Central deve preservar o bootstrap de suporte e fallback');
assert(support.includes('central-admin-performance-v1.js?v=20260823-admin-performance-v1'),'Bootstrap deve preservar fallback do controlador oficial');
assert(support.includes('BLOCO_1_CONTROLE_UNICO_V1'),'Contrato de controlador único do Bloco 1 ausente');
assert(support.includes("document.addEventListener('click',navigationGate,true)"),'Gate de compatibilidade deve continuar seguro se o carregamento direto falhar');
assert(support.includes('if(window.PortalTacsCentralPerformanceV1)return;'),'Fallback não pode instalar segunda instância quando o controlador direto já existe');
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

assert(performance.includes("dataset.tacsDirtyTracking='1'"),'Controlador rápido precisa assumir rastreamento de alterações não salvas');
assert(performance.includes("dataset.tacsDirty='1'"),'Edição real de campo deve marcar o painel como alterado');
assert(performance.includes('activePanelIsDirty()'),'Retorno à Central precisa verificar alterações do painel ativo');
assert(performance.includes('window.confirm(DIRTY_MESSAGE)'),'Retorno não pode descartar alterações sem confirmação do operador');
assert(performance.includes("getElementById('portalTacsAdminRefreshV1')"),'Controlador rápido deve remover refresh interno redundante do painel carregado');
assert(performance.includes("dataset.portalTacsPerformanceInstalled='1'"),'Controlador deve expor marcador de instalação para homologação do primeiro toque');
assert(performance.includes("version:'1.1.0'"),'Versão do controlador do Bloco 2 não foi aplicada');

/*
 * Listeners legados permanecem no código por compatibilidade e rollback, mas o
 * controlador oficial é carregado diretamente antes deles e intercepta a rota
 * efetiva. Este bloco não modifica autenticação, permissões ou login rápido.
 */
assert(base.includes("el('moduleGrid').addEventListener('click'"),'Compatibilidade da Central-base foi alterada fora do escopo');
assert(quick.includes('function installInstitutionalNavigation()'),'Login rápido foi alterado fora do escopo do Bloco 2');

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

console.log('Central Administrativa Bloco 2: controlador pré-carregado antes do primeiro toque, retorno rápido preservado e proteção contra perda de edição validada.');