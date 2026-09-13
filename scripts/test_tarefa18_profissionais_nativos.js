'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const native=read('conecta-profissionais-native-v1.js');
const css=read('conecta-profissionais-native-v1.css');
const legacy=read('teste-v1/painel-profissionais-servicos-v1.html');
const task16=read('conecta-agendas-native-v1.js');
const task17=read('conecta-moradores-native-v1.js');

new Function(central);
new Function(native);
new Function(task16);
new Function(task17);

// Contrato principal: Profissionais e serviços é o terceiro painel nativo.
assert.match(central,/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);
assert.match(native,/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);
assert.match(central,/function showNativeProfissionais\(title,routeId\)/);
assert.match(central,/if\(name==='profissionais'\)\{showNativeProfissionais\(title\|\|'Profissionais e serviços',routeId\);return\}/);
assert.match(central,/nativeProfissionaisHost/);
assert.match(central,/shellActiveNative='profissionais'/);

// A rota normal desvia para o host nativo antes do frame genérico.
const openStart=central.indexOf('function openModule(name,title,options)');
const openEnd=central.indexOf('function closeViewer()',openStart);
const openBlock=central.slice(openStart,openEnd);
assert.ok(openStart>=0&&openEnd>openStart,'openModule ausente');
assert.ok(openBlock.indexOf("if(name==='profissionais'){showNativeProfissionais") < openBlock.indexOf('ensureShellFrame(name,url'),'Profissionais deve usar o host nativo antes do frame genérico.');

// Agendas e Moradores nativos permanecem independentes e persistentes.
assert.match(central,/function hideAllNativeExcept\(kind\)/);
assert.match(central,/hideAllNativeExcept\('agendas'\)/);
assert.match(central,/hideAllNativeExcept\('moradores'\)/);
assert.match(central,/hideAllNativeExcept\('profissionais'\)/);
assert.match(task16,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(task17,/TAREFA_17_MORADORES_NATIVOS_V1/);

// A UI nativa não possui PIN/login/logout próprios.
assert.doesNotMatch(native,/admin_login|admin_logout|Digite o PIN|PIN administrativo|Validando o PIN/);
assert.match(native,/var core=window\.ConectaModuleCoreV1/);

// A página antiga é somente ponte invisível/fallback para lógica validada.
assert.match(native,/data-role="bridge"/);
assert.match(native,/hidden aria-hidden="true"/);
assert.match(native,/painel-profissionais-servicos-v1\.html\?area=/);
assert.match(legacy,/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);
assert.match(legacy,/window\.ConectaProfissionaisBridgeV1=\{/);
assert.match(legacy,/nativeCompat:'task18-profissionais-native-v1'/);
assert.match(legacy,/function bridgeReload\(callback\)/);

// Escritas reais continuam as mesmas e exigem releitura + comparação antes de sucesso.
assert.match(legacy,/post\('admin_salvar_profissional'/);
assert.match(legacy,/post\('admin_salvar_servico'/);
assert.match(legacy,/post\('admin_criar_profissional'/);
assert.match(legacy,/carregarDados\('Profissional salvo\. Conferindo releitura\.'/);
assert.match(legacy,/carregarDados\('Serviço salvo\. Conferindo releitura\.'/);
assert.match(legacy,/carregarDados\('Cadastro integrado enviado\. Conferindo releitura\.'/);
assert.match(legacy,/bridgeProfEqual\(atual,payload\)/);
assert.match(legacy,/bridgeServEqual\(atual,payload\)/);
assert.match(legacy,/var confirmado=ok===true&&!!atual/);

// Criação integrada preserva profissional + primeiro serviço + agenda já existente no backend.
assert.match(native,/Criar profissional, serviço e agenda/);
assert.match(native,/createProfessional\(payload/);
assert.match(legacy,/admin_criar_profissional/);

// Cache, deduplicação e contexto territorial continuam no código validado legado/core.
assert.match(legacy,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(legacy,/modulePerf=moduleCore&&moduleCore\.performance/);
assert.match(legacy,/moduleRequests=moduleCore&&moduleCore\.requests/);
assert.match(legacy,/modulePerf\.prime\('profissionais'/);
assert.match(legacy,/modulePerf\.commit\('profissionais'/);
assert.match(legacy,/moduleRequests\.read\(action,payload/);
assert.match(legacy,/moduleCore\.session\(\{areaId:areaId,escopo:'profissionais'\}\)/);

// Serviço odontológico redundante continua omitido na superfície nativa.
assert.match(native,/ATENDIMENTO ODONTOLOGICO DE EMERGENCIA/);
assert.match(native,/visibleService/);

// Alterações não salvas e desfazer permanecem protegidos.
assert.match(native,/host\.dataset\.tacsDirty=dirty\?'1':'0'/);
assert.match(native,/UNDO_KEY='conectaProfissionaisUndoTask18V1'/);
assert.match(central,/shellActiveNative==='profissionais'/);
assert.match(central,/ConectaProfissionaisNativeV1\.hasUnsaved/);
assert.match(central,/Há alterações que podem não ter sido salvas/);

// Visual institucional nativo.
assert.match(css,/\.csc-prof-native/);
assert.match(css,/#071827/);

// A sequência original aprovada termina na Tarefa 18.
assert.doesNotMatch(central,/TAREFA_19/);
assert.doesNotMatch(native,/TAREFA_19/);

console.log('TAREFA_18_PROFISSIONAIS_NATIVOS_OK: Profissionais e serviços roda no host nativo da Central, preserva escrita real com releitura confirmada, criação integrada, cache/core e isolamento dos painéis anteriores.');
