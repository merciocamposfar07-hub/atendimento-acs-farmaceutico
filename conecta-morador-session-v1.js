(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalConectaMoradorTokenV1',PROFILE_KEY='portalConectaMoradorQuickV1',TEST_TOKEN_KEY='portalConectaMoradorTokenTesteV1',TEST_PROFILE_KEY='portalConectaMoradorQuickTesteV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:',BOOTSTRAP_KEY='portalConectaMoradorBootstrapV2',TEST_BOOTSTRAP_KEY='portalConectaMoradorBootstrapTesteV2',BG_REQUEST_KEY='portalConectaMoradorLoginRequestV2',TEST_BG_REQUEST_KEY='portalConectaMoradorLoginRequestTesteV2';
var token='',resident=null,oneSignal=null,busy=false;
/* RESPOSTA_IMEDIATA_MORADOR_2026_09_16_V1: cache efêmero, isolado por área/família/token. */
var familyMemberCache={},familyMemberLoads={},familyWarmGeneration=0;

function text(v){return String(v==null?'':v).trim()}
var MORADOR_SESSION_AUTH_REFUSAL_RE=/(sess[aã]o|token|autentica[cç][aã]o|acesso).*(inv[aá]lid|expir|recus|revog|desativ|n[aã]o autoriz)|n[aã]o autorizado|unauthor|forbidden|pertence a outro aparelho/i;
function remoteError(message,result){
 var e=new Error(text(message)||'Falha de comunicação.'),r=result&&typeof result==='object'?result:{};
 e.refused=Boolean(r.temporario!==true&&MORADOR_SESSION_AUTH_REFUSAL_RE.test(e.message));
 e.temporary=!e.refused;e.preserveSession=!e.refused;return e;
}
function digits(v){return text(v).replace(/\D/g,'')}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function el(id){return document.getElementById(id)}
function device(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
function queryFlag(){try{return String(new URLSearchParams(location.search).get('conecta')||'')==='1'}catch(e){return false}}
function onboardingFlag(){try{return String(new URLSearchParams(location.search).get('onboarding')||'')==='1'}catch(e){return false}}
function areaId(){try{return text(new URLSearchParams(location.search).get('area')||new URLSearchParams(location.search).get('areaId')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}catch(e){return'JAPARANDUBA'}}
function technicalToken(){try{var d=device();return d?text(localStorage.getItem(TECH_TOKEN_PREFIX+areaId()+':'+d)||''):''}catch(e){return''}}
function testMode(){return Boolean(device()&&technicalToken())}
function activeTokenKey(){return testMode()?TEST_TOKEN_KEY:TOKEN_KEY}
function activeBootstrapKey(){return testMode()?TEST_BOOTSTRAP_KEY:BOOTSTRAP_KEY}
function activeBackgroundKey(){return testMode()?TEST_BG_REQUEST_KEY:BG_REQUEST_KEY}
function requestId(prefix){return 'conecta_portal_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(params){return new Promise(function(resolve,reject){var cb='__conectaPortal_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null,new Error('A confirmação demorou demais.'))},14000);function finish(data,err){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();err?reject(err):resolve(data)}window[cb]=function(d){finish(d,null)};s.onerror=function(){finish(null,new Error('Falha de comunicação.'))};params.callback=cb;params._=Date.now();s.src=API+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');document.head.appendChild(s)})}
function post(action,payload){if(busy)return Promise.reject(remoteError('Aguarde a operação em andamento.',{temporario:true}));busy=true;var id=requestId(action),body=new URLSearchParams();body.set('action',action);body.set('requestId',id);Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});if(/^conecta_morador_/.test(action)&&testMode()){body.set('modoTacsTeste','SIM');body.set('areaId',body.get('areaId')||areaId());body.set('dispositivo',body.get('dispositivo')||device());body.set('chaveTacsTeste',technicalToken());body.set('fluxoMoradorExplicito','SIM')}var started=Date.now();return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function poll(){return jsonp({action:'conecta_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw remoteError(r.result.message||'Não foi possível concluir a operação.',r.result)}if(Date.now()-started>30000)throw remoteError('A operação demorou demais.',{temporario:true});return new Promise(function(resolve){setTimeout(resolve,650)}).then(poll)}).catch(function(e){if(e&&typeof e.refused==='boolean')throw e;throw remoteError(e&&e.message||'Falha de comunicação.',{temporario:true})})}).finally(function(){busy=false})}
function getSession(){return post('conecta_morador_sessao',{token:token,dispositivo:device()})}
function clearSession(){try{sessionStorage.removeItem(activeTokenKey())}catch(e){}token=''}

function readBootstrap(){try{var r=JSON.parse(sessionStorage.getItem(activeBootstrapKey())||'null');return r&&typeof r==='object'?r:null}catch(e){return null}}
function residentProfileCpf(){try{var key=testMode()?TEST_PROFILE_KEY:PROFILE_KEY,p=JSON.parse(localStorage.getItem(key)||'null'),d=digits(p&&p.cpf);return d.length===11||d.length===15?d:''}catch(e){return''}}
function clearBackgroundRequest(){try{sessionStorage.removeItem(activeBackgroundKey())}catch(e){}}
function hasBackgroundRequest(){try{return !!text(sessionStorage.getItem(activeBackgroundKey())||'')}catch(e){return false}}
function removeResidentVault(){if(testMode())return;try{var v=window.ConectaPinLocalV2;if(v&&typeof v.remover==='function')v.remover('morador')}catch(e){}}
function waitBackgroundLogin(){
 var id='';try{id=text(sessionStorage.getItem(activeBackgroundKey())||'')}catch(e){}
 if(!id)return Promise.reject(new Error('Sem sincronização pendente.'));
 var started=Date.now();
 return new Promise(function(resolve,reject){
  function poll(){
   jsonp({action:'conecta_result',requestId:id}).then(function(r){
    if(r&&r.ok===true&&r.pendente===false&&r.result){
     clearBackgroundRequest();
     if(r.result.ok===true&&r.result.token){resolve(r.result);return}
     reject(remoteError(r.result.message||'O acesso do morador não foi confirmado.',r.result));return;
    }
    if(Date.now()-started>50000){reject(new Error('A sincronização do acesso ainda não terminou.'));return}
    setTimeout(poll,900);
   }).catch(function(){
    if(Date.now()-started>50000){reject(new Error('A sincronização do acesso ainda não terminou.'));return}
    setTimeout(poll,1100);
   });
  }
  poll();
 });
}
function applyResident(r,localOnly){
 resident=r||resident;if(!resident)return;
 var savedCpf=residentProfileCpf();if(!digits(resident.cpf)&&savedCpf)resident.cpf=savedCpf;
 prefill(resident);
 var old=el('cscResidentBar');if(old)old.remove();
 renderFamily(resident);warmFamilyMembers(Array.isArray(resident.familia)?resident.familia:[]);
 if(onboardingFlag()||(!localOnly&&!resident.notificacoesAtivas))showGate();else if(!onboardingFlag())hideGate();
}

function ensureStyle(){
 if(el('cscResidentSessionStyle'))return;
 var s=document.createElement('style');s.id='cscResidentSessionStyle';s.textContent=
 '.csc-resident-bar{position:sticky;top:0;z-index:9500;width:min(calc(100% - 20px),980px);margin:8px auto 0;padding:10px 12px;display:flex;align-items:center;gap:10px;border:1px solid #315d74;border-radius:18px;background:rgba(6,44,70,.96);color:#fff;box-shadow:0 10px 28px rgba(3,35,56,.25);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}.csc-resident-bar strong{display:block;min-width:0;flex:1;font-size:.95rem}.csc-resident-bar small{display:block;color:#c9dce6;font-weight:650;margin-top:2px}.csc-resident-icon{width:46px;height:46px;border:1px solid #4d7890;border-radius:15px;background:#0b4263;color:#fff;font-size:1.25rem;display:grid;place-items:center}.csc-resident-menu{display:flex;gap:7px}.csc-resident-menu button{min-height:44px;border:1px solid #4d7890;border-radius:14px;background:#0d567a;color:#fff;padding:8px 11px;font-weight:850}.csc-family-session{width:min(calc(100% - 24px),956px);margin:12px auto;padding:15px;border:1px solid #93b4c4;border-radius:20px;background:#fff;color:#102d40;box-shadow:0 10px 25px rgba(7,58,85,.09)}.csc-family-session h2{margin:0 0 5px;font-size:1.25rem;color:#073a55}.csc-family-session p{margin:0 0 10px;color:#536b78}.csc-family-grid{display:grid;gap:8px}.csc-family-person{width:100%;min-height:54px;border:1px solid #8eb0c1;border-radius:15px;background:#eef7fa;color:#073a55;text-align:left;padding:10px 12px;font-weight:900}.csc-family-person.active{border-color:#15935a;background:#e8f7ee;color:#075b31}.csc-family-person:active{transform:scale(.985);filter:brightness(1.04)}.csc-family-person[aria-busy="true"]{cursor:progress}.csc-family-person span{display:block;margin-top:2px;color:#536b78;font-size:.82rem}.csc-gate{position:fixed;inset:0;z-index:70000;display:grid;place-items:center;padding:18px;background:rgba(3,16,27,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}.csc-gate[hidden]{display:none!important}.csc-gate-card{width:min(520px,100%);padding:22px;border:1px solid #2b5a76;border-radius:26px;background:#102d46;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5)}.csc-gate-card h2{margin:0 0 9px;color:#fff}.csc-gate-card p{color:#d5e4ec;line-height:1.45}.csc-gate-card button{width:100%;min-height:56px;border:0;border-radius:16px;background:#176a48;color:#fff;font-weight:900;font-size:1rem}.csc-gate-status{margin-top:12px;padding:11px 12px;border:1px solid #3f6980;border-radius:14px;background:#0a2438;color:#dcebf2;font-weight:750}.csc-gate-status.err{border-color:#a85d64;background:#401e26;color:#ffd7da}.csc-gate-status.ok{border-color:#49a97a;background:#103b2b;color:#c8f6dc}@media(max-width:560px){.csc-resident-bar{align-items:flex-start}.csc-resident-menu{flex-direction:column}.csc-resident-menu button{min-height:40px;padding:6px 9px;font-size:.82rem}}';
 document.head.appendChild(s);
}
function setField(id,value){
 var n=el(id);if(!n||value==null||value==='')return;n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));
}
function formatSessionDocument(v){
 var d=digits(v);if(d.length===11)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);if(d.length===15)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,10)+'.'+d.slice(10);return d;
}
function ensureCpfVisible(){
 var cpf=el('cpf');if(!cpf)return;var label=cpf.closest('label');if(!label)return;label.hidden=false;label.classList.remove('csc-session-hidden-doc');label.style.removeProperty('display');label.style.removeProperty('visibility');
}
function responsibleFamilyMember(r){
 var list=Array.isArray(r&&r.familia)?r.familia:[];for(var i=0;i<list.length;i++)if(list[i]&&list[i].responsavel)return list[i];return list[0]||null;
}
function applyResidentInstant(doc,data,familiaId){
 data=data||{};var d=digits(doc),name=text(data.nome),birth=text(data.nascimento),locality=text(data.localidade||data.endereco),api=window.TacsMoradoresAutofillV1;
 ensureCpfVisible();
 if((d.length===11||d.length===15)&&api&&typeof api.applyResolved==='function'&&name&&birth&&locality){
  if(api.applyResolved(d,{nome:name,nascimento:birth,localidade:locality,endereco:locality,areaId:data.areaId||areaId()},familiaId||''))return true;
 }
 var cpf=el('cpf');if(cpf&&d){cpf.value=formatSessionDocument(d);cpf.dispatchEvent(new Event('change',{bubbles:true}))}
 setField('birth',birth);setField('name',name);if(locality)setField('locality',locality);
 return Boolean(d||name||birth||locality);
}
function prefill(r){
 var member=responsibleFamilyMember(r),doc=digits(r.cpf||member&&member.documentoAcesso||member&&member.cpf||''),name=r.nome||member&&member.nome||'',birth=r.nascimento||member&&member.nascimento||'',locality=r.endereco||r.localidade||member&&member.localidade||'';
 applyResidentInstant(doc,{nome:name,nascimento:birth,localidade:locality,areaId:r.areaId||areaId()},r.familiaId||'');
 ensureCpfVisible();
 document.dispatchEvent(new CustomEvent('tacs:morador',{detail:{nome:name,nascimento:birth,cpf:doc,endereco:locality,areaId:r.areaId||areaId()}}));
}
function topBar(r){
 if(el('cscResidentBar'))return;
 var bar=document.createElement('div');bar.id='cscResidentBar';bar.className='csc-resident-bar';
 bar.innerHTML='<div class="csc-resident-icon" aria-hidden="true">C</div><strong>'+esc(r.nome||'Morador')+' — Morador<small>Conecta Saúde Comunitária • '+esc(r.areaId||areaId())+'</small></strong><div class="csc-resident-menu"><button type="button" id="cscMuteToggle">'+(r.silencioso?'🔕 Silenciado':'🔔 Avisos')+'</button><button type="button" id="cscResidentLogout">Sair</button></div>';
 document.body.insertBefore(bar,document.body.firstChild);
 el('cscResidentLogout').onclick=logout;
 el('cscMuteToggle').onclick=toggleMute;
}
function familyMemberSessionDocument(m,r){
 var direct=digits(m&&(m.documentoAcesso||m.cpf||m.cns)||'');if(direct.length===11||direct.length===15)return direct;
 var sessionDoc=digits(r&&r.cpf||'');if(m&&m.responsavel&&(sessionDoc.length===11||sessionDoc.length===15))return sessionDoc;
 return '';
}
function renderFamily(r){
 var old=el('cscFamilySession');if(old)old.remove();
 var members=Array.isArray(r.familia)?r.familia:[];if(!members.length)return;
 var box=document.createElement('section');box.id='cscFamilySession';box.className='csc-family-session';
 box.innerHTML='<h2>Quem precisa do atendimento?</h2><p>Selecione uma pessoa do vínculo familiar. O responsável deste acesso continua sendo '+esc(r.nome||'o morador autenticado')+'.</p><div class="csc-family-grid">'+members.map(function(m){var doc=familyMemberSessionDocument(m,r),has=Boolean(m.temDocumento||doc);return '<button type="button" class="csc-family-person'+(m.responsavel?' active':'')+'" data-csc-family-token="'+esc(m.token||'')+'" data-csc-family-name="'+esc(m.nome||'')+'" data-csc-family-birth="'+esc(m.nascimento||'')+'" data-csc-family-locality="'+esc(m.localidade||'')+'" data-csc-family-hasdoc="'+(has?'1':'0')+'" data-csc-family-doc="'+esc(doc)+'">'+esc(m.nome||'Morador')+'<span>'+(m.nascimento?'Nascimento: '+esc(m.nascimento):'')+(has?'':' • CPF/CNS ainda não disponível')+'</span></button>'}).join('')+'</div>';
 // Mantém a família na identificação, logo abaixo do PIN, inclusive na reentrada.
 var anchor=el('portalResidentPinV1'),cpf=el('cpf');
 if(!anchor&&cpf)anchor=cpf.closest('label');
 if(!anchor||!anchor.parentNode)return;
 box.style.gridColumn='1 / -1';
 anchor.parentNode.insertBefore(box,anchor.nextSibling);
 box.addEventListener('click',function(e){var b=e.target.closest('[data-csc-family-token]');if(!b)return;selectFamilyMember(b)});
}

function mergeResidentFamily(primary,fallback){
 var out=Object.assign({},fallback||{},primary||{}),a=Array.isArray(primary&&primary.familia)?primary.familia:[],b=Array.isArray(fallback&&fallback.familia)?fallback.familia:[];
 out.familia=a.length?a:b;
 out.familiaId=text(primary&&primary.familiaId)||text(fallback&&fallback.familiaId);
 return out;
}
/* RESPOSTA_IMEDIATA_MORADOR_2026_09_16_V1
   O toque nunca espera Apps Script para responder visualmente.
   Integrantes com documento são pré-resolvidos em segundo plano e mantidos somente
   em memória, com chave por área + família + token. Nenhum CPF/CNS novo é persistido
   por este cache. A rede continua sendo a autoridade de atualização. */
function familyMemberKey(tok){
 return text((resident&&resident.areaId)||areaId())+'|'+text(resident&&resident.familiaId)+'|'+text(tok);
}
function resolveFamilyMember(tok){
 var key=familyMemberKey(tok);if(!text(tok)||!key)return Promise.reject(new Error('Integrante inválido.'));
 if(familyMemberCache[key])return Promise.resolve(familyMemberCache[key]);
 if(familyMemberLoads[key])return familyMemberLoads[key];
 familyMemberLoads[key]=jsonp({action:'publico_familia_membro',areaId:(resident&&resident.areaId)||areaId(),token:tok}).then(function(r){
  if(!r||r.ok!==true||!r.documentoAcesso)throw new Error(r&&r.message||'Não foi possível carregar este integrante.');
  familyMemberCache[key]=r;return r;
 }).finally(function(){delete familyMemberLoads[key]});
 return familyMemberLoads[key];
}
function warmFamilyMembers(members){
 var generation=++familyWarmGeneration,list=Array.isArray(members)?members.filter(function(m){return m&&m.temDocumento&&m.token}):[],index=0;
 function next(){
  if(generation!==familyWarmGeneration||index>=list.length)return;
  var item=list[index++];
  resolveFamilyMember(item.token).catch(function(){}).finally(function(){if(generation===familyWarmGeneration)setTimeout(next,70)});
 }
 setTimeout(next,30);
}
function applyFamilyMemberData(r,name,birth,locality){
 applyResidentInstant(r.documentoAcesso,{nome:r.nome||name,nascimento:r.nascimento||birth,localidade:r.localidade||locality||'',areaId:r.areaId||(resident&&resident.areaId)||areaId()},r.familiaId||(resident&&resident.familiaId)||'');
}
function viewportY(){return window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0}
function restoreViewport(y){var run=function(){try{window.scrollTo(0,y)}catch(e){}};if(typeof requestAnimationFrame==='function'){requestAnimationFrame(function(){run();requestAnimationFrame(run)})}else setTimeout(run,0)}
function selectFamilyMember(button){
 var fixedY=viewportY(),tok=text(button.getAttribute('data-csc-family-token')),name=text(button.getAttribute('data-csc-family-name')),birth=text(button.getAttribute('data-csc-family-birth')),locality=text(button.getAttribute('data-csc-family-locality')),has=button.getAttribute('data-csc-family-hasdoc')==='1',localDoc=digits(button.getAttribute('data-csc-family-doc')||'');
 /* Resposta tátil/visual primeiro: seleção e dados locais conhecidos aparecem já no toque. */
 document.querySelectorAll('.csc-family-person').forEach(function(x){x.classList.toggle('active',x===button)});
 setField('name',name);setField('birth',birth);if(locality)setField('locality',locality);
 if(localDoc.length===11||localDoc.length===15){applyResidentInstant(localDoc,{nome:name,nascimento:birth,localidade:locality,areaId:(resident&&resident.areaId)||areaId()},(resident&&resident.familiaId)||'');restoreViewport(fixedY);return}
 if(!has||!tok){
  if(tok){promptMemberCpf(button,tok,name,birth);return}
  showPortalToast('Este integrante ainda não possui documento disponível. A solicitação permanece acessível e o cadastro poderá ser regularizado pelo TACS.');restoreViewport(fixedY);
  return
 }
 var key=familyMemberKey(tok),cached=familyMemberCache[key];
 if(cached){applyFamilyMemberData(cached,name,birth,locality);restoreViewport(fixedY);return}
 button.setAttribute('aria-busy','true');
 resolveFamilyMember(tok).then(function(r){
  applyFamilyMemberData(r,name,birth,locality);
 }).catch(function(e){
  showPortalToast(e.message);
 }).finally(function(){button.removeAttribute('aria-busy');restoreViewport(fixedY)});
}
function promptMemberCpf(button,tok,name,birth){
 var box=el('cscFamilySession');if(!box)return;
 var old=el('cscFamilyCpfPrompt');if(old)old.remove();
 var p=document.createElement('div');p.id='cscFamilyCpfPrompt';p.style.cssText='margin-top:10px;padding:12px;border:1px solid #8eb0c1;border-radius:15px;background:#f5f9fb';
 p.innerHTML='<strong>CPF de '+esc(name||'integrante')+'</strong><p style="margin:5px 0 9px;color:#536b78">Informe uma única vez. O CPF será salvo automaticamente no cadastro desta pessoa.</p><input id="cscFamilyCpfInput" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" style="width:100%;min-height:50px;border:1px solid #8eb0c1;border-radius:13px;padding:10px 12px"><button id="cscFamilyCpfSave" type="button" style="width:100%;min-height:50px;margin-top:8px;border:0;border-radius:13px;background:#176a48;color:#fff;font-weight:900">Salvar CPF e selecionar</button>';
 box.appendChild(p);
 el('cscFamilyCpfSave').onclick=function(){
  if(!token){showPortalToast('Acesso aberto. Aguarde a confirmação segura do servidor para salvar alterações.');return}
  var cpf=digits(el('cscFamilyCpfInput').value);if(cpf.length!==11){showPortalToast('Informe um CPF válido com 11 números.');return}
  this.disabled=true;
  post('conecta_morador_membro_salvar_cpf',{token:token,dispositivo:device(),membroToken:tok,cpf:cpf}).then(function(r){
    applyResidentInstant(r.documentoAcesso||cpf,{nome:r.nome||name,nascimento:r.nascimento||birth,localidade:r.localidade||'',areaId:r.areaId||(resident&&resident.areaId)||areaId()},r.familiaId||(resident&&resident.familiaId)||'');
    button.setAttribute('data-csc-family-hasdoc','1');var span=button.querySelector('span');if(span)span.textContent=(r.nascimento||birth?'Nascimento: '+(r.nascimento||birth):'');
    if(p.parentNode)p.remove();showPortalToast(r.message||'CPF salvo e integrante selecionado.');
  }).catch(function(e){showPortalToast(e.message)}).finally(function(){var b=el('cscFamilyCpfSave');if(b)b.disabled=false});
 };
}

function showPortalToast(message){
 var old=el('cscResidentToast');if(old)old.remove();var n=document.createElement('div');n.id='cscResidentToast';n.style.cssText='position:fixed;left:16px;right:16px;bottom:24px;z-index:72000;max-width:620px;margin:auto;padding:13px 15px;border-radius:16px;background:#082d46;color:#fff;font-weight:800;box-shadow:0 12px 35px rgba(0,0,0,.35)';n.textContent=message;document.body.appendChild(n);setTimeout(function(){if(n.parentNode)n.remove()},5000)
}
function toggleMute(){
 if(!resident)return;
 if(!token){showPortalToast('Acesso aberto. Aguarde a confirmação segura do servidor para alterar preferências.');return}
 var next=!Boolean(resident.silencioso),btn=el('cscMuteToggle');if(btn)btn.disabled=true;
 post('conecta_morador_preferencia_notificacao',{token:token,dispositivo:device(),silencioso:next?'SIM':'NAO'}).then(function(r){resident.silencioso=Boolean(r.silencioso);if(btn)btn.textContent=resident.silencioso?'🔕 Silenciado':'🔔 Avisos';showPortalToast(resident.silencioso?'Preferência silenciosa ativada. As notificações continuam chegando.':'Preferência de avisos sonoros reativada.')}).catch(function(e){showPortalToast(e.message)}).finally(function(){if(btn)btn.disabled=false})
}
function logout(){
 var t=token,teste=testMode();clearSession();clearBackgroundRequest();try{sessionStorage.removeItem(activeBootstrapKey())}catch(e){}
 if(!teste)try{sessionStorage.removeItem('portalTacsAdminTokenV1');sessionStorage.removeItem('portalTacsTerritorioTokenV1')}catch(e){}
 if(t)post('conecta_morador_encerrar',{token:t,dispositivo:device()}).catch(function(){});
 if(teste){location.assign('/atendimento-acs-farmaceutico/?area='+encodeURIComponent(areaId()));return}
 location.assign('/atendimento-acs-farmaceutico/central-administrativa-tacs.html');
}

function gateMarkup(){
 if(el('cscNotificationGate'))return;
 var gate=document.createElement('div');gate.id='cscNotificationGate';gate.className='csc-gate';gate.hidden=true;
 gate.innerHTML='<div class="csc-gate-card"><h2>Ative as notificações</h2><p>Para concluir o primeiro acesso ao Conecta Saúde Comunitária, este aparelho precisa permitir os avisos da sua comunidade. Esta etapa é obrigatória.</p><button type="button" id="cscNotificationEnable">Ativar notificações</button><div class="csc-gate-status" id="cscNotificationGateStatus">Toque no botão e confirme “Permitir” quando o aparelho solicitar.</div></div>';
 document.body.appendChild(gate);el('cscNotificationEnable').onclick=activateNotifications;
}
function gateStatus(msg,type){var n=el('cscNotificationGateStatus');if(!n)return;n.textContent=msg;n.className='csc-gate-status'+(type?' '+type:'')}
function showGate(){gateMarkup();el('cscNotificationGate').hidden=false}
function hideGate(){var g=el('cscNotificationGate');if(g)g.hidden=true}
function oneSignalReady(){return new Promise(function(resolve){if(oneSignal){resolve(oneSignal);return}window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(os){oneSignal=os;resolve(os)});setTimeout(function(){resolve(oneSignal)},10000)})}
function osState(os){
 try{var p=os&&os.User&&os.User.PushSubscription,tags={};try{tags=os.User&&typeof os.User.getTags==='function'?(os.User.getTags()||{}):{}}catch(e){}return {permission:Boolean(os&&os.Notifications&&os.Notifications.permission===true),optedIn:Boolean(p&&p.optedIn===true),subscriptionId:text(p&&p.id).toLowerCase(),token:text(p&&p.token),areaConfirmed:text(tags.area_tacs).toUpperCase()===(resident.areaId||areaId()).toUpperCase()}}catch(e){return {permission:false,optedIn:false,subscriptionId:'',token:'',areaConfirmed:false}}
}
async function activateNotifications(){
 var btn=el('cscNotificationEnable');
 if(!token){gateStatus('Acesso aberto. Aguarde a confirmação segura do servidor para concluir esta etapa.','');return}
 if(testMode()){
  if(btn)btn.disabled=true;gateStatus('Validando a etapa no modo teste…','');
  try{var tr=await post('conecta_morador_notificacao_confirmar',{token:token,dispositivo:device(),permission:'SIM',optedIn:'SIM',subscriptionId:'teste'});resident.notificacoesAtivas=true;gateStatus(tr.message||'Etapa validada no modo teste.','ok');setTimeout(function(){hideGate();renderFamily(resident)},450)}catch(te){gateStatus(te.message,'err')}finally{if(btn)btn.disabled=false}
  return;
 }
 if(btn)btn.disabled=true;gateStatus('Solicitando permissão neste aparelho…','');
 try{
  var os=await oneSignalReady();if(!os)throw new Error('O serviço de notificações ainda não terminou de carregar.');
  if(os.Notifications&&os.Notifications.permission!==true&&typeof os.Notifications.requestPermission==='function')await os.Notifications.requestPermission();
  var push=os.User&&os.User.PushSubscription;if(push&&push.optedIn!==true&&typeof push.optIn==='function')await push.optIn();
  if(os.User&&typeof os.User.addTag==='function')await os.User.addTag('area_tacs',resident.areaId||areaId());
  await new Promise(function(resolve){setTimeout(resolve,900)});
  var health=window.PortalTacsSaudeNotificacoes;if(health&&typeof health.checkin==='function')try{await health.checkin()}catch(e){}
  var st=osState(os);if(!st.permission)throw new Error('A permissão não foi concedida. Ative as notificações nas configurações do aparelho e toque novamente.');
  if(!st.optedIn||!st.subscriptionId||!st.token)throw new Error('A inscrição de notificações ainda está sendo concluída. Tente novamente em alguns segundos.');
  gateStatus('Confirmando a ativação…','');
  var r=await post('conecta_morador_notificacao_confirmar',{token:token,dispositivo:device(),subscriptionId:st.subscriptionId,permission:'SIM',optedIn:'SIM'});
  resident.notificacoesAtivas=true;resident.subscriptionId=st.subscriptionId;gateStatus(r.message||'Notificações ativadas.','ok');
  setTimeout(function(){hideGate();renderFamily(resident)},650);
 }catch(e){gateStatus(e.message,'err')}finally{if(btn)btn.disabled=false}
}

function install(){
 try{token=text(sessionStorage.getItem(activeTokenKey())||'')}catch(e){token=''}
 var local=readBootstrap(),pending=hasBackgroundRequest();
 if(!queryFlag()){
  if(!token)return;
 }else if(!token&&!(local&&pending)){
  location.replace('/atendimento-acs-farmaceutico/central-administrativa-tacs.html');return
 }
 ensureStyle();gateMarkup();
 if(local)applyResident(local,true);
	 function fresh(){
	  if(!token)return Promise.reject(new Error('Sessão remota ainda não confirmada.'));
	  return getSession().then(function(r){r=mergeResidentFamily(r,readBootstrap());try{sessionStorage.setItem(activeBootstrapKey(),JSON.stringify(r))}catch(e){}applyResident(r,false);return r});
	 }
	 function confirmBackground(){
	  return waitBackgroundLogin().then(function(login){
	   token=text(login.token);try{sessionStorage.setItem(activeTokenKey(),token)}catch(e){}
	   if(Array.isArray(login.familia)&&login.familia.length){try{sessionStorage.setItem(activeBootstrapKey(),JSON.stringify(login))}catch(e){}applyResident(login,true)}
	   return fresh();
	  });
 }
 var sync=token?fresh().catch(function(err){
  if(err&&err.refused)return Promise.reject(err);
  return pending?confirmBackground():Promise.reject(err||remoteError('Sessão remota indisponível.',{temporario:true}));
 }):confirmBackground();
 sync.catch(function(err){
  if(err&&err.refused){removeResidentVault();clearSession();clearBackgroundRequest();if(queryFlag())location.replace('/atendimento-acs-farmaceutico/central-administrativa-tacs.html');return}
  if(local)showPortalToast('Portal aberto com os dados locais. A confirmação do servidor continua em segundo plano.');
  else showPortalToast('Sua sessão foi preservada. O servidor ainda não confirmou os dados; tente novamente sem refazer o PIN.');
 });
}
function openInline(r,confirmed){
 if(!r||typeof r!=='object')return false;
 var y=viewportY();
 try{if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur()}catch(e){}
 if(r.token){token=text(r.token);try{sessionStorage.setItem(activeTokenKey(),token)}catch(e){}}
 r=mergeResidentFamily(r,readBootstrap());
 try{sessionStorage.setItem(activeBootstrapKey(),JSON.stringify(r))}catch(e){}
 applyResident(r,confirmed!==true);
 var pinBox=el('portalResidentPinV1');if(pinBox){pinBox.hidden=true;pinBox.innerHTML=''}
 restoreViewport(y);
 return true;
}
window.ConectaMoradorSessionV1={
 openInline:openInline,
 refresh:function(r){return openInline(r,true)}
};
window.OneSignalDeferred=window.OneSignalDeferred||[];
window.OneSignalDeferred.push(function(os){oneSignal=os});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
