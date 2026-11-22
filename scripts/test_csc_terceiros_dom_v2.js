'use strict';
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html='<!doctype html><html><head></head><body><div class="form-panel"><input id="cpf" value="111.444.777-35"><input id="name" value="Solange Oliveira"><input id="birth" value="28/12/1984"><input id="locality" value="Japaranduba"><select id="category"><option value="">Escolha</option><option value="Solicitar consulta Médica">Solicitar consulta Médica</option></select><textarea id="subject"></textarea><button id="sendPetroleumCard">Enviar solicitação</button><button id="send">Enviar pelo WhatsApp</button></div></body></html>';
const dom=new JSDOM(html,{url:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/?area=JAPARANDUBA',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.CSC_TERCEIROS_ENABLED=true;
w.localStorage.setItem('portalTacsDispositivoV1','device-1');
w.sessionStorage.setItem('portalConectaMoradorTokenV1','cms1.simulado');
w.Element.prototype.scrollIntoView=function(){};
let thirdPartyReads=0,shares=[],sentActions=[],sentCodes=[];
const people={
 ana:{ok:true,encontrado:true,selecaoToken:'select-ana',beneficiario:{nome:'Ana Silva',nascimento:'29/03/1960',localidade:'Japaranduba',documento:'52998224725',familiaId:'002'},familia:[
  {membroToken:'member-ana',nome:'Ana Silva',nascimento:'29/03/1960',temDocumento:true},
  {membroToken:'member-pedro',nome:'Pedro Silva',nascimento:'20/03/1964',temDocumento:true}]},
 pedro:{ok:true,encontrado:true,selecaoToken:'select-pedro',beneficiario:{nome:'Pedro Silva',nascimento:'20/03/1964',localidade:'Japaranduba',documento:'123456789012345',familiaId:'002'},familia:[
  {membroToken:'member-ana',nome:'Ana Silva',nascimento:'29/03/1960',temDocumento:true},
  {membroToken:'member-pedro',nome:'Pedro Silva',nascimento:'20/03/1964',temDocumento:true}]}
};
const responses=new Map();
w.fetch=async (url,opts)=>{
 const p=new URLSearchParams(opts.body),act=p.get('action');sentActions.push(act);
 let result;
 if(act==='csc_terceiros_buscar')result=people.ana;
 else if(act==='csc_terceiros_membro')result=people.pedro;
 else if(act==='csc_terceiros_enviar'){
  sentCodes.push(p.get('codigoSolicitacao'));
  assert.equal(p.get('categoria'),'Solicitar consulta Médica');
  assert(['123456789012345','52998224725'].includes(p.get('documento')));
  result={ok:true,codigoSolicitacao:p.get('codigoSolicitacao'),solicitante:{nome:'Solange Oliveira',cpfFinal:'7735'},beneficiario:{nome:'Pedro Silva',documento:'123456789012345'}};
 }else throw Error('Unexpected action '+act);
 responses.set(p.get('requestId'),result);
 return {ok:true};
};
const origAppend=w.document.head.appendChild.bind(w.document.head);
w.document.head.appendChild=function(el){
 if(el.tagName==='SCRIPT'&&el.src.includes('csc_terceiros_result')){
  const p=new URL(el.src).searchParams,r=responses.get(p.get('requestId'));
  setTimeout(()=>{if(r&&typeof w[p.get('callback')]==='function')w[p.get('callback')]({ok:true,pendente:false,result:r});},1);
  return el;
 }
 return origAppend(el);
};
w.PortalCscSolicitacaoCardOficialV1={share:async data=>{shares.push(data);return {ok:true};}};
w.PortalTacsAgendaMedicaV1={hasValidSelection:()=>true};
w.PortalTacsTerritoryIdentity={areaNome:'Sítio Japaranduba',tacsNome:'TACS Responsável',unidadeNome:'Unidade Posto Matias'};
w.document.getElementById('cpf').addEventListener('input',()=>thirdPartyReads++);
w.eval(fs.readFileSync(path.join(root,'csc-solicitacao-terceiros-v1.js'),'utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const $=id=>w.document.getElementById(id),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,limit=5000){let start=Date.now();while(!fn()){if(Date.now()-start>limit)throw Error('Timeout');await wait(25);}}
(async()=>{
 await until(()=>$('cscTerceiros')!==null);
 assert.equal($('cscTerceiros').hidden,false);
 assert.equal($('cscTerceirosShare'),null,'Não criar segundo botão para envio');
 $('cscTerceirosToggle').click();
 $('cscTerceirosConsent').checked=true;
 $('cscTerceirosDoc').value='52998224725';
 $('cscTerceirosLookup').click();
 await until(()=>$('cscTerceirosFamily').hidden===false);
 assert.equal($('cscTerceirosFamily').querySelectorAll('button').length,2);
 $('cscTerceirosFamily').querySelectorAll('button')[1].click();
 await until(()=>$('cscTerceirosLegacyHelp').hidden===false);
 assert.equal($('cpf').value,'123456789012345');
 assert.equal($('name').value,'Pedro Silva');
 assert.equal(thirdPartyReads,0,'Autofill original não deve ser invocado nem armazenar documento de terceiro');
 $('category').value='Solicitar consulta Médica';
 $('subject').value='Solicitar consulta Médica - Sexta-feira - 04/12/2026 às 14:00';
 $('sendPetroleumCard').click();
 await until(()=>shares.length===1);
 assert(sentActions.includes('csc_terceiros_enviar'));
 await until(()=>$('sendPetroleumCard').disabled===false);
 assert.equal($('cscTerceirosShare'),null,'Compartilhamento deve ocorrer no mesmo toque');
 assert.equal(shares[0].name,'Pedro Silva');
 assert.equal(shares[0].category,'Solicitar consulta Médica');
 assert.equal(shares[0].document,'123456789012345');
 assert.equal(shares[0].code,sentCodes[0]);
 $('cscTerceirosFinish').click();
 assert.equal($('cpf').value,'111.444.777-35');
 assert.equal($('name').value,'Solange Oliveira');
 // Outro beneficiário na mesma sessão deve produzir identificador novo.
 $('cscTerceirosToggle').click();
 $('cscTerceirosConsent').checked=true;
 $('cscTerceirosDoc').value='52998224725';
 $('cscTerceirosLookup').click();
 await until(()=>$('cscTerceirosFamily').hidden===false);
 $('cscTerceirosFamily').querySelectorAll('button')[0].click();
 await until(()=>$('cscTerceirosLegacyHelp').hidden===false);
 $('category').value='Solicitar consulta Médica';
 $('subject').value='Consulta médica de Ana';
 $('sendPetroleumCard').click();
 await until(()=>sentCodes.length===2);
 await until(()=>shares.length===2);
 await until(()=>$('sendPetroleumCard').disabled===false);
 assert.notEqual(sentCodes[0],sentCodes[1],'Dois beneficiários precisam de códigos diferentes');
 $('cscTerceirosFinish').click();
 assert.equal($('name').value,'Solange Oliveira');
 assert.equal(w.localStorage.getItem('portalTacsDispositivoV1'),'device-1');
 assert(!JSON.stringify(w.localStorage).includes('Pedro Silva'));
 assert(!JSON.stringify(w.localStorage).includes('123456789012345'));
 w.close();
 console.log('CSC DOM: um único botão, WhatsApp iniciado sem esperar UBS, família, original e privacidade: OK');
})().catch(e=>{console.error(e);process.exitCode=1;w.close();});
