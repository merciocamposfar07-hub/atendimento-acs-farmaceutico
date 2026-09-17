(function(){
'use strict';
/* CORRECAO_CACHE_FIRST_PAINEIS_20260917_V3
   Bloco isolado de leitura imediata. O objetivo é estritamente visual/leitura:
   - não cria sessão;
   - não altera PIN, permissões, áreas ou regras de escrita;
   - não envia mutações;
   - mostra somente o último snapshot confirmado do MESMO modo + área + módulo;
   - o servidor continua sendo a autoridade e substitui apenas o que mudar quando
     a sessão remota e o módulo real ficarem prontos.
*/
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/central-administrativa-tacs\.html$/i.test(String(location.pathname||'')))return;
if(window.ConectaCacheFirstPanels20260917V3)return;

var CONTEXT_KEY='portalConectaModuleCoreV1';
var PERF_PREFIX='portalConectaModulePerfV1:';
var state={module:'',renderSeq:0,marker:'CORRECAO_CACHE_FIRST_PAINEIS_20260917_V3'};
window.ConectaCacheFirstPanels20260917V3=state;

function text(v){return String(v==null?'':v).trim()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function bool(v){if(v===true||v===1)return true;return['true','1','sim','yes','ativo'].indexOf(text(v).toLowerCase())!==-1}
function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function context(){try{var x=JSON.parse(sessionStorage.getItem(CONTEXT_KEY)||'null');return x&&x.schemaVersion===1?x:null}catch(e){return null}}
function mode(){var c=context();return text(c&&c.mode).toLowerCase()}
function area(){var c=context(),a=normArea(c&&c.area&&c.area.areaId);if(a)return a;try{a=normArea(localStorage.getItem('portalTacsCentralAreaV1')||'')}catch(e){}return a||'JAPARANDUBA'}
function perf(name){
  var m=mode(),a=area(),key=PERF_PREFIX+(m||'anon')+':'+a+':'+name;
  try{
    var item=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null');
    if(!item||!item.data)return null;
    if(text(item.mode).toLowerCase()!==m||normArea(item.areaId)!==a)return null;
    if(item.schemaVersion!==1&&item.schemaVersion!==2)return null;
    return{data:item.data,confirmedAt:Number(item.confirmedAt||item.savedAt||0),stale:!item.confirmedAt||Date.now()-Number(item.confirmedAt||0)>60000};
  }catch(e){return null}
}
function formatTime(ms){if(!ms)return'';try{return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}catch(e){return''}}
function metric(value,label){return'<div class="csc-cache-metric"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>'}
function metrics(items){return'<div class="csc-cache-metrics">'+items.map(function(x){return metric(x[0],x[1])}).join('')+'</div>'}
function note(item){var t=formatTime(item&&item.confirmedAt);return'<div class="csc-cache-note"><strong>Dados disponíveis no aparelho.</strong> '+(t?'Última confirmação '+esc(t)+' • ':'')+'sincronizando em segundo plano.</div>'}
function cards(rows,mapper){
  rows=Array.isArray(rows)?rows.slice(0,4):[];
  if(!rows.length)return'';
  return'<div class="csc-cache-list">'+rows.map(function(r){var x=mapper(r)||{};return'<div class="csc-cache-row"><strong>'+esc(x.title||'Registro')+'</strong>'+(x.sub?'<span>'+esc(x.sub)+'</span>':'')+'</div>'}).join('')+'</div>';
}
function activeCount(list,key){return(Array.isArray(list)?list:[]).filter(function(x){return bool(x&&x[key])}).length}
function previewAgendas(item){
  var d=item.data||{},ag=Array.isArray(d.agendas)?d.agendas:[],pr=Array.isArray(d.profissionais)?d.profissionais:[],vagas=ag.reduce(function(s,a){return s+num(a&&a.VAGAS_COMUNS)+num(a&&a.VAGAS_EMERGENCIAIS)},0);
  return note(item)+metrics([[ag.length,'Agendas'],[activeCount(ag,'ATIVO'),'Ativas'],[pr.length,'Profissionais'],[vagas,'Vagas configuradas']])+cards(ag,function(a){return{title:text(a&&a.DIA)||text(a&&a.MODULO)||'Agenda',sub:[text(a&&a.HORARIO),text(a&&a.SITUACAO)].filter(Boolean).join(' • ')}});
}
function previewMoradores(item){
  var d=item.data||{};
  return note(item)+metrics([[num(d.totalRegistros),'Moradores'],[d.schemaValido===true?'OK':'—','Schema'],['Protegido','Novo/Editar'],['Protegido','Consolidação']])+'<div class="csc-cache-card"><strong>Leitura liberada pelo cache.</strong><span>Alterações permanecem bloqueadas até a confirmação do servidor.</span></div>';
}
function previewProfissionais(item){
  var d=item.data||{},pr=Array.isArray(d.profissionais)?d.profissionais:[],sv=Array.isArray(d.servicos)?d.servicos:[];
  return note(item)+metrics([[pr.length,'Profissionais'],[sv.length,'Serviços'],[activeCount(pr,'ATIVO'),'Profissionais ativos'],[activeCount(sv,'ATIVO'),'Serviços ativos']])+cards(pr,function(p){return{title:text(p&&p.TITULO_PUBLICO)||text(p&&p.NOME)||text(p&&p.ID),sub:text(p&&p.ID)}});
}
function previewSuporte(item){
  var d=item.data||{},c=d.contagens||{},tickets=Array.isArray(d.tickets)?d.tickets:[];
  return note(item)+metrics([[num(c.NOVO),'Novos'],[num(c.EM_ANALISE),'Em análise'],[num(c.RESPONDIDO),'Respondidos'],[num(c.RESOLVIDO),'Resolvidos']])+cards(tickets,function(t){return{title:text(t&&t.morador)||'Morador',sub:[text(t&&t.protocolo),text(t&&t.categoria)].filter(Boolean).join(' • ')}});
}
function previewRecados(item){
  var d=item.data||{},r=Array.isArray(d.recados)?d.recados:[],c=Array.isArray(d.campanhas)?d.campanhas:[];
  return note(item)+metrics([[r.length,'Recados'],[activeCount(r,'ATIVO'),'Recados ativos'],[c.length,'Campanhas'],[activeCount(c,'ATIVO'),'Campanhas ativas']])+cards(r,function(x){return{title:text(x&&x.TITULO)||'Recado',sub:text(x&&x.MENSAGEM).slice(0,90)}});
}
function previewMunicipios(item){
  var d=item.data||{},cat=d.catalogo||{},org=Array.isArray(cat.organizacoes)?cat.organizacoes:[],mun=Array.isArray(cat.municipios)?cat.municipios:[],areas=Array.isArray(d.areas)?d.areas:[],problems=areas.filter(function(a){return Boolean(a&&a.erro)}).length;
  return note(item)+metrics([[org.length,'Organizações'],[mun.length,'Municípios'],[areas.length,'Áreas'],[problems,'Pendências']])+cards(mun,function(m){return{title:text(m&&m.nome)||text(m&&m.municipioId),sub:[text(m&&m.uf),text(m&&m.organizacaoId)].filter(Boolean).join(' • ')}});
}
function preview(name){
  var item=null,body='';
  if(name==='agendas'){item=perf('agendas');if(item)body=previewAgendas(item)}
  else if(name==='moradores'){item=perf('moradores-base');if(item)body=previewMoradores(item)}
  else if(name==='profissionais'){item=perf('profissionais');if(item)body=previewProfissionais(item)}
  else if(name==='suporte'){item=perf('suporte-chamados');if(item)body=previewSuporte(item)}
  else if(name==='recados'){item=perf('recados');if(item)body=previewRecados(item)}
  else if(name==='municipios'){item=perf('municipios');if(item)body=previewMunicipios(item)}
  if(!item||!body)return'';
  return'<div class="csc-cache-preview" data-cache-module="'+esc(name)+'">'+body+'</div>';
}
function injectStyle(){
  if(document.getElementById('cscCacheFirstPanelsV3Style'))return;
  var s=document.createElement('style');s.id='cscCacheFirstPanelsV3Style';
  s.textContent=''
    +'.csc-cache-preview{width:min(720px,100%);margin:0 auto;padding:8px 16px 34px;color:#f7fcff;background:#071827}'
    +'.csc-cache-note{margin:4px 0 14px;padding:10px 12px;border:1px solid #2b5a76;border-radius:14px;background:#102d46;color:#adc4d2;font-size:.84rem;line-height:1.4}'
    +'.csc-cache-note strong{color:#83efa9}'
    +'.csc-cache-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}'
    +'.csc-cache-metric{min-height:88px;padding:13px;border:1px solid #365f78;border-radius:18px;background:linear-gradient(145deg,#153b58,#102d46);display:flex;flex-direction:column;justify-content:center;text-align:center}'
    +'.csc-cache-metric strong{color:#fff;font-size:1.45rem}.csc-cache-metric span{margin-top:5px;color:#adc4d2;font-size:.82rem;font-weight:800}'
    +'.csc-cache-list{display:grid;gap:9px}.csc-cache-row,.csc-cache-card{padding:13px;border:1px solid #365f78;border-radius:17px;background:#102d46}'
    +'.csc-cache-row strong,.csc-cache-card strong{display:block;color:#fff;font-size:.96rem}.csc-cache-row span,.csc-cache-card span{display:block;margin-top:4px;color:#adc4d2;font-size:.84rem;line-height:1.38}';
  document.head.appendChild(s);
}
function activeModule(){try{var s=window.ConectaCentralShellV1;return s&&typeof s.ativo==='function'?text(s.ativo()).toLowerCase():''}catch(e){return''}}
function place(name,seq){
  if(seq!==state.renderSeq||activeModule()!==name)return false;
  var html=preview(name);if(!html)return false;
  injectStyle();
  /* local-first ainda sem token: substitui SOMENTE a prévia genérica da Central. */
  var pending=document.getElementById('nativePendingHost');
  if(pending&&!pending.hidden){pending.innerHTML=html;return true}
  /* ativos nativos: enquanto o runtime ainda monta, troca somente o aviso temporário. */
  var opening=document.getElementById('cscModuleOpening');
  if(opening&&!opening.hidden){opening.innerHTML=html;return true}
  return false;
}
function schedule(name){
  var seq=++state.renderSeq;state.module=name;
  [0,16,45,95].forEach(function(delay){setTimeout(function(){place(name,seq)},delay)});
}
function onIntent(event){
  var b=event.target&&event.target.closest?event.target.closest('#moduleGrid .module[data-module]'):null;
  if(!b||b.hidden||b.disabled)return;
  var name=text(b.dataset.module).toLowerCase();if(!name||name==='portal'||name==='ubs'||name==='territorio')return;
  schedule(name);
}
document.addEventListener('pointerdown',onIntent,{capture:true,passive:true});
if(!window.PointerEvent)document.addEventListener('touchstart',onIntent,{capture:true,passive:true});

/* Se a prévia genérica for recriada pela Central enquanto a sessão remota chega,
   reaplica o mesmo snapshot sem iniciar novas consultas. */
var observer=new MutationObserver(function(){var name=activeModule();if(name&&name===state.module)place(name,state.renderSeq)});
function observe(){var viewer=document.getElementById('viewer');if(viewer)observer.observe(viewer,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
}());
