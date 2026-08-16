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

assert.match(quickBackend,/admin_territorio_login_pin/,'Backend deve oferecer entrada rápida por PIN.');
assert.match(quickBackend,/admin_territorio_login_tacs/,'Primeiro acesso com CNS + PIN deve continuar suportado.');
assert.match(quickBackend,/admin_territorio_criar_chave_rapida/,
  'A ativação da chave rápida deve funcionar mesmo se o login CNS+PIN for tratado por outro módulo.');
assert.match(quickBackend,/tacsTerritorioV1ValidarSessaoToken_\(p,false\)/,
  'A chave rápida pós-login deve exigir uma sessão territorial TACS válida.');
assert.match(quickBackend,/LOGIN_RAPIDO_V1/,'Chave rápida deve ser assinada com domínio próprio.');
assert.match(quickBackend,/tacsTerritorioV1Hash_\(dispositivo\)/,
  'A chave rápida precisa estar vinculada ao aparelho.');
assert.match(quickBackend,/tacs\.pinHash,tacsTerritorioV1HashPin_\(pin,tacs\.pinSalt\)/,
  'O PIN deve continuar sendo validado no servidor, mesmo no acesso rápido.');
assert.match(quickBackend,/!tacs\|\|!tacs\.ativo/,'TACS inativo não pode entrar com chave rápida.');
assert.match(quickBackend,/!area\|\|!area\.ativa\|\|area\.tacsId!==tacs\.tacsId/,
  'O acesso rápido não pode ignorar o vínculo territorial.');

assert.match(quickFrontend,/PROFILE_KEY='portalTacsAcessoRapidoV1'/);
assert.match(quickFrontend,/action='admin_territorio_login_pin'/);
assert.match(quickFrontend,/payload=\{quickKey:profile\.quickKey,pin:pin,dispositivo:device\}/,
  'Depois de identificado, o aparelho deve enviar apenas chave rápida + PIN + aparelho.');
assert.match(quickFrontend,/action='admin_territorio_login_tacs'/);
assert.match(quickFrontend,/payload=\{cns:cns,pin:pin,dispositivo:device\}/,
  'CNS deve ser usado somente quando o aparelho ainda não possui identificação rápida.');
assert.match(quickFrontend,/post\('admin_territorio_criar_chave_rapida',\{territorioToken:r\.token,dispositivo:device\}/,
  'Após o primeiro login, a Central deve ativar o acesso rápido se a resposta inicial ainda não trouxer a chave.');
assert.doesNotMatch(quickFrontend,/localStorage\.setItem\([^\n]*cns/i,
  'O CNS não deve ser persistido no armazenamento do navegador para o acesso rápido.');
assert.match(quickFrontend,/Usar outro TACS neste aparelho/,
  'Deve existir uma saída explícita para trocar a identidade lembrada no aparelho.');
assert.match(centralHtml,/central-tacs-login-rapido-v1\.js\?v=20260815-pin-rapido-v2/,
  'A Central precisa carregar a camada final de acesso rápido sem cache antigo.');
assert.match(build,/ZZZZ_31_LoginRapidoTacsV1\.gs/);
assert.match(build,/TACS_LOGIN_RAPIDO_V1/);

console.log('Gate multiagente: autonomia territorial + primeiro acesso CNS/PIN + acessos seguintes somente por PIN validados.');
