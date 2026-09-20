(function(){
'use strict';
if(window.ConectaMoradorPinLocalV2)return;

var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var PROFILE_KEY='portalConectaMoradorQuickV1';
var TOKEN_KEY='portalConectaMoradorTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var AREA_KEY='portalTacsCentralAreaV1';
var BOOTSTRAP_KEY='portalConectaMoradorBootstrapV2';
var BG_REQUEST_KEY='portalConectaMoradorLoginRequestV2';

function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(e){return null}}
function device(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
function vault(){var v=window.ConectaPinLocalV2;return v&&typeof v.abrir==='function'&&typeof v.guardar==='function'?v:null}
function bootstrap(snapshot){try{sessionStorage.setItem(BOOTSTRAP_KEY,JSON.stringify(snapshot||{}))}catch(e){}}
function openPortal(data){
  var area=encodeURIComponent(text(data&&data.areaId)||text(profile()&&profile().areaId)||'JAPARANDUBA');
  var onboarding=data&&data.notificacoesAtivas===true?'':'&onboarding=1';
  location.assign('/atendimento-acs-farmaceutico/?area='+area+'&conecta=1'+onboarding);
}
function backgroundLogin(p,pin){
  if(!p||!p.quickKey||!device())return '';
  var id='conecta_morador_bg_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  var body=new URLSearchParams();
  body.set('action','conecta_morador_login_pin');body.set('requestId',id);
  body.set('quickKey',p.quickKey);body.set('pin',pin);body.set('dispositivo',device());
  try{sessionStorage.setItem(BG_REQUEST_KEY,id)}catch(e){}
  try{
    fetch(API+'?_='+Date.now(),{
      method:'POST',mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString(),cache:'no-store',keepalive:true
    }).catch(function(){});
  }catch(e){}
  return id;
}
function snapshotFrom(r){
  var p=profile()||{};
  return {
    perfil:'MORADOR',
    areaId:text(r&&r.areaId)||text(p.areaId),
    areaNome:text(r&&r.areaNome)||text(p.areaNome),
    nome:text(r&&r.nome)||text(p.nome),
    cpf:text(r&&r.cpf)||text(p.cpf),
    nascimento:text(r&&r.nascimento)||text(p.nascimento),
    endereco:text(r&&r.endereco||r&&r.localidade)||text(p.localidade),
    notificacoesAtivas:Boolean(r&&r.notificacoesAtivas===true),
    silencioso:Boolean(r&&r.silencioso===true),
    provisorio:Boolean(r&&r.provisorio===true),
    pendenciaId:text(r&&r.pendenciaId),
    familiaId:text(r&&r.familiaId),
    familia:Array.isArray(r&&r.familia)?r.familia.slice():[]
  };
}
function registrar(pin,r,snapshot){
  var v=vault(),p=profile()||{},snap=snapshot&&typeof snapshot==='object'?snapshot:snapshotFrom(r);
  if(!v||!r||!r.token)return Promise.resolve(false);
  bootstrap(snap);
  return Promise.resolve(v.guardar('morador',pin,{
    device:device(),quickKey:text(r.quickKey)||text(p.quickKey),
    areaId:text(r.areaId)||text(p.areaId),areaNome:text(r.areaNome)||text(p.areaNome),
    snapshot:snap,salvoRemotoEm:Date.now()
  })).catch(function(){return false});
}
function remover(){var v=vault();if(v&&typeof v.remover==='function')v.remover('morador')}

document.addEventListener('click',function(event){
  var target=event.target&&event.target.closest?event.target.closest('#cscResidentLogin'):null;
  if(!target)return;
  if(target.dataset.pinLocalBypass==='1'){delete target.dataset.pinLocalBypass;return}
  var input=document.getElementById('cscResidentPin'),pin=digits(input&&input.value),p=profile(),v=vault();
  if(!v||!p||!/^\d{4}$/.test(pin))return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  Promise.resolve(v.abrir('morador',pin)).then(function(saved){
    if(!saved||text(saved.device)!==device()||(saved.quickKey&&text(saved.quickKey)!==text(p.quickKey))){
      target.dataset.pinLocalBypass='1';target.click();return;
    }
    try{sessionStorage.removeItem(TOKEN_KEY);if(saved.areaId)localStorage.setItem(AREA_KEY,saved.areaId)}catch(e){}
    bootstrap(saved.snapshot||snapshotFrom(saved));
    backgroundLogin(p,pin);
    if(input)input.value='';
    openPortal(saved.snapshot||saved);
  }).catch(function(){
    target.dataset.pinLocalBypass='1';target.click();
  });
},true);

document.addEventListener('click',function(event){
  var other=event.target&&event.target.closest?event.target.closest('#cscResidentOther'):null;
  if(other)remover();
},true);

window.ConectaMoradorPinLocalV2={
  registrar:registrar,
  remover:remover,
  removerPerfil:function(role){var r=String(role||'').toUpperCase(),v=vault(),scope=r==='TACS'?'tacs':r==='ADMIN'?'admin':'morador';if(v&&typeof v.remover==='function')v.remover(scope)},
  bootstrap:bootstrap
};
}());

/* CORRECAO_CACHE_FIRST_PAINEIS_20260917_V7
   Bloco passivo. Não intercepta pointerdown, touchstart ou click dos módulos.
   O shell oficial continua sendo o único dono da navegação. Este bloco apenas:
   1) corrige o fluxo/recorte visual da Central;
   2) quando o shell oficial já abriu um painel, substitui a prévia genérica por cache confirmado;
   3) deixa o Apps Script e o próprio shell substituírem a prévia quando os dados reais chegam.
   Não altera PIN, sessão, áreas, permissões, agendas, escrita ou backend. */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/central-administrativa-tacs\.html$/i.test(String(location.pathname||'')))return;
if(window.ConectaCacheFirstPanels20260917V7)return;

var CONTEXT_KEY='portalConectaModuleCoreV1',PERF_PREFIX='portalConectaModulePerfV1:';
var state={module:'',observer:null,timer:0};
window.ConectaCacheFirstPanels20260917V7=state;

function t(v){return String(v==null?'':v).trim()}
function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function b(v){if(v===true||v===1)return true;return['true','1','sim','yes','ativo'].indexOf(t(v).toLowerCase())!==-1}
function n(v){var x=Number(v);return Number.isFinite(x)?x:0}
function a(v){return t(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function ctx(){try{var x=JSON.parse(sessionStorage.getItem(CONTEXT_KEY)||'null');return x&&x.schemaVersion===1?x:null}catch(err){return null}}
function mode(){var x=ctx();return t(x&&x.mode).toLowerCase()}
function area(){var x=ctx(),id=a(x&&x.area&&x.area.areaId);if(id)return id;try{id=a(localStorage.getItem('portalTacsCentralAreaV1')||'')}catch(err){}return id||'JAPARANDUBA'}
function perf(name){
  var m=mode(),id=area(),key=PERF_PREFIX+(m||'anon')+':'+id+':'+name;
  try{
    var raw=localStorage.getItem(key)||sessionStorage.getItem(key)||'',item=JSON.parse(raw||'null');
    if(!item||!item.data||t(item.mode).toLowerCase()!==m||a(item.areaId)!==id)return null;
    if(item.schemaVersion!==1&&item.schemaVersion!==2)return null;
    return{data:item.data,confirmedAt:Number(item.confirmedAt||item.savedAt||0)};
  }catch(err){return null}
}
function fmt(ms){if(!ms)return'';try{return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch(err){return''}}
function metric(value,label){return'<div class="csc-cf-metric"><strong>'+e(value)+'</strong><span>'+e(label)+'</span></div>'}
function metrics(items){return'<div class="csc-cf-metrics">'+items.map(function(x){return metric(x[0],x[1])}).join('')+'</div>'}
function countActive(list,key){return(Array.isArray(list)?list:[]).filter(function(x){return b(x&&x[key])}).length}
function rows(list,mapper){list=Array.isArray(list)?list.slice(0,4):[];if(!list.length)return'';return'<div class="csc-cf-list">'+list.map(function(item){var x=mapper(item)||{};return'<div class="csc-cf-row"><strong>'+e(x.title||'Registro')+'</strong>'+(x.sub?'<span>'+e(x.sub)+'</span>':'')+'</div>'}).join('')+'</div>'}
function note(item){var time=fmt(item&&item.confirmedAt);return'<div class="csc-cf-note"><strong>Dados disponíveis no aparelho.</strong> '+(time?'Última confirmação '+e(time)+' • ':'')+'sincronizando em segundo plano.</div>'}
function cachedHtml(name){
  var item=null,d=null,body='';
  if(name==='agendas'){
    item=perf('agendas');if(!item)return'';d=item.data||{};var ag=Array.isArray(d.agendas)?d.agendas:[],pr=Array.isArray(d.profissionais)?d.profissionais:[];
    body=metrics([[ag.length,'Agendas'],[countActive(ag,'ATIVO'),'Ativas'],[pr.length,'Profissionais'],[ag.reduce(function(s,x){return s+n(x&&x.VAGAS_COMUNS)+n(x&&x.VAGAS_EMERGENCIAIS)},0),'Vagas configuradas']])+rows(ag,function(x){return{title:t(x&&x.DIA)||t(x&&x.MODULO)||'Agenda',sub:[t(x&&x.HORARIO),t(x&&x.SITUACAO)].filter(Boolean).join(' • ')}});
  }else if(name==='moradores'){
    item=perf('moradores-base');if(!item)return'';d=item.data||{};
    body=metrics([[n(d.totalRegistros),'Moradores'],[d.schemaValido===true?'OK':'—','Schema'],['Protegido','Novo/Editar'],['Protegido','Consolidação']])+'<div class="csc-cf-row"><strong>Leitura liberada pelo cache.</strong><span>Alterações permanecem bloqueadas até a confirmação do servidor.</span></div>';
  }else if(name==='profissionais'){
    item=perf('profissionais');if(!item)return'';d=item.data||{};var ps=Array.isArray(d.profissionais)?d.profissionais:[],sv=Array.isArray(d.servicos)?d.servicos:[];
    body=metrics([[ps.length,'Profissionais'],[sv.length,'Serviços'],[countActive(ps,'ATIVO'),'Profissionais ativos'],[countActive(sv,'ATIVO'),'Serviços ativos']])+rows(ps,function(x){return{title:t(x&&x.TITULO_PUBLICO)||t(x&&x.NOME)||t(x&&x.ID),sub:t(x&&x.ID)}});
  }else if(name==='suporte'){
    item=perf('suporte-chamados');if(!item)return'';d=item.data||{};var c=d.contagens||{},tickets=Array.isArray(d.tickets)?d.tickets:[];
    body=metrics([[n(c.NOVO),'Novos'],[n(c.EM_ANALISE),'Em análise'],[n(c.RESPONDIDO),'Respondidos'],[n(c.RESOLVIDO),'Resolvidos']])+rows(tickets,function(x){return{title:t(x&&x.morador)||'Morador',sub:[t(x&&x.protocolo),t(x&&x.categoria)].filter(Boolean).join(' • ')}});
  }else if(name==='recados'){
    item=perf('recados');if(!item)return'';d=item.data||{};var rc=Array.isArray(d.recados)?d.recados:[],cp=Array.isArray(d.campanhas)?d.campanhas:[];
    body=metrics([[rc.length,'Recados'],[countActive(rc,'ATIVO'),'Recados ativos'],[cp.length,'Campanhas'],[countActive(cp,'ATIVO'),'Campanhas ativas']])+rows(rc,function(x){return{title:t(x&&x.TITULO)||'Recado',sub:t(x&&x.MENSAGEM).slice(0,90)}});
  }else if(name==='municipios'){
    item=perf('municipios');if(!item)return'';d=item.data||{};var cat=d.catalogo||{},org=Array.isArray(cat.organizacoes)?cat.organizacoes:[],mun=Array.isArray(cat.municipios)?cat.municipios:[],ar=Array.isArray(d.areas)?d.areas:[];
    body=metrics([[org.length,'Organizações'],[mun.length,'Municípios'],[ar.length,'Áreas'],[ar.filter(function(x){return Boolean(x&&x.erro)}).length,'Pendências']])+rows(mun,function(x){return{title:t(x&&x.nome)||t(x&&x.municipioId),sub:[t(x&&x.uf),t(x&&x.organizacaoId)].filter(Boolean).join(' • ')}});
  }else return'';
  return'<div class="csc-cf-preview" data-cache-module="'+e(name)+'">'+note(item)+body+'</div>';
}
function installStyle(){
  if(document.getElementById('cscCacheFirstPanelsV7Style'))return;
  var s=document.createElement('style');s.id='cscCacheFirstPanelsV7Style';s.textContent=''
    +'html,body{max-width:100%!important;overflow-x:hidden!important}'
    +'html body.csc-central:not(.viewer-open)>main{position:static!important;inset:auto!important;transform:none!important;width:min(720px,100%)!important;max-width:100%!important;min-height:0!important;height:auto!important;margin:0 auto!important;padding-top:8px!important;padding-bottom:calc(164px + env(safe-area-inset-bottom))!important;overflow:visible!important}'
    +'html body.csc-central:not(.viewer-open) #identityPanel:not([hidden]),html body.csc-central:not(.viewer-open) #healthPanel:not([hidden]),html body.csc-central:not(.viewer-open) #modulesPanel:not([hidden]){position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-height:0!important;height:auto!important;float:none!important;overflow:visible!important}'
    +'html body.csc-central:not(.viewer-open) #healthPanel:not([hidden]),html body.csc-central:not(.viewer-open) #modulesPanel:not([hidden]){margin-top:22px!important}'
    +'html body.csc-central:not(.viewer-open) .health-grid,html body.csc-central:not(.viewer-open) .module-grid{position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;align-content:start!important;overflow:visible!important}'
    +'html body.csc-central:not(.viewer-open) .health-card,html body.csc-central:not(.viewer-open) .module{min-width:0!important;max-width:100%!important}'
    +'html.csc-central-state-app body.csc-central:not(.csc-login-gate-visible) #cscInstitutionalDock{display:grid!important;position:fixed!important;left:50%!important;right:auto!important;bottom:0!important;transform:translateX(-50%)!important;width:min(720px,100%)!important;max-width:100%!important}'
    +'html body.csc-central #cscInstitutionalAppbar{position:static!important;inset:auto!important;transform:none!important;max-width:100%!important}'
    +'.csc-cf-preview{width:min(720px,100%);max-width:100%;margin:0 auto;padding:8px 16px 34px;color:#f7fcff;background:#071827;overflow-x:hidden}'
    +'.csc-cf-note{margin:4px 0 14px;padding:10px 12px;border:0;border-radius:14px;background:#102d46;color:#adc4d2;font-size:.84rem;line-height:1.4}.csc-cf-note strong{color:#83efa9}'
    +'.csc-cf-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.csc-cf-metric{min-width:0;min-height:88px;padding:13px;border:0;border-radius:18px;background:linear-gradient(145deg,#153b58,#102d46);display:flex;flex-direction:column;justify-content:center;text-align:center}.csc-cf-metric strong{color:#fff;font-size:1.45rem}.csc-cf-metric span{margin-top:5px;color:#adc4d2;font-size:.82rem;font-weight:800}'
    +'.csc-cf-list{display:grid;gap:9px}.csc-cf-row{min-width:0;padding:13px;border:0;border-radius:17px;background:#102d46}.csc-cf-row strong{display:block;color:#fff;font-size:.96rem}.csc-cf-row span{display:block;margin-top:4px;color:#adc4d2;font-size:.84rem;line-height:1.38;overflow-wrap:anywhere}';
  document.head.appendChild(s);
}
function shell(){var x=window.ConectaCentralShellV1;return x&&typeof x.ativo==='function'?x:null}
function active(){try{var x=shell();return x?t(x.ativo()).toLowerCase():''}catch(err){return''}}
function place(){
  var name=active();
  if(!name||name==='portal'||name==='ubs'||name==='territorio')return false;
  var html=cachedHtml(name);if(!html)return false;
  var p=document.getElementById('nativePendingHost');
  if(p&&!p.hidden){if(p.dataset.cscCacheModule!==name){p.innerHTML=html;p.dataset.cscCacheModule=name}return true}
  var o=document.getElementById('cscModuleOpening');
  if(o&&!o.hidden){if(o.dataset.cscCacheModule!==name){o.innerHTML=html;o.dataset.cscCacheModule=name}return true}
  return false;
}
function schedulePlace(){
  if(state.timer)return;
  state.timer=setTimeout(function(){
    state.timer=0;
    place();
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(place);
  },0);
}
function bind(){
  installStyle();
  var v=document.getElementById('viewer');
  if(v&&!state.observer&&typeof MutationObserver==='function'){
    state.observer=new MutationObserver(schedulePlace);
    state.observer.observe(v,{attributes:true,childList:true,subtree:true,attributeFilter:['class','hidden']});
  }
  schedulePlace();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('pageshow',bind);
}());
