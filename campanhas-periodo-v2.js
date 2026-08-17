(function(){
'use strict';
if(window.__portalTacsCampanhasPeriodoV2)return;
window.__portalTacsCampanhasPeriodoV2=true;

var TOKEN_KEY='portalTacsAdminTokenV1';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var metadata={};
var context={};
var pendingTransport=null;
var selectedYear=0;
var selectedMonth=0;
var refreshTimer=null;
var fetching=false;
var decorateTimer=null;

function txt(v){return String(v==null?'':v).trim()}
function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function digits2(v){var n=parseInt(v,10);return n>=1&&n<=12?String(n).padStart(2,'0'):''}
function nowRecife(){
  var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',year:'numeric',month:'2-digit'}).formatToParts(new Date()),o={};
  parts.forEach(function(p){o[p.type]=Number(p.value)});
  return{year:o.year,month:o.month};
}
function isoDate(v){
  var s=txt(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];
  var b=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return b?b[3]+'-'+b[2]+'-'+b[1]:'';
}
function currentArea(){
  var q=new URLSearchParams(location.search||'').get('area');
  var select=document.getElementById('areaEnvio');
  return txt(select&&select.value||q||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
}
function session(){
  var s={dispositivo:txt(localStorage.getItem(DEVICE_KEY)||''),areaId:currentArea()};
  var territory=txt(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'');
  var admin=txt(sessionStorage.getItem(TOKEN_KEY)||'');
  if(territory)s.territorioToken=territory;else if(admin)s.token=admin;
  return s;
}
function api(){return window.PortalTacsRecadosCampanhasV12&&window.PortalTacsRecadosCampanhasV12.post}

function addStyle(){
  if(document.getElementById('campanhasPeriodoV2Style'))return;
  var style=document.createElement('style');
  style.id='campanhasPeriodoV2Style';
  style.textContent=[
    '.camp-period-box{margin:0 0 16px;border:2px solid #69c7e7;border-radius:20px;padding:15px;background:linear-gradient(145deg,#073a55,#0b5878);color:#fff;box-shadow:0 8px 18px rgba(7,58,85,.16)}',
    '.camp-period-box h2{margin:0 0 5px;color:#fff}.camp-period-box p{margin:0 0 12px;color:#d8eef7;font-weight:700}',
    '.camp-year-row{display:grid;grid-template-columns:minmax(0,180px) 1fr;gap:10px;align-items:end}.camp-year-row label{margin:0;color:#fff}.camp-year-row select{background:#fff;color:#102d40}',
    '.camp-month-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:4px 0 2px;overflow:visible;width:100%}.camp-month-tab{width:100%;min-width:0;min-height:48px;border:2px solid #84cde6;border-radius:14px;background:#fff;color:#073a55;font-weight:900;padding:9px 8px;white-space:normal;overflow-wrap:normal;word-break:normal}.camp-month-tab.active{background:#031f32;color:#fff;border-color:#8deeb5}',
    '.camp-period-summary{margin-top:8px;border-radius:14px;background:rgba(255,255,255,.12);padding:11px 12px;font-weight:900;overflow-wrap:anywhere}',
    '.camp-period-fields{margin:12px 0;border:2px solid #86b9ca;border-radius:17px;padding:13px;background:#edf6f9;min-width:0;max-width:100%;overflow:hidden}.camp-period-fields .period-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;min-width:0}.camp-period-fields .period-grid>div{min-width:0}.camp-period-fields label{color:#073a55}.camp-period-fields input[type="date"]{display:block;width:100%!important;min-width:0!important;max-width:100%!important;inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;box-sizing:border-box!important}',
    '.camp-context{margin-top:11px;border-radius:14px;padding:12px 13px;background:#073a55;color:#fff;font-size:.93rem;font-weight:800;line-height:1.45;overflow-wrap:anywhere}.camp-context strong{color:#8df0b4}',
    '.camp-month-empty{margin-top:12px;border:2px dashed #8baebd;border-radius:16px;padding:16px;text-align:center;color:#536b78;font-weight:850}',
    'body.tema-petroleo .camp-period-fields{background:#073a55;border-color:#69c7e7;color:#fff}body.tema-petroleo .camp-period-fields label{color:#fff}body.tema-petroleo .camp-period-fields .campo{background:#fff;color:#102d40}',
    '@media(max-width:520px){.camp-year-row{grid-template-columns:1fr}.camp-period-fields .period-grid{grid-template-columns:1fr}.camp-month-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.camp-month-tab{font-size:.88rem;padding:8px 4px}}',
    '@media(max-width:350px){.camp-month-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}}'
  ].join('');
  style.textContent+='.camp-color-chip{margin-top:10px;border-radius:12px;padding:9px 11px;background:#fff;color:#073a55;font-weight:900}.camp-theme-lilas>summary{background:linear-gradient(135deg,#ead9ff,#d4adf2);color:#32105f}.camp-theme-dourado>summary{background:linear-gradient(135deg,#ffe7a3,#f6c954);color:#4f3400}.camp-theme-roxo>summary{background:linear-gradient(135deg,#e4d4ff,#b995e8);color:#2e1258}.camp-theme-laranja>summary{background:linear-gradient(135deg,#ffe0b5,#f2a24d);color:#5b2e00}.camp-theme-azul-marinho>summary{background:linear-gradient(135deg,#163a69,#0b2443);color:#fff}.camp-theme-verde>summary{background:linear-gradient(135deg,#d8f2df,#79c992);color:#123f23}.camp-theme-azul>summary{background:linear-gradient(135deg,#d8efff,#79bce8);color:#0b3654}.camp-theme-amarelo>summary{background:linear-gradient(135deg,#fff5b8,#f2d257);color:#554500}.camp-theme-vermelho>summary{background:linear-gradient(135deg,#ffd6d6,#e78383);color:#5d1717}.camp-theme-rosa>summary{background:linear-gradient(135deg,#ffdbea,#ef9cbd);color:#641d3a}#listaCampanhas .item[class*="camp-theme-"]>summary .sub{color:inherit}';
  document.head.appendChild(style);
}

function toolbar(){
  var section=document.getElementById('secaoCampanhas');
  if(!section)return null;
  var box=document.getElementById('campPeriodBox');
  if(box)return box;
  box=document.createElement('div');
  box.id='campPeriodBox';box.className='camp-period-box';
  box.innerHTML='<h2>Campanhas no mês</h2><p>Organize e reedite as campanhas por ano e mês sem misturar períodos diferentes.</p><div class="camp-year-row"><div><label for="campYear"><strong>Ano</strong></label><select id="campYear" class="campo"></select></div><div class="camp-period-summary" id="campPeriodSummary">Carregando período…</div></div><div id="campMonthTabs" class="camp-month-tabs" role="tablist" aria-label="Meses do ano"></div>';
  var anchor=section.querySelector('.acoes.novo')||section.firstChild;
  section.insertBefore(box,anchor);
  document.getElementById('campYear').addEventListener('change',function(){selectedYear=parseInt(this.value,10)||selectedYear;renderFilter()});
  return box;
}

function updateYears(){
  var current=nowRecife().year,years={};
  for(var y=current-2;y<=current+5;y++)years[y]=true;
  Object.keys(metadata).forEach(function(k){var y=parseInt(metadata[k].ANO,10);if(y)years[y]=true});
  if(selectedYear)years[selectedYear]=true;
  var list=Object.keys(years).map(Number).sort(function(a,b){return b-a}),select=document.getElementById('campYear');
  if(!select)return;
  var html=list.map(function(y){return'<option value="'+y+'">'+y+'</option>'}).join('');
  if(select.innerHTML!==html)select.innerHTML=html;
  select.value=String(selectedYear);
}
function updateMonthTabs(){
  var box=document.getElementById('campMonthTabs');if(!box)return;
  var html=MONTHS.map(function(name,i){var m=i+1;return'<button class="camp-month-tab'+(m===selectedMonth?' active':'')+'" type="button" role="tab" aria-selected="'+(m===selectedMonth?'true':'false')+'" data-month="'+m+'">'+name+'</button>'}).join('');
  if(box.innerHTML!==html)box.innerHTML=html;
  box.querySelectorAll('.camp-month-tab').forEach(function(btn){btn.addEventListener('click',function(){selectedMonth=parseInt(btn.dataset.month,10);updateMonthTabs();renderFilter();setNewDefaults()},{once:true})});
}

function contextText(meta){
  var area=txt(meta&&meta.AREA_NOME||context.areaNome||currentArea());
  var municipio=txt(meta&&meta.MUNICIPIO_NOME||context.municipioNome);
  var uf=txt(meta&&meta.UF||context.uf);
  var org=txt(meta&&meta.ORGANIZACAO_NOME||context.organizacaoNome);
  return '<strong>Área:</strong> '+esc(area)+(municipio?' • <strong>Município:</strong> '+esc(municipio)+(uf?'/'+esc(uf):''):'')+(org?' • <strong>Organização:</strong> '+esc(org):'');
}
function metaForCard(card){
  var id=txt(card&&card.dataset.id),m=metadata[id]||{};
  var start=card&&card.querySelector('[name="inicio"]'),iso=isoDate(start&&start.value);
  var period=iso?iso.split('-'):[];
  return{
    ANO:txt(m.ANO)||period[0]||String(selectedYear),
    MES:digits2(m.MES)||period[1]||String(selectedMonth).padStart(2,'0'),
    VALIDADE:isoDate(m.VALIDADE),
    AREA_NOME:txt(m.AREA_NOME||context.areaNome),
    MUNICIPIO_NOME:txt(m.MUNICIPIO_NOME||context.municipioNome),
    UF:txt(m.UF||context.uf),
    ORGANIZACAO_NOME:txt(m.ORGANIZACAO_NOME||context.organizacaoNome),
    SUBTITULO:txt(m.SUBTITULO),COR_TEMA:txt(m.COR_TEMA),COR_NOME:txt(m.COR_NOME),ORIGEM:txt(m.ORIGEM)
  };
}
function campaignTheme(meta,title){var t=txt(meta&&meta.COR_TEMA).toLowerCase();if(t)return t.replace(/[^a-z0-9-]/g,'');var n=txt(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var temas=['lilas','dourado','azul-marinho','laranja','amarelo','vermelho','verde','roxo','rosa','azul'];for(var i=0;i<temas.length;i++)if(n.indexOf(temas[i])!==-1)return temas[i];return''}
function applyCampaignTheme(box,meta){if(!box)return;Array.prototype.slice.call(box.classList).filter(function(c){return c.indexOf('camp-theme-')===0}).forEach(function(c){box.classList.remove(c)});var h=box.querySelector('h3'),theme=campaignTheme(meta,h&&h.textContent);if(theme)box.classList.add('camp-theme-'+theme)}
function monthOptions(selected){return MONTHS.map(function(name,i){var v=String(i+1).padStart(2,'0');return'<option value="'+v+'" '+(v===selected?'selected':'')+'>'+name+'</option>'}).join('')}
function makeFields(meta){
  var div=document.createElement('div');div.className='camp-period-fields';
  div.innerHTML='<label><strong>Subtítulo da campanha</strong></label><input class="campo" name="subtitulo" value="'+esc(meta.SUBTITULO||'')+'" placeholder="Ex.: Incentivo ao aleitamento materno"><div class="period-grid"><div><label><strong>Ano</strong></label><input class="campo" name="ano" type="number" min="2000" max="2200" inputmode="numeric" value="'+esc(meta.ANO)+'"></div><div><label><strong>Mês</strong></label><select class="campo" name="mes">'+monthOptions(meta.MES)+'</select></div></div><label><strong>Validade</strong></label><input class="campo" name="validade" type="date" value="'+esc(meta.VALIDADE)+'">'+(meta.COR_NOME?'<div class="camp-color-chip">Cor da campanha: '+esc(meta.COR_NOME)+'</div>':'')+'<div class="camp-context">'+contextText(meta)+'</div>';
  return div;
}
function renameContentLabel(box){
  Array.prototype.forEach.call(box.querySelectorAll('label'),function(label){if(txt(label.textContent)==='Mensagem'&&label.childNodes.length)label.childNodes[0].nodeValue='Conteúdo'})
}
function decorateBox(box,meta){
  if(!box)return;applyCampaignTheme(box,meta);
  if(box.querySelector('.camp-period-fields'))return;
  var start=box.querySelector('[name="inicio"]');if(!start)return;
  var fields=makeFields(meta);
  var label=start.previousElementSibling;
  start.parentNode.insertBefore(fields,label||start);
  renameContentLabel(box);
}
function decorate(){
  var newBox=document.getElementById('formNovaCampanha');
  if(newBox)decorateBox(newBox,{ANO:String(selectedYear),MES:String(selectedMonth).padStart(2,'0'),VALIDADE:''});
  document.querySelectorAll('#listaCampanhas .item[data-id]').forEach(function(card){decorateBox(card,metaForCard(card))});
  renderFilter();
}
function scheduleDecorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorate,0)}
function readFields(box){
  var year=box&&box.querySelector('[name="ano"]'),month=box&&box.querySelector('[name="mes"]'),validity=box&&box.querySelector('[name="validade"]'),subtitle=box&&box.querySelector('[name="subtitulo"]');
  return{ano:txt(year&&year.value||selectedYear),mes:digits2(month&&month.value||selectedMonth),validade:isoDate(validity&&validity.value),subtitulo:txt(subtitle&&subtitle.value)};
}
function setNewDefaults(){
  var form=document.getElementById('formNovaCampanha');if(!form)return;
  var y=form.querySelector('[name="ano"]'),m=form.querySelector('[name="mes"]');if(y)y.value=String(selectedYear);if(m)m.value=String(selectedMonth).padStart(2,'0');
}

function setTextIfChanged(node,value){if(node&&node.textContent!==value)node.textContent=value}
function renderFilter(){
  var list=document.getElementById('listaCampanhas');if(!list)return;
  var visible=0,total=0;
  list.querySelectorAll('.item[data-id]').forEach(function(card){
    total++;
    var meta=metaForCard(card),year=parseInt(meta.ANO,10),month=parseInt(meta.MES,10),show=year===selectedYear&&month===selectedMonth;
    card.hidden=!show;if(show)visible++;
  });
  var empty=document.getElementById('campMonthEmpty');
  if(!empty){empty=document.createElement('div');empty.id='campMonthEmpty';empty.className='camp-month-empty';list.insertAdjacentElement('afterend',empty)}
  empty.hidden=visible!==0||total===0;
  setTextIfChanged(empty,'Nenhuma campanha cadastrada em '+MONTHS[selectedMonth-1]+' de '+selectedYear+'.');
  var summary=document.getElementById('campPeriodSummary');
  setTextIfChanged(summary,MONTHS[selectedMonth-1]+' / '+selectedYear+' • '+visible+' campanha'+(visible===1?'':'s'));
}

function fetchMetadata(delay){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(function(){
    if(fetching||!api())return;
    fetching=true;
    api()('admin_publicacoes_dados',session(),function(r){
      fetching=false;
      if(!r||r.ok!==true){
        if(txt(r&&r.message).indexOf('Aguarde')!==-1)fetchMetadata(900);
        return;
      }
      context=r.contextoMunicipal||{};
      metadata={};
      (Array.isArray(r.campanhas)?r.campanhas:[]).forEach(function(c){metadata[txt(c.ID)]=c});
      updateYears();updateMonthTabs();scheduleDecorate();
    },'admin_publicacoes_result');
  },delay==null?500:delay);
}

function rememberSave(event){
  var button=event.target.closest&&event.target.closest('.salvarCampanha,.salvarNovaCampanha');
  if(!button)return;
  var box=button.closest('.item');
  if(!box)return;
  pendingTransport=readFields(box);
}
function appendHidden(form,name,value){
  var input=form.querySelector('input[name="'+name+'"]');
  if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.appendChild(input)}
  input.value=String(value==null?'':value);
}
function inspectTransport(node){
  var forms=[];
  if(node&&node.tagName==='FORM')forms.push(node);
  if(node&&node.querySelectorAll)Array.prototype.push.apply(forms,node.querySelectorAll('form'));
  forms.forEach(function(form){
    var action=form.querySelector('input[name="action"]');
    if(!action||action.value!=='admin_publicacoes_salvar_campanha'||!pendingTransport)return;
    appendHidden(form,'ano',pendingTransport.ano);
    appendHidden(form,'mes',pendingTransport.mes);
    appendHidden(form,'validade',pendingTransport.validade);
    appendHidden(form,'subtitulo',pendingTransport.subtitulo);
    pendingTransport=null;
  });
}
function containsCampaignCard(node){
  if(!node||node.nodeType!==1)return false;
  if(node.matches&&node.matches('#listaCampanhas .item[data-id]'))return true;
  return Boolean(node.querySelector&&node.querySelector('#listaCampanhas .item[data-id]'));
}

function install(){
  addStyle();
  var now=nowRecife();selectedYear=now.year;selectedMonth=now.month;
  toolbar();updateYears();updateMonthTabs();decorate();
  document.addEventListener('click',rememberSave,true);
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#novaCampanha'))setTimeout(function(){decorate();setNewDefaults()},0)});
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='areaEnvio')setTimeout(function(){metadata={};context={};fetchMetadata(650)},0)});
  new MutationObserver(function(records){
    var changedList=false;
    records.forEach(function(record){
      Array.prototype.forEach.call(record.addedNodes,inspectTransport);
      if(record.target&&record.target.id==='listaCampanhas')changedList=true;
      Array.prototype.forEach.call(record.addedNodes,function(node){if(containsCampaignCard(node))changedList=true});
    });
    if(changedList){scheduleDecorate();fetchMetadata(700)}
  }).observe(document.body,{childList:true,subtree:true});
  fetchMetadata(700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}());
