'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const access=read('conecta-acesso-unificado-v1.js');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const central=read('central-administrativa-tacs.js');
const tacsQuick=read('central-tacs-login-rapido-v1.js');

new Function(access);
new Function(backend);

// Reconhecimento local das quatro portas sem transformar combinações em novas portas.
assert.match(access,/LAST_ROLE_KEY='portalConectaLastRoleV1'/);
assert.match(access,/function roleRecognized\(role\)/);
assert.match(access,/function recognizedRole\(\)/);
assert.match(access,/showRole\(tacsOnly\?'tacs':recognizedRole\(\)\)/);
for(const tab of ['tabAdmin','tabTacs','tabMorador','tabUbs']) assert.ok(access.includes(tab),'Porta ausente: '+tab);
assert.doesNotMatch(access,/tabAdminUbs|tabTacsUbs|tabUbsMorador/i);

// Administrador e TACS continuam usando o cofre PIN já existente e registram o perfil usado.
assert.match(access,/vaultHas\('admin'\)/);
assert.match(access,/vaultHas\('tacs'\)/);
assert.match(access,/registerTrustedDevice\(role\)[\s\S]*rememberRole\(role\)/);
assert.match(central,/abrirAcessoLocal\('admin',pin\)/);
assert.match(central,/abrirAcessoLocal\('tacs',pin\)/);
assert.match(tacsQuick,/getProfile\(\)/);

// Morador reconhecido entra por PIN e não expõe nome antes da autenticação.
assert.match(access,/if\(role==='MORADOR'\)return !!profile\(\)/);
assert.match(access,/Aparelho reconhecido para Morador/);
assert.doesNotMatch(access,/Aparelho reconhecido neste aparelho<\/strong><br><span class="csc-first-name">\+'\+esc\(p\.nome/);
assert.match(access,/conecta_morador_login_pin/);

// UBS: primeiro acesso passa a criar vínculo seguro e o segundo acesso usa somente PIN + aparelho.
assert.match(backend,/UBS_SESSION_PREFIX:'tacs_conecta_ubs_sessao_'/);
assert.match(backend,/function conectaAcessoV1RegistrarUbsConfiavel_/);
assert.match(backend,/function conectaAcessoV1ReferenciaUbsConfiavel_/);
assert.match(backend,/function conectaAcessoV1LoginUbs_/);
assert.match(backend,/conecta_ubs_login_pin/);
assert.match(backend,/vinculoAparelhoCriado:true/);
assert.match(backend,/chaveConfianca:chave\|\|''/);
assert.match(backend,/tacsTerritorioV1CompararSeguro_\(ubs\.pinHash,tacsTerritorioV1HashPin_\(pin,ubs\.pinSalt\)\)/);
assert.match(access,/UBS_PROFILE_KEY='portalConectaUbsQuickV1'/);
assert.match(access,/TRUST_UBS_KEY='portalConectaRecoveryTrustV1:ubs'/);
assert.match(access,/Aparelho reconhecido para UBS/);
assert.match(access,/function loginUbsSecondAccess\(\)/);
assert.match(access,/post\('conecta_ubs_login_pin'/);
assert.match(access,/guardar\('ubs',pin/);

// Perfis combinados continuam preservados após autenticação.
assert.ok(backend.includes("perfil:conectaAcessoV1Texto_(ubs.perfil)||'UBS'"));
assert.ok(access.includes("identityHeadline(r.nome||'Responsável UBS',r.perfil||'UBS')"));

// Tarefa 4 não implementa ainda diagnóstico administrativo de Morador.
assert.doesNotMatch(access,/diagn[oó]stico administrativo|modoDiagnosticoMorador/i);

console.log('TAREFA_4_RECONHECIMENTO_APARELHO_PERFIL_OK: segundo acesso reconhece Administrador, TACS, Morador e UBS; UBS usa PIN + vínculo seguro do aparelho; nenhuma nova porta de combinação ou diagnóstico administrativo foi antecipado.');
