'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const central=read('central-administrativa-tacs.js');
const html=read('central-administrativa-tacs.html');
const warm=read('admin-warmup.js');
const backend=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const resident=read('conecta-morador-session-v1.js');
const quick=read('central-tacs-login-rapido-v1.js');
const back=read('central-back-button-v1.js');
const flux=read('conecta-saude-homologacao/FLUXOGRAMA_ABERTURA_CANONICA.md');
const matriz=read('PORTAL_TACS_MATRIZ.md');
const registro=read('REGISTRO_CANONICO_PIN_LOCAL_V2_2026_09_11.md');
const plano=read('PLANO_CANONICO_MIGRACAO_PAINÉIS_APP_INSTITUCIONAL.md');

new Function(central);
new Function(warm);
new Function(resident);
new Function(quick);
new Function(back);

assert.match(central,/HEALTH_CACHE_PREFIX='portalTacsHealthSnapshotV2:'/);
assert.match(central,/function renderHealthSnapshot\(areaId\)/);
assert.match(central,/renderHealthSnapshot\(selectedAreaId\);[\s\S]{0,120}prefetchPublicHealth\(selectedAreaId\)/);
assert.match(central,/saveHealthValue\(areaId,'healthResidents','Base acessível','ok'\)/);
assert.doesNotMatch(central,/markHealth\('healthResidents',r&&r\.ok===true\?'Base acessível':'Falha na leitura'/);
assert.match(central,/Última leitura confirmada exibida • atualizando em segundo plano/);
assert.match(central,/function isolatedPost\(/);
assert.match(central,/PREPARACAO_CONTINUA_V1/);
assert.match(central,/scheduleEarlyPreparation/);
assert.match(central,/rememberAdminIdentity\(r\)/);
assert.match(central,/context&&context\.identidadeAutenticada/);

assert.match(warm,/preaquecer:preaquecerNaoBloqueante/);
assert.match(warm,/PREPARACAO_CONTINUA_V1/);
assert.match(warm,/mode:'no-cors'/);
assert.doesNotMatch(warm,/LOGIN_PIN_LOAD_R8: não abrir Apps Script durante o carregamento inicial/);

assert.match(html,/\.csc-welcome-copy small\{[^}]*color:#f7fcff!important[^}]*font-weight:950/i);
assert.match(html,/\.csc-profile-card strong\{[^}]*font-weight:950/i);
assert.match(resident,/\.csc-resident-bar strong\{[^}]*font-weight:950[^}]*color:#fff/i);
assert.match(resident,/\.csc-family-person\{[^}]*font-size:1\.02rem[^}]*font-weight:950/i);

assert.match(quick,/PIN_UNICO_CENTRAL_V1/);
assert.match(quick,/if\(!hasAnySession\(\)\)return;/);
assert.match(back,/function installSinglePinGate\(\)/);
assert.match(back,/Painéis internos jamais pedem outro PIN/);
assert.match(back,/location\.replace\(centralUrl\(\)\)/);
assert.match(back,/#tacsPinPublicacoes/);
assert.doesNotMatch(back,/#tacsPin\b/,'PIN funcional de cadastro do próprio TACS não pode ser ocultado pelo gate único');

assert.match(backend,/chavesFortes=\[/);
assert.match(backend,/var adminsDaArea=\(todos\|\|\[\]\)\.filter/);
assert.match(backend,/identidadeAutenticada:administradorAtual/);

for(const [name,doc] of Object.entries({flux,matriz,registro,plano})){
  assert(/Saúde Geral|saúde Geral|Saúde geral|saúde geral/.test(doc),name+' precisa registrar Saúde Geral cache-first');
  assert(/primeiro paint|tela de PIN|PIN/.test(doc),name+' precisa registrar preparação a partir do PIN');
}
assert.match(flux,/Desempenho contínuo obrigatório/);
assert.match(matriz,/preparação assíncrona não bloqueante/);
assert.match(registro,/Revisão de desempenho contínuo/);
assert.match(plano,/identidade, área e Saúde Geral incluídas/);
assert.match(flux,/PIN único por entrada/);
assert.match(matriz,/PIN é informado somente na porta de entrada/);
assert.match(registro,/PIN único na Central/);
assert.match(plano,/PIN é digitado uma única vez na entrada do perfil/);

console.log('DESEMPENHO_CONTINUO_V1_OK: identidade forte, PIN único na Central, Saúde Geral cache-first e preparação não bloqueante registrados.');
