'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'admin-client-v1.js'), 'utf8');

assert.equal((source.match(/form\.submit\(\)/g) || []).length, 1, 'O cliente deve enviar cada operação uma única vez.');
assert.match(source, /50000:30000/);
assert.match(source, /A operação não foi reenviada/);
assert.match(source, /if\(isAuthError\(result\)\)clearSession\(\)/);
assert.doesNotMatch(source, /temporario[^\n]*clearSession/);
assert.match(source, /event\.source!==frame\.contentWindow/);
assert.match(source, /data\.source&&data\.source!==['"]admin-painel-tacs-v1['"]/);
assert.match(source, /admin_result/);

const officialPages = [
  ['painel-oficial-profissionais-servicos.html', ['admin_salvar_profissional','admin_salvar_servico','admin_criar_profissional']],
  ['painel-oficial-agendas-vagas.html', ['admin_salvar_agenda']],
  ['painel-oficial-recados-campanhas.html', ['admin_salvar_recado','admin_remover_recado','admin_salvar_campanha','admin_remover_campanha']]
];
for (const [file, actions] of officialPages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert.doesNotMatch(html, /\/teste-v1\//, `${file} voltou a depender de teste-v1.`);
  assert.doesNotMatch(html, /document\.write|fetch\(origem/, `${file} voltou a usar wrapper dinâmico.`);
  assert.match(html, /admin-client-v1\.js\?v=20260808-stable-v1/);
  assert.match(html, /admin-warmup\.js\?v=20260808-stable-v1/);
  assert.match(html, /admin-official\.css\?v=[A-Za-z0-9._-]+/);
  assert.match(html, /rel="preconnect" href="https:\/\/script\.google\.com"/);
  for (const action of actions) assert.match(html, new RegExp(action));
  for (const [i, match] of Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)).entries()) {
    if (match[1].trim()) new vm.Script(match[1], {filename:`${file}#${i + 1}`});
  }
}

async function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function behavioralTest(){
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url:'https://portal.test/painel',
    runScripts:'dangerously',
    pretendToBeVisual:true
  });
  const {window}=dom;
  window.PortalTacsAdminWarmup={iniciar(){return Promise.resolve({ok:true})}};
  const submissions=[];
  let nextResult={ok:true,token:'token-1'};

  window.HTMLFormElement.prototype.submit=function(){
    const form=this;
    const fields=Object.fromEntries(Array.from(form.querySelectorAll('[name]')).map(input=>[input.name,input.value]));
    submissions.push(fields);
    const frame=Array.from(window.document.querySelectorAll('iframe')).find(item=>item.name===form.target);
    const result=nextResult;
    setTimeout(()=>{
      window.dispatchEvent(new window.MessageEvent('message',{
        source:frame.contentWindow,
        data:{source:'admin-painel-tacs-v1',requestId:fields.requestId,result}
      }));
    },5);
  };

  window.eval(source);
  const client=window.PortalTacsAdminClient;
  assert.equal(client.hasSession(),false);

  let result=await client.login('1234');
  assert.equal(result.ok,true);
  assert.equal(client.hasSession(),true);
  assert.equal(client.session().token,'token-1');
  assert.equal(submissions.length,1);
  assert.equal(submissions[0].action,'admin_login');

  nextResult={ok:false,temporario:true,message:'Falha temporária de rede.'};
  result=await client.data();
  assert.equal(result.ok,false);
  assert.equal(client.hasSession(),true,'Falha temporária apagou a sessão.');
  assert.equal(submissions.length,2);
  assert.equal(submissions[1].action,'admin_dados');

  nextResult={ok:true,profissionais:[],servicos:[],agendas:[],recados:[],campanhas:[]};
  result=await client.data();
  assert.equal(result.ok,true);
  assert.equal(client.hasSession(),true);

  window.localStorage.setItem('portalTacsPublicDataV3','cache');
  nextResult={ok:true,id:'x1'};
  result=await client.mutate('admin_salvar_recado',{id:'x1',titulo:'T',mensagem:'M'});
  assert.equal(result.ok,true);
  assert.equal(window.localStorage.getItem('portalTacsPublicDataV3'),null,'Mutação não invalidou o cache público.');

  nextResult={ok:false,message:'Sessão administrativa inválida ou expirada.'};
  result=await client.data();
  assert.equal(result.ok,false);
  assert.equal(client.hasSession(),false,'Sessão realmente inválida não foi apagada.');

  const actionCounts=submissions.reduce((map,item)=>{map[item.action]=(map[item.action]||0)+1;return map},{});
  assert.equal(actionCounts.admin_login,1);
  assert.equal(actionCounts.admin_salvar_recado,1);
  dom.window.close();
}

behavioralTest().then(()=>console.log('OK: cliente administrativo preserva sessão em falhas temporárias e os painéis oficiais são diretos.')).catch(error=>{console.error(error);process.exitCode=1});
