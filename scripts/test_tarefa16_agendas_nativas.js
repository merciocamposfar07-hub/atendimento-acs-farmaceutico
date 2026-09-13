'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const html=read('central-administrativa-tacs.html');
const native=read('conecta-agendas-native-v1.js');
const transport=read('conecta-agendas-transport-v1.js');
const css=read('conecta-agendas-native-v1.css');
const legacy=read('painel-oficial-agendas-vagas.html');

new Function(central);
new Function(native);
new Function(transport);

// Contrato principal: Agendas é o primeiro painel nativo da Tarefa 16.
assert.match(central,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(html,/id="nativeModuleHost"/);
assert.match(html,/\.csc-native-module-host/);
assert.match(central,/function showNativeAgenda\(title,routeId\)/);
assert.match(central,/if\(name==='agendas'\)\{showNativeAgenda\(title\|\|'Agendas e vagas',routeId\);return\}/);
assert.match(central,/shellActiveNative='agendas'/);
assert.match(central,/tipoAtivo:function\(\)\{return shellActiveNative\?'native':'frame'\}/);

// Agendas normal não usa o iframe do viewer; os outros painéis continuam no shell existente.
const openStart=central.indexOf('function openModule(name,title,options)');
const openEnd=central.indexOf('function closeViewer()',openStart);
const openBlock=central.slice(openStart,openEnd);
assert.ok(openStart>=0&&openEnd>openStart,'openModule ausente');
assert.ok(openBlock.indexOf("if(name==='agendas'){showNativeAgenda") < openBlock.indexOf('ensureShellFrame(name,url'),'Agendas deve desviar para o host nativo antes de criar frame.');
assert.match(central,/var base=el\('viewerFrame'\);if\(base\)base\.hidden=true/);
assert.match(central,/var host=el\('nativeModuleHost'\),viewer=el\('viewer'\)/);
assert.match(central,/window\.ConectaAgendasNativeV1\.mount\(host\)/);
assert.match(central,/function showShellFrame\(name,frame,title,routeId\)/,'Outros módulos ainda devem preservar o shell da Tarefa 10.');
assert.match(central,/ensureShellFrame\(name,url,title\|\|'Painel',routeId\)/);

// Voltar e reset preservam o comportamento das Tarefas 10 e 15.
assert.match(central,/window\.ConectaAgendasNativeV1\.hasUnsaved/);
assert.match(central,/window\.ConectaAgendasNativeV1\.hide/);
assert.match(central,/window\.ConectaAgendasNativeV1\.reset/);
assert.match(central,/Há alterações que podem não ter sido salvas/);
assert.match(central,/shellActiveModule='';shellActiveRoute='';shellActiveNative=''/);

// O módulo nativo usa somente o núcleo autenticado; não reinstala PIN/login próprio.
assert.match(native,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(native,/var core=window\.ConectaModuleCoreV1/);
assert.match(native,/perf=core\.performance,requests=core\.requests,policy=core\.sessionPolicy/);
assert.match(native,/core\.session\(\{areaId:areaId,escopo:'agendas'\}\)/);
assert.doesNotMatch(native,/admin_login|admin_logout|Digite um PIN|Validando o PIN/);

// Leitura, cache/frescor, deduplicação e timeout continuam usando o core.
assert.match(native,/perf\.prime\('agendas'/);
assert.match(native,/perf\.commit\('agendas'/);
assert.match(native,/transport\.read\('admin_dados'/);
assert.match(native,/policy\.classify/);
assert.match(transport,/requests\.read\(action,payload/);
assert.match(transport,/requests\.noteAction\(action\)/);

// Gravação só é declarada concluída depois de POST + releitura real + comparação.
assert.match(native,/transport\.post\('admin_salvar_agenda'/);
assert.match(native,/load\('Alteração enviada\. Conferindo a leitura real…'/);
assert.match(native,/sameChanges\(current,p,before\)/);
assert.match(native,/Agenda salva e confirmada pela releitura do servidor/);
assert.match(native,/sameExact\(achar\(p\.modulo,p\.dia\),p\)/);
assert.match(transport,/portalTacsPublicInvalidateAtV1/);

// O iframe remanescente é somente ponte de transporte, nunca hospeda o painel nativo.
assert.match(transport,/não hospeda nem renderiza o painel/);
assert.match(transport,/frame\.hidden=true/);
assert.doesNotMatch(native,/document\.createElement\('iframe'\)/);

// Visual nativo institucional existe e o painel legado permanece preservado como fallback histórico.
assert.match(css,/\.csc-ag-native/);
assert.match(legacy,/Agendas e vagas/);
assert.match(central,/moduleUrl\(name,options\)/);

// A Tarefa 16 continua isolada em Agendas. A Central pode avançar para tarefas posteriores,
// mas os arquivos próprios de Agendas não podem absorver a lógica de outros painéis.
assert.match(central,/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.doesNotMatch(native,/TAREFA_17/);
assert.doesNotMatch(transport,/TAREFA_17/);

console.log('TAREFA_16_AGENDAS_NATIVAS_OK: Agendas e vagas roda no host nativo da Central, mantém sessão/core, gravação com releitura confirmada e não usa iframe como arquitetura do painel.');
