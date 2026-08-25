import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const ignoreDirs=new Set(['.git','node_modules']);
const errors=[];
const warnings=[];
const checked=[];

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())out.push(...walk(p));else out.push(p);
  }
  return out;
}
function rel(p){return path.relative(root,p).replaceAll('\\','/');}
function existsRepo(p){return fs.existsSync(path.join(root,p));}
function cleanRef(v){return String(v||'').split('#')[0].split('?')[0].trim();}
function localPath(fromFile,ref){
  let r=cleanRef(ref);
  if(!r||/^(?:https?:|data:|mailto:|tel:|javascript:|blob:|about:|#)/i.test(r))return null;
  try{r=decodeURIComponent(r)}catch{}
  if(r.startsWith('/atendimento-acs-farmaceutico/'))return r.slice('/atendimento-acs-farmaceutico/'.length);
  if(r.startsWith('/'))return null;
  return path.normalize(path.join(path.dirname(rel(fromFile)),r)).replaceAll('\\','/');
}

const files=walk(root);

// 1) Sintaxe JavaScript/MJS: impede publicação com erro de parse.
for(const f of files.filter(f=>/\.(?:js|mjs)$/i.test(f))){
  const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  checked.push('syntax:'+rel(f));
  if(r.status!==0)errors.push(`ERRO DE SINTAXE ${rel(f)}\n${r.stderr||r.stdout}`);
}

// 2) Referências locais em HTML: scripts, CSS, manifestos, imagens e iframes não podem apontar para arquivos inexistentes.
for(const f of files.filter(f=>/\.html?$/i.test(f))){
  const text=fs.readFileSync(f,'utf8');
  const refRe=/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while((m=refRe.exec(text))){
    const p=localPath(f,m[1]);
    if(!p)continue;
    if(!existsRepo(p))errors.push(`REFERÊNCIA LOCAL AUSENTE em ${rel(f)} -> ${m[1]} (${p})`);
  }
  // IDs duplicados quebram getElementById e listeners em iPhone/Safari.
  const ids=[...text.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1]);
  const dup=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  if(dup.length)errors.push(`IDs DUPLICADOS em ${rel(f)}: ${dup.join(', ')}`);
}

// 3) Manifestos: ícones/start_url locais devem existir quando forem arquivos do repositório.
for(const f of files.filter(f=>/\.(?:webmanifest|json)$/i.test(f))){
  let data;try{data=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){
    if(!rel(f).includes('/')) warnings.push(`JSON inválido ou não-JSON: ${rel(f)}: ${e.message}`);
    continue;
  }
  const refs=[];
  if(Array.isArray(data.icons))for(const i of data.icons)if(i&&i.src)refs.push(i.src);
  for(const r of refs){const p=localPath(f,r);if(p&&!existsRepo(p))errors.push(`ÍCONE DE MANIFESTO AUSENTE em ${rel(f)} -> ${r} (${p})`)}
}

// 4) Regressões funcionais específicas já observadas no painel de campanhas.
const mensal='recados-campanhas-whatsapp-mensal-v12.js';
if(existsRepo(mensal)){
  const t=fs.readFileSync(path.join(root,mensal),'utf8');
  if(/card\.hidden\s*=/.test(t))errors.push(`${mensal} voltou a controlar card.hidden; isso conflita com o filtro ano/mês.`);
}
const periodo='campanhas-periodo-v2.js';
if(existsRepo(periodo)){
  const t=fs.readFileSync(path.join(root,periodo),'utf8');
  for(const needle of ['function metaForCard','card.hidden=!show','metadata[id]||{}','period[0]','period[1]']){
    if(!t.includes(needle))errors.push(`${periodo} perdeu proteção/filtro obrigatório: ${needle}`);
  }
}
const painel='painel-oficial-recados-campanhas.html';
if(existsRepo(painel)){
  const t=fs.readFileSync(path.join(root,painel),'utf8');
  for(const needle of ['campanhas-periodo-v2.js','recados-campanhas-whatsapp-card-v9.js','recados-campanhas-whatsapp-mensal-v12.js']){
    if(!t.includes(needle))errors.push(`${painel} não carrega módulo obrigatório: ${needle}`);
  }
}

// 5) Procura marcadores típicos de conflito/merge que invalidam páginas.
for(const f of files.filter(f=>/\.(?:html?|js|mjs|css|gs|json|webmanifest|yml|yaml)$/i.test(f))){
  const t=fs.readFileSync(f,'utf8');
  if(/^<{7}|^={7}|^>{7}/m.test(t))errors.push(`MARCADOR DE MERGE NÃO RESOLVIDO em ${rel(f)}`);
}

console.log(`Arquivos verificados: ${files.length}`);
console.log(`Checagens de sintaxe JS/MJS: ${checked.length}`);
if(warnings.length){console.log('\nAVISOS');for(const w of warnings)console.log('- '+w)}
if(errors.length){
  console.error(`\nFALHAS (${errors.length})`);
  for(const e of errors)console.error('\n- '+e);
  process.exit(1);
}
console.log('\nAUDITORIA INTEGRAL: APROVADA');
