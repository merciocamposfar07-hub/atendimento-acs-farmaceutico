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
  style.textContent+=`
/* CAMPANHAS_ADMIN_UI_V5 */
#listaCampanhas .item[class*="camp-theme-"]{
  border:2px solid #69c7e7!important;
  border-radius:24px!important;
  overflow:hidden!important;
  background:#073a55!important;
}
#listaCampanhas .item[class*="camp-theme-"]>summary{
  position:relative!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 82px!important;
  grid-template-areas:"badge status" "copy symbol"!important;
  gap:10px 14px!important;
  align-items:start!important;
  min-height:164px!important;
  padding:16px 16px 18px!important;
  overflow:hidden!important;
  isolation:isolate;
}
#listaCampanhas .camp-admin-badge{
  grid-area:badge;
  justify-self:start;
  align-self:start;
  display:inline-flex;
  align-items:center;
  min-height:34px;
  max-width:100%;
  padding:7px 11px;
  border-radius:999px;
  background:#073a55;
  color:#fff;
  font-size:.76rem;
  font-weight:950;
  line-height:1;
  letter-spacing:.015em;
  white-space:nowrap;
}
#listaCampanhas .item[class*="camp-theme-"]>summary .sinal{
  grid-area:status!important;
  position:static!important;
  justify-self:end!important;
  align-self:start!important;
  min-width:76px!important;
  max-width:100%!important;
  margin:0!important;
  padding:7px 11px!important;
  border-radius:999px!important;
  background:#f5fff8!important;
  color:#08723a!important;
  font-size:.8rem!important;
  font-weight:950!important;
  line-height:1!important;
  white-space:nowrap!important;
}
#listaCampanhas .item[class*="camp-theme-"]>summary .sinal.inativo{
  background:#fff2f2!important;
  color:#922f2f!important;
}
#listaCampanhas .camp-admin-copy{
  grid-area:copy;
  min-width:0;
  align-self:center;
}
#listaCampanhas .camp-admin-title{
  margin:0 0 5px!important;
  color:inherit!important;
  font-size:clamp(1.55rem,5.8vw,1.95rem)!important;
  font-weight:950!important;
  line-height:1.06!important;
  letter-spacing:-.025em!important;
  overflow-wrap:break-word!important;
}
#listaCampanhas .camp-admin-subtitle{
  margin:0 0 6px;
  color:inherit!important;
  font-size:1rem!important;
  font-weight:850!important;
  line-height:1.28!important;
  opacity:1!important;
  overflow-wrap:break-word;
}
#listaCampanhas .camp-admin-period,
body.tema-petroleo #listaCampanhas .item[class*="camp-theme-"]>summary .camp-admin-period{
  margin:0!important;
  color:inherit!important;
  font-size:.92rem!important;
  font-weight:800!important;
  line-height:1.35!important;
  opacity:.94!important;
  overflow-wrap:break-word!important;
}
#listaCampanhas .camp-admin-symbol{
  grid-area:symbol;
  width:82px;
  height:82px;
  align-self:end;
  justify-self:end;
  display:grid;
  place-items:center;
  border-radius:999px;
  background:rgba(255,255,255,.18);
  overflow:visible;
  pointer-events:none;
}
#listaCampanhas .camp-admin-symbol.camp-symbol-static svg{
  animation:none!important;
  transition:none!important;
  transform:none!important;
}
#listaCampanhas .camp-admin-symbol.camp-symbol-static{
  animation:none!important;
  transition:none!important;
  transform:none!important;
  will-change:auto!important;
}
#listaCampanhas .camp-admin-symbol svg{
  display:block;
  width:68px;
  height:68px;
  max-width:100%;
  max-height:100%;
  overflow:visible;
  filter:drop-shadow(0 5px 7px rgba(7,31,47,.24));
}
#listaCampanhas .camp-admin-symbol.camp-symbol-static{
  overflow:hidden;
  contain:paint;
  transform:none!important;
  animation:none!important;
}
#listaCampanhas .camp-admin-symbol.camp-symbol-static svg,
#listaCampanhas .camp-admin-symbol.camp-symbol-static svg *{
  filter:none!important;
  animation:none!important;
  transform:none!important;
}
#listaCampanhas .camp-theme-lilas>summary{
  background:linear-gradient(135deg,#ead9ff 0%,#d9b9f2 100%)!important;
  color:#32105f!important;
}
#listaCampanhas .camp-theme-lilas .camp-admin-badge{background:#56208b!important}
#listaCampanhas .camp-theme-dourado>summary{
  background:linear-gradient(135deg,#ffe8a8 0%,#f6cb61 100%)!important;
  color:#4a3000!important;
}
#listaCampanhas .camp-theme-dourado .camp-admin-badge{background:#8a5b00!important}
#listaCampanhas .camp-theme-roxo>summary{background:linear-gradient(135deg,#e4d4ff,#b995e8)!important;color:#2e1258!important}
#listaCampanhas .camp-theme-laranja>summary{background:linear-gradient(135deg,#ffe0b5,#f2a24d)!important;color:#512700!important}
#listaCampanhas .camp-theme-azul-marinho>summary{background:linear-gradient(135deg,#163a69,#0b2443)!important;color:#fff!important}
#listaCampanhas .camp-theme-verde>summary{background:linear-gradient(135deg,#d8f2df,#79c992)!important;color:#123f23!important}
#listaCampanhas .camp-theme-azul>summary{background:linear-gradient(135deg,#d8efff,#79bce8)!important;color:#0b3654!important}
#listaCampanhas .camp-theme-amarelo>summary{background:linear-gradient(135deg,#fff5b8,#f2d257)!important;color:#4c3d00!important}
#listaCampanhas .camp-theme-vermelho>summary{background:linear-gradient(135deg,#ffd6d6,#e78383)!important;color:#5d1717!important}
#listaCampanhas .camp-theme-rosa>summary{background:linear-gradient(135deg,#ffdbea,#ef9cbd)!important;color:#641d3a!important}
.camp-period-fields .validadeCampo,#secaoCampanhas .validadeCampo{
  display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;
  overflow:hidden!important;contain:inline-size!important;border-radius:18px!important;box-sizing:border-box!important;
}
.camp-period-fields .validadeControle,#secaoCampanhas .validadeControle{
  display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;
  box-sizing:border-box!important;font-size:1rem!important;
}
/* CAMPANHAS_ADMIN_FIX_V4 */
.camp-start-wrap,#secaoCampanhas .camp-start-wrap{
  display:block!important;position:relative!important;width:100%!important;min-width:0!important;max-width:100%!important;
  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;
  overflow:hidden!important;contain:inline-size!important;border:2px solid #a9c0ca!important;border-radius:18px!important;
  background:#fff!important;box-sizing:border-box!important;clip-path:inset(0 round 18px)!important;
}
.camp-start-wrap>input[name="inicio"],#secaoCampanhas .camp-start-wrap>input[name="inicio"]{
  display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;
  -webkit-min-logical-width:0!important;box-sizing:border-box!important;margin:0!important;
  border:0!important;border-radius:0!important;background:#fff!important;overflow:hidden!important;
}
.camp-start-wrap:focus-within{outline:3px solid rgba(11,88,120,.17)!important;border-color:#0b5878!important}
@media(max-width:390px){
  #listaCampanhas .item[class*="camp-theme-"]>summary{grid-template-columns:minmax(0,1fr) 70px!important;gap:9px 10px!important;min-height:154px!important;padding:14px!important}
  #listaCampanhas .camp-admin-symbol{width:70px;height:70px}
  #listaCampanhas .camp-admin-symbol svg{width:58px;height:58px}
  #listaCampanhas .camp-admin-badge{font-size:.7rem;padding:7px 9px}
  #listaCampanhas .item[class*="camp-theme-"]>summary .sinal{min-width:68px!important;font-size:.74rem!important;padding:7px 8px!important}
  #listaCampanhas .camp-admin-title{font-size:clamp(1.42rem,6.2vw,1.72rem)!important}
  #listaCampanhas .camp-admin-subtitle{font-size:.94rem!important}
  #listaCampanhas .camp-admin-period{font-size:.86rem!important}
}
`;
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
    SUBTITULO:txt(m.SUBTITULO),CAMPANHA_CHAVE:txt(m.CAMPANHA_CHAVE),COR_TEMA:txt(m.COR_TEMA),COR_NOME:txt(m.COR_NOME),ORIGEM:txt(m.ORIGEM)
  };
}
function campaignTheme(meta,title){var t=txt(meta&&meta.COR_TEMA).toLowerCase();if(t)return t.replace(/[^a-z0-9-]/g,'');var n=txt(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var temas=['lilas','dourado','azul-marinho','laranja','amarelo','vermelho','verde','roxo','rosa','azul'];for(var i=0;i<temas.length;i++)if(n.indexOf(temas[i])!==-1)return temas[i];return''}
function applyCampaignTheme(box,meta){if(!box)return;Array.prototype.slice.call(box.classList).filter(function(c){return c.indexOf('camp-theme-')===0}).forEach(function(c){box.classList.remove(c)});var h=box.querySelector('h3'),theme=campaignTheme(meta,h&&h.textContent);if(theme)box.classList.add('camp-theme-'+theme)}
function dateBrIsoV41(v){var m=txt(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}
function campaignCatalogByTitle(title){
  var n=txt(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  var map={
    'janeiro roxo':{key:'JAN_ROXO',subtitle:'Combate e prevenção da hanseníase'},
    'fevereiro laranja':{key:'FEV_LARANJA',subtitle:'Conscientização e combate à leucemia'},
    'março roxo':{key:'MAR_ROXO',subtitle:'Conscientização sobre a epilepsia'},
    'marco roxo':{key:'MAR_ROXO',subtitle:'Conscientização sobre a epilepsia'},
    'março azul-marinho':{key:'MAR_AZUL_MARINHO',subtitle:'Prevenção do câncer colorretal'},
    'marco azul-marinho':{key:'MAR_AZUL_MARINHO',subtitle:'Prevenção do câncer colorretal'},
    'abril verde':{key:'ABR_VERDE',subtitle:'Segurança no trabalho'},
    'abril azul':{key:'ABR_AZUL',subtitle:'Conscientização sobre o autismo'},
    'maio amarelo':{key:'MAI_AMARELO',subtitle:'Prevenção e segurança no trânsito'},
    'junho vermelho':{key:'JUN_VERMELHO',subtitle:'Incentivo à doação de sangue'},
    'julho amarelo':{key:'JUL_AMARELO',subtitle:'Combate às hepatites virais'},
    'julho verde':{key:'JUL_VERDE',subtitle:'Prevenção do câncer de cabeça e pescoço'},
    'agosto lilás':{key:'AGO_LILAS',subtitle:'Fim da violência contra a mulher'},
    'agosto lilas':{key:'AGO_LILAS',subtitle:'Fim da violência contra a mulher'},
    'agosto dourado':{key:'AGO_DOURADO',subtitle:'Incentivo ao aleitamento materno'},
    'setembro amarelo':{key:'SET_AMARELO',subtitle:'Prevenção ao suicídio'},
    'setembro verde':{key:'SET_VERDE',subtitle:'Incentivo à doação de órgãos'},
    'outubro rosa':{key:'OUT_ROSA',subtitle:'Prevenção e diagnóstico precoce do câncer de mama'},
    'novembro azul':{key:'NOV_AZUL',subtitle:'Saúde do homem e prevenção do câncer de próstata'},
    'dezembro vermelho':{key:'DEZ_VERMELHO',subtitle:'Luta contra a AIDS e as ISTs'},
    'dezembro laranja':{key:'DEZ_LARANJA',subtitle:'Prevenção do câncer de pele'}
  };
  return map[n]||{key:'',subtitle:''};
}
/* CAMPANHAS_ADMIN_V5 */
function campaignPalette(theme){
  var map={
    lilas:['#6d28d9','#c39aff','#4d13a8'],dourado:['#a96b00','#ffd66b','#754700'],roxo:['#6331a8','#c0a0ef','#442176'],
    laranja:['#b85d00','#ffc574','#7d3b00'],'azul-marinho':['#12365f','#8eb8e2','#0d2748'],verde:['#17723a','#9adbb0','#0e4c27'],
    azul:['#17618f','#9bd7f5','#0d4262'],amarelo:['#9b7900','#ffeb86','#6f5700'],vermelho:['#9e2f2f','#f1a1a1','#6e1d1d'],rosa:['#a53e68','#f6bbd2','#752b4a']
  };
  return map[theme]||['#17618f','#9bd7f5','#0d4262'];
}
function campaignIconSvg(theme){
  var p=campaignPalette(theme),a=p[0],b=p[1],d=p[2],safe=theme.replace(/[^a-z0-9]/g,'');
  if(theme==='dourado'){
    return '<svg viewBox="0 0 130 155" aria-hidden="true" focusable="false"><defs><linearGradient id="campGoldV5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff5bd"/><stop offset=".25" stop-color="#f8cc4d"/><stop offset=".58" stop-color="#d99a12"/><stop offset="1" stop-color="#8b5600"/></linearGradient><linearGradient id="campGoldLightV5" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff7c9"/><stop offset="1" stop-color="#e3a320"/></linearGradient><filter id="campGoldShadowV5" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#694000" flood-opacity=".30"/></filter></defs><g filter="url(#campGoldShadowV5)"><path d="M77 12c17 2 28 15 28 31 0 15-7 27-19 37 10 8 17 21 18 38 1 12-2 21-8 29H43c-12-12-17-27-14-44 3-18 13-32 28-40-8-7-13-16-13-26 0-15 13-27 33-25Z" fill="url(#campGoldV5)"/><path d="M84 17c-4 7-4 15 0 22 4 7 4 14-1 21-4 6-10 10-16 13 12-4 22-12 27-23 7-16 2-28-10-33Z" fill="#8a5600" opacity=".42"/><ellipse cx="70" cy="43" rx="13" ry="15" fill="url(#campGoldLightV5)"/><path d="M76 38c6 2 9 5 10 8-3-1-6 0-8 2" fill="none" stroke="#9b6100" stroke-width="2.8" stroke-linecap="round"/><circle cx="66" cy="93" r="13" fill="#fff1ac" stroke="#ae7409" stroke-width="2.5"/><path d="M43 87c9 15 24 24 45 20M39 101c13 17 31 24 51 14" fill="none" stroke="#875500" stroke-width="8" stroke-linecap="round"/><path d="M47 117c11 8 28 12 44 4" fill="none" stroke="#f8cf55" stroke-width="4" stroke-linecap="round" opacity=".7"/><path d="M108 70c6-10 22-3 14 9-4 7-14 13-14 13s-10-6-14-13c-8-12 8-19 14-9Z" fill="#f5bd31" stroke="#9b6100" stroke-width="3"/></g></svg>';
  }
  return '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false"><defs><linearGradient id="campRibbonV5'+safe+'A" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+b+'"/><stop offset=".42" stop-color="'+a+'"/><stop offset="1" stop-color="'+d+'"/></linearGradient><linearGradient id="campRibbonV5'+safe+'B" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+b+'"/><stop offset=".5" stop-color="'+a+'"/><stop offset="1" stop-color="'+d+'"/></linearGradient><filter id="campRibbonV5'+safe+'S" x="-30%" y="-20%" width="170%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="'+d+'" flood-opacity=".32"/></filter></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#campRibbonV5'+safe+'S)"><path d="M48 15C31 29 29 48 37 64c7 14 20 29 34 46l21 28" stroke="url(#campRibbonV5'+safe+'A)" stroke-width="24"/><path d="M73 15c18 13 22 32 15 50-6 15-18 29-32 46l-20 27" stroke="url(#campRibbonV5'+safe+'B)" stroke-width="24"/><path d="M42 20c-9 12-10 25-5 36" stroke="#fff" stroke-width="5" opacity=".24"/><path d="M82 22c7 11 8 23 4 34" stroke="#fff" stroke-width="5" opacity=".22"/><path d="M62 101l10 13" stroke="'+d+'" stroke-width="8" opacity=".28"/></g></svg>';
}
function campaignSpecificIconSvg(key,theme){
  var files={
    'JAN_ROXO':'janeiro-roxo.svg',
    'FEV_LARANJA':'fevereiro-laranja.svg',
    'MAR_ROXO':'marco-roxo.svg',
    'MAR_AZUL_MARINHO':'marco-azul-marinho.svg',
    'ABR_VERDE':'abril-verde.svg',
    'ABR_AZUL':'abril-azul.svg',
    'MAI_AMARELO':'maio-amarelo.svg',
    'JUN_VERMELHO':'junho-vermelho.svg',
    'JUL_AMARELO':'julho-amarelo.svg',
    'JUL_VERDE':'julho-verde.svg',
    'SET_AMARELO':'setembro-amarelo.svg',
    'SET_VERDE':'setembro-verde.svg',
    'OUT_ROSA':'outubro-rosa.svg',
    'NOV_AZUL':'novembro-azul.svg',
    'DEZ_VERMELHO':'dezembro-vermelho.svg',
    'DEZ_LARANJA':'dezembro-laranja.svg'
  };
  var file=files[key];
  if(!file)return campaignIconSvg(theme);
  return '<img src="assets/campanhas/'+file+'?v=padrao-agosto-20260817" alt="" aria-hidden="true" draggable="false" style="display:block;width:68px;height:68px;max-width:82%;max-height:82%;margin:auto;object-fit:contain;image-rendering:auto">';
}

function decorateCampaignSummary(box,meta){
  if(!box)return;
  var summary=box.querySelector('summary');if(!summary)return;
  var copy=summary.querySelector('div');if(!copy)return;
  copy.classList.add('camp-admin-copy');
  var h=copy.querySelector('h3');if(h)h.classList.add('camp-admin-title');
  var theme=campaignTheme(meta,h&&h.textContent);
  var catalog=campaignCatalogByTitle(h&&h.textContent);
  var key=txt(meta&&meta.CAMPANHA_CHAVE).toUpperCase()||catalog.key;
  var isAugust=/^AGO_/.test(key)||parseInt(meta&&meta.MES,10)===8;
  var subtitle=copy.querySelector('.camp-admin-subtitle');
  if(!subtitle){subtitle=document.createElement('div');subtitle.className='camp-admin-subtitle';if(h)h.insertAdjacentElement('afterend',subtitle);else copy.insertBefore(subtitle,copy.firstChild)}
  var subtitleValue=isAugust?txt(meta&&meta.SUBTITULO):txt(meta&&meta.SUBTITULO)||catalog.subtitle;
  subtitle.textContent=subtitleValue;subtitle.hidden=!subtitleValue;
  var period=copy.querySelector('.sub');
  if(period){
    period.classList.add('camp-admin-period');
    if(isAugust){
      var startInput=box.querySelector('[name="inicio"]'),daysInput=box.querySelector('[name="dias"]');
      var startValue=isoDate(startInput&&startInput.value),daysValue=txt(daysInput&&daysInput.value);
      var bits=[];if(startValue)bits.push('Início: '+dateBrIsoV41(startValue));if(daysValue)bits.push(daysValue);
      if(bits.length)period.textContent=bits.join(' • ');
      period.hidden=false;
    }else{
      period.hidden=true;
    }
  }
  var badge=summary.querySelector('.camp-admin-badge');
  if(!badge){badge=document.createElement('span');badge.className='camp-admin-badge';badge.textContent='CAMPANHA DO MÊS';summary.insertBefore(badge,summary.firstChild)}
  var symbol=summary.querySelector('.camp-admin-symbol');
  if(!symbol){symbol=document.createElement('span');symbol.className='camp-admin-symbol';symbol.setAttribute('aria-hidden','true');summary.appendChild(symbol)}
  if(isAugust){
    symbol.classList.remove('camp-symbol-static');
    if(symbol.dataset.theme!==theme||symbol.dataset.iconKey!=='AUGUST_LEGACY'){symbol.dataset.theme=theme;symbol.dataset.iconKey='AUGUST_LEGACY';symbol.innerHTML=campaignIconSvg(theme)}
  }else{
    symbol.classList.add('camp-symbol-static');
    var iconKey=key||('THEME_'+theme);
    if(symbol.dataset.iconKey!==iconKey){symbol.dataset.theme=theme;symbol.dataset.iconKey=iconKey;symbol.innerHTML=campaignSpecificIconSvg(key,theme)}
  }
}

function monthOptions(selected){return MONTHS.map(function(name,i){var v=String(i+1).padStart(2,'0');return'<option value="'+v+'" '+(v===selected?'selected':'')+'>'+name+'</option>'}).join('')}
function makeFields(meta){
  var div=document.createElement('div');div.className='camp-period-fields';
  div.innerHTML='<label><strong>Subtítulo da campanha</strong></label><input class="campo" name="subtitulo" value="'+esc(meta.SUBTITULO||'')+'" placeholder="Ex.: Incentivo ao aleitamento materno"><div class="period-grid"><div><label><strong>Ano</strong></label><input class="campo" name="ano" type="number" min="2000" max="2200" inputmode="numeric" value="'+esc(meta.ANO)+'"></div><div><label><strong>Mês</strong></label><select class="campo" name="mes">'+monthOptions(meta.MES)+'</select></div></div><label><strong>Validade</strong></label><div class="validadeCampo camp-validade-wrap"><input class="validadeControle camp-validade-input" name="validade" type="date" value="'+esc(meta.VALIDADE)+'"></div>'+(meta.COR_NOME?'<div class="camp-color-chip">Cor da campanha: '+esc(meta.COR_NOME)+'</div>':'')+'<div class="camp-context">'+contextText(meta)+'</div>';
  return div;
}
function renameContentLabel(box){
  Array.prototype.forEach.call(box.querySelectorAll('label'),function(label){if(txt(label.textContent)==='Mensagem'&&label.childNodes.length)label.childNodes[0].nodeValue='Conteúdo'})
}
function wrapCampaignStart(start){
  if(!start||start.closest('.camp-start-wrap'))return;
  var parent=start.parentNode;if(!parent)return;
  var wrap=document.createElement('div');wrap.className='camp-start-wrap';
  parent.insertBefore(wrap,start);wrap.appendChild(start);start.classList.add('camp-start-input');
}
function decorateBox(box,meta){
  if(!box)return;applyCampaignTheme(box,meta);decorateCampaignSummary(box,meta);
  var start=box.querySelector('[name="inicio"]');if(!start)return;
  if(!box.querySelector('.camp-period-fields')){
    var fields=makeFields(meta);
    var label=start.previousElementSibling;
    start.parentNode.insertBefore(fields,label||start);
  }
  var periodFields=box.querySelector('.camp-period-fields'),id=txt(box.dataset&&box.dataset.id),metaReady=id&&metadata[id];
  if(periodFields&&metaReady&&periodFields.dataset.metaHydratedV41!=='1'){
    var y=periodFields.querySelector('[name="ano"]'),m=periodFields.querySelector('[name="mes"]'),v=periodFields.querySelector('[name="validade"]'),sub=periodFields.querySelector('[name="subtitulo"]');
    if(y&&meta.ANO)y.value=txt(meta.ANO);
    if(m&&meta.MES)m.value=digits2(meta.MES);
    if(v&&meta.VALIDADE)v.value=isoDate(meta.VALIDADE);
    if(sub&&meta.SUBTITULO)sub.value=txt(meta.SUBTITULO);
    periodFields.dataset.metaHydratedV41='1';
  }
  wrapCampaignStart(start);
  decorateCampaignSummary(box,meta);
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
    if(changedList){decorate();fetchMetadata(700)}
  }).observe(document.body,{childList:true,subtree:true});
  fetchMetadata(700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}());
