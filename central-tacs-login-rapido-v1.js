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

var busy=false,pinWarmup=false;
function aquecerPinTacs(){
  if(pinWarmup)return;
  var warm=window.PortalTacsAdminWarmup;
  if(warm&&typeof warm.iniciar==='function'){
    pinWarmup=true;
    Promise.resolve(warm.iniciar()).catch(function(){}).finally(function(){pinWarmup=false});
  }
}
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
    /* PRIVACIDADE_TACS_LOGIN_V1: nome profissional não permanece exposto no acesso público. */
    if(Object.prototype.hasOwnProperty.call(p,'nome')){
      delete p.nome;
      try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(e){}
    }
    return p;
  }catch(e){return null}
}
function saveProfile(r){
  if(!r||!r.quickKey)return;
  /* PRIVACIDADE_TACS_LOGIN_V1: o acesso rápido guarda apenas o necessário para autenticação/território. */
  var p={quickKey:String(r.quickKey),tacsId:text(r.tacsId),areaId:text(r.areaId),areaNome:text(r.areaNome)};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(e){}
}
function centralPinLocal(){var api=window.PortalTacsCentralPinLocalV2;return api&&typeof api.abrir==='function'?api:null}
function clearProfile(){
  try{localStorage.removeItem(PROFILE_KEY)}catch(e){}
  try{var v=window.ConectaPinLocalV2;if(v&&typeof v.remover==='function')v.remover('tacs')}catch(e){}
}

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
  var frameName='quickFrame'+Date.now()+'_'+Math.floor(Math.random()*1000),finished=false,pollTimer=null,submitTimer=null,nextWait=1600,deadline=Date.now()+45000;
  frame.name=frameName;frame.setAttribute('name',frameName);frame.src='about:blank';frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;visibility:hidden;pointer-events:none;z-index:-1';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.setAttribute('target',frameName);form.style.display='none';
  var fields={};Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});fields.action=action;fields.requestId=rid;
  Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
  function cleanup(){
    window.removeEventListener('message',onMessage);
    clearTimeout(timeout);clearTimeout(pollTimer);clearTimeout(submitTimer);
    if(form.parentNode)form.remove();
    if(frame.parentNode)setTimeout(function(){if(frame.parentNode)frame.remove()},180);
  }
  function finish(r){if(finished)return;finished=true;busy=false;cleanup();cb(r||{ok:false,message:'Resposta vazia.'})}
  function onMessage(event){
    if(event.source!==frame.contentWindow)return;
    var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
    if(!d||typeof d!=='object')return;
    var responseId=text(d.requestId||(d.result&&d.result.requestId));if(responseId&&responseId!==rid)return;
    var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));
    if(r)finish(r);
  }
  function schedulePoll(delay){clearTimeout(pollTimer);pollTimer=setTimeout(poll,Math.max(0,Number(delay||nextWait)))}
  function poll(){
    if(finished)return;
    jsonp('admin_territorio_result',{requestId:rid},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      if(Date.now()>=deadline){finish({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'});return}
      nextWait=Math.min(2200,Math.max(1400,nextWait+200));schedulePoll(nextWait);
    });
  }
  window.addEventListener('message',onMessage);
  var timeout=setTimeout(function(){finish({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'})},45500);
  document.body.appendChild(frame);document.body.appendChild(form);
  var sent=false;
  function sendOnce(){
    if(sent||finished)return;sent=true;clearTimeout(submitTimer);
    try{form.submit()}catch(e){finish({ok:false,message:'Não foi possível iniciar a comunicação.'});return}
    /* PIN_TACS_TRANSPORTE_R8: postMessage primeiro; polling apenas após 8 s como contingência. */
    schedulePoll(8000);
  }
  function sendAfterRegistration(){
    if(typeof window.requestAnimationFrame==='function'){window.requestAnimationFrame(function(){window.requestAnimationFrame(sendOnce)});return}
    setTimeout(sendOnce,60);
  }
  frame.addEventListener('load',sendAfterRegistration,{once:true});
  sendAfterRegistration();submitTimer=setTimeout(sendOnce,180);
}

function abrirSessao(token,pin,meta){
  try{
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.setItem(TERRITORY_TOKEN_KEY,token);
    sessionStorage.setItem(EXCLUSIVE_MODE_KEY,'tacs');
    if(pin){sessionStorage.setItem('portalTacsPinLocalPendenteV2',pin);sessionStorage.setItem('portalTacsPinLocalPerfilV2','tacs')}
  }catch(e){}
  enforceExclusiveTacsUi();
  setStatus('Acesso validado. Abrindo sua área…','ok');
  var api=centralPinLocal();
  if(api&&meta&&typeof api.sincronizar==='function'){
    api.sincronizar('tacs',token,pin,text(meta.areaId),'Acesso TACS sincronizado.');
    return;
  }
  setTimeout(function(){location.reload()},0);
}
function concluirPrimeiroAcesso(r,device,pin){
  if(r.quickKey){saveProfile(r);abrirSessao(r.token,pin,r);return}
  setStatus('Acesso validado. Ativando entrada rápida por PIN neste aparelho…','warn');
  post('admin_territorio_criar_chave_rapida',{territorioToken:r.token,dispositivo:device},function(q){
    if(q&&q.ok===true&&q.quickKey)saveProfile(q);
    abrirSessao(r.token,pin,Object.assign({},r,q||{}));
  });
}

pinInput.addEventListener('focus',aquecerPinTacs,{once:true});
pinInput.addEventListener('input',aquecerPinTacs,{once:true});

loginBtn.addEventListener('click',function(event){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(busy){setStatus('Aguarde a validação em andamento.','warn');return}
  var pin=digits(pinInput.value),device=getDevice(),profile=getProfile(),api=centralPinLocal();
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  if(!device){setStatus('Este aparelho ainda não foi identificado. Atualize a página e tente novamente.','err');return}
  var action='admin_territorio_login_pin';
  var payload=profile?{quickKey:profile.quickKey,pin:pin,dispositivo:device}:{pin:pin,dispositivo:device};
  function validarServidor(saved){
    setStatus(saved?'Área liberada. Sincronizando em segundo plano…':'Validando seu PIN…',saved?'ok':'warn');
    post(action,payload,function(r){
      pinInput.value='';
      if(!r||r.ok!==true||!r.token){
        if(saved&&r&&r.temporario===true){setStatus('Área aberta com os dados locais. O servidor ainda está sincronizando.','warn');return}
        if(saved&&api&&typeof api.bloquear==='function'){api.bloquear('tacs',text(r&&r.message)||'Acesso TACS recusado.');return}
        setStatus(text(r&&r.message)||'Acesso recusado.','err');return;
      }
      if(r.quickKey)saveProfile(r);
      if(saved&&api&&typeof api.sincronizar==='function'){
        api.sincronizar('tacs',r.token,pin,text(r.areaId),'Acesso TACS sincronizado.');
        return;
      }
      if(profile||r.quickKey){abrirSessao(r.token,pin,r);return}
      concluirPrimeiroAcesso(r,device,pin);
    });
  }
  if(api&&typeof api.abrir==='function'){
    setStatus('Liberando sua área…','warn');
    Promise.resolve(api.abrir('tacs',pin)).then(function(saved){
      if(saved&&typeof api.aplicar==='function')api.aplicar('tacs',saved);
      validarServidor(saved);
    }).catch(function(){validarServidor(null)});
    return;
  }
  validarServidor(null);
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
  var revision='20260823-recados-safari-render-v1';
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v=20260823-agendas-safari-paint-v1';
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
      /* PIN_UNICO_CENTRAL_V1:
         se o PIN local já abriu a Central mas a nova sessão remota ainda está
         sendo criada, não navegue para um painel que poderia exibir seu login
         legado. Deixe o controlador principal enfileirar este mesmo toque e
         abrir o painel automaticamente assim que a sessão existir. */
      if(!hasAnySession())return;
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
