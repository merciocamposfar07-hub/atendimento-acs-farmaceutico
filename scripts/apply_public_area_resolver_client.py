#!/usr/bin/env python3
from pathlib import Path

CLIENT = r'''(function(){
  'use strict';
  if(window.PortalTacsAreaResolver)return;

  var API=String(window.TACS_ADMIN_API_URL||'').trim();
  var AREA_CACHE_KEY='portalTacsAreasPublicasV1';
  var DEVICE_KEY='portalTacsMoradorDispositivoV1';
  var AREA_CACHE_MS=30*60*1000;
  var REQUEST_TIMEOUT_MS=30000;
  var areas=[];
  var areaCacheAt=0;
  var busy=false;

  function text(value){return String(value==null?'':value).trim();}
  function digits(value){return String(value==null?'':value).replace(/\D/g,'');}
  function normalizeArea(value){
    if(window.PortalTacsArea&&typeof window.PortalTacsArea.normalize==='function')return window.PortalTacsArea.normalize(value);
    var area=text(value).toUpperCase();
    if(area.normalize)area=area.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    area=area.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
    return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area)?area:'';
  }
  function currentArea(){
    return normalizeArea(window.PortalTacsArea&&window.PortalTacsArea.id?window.PortalTacsArea.id():window.TACS_AREA_ID)||'JAPARANDUBA';
  }
  function defaultArea(){return normalizeArea(window.TACS_DEFAULT_AREA_ID)||'JAPARANDUBA';}
  function deviceId(){
    var id='';
    try{id=text(localStorage.getItem(DEVICE_KEY));}catch(error){}
    if(!id){
      id='morador-'+Date.now()+'-'+Math.random().toString(36).slice(2,11);
      try{localStorage.setItem(DEVICE_KEY,id);}catch(error){}
    }
    return id;
  }
  function requestId(){return 'public_area_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);}
  function safeAreas(list){
    var seen={};
    return (Array.isArray(list)?list:[]).map(function(item){
      var id=normalizeArea(item&&item.areaId);
      var name=text(item&&item.areaNome)||id;
      return id?{areaId:id,areaNome:name}:null;
    }).filter(function(item){
      if(!item||seen[item.areaId])return false;
      seen[item.areaId]=true;return true;
    });
  }

  function readAreaCache(){
    try{
      var cached=JSON.parse(localStorage.getItem(AREA_CACHE_KEY)||'null');
      if(cached&&Date.now()-Number(cached.at||0)<=AREA_CACHE_MS){
        var list=safeAreas(cached.areas);
        if(list.length){areas=list;areaCacheAt=Number(cached.at||0);return list;}
      }
    }catch(error){}
    return [];
  }
  function saveAreaCache(list){
    areas=safeAreas(list);areaCacheAt=Date.now();
    try{localStorage.setItem(AREA_CACHE_KEY,JSON.stringify({at:areaCacheAt,areas:areas}));}catch(error){}
    return areas;
  }

  function jsonp(action,params){
    return new Promise(function(resolve,reject){
      if(!API){reject(new Error('Serviço de áreas não configurado.'));return;}
      var callback='__portalTacsArea_'+Date.now()+'_'+Math.floor(Math.random()*100000);
      var script=document.createElement('script');
      var done=false;
      var timer=setTimeout(function(){finish(new Error('O servidor demorou para responder.'));},20000);
      function cleanup(){clearTimeout(timer);try{delete window[callback];}catch(error){window[callback]=undefined;}if(script.parentNode)script.parentNode.removeChild(script);}
      function finish(error,data){if(done)return;done=true;cleanup();if(error)reject(error);else resolve(data);}
      window[callback]=function(data){finish(null,data);};
      script.onerror=function(){finish(new Error('Falha ao consultar o servidor.'));};
      var query=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(callback),'_='+Date.now()];
      Object.keys(params||{}).forEach(function(key){query.push(encodeURIComponent(key)+'='+encodeURIComponent(params[key]));});
      script.src=API+(API.indexOf('?')<0?'?':'&')+query.join('&');
      document.head.appendChild(script);
    });
  }

  function fetchAreas(force){
    if(!force){
      if(areas.length&&Date.now()-areaCacheAt<=AREA_CACHE_MS)return Promise.resolve(areas.slice());
      var cached=readAreaCache();if(cached.length)return Promise.resolve(cached.slice());
    }
    return jsonp('publico_areas_ativas',{}).then(function(result){
      if(!result||result.ok!==true)throw new Error('Não foi possível carregar as áreas.');
      return saveAreaCache(result.areas).slice();
    });
  }

  function identify(documento){
    return new Promise(function(resolve,reject){
      if(busy){reject(new Error('Aguarde a consulta atual terminar.'));return;}
      var doc=digits(documento);
      if(doc.length!==11&&doc.length!==15){reject(new Error('Digite os 11 números do CPF ou os 15 números do CNS.'));return;}
      if(!API){reject(new Error('Serviço de áreas não configurado.'));return;}
      busy=true;
      var rid=requestId();
      var frame=document.createElement('iframe');
      var form=document.createElement('form');
      var frameName='portalAreaFrame'+Date.now()+Math.floor(Math.random()*1000);
      var submitted=false,finished=false,pollTimer=null,timeout=null;
      frame.name=frameName;frame.setAttribute('name',frameName);frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01;pointer-events:none';
      frame.src='about:blank';
      form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.style.display='none';
      var fields={action:'publico_identificar_area',requestId:rid,documento:doc,dispositivo:deviceId()};
      Object.keys(fields).forEach(function(key){var input=document.createElement('input');input.type='hidden';input.name=key;input.value=fields[key];form.appendChild(input);});

      function cleanup(){
        clearTimeout(pollTimer);clearTimeout(timeout);window.removeEventListener('message',onMessage);
        if(form.parentNode)form.remove();
        setTimeout(function(){if(frame.parentNode)frame.remove();},100);
      }
      function finish(error,result){if(finished)return;finished=true;busy=false;cleanup();if(error)reject(error);else resolve(result);}
      function unwrap(data){
        if(!data||typeof data!=='object')return null;
        var responseId=text(data.requestId||(data.result&&data.result.requestId));
        if(responseId&&responseId!==rid)return null;
        return Object.prototype.hasOwnProperty.call(data,'result')?data.result:null;
      }
      function onMessage(event){
        if(event.source!==frame.contentWindow)return;
        var data=event.data;if(typeof data==='string'){try{data=JSON.parse(data);}catch(error){return;}}
        var result=unwrap(data);if(result)finish(null,result);
      }
      function poll(){
        if(finished)return;
        jsonp('publico_area_result',{requestId:rid}).then(function(response){
          if(finished)return;
          if(response&&response.ok===true&&response.pendente===false&&response.result){finish(null,response.result);return;}
          pollTimer=setTimeout(poll,1200);
        }).catch(function(){if(!finished)pollTimer=setTimeout(poll,1600);});
      }
      function submitOnce(){
        if(submitted||finished)return;submitted=true;
        try{form.submit();}catch(error){finish(new Error('Não foi possível iniciar a consulta.'));return;}
        pollTimer=setTimeout(poll,900);
      }

      window.addEventListener('message',onMessage);
      document.body.appendChild(frame);document.body.appendChild(form);
      frame.addEventListener('load',submitOnce,{once:true});
      setTimeout(submitOnce,140);
      timeout=setTimeout(function(){finish(new Error('A confirmação da área demorou demais. Tente novamente.'));},REQUEST_TIMEOUT_MS);
    });
  }

  function areaName(id){
    var key=normalizeArea(id);for(var i=0;i<areas.length;i++)if(areas[i].areaId===key)return areas[i].areaNome;
    return key==='JAPARANDUBA'?'Sítio Japaranduba':key;
  }
  function setArea(id){
    var next=normalizeArea(id);if(!next)return false;
    if(window.PortalTacsArea&&typeof window.PortalTacsArea.set==='function')window.PortalTacsArea.set(next);else{window.TACS_AREA_ID=next;try{localStorage.setItem('portalTacsAreaIdV1',next);}catch(error){}}
    return true;
  }
  function navigateArea(id){
    var next=normalizeArea(id);if(!next)return;
    setArea(next);
    if(next===currentArea()){updateButton();return;}
    try{
      var url=new URL(window.location.href);
      url.searchParams.delete('areaId');url.searchParams.delete('area');url.searchParams.delete('territorio');
      if(next!==defaultArea())url.searchParams.set('area',next);
      window.location.replace(url.href);
    }catch(error){try{window.location.reload();}catch(ignore){}}
  }

  var button=null,modal=null,statusNode=null,input=null,areasBox=null;
  function updateButton(){if(button)button.textContent='📍 Minha área: '+areaName(currentArea());}
  function setStatus(message,type){
    if(!statusNode)return;statusNode.textContent=message||'';statusNode.className='portal-area-status'+(type?' '+type:'');
  }
  function hideModal(){if(modal){modal.hidden=true;document.body.classList.remove('portal-area-modal-open');}}
  function showAreas(message){
    setStatus(message||'Selecione onde você mora.','warn');areasBox.innerHTML='';areasBox.hidden=false;
    fetchAreas(false).then(function(list){
      if(!list.length)throw new Error('Nenhuma área disponível agora.');
      areasBox.innerHTML='';list.forEach(function(area){
        var option=document.createElement('button');option.type='button';option.className='portal-area-option';option.textContent=area.areaNome;option.dataset.areaId=area.areaId;
        option.addEventListener('click',function(){navigateArea(area.areaId);hideModal();});areasBox.appendChild(option);
      });
    }).catch(function(error){setStatus(error.message||'Não foi possível carregar as áreas.','err');});
  }
  function openModal(){
    if(!modal)return;modal.hidden=false;document.body.classList.add('portal-area-modal-open');areasBox.hidden=true;areasBox.innerHTML='';setStatus('Digite seu CPF ou CNS para localizar a área do seu cadastro.','');input.value='';setTimeout(function(){try{input.focus();}catch(error){}},0);
  }

  function installUi(){
    var content=document.querySelector('.content');if(!content||document.getElementById('portalAreaButton'))return;
    var style=document.createElement('style');style.id='portal-area-resolver-style';style.textContent=[
      '.portal-area-access{margin:0 0 15px}.portal-area-btn{width:100%;min-height:52px;border:2px solid #6f9bab;border-radius:15px;padding:11px 15px;background:#edf6f9;color:#073a55;font-weight:900;text-align:left}',
      '.portal-area-btn:focus-visible,.portal-area-option:focus-visible,.portal-area-primary:focus-visible,.portal-area-secondary:focus-visible{outline:3px solid rgba(11,88,120,.22);outline-offset:2px}',
      '.portal-area-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(2,25,40,.66)}.portal-area-overlay[hidden]{display:none!important}',
      '.portal-area-dialog{width:min(100%,560px);max-height:min(760px,calc(100vh - 36px));overflow:auto;border:2px solid #69c7e7;border-radius:23px;background:#fff;padding:21px;color:#102d40;box-shadow:0 24px 70px rgba(0,0,0,.34)}',
      '.portal-area-dialog h2{margin:0;color:#073a55;font-size:clamp(27px,6vw,36px)}.portal-area-dialog p{line-height:1.5}.portal-area-close{float:right;border:0;background:transparent;color:#073a55;font-size:30px;line-height:1;padding:0 0 8px 15px}',
      '.portal-area-field{width:100%;min-height:58px;border:2px solid #8ba8b6;border-radius:14px;padding:12px 14px;background:#fff;color:#102d40;font-size:19px}.portal-area-actions,.portal-area-options{display:grid;gap:10px;margin-top:13px}',
      '.portal-area-primary,.portal-area-secondary,.portal-area-option{min-height:54px;border-radius:14px;padding:12px 14px;font-weight:900}.portal-area-primary{border:0;background:#073a55;color:#fff}.portal-area-secondary{border:2px solid #7ca2b3;background:#edf6f9;color:#073a55}.portal-area-option{border:2px solid #0b5878;background:#fff;color:#073a55;text-align:left}',
      '.portal-area-status{margin-top:13px;padding:11px 12px;border:2px solid #9cb7c3;border-radius:13px;background:#edf6f9;font-weight:800}.portal-area-status.ok{border-color:#9ed6b2;background:#e8f7ee;color:#08723a}.portal-area-status.warn{border-color:#e1aa3f;background:#fff6dd;color:#704900}.portal-area-status.err{border-color:#d88a8a;background:#fff0f0;color:#a52d2d}',
      'body.portal-area-modal-open{overflow:hidden}@media(max-width:720px){.portal-area-access{margin-bottom:13px}.portal-area-dialog{padding:18px 15px}.portal-area-btn{font-size:16px}}'
    ].join('');document.head.appendChild(style);

    var wrap=document.createElement('div');wrap.className='portal-area-access';
    button=document.createElement('button');button.id='portalAreaButton';button.className='portal-area-btn';button.type='button';button.addEventListener('click',openModal);wrap.appendChild(button);
    var visual=document.querySelector('.portal-visual-pref');if(visual&&visual.parentNode===content)visual.insertAdjacentElement('afterend',wrap);else content.insertBefore(wrap,content.firstChild);

    modal=document.createElement('div');modal.className='portal-area-overlay';modal.hidden=true;modal.innerHTML='<section class="portal-area-dialog" role="dialog" aria-modal="true" aria-labelledby="portalAreaTitle"><button class="portal-area-close" type="button" aria-label="Fechar">×</button><h2 id="portalAreaTitle">Confirmar minha área</h2><p>Digite seu CPF ou CNS. O sistema usará o número para localizar em qual área seu cadastro está e o portal receberá de volta somente a identificação da área.</p><label for="portalAreaDocumento"><strong>CPF ou CNS</strong></label><input id="portalAreaDocumento" class="portal-area-field" inputmode="numeric" autocomplete="off" maxlength="18" placeholder="Digite somente números"><div class="portal-area-actions"><button id="portalAreaLocate" class="portal-area-primary" type="button">Localizar minha área</button><button id="portalAreaFallback" class="portal-area-secondary" type="button">Não tenho ou não encontrei meu documento</button></div><div id="portalAreaStatus" class="portal-area-status"></div><div id="portalAreaOptions" class="portal-area-options" hidden></div></section>';
    document.body.appendChild(modal);statusNode=modal.querySelector('#portalAreaStatus');input=modal.querySelector('#portalAreaDocumento');areasBox=modal.querySelector('#portalAreaOptions');
    modal.querySelector('.portal-area-close').addEventListener('click',hideModal);modal.addEventListener('click',function(event){if(event.target===modal)hideModal();});
    modal.querySelector('#portalAreaFallback').addEventListener('click',function(){showAreas('Se o documento ainda não estiver cadastrado, escolha sua localidade abaixo.');});
    modal.querySelector('#portalAreaLocate').addEventListener('click',function(){
      var doc=digits(input.value);if(doc.length!==11&&doc.length!==15){setStatus('Digite os 11 números do CPF ou os 15 números do CNS.','err');return;}
      areasBox.hidden=true;setStatus('Procurando sua área…','warn');
      identify(doc).then(function(result){
        if(!result||result.ok!==true){setStatus('Não foi possível conferir sua área agora. Tente novamente.','err');return;}
        if(result.encontrado===true&&normalizeArea(result.areaId)){
          var found=normalizeArea(result.areaId);setArea(found);updateButton();
          if(found===currentArea()){setStatus('Área confirmada: '+(text(result.areaNome)||areaName(found))+'.','ok');return;}
          setStatus('Área localizada: '+(text(result.areaNome)||areaName(found))+'. Abrindo o portal correto…','ok');navigateArea(found);return;
        }
        if(result.ambiguo===true){setStatus('Seu cadastro aparece em mais de uma área. Procure seu TACS para corrigir o cadastro.','err');return;}
        showAreas('Documento não localizado. Selecione sua localidade abaixo.');
      }).catch(function(error){setStatus(error.message||'Não foi possível conferir sua área.','err');});
    });
    input.addEventListener('input',function(){this.value=digits(this.value).slice(0,15);});input.addEventListener('keydown',function(event){if(event.key==='Enter'){event.preventDefault();modal.querySelector('#portalAreaLocate').click();}});
    updateButton();
  }

  function init(){
    installUi();
    var cached=readAreaCache();if(cached.length)updateButton();
    fetchAreas(false).then(function(){updateButton();}).catch(function(){});
  }
  window.PortalTacsAreaResolver=Object.freeze({open:openModal,areas:function(){return fetchAreas(false);},identify:identify,currentArea:currentArea});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
'''
Path('portal-area-resolver.js').write_text(CLIENT,encoding='utf-8')

index=Path('index.html')
s=index.read_text(encoding='utf-8')
old='''  <script src="agenda-config.js?v=20260812-multiarea-v1"></script>\n  <script src="portal-public-data.js?v=20260812-multiarea-v1"></script>'''
new='''  <script src="agenda-config.js?v=20260812-multiarea-v1"></script>\n  <script src="portal-area-resolver.js?v=20260812-area-identificacao-v1"></script>\n  <script src="portal-public-data.js?v=20260812-multiarea-v1"></script>'''
if old not in s: raise SystemExit('Ordem de scripts do portal não encontrada')
index.write_text(s.replace(old,new,1),encoding='utf-8')

TEST=r'''\'use strict\';
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
  console.log('Portal público: Minha área, identificação opcional, fallback e compatibilidade com Japaranduba validados.');
  dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
'''.replace("\\'use strict\\';","'use strict';")
Path('scripts/test_public_area_resolver.js').write_text(TEST,encoding='utf-8')

pkg=Path('package.json');p=pkg.read_text(encoding='utf-8')
needle='node scripts/test_public_area_identification.js && node scripts/test_territorio_dom.js'
replacement='node scripts/test_public_area_identification.js && node scripts/test_public_area_resolver.js && node scripts/test_territorio_dom.js'
if needle not in p:raise SystemExit('Ponto de inclusão do teste do resolver não encontrado')
pkg.write_text(p.replace(needle,replacement,1),encoding='utf-8')
print('Cliente de identificação de área preparado.')
