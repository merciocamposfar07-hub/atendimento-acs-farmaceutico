(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var PROFILE_KEY='portalTacsAcessoRapidoV1';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var EXCLUSIVE_MODE_KEY='portalTacsModoExclusivoV2';
var loginBtn=document.getElementById('loginTacs');
var cnsInput=document.getElementById('tacsCns');
var pinInput=document.getElementById('tacsPin');
var tacsLogin=document.getElementById('tacsLogin');
var status=document.getElementById('loginStatus');
if(!loginBtn||!pinInput||!tacsLogin)return;

var busy=false;
function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){if(!status)return;status.textContent=msg;status.className='status'+(type?' '+type:'')}
function getDevice(){var d='';try{d=localStorage.getItem(DEVICE_KEY)||''}catch(e){}return d}
function queryTacsOnly(){try{return String(new URLSearchParams(location.search).get('acesso')||'').toLowerCase()==='tacs'}catch(e){return false}}
function hasTerritorySession(){try{return !!text(sessionStorage.getItem(TERRITORY_TOKEN_KEY))}catch(e){return false}}
function hasAdminSession(){try{return !!text(sessionStorage.getItem(ADMIN_TOKEN_KEY))}catch(e){return false}}
function hasAnySession(){return hasTerritorySession()||hasAdminSession()}
function rememberExclusiveMode(){
  try{
    if(queryTacsOnly()||hasTerritorySession())sessionStorage.setItem(EXCLUSIVE_MODE_KEY,'tacs');
    else sessionStorage.removeItem(EXCLUSIVE_MODE_KEY);
  }catch(e){}
}
function exclusiveMode(){
  rememberExclusiveMode();
  return queryTacsOnly()||hasTerritorySession();
}
function enforceExclusiveTacsUi(){
  if(!exclusiveMode())return;
  var tabAdmin=document.getElementById('tabAdmin');
  var tabTacs=document.getElementById('tabTacs');
  var adminLogin=document.getElementById('adminLogin');
  var loginPanel=document.getElementById('loginPanel');
  var tabs=tabTacs&&tabTacs.parentNode;
  if(tabAdmin){if(!tabAdmin.hidden)tabAdmin.hidden=true;if(tabAdmin.classList.contains('active'))tabAdmin.classList.remove('active');tabAdmin.setAttribute('aria-hidden','true')}
  if(adminLogin&&!adminLogin.hidden)adminLogin.hidden=true;
  if(tabTacs){if(tabTacs.hidden)tabTacs.hidden=false;if(!tabTacs.classList.contains('active'))tabTacs.classList.add('active');tabTacs.setAttribute('aria-selected','true')}
  if(tabs&&tabs.style&&tabs.style.gridTemplateColumns!=='1fr')tabs.style.gridTemplateColumns='1fr';
  if(loginPanel&&!loginPanel.hidden&&tacsLogin.hidden)tacsLogin.hidden=false;
}
rememberExclusiveMode();
enforceExclusiveTacsUi();
var exclusiveObserver=new MutationObserver(function(){enforceExclusiveTacsUi()});
if(document.body)exclusiveObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
window.addEventListener('pageshow',enforceExclusiveTacsUi);
window.addEventListener('focus',enforceExclusiveTacsUi);

function getProfile(){
  try{
    var raw=localStorage.getItem(PROFILE_KEY)||'';
    if(!raw)return null;
    var p=JSON.parse(raw);
    if(!p||!/^qt1\.[A-Z0-9_-]{1,64}\.[a-f0-9]{64}$/.test(String(p.quickKey||'')))return null;
    return p;
  }catch(e){return null}
}
function saveProfile(r){
  if(!r||!r.quickKey)return;
  var p={quickKey:String(r.quickKey),tacsId:text(r.tacsId),nome:text(r.nome),areaId:text(r.areaId),areaNome:text(r.areaNome)};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(e){}
}
function clearProfile(){try{localStorage.removeItem(PROFILE_KEY)}catch(e){}}

var cnsLabel=document.querySelector('label[for="tacsCns"]');
var remembered=document.createElement('div');
remembered.id='tacsQuickLoginBox';
remembered.className='status ok';
remembered.style.marginBottom='12px';
remembered.hidden=true;
var pinLabel=document.querySelector('label[for="tacsPin"]');
if(pinLabel&&pinLabel.parentNode===tacsLogin)tacsLogin.insertBefore(remembered,pinLabel);
else tacsLogin.insertBefore(remembered,tacsLogin.firstChild);

function renderLogin(){
  var p=getProfile();
  if(p){
    if(cnsLabel)cnsLabel.hidden=true;
    if(cnsInput)cnsInput.hidden=true;
    remembered.hidden=false;
    remembered.innerHTML='<strong>Acesso rápido neste aparelho</strong><br>'+
      (p.nome?'<span>'+escapeHtml(p.nome)+'</span><br>':'')+
      (p.areaNome||p.areaId?'<span>'+escapeHtml(p.areaNome||p.areaId)+'</span><br>':'')+
      '<button id="tacsQuickForget" type="button" style="margin-top:10px;border:0;border-radius:12px;padding:9px 12px;background:#607985;color:#fff;font-weight:850">Usar outro TACS neste aparelho</button>';
    var forget=document.getElementById('tacsQuickForget');
    if(forget)forget.addEventListener('click',function(){
      clearProfile();
      if(cnsInput)cnsInput.value='';
      renderLogin();
      setStatus('Digite somente o seu PIN individual.','');
    });
  }else{
    if(cnsLabel)cnsLabel.hidden=true;
    if(cnsInput)cnsInput.hidden=true;
    remembered.hidden=true;
    remembered.innerHTML='';
  }
  enforceExclusiveTacsUi();
}
function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}

function requestId(action){return 'quick_'+action+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(action,params,cb){
  var name='__quick_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false;
  var timer=setTimeout(function(){finish({ok:false,message:'Consulta indisponível no momento.'})},15000);
  function finish(r){if(done)return;done=true;clearTimeout(timer);try{delete window[name]}catch(e){window[name]=undefined}if(s.parentNode)s.remove();cb(r)}
  window[name]=finish;s.onerror=function(){finish({ok:false,message:'Falha de rede.'})};
  var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'_='+Date.now()];
  Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});
  s.src=API+'?'+q.join('&');document.head.appendChild(s);
}
function post(action,payload,cb){
  if(busy){cb({ok:false,message:'Aguarde a operação anterior.'});return}
  busy=true;
  var rid=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form');
  var frameName='quickFrame'+Date.now()+Math.floor(Math.random()*1000),finished=false,pollTimer=null;
  frame.name=frameName;frame.src='about:blank';frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.style.display='none';
  var fields={};Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});fields.action=action;fields.requestId=rid;
  Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
  function cleanup(){window.removeEventListener('message',onMessage);clearTimeout(timeout);clearTimeout(pollTimer);if(form.parentNode)form.remove();if(frame.parentNode)setTimeout(function(){if(frame.parentNode)frame.remove()},120)}
  function finish(r){if(finished)return;finished=true;busy=false;cleanup();cb(r||{ok:false,message:'Resposta vazia.'})}
  function onMessage(event){
    if(event.source!==frame.contentWindow)return;
    var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
    if(!d||typeof d!=='object')return;
    var responseId=text(d.requestId||(d.result&&d.result.requestId));if(responseId&&responseId!==rid)return;
    var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));
    if(r)finish(r);
  }
  function poll(){
    if(finished)return;
    jsonp('admin_territorio_result',{requestId:rid},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      pollTimer=setTimeout(poll,900);
    });
  }
  window.addEventListener('message',onMessage);
  var timeout=setTimeout(function(){finish({ok:false,message:'O servidor demorou para confirmar o acesso.'})},45000);
  document.body.appendChild(frame);document.body.appendChild(form);
  var sent=false;function send(){if(sent||finished)return;sent=true;try{form.submit()}catch(e){finish({ok:false,message:'Não foi possível iniciar a comunicação.'});return}pollTimer=setTimeout(poll,650)}
  frame.addEventListener('load',send,{once:true});setTimeout(send,120);
}

function abrirSessao(token){
  try{sessionStorage.removeItem(ADMIN_TOKEN_KEY);sessionStorage.setItem(TERRITORY_TOKEN_KEY,token);sessionStorage.setItem(EXCLUSIVE_MODE_KEY,'tacs')}catch(e){}
  enforceExclusiveTacsUi();
  setStatus('Acesso validado. Abrindo sua área…','ok');
  setTimeout(function(){location.reload()},80);
}
function concluirPrimeiroAcesso(r,device){
  if(r.quickKey){saveProfile(r);abrirSessao(r.token);return}
  setStatus('Acesso validado. Ativando entrada rápida por PIN neste aparelho…','warn');
  post('admin_territorio_criar_chave_rapida',{territorioToken:r.token,dispositivo:device},function(q){
    if(q&&q.ok===true&&q.quickKey)saveProfile(q);
    abrirSessao(r.token);
  });
}

loginBtn.addEventListener('click',function(event){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(busy){setStatus('Aguarde a validação em andamento.','warn');return}
  var pin=digits(pinInput.value),device=getDevice(),profile=getProfile();
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  if(!device){setStatus('Este aparelho ainda não foi identificado. Atualize a página e tente novamente.','err');return}
  var action='admin_territorio_login_pin';
  var payload=profile?{quickKey:profile.quickKey,pin:pin,dispositivo:device}:{pin:pin,dispositivo:device};
  setStatus('Validando seu PIN…','warn');
  post(action,payload,function(r){
    pinInput.value='';
    if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}
    if(profile){if(r.quickKey)saveProfile(r);abrirSessao(r.token);return}
    concluirPrimeiroAcesso(r,device);
  });
},true);

/* HOMOLOGACAO_ARQUITETURAL_V1 — navegação única, sessão reaproveitada e recuperação visual. */
function normalArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function currentAreaId(){
  var select=document.getElementById('adminArea');
  if(select&&normalArea(select.value))return normalArea(select.value);
  var p=getProfile();
  if(p&&normalArea(p.areaId))return normalArea(p.areaId);
  try{var q=new URLSearchParams(location.search);var a=normalArea(q.get('area')||q.get('areaId'));if(a)return a}catch(e){}
  return 'JAPARANDUBA';
}
function stableModuleUrl(name){
  var area=encodeURIComponent(currentAreaId());
  var tacsOnly=hasTerritorySession()||queryTacsOnly();
  var access=tacsOnly?'&acesso=tacs':'';
  var revision='20260822-promocao-institucional-v1';
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v='+revision;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v='+revision;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?v='+revision;
  if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area+'&from=central';
  return '';
}
function markPanelDirty(doc){
  if(!doc||!doc.documentElement||doc.documentElement.dataset.tacsDirtyTracking==='1')return;
  doc.documentElement.dataset.tacsDirtyTracking='1';
  setTimeout(function(){
    ['input','change'].forEach(function(type){doc.addEventListener(type,function(event){
      var target=event.target;
      if(!event.isTrusted||!target||target.disabled||target.readOnly)return;
      var tag=String(target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select')doc.documentElement.dataset.tacsDirty='1';
    },true)});
  },900);
}
function hideRedundantPanelLogin(doc){
  if(!hasAnySession()||!doc)return;
  var pin=doc.getElementById('pin');
  if(pin){pin.hidden=true;pin.setAttribute('aria-hidden','true')}
  var label=doc.getElementById('pinLabel')||doc.querySelector('label[for="pin"]');
  if(label)label.hidden=true;
  var help=doc.getElementById('pinHelp');if(help)help.hidden=true;
  Array.prototype.forEach.call(doc.querySelectorAll('button'),function(btn){
    var t=text(btn.textContent).toLowerCase();
    if(/^(entrar|validar|acessar)/.test(t)&&btn.id!=='sair'&&btn.id!=='logout')btn.hidden=true;
  });
  var title=doc.getElementById('accessTitle');
  if(title)title.textContent=hasTerritorySession()?'Sessão TACS validada':'Sessão administrativa validada';
  doc.documentElement.dataset.tacsSessionReused='1';
}
function removePanelRefresh(doc){
  if(!doc)return;
  var button=doc.getElementById('portalTacsAdminRefreshV1');
  if(button)button.remove();
}
function enhanceViewerDocument(){
  var frame=document.getElementById('viewerFrame');
  if(!frame)return;
  try{
    var doc=frame.contentDocument;
    if(!doc||!doc.body)return;
    hideRedundantPanelLogin(doc);
    markPanelDirty(doc);
    removePanelRefresh(doc);
  }catch(e){}
}
function installCentralPageRefresh(){
  if(document.getElementById('portalTacsCentralRefreshV1'))return;
  var style=document.createElement('style');
  style.textContent='#portalTacsCentralRefreshV1{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:20000;min-height:46px;border:2px solid rgba(255,255,255,.92);border-radius:999px;padding:10px 15px;background:#073a55;color:#fff;font:900 15px/1.15 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer}@media(max-width:430px){#portalTacsCentralRefreshV1{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));min-height:44px;padding:9px 13px;font-size:14px}}';
  document.head.appendChild(style);
  var button=document.createElement('button');button.id='portalTacsCentralRefreshV1';button.type='button';button.textContent='↻ Atualizar página';
  button.addEventListener('click',function(){button.disabled=true;button.textContent='↻ Atualizando…';location.reload()});
  document.body.appendChild(button);
}
function installInstitutionalNavigation(){
  var grid=document.getElementById('moduleGrid');
  if(grid&&grid.dataset.tacsInstitutionalNav!=='1'){
    grid.dataset.tacsInstitutionalNav='1';
    grid.addEventListener('click',function(event){
      var btn=event.target&&event.target.closest?event.target.closest('.module'):null;
      if(!btn||btn.disabled||btn.hidden)return;
      var name=btn.dataset.module||'';
      var url=stableModuleUrl(name);if(!url)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      if(name==='portal'){
        try{sessionStorage.setItem('portalTacsRetornoCentralV1','1')}catch(e){}
        location.href=url;return;
      }
      var viewer=document.getElementById('viewer'),frame=document.getElementById('viewerFrame'),title=document.getElementById('viewerTitle');
      if(!viewer||!frame)return;
      if(title){var strong=btn.querySelector('strong');title.textContent=strong?strong.textContent:'Painel'}
      frame.src=url;viewer.hidden=false;document.body.classList.add('viewer-open');
    },true);
  }
  var frame=document.getElementById('viewerFrame');
  if(frame&&frame.dataset.tacsInstitutionalEnhance!=='1'){
    frame.dataset.tacsInstitutionalEnhance='1';
    frame.addEventListener('load',function(){setTimeout(enhanceViewerDocument,0);setTimeout(enhanceViewerDocument,700)});
  }
  var back=document.getElementById('viewerBack');
  if(back&&back.dataset.tacsDirtyGuard!=='1'){
    back.dataset.tacsDirtyGuard='1';
    back.addEventListener('click',function(event){
      var f=document.getElementById('viewerFrame');
      try{
        var d=f&&f.contentDocument;
        if(d&&d.documentElement.dataset.tacsDirty==='1'&&!window.confirm('Há alterações que podem não ter sido salvas. Deseja voltar à Central mesmo assim?')){
          event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        }
      }catch(e){}
    },true);
  }
  installCentralPageRefresh();
}

renderLogin();
installInstitutionalNavigation();
var tabTacs=document.getElementById('tabTacs');
if(tabTacs)tabTacs.addEventListener('click',function(){setTimeout(function(){
  var p=getProfile();
  if(p)setStatus('Digite apenas o seu PIN para entrar na área '+(p.areaNome||p.areaId||'cadastrada')+'.','');
  else setStatus('Digite somente o seu PIN individual.','');
  enforceExclusiveTacsUi();
},0)});
})();
