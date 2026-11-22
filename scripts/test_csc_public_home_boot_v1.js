'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),boot=read('portal-public-prefetch-v1.js'),
  dataModule=read('portal-public-data.js'),panels=read('portal-controle-integral.js'),
  login=read('conecta-acesso-unificado-v1.js'),terceiros=read('csc-solicitacao-terceiros-v1.js');
const vm=require('node:vm');
for(const [p,v] of [['portal-public-prefetch-v1.js',boot],['portal-public-data.js',dataModule],['portal-controle-integral.js',panels],['csc-solicitacao-terceiros-v1.js',terceiros]])new vm.Script(v,{filename:p});
assert(html.indexOf('portal-public-prefetch-v1.js')<html.indexOf('agenda-config.js'),'Buscar recados desde a abertura');
assert(html.indexOf('portal-controle-integral.js')<html.indexOf('agenda-enfermeira.js'),'Mostrar recados antes das outras integrações');
assert.equal((html.match(/src="portal-controle-integral.js/g)||[]).length,1,'Não repetir integração');
assert.match(html,/cscSkipOpeningAfterPinV1/);
assert.match(login,/sessionStorage\.setItem\('cscSkipOpeningAfterPinV1','1'\)/);
assert.match(read('conecta-morador-pin-local-v2.js'),/sessionStorage\.setItem\('cscSkipOpeningAfterPinV1','1'\)/,'PIN local também ignora splash após autenticação');
assert.match(html,/p\.get\('conecta'\)==='1'/,'Retorno autenticado evita splash mesmo com PIN em segundo plano');
assert.doesNotMatch(terceiros,/setInterval\(/,'Exibição depois do PIN sem espera artificial');
assert.match(dataModule,/recifeDay\(salvoEm\)!==recifeDay\(Date\.now\(\)\)/,'Cache público não pode atravessar o dia');
const sample={ok:true,areaId:'JAPARANDUBA',hoje:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
 recados:[{id:'REC-TESTE',title:'Recado da unidade',message:'Mensagem de teste',active:true}],
 campanhas:[{id:'CAMP-TESTE',title:'Campanha do mês',message:'Campanha de teste',active:true}]};
async function check(area,answer,valid){
 const dom=new JSDOM('<!doctype html><html><head></head><body><main class="shell"><div class="content"><div class="purpose"></div><select id="category"></select></div></main></body></html>',
 {url:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/?area='+area,runScripts:'outside-only'});
 const w=dom.window,append=w.document.head.appendChild.bind(w.document.head);
 let calls=0;
 w.document.head.appendChild=function(element){
  if(element.tagName==='SCRIPT'&&element.src.includes('painel_publico')){
   calls++;
   const cb=new URL(element.src).searchParams.get('callback');
   w.setTimeout(()=>{if(typeof w[cb]==='function')w[cb](answer)},0);
   return element;
  }
  return append(element);
 };
 w.eval(boot);
 assert.equal(w.CscPublicBootV1.areaId,area);
 if(valid){
  const d=await w.CscPublicBootV1.promise;
  assert.equal(d.areaId,area);
  const saved=JSON.parse(w.localStorage.getItem('portalTacsPublicDataV4:'+area));
  assert.equal(saved.data.recados[0].id,'REC-TESTE');
  w.eval(dataModule);
  assert.equal(w.PortalTacsPublicData.cached().areaId,area);
  w.eval(panels);
  assert(w.document.querySelector('.integral-balloon'),'Recado visível antes de DOMContentLoaded');
  assert(w.document.querySelector('.campaign-card'),'Campanha visível antes de DOMContentLoaded');
  assert.equal(calls,1,'Reutilizar prefetch na mesma abertura, sem requisição duplicada');
 }else{
  await assert.rejects(w.CscPublicBootV1.promise,/outra área/);
  assert.equal(w.localStorage.getItem('portalTacsPublicDataV4:'+area),null,'Não persistir conteúdo de outra área');
 }
 w.close();
}
(async()=>{
 await check('JAPARANDUBA',sample,true);
 await check('MUNTUNS',sample,false);
 console.log('CSC inicial: pré-busca durante abertura, área correta, recado/campanha imediatos, cache mesmo dia, splash pós-PIN e sessão sem polling: OK');
})().catch(err=>{console.error(err);process.exitCode=1});
