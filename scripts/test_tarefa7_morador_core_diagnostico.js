'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const access=read('conecta-acesso-unificado-v1.js');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');

new Function(access);
new Function(backend);

// Um único núcleo de Morador com dois modos explícitos.
assert.match(access,/RESIDENT_CORE_REAL='MORADOR_REAL'/);
assert.match(access,/RESIDENT_CORE_DIAGNOSTIC='DIAGNOSTICO_ADMINISTRATIVO'/);
assert.match(access,/function residentCoreMode\(\)\{return adminResidentDiagnostic\(\)\?RESIDENT_CORE_DIAGNOSTIC:RESIDENT_CORE_REAL\}/);
assert.match(access,/coreMode:residentCoreMode\(\)/);

// O primeiro formulário é compartilhado pelos dois modos.
assert.match(access,/function renderResidentDocumentEntry\(\)/);
assert.match(access,/field\('cscResidentDocument',label,attrs\)/);
assert.match(access,/id="cscResidentDocumentNext"/);
assert.match(access,/function startResidentDocument\(\)/);
assert.match(access,/state\.coreMode===RESIDENT_CORE_DIAGNOSTIC\)\{diagnoseResidentAdmin\(doc\);return\}/);
assert.doesNotMatch(access,/cscResidentDiagnosticDoc|cscResidentDiagnosticGo/,'Não deve restar formulário paralelo exclusivo do diagnóstico.');

// O resultado usa o mesmo residentStage, mas o modo diagnóstico nunca avança para PIN.
assert.match(access,/function renderResidentCoreResult\(r\)/);
assert.match(access,/state\.coreMode===RESIDENT_CORE_DIAGNOSTIC/);
assert.match(access,/Modo: diagnóstico administrativo\. Nenhum PIN, sessão, aparelho ou notificação do Morador foi assumido/);
assert.match(access,/renderIdentityFound\(r\)/);

// O modo acompanha a requisição e é confirmado pelo backend.
assert.match(access,/conecta_morador_diagnostico_admin'.*coreMode:state\.coreMode/s);
assert.match(access,/conecta_morador_identificar'.*coreMode:state\.coreMode/s);
assert.match(backend,/coreMode:'DIAGNOSTICO_ADMINISTRATIVO'/);
assert.match(access,/text\(r\.coreMode\|\|r\.modo\)!==RESIDENT_CORE_DIAGNOSTIC/);

// Segurança da Tarefa 6 permanece intacta.
assert.match(backend,/vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false/);
assert.match(access,/Modo diagnóstico administrativo não pode criar vínculo ou PIN de Morador/);
assert.match(access,/Modo diagnóstico administrativo não assume sessão de Morador/);

const diagStart=access.indexOf('function diagnoseResidentAdmin(');
const diagEnd=access.indexOf('function startCpf(',diagStart);
const diagBlock=access.slice(diagStart,diagEnd);
assert.doesNotMatch(diagBlock,/saveProfile\(|saveSession\(|openResidentPortal\(|localStorage\.setItem|ConectaMoradorPinLocalV2/);

console.log('TAREFA_7_MORADOR_CORE_DIAGNOSTICO_OK: Morador real e diagnóstico administrativo compartilham o mesmo núcleo/formulário; o modo diagnóstico não assume identidade, sessão, aparelho ou notificações.');
