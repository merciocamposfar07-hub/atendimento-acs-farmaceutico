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
assert.match(access,/Cartão SUS \(CNS\)/);
assert.match(access,/cscResidentCpf/);
assert.match(access,/cscResidentCns/);
assert.match(access,/cscResidentNameDiagnostic/);
assert.match(access,/cscResidentBirthDiagnostic/);
assert.match(access,/cscResidentAreaRegistration/);
assert.match(access,/function formatCpfResident\(/);
assert.match(access,/function formatCnsResident\(/);
assert.match(access,/Número de cadastro na área/);
assert.match(access,/Ao localizar o morador, o Conecta identifica também os integrantes da mesma família pelo vínculo já existente no CSV/);
assert.match(access,/Cada campo funciona de forma independente/);
assert.match(access,/Você pode preencher um, vários ou todos os campos/);
assert.doesNotMatch(access,/Preencha apenas uma forma de busca por vez/);
assert.doesNotMatch(access,/Para buscar por nome, informe também a data de nascimento/);
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
assert.match(backend,/function conectaAcessoV1BuscarNomeNascimentoDiagnostico_/);
assert.match(backend,/function conectaAcessoV1BuscarCadastroAreaDiagnostico_/);
assert.match(backend,/function conectaAcessoV1FamiliaDiagnostico_/);
assert.match(backend,/function conectaAcessoV1FiltrosDiagnostico_/);
assert.match(backend,/function conectaAcessoV1BuscarDiagnostico_/);
assert.match(backend,/function conectaAcessoV1RespostaDiagnosticoLista_/);
assert.match(backend,/if\(filtros\.cpf&&/);
assert.match(backend,/if\(filtros\.cns&&/);
assert.match(backend,/if\(filtros\.nomeNormalizado\)/);
assert.match(backend,/if\(filtros\.nascimento&&/);
assert.match(backend,/if\(filtros\.cadastro\)/);
assert.doesNotMatch(backend,/Use apenas uma forma de busca por vez/);
assert.doesNotMatch(backend,/Para buscar por nome, informe também a data de nascimento/);
assert.match(backend,/familiaTotal:/);
assert.match(backend,/consultaFamilia:true/);
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

console.log('TAREFA_6_ADMIN_MORADOR_SEM_VINCULO_OK: cada campo do diagnóstico funciona sozinho ou combinado; resultados retornam as famílias vinculadas sem assumir sessão residencial.');
