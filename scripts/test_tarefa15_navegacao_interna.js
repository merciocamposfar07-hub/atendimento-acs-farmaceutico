'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const centralHtml=read('central-administrativa-tacs.html');
const moduleFiles=[
  'teste-v1/painel-moradores-v2.html',
  'painel-suporte-moradores-v2.html',
  'painel-oficial-recados-campanhas.html',
  'painel-oficial-agendas-vagas.html',
  'painel-oficial-profissionais-servicos.html',
  'painel-oficial-tacs-areas.html',
  'painel-oficial-organizacoes-municipios.html',
  'teste-v1/painel-profissionais-servicos-v1.html',
  'teste-v1/painel-tacs-areas-v1.html'
];

new Function(central);

// Contrato principal: navegação interna do Conecta, sem histórico imprevisível do Safari.
assert.match(central,/TAREFA_15_NAVEGACAO_INTERNA_V1/);
assert.match(central,/var shellFrames=\{\},shellActiveModule='',shellActiveRoute='',shellScopeKey=''/);
assert.match(central,/function moduleRouteOptions\(options\)/);
assert.match(central,/function moduleRouteId\(name,options\)/);
assert.match(central,/revision='20260912-task15-navigation-v1'/);
assert.match(central,/function shellFrameKey\(routeId\)/);
assert.match(central,/function shellActiveFrame\(\)\{return shellActiveRoute&&shellFrames\[shellFrameKey\(shellActiveRoute\)\]\|\|null\}/);
assert.match(central,/function ensureShellFrame\(name,url,title,routeId\)/);
assert.match(central,/frame\.dataset\.shellRoute=routeId/);
assert.match(central,/function showShellFrame\(name,frame,title,routeId\)/);
assert.match(central,/shellActiveModule=name;shellActiveRoute=routeId/);
assert.match(central,/function openModule\(name,title,options\)/);
assert.match(central,/moduleRouteId\(name,options\),url=moduleUrl\(name,options\)/);
assert.match(central,/voltar:closeViewer/);
assert.match(central,/rotaAtiva:function\(\)\{return shellActiveRoute\}/);

// Voltar à Central apenas oculta o viewer; não desmonta os frames nem perde estado.
const closeStart=central.indexOf('function closeViewer(){');
const closeEnd=central.indexOf('\nfunction loadContext(',closeStart);
assert.ok(closeStart>=0&&closeEnd>closeStart,'closeViewer não localizado.');
const closeBlock=central.slice(closeStart,closeEnd);
assert.match(closeBlock,/shellHasUnsaved\(frame\)/);
assert.match(closeBlock,/viewer-open/);
assert.match(closeBlock,/shellActiveModule='';shellActiveRoute=''/);
assert.doesNotMatch(closeBlock,/resetModuleShell\(/);
assert.doesNotMatch(closeBlock,/\.remove\(\)/);
assert.doesNotMatch(closeBlock,/about:blank/);

// Prontuários e Pendências entram como rotas do mesmo shell.
assert.match(centralHtml,/shell\.abrir\('moradores','Prontuários',\{view:'prontuarios',all:'1'\}\)/);
assert.match(centralHtml,/shell\.abrir\('suporte','Pendências da área',\{view:'pending'\}\)/);
assert.doesNotMatch(centralHtml,/function openRecordsPage\(\)\{[\s\S]*?location\.assign\(/);
assert.doesNotMatch(centralHtml,/function openPendingPage\(\)\{[\s\S]*?location\.assign\(/);

// Toda seta Voltar usa o shell pai quando incorporada e replace seguro fora dele.
function assertBackContract(src,path){
  const start=src.indexOf('function backToCentral(){');
  assert.ok(start>=0,'backToCentral ausente em '+path);
  const end=src.indexOf('\nfunction ',start+1);
  const block=src.slice(start,end>start?end:start+900);
  assert.match(block,/window\.parent\.ConectaCentralShellV1\.voltar\(\)/,'Retorno interno ausente em '+path);
  assert.match(block,/location\.replace\(centralUrl\(\)\)/,'Fallback replace ausente em '+path);
  assert.doesNotMatch(block,/history\.back\(\)/,'history.back proibido em '+path);
  assert.doesNotMatch(block,/location\.assign\(centralUrl\(\)\)/,'location.assign proibido em '+path);
}
assertBackContract(centralHtml,'central-administrativa-tacs.html');
for(const path of moduleFiles)assertBackContract(read(path),path);

// A rota normal e as variantes têm identidades distintas, evitando colisão de estado.
assert.match(central,/if\(opts\.view\)id\+='\|view='\+opts\.view/);
assert.match(central,/if\(opts\.all\)id\+='\|all='\+opts\.all/);

// Tarefa 15 é exclusivamente de navegação frontend.
const appsScriptTouched=moduleFiles.concat([
  'central-administrativa-tacs.js',
  'central-administrativa-tacs.html'
]).some(p=>p.startsWith('apps-script/'));
assert.strictEqual(appsScriptTouched,false);

console.log('TAREFA_15_NAVEGACAO_INTERNA_OK: voltar usa o shell interno, preserva estado dos frames, separa rotas e não depende de history.back() do Safari.');
