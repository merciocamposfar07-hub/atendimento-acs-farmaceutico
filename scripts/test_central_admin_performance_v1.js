const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const support=read('central-suporte-moradores-v1.js');
const performance=read('central-admin-performance-v1.js');

assert(central.includes('central-suporte-moradores-v1.js?v=20260823-admin-performance-v1'),'Central deve carregar a revisão de desempenho sem mudar o layout dos cartões');
assert(support.includes('central-admin-performance-v1.js?v=20260823-admin-performance-v1'),'Camada de desempenho não foi carregada pela Central');
assert(support.includes('painel-suporte-moradores-v2.html'),'Navegação dedicada de suporte deve permanecer preservada');
assert(!support.includes('painel-oficial-agendas-vagas.html')&&!support.includes('painel-oficial-profissionais-servicos.html'),'Suporte deve continuar desacoplado dos demais módulos');

['moradores','recados','agendas','profissionais'].forEach((modulo)=>{
  assert(performance.includes("'"+modulo+"'"),'Pré-carregamento obrigatório ausente: '+modulo);
});
assert(performance.includes("name==='portal'"),'Portal público precisa permanecer fora do pool administrativo');
assert(performance.includes('portalTacsAdminPreloadPoolV1'),'Pool de painéis pré-carregados ausente');
assert(performance.includes('ensureFrame(name)'),'Reuso da instância carregada do painel ausente');
assert(performance.includes('ensurePool().appendChild(frames[activeName])'),'Ao voltar à Central o painel deve ser preservado, não destruído');
assert(!performance.includes('_cb=Date.now()'),'Camada rápida não pode criar cache-buster novo a cada toque');
assert(!performance.includes("src='about:blank'"),'Camada rápida não pode descarregar painel ao voltar à Central');

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

console.log('Central Administrativa performance V1: layout preservado, sessão única, pré-carregamento e reuso de painéis validados.');
