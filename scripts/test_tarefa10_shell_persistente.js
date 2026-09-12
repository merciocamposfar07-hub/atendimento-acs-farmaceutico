'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const html=read('central-administrativa-tacs.html');
const quick=read('central-tacs-login-rapido-v1.js');
const support=read('central-suporte-moradores-v1.js');

new Function(central);
new Function(quick);
new Function(support);

// Shell único e persistente.
assert.match(central,/TAREFA_10_SHELL_PERSISTENTE_V1/);
assert.match(central,/var shellFrames=\{\},shellActiveModule='',shellScopeKey=''/);
assert.match(central,/function ensureShellFrame\(name,url,title\)/);
assert.match(central,/function showShellFrame\(name,frame,title\)/);
assert.match(central,/function resetModuleShell\(\)/);
assert.match(central,/window\.ConectaCentralShellV1=\{/);
assert.match(central,/contagemFrames:function\(\)\{return Object\.keys\(shellFrames\)\.length\}/);

// Módulos administrativos permanecem na Central, inclusive Agendas.
for(const name of ['moradores','suporte','recados','agendas','profissionais','territorio','municipios']){
  assert.ok(central.includes("name==='"+name+"'"),'Módulo ausente do roteador único: '+name);
}
assert.doesNotMatch(central,/if\(name==='agendas'\)\{location\.assign/);
assert.match(central,/TAREFA_10_AGENDA_LAZY_VISIBLE_V1/);
assert.match(central,/viewer\.hidden=false[\s\S]*frame\.hidden=false[\s\S]*requestAnimationFrame\(carregar\)/);

// Voltar à Central preserva o módulo carregado; reset ocorre só em fronteiras reais.
const closeStart=central.indexOf('function closeViewer()');
const closeEnd=central.indexOf('function loadContext(',closeStart);
assert.ok(closeStart>=0&&closeEnd>closeStart);
const closeBlock=central.slice(closeStart,closeEnd);
assert.doesNotMatch(closeBlock,/about:blank|\.remove\(\)/);
assert.match(closeBlock,/viewer'\)\.hidden=true|el\('viewer'\)\.hidden=true/);
assert.match(central,/resetModuleShell\(\);selectedAreaId=normArea\(this\.value\)/);
assert.match(central,/cancelarOperacaoAtivaSemCallback\(\);\s*resetModuleShell\(\);/);
assert.match(central,/function bloquearAcessoLocal[\s\S]*resetModuleShell\(\)/);

// BFCache/retorno não pode reconstruir o shell.
const pageStart=central.indexOf("window.addEventListener('pageshow'");
const pageEnd=central.indexOf('window.ConectaCentralModuleCoreV1',pageStart);
assert.ok(pageStart>=0&&pageEnd>pageStart);
assert.doesNotMatch(central.slice(pageStart,pageEnd),/about:blank|location\.reload/);

// Viewer é visível quando aberto; proteção antiga de iframe oculto cede ao shell.
assert.match(html,/cscTask10PersistentShellStyle/);
assert.match(html,/\.viewer\.csc-shell-viewer:not\(\[hidden\]\)\{display:flex!important/);
assert.match(quick,/TAREFA_10_ROUTER_UNICO_V1[\s\S]*ConectaCentralShellV1/);
assert.match(support,/TAREFA_10_SHELL_PERSISTENTE_V1[\s\S]*ConectaCentralShellV1/);
assert.match(support,/function installSafeNavigation\(\)[\s\S]*ConectaCentralShellV1[\s\S]*return;/);

// Tarefa 10 não antecipa o histórico/back canônico da Tarefa 15.
assert.doesNotMatch(central,/history\.pushState|history\.replaceState|popstate/);

console.log('TAREFA_10_SHELL_PERSISTENTE_OK: Central, Agendas, Profissionais e Recados navegam no mesmo shell/sessão; módulos permanecem carregados ao voltar à Central e são descartados apenas em reset explícito.');
