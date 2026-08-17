'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const quickBackend=read('apps-script/ZZZZ_31_LoginRapidoTacsV1.gs');
const quickFrontend=read('central-tacs-login-rapido-v1.js');
const centralHtml=read('central-administrativa-tacs.html');
const centralJs=read('central-administrativa-tacs.js');
const build=read('scripts/build_apps_script_release.js');

assert.match(territory,/MAX_TACS:500/,'A base territorial deve comportar muito mais que os 50 TACS iniciais.');
assert.match(territory,/MAX_AREAS:500/,'A base territorial deve comportar muito mais que as 50 áreas iniciais.');
for(const permission of ['MORADORES_EDITAR','PUBLICACOES_GERENCIAR','AGENDAS_GERENCIAR','PROFISSIONAIS_GERENCIAR']){
  assert.match(territory,new RegExp(permission),`Permissão operacional ausente: ${permission}`);
}
assert.match(territory,/if\(!admin\)\{[\s\S]*tacs=tacs\.filter[\s\S]*areas=areas\.filter/,
  'O TACS deve receber somente o próprio cadastro e a própria área.');
assert.match(centralJs,/if\(mode===['"]tacs['"]\)selectedAreaId=normArea\(areas\[0\]\.areaId\)/,
  'A Central deve fixar a área da sessão individual do TACS.');

assert.match(quickBackend,/admin_territorio_login_pin/,'Backend deve oferecer entrada do TACS por PIN.');
assert.match(quickBackend,/tacsTerritorioV1LerTacs_\(\)\.filter/,
  'Sem CNS, o servidor deve localizar o único TACS ativo correspondente ao PIN.');
assert.match(quickBackend,/correspondentes\.length>1/,
  'PIN duplicado entre TACS deve bloquear o acesso em vez de escolher uma área por engano.');
assert.match(quickBackend,/item\.pinHash,tacsTerritorioV1HashPin_\(pin,item\.pinSalt\)/,
  'O PIN deve ser validado apenas contra o hash armazenado no servidor.');
assert.match(quickBackend,/!area\|\|!area\.ativa\|\|area\.tacsId!==tacs\.tacsId/,
  'O login por PIN não pode ignorar o vínculo territorial.');

assert.match(quickFrontend,/action='admin_territorio_login_pin'/);
assert.match(quickFrontend,/\{pin:pin,dispositivo:device\}/,
  'A Central deve conseguir entrar enviando somente PIN + aparelho.');
assert.doesNotMatch(centralHtml,/id="tacsCns"|for="tacsCns"/,
  'A Central não deve exibir campo de CNS para o TACS.');
assert.doesNotMatch(centralJs,/Informe o CNS profissional com 15 números|Validando CNS e PIN/,
  'O fluxo principal da Central não deve exigir CNS.');
const recados=read('painel-oficial-recados-campanhas.html');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const moradoresJs=read('teste-v1/painel-moradores-transport-v2.js');
assert.doesNotMatch(recados,/tacsCnsPublicacoes|CNS profissional com 15 números/,
  'Recados e campanhas não deve pedir CNS ao TACS.');
assert.doesNotMatch(moradoresHtml,/tacsCnsAccess/,
  'Moradores não deve exibir CNS no acesso individual do TACS.');
assert.match(moradoresJs,/admin_territorio_login_pin/,
  'Moradores deve autenticar o TACS pelo endpoint de PIN.');
assert.doesNotMatch(moradoresJs,/Digite os 15 números do CNS profissional/,
  'Moradores não deve validar CNS profissional no login.');
assert.match(build,/ZZZZ_31_LoginRapidoTacsV1\.gs/);
assert.match(build,/TACS_LOGIN_RAPIDO_V1/);

console.log('Gate multiagente: autonomia territorial + acesso operacional do TACS somente por PIN validados.');
