(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var DEVICE_KEY='portalTacsDispositivoV1';
var PROFILE_KEY='portalConectaMoradorQuickV1';
var UBS_PROFILE_KEY='portalConectaUbsQuickV1';
var RESIDENT_TOKEN_KEY='portalConectaMoradorTokenV1',UBS_TOKEN_KEY='portalConectaUbsTokenV1';
var AREA_KEY='portalTacsCentralAreaV1',LAST_ROLE_KEY='portalConectaLastRoleV1',TACS_QUICK_KEY='portalTacsAcessoRapidoV1';
var TRUST_ADMIN_KEY='portalConectaRecoveryTrustV1:admin',TRUST_TACS_KEY='portalConectaRecoveryTrustV1:tacs',TRUST_UBS_KEY='portalConectaRecoveryTrustV1:ubs';
var activeRole='admin',busy=false,pinWarmup=false,state={cpf:'',nascimento:'',nome:'',areaId:'',identidadeToken:''};

function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function el(id){return document.getElementById(id)}
var ACCESS_PROFILE_LABELS={
 ADMIN_TACS_UBS_MORADOR:'Administrador + TACS + UBS + Morador',
 ADMIN_TACS_UBS:'Administrador + TACS + UBS',
 ADMIN_UBS_MORADOR:'Administrador + UBS + Morador',
 TACS_UBS_MORADOR:'TACS + UBS + Morador',
 ADMIN_UBS:'Administrador + UBS',
 TACS_UBS:'TACS + UBS',
 UBS_MORADOR:'UBS + Morador',
 ADMIN_TACS_MORADOR:'Administrador + TACS + Morador',
 ADMIN_TACS:'Administrador + TACS',
 ADMIN_MORADOR:'Administrador + Morador',
 TACS_MORADOR:'TACS + Morador',
 TACS:'TACS',
 ADMIN:'Administrador',
 UBS:'UBS'
};
function accessProfileLabel(value){
 var key=text(value).toUpperCase().replace(/[+\s-]+/g,'_');
 return ACCESS_PROFILE_LABELS[key]||((key.indexOf('UBS')!==-1)?'UBS':((key.indexOf('TACS')!==-1)?'TACS':((key.indexOf('MORADOR')!==-1)?'Morador':'Administrador')));
}
function identityHeadline(nome,perfil){return (text(nome)||'—')+' — '+accessProfileLabel(perfil)}
function device(){var d='';try{d=localStorage.getItem(DEVICE_KEY)||''}catch(e){}if(!d){d='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);try{localStorage.setItem(DEVICE_KEY,d)}catch(e){}}return d}
function profile(){try{var p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return p&&/^cmq1\./.test(text(p.quickKey))?p:null}catch(e){return null}}
function ubsProfile(){try{var p=JSON.parse(localStorage.getItem(UBS_PROFILE_KEY)||'null');return p&&text(p.cadastroId)&&trustKey('UBS')?p:null}catch(e){return null}}
function rememberRole(role){role=text(role).toUpperCase();if(['ADMIN','TACS','MORADOR','UBS'].indexOf(role)===-1)return;try{localStorage.setItem(LAST_ROLE_KEY,role)}catch(e){}}
function saveProfile(r){try{localStorage.setItem(PROFILE_KEY,JSON.stringify({quickKey:r.quickKey,areaId:r.areaId||'',areaNome:r.areaNome||'',nome:r.nome||''}));rememberRole('MORADOR')}catch(e){}}
function saveSession(r){try{if(r&&r.token)sessionStorage.setItem(RESIDENT_TOKEN_KEY,r.token);if(r&&r.areaId)localStorage.setItem(AREA_KEY,r.areaId)}catch(e){}}
function saveUbsSession(r){try{if(r&&r.token)sessionStorage.setItem(UBS_TOKEN_KEY,r.token)}catch(e){}}
function trustStorageKey(role){role=text(role).toUpperCase();return role==='TACS'?TRUST_TACS_KEY:role==='UBS'?TRUST_UBS_KEY:TRUST_ADMIN_KEY}
function trustKey(role){try{return text(localStorage.getItem(trustStorageKey(role))||'')}catch(e){return''}}
function saveTrustKey(role,key){try{localStorage.setItem(trustStorageKey(role),text(key))}catch(e){}}
function saveUbsProfile(r){if(!r||!r.cadastroId)return;try{localStorage.setItem(UBS_PROFILE_KEY,JSON.stringify({cadastroId:text(r.cadastroId),perfil:text(r.perfil)||'UBS',unidadeId:text(r.unidadeId),funcaoUbs:text(r.funcaoUbs)}));if(r.chaveConfianca)saveTrustKey('UBS',r.chaveConfianca);rememberRole('UBS')}catch(e){}}
function hasTacsQuick(){try{return !!localStorage.getItem(TACS_QUICK_KEY)}catch(e){return false}}
function vaultHas(scope){try{var v=window.ConectaPinLocalV2;return Boolean(v&&typeof v.existe==='function'&&v.existe(scope))}catch(e){return false}}
function roleRecognized(role){
 role=text(role).toUpperCase();
 if(role==='MORADOR')return !!profile();
 if(role==='UBS')return !!ubsProfile();
 if(role==='TACS')return hasTacsQuick()||vaultHas('tacs')||!!trustKey('TACS');
 if(role==='ADMIN')return vaultHas('admin')||!!trustKey('ADMIN');
 return false;
}
function recognizedRole(){
 var last='';try{last=text(localStorage.getItem(LAST_ROLE_KEY)||'').toUpperCase()}catch(e){}
 if(last&&roleRecognized(last))return last.toLowerCase();
 var roles=['ADMIN','TACS','MORADOR','UBS'].filter(roleRecognized);
 return roles.length===1?roles[0].toLowerCase():'admin';
}
function recoveryProof(role){if(role==='MORADOR'){var p=profile();return p&&p.quickKey||''}return trustKey(role)}
function registerTrustedDevice(role){
 role=String(role||'').toUpperCase();if(role!=='ADMIN'&&role!=='TACS')return Promise.resolve(null);
 var payload={perfil:role,dispositivo:device()},admin='',territory='';
 try{admin=text(sessionStorage.getItem('portalTacsAdminTokenV1')||'');territory=text(sessionStorage.getItem('portalTacsTerritorioTokenV1')||'')}catch(e){}
 if(role==='TACS'){if(!territory)return Promise.resolve(null);payload.territorioToken=territory;payload.token=territory}else{if(!admin)return Promise.resolve(null);payload.token=admin}
 return post('conecta_recuperacao_registrar_aparelho',payload).then(function(r){if(r&&r.chaveConfianca)saveTrustKey(role,r.chaveConfianca);rememberRole(role);return r}).catch(function(){return null});
}
function registerTrustedDeviceFromSession(){
 var admin='',territory='';try{admin=text(sessionStorage.getItem('portalTacsAdminTokenV1')||'');territory=text(sessionStorage.getItem('portalTacsTerritorioTokenV1')||'')}catch(e){}
 if(territory&&!trustKey('TACS'))return registerTrustedDevice('TACS');
 if(admin&&!trustKey('ADMIN'))return registerTrustedDevice('ADMIN');
 return Promise.resolve(null);
}
function setStatus(msg,type){var n=el('loginStatus');if(!n)return;var value=text(msg);n.textContent=value;n.hidden=!value;n.className='status'+(type?' '+type:'')}
function requestId(prefix){return 'conecta_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(params){return new Promise(function(resolve,reject){var cb='__conecta_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null,new Error('A confirmação demorou demais. Tente novamente.'))},14000);function finish(data,err){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();err?reject(err):resolve(data)}window[cb]=function(d){finish(d,null)};s.onerror=function(){finish(null,new Error('Falha de comunicação.'))};params.callback=cb;params._=Date.now();s.src=API+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');document.head.appendChild(s)})}
function post(action,payload){if(busy)return Promise.reject(new Error('Aguarde a operação em andamento.'));busy=true;var id=requestId(action),body=new URLSearchParams(),fastPin=/(?:login_pin|criar_pin)$/.test(action),wait=fastPin?450:650;body.set('action',action);body.set('requestId',id);Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});var started=Date.now();return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function poll(){return jsonp({action:'conecta_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw new Error(r.result.message||'Não foi possível concluir a operação.')}if(Date.now()-started>30000)throw new Error('A operação demorou demais. Tente novamente.');if(fastPin)wait=Math.min(700,wait+80);return new Promise(function(resolve){setTimeout(resolve,wait)}).then(poll)})}).finally(function(){busy=false})}
function aquecerPinMorador(){
 if(pinWarmup)return;
 var warm=window.PortalTacsAdminWarmup;
 if(warm&&typeof warm.iniciar==='function'){
  pinWarmup=true;
  Promise.resolve(warm.iniciar()).catch(function(){}).finally(function(){pinWarmup=false});
  return;
 }
}

function ensureStyle(){
 if(el('cscUnifiedAccessStyle'))return;
 var s=document.createElement('style');s.id='cscUnifiedAccessStyle';s.textContent=
 '.login-tabs.csc-four{grid-template-columns:repeat(4,minmax(0,1fr))!important}.csc-access-panel{margin-top:4px}.csc-access-panel[hidden]{display:none!important}.csc-access-note{margin:10px 0;padding:12px 13px;border:1px solid var(--tacs-app-line,#2b5a76);border-radius:15px;background:rgba(255,255,255,.04);color:var(--tacs-app-muted,#adc4d2)}.csc-access-note strong{color:#fff}.csc-forgot{width:100%;min-height:48px;margin-top:11px;border:1px solid var(--tacs-app-line,#2b5a76);border-radius:15px;background:transparent;color:var(--tacs-app-accent2,#62c8e8);font-weight:850}.csc-inline-actions{display:grid;gap:9px;margin-top:13px}.csc-recovery{position:fixed;inset:0;z-index:60000;display:grid;place-items:end center;padding:16px;background:rgba(2,12,20,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.csc-recovery[hidden]{display:none!important}.csc-recovery-card{width:min(520px,100%);max-height:88svh;overflow:auto;border:1px solid var(--tacs-app-line,#2b5a76);border-radius:24px;background:var(--tacs-app-card,#102d46);padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.45);color:#fff}.csc-recovery-card h3{margin:0 0 8px;font-size:1.35rem}.csc-recovery-close{float:right;width:44px;height:44px;border:1px solid var(--tacs-app-line,#2b5a76);border-radius:14px;background:var(--tacs-app-top,#0b263d);color:#fff;font-size:1.4rem}.csc-first-name{font-weight:900;color:var(--tacs-app-accent,#83efa9)}@media(max-width:430px){.login-tabs.csc-four{gap:5px}.login-tabs.csc-four .tab{font-size:.78rem;padding:8px 3px}}';
 document.head.appendChild(s);
}
function addResidentTab(){
 var tabs=document.querySelector('.login-tabs'),tacs=el('tabTacs');if(!tabs||!tacs||el('tabMorador'))return;
 tabs.classList.add('csc-four');
 var b=document.createElement('button');b.id='tabMorador';b.type='button';b.className='tab';b.textContent='Morador';b.setAttribute('aria-selected','false');tabs.appendChild(b);
}
function addUbsTab(){
 var tabs=document.querySelector('.login-tabs');if(!tabs||el('tabUbs'))return;
 tabs.classList.add('csc-four');
 var b=document.createElement('button');b.id='tabUbs';b.type='button';b.className='tab';b.textContent='UBS';b.setAttribute('aria-selected','false');tabs.appendChild(b);
}
function ubsMarkup(){
 if(el('ubsLogin'))return;
 var box=document.createElement('div');box.id='ubsLogin';box.className='csc-access-panel';box.hidden=true;var p=ubsProfile();
 if(p){
  box.innerHTML='<div class="csc-access-note"><strong>Aparelho reconhecido para UBS</strong><br>Digite somente o seu PIN para confirmar este acesso.</div>'+field('cscUbsPin','PIN de acesso','type="password" inputmode="numeric" maxlength="8" autocomplete="off"')+'<div class="csc-inline-actions"><button class="btn green" id="cscUbsLogin" type="button">Entrar como UBS</button><button class="btn gray" id="cscUbsOther" type="button">Primeiro acesso de outra UBS</button></div><div id="cscUbsIdentity" class="csc-access-note" hidden></div>';
 }else{
  box.innerHTML='<div class="csc-access-note"><strong>Primeiro acesso da UBS</strong><br>O responsável precisa estar previamente cadastrado em Administrador / TACS / UBS. Informe CPF e PIN para confirmar sua identificação.</div>'+field('cscUbsCpf','CPF','type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"')+field('cscUbsPin','PIN de acesso','type="password" inputmode="numeric" maxlength="8" autocomplete="off"')+'<div class="csc-inline-actions"><button class="btn green" id="cscUbsIdentify" type="button">Identificar responsável da UBS</button></div><div id="cscUbsIdentity" class="csc-access-note" hidden></div>';
 }
 var anchor=el('moradorLogin')||el('tacsLogin');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);
}
function residentMarkup(){
 var box=document.createElement('div');box.id='moradorLogin';box.className='csc-access-panel';box.hidden=true;
 box.innerHTML='<div id="residentStage"></div>';
 var anchor=el('tacsLogin');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);
}
function recoveryMarkup(){
 if(el('cscForgotPin'))return;
 var p=document.createElement('button');p.id='cscForgotPin';p.type='button';p.className='csc-forgot';p.textContent='Esqueci meu PIN';
 var status=el('loginStatus');if(status&&status.parentNode)status.parentNode.insertBefore(p,status);
 var modal=document.createElement('div');modal.id='cscRecovery';modal.className='csc-recovery';modal.hidden=true;
 modal.innerHTML='<div class="csc-recovery-card" role="dialog" aria-modal="true" aria-labelledby="cscRecoveryTitle"><button type="button" class="csc-recovery-close" id="cscRecoveryClose" aria-label="Fechar">×</button><h3 id="cscRecoveryTitle">Recuperar PIN</h3><p id="cscRecoveryLead" class="muted">Confirme seu CPF para criar um novo PIN.</p><div id="cscRecoveryBody"></div></div>';
 document.body.appendChild(modal);
}
function resetState(){state={cpf:'',nascimento:'',nome:'',areaId:'',identidadeToken:''}}
function setTabs(role){
 activeRole=role;
 ['Admin','Tacs','Morador','Ubs'].forEach(function(k){var n=el('tab'+k);if(!n)return;var on=role===k.toLowerCase()||(k==='Tacs'&&role==='tacs')||(k==='Ubs'&&role==='ubs');n.classList.toggle('active',on);n.setAttribute('aria-selected',on?'true':'false')});
 var tabs=document.querySelector('.login-tabs');if(tabs){var visible=Array.prototype.filter.call(tabs.querySelectorAll('.tab'),function(x){return !x.hidden}).length||1;tabs.style.gridTemplateColumns='repeat('+visible+',minmax(0,1fr))'};
}
function showRole(role){
 setTabs(role);
 var a=el('adminLogin'),t=el('tacsLogin'),m=el('moradorLogin'),u=el('ubsLogin');
 if(a)a.hidden=role!=='admin';if(t)t.hidden=role!=='tacs';if(m)m.hidden=role!=='morador';if(u)u.hidden=role!=='ubs';
 var forgot=el('cscForgotPin');if(forgot)forgot.hidden=role==='ubs'||(role==='morador'&&adminResidentDiagnostic());
 if(role==='morador'){
  renderResidentStart();
  setStatus(adminResidentDiagnostic()?'Modo administrativo: consulte CPF ou CNS sem criar vínculo.':(profile()?'Aparelho reconhecido para Morador. Digite seu PIN de 4 números.':'Primeiro acesso: informe seu CPF.'),'');
 }
 if(role==='ubs')setStatus(ubsProfile()?'Aparelho reconhecido para UBS. Digite somente o seu PIN.':'Primeiro acesso UBS: confirme o cadastro do responsável.','');
 if(role==='admin'&&roleRecognized('ADMIN'))setStatus('Aparelho reconhecido para Administrador. Digite seu PIN.','');
 if(role==='tacs'&&roleRecognized('TACS'))setStatus('Aparelho reconhecido para TACS. Digite seu PIN individual.','');
}
function focusRoleField(role){
 var n=role==='admin'?el('adminPin'):role==='tacs'?el('tacsPin'):role==='ubs'?(el('cscUbsCpf')||el('cscUbsPin')):(el('cscResidentPin')||el('cscResidentCpf'));
 if(!n||n.disabled||n.hidden)return;
 try{n.focus({preventScroll:true})}catch(e){try{n.focus()}catch(_e){}}
}
function selectRoleFromTap(role,event){
 if(event&&typeof event.preventDefault==='function')event.preventDefault();
 showRole(role);
 focusRoleField(role);
}
function field(id,label,attrs){
 return '<label for="'+id+'">'+label+'</label><input class="field" id="'+id+'" '+(attrs||'')+'>';
}
function renderUbsAuthenticated(r){
 var out=el('cscUbsIdentity');if(!out)return;
 out.hidden=false;out.innerHTML='<strong>Identidade autenticada</strong><br><span class="csc-first-name">'+esc(identityHeadline(r.nome||'Responsável UBS',r.perfil||'UBS'))+'</span><br>'+esc(r.funcaoUbs||'Função não informada')+' • '+esc(r.unidadeId||'Unidade não informada');
}
function guardarUbsLocal(pin,r){
 var v=window.ConectaPinLocalV2;if(!v||typeof v.guardar!=='function'||!r)return Promise.resolve(false);
 return Promise.resolve(v.guardar('ubs',pin,{device:device(),cadastroId:r.cadastroId||'',snapshot:{nome:r.nome||'',perfil:r.perfil||'UBS',funcaoUbs:r.funcaoUbs||'',unidadeId:r.unidadeId||'',permissoes:Array.isArray(r.permissoes)?r.permissoes.slice():[]},salvoRemotoEm:Date.now()})).catch(function(){return false});
}
function identifyUbsFirstAccess(){
 var cpf=digits(el('cscUbsCpf')&&el('cscUbsCpf').value),pin=digits(el('cscUbsPin')&&el('cscUbsPin').value),out=el('cscUbsIdentity');
 if(cpf.length!==11){setStatus('Informe um CPF válido com 11 números.','err');return}
 if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN de acesso com 4 a 8 números.','err');return}
 setStatus('Confirmando o cadastro UBS…','warn');
 post('conecta_ubs_identificar_primeiro_acesso',{cpf:cpf,pin:pin,dispositivo:device()}).then(function(r){
  saveUbsProfile(r);saveUbsSession(r);renderUbsAuthenticated(r);
  if(el('cscUbsPin'))el('cscUbsPin').value='';
  setStatus(r.message||'Responsável UBS identificado e aparelho reconhecido.','ok');
  return guardarUbsLocal(pin,r);
 }).catch(function(e){if(out)out.hidden=true;setStatus(e.message,'err')});
}
function loginUbsSecondAccess(){
 var p=ubsProfile(),pin=digits(el('cscUbsPin')&&el('cscUbsPin').value),proof=trustKey('UBS'),out=el('cscUbsIdentity');
 if(!p||!proof){try{localStorage.removeItem(UBS_PROFILE_KEY);localStorage.removeItem(TRUST_UBS_KEY)}catch(e){};setStatus('Faça o primeiro acesso da UBS neste aparelho.','warn');setTimeout(function(){location.reload()},0);return}
 if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN de acesso com 4 a 8 números.','err');return}
 setStatus('Validando o PIN da UBS…','warn');
 post('conecta_ubs_login_pin',{pin:pin,dispositivo:device(),chaveConfianca:proof}).then(function(r){
  saveUbsProfile(r);saveUbsSession(r);renderUbsAuthenticated(r);
  if(el('cscUbsPin'))el('cscUbsPin').value='';
  setStatus('Acesso UBS validado.','ok');
  return guardarUbsLocal(pin,r);
 }).catch(function(e){if(out)out.hidden=true;setStatus(e.message,'err')});
}
function adminResidentDiagnostic(){return roleRecognized('ADMIN')}
function renderResidentStart(){
 var stage=el('residentStage');if(!stage)return;resetState();
 if(adminResidentDiagnostic()){
  try{sessionStorage.removeItem(RESIDENT_TOKEN_KEY)}catch(e){}
  stage.innerHTML='<div class="csc-access-note"><strong>Diagnóstico administrativo do Morador</strong><br>Consulte por CPF ou CNS. Este modo não cria PIN de Morador, não vincula este aparelho e não altera notificações.</div>'+
   field('cscResidentDiagnosticDoc','CPF ou CNS','type="text" inputmode="numeric" maxlength="18" autocomplete="off" placeholder="CPF (11) ou CNS (15 números)"')+
   '<div class="csc-inline-actions"><button class="btn green" id="cscResidentDiagnosticGo" type="button">Consultar morador</button></div><div id="cscResidentDiagnosticResult" class="csc-access-note" hidden></div>';
  bindResidentStage();return;
 }
 var p=profile();
 if(p){
  stage.innerHTML='<div class="csc-access-note"><strong>Aparelho reconhecido para Morador</strong><br>Digite somente o seu PIN para entrar.</div>'+field('cscResidentPin','PIN de 4 números','type="password" inputmode="numeric" maxlength="4" autocomplete="off"')+'<div class="csc-inline-actions"><button class="btn green" id="cscResidentLogin" type="button">Entrar</button><button class="btn gray" id="cscResidentOther" type="button">Primeiro acesso ou outro morador</button></div>';
 }else{
  stage.innerHTML=field('cscResidentCpf','CPF','type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"')+'<p class="muted">Se o CPF ainda não estiver no cadastro territorial, o Conecta localizará seu registro por data de nascimento e, quando necessário, nome completo.</p><div class="csc-inline-actions"><button class="btn green" id="cscResidentCpfNext" type="button">Continuar</button></div>';
 }
 bindResidentStage();
}
function bindResidentStage(){
 var pin=el('cscResidentPin');if(pin){pin.addEventListener('focus',aquecerPinMorador,{once:true});pin.addEventListener('input',aquecerPinMorador,{once:true})}
 var b=el('cscResidentDiagnosticGo');if(b)b.onclick=diagnoseResidentAdmin;
 b=el('cscResidentCpfNext');if(b)b.onclick=startCpf;
 b=el('cscResidentLogin');if(b)b.onclick=loginResident;
 b=el('cscResidentOther');if(b)b.onclick=function(){try{localStorage.removeItem(PROFILE_KEY)}catch(e){}renderResidentStart();setStatus('Informe o CPF para identificar o morador neste aparelho.','')};
 b=el('cscResidentIdentityNext');if(b)b.onclick=confirmIdentity;
 b=el('cscResidentAreaNext');if(b)b.onclick=function(){var s=el('cscResidentArea');state.areaId=s?text(s.value):'';confirmIdentity()};
 b=el('cscResidentIdentitySave');if(b)b.onclick=renderPinCreate;
 b=el('cscResidentPinCreate');if(b)b.onclick=createResidentPin;
}
function diagnoseResidentAdmin(){
 var input=el('cscResidentDiagnosticDoc'),doc=digits(input&&input.value),out=el('cscResidentDiagnosticResult'),proof=trustKey('ADMIN');
 if(doc.length!==11&&doc.length!==15){setStatus('Informe um CPF com 11 números ou CNS com 15 números.','err');return}
 if(!proof){setStatus('Este aparelho não possui reconhecimento administrativo seguro. Entre como Administrador primeiro.','err');return}
 setStatus('Consultando o cadastro sem criar vínculo…','warn');
 post('conecta_morador_diagnostico_admin',{documento:doc,dispositivo:device(),chaveConfianca:proof}).then(function(r){
  if(out){
   out.hidden=false;
   out.innerHTML='<strong>Consulta concluída — nenhum vínculo criado</strong><br><span class="csc-first-name">'+esc(r.nome||'Morador')+'</span>'+
    '<br>'+esc(r.areaNome||r.areaId||'Área não informada')+(r.unidadeId?' • '+esc(r.unidadeId):'')+
    '<br><small>'+esc(r.documentoTipo||'Documento')+' confirmado somente para diagnóstico.</small>';
  }
  setStatus('Diagnóstico administrativo concluído sem alterar aparelho, PIN ou notificações.','ok');
 }).catch(function(e){if(out)out.hidden=true;setStatus(e.message,'err')});
}
function startCpf(){
 var input=el('cscResidentCpf'),cpf=digits(input&&input.value);
 if(cpf.length!==11){setStatus('Informe um CPF válido com 11 números.','err');return}
 state.cpf=cpf;setStatus('Procurando seu cadastro territorial…','warn');
 post('conecta_morador_identificar',{cpf:cpf,dispositivo:device()}).then(handleIdentity).catch(function(e){setStatus(e.message,'err')});
}
function handleIdentity(r){
 if(r.identidadeToken){state.identidadeToken=r.identidadeToken;state.areaId=r.areaId||state.areaId;renderIdentityFound(r);return}
 if(r.precisaNascimento){renderIdentityForm(false,r.message);return}
 setStatus(r.message||'Não foi possível localizar o cadastro agora.','warn');
}
function renderIdentityForm(needName,message){
 var stage=el('residentStage');if(!stage)return;
 stage.innerHTML='<div class="csc-access-note">'+esc(message||'Confirme seus dados para localizar o cadastro existente.')+'</div>'+
 field('cscResidentBirth','Data de nascimento','type="text" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="DD/MM/AAAA" value="'+esc(state.nascimento)+'"')+
 (needName?field('cscResidentName','Nome completo','type="text" autocomplete="name" value="'+esc(state.nome)+'"'):'')+
 '<div class="csc-inline-actions"><button class="btn green" id="cscResidentIdentityNext" type="button">Localizar cadastro</button></div>';
 var birth=el('cscResidentBirth');if(birth)birth.addEventListener('input',function(){var d=digits(this.value).slice(0,8);this.value=d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d});
 bindResidentStage();
}
function confirmIdentity(){
 var birth=el('cscResidentBirth'),name=el('cscResidentName');
 if(birth)state.nascimento=text(birth.value);if(name)state.nome=text(name.value);
 setStatus('Conferindo o cadastro…','warn');
 post('conecta_morador_confirmar',{cpf:state.cpf,nascimento:state.nascimento,nome:state.nome,areaId:state.areaId,dispositivo:device()}).then(function(r){
  if(r.identidadeToken){state.identidadeToken=r.identidadeToken;state.areaId=r.areaId||state.areaId;renderIdentityFound(r);return}
  if(r.precisaNome){renderIdentityForm(true,r.message);return}
  if(r.precisaArea){renderAreaChoice(r);return}
  setStatus(r.message||'Não foi possível confirmar o cadastro.','warn');
 }).catch(function(e){setStatus(e.message,'err')});
}
function renderAreaChoice(r){
 var stage=el('residentStage'),areas=Array.isArray(r.areas)?r.areas:[];if(!stage)return;
 stage.innerHTML='<div class="csc-access-note"><strong>Seu atendimento não será bloqueado.</strong><br>'+esc(r.message||'Selecione sua área para continuar.')+'</div><label for="cscResidentArea">Comunidade / área</label><select class="field" id="cscResidentArea"><option value="">Selecione</option>'+areas.map(function(a){return '<option value="'+esc(a.areaId)+'">'+esc(a.areaNome||a.areaId)+'</option>'}).join('')+'</select><div class="csc-inline-actions"><button class="btn green" id="cscResidentAreaNext" type="button">Continuar</button></div>';
 bindResidentStage();
}
function renderIdentityFound(r){
 var stage=el('residentStage');if(!stage)return;
 stage.innerHTML='<div class="csc-access-note"><strong>'+esc(r.provisorio?'Cadastro pendente de conferência':'Cadastro localizado')+'</strong><br>'+esc(r.message||'Identificação concluída.')+(r.nome?'<br><span class="csc-first-name">'+esc(r.nome)+'</span>':'')+'</div><div class="csc-inline-actions"><button class="btn green" id="cscResidentIdentitySave" type="button">Salvar e continuar</button></div>';
 setStatus(r.provisorio?'Você pode continuar. A pendência foi enviada para o painel administrativo.':'CPF confirmado no cadastro.','ok');bindResidentStage();
}
function renderPinCreate(){
 var stage=el('residentStage');if(!stage)return;
 stage.innerHTML='<div class="csc-access-note"><strong>Crie seu PIN</strong><br>A partir do próximo acesso, serão necessários apenas estes 4 números.</div>'+field('cscResidentNewPin','Novo PIN','type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"')+field('cscResidentNewPin2','Confirmar PIN','type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"')+'<div class="csc-inline-actions"><button class="btn green" id="cscResidentPinCreate" type="button">Salvar PIN</button></div>';
 bindResidentStage();
}
function createResidentPin(){
 if(adminResidentDiagnostic()){setStatus('Aparelho administrativo não pode criar vínculo ou PIN de Morador.','err');return}
 var a=digits(el('cscResidentNewPin')&&el('cscResidentNewPin').value),b=digits(el('cscResidentNewPin2')&&el('cscResidentNewPin2').value);
 if(!/^\d{4}$/.test(a)||a!==b){setStatus('O PIN deve ter exatamente 4 números e os dois campos precisam ser iguais.','err');return}
 setStatus('Salvando seu acesso…','warn');
 post('conecta_morador_criar_pin',{identidadeToken:state.identidadeToken,pin:a,confirmacao:b,dispositivo:device()}).then(function(r){saveProfile(r);saveSession(r);setStatus('PIN salvo. Preparando o acesso rápido deste aparelho…','ok');var hook=window.ConectaMoradorPinLocalV2;return Promise.resolve(hook&&typeof hook.registrar==='function'?hook.registrar(a,r):null).then(function(){openResidentPortal(r,true)})}).catch(function(e){setStatus(e.message,'err')});
}
function loginResident(){
 if(adminResidentDiagnostic()){renderResidentStart();setStatus('Aparelho administrativo usa somente o diagnóstico sem vínculo.','warn');return}
 var p=profile(),pin=digits(el('cscResidentPin')&&el('cscResidentPin').value);if(!p){renderResidentStart();return}
 if(!/^\d{4}$/.test(pin)){setStatus('Digite seu PIN de 4 números.','err');return}
 setStatus('Validando seu PIN…','warn');
 post('conecta_morador_login_pin',{quickKey:p.quickKey,pin:pin,dispositivo:device()}).then(function(r){saveSession(r);setStatus('Acesso validado.','ok');var hook=window.ConectaMoradorPinLocalV2;return Promise.resolve(hook&&typeof hook.registrar==='function'?hook.registrar(pin,r):null).then(function(){openResidentPortal(r,!r.notificacoesAtivas)})}).catch(function(e){setStatus(e.message,'err')});
}
function openResidentPortal(r,onboarding){
 var area=encodeURIComponent(r.areaId||profile()&&profile().areaId||'JAPARANDUBA');
 var url='/atendimento-acs-farmaceutico/?area='+area+'&conecta=1'+(onboarding?'&onboarding=1':'');
 setTimeout(function(){location.assign(url)},0);
}

function currentRecoveryRole(){return activeRole==='tacs'?'TACS':activeRole==='morador'?'MORADOR':activeRole==='ubs'?'UBS':'ADMIN'}
function openRecovery(){
 var modal=el('cscRecovery'),body=el('cscRecoveryBody'),role=currentRecoveryRole();if(!modal||!body)return;
 modal.hidden=false;body.innerHTML='<div class="csc-access-note">Perfil: <strong>'+esc(role==='ADMIN'?'Administrador':role==='TACS'?'TACS — Agente Comunitário de Saúde':'Morador')+'</strong></div>'+field('cscRecoveryCpf','CPF','type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"')+'<div class="csc-inline-actions"><button class="btn green" id="cscRecoveryStart" type="button">Confirmar CPF</button></div>';
 el('cscRecoveryStart').onclick=function(){var cpf=digits(el('cscRecoveryCpf').value),proof=recoveryProof(role);if(cpf.length!==11){setRecoveryMessage('Informe um CPF válido com 11 números.','err');return}if(!proof){setRecoveryMessage('Este aparelho ainda não possui um vínculo seguro para recuperar o PIN deste perfil. Use um aparelho já reconhecido ou solicite a redefinição pelo administrador responsável.','err');return}setRecoveryMessage('Conferindo CPF e aparelho…','warn');post('conecta_pin_recuperar_iniciar',{perfil:role,cpf:cpf,dispositivo:device(),chaveConfianca:proof,quickKey:proof}).then(renderRecoveryPin).catch(function(e){setRecoveryMessage(e.message,'err')})};
}
function setRecoveryMessage(msg,type){var lead=el('cscRecoveryLead');if(!lead)return;lead.textContent=msg;lead.className='status'+(type?' '+type:'')}
function renderRecoveryPin(r){
 var body=el('cscRecoveryBody');if(!body)return;
 setRecoveryMessage('CPF confirmado. Crie um novo PIN.','ok');
 body.innerHTML=field('cscRecoveryPin','Novo PIN de 4 números','type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"')+field('cscRecoveryPin2','Confirmar novo PIN','type="password" inputmode="numeric" maxlength="4" autocomplete="new-password"')+'<div class="csc-inline-actions"><button class="btn green" id="cscRecoverySave" type="button">Salvar novo PIN</button></div>';
 el('cscRecoverySave').onclick=function(){var a=digits(el('cscRecoveryPin').value),b=digits(el('cscRecoveryPin2').value);if(!/^\d{4}$/.test(a)||a!==b){setRecoveryMessage('O PIN deve ter 4 números e a confirmação deve ser igual.','err');return}setRecoveryMessage('Salvando novo PIN…','warn');post('conecta_pin_recuperar_salvar',{recuperacaoToken:r.recuperacaoToken,pin:a,confirmacao:b,dispositivo:device()}).then(function(x){var hook=window.ConectaMoradorPinLocalV2;if(hook&&typeof hook.removerPerfil==='function')hook.removerPerfil(currentRecoveryRole());setRecoveryMessage(x.message||'PIN atualizado.','ok');setTimeout(closeRecovery,900)}).catch(function(e){setRecoveryMessage(e.message,'err')})};
}
function closeRecovery(){var m=el('cscRecovery');if(m)m.hidden=true;var lead=el('cscRecoveryLead');if(lead){lead.textContent='Confirme seu CPF para criar um novo PIN.';lead.className='muted'}}

function install(){
 var tacsOnly=false;try{tacsOnly=String(new URLSearchParams(location.search).get('acesso')||'').toLowerCase()==='tacs'&&!roleRecognized('ADMIN')}catch(e){}
 ensureStyle();addResidentTab();residentMarkup();addUbsTab();ubsMarkup();recoveryMarkup();
 var tabs=document.querySelector('.login-tabs');if(tabs)tabs.classList.add('csc-four');
 var a=el('tabAdmin'),t=el('tabTacs'),m=el('tabMorador'),u=el('tabUbs');
 if(a)a.addEventListener('click',function(e){selectRoleFromTap('admin',e)});
 if(t)t.addEventListener('click',function(e){selectRoleFromTap('tacs',e)});
 if(m)m.addEventListener('click',function(e){selectRoleFromTap('morador',e)});
 if(u)u.addEventListener('click',function(e){selectRoleFromTap('ubs',e)});
 var ubsIdentify=el('cscUbsIdentify');if(ubsIdentify)ubsIdentify.addEventListener('click',identifyUbsFirstAccess);
 var ubsLogin=el('cscUbsLogin');if(ubsLogin)ubsLogin.addEventListener('click',loginUbsSecondAccess);
 var ubsOther=el('cscUbsOther');if(ubsOther)ubsOther.addEventListener('click',function(){try{localStorage.removeItem(UBS_PROFILE_KEY);localStorage.removeItem(TRUST_UBS_KEY)}catch(e){}location.reload()});
 var forgot=el('cscForgotPin');if(forgot)forgot.addEventListener('click',openRecovery);
 var close=el('cscRecoveryClose');if(close)close.addEventListener('click',closeRecovery);
 if(el('loginPanel')&&!el('loginPanel').hidden)showRole(tacsOnly?'tacs':recognizedRole());
 setTimeout(registerTrustedDeviceFromSession,700);
 window.addEventListener('pageshow',function(){setTabs(activeRole);setTimeout(registerTrustedDeviceFromSession,250)});
}
window.ConectaAcessoUnificado={showRole:showRole,profile:profile,ubsProfile:ubsProfile,registrarAparelho:registerTrustedDevice,marcarPerfil:rememberRole,perfilReconhecido:recognizedRole};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
