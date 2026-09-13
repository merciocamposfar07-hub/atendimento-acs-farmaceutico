'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const core=read('conecta-module-core-v1.js');
const central=read('central-administrativa-tacs.js');
const agendas=read('painel-oficial-agendas-vagas.html');
const profissionais=read('teste-v1/painel-profissionais-servicos-v1.html');
const moradores=read('teste-v1/painel-moradores-transport-v2.js');
const recados=read('painel-oficial-recados-campanhas.html');
const suporte=read('painel-suporte-moradores-v2.html');
const territorio=read('teste-v1/painel-tacs-areas-v1.js');
const territorioHtml=read('teste-v1/painel-tacs-areas-v1.html');
const municipios=read('painel-oficial-organizacoes-municipios.html');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const moradorSession=read('conecta-morador-session-v1.js');
const tacsQuick=read('central-tacs-login-rapido-v1.js');
const centralHtml=read('central-administrativa-tacs.html');
const publicIndex=read('index.html');

new Function(core);

// Contrato central da Tarefa 14.
assert.match(core,/TAREFA_14_TIMEOUT_SESSAO_V1/);
assert.match(core,/SESSION_AUTH_REFUSAL_RE/);
assert.match(core,/function sessionFailureClassify\(result\)/);
assert.match(core,/function sessionFailureNormalize\(result\)/);
assert.match(core,/function sessionShouldInvalidate\(result\)/);
assert.match(core,/sessionPolicy:sessionPolicyApi/);
assert.match(core,/out\.temporario=true;out\.preservarSessao=true/);
assert.match(core,/out\.authRecusada=true;out\.preservarSessao=false/);
assert.match(core,/function finish\(result\)\{if\(done\)return;done=true;resolve\(sessionFailureNormalize\(result\)\)\}/);

// Central: falha temporária preserva contexto/sessão e somente recusa explícita limpa.
assert.match(central,/var authInvalida=Boolean\(r&&r\.authRecusada===true\)/);
assert.match(central,/if\(!authInvalida\)[\s\S]*Sessão preservada\. Sincronizando os dados em segundo plano/);
assert.match(central,/if\(acessoLocalAberto\)\{bloquearAcessoLocal/);
assert.match(central,/resetModuleShell\(\);token='';territoryToken='';mode='';sessionStorage\.removeItem\(TOKEN_KEY\)/);
assert.match(central,/CENTRAL_SESSION_AUTH_REFUSAL_RE/);
assert.match(central,/function normalizeSessionFailure\(result\)/);
assert.match(central,/if\(explicit\)\{out\.authRecusada=true;out\.preservarSessao=false\}[\s\S]*out\.temporario=true;out\.preservarSessao=true/);
assert.match(central,/var finalResult=normalizeSessionFailure\(/);

// Profissionais: timeout/genérica não esconde painel nem remove token.
assert.match(profissionais,/moduleSessionPolicy=moduleCore&&moduleCore\.sessionPolicy/);
assert.match(profissionais,/if\(!falha\.explicitAuthRefusal\)\{dadosConfirmados=false;bloquearEdicaoNaoConfirmada\(\)/);
assert.match(profissionais,/A sessão da Central foi preservada; tente novamente sem redigitar o PIN/);
const profFailure=profissionais.match(/function carregarDados\([\s\S]*?\}\)\}/);
assert.ok(profFailure,'Fluxo de carga de profissionais ausente.');
const profText=profFailure[0];
assert.ok(profText.indexOf("if(!falha.explicitAuthRefusal)") < profText.indexOf("sessionStorage.removeItem(TOKEN_KEY)"),'Profissionais limpa sessão antes de comprovar recusa explícita.');

// Território: clearSession apenas após recusa explícita.
assert.match(territorio,/moduleSessionPolicy=moduleCore&&moduleCore\.sessionPolicy/);
assert.match(territorio,/if\(!falha\.explicitAuthRefusal\)[\s\S]*A sessão territorial foi preservada/);
assert.match(territorio,/if\(!falha\.explicitAuthRefusal\)[\s\S]*return\}clearSession\(\)/);

// Módulos já seguros mantêm último estado em falha de leitura.
assert.match(agendas,/authInvalida=Boolean\(r&&r\.temporario!==true/);
assert.match(agendas,/Os últimos dados válidos permanecem disponíveis para consulta/);
assert.match(recados,/authInvalida=Boolean\(r&&r\.temporario!==true/);
assert.match(recados,/A sessão da Central foi preservada/);
assert.match(moradores,/if\(!r\|\|r\.ok!==true\)\{var ok=renderBase\(r,message,true\)/);
assert.match(suporte,/Últimos chamados confirmados permanecem visíveis/);
assert.match(municipios,/Última confirmação permanece disponível somente para consulta/);

// Cache-busting obrigatório para o core nos sete módulos. O versionador integral
// pode substituir o sufixo pelo hash do commit, então o gate valida a referência
// versionada ao core, não um texto fixo de versão.
for(const src of [agendas,profissionais,moradoresHtml,recados,suporte,territorioHtml,municipios]){
  assert.match(src,/conecta-module-core-v1\.js\?v=[A-Za-z0-9._-]+/);
}

// TACS rápido: rede/timeout genérico não pode bloquear o cofre local.
assert.match(tacsQuick,/TACS_SESSION_AUTH_REFUSAL_RE/);
assert.match(tacsQuick,/function normalizeSessionFailure\(result\)/);
assert.match(tacsQuick,/cb\(normalizeSessionFailure\(r\|\|\{ok:false,message:'Resposta vazia\.'\}\)\)/);
assert.match(tacsQuick,/if\(saved&&r&&r\.temporario===true\)\{setStatus\('Área aberta com os dados locais/);

// Morador: somente recusa explícita remove vault/token e redireciona.
assert.match(moradorSession,/MORADOR_SESSION_AUTH_REFUSAL_RE/);
assert.match(moradorSession,/function remoteError\(message,result\)/);
assert.match(moradorSession,/e\.refused=Boolean\(r\.temporario!==true&&MORADOR_SESSION_AUTH_REFUSAL_RE\.test\(e\.message\)\)/);
assert.match(moradorSession,/if\(err&&err\.refused\)\{removeResidentVault\(\);clearSession\(\);clearBackgroundRequest\(\)/);
assert.doesNotMatch(moradorSession,/if\(!local\)\{clearSession\(\);if\(queryFlag\(\)\)location\.replace/);
assert.match(moradorSession,/Sua sessão foi preservada\. O servidor ainda não confirmou os dados/);

// Cache-busting das correções de Central/TACS/Morador.
assert.match(centralHtml,/central-administrativa-tacs\.js\?v=[A-Za-z0-9._-]+/);
assert.match(centralHtml,/central-tacs-login-rapido-v1\.js\?v=[A-Za-z0-9._-]+/);
assert.match(publicIndex,/conecta-morador-session-v1\.js\?v=[A-Za-z0-9._-]+/);

// Tarefa 14 não altera backend Apps Script nem inicia a navegação/back da Tarefa 15.
const backendFiles=fs.readdirSync('apps-script').filter(x=>x.endsWith('.gs')).join('\n');
assert.ok(backendFiles.length>0);
assert.doesNotMatch(core,/TAREFA_15|history\.pushState|popstate.*task15/i);

console.log('TAREFA_14_TIMEOUT_SESSAO_OK: timeout e falha temporária preservam sessão e último estado; somente recusa explícita de autenticação pode invalidar o acesso.');
