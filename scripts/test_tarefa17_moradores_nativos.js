'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const native=read('conecta-moradores-native-v1.js');
const css=read('conecta-moradores-native-v1.css');
const transport=read('teste-v1/painel-moradores-transport-v2.js');
const legacy=read('teste-v1/painel-moradores-v2.html');
const task16=read('conecta-agendas-native-v1.js');

new Function(central);
new Function(native);
new Function(transport);
new Function(task16);

// Contrato principal: Moradores é o segundo painel nativo.
assert.match(central,/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.match(native,/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.match(central,/function showNativeMoradores\(title,routeId\)/);
assert.match(central,/if\(name==='moradores'&&moduleRouteOptions\(options\)\.view!=='prontuarios'\)\{showNativeMoradores\(title\|\|'Moradores',routeId\);return\}/);
assert.match(central,/nativeMoradoresHost/);
assert.match(central,/shellActiveNative='moradores'/);

// Prontuários permanece fora do escopo desta tarefa e continua como rota de frame.
assert.match(central,/moduleRouteOptions\(options\)\.view!=='prontuarios'/);
assert.match(central,/ensureShellFrame\(name,url,title\|\|'Painel',routeId\)/);

// Agendas nativas não são desmontadas/reescritas ao abrir Moradores.
assert.match(central,/ConectaAgendasNativeV1\.hide/);
assert.match(central,/ConectaMoradoresNativeV1\.hide/);
assert.match(central,/ConectaAgendasNativeV1\.reset/);
assert.match(central,/ConectaMoradoresNativeV1\.reset/);
assert.match(task16,/TAREFA_16_AGENDAS_NATIVAS_V1/);

// O módulo nativo não cria iframe nem login próprio.
assert.doesNotMatch(native,/createElement\(['"]iframe['"]\)/);
assert.doesNotMatch(native,/admin_login|admin_territorio_login_pin|Digite o PIN|Entrar como administrador/);
assert.match(native,/window\.ConectaModuleCoreV1/);
assert.match(native,/PortalTacsMoradoresTransportV2/);

// CPF/CNS e cadastro individual permanecem no módulo nativo.
assert.match(native,/id="cpf"/);
assert.match(native,/id="cns"/);
assert.match(native,/id="name"/);
assert.match(native,/id="birth"/);
assert.match(native,/id="residentForm"/);
assert.match(native,/referência familiar registrada/);

// Transporte validado preserva busca, criação/edição, situação e consolidação.
assert.match(transport,/admin_moradores_buscar/);
assert.match(transport,/admin_morador_salvar/);
assert.match(transport,/admin_morador_situacao/);
assert.match(transport,/admin_morador_consolidar/);
assert.match(transport,/function validCpf\(/);
assert.match(transport,/if\(p\.cpf&&p\.cpf\.length!==11\)/);
assert.match(transport,/if\(p\.cns&&p\.cns\.length!==15\)/);
assert.match(transport,/legacyCpfZeroInitial/);
assert.match(transport,/COMPARISON_FIELDS/);

// Isolamento territorial continua obrigatório. A areaId só é injetada no core quando existe, sem sobrescrever o contexto canônico com undefined.
assert.match(transport,/if\(text\(a&&a\._areaId\)&&text\(b&&b\._areaId\)&&text\(a\._areaId\)!==text\(b\._areaId\)\)return false/);
assert.match(transport,/selectedAreaId=nativeConfig&&nativeConfig\.areaId/);
assert.match(transport,/if\(selectedAreaId\)extra\.areaId=selectedAreaId/);
assert.match(transport,/changeArea:changeArea/);

// Core continua dono de sessão, cache e requisições.
assert.match(transport,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(transport,/modulePerf=moduleCore&&moduleCore\.performance/);
assert.match(transport,/moduleRequests=moduleCore&&moduleCore\.requests/);
assert.match(transport,/modulePerf\.prime\('moradores-base'/);
assert.match(transport,/modulePerf\.commit\('moradores-base'/);
assert.match(transport,/moduleRequests\.read\(action,payload/);

// O transporte é compatível com página antiga e host nativo.
assert.match(transport,/ConectaMoradoresNativeConfigV1/);
assert.match(transport,/function rebindNativeContext\(config\)/);
assert.match(transport,/version:'3\.7\.0-native-task17'/);
assert.match(legacy,/painel-moradores-transport-v2\.js/);

// Alterações no formulário são protegidas pelo Voltar.
assert.match(native,/host\.dataset\.tacsDirty=dirty\?'1':'0'/);
assert.match(native,/write-confirmed/);
assert.match(central,/shellActiveNative==='moradores'/);
assert.match(central,/ConectaMoradoresNativeV1\.hasUnsaved/);
assert.match(central,/Há alterações que podem não ter sido salvas/);

// Visual institucional nativo existe.
assert.match(css,/\.csc-mor-native/);
assert.match(css,/#071827/);

// Nenhum outro painel é migrado pela Tarefa 17.
assert.doesNotMatch(central,/TAREFA_18/);
assert.doesNotMatch(native,/TAREFA_18/);

console.log('TAREFA_17_MORADORES_NATIVOS_OK: Moradores roda no host nativo da Central; busca, cadastro/edição, CPF/CNS, duplicidades, situação e isolamento territorial permanecem preservados; Prontuários continua fora do escopo desta etapa.');
