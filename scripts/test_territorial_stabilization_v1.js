'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const get=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

const central=get('central-administrativa-tacs.js');
assert.match(central,/painel-moradores-v2\.html\?area='\+area\+access/);
assert.match(central,/painel-oficial-recados-campanhas\.html\?area='\+area\+access/);
assert.match(central,/tacsOnly=mode===['"]tacs['"]\|\|TACS_ONLY/);

const moradoresPanel=get('teste-v1/painel-moradores-v2.html');
assert.match(moradoresPanel,/tacs-only-ui/);
assert.match(moradoresPanel,/sessionStorage\.removeItem\(['"]portalTacsAdminTokenV1['"]\)/);
assert.match(moradoresPanel,/Acesso individual do TACS/);

const recados=get('painel-oficial-recados-campanhas.html');
assert.match(recados,/loginAdminTab/);
assert.match(recados,/loginTacsTab/);
assert.match(recados,/portalTacsAdminTokenV1/);
assert.match(recados,/portalTacsTerritorioTokenV1/);
assert.match(recados,/accessMode=territorioToken\?'tacs':\(token\?'admin':''\)/,
  'Recados deve inferir sessão TACS pelo token territorial, sem confiar no navegador.');
assert.match(recados,/if\(accessMode==='tacs'&&territorioToken\)s\.territorioToken=territorioToken/,
  'Recados deve enviar o token territorial quando a sessão é TACS.');
assert.match(recados,/admin_territorio_login_tacs/,
  'Recados deve preservar o login individual do TACS.');

const autofill=get('moradores-autofill.js');
assert.match(autofill,/&areaId=' \+ encodeURIComponent\(portalAreaId\(\)\)/);
assert.match(autofill,/returnedArea !== expectedArea/);
assert.match(autofill,/TACS_ADMIN_API_URL/);

const index=get('index.html');
assert.match(index,/territory-pending/);
assert.match(index,/moradores-autofill\.js\?v=20260815-territorial-v2/);

const branding=get('portal-territory-branding.js');
assert.match(branding,/classList\.remove\(['"]territory-pending['"]\)/);

const backend=get('apps-script/ZZZZ_29_IsolamentoMoradorPublicoV1.gs');
assert.match(backend,/AREA_REQUIRED/);
assert.match(backend,/AREA_MISMATCH/);
assert.match(backend,/moradoresAdminV1BuscarPublico_=function/);

const build=get('scripts/build_apps_script_release.js');
assert.match(build,/ZZZZ_29_IsolamentoMoradorPublicoV1\.gs/);
assert.match(build,/TACS_MORADORES_PUBLICO_TERRITORIAL_V1/);

console.log('Estabilização territorial: acessos TACS, identidade e moradores isolados por área validados.');
