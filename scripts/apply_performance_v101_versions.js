const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function p(name){return path.join(ROOT,name)}
function read(name){return fs.readFileSync(p(name),'utf8')}
function write(name,s){fs.writeFileSync(p(name),s,'utf8')}
function replaceCount(name,from,to,expected){let s=read(name);let count=s.split(from).length-1;if(count!==expected)throw new Error(`${name}: esperado ${expected} ocorrência(s) de ${from}, encontrado ${count}`);s=s.split(from).join(to);write(name,s)}

replaceCount('admin-warmup.js','portal-auto-update.js?v=20260812-v100','portal-auto-update.js?v=20260812-v101',1);
replaceCount('index.html','portal-auto-update.js?v=20260812-v100','portal-auto-update.js?v=20260812-v101',1);
replaceCount('index.html','portal-odontologia-segunda-sexta.js?v=20260812-odontologia-imediata-v98','portal-odontologia-segunda-sexta.js?v=20260812-desempenho-v101',1);
replaceCount('painel-oficial-agendas-vagas.html','admin-warmup.js?v=20260812-auto-v100','admin-warmup.js?v=20260812-auto-v101',1);
replaceCount('painel-oficial-profissionais-servicos.html','admin-warmup.js?v=20260812-auto-v100','admin-warmup.js?v=20260812-auto-v101',2);
replaceCount('painel-oficial-recados-campanhas.html','admin-warmup.js?v=20260812-auto-v100','admin-warmup.js?v=20260812-auto-v101',2);

try{fs.unlinkSync(__filename)}catch(e){}
console.log('PERFORMANCE_V101_VERSION_BUMP_OK');
