(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1',CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV2';
var SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';
var URL_PARAMS=new URLSearchParams(location.search),TACS_ONLY=String(URL_PARAMS.get('acesso')||'').toLowerCase()==='tacs';
var token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||''),territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='';
if(!device){device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,device)}
function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){var n=el('loginStatus');n.textContent=msg;n.className='status'+(type?' '+type:'')}
function requestId(prefix){return 'central_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function marcarConexaoRecente(){try{localStorage.setItem(SHARED_WARM_KEY,String(Date.now()))}catch(e){}}
function session(extra){var out={dispositivo:device};if(mode==='tacs'&&territoryToken)out.territorioToken=territoryToken;else if(token)out.token=token;if(selectedAreaId)out.areaId=selectedAreaId;Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});return out}
function applyUiStandard(doc){
  try{
    if(!doc||!doc.documentElement||!doc.head||!doc.body)return;
    var root=doc.documentElement,style=doc.getElementById('portalTacsUiStandardV2Style');
    if(!style){
      style=doc.createElement('style');style.id='portalTacsUiStandardV2Style';style.textContent='\
:root{--tacs-petroleo:#073a55;--tacs-petroleo-2:#0b5878;--tacs-borda:#69c7e7}\
html,body{max-width:100%;overflow-x:hidden}\
.panel,.list,.card,.area-row,details,summary{min-width:0}\
.card summary>div,details summary>div:first-child{min-width:0;flex:1 1 auto}\
.card h3,.sub,.area-row strong,.area-row .sub,summary strong,summary span:not(.signal){overflow-wrap:anywhere;word-break:break-word}\
.signal{flex:0 0 auto!important;max-width:100%;margin-left:auto;white-space:normal!important;overflow-wrap:anywhere}\
input,select,textarea,button{max-width:100%}\
#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste,.contrasteBotao,.preferenciaVisual{display:none!important}\
#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1{display:none!important}\
.btn.green,.botao.verde{background:linear-gradient(145deg,var(--tacs-petroleo),var(--tacs-petroleo-2))!important;color:#fff!important}\
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:4px solid #ffd54f!important;outline-offset:2px!important}\
@media(max-width:430px){.card summary{align-items:flex-start!important}.signal{margin-top:2px}}';
      doc.head.appendChild(style);
    }
    root.classList.remove('tacs-high-contrast','high-contrast');
    ['portalTacsContrastToggleV1','contrastToggle','alternarContraste'].forEach(function(id){var n=doc.getElementById(id);if(n)n.hidden=true});
    doc.querySelectorAll('.contrasteBotao,.preferenciaVisual').forEach(function(n){n.hidden=true});
  }catch(e){}
}
function jsonp(action,params,cb){var name='__central_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false,timer=setTimeout(function(){finish({ok:false,temporario:true,message:'Consulta temporariamente indisponível.'})},6500);function finish(r){if(done)return;done=true;clearTimeout(timer);try{delete window[name]}catch(e){window[name]=undefined}if(s.parentNode)s.remove();if(r&&r.ok===true)marcarConexaoRecente();cb(r)}window[name]=finish;s.async=true;s.onerror=function(){finish({ok:false,temporario:true,message:'Falha de rede ao consultar o servidor.'})};var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'_='+Date.now()];Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});s.src=API+'?'+q.join('&');document.head.appendChild(s)}
function finishPost(result){if(!active)return;var op=active;active=null;clearTimeout(op.timeout);clearTimeout(op.pollTimer);clearTimeout(op.submitTimer);if(op.form&&op.form.parentNode)op.form.remove();if(op.frame&&op.frame.parentNode)setTimeout(function(){if(op.frame.parentNode)op.frame.remove()},180);var finalResult=result||{ok:false,message:'Resposta vazia.'};if(finalResult&&finalResult.ok===true)marcarConexaoRecente();op.cb(finalResult)}
window.addEventListener('message',function(event){if(!active||!active.frame||event.source!==active.frame.contentWindow)return;var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}if(!d||typeof d!=='object')return;var rid=text(d.requestId||(d.result&&d.result.requestId));if(rid&&rid!==active.id)return;var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));if(r)finishPost(r)});
function schedulePoll(){if(!active)return;clearTimeout(active.pollTimer);active.pollTimer=setTimeout(poll,active.nextWait)}
function poll(){if(!active)return;var op=active;jsonp(op.resultAction,{requestId:op.id},function(r){if(!active||active.id!==op.id)return;if(r&&r.ok===true&&r.pendente===false){finishPost(r.result);return}if(Date.now()>=op.deadline){finishPost({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'});return}op.nextWait=Math.min(1600,Math.max(550,op.nextWait+150));schedulePoll()})}
function post(action,payload,resultAction,cb){
  if(active){cb({ok:false,message:'Aguarde a operação anterior.'});return}
  var rid=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form'),frameName='centralFrame'+Date.now()+'_'+Math.floor(Math.random()*1000),fields={};
  Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
  fields.action=action;fields.requestId=rid;
  var access=/^(admin_login|admin_territorio_login_pin|admin_territorio_dados|admin_logout|admin_territorio_encerrar_sessao)$/.test(text(action));
  var duration=access?32000:60000;
  frame.name=frameName;frame.setAttribute('name',frameName);frame.src='about:blank';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;visibility:hidden;pointer-events:none;z-index:-1';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.setAttribute('target',frameName);form.style.display='none';
  Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
  active={id:rid,action:action,frame:frame,form:form,resultAction:resultAction,cb:cb,pollTimer:null,submitTimer:null,nextWait:450,deadline:Date.now()+duration,timeout:setTimeout(function(){finishPost({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'})},duration+500)};
  document.body.appendChild(frame);document.body.appendChild(form);
  var sent=false;
  function sendOnce(){
    if(sent||!active||active.id!==rid)return;
    sent=true;clearTimeout(active.submitTimer);active.submitTimer=null;
    try{form.submit()}catch(e){finishPost({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
    schedulePoll();
  }
  function sendAfterRegistration(){
    if(typeof window.requestAnimationFrame==='function'){window.requestAnimationFrame(function(){window.requestAnimationFrame(sendOnce)});return}
    setTimeout(sendOnce,60);
  }
  frame.addEventListener('load',sendAfterRegistration,{once:true});
  sendAfterRegistration();
  active.submitTimer=setTimeout(sendOnce,180);
}
function warmupServer(){try{jsonp('admin_status',{},function(){})}catch(e){}}
function showLogin(kind){var admin=!TACS_ONLY&&kind==='admin';el('adminLogin').hidden=!admin;el('tacsLogin').hidden=admin;el('tabAdmin').hidden=TACS_ONLY;el('tabAdmin').classList.toggle('active',admin);el('tabTacs').classList.toggle('active',!admin);el('tabTacs').parentNode.style.gridTemplateColumns=TACS_ONLY?'1fr':'1fr 1fr';if(TACS_ONLY)setStatus('Entre como TACS da sua área.','')}
function permission(name){if(mode==='admin')return true;var tacs=context&&Array.isArray(context.tacs)?context.tacs[0]:null;var list=tacs&&Array.isArray(tacs.permissoes)?tacs.permissoes:[];return list.indexOf(name)!==-1}
function selectedArea(){var list=context&&Array.isArray(context.areas)?context.areas:[];for(var i=0;i<list.length;i++)if(normArea(list[i].areaId)===selectedAreaId)return list[i];return list[0]||null}
function saveContextCache(){
  try{
    if(!context)return;
    sessionStorage.setItem(CONTEXT_CACHE_KEY,JSON.stringify({
      context:context,
      mode:mode,
      selectedAreaId:selectedAreaId,
      savedAt:Date.now()
    }));
  }catch(e){}
}
function restoreContextCache(){
  try{
    if(!(token||territoryToken))return false;
    var raw=sessionStorage.getItem(CONTEXT_CACHE_KEY);
    if(!raw)return false;
    var saved=JSON.parse(raw);
    if(!saved||!saved.context||!Array.isArray(saved.context.areas)||!saved.context.areas.length)return false;
    context=saved.context;
    mode=territoryToken?'tacs':(token?'admin':(saved.mode||''));
    selectedAreaId=normArea(saved.selectedAreaId||selectedAreaId);
    renderContext(true);
    setStatus('Sessão restaurada. Atualizando os dados…','ok');
    return true;
  }catch(e){return false}
}
function responsible(area){var list=context&&Array.isArray(context.tacs)?context.tacs:[];for(var i=0;i<list.length;i++)if(text(list[i].tacsId)===text(area&&area.tacsId))return list[i];return mode==='tacs'?(list[0]||null):null}
function renderContext(skipHealth){var areas=context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&a.ativa!==false}):[];if(!areas.length){setStatus('Nenhuma área ativa foi devolvida pelo servidor.','err');return}var stored='';try{stored=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}if(mode==='tacs')selectedAreaId=normArea(areas[0].areaId);else if(!selectedAreaId){selectedAreaId=areas.some(function(a){return normArea(a.areaId)===stored})?stored:(areas.some(function(a){return normArea(a.areaId)==='JAPARANDUBA'})?'JAPARANDUBA':normArea(areas[0].areaId))}var area=selectedArea(),tacs=responsible(area);var profileIcon=el('profileIcon');if(profileIcon){profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';}el('profileLabel').textContent=mode==='tacs'?'TACS • acesso da própria área':'ADMINISTRADOR GERAL';el('professionalName').textContent=text(tacs&&tacs.nomeCompleto)||(mode==='admin'?'Administração geral':'TACS');el('areaName').textContent=text(area&&area.areaNome)||selectedAreaId;el('unitName').textContent=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'Unidade não informada';el('identityPanel').hidden=false;el('healthPanel').hidden=false;el('modulesPanel').hidden=false;el('loginPanel').hidden=true;var box=el('adminAreaBox'),select=el('adminArea');box.hidden=mode!=='admin'||areas.length<2;select.innerHTML=areas.map(function(a){return'<option value="'+esc(normArea(a.areaId))+'">'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('');select.value=selectedAreaId;renderModules();if(!skipHealth)refreshHealth()}
function renderModules(){document.querySelectorAll('.module').forEach(function(btn){var adminOnly=btn.dataset.adminOnly==='true',perm=btn.dataset.permission||'',allowed=!adminOnly||mode==='admin';if(perm)allowed=allowed&&permission(perm);if(btn.dataset.module==='portal')allowed=true;btn.hidden=!allowed;btn.classList.toggle('locked',!allowed);btn.disabled=!allowed})}
function markHealth(id,label,state){var n=el(id),s=n.querySelector('span');n.className='health-card'+(state?' '+state:'');s.textContent=label}
function refreshHealth(){if(!context)return;['healthPortal','healthResidents','healthAgenda','healthContent','healthNotifications'].forEach(function(id){markHealth(id,'Verificando…','')});var area=selectedArea();markHealth('healthArea',(text(area&&area.areaNome)||selectedAreaId)+' • '+(text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'unidade'),'ok');jsonp('portal_manutencao_status',{areaId:selectedAreaId},function(r){if(r&&r.ok===true)markHealth('healthPortal',r.ativa?'Em manutenção':'Disponível',r.ativa?'warn':'ok');else markHealth('healthPortal','Sem confirmação','warn')});post('admin_moradores_status',session(),'admin_moradores_result',function(r){markHealth('healthResidents',r&&r.ok===true?'Base acessível':'Falha na leitura',r&&r.ok===true?'ok':'err');if(permission('PUBLICACOES_GERENCIAR')){post('admin_notificacoes_saude',session(),'admin_notificacoes_saude_result',function(nr){if(nr&&nr.ok===true){var c=nr.contagens||{};var label=Number(c.ativos||0)+' aptos • '+Number(c.inativos||0)+' inativos • '+Number(c.reparo||c.precisamReparo||0)+' reparo';markHealth('healthNotifications',label,(Number(c.inativos||0)||Number(c.reparo||c.precisamReparo||0))?'warn':'ok')}else markHealth('healthNotifications','Sem confirmação','warn')})}else markHealth('healthNotifications','Sem permissão','warn')});jsonp('painel_publico',{areaId:selectedAreaId},function(r){markHealth('healthAgenda',r&&r.ok===true?'Agenda pública acessível':'Sem confirmação',r&&r.ok===true?'ok':'warn')});jsonp('publico_conteudo',{areaId:selectedAreaId},function(r){markHealth('healthContent',r&&r.ok===true?'Conteúdo acessível':'Sem confirmação',r&&r.ok===true?'ok':'warn')});el('healthUpdated').textContent='Atualização solicitada agora • área '+(text(area&&area.areaNome)||selectedAreaId)}
function moduleUrl(name){var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260823-recados-safari-render-v1';if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision;if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v='+revision;if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v='+revision;if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?v='+revision;if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;return ''}
function openModule(name,title){var url=moduleUrl(name);if(!url)return;if(name==='portal'){window.open(url,'_blank','noopener');return}var sep=url.indexOf('?')===-1?'?':'&';url=url+sep+'_cb='+Date.now();el('viewerTitle').textContent=title||'Painel';el('viewerFrame').src=url;el('viewer').hidden=false;document.body.classList.add('viewer-open')}
function closeViewer(){el('viewer').hidden=true;el('viewerFrame').src='about:blank';document.body.classList.remove('viewer-open');refreshHealth()}
function loadContext(message){post('admin_territorio_dados',session(),'admin_territorio_result',function(r){if(!r||r.ok!==true){token='';territoryToken='';mode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);el('loginPanel').hidden=false;el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;setStatus(text(r&&r.message)||'A sessão não pôde ser reutilizada. Entre novamente.','warn');return}context=r;mode=r.perfil==='TACS'?'tacs':'admin';saveContextCache();setStatus(message||'Acesso validado.','ok');renderContext(false)})}
function logout(){if(!(token||territoryToken)){location.reload();return}var action=mode==='tacs'?'admin_territorio_encerrar_sessao':'admin_logout';post(action,session(),mode==='tacs'?'admin_territorio_result':'admin_result',function(){token='';territoryToken='';mode='';context=null;selectedAreaId='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.removeItem(CONTEXT_CACHE_KEY);location.reload()})}
el('tabAdmin').addEventListener('click',function(){if(!TACS_ONLY)showLogin('admin')});el('tabTacs').addEventListener('click',function(){showLogin('tacs')});
el('loginAdmin').addEventListener('click',function(){var pin=digits(el('adminPin').value);if(!/^\d{4,8}$/.test(pin)){setStatus('Digite um PIN administrativo de 4 a 8 números.','err');return}setStatus('Validando o acesso…','warn');post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){el('adminPin').value='';if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=r.token;mode='admin';sessionStorage.setItem(TOKEN_KEY,token);loadContext('Administrador validado.')})});
el('loginTacs').addEventListener('click',function(){var pin=digits(el('tacsPin').value);if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}setStatus('Validando seu PIN…','warn');post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){el('tacsPin').value='';if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=r.token;mode='tacs';selectedAreaId=normArea(r.areaId);sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);loadContext('Acesso individual validado para '+(text(r.areaNome)||r.areaId)+'.')})});
el('adminArea').addEventListener('change',function(){if(mode!=='admin')return;selectedAreaId=normArea(this.value);try{localStorage.setItem(AREA_KEY,selectedAreaId)}catch(e){}renderContext()});el('refreshHealth').addEventListener('click',refreshHealth);el('logout').addEventListener('click',logout);el('viewerBack').addEventListener('click',closeViewer);
el('viewerFrame').addEventListener('load',function(){try{applyUiStandard(el('viewerFrame').contentDocument)}catch(e){}});
el('moduleGrid').addEventListener('click',function(e){var btn=e.target.closest('.module');if(!btn||btn.disabled||btn.hidden)return;openModule(btn.dataset.module,btn.querySelector('strong').textContent)});
/* CENTRAL_RETURN_R6: restaura imediatamente o conteúdo ao voltar pelo histórico/BFCache do iPhone. */
window.addEventListener('pageshow',function(){
  token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||'');
  territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
  mode=territoryToken?'tacs':(token?'admin':'');
  document.body.classList.remove('viewer-open');
  var viewer=el('viewer');if(viewer)viewer.hidden=true;
  var frame=el('viewerFrame');if(frame&&frame.src!=='about:blank')frame.src='about:blank';
  if(token||territoryToken){
    if(context)renderContext(true);
    else restoreContextCache();
    setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},140);
  }
});
applyUiStandard(document);
if(token||territoryToken){var restored=restoreContextCache();if(!restored)setStatus('Conferindo a sessão existente…','warn');setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},restored?120:0)}else{warmupServer();showLogin(TACS_ONLY?'tacs':'admin')}
}());
