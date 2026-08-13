const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const f=path.join(ROOT,'scripts/test_admin_transport.js');
let s=fs.readFileSync(f,'utf8');
const from="/admin-warmup\\.js\\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1)/";
const to="/admin-warmup\\.js\\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1|12-auto-v101)/";
if((s.split(from).length-1)!==1)throw new Error('Regex de warmup do teste não encontrada exatamente uma vez.');
s=s.replace(from,to);
fs.writeFileSync(f,s,'utf8');
try{fs.unlinkSync(__filename)}catch(e){}
try{fs.unlinkSync(path.join(ROOT,'.github/workflows/patch-test-admin-v101.yml'))}catch(e){}
console.log('PATCH_TEST_ADMIN_V101_OK');
