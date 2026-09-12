'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const html=read('central-administrativa-tacs.html');
const core=read('conecta-module-core-v1.js');

new Function(central);
new Function(quick);
new Function(core);

// Shell único e persistente na Central.
assert.match(central,/var shellFrames=\{\},shellActiveModule='',shellScopeKey=''/);
assert.match(central,/TAREFA_10_SHELL_PERSISTENTE_V1/);
assert.match(central,/function ensureShellFrame\(name,url,title\)/);
assert.match(central,/if\(frame\)return frame/,'Módulo já carregado deve reutilizar o mesmo iframe.');
assert.match(central,/function showShellFrame\(name,frame,title\)/);
assert.match(central,/function resetModuleShell\(\)/);
assert.match(central,/window\.ConectaCentralShellV1=\{/);
assert.match(central,/contagemFrames:function\(\)\{return Object\.keys\(shellFrames\)\.length\}/);

// Agendas deixa de abandonar a Central e passa pelo mesmo shell.
const openStart=central.indexOf('function openModule(name,title)');
const closeStart=central.indexOf('function closeViewer()',openStart);
const openBlock=central.slice(openStart,closeStart);
assert.ok(openStart>=0&&closeStart>openStart,'Bloco openModule ausente.');
assert.doesNotMatch(openBlock,/location\.(?:assign|href)/,'Módulo não pode abandonar a Central.');
assert.match(openBlock,/ensureShellFrame\(name,url,title\|\|'Painel'\)/);
assert.match(openBlock,/showShellFrame\(name,frame,title\|\|'Painel'\)/);

// Safari/iPhone: frame só recebe URL depois de shell e iframe estarem visíveis.
const ensureStart=central.indexOf('function ensureShellFrame(name,url,title)');
const showStart=central.indexOf('function showShellFrame(name,frame,title)',ensureStart);
const unsavedStart=central.indexOf('function shellHasUnsaved',showStart);
const ensureBlock=central.slice(ensureStart,showStart);
const showBlock=central.slice(showStart,unsavedStart);
assert.doesNotMatch(ensureBlock,/frame\.src=url/,'Iframe não pode iniciar carregamento enquanto ainda está oculto.');
const viewerVisible=showBlock.indexOf("viewer.hidden=false");
const frameVisible=showBlock.indexOf("frame.hidden=false");
const requestLoad=showBlock.indexOf("requestAnimationFrame(carregar)");
assert.ok(viewerVisible>=0&&frameVisible>viewerVisible,'Viewer precisa ficar visível antes do iframe.');
assert.ok(requestLoad>frameVisible,'Carregamento deve começar depois que o iframe ficou visível.');
assert.match(showBlock,/TAREFA_10_AGENDA_LAZY_VISIBLE_V1/);

// Voltar à Central preserva documento e sessão; não reconstrói o módulo.
const loadContextStart=central.indexOf('function loadContext(message)',closeStart);
const closeBlock=central.slice(closeStart,loadContextStart);
assert.doesNotMatch(closeBlock,/about:blank|\.src\s*=/,'Voltar à Central não pode descarregar o módulo.');
assert.doesNotMatch(closeBlock,/removeItem\(TOKEN_KEY\)|removeItem\(TERRITORY_TOKEN_KEY\)/,'Voltar não pode encerrar sessão.');
assert.match(closeBlock,/(?:viewer|el\('viewer'\))\.hidden=true/);
assert.match(closeBlock,/shellActiveModule=''/);

// A sessão só destrói os frames em eventos realmente estruturais.
assert.match(central,/cancelarOperacaoAtivaSemCallback\(\);\s*resetModuleShell\(\);\s*token='';territoryToken='';mode=''/,'Logoff explícito deve limpar módulos protegidos.');
assert.match(central,/resetModuleShell\(\);selectedAreaId=normArea\(this\.value\)/,'Troca de área deve invalidar frames do escopo antigo.');

// BFCache/pageshow não pode destruir frames ou voltar ao PIN.
const pageStart=central.indexOf("window.addEventListener('pageshow',function(){");
const pageEnd=central.indexOf('window.ConectaCentralModuleCoreV1=',pageStart);
const pageBlock=central.slice(pageStart,pageEnd);
assert.doesNotMatch(pageBlock,/about:blank|\.src\s*=/,'pageshow não pode descarregar módulos.');
assert.doesNotMatch(pageBlock,/showLogin\(/,'pageshow com sessão não deve reconstruir login.');

// Roteador legado deve se retirar quando o shell canônico está disponível.
assert.match(quick,/TAREFA_10_ROUTER_UNICO_V1/);
assert.match(quick,/if\(window\.ConectaCentralShellV1&&typeof window\.ConectaCentralShellV1\.abrir==='function'\)\{[\s\S]*installCentralPageRefresh\(\);[\s\S]*return;[\s\S]*\}/);

// CSS do shell e cache-busting da versão atual.
assert.match(html,/id="cscTask10PersistentShellStyle"/);
assert.match(html,/viewer\.csc-shell-viewer:not\(\[hidden\]\)/);
assert.match(html,/central-administrativa-tacs\.js\?v=20260912-task10-shell-v1/);
assert.match(html,/central-tacs-login-rapido-v1\.js\?v=20260912-task10-shell-v1/);

// Tarefa 9 continua valendo dentro dos módulos.
assert.match(core,/installTask9ModuleGate\(\)/);
assert.match(core,/Módulo tentou substituir a sessão global/);
assert.match(core,/Módulo tentou encerrar a sessão global/);

console.log('TAREFA_10_SESSAO_SHELL_PERSISTENTE_OK: Central, Agendas, Profissionais e Recados compartilham a mesma sessão e shell; módulos são carregados sob demanda, preservados ao voltar e reutilizados sem novo PIN ou reconstrução.');
