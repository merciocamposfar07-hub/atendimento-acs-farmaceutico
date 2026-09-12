'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const access=read('conecta-acesso-unificado-v1.js');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');

new Function(access);
new Function(backend);

// Cliente: aparelho administrativo continua em modo somente leitura, mesmo após a
// unificação do núcleo de Morador feita pela Tarefa 7.
assert.match(access,/function adminResidentDiagnostic\(\)\{return roleRecognized\('ADMIN'\)\}/);
assert.match(access,/Diagnóstico administrativo do Morador/);
assert.match(access,/CPF ou CNS/);
assert.match(access,/post\('conecta_morador_diagnostico_admin'/);

const diagStart=access.indexOf('function diagnoseResidentAdmin(');
const diagEnd=access.indexOf('function startCpf(',diagStart);
assert(diagStart>=0&&diagEnd>diagStart,'Função de diagnóstico administrativo não localizada.');
const diagBlock=access.slice(diagStart,diagEnd);
assert.doesNotMatch(diagBlock,/saveProfile\(|saveSession\(|openResidentPortal\(|localStorage\.setItem|ConectaMoradorPinLocalV2/,'Diagnóstico não pode gravar sessão/vínculo residencial local.');

assert.match(access,/function createResidentPin\(\)[\s\S]*RESIDENT_CORE_DIAGNOSTIC\|\|adminResidentDiagnostic\(\)[\s\S]*não pode criar vínculo ou PIN de Morador/);
assert.match(access,/function loginResident\(\)[\s\S]*RESIDENT_CORE_DIAGNOSTIC\|\|adminResidentDiagnostic\(\)[\s\S]*não assume sessão de Morador/);

// Backend: ação exclusiva de diagnóstico autenticada pelo vínculo administrativo seguro.
assert.match(backend,/conecta_morador_diagnostico_admin/);
assert.match(backend,/function conectaAcessoV1AparelhoAdministrativo_/);
assert.match(backend,/function conectaAcessoV1BuscarCns_/);
assert.match(backend,/function conectaAcessoV1DiagnosticoMoradorAdmin_/);
assert.match(backend,/conectaAcessoV1ConfiancaValida_\('ADMIN','ADMIN_GERAL',dispositivo,chave\)/);
assert.match(backend,/modo:'DIAGNOSTICO_ADMINISTRATIVO',[\s\S]*coreMode:'DIAGNOSTICO_ADMINISTRATIVO',[\s\S]*somenteLeitura:true/);
assert.match(backend,/vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false/);

const backStart=backend.indexOf('function conectaAcessoV1DiagnosticoMoradorAdmin_');
const backEnd=backend.indexOf('function conectaAcessoV1RegistrarUbsConfiavel_',backStart);
assert(backStart>=0&&backEnd>backStart,'Bloco backend do diagnóstico não localizado.');
const backBlock=backend.slice(backStart,backEnd);
assert.doesNotMatch(backBlock,/\.setValue\(|\.setValues\(|appendRow\(|conectaAcessoV1SalvarCpf_|conectaAcessoV1CriarPendencia_|conectaAcessoV1CriarSessao_|conectaAcessoV1ConfirmarNotificacao_/,'Diagnóstico administrativo deve ser somente leitura.');

// Defesa em profundidade: o fluxo residencial normal é recusado em aparelho administrativo.
assert.match(backend,/function conectaAcessoV1Identificar_[\s\S]*conectaAcessoV1AparelhoAdministrativo_\(dispositivo\)/);
assert.match(backend,/function conectaAcessoV1Confirmar_[\s\S]*conectaAcessoV1AparelhoAdministrativo_\(dispositivo\)/);
assert.match(backend,/function conectaAcessoV1CriarPin_[\s\S]*Aparelho administrativo não pode criar PIN nem vínculo residencial/);
assert.match(backend,/function conectaAcessoV1LoginMorador_[\s\S]*Aparelho administrativo não pode assumir sessão de Morador/);
assert.match(backend,/function conectaAcessoV1ConfirmarNotificacao_[\s\S]*Aparelho administrativo não pode ser registrado para notificações de Morador/);

// A evolução da Tarefa 7 pode reutilizar o núcleo visual, mas não pode retirar a barreira.
assert.match(access,/RESIDENT_CORE_DIAGNOSTIC='DIAGNOSTICO_ADMINISTRATIVO'/);
assert.match(access,/function residentCoreMode\(\)/);

console.log('TAREFA_6_ADMIN_MORADOR_SEM_VINCULO_OK: CPF/CNS em aparelho Administrador permanecem em diagnóstico somente leitura; PIN, sessão, vínculo residencial e notificações continuam bloqueados.');
