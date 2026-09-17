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

/* CORRECAO_CACHE_FIRST_PAINEIS_20260917_V4
   Bloco isolado. Atua somente na Central administrativa e somente na abertura/leitura.
   Não muda PIN, sessão, áreas, permissões, agendas ou regras de escrita. */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/central-administrativa-tacs\.html$/i.test(String(location.pathname||'')))return;
if(window.ConectaCacheFirstPanels20260917V4)return;

var CONTEXT_KEY='portalConectaModuleCoreV1',PERF_PREFIX='portalConectaModulePerfV1:';
var state={module:'',suppressUntil:0,seq:0,observer:null};
window.ConectaCacheFirstPanels20260917V4=state;

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
    var item=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null');
    if(!item||!item.data||t(item.mode).toLowerCase()!==m||a(item.areaId)!==id)return null;
    if(item.schemaVersion!==1&&item.schemaVersion!==2)return null;
    return{data:item.data,confirmedAt:Number(item.confirmedAt||item.savedAt||0)};
  }catch(err){return null}
}
function fmt(ms){if(!ms)return'';try{return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch(err){return''}}
function metric(value,label){return'<div class="csc-cf-metric"><strong>'+e(value)+'</strong><span>'+e(label)+'</span></div>'}
function metrics(rows){return'<div class="csc-cf-metrics">'+rows.map(function(x){return metric(x[0],x[1])}).join('')+'</div>'}
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
function style(){
  if(document.getElementById('cscCacheFirstPanelsV4Style'))return;
  var s=document.createElement('style');s.id='cscCacheFirstPanelsV4Style';s.textContent=''
    +'.csc-cf-preview{width:min(720px,100%);margin:0 auto;padding:8px 16px 34px;color:#f7fcff;background:#071827}'
    +'.csc-cf-note{margin:4px 0 14px;padding:10px 12px;border:1px solid #2b5a76;border-radius:14px;background:#102d46;color:#adc4d2;font-size:.84rem;line-height:1.4}.csc-cf-note strong{color:#83efa9}'
    +'.csc-cf-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.csc-cf-metric{min-height:88px;padding:13px;border:1px solid #365f78;border-radius:18px;background:linear-gradient(145deg,#153b58,#102d46);display:flex;flex-direction:column;justify-content:center;text-align:center}.csc-cf-metric strong{color:#fff;font-size:1.45rem}.csc-cf-metric span{margin-top:5px;color:#adc4d2;font-size:.82rem;font-weight:800}'
    +'.csc-cf-list{display:grid;gap:9px}.csc-cf-row{padding:13px;border:1px solid #365f78;border-radius:17px;background:#102d46}.csc-cf-row strong{display:block;color:#fff;font-size:.96rem}.csc-cf-row span{display:block;margin-top:4px;color:#adc4d2;font-size:.84rem;line-height:1.38}'
    +'html body .viewer.csc-frame-viewer.csc-cf-opening:not([hidden]){display:flex!important;flex-direction:column!important;overflow:hidden!important;background:#071827!important}'
    +'html body .viewer.csc-frame-viewer.csc-cf-opening>iframe:not([hidden]){display:block!important;position:static!important;left:auto!important;top:auto!important;width:100%!important;height:auto!important;min-height:0!important;flex:1 1 auto!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;background:#071827!important}';document.head.appendChild(s);
}
function shell(){var x=window.ConectaCentralShellV1;return x&&typeof x.abrir==='function'?x:null}
function active(){try{var x=shell();return x&&typeof x.ativo==='function'?t(x.ativo()).toLowerCase():''}catch(err){return''}}
function button(event){return event.target&&event.target.closest?event.target.closest('#moduleGrid .module[data-module]'):null}
function title(btn){try{return t((btn.querySelector('strong')||{}).textContent)||'Painel'}catch(err){return'Painel'}}
function revealFrame(){
  var v=document.getElementById('viewer');if(!v||v.hidden||!v.classList.contains('csc-frame-viewer'))return;
  style();v.classList.remove('csc-frame-opening');v.classList.add('csc-cf-opening');
  var list=v.querySelectorAll('iframe');for(var i=0;i<list.length;i++)if(!list[i].hidden){list[i].style.visibility='visible';list[i].style.opacity='1';list[i].style.pointerEvents='auto';break}
  var o=document.getElementById('cscModuleOpening');if(o){o.hidden=true;o.textContent=''}
}
function place(name,seq){
  if(seq!==state.seq||active()!==name)return;
  var html=cachedHtml(name);if(!html)return;
  style();var p=document.getElementById('nativePendingHost');if(p&&!p.hidden){p.innerHTML=html;return}
  var o=document.getElementById('cscModuleOpening');if(o&&!o.hidden)o.innerHTML=html;
}
function schedule(name){var seq=++state.seq;[0,16,45,95].forEach(function(ms){setTimeout(function(){place(name,seq)},ms)})}
function onDown(event){
  var btn=button(event);if(!btn||btn.hidden||btn.disabled)return;var name=t(btn.dataset.module).toLowerCase();if(!name||name==='portal')return;
  var api=shell();if(!api)return;state.module=name;state.suppressUntil=Date.now()+1200;
  try{api.abrir(name,title(btn));revealFrame();schedule(name);if(typeof requestAnimationFrame==='function')requestAnimationFrame(revealFrame);setTimeout(revealFrame,45)}catch(err){state.suppressUntil=0}
}
function onClick(event){var btn=button(event);if(!btn)return;var name=t(btn.dataset.module).toLowerCase();if(name===state.module&&Date.now()<=state.suppressUntil){event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();state.suppressUntil=0}}
document.addEventListener('pointerdown',onDown,{capture:true,passive:true});if(!window.PointerEvent)document.addEventListener('touchstart',onDown,{capture:true,passive:true});document.addEventListener('click',onClick,true);
function observe(){var v=document.getElementById('viewer');if(!v||state.observer||typeof MutationObserver!=='function')return;state.observer=new MutationObserver(function(){var name=active();if(name===state.module){revealFrame();place(name,state.seq)}});state.observer.observe(v,{attributes:true,childList:true,subtree:true,attributeFilter:['class','hidden']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();window.addEventListener('pageshow',observe);
}());
