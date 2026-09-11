(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalConectaMoradorTokenV1',PROFILE_KEY='portalConectaMoradorQuickV1',DEVICE_KEY='portalTacsDispositivoV1';
var token='',resident=null,oneSignal=null,busy=false;

function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function el(id){return document.getElementById(id)}
function device(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
function queryFlag(){try{return String(new URLSearchParams(location.search).get('conecta')||'')==='1'}catch(e){return false}}
function onboardingFlag(){try{return String(new URLSearchParams(location.search).get('onboarding')||'')==='1'}catch(e){return false}}
function areaId(){try{return text(new URLSearchParams(location.search).get('area')||new URLSearchParams(location.search).get('areaId')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}catch(e){return'JAPARANDUBA'}}
function requestId(prefix){return 'conecta_portal_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(params){return new Promise(function(resolve,reject){var cb='__conectaPortal_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null,new Error('A confirmação demorou demais.'))},14000);function finish(data,err){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();err?reject(err):resolve(data)}window[cb]=function(d){finish(d,null)};s.onerror=function(){finish(null,new Error('Falha de comunicação.'))};params.callback=cb;params._=Date.now();s.src=API+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');document.head.appendChild(s)})}
function post(action,payload){if(busy)return Promise.reject(new Error('Aguarde a operação em andamento.'));busy=true;var id=requestId(action),body=new URLSearchParams();body.set('action',action);body.set('requestId',id);Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});var started=Date.now();return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function poll(){return jsonp({action:'conecta_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw new Error(r.result.message||'Não foi possível concluir a operação.')}if(Date.now()-started>30000)throw new Error('A operação demorou demais.');return new Promise(function(resolve){setTimeout(resolve,650)}).then(poll)})}).finally(function(){busy=false})}
function getSession(){return post('conecta_morador_sessao',{token:token,dispositivo:device()})}
function clearSession(){try{sessionStorage.removeItem(TOKEN_KEY)}catch(e){}token=''}

function ensureStyle(){
 if(el('cscResidentSessionStyle'))return;
 var s=document.createElement('style');s.id='cscResidentSessionStyle';s.textContent=
 '.csc-resident-bar{position:sticky;top:0;z-index:9500;width:min(calc(100% - 20px),980px);margin:8px auto 0;padding:10px 12px;display:flex;align-items:center;gap:10px;border:1px solid #315d74;border-radius:18px;background:rgba(6,44,70,.96);color:#fff;box-shadow:0 10px 28px rgba(3,35,56,.25);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}.csc-resident-bar strong{display:block;min-width:0;flex:1;font-size:.95rem}.csc-resident-bar small{display:block;color:#c9dce6;font-weight:650;margin-top:2px}.csc-resident-icon{width:46px;height:46px;border:1px solid #4d7890;border-radius:15px;background:#0b4263;color:#fff;font-size:1.25rem;display:grid;place-items:center}.csc-resident-menu{display:flex;gap:7px}.csc-resident-menu button{min-height:44px;border:1px solid #4d7890;border-radius:14px;background:#0d567a;color:#fff;padding:8px 11px;font-weight:850}.csc-family-session{width:min(calc(100% - 24px),956px);margin:12px auto;padding:15px;border:1px solid #93b4c4;border-radius:20px;background:#fff;color:#102d40;box-shadow:0 10px 25px rgba(7,58,85,.09)}.csc-family-session h2{margin:0 0 5px;font-size:1.25rem;color:#073a55}.csc-family-session p{margin:0 0 10px;color:#536b78}.csc-family-grid{display:grid;gap:8px}.csc-family-person{width:100%;min-height:54px;border:1px solid #8eb0c1;border-radius:15px;background:#eef7fa;color:#073a55;text-align:left;padding:10px 12px;font-weight:900}.csc-family-person.active{border-color:#15935a;background:#e8f7ee;color:#075b31}.csc-family-person span{display:block;margin-top:2px;color:#536b78;font-size:.82rem}.csc-gate{position:fixed;inset:0;z-index:70000;display:grid;place-items:center;padding:18px;background:rgba(3,16,27,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}.csc-gate[hidden]{display:none!important}.csc-gate-card{width:min(520px,100%);padding:22px;border:1px solid #2b5a76;border-radius:26px;background:#102d46;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5)}.csc-gate-card h2{margin:0 0 9px;color:#fff}.csc-gate-card p{color:#d5e4ec;line-height:1.45}.csc-gate-card button{width:100%;min-height:56px;border:0;border-radius:16px;background:#176a48;color:#fff;font-weight:900;font-size:1rem}.csc-gate-status{margin-top:12px;padding:11px 12px;border:1px solid #3f6980;border-radius:14px;background:#0a2438;color:#dcebf2;font-weight:750}.csc-gate-status.err{border-color:#a85d64;background:#401e26;color:#ffd7da}.csc-gate-status.ok{border-color:#49a97a;background:#103b2b;color:#c8f6dc}.csc-session-hidden-doc{display:none!important}@media(max-width:560px){.csc-resident-bar{align-items:flex-start}.csc-resident-menu{flex-direction:column}.csc-resident-menu button{min-height:40px;padding:6px 9px;font-size:.82rem}}';
 document.head.appendChild(s);
}
function setField(id,value){
 var n=el(id);if(!n||value==null||value==='')return;n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));
}
function prefill(r){
 setField('cpf',r.cpf||'');setField('birth',r.nascimento||'');setField('name',r.nome||'');if(r.endereco)setField('locality',r.endereco);
 var cpf=el('cpf');if(cpf){var label=cpf.closest('label');if(label)label.classList.add('csc-session-hidden-doc')}
 document.dispatchEvent(new CustomEvent('tacs:morador',{detail:{nome:r.nome||'',nascimento:r.nascimento||'',cpf:r.cpf||'',endereco:r.endereco||'',areaId:r.areaId||areaId()}}));
}
function topBar(r){
 if(el('cscResidentBar'))return;
 var bar=document.createElement('div');bar.id='cscResidentBar';bar.className='csc-resident-bar';
 bar.innerHTML='<div class="csc-resident-icon" aria-hidden="true">C</div><strong>'+esc(r.nome||'Morador')+'<small>Conecta Saúde Comunitária • '+esc(r.areaId||areaId())+'</small></strong><div class="csc-resident-menu"><button type="button" id="cscMuteToggle">'+(r.silencioso?'🔕 Silenciado':'🔔 Avisos')+'</button><button type="button" id="cscResidentLogout">Sair</button></div>';
 document.body.insertBefore(bar,document.body.firstChild);
 el('cscResidentLogout').onclick=logout;
 el('cscMuteToggle').onclick=toggleMute;
}
function renderFamily(r){
 var old=el('cscFamilySession');if(old)old.remove();
 var members=Array.isArray(r.familia)?r.familia:[];if(!members.length)return;
 var box=document.createElement('section');box.id='cscFamilySession';box.className='csc-family-session';
 box.innerHTML='<h2>Quem precisa do atendimento?</h2><p>Selecione uma pessoa do vínculo familiar. O responsável deste acesso continua sendo '+esc(r.nome||'o morador autenticado')+'.</p><div class="csc-family-grid">'+members.map(function(m){return '<button type="button" class="csc-family-person'+(m.responsavel?' active':'')+'" data-csc-family-token="'+esc(m.token||'')+'" data-csc-family-name="'+esc(m.nome||'')+'" data-csc-family-birth="'+esc(m.nascimento||'')+'" data-csc-family-hasdoc="'+(m.temDocumento?'1':'0')+'">'+esc(m.nome||'Morador')+'<span>'+(m.nascimento?'Nascimento: '+esc(m.nascimento):'')+(m.temDocumento?'':' • CPF/CNS ainda não disponível')+'</span></button>'}).join('')+'</div>';
 var main=document.querySelector('main');if(main&&main.parentNode)main.parentNode.insertBefore(box,main);else document.body.appendChild(box);
 box.addEventListener('click',function(e){var b=e.target.closest('[data-csc-family-token]');if(!b)return;selectFamilyMember(b)});
}
function selectFamilyMember(button){
 var tok=text(button.getAttribute('data-csc-family-token')),name=text(button.getAttribute('data-csc-family-name')),birth=text(button.getAttribute('data-csc-family-birth')),has=button.getAttribute('data-csc-family-hasdoc')==='1';
 document.querySelectorAll('.csc-family-person').forEach(function(x){x.classList.toggle('active',x===button)});
 if(!has||!tok){setField('name',name);setField('birth',birth);showPortalToast('Este integrante ainda não possui CPF/CNS no cadastro. A solicitação pode continuar, mas ficará sinalizada para conferência cadastral.');return}
 jsonp({action:'publico_familia_membro',areaId:resident.areaId||areaId(),token:tok}).then(function(r){if(!r||r.ok!==true||!r.documentoAcesso)throw new Error(r&&r.message||'Não foi possível carregar este integrante.');setField('cpf',r.documentoAcesso);setTimeout(function(){setField('name',r.nome||name);if(birth)setField('birth',birth)},80)}).catch(function(e){showPortalToast(e.message)});
}
function showPortalToast(message){
 var old=el('cscResidentToast');if(old)old.remove();var n=document.createElement('div');n.id='cscResidentToast';n.style.cssText='position:fixed;left:16px;right:16px;bottom:24px;z-index:72000;max-width:620px;margin:auto;padding:13px 15px;border-radius:16px;background:#082d46;color:#fff;font-weight:800;box-shadow:0 12px 35px rgba(0,0,0,.35)';n.textContent=message;document.body.appendChild(n);setTimeout(function(){if(n.parentNode)n.remove()},5000)
}
function toggleMute(){
 if(!resident)return;var next=!Boolean(resident.silencioso),btn=el('cscMuteToggle');if(btn)btn.disabled=true;
 post('conecta_morador_preferencia_notificacao',{token:token,dispositivo:device(),silencioso:next?'SIM':'NAO'}).then(function(r){resident.silencioso=Boolean(r.silencioso);if(btn)btn.textContent=resident.silencioso?'🔕 Silenciado':'🔔 Avisos';showPortalToast(resident.silencioso?'Preferência silenciosa ativada. As notificações continuam chegando.':'Preferência de avisos sonoros reativada.')}).catch(function(e){showPortalToast(e.message)}).finally(function(){if(btn)btn.disabled=false})
}
function logout(){
 var t=token;clearSession();try{sessionStorage.removeItem('portalTacsAdminTokenV1');sessionStorage.removeItem('portalTacsTerritorioTokenV1')}catch(e){}
 if(t)post('conecta_morador_encerrar',{token:t,dispositivo:device()}).catch(function(){});
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
 var btn=el('cscNotificationEnable');if(btn)btn.disabled=true;gateStatus('Solicitando permissão neste aparelho…','');
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
 if(!queryFlag()){
  try{token=text(sessionStorage.getItem(TOKEN_KEY)||'')}catch(e){}
  if(!token)return;
 }else{
  try{token=text(sessionStorage.getItem(TOKEN_KEY)||'')}catch(e){}
  if(!token){location.replace('/atendimento-acs-farmaceutico/central-administrativa-tacs.html');return}
 }
 ensureStyle();gateMarkup();
 getSession().then(function(r){resident=r;prefill(r);topBar(r);renderFamily(r);if(onboardingFlag()||!r.notificacoesAtivas)showGate()}).catch(function(){clearSession();if(queryFlag())location.replace('/atendimento-acs-farmaceutico/central-administrativa-tacs.html')});
}
window.OneSignalDeferred=window.OneSignalDeferred||[];
window.OneSignalDeferred.push(function(os){oneSignal=os});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
