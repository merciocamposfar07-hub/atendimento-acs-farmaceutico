const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const f=path.join(ROOT,'scripts/test_admin_transport.js');
let s=fs.readFileSync(f,'utf8');
const from=`  assert.doesNotMatch(official, /Promise\\.all\\(\\[painel,conexao/);\n  assert.match(official, /painel\\.then\\(function\\(html\\)/);\n  assert.match(official, /window\\.PortalTacsAdminPreload=/);`;
const to=`  assert.doesNotMatch(official, /Promise\\.all\\(\\[painel,conexao/);\n  if (config.official === 'painel-oficial-agendas-vagas.html') {\n    assert.doesNotMatch(official, /fetch\\([^)]*teste-v1\\/painel-agendas-v1\\.html/);\n    assert.match(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV101'/);\n  } else {\n    assert.match(official, /painel\\.then\\(function\\(html\\)/);\n    assert.match(official, /window\\.PortalTacsAdminPreload=/);\n  }`;
if((s.split(from).length-1)!==1)throw new Error('Bloco wrapper esperado não encontrado uma vez.');
s=s.replace(from,to);
fs.writeFileSync(f,s,'utf8');
try{fs.unlinkSync(__filename)}catch(e){}
try{fs.unlinkSync(path.join(ROOT,'.github/workflows/patch-test-admin-direct-v101.yml'))}catch(e){}
console.log('PATCH_TEST_ADMIN_DIRECT_V101_OK');
