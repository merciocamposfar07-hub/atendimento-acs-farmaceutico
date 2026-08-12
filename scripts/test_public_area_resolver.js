'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','portal-area-resolver.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert.ok(index.indexOf('agenda-config.js')<index.indexOf('portal-area-resolver.js'));
assert.ok(index.indexOf('portal-area-resolver.js')<index.indexOf('portal-public-data.js'));

(async()=>{
  const dom=new JSDOM('<!doctype html><html><head></head><body><main><div class="content"><div class="portal-visual-pref"></div></div></main></body></html>',{url:'https://example.test/atendimento-acs-farmaceutico/',runScripts:'outside-only'});
  const {window}=dom;let current='JAPARANDUBA';const sets=[];const pending=new Map();
  window.TACS_ADMIN_API_URL='https://api.example.test/exec';window.TACS_DEFAULT_AREA_ID='JAPARANDUBA';
  window.PortalTacsArea={id:()=>current,defaultId:'JAPARANDUBA',normalize:v=>String(v||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'_'),set:v=>{current=v;sets.push(v);return v;}};
  const originalAppend=window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild=function(node){
    if(node.tagName==='SCRIPT'){
      const url=new URL(node.src);const cb=url.searchParams.get('callback');const action=url.searchParams.get('action');
      setTimeout(()=>{
        if(action==='publico_areas_ativas')window[cb]({ok:true,areas:[{areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba'},{areaId:'MUNTUNS',areaNome:'Sítio Muntuns'}]});
        else if(action==='publico_area_result')window[cb]({ok:true,pendente:false,result:pending.get(url.searchParams.get('requestId'))||null});
      },0);return node;
    }
    return originalAppend(node);
  };
  window.HTMLFormElement.prototype.submit=function(){
    const fields={};this.querySelectorAll('input').forEach(input=>{fields[input.name]=input.value;});
    pending.set(fields.requestId,fields.documento==='12345678901'?{ok:true,encontrado:true,ambiguo:false,areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba'}:{ok:true,encontrado:false,ambiguo:false});
  };
  window.eval(source);window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(r=>setTimeout(r,30));
  const button=window.document.getElementById('portalAreaButton');assert.ok(button);assert.match(button.textContent,/Sítio Japaranduba/);
  const modal=window.document.querySelector('.portal-area-overlay');assert.equal(modal.hidden,true,'Japaranduba não pode ganhar tela obrigatória ao abrir');
  button.click();assert.equal(modal.hidden,false);const input=window.document.getElementById('portalAreaDocumento');input.value='12345678901';window.document.getElementById('portalAreaLocate').click();
  await new Promise(r=>setTimeout(r,1150));
  assert.equal(sets.at(-1),'JAPARANDUBA');assert.match(window.document.getElementById('portalAreaStatus').textContent,/Área confirmada/);
  window.document.getElementById('portalAreaFallback').click();await new Promise(r=>setTimeout(r,30));
  assert.equal(window.document.querySelectorAll('.portal-area-option').length,2);assert.match(window.document.querySelector('.portal-area-option').textContent,/Japaranduba/);
  assert.ok(window.localStorage.getItem('portalTacsMoradorDispositivoV1'));
  window.PortalTacsAreaResolver.selectArea('MUNTUNS');
  assert.equal(sets.at(-1),'MUNTUNS','Trocar de área precisa atualizar a área antes da navegação');
  assert.equal(current,'MUNTUNS');
  console.log('Portal público: Minha área, identificação opcional, fallback, troca de território e compatibilidade com Japaranduba validados.');
  dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
