(function(){
'use strict';
var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
var lastData=null;

function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
function dateBr(x){var m=String(x||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(x||'')}
function boolValue(value,defaultValue){if(value===true||value===1)return true;if(value===false||value===0)return false;if(value==null||value==='')return defaultValue;var n=String(value).trim().toLowerCase();if(['true','1','sim','yes','ativo','ativa'].indexOf(n)!==-1)return true;if(['false','0','nao','não','no','inativo','inativa'].indexOf(n)!==-1)return false;return defaultValue}
function published(item){if(!item)return false;var active=boolValue(item.active,boolValue(item.ativo,boolValue(item.ATIVO,false)));var closed=boolValue(item.closedNow,boolValue(item.encerradoAgora,boolValue(item.ENCERRADO_AGORA,false)));return active&&!closed}

function style(){
  if(document.getElementById('portal-integral-style'))return;
  var s=document.createElement('style');s.id='portal-integral-style';
  s.textContent=[
    '/* CAMPANHAS_PUBLICAS_CARDS_V6_REFERENCIA */',
    '.integral-area{display:grid;gap:14px;margin-bottom:20px}',
    '.integral-balloon{padding:20px;border:2px solid #0e6b98;border-radius:22px;background:linear-gradient(145deg,#052a43,#0a476b);color:#fff;box-shadow:0 14px 30px rgba(4,44,70,.2)}',
    '.integral-balloon small{display:block;color:#79e5a6;font-size:14px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}',
    '.integral-balloon strong{display:block;margin-top:8px;font-size:clamp(25px,5vw,34px);line-height:1.15}',
    '.integral-balloon p{margin:10px 0 0;color:#fff;font-size:18px;line-height:1.55;white-space:pre-line}',
    '.campaign-group{display:grid;gap:16px;padding:20px;border:2px solid #69c7e7;border-radius:24px;background:linear-gradient(145deg,#052a43,#0a476b);color:#fff}',
    '.campaign-group-head h2{margin:0;font-size:clamp(29px,6vw,42px);line-height:1.08}',
    '.campaign-group-head p{margin:6px 0 0;color:#70e39f;font-size:20px;font-weight:900}',
    '.campaign-card{--c1:#edf4f7;--c2:#d5e4ea;--ct:#16384a;--cb:#7aa4b7;position:relative;overflow:hidden;min-height:365px;padding:22px 22px 34px;border:3px solid var(--cb);border-radius:25px;background:linear-gradient(135deg,var(--c1),var(--c2));color:var(--ct);box-shadow:0 12px 26px rgba(0,0,0,.16)}',
    '.campaign-card.integral-campaign{border-left-width:3px}',
    '.campaign-theme-lilas{--c1:#ead9ff;--c2:#d4adf2;--ct:#32105f;--cb:#9258c6}',
    '.campaign-theme-dourado{--c1:#ffe7a3;--c2:#f6c954;--ct:#4f3400;--cb:#c28a13}',
    '.campaign-theme-roxo{--c1:#e4d4ff;--c2:#b995e8;--ct:#2e1258;--cb:#7650ae}',
    '.campaign-theme-laranja{--c1:#ffe0b5;--c2:#f2a24d;--ct:#512700;--cb:#c46b12}',
    '.campaign-theme-azul-marinho{--c1:#163a69;--c2:#0b2443;--ct:#fff;--cb:#72a8df}',
    '.campaign-theme-verde{--c1:#d8f2df;--c2:#79c992;--ct:#123f23;--cb:#39945b}',
    '.campaign-theme-azul{--c1:#d8efff;--c2:#79bce8;--ct:#0b3654;--cb:#2e88bf}',
    '.campaign-theme-amarelo{--c1:#fff5b8;--c2:#f2d257;--ct:#4c3d00;--cb:#c4a20f}',
    '.campaign-theme-vermelho{--c1:#ffd6d6;--c2:#e78383;--ct:#5d1717;--cb:#b33b3b}',
    '.campaign-theme-rosa{--c1:#ffdbea;--c2:#ef9cbd;--ct:#641d3a;--cb:#bd5b82}',
    '.campaign-top{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.campaign-label{display:inline-flex!important;width:max-content;max-width:68%;padding:8px 12px;border-radius:11px;background:rgba(5,42,67,.86);color:#fff!important;font-size:13px!important;font-weight:950!important}',
    '.campaign-status{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.9);color:#08723a;font-size:15px;font-weight:950;white-space:nowrap}',
    '.campaign-title{position:relative;z-index:4;display:block;max-width:67%;margin-top:19px!important;color:var(--ct);font-size:clamp(32px,6.4vw,46px)!important;font-weight:950!important;line-height:1.04!important;letter-spacing:-.035em;overflow-wrap:anywhere}',
    '.campaign-subtitle{position:relative;z-index:4;max-width:67%;margin:9px 0 0;color:var(--ct);font-size:clamp(20px,4.2vw,26px);font-weight:900;line-height:1.27;overflow-wrap:anywhere}',
    '.campaign-description{position:relative;z-index:4;width:62%;max-width:62%;margin:22px 0 0!important;padding:18px 0 16px;border-top:4px solid var(--cb);color:var(--ct)!important;font-size:clamp(21px,4.5vw,25px)!important;font-weight:820!important;line-height:1.44!important;overflow-wrap:anywhere}',
    '.campaign-meta,.campaign-calendar{display:none!important}',
    '.campaign-art{position:absolute;right:12px;bottom:18px;z-index:2;width:160px;height:205px;display:grid;place-items:center;pointer-events:none}',
    '.campaign-art img,.campaign-art svg{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;overflow:visible;filter:drop-shadow(0 9px 10px rgba(45,24,6,.24))}',
    '.campaign-theme-lilas .campaign-art{width:145px;height:240px;right:13px;bottom:9px}',
    '.campaign-theme-dourado .campaign-art{width:165px;height:218px;right:8px;bottom:14px}',
    '.integral-days{display:grid;grid-template-columns:1fr;gap:12px;margin-top:16px}',
    '.integral-day{width:100%;padding:18px 17px;border:2px solid #9bb4c1;border-radius:16px;background:#fff;color:#102b3c;text-align:left}',
    '.integral-day strong,.integral-day span,.integral-day b{display:block}.integral-day strong{font-size:22px}.integral-day span{margin-top:6px;color:#415b69;font-size:16px}.integral-day b{margin-top:8px;color:#06763a;font-size:18px}',
    '@media(max-width:520px){.campaign-card{min-height:380px;padding:18px 17px 30px}.campaign-label{font-size:12px!important;padding:7px 9px}.campaign-status{font-size:14px;padding:7px 10px}.campaign-title{max-width:69%;font-size:clamp(30px,8vw,39px)!important}.campaign-subtitle{max-width:69%;font-size:clamp(19px,5vw,23px)}.campaign-description{width:63%;max-width:63%;font-size:clamp(19px,5vw,22px)!important;line-height:1.42!important;padding-bottom:20px}.campaign-art{right:4px;bottom:13px;width:122px;height:170px}.campaign-theme-lilas .campaign-art{width:112px;height:190px;right:4px;bottom:6px}.campaign-theme-dourado .campaign-art{width:128px;height:170px;right:0;bottom:10px}}',
    '@media(max-width:390px){.campaign-card{min-height:405px}.campaign-title,.campaign-subtitle{max-width:72%}.campaign-description{width:61%;max-width:61%;font-size:19px!important}.campaign-theme-lilas .campaign-art{width:104px;height:178px}.campaign-theme-dourado .campaign-art{width:116px;height:157px}}'
  ].join('');
  document.head.appendChild(s);
}

function jsonp(ok,attempt){
  if(window.PortalTacsPublicData&&typeof window.PortalTacsPublicData.get==='function'){window.PortalTacsPublicData.get().then(ok).catch(function(){});return}
  attempt=attempt||1;if(!API)return;
  var cb='tacsPublicIntegral'+Date.now()+Math.floor(Math.random()*100000),s=document.createElement('script'),done=false,t=setTimeout(function(){finish()},25000);
  function finish(data){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){}if(s.parentNode)s.remove();if(data&&data.ok!==false){ok(data);return}if(attempt<2)setTimeout(function(){jsonp(ok,attempt+1)},1000)}
  window[cb]=finish;s.onerror=function(){finish()};
  s.src=API+(API.indexOf('?')<0?'?':'&')+'action=painel_publico&areaId='+encodeURIComponent((window.PortalTacsArea&&window.PortalTacsArea.id&&window.PortalTacsArea.id())||window.TACS_AREA_ID||'JAPARANDUBA')+'&callback='+encodeURIComponent(cb)+'&v='+Date.now();
  document.head.appendChild(s);
}
function insertArea(){var content=document.querySelector('.content');if(!content)return null;var area=document.getElementById('integralPublicArea');if(area)return area;area=document.createElement('section');area.id='integralPublicArea';area.className='integral-area';var purpose=content.querySelector('.purpose');content.insertBefore(area,purpose||content.firstChild);return area}
function renderBalloon(area,item,label,extra){var c=document.createElement('article');c.className='integral-balloon '+(extra||'');c.innerHTML='<small>'+esc(label)+'</small><strong>'+esc(item.title||'Aviso da Unidade')+'</strong><p>'+esc(item.message||'')+(item.time||item.horario?'\nHorário: '+esc(item.time||item.horario):'')+(item.validity?'\nVálido até: '+esc(dateBr(item.validity)):'')+'</p>';area.appendChild(c)}
function normalize(value){var t=String(value||'').toLowerCase();return t.normalize?t.normalize('NFD').replace(/[\u0300-\u036f]/g,''):t}
function campaignTheme(item){var t=String(item&&item.theme||'').toLowerCase().replace(/[^a-z0-9-]/g,'');if(t)return t;var n=normalize(item&&item.title),temas=['lilas','dourado','azul-marinho','laranja','amarelo','vermelho','verde','roxo','rosa','azul'];for(var i=0;i<temas.length;i++)if(n.indexOf(temas[i])!==-1)return temas[i];return'azul'}

function campaignIconHtml(theme){
  if(theme==='lilas')return '<img src="/atendimento-acs-farmaceutico/assets/campanhas/agosto-lilas-referencia.svg?v=20260817-ref2" alt="" aria-hidden="true">';
  if(theme==='dourado')return '<img src="/atendimento-acs-farmaceutico/assets/campanhas/agosto-dourado-referencia.svg?v=20260817-ref2" alt="" aria-hidden="true">';
  var colors={roxo:['#6331a8','#c0a0ef','#442176'],laranja:['#b85d00','#ffc574','#7d3b00'],'azul-marinho':['#173b69','#8eb8e2','#0d2748'],verde:['#17723a','#9adbb0','#0e4c27'],azul:['#17618f','#9bd7f5','#0d4262'],amarelo:['#9b7900','#ffeb86','#6f5700'],vermelho:['#9e2f2f','#f1a1a1','#6e1d1d'],rosa:['#a53e68','#f6bbd2','#752b4a']},p=colors[theme]||colors.azul,id='publicRibbonV6'+theme.replace(/[^a-z0-9]/g,'');
  return '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false"><defs><linearGradient id="'+id+'A" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p[1]+'"/><stop offset=".42" stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[2]+'"/></linearGradient><linearGradient id="'+id+'B" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+p[1]+'"/><stop offset=".5" stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[2]+'"/></linearGradient></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M48 15C31 29 29 48 37 64c7 14 20 29 34 46l21 28" stroke="url(#'+id+'A)" stroke-width="24"/><path d="M73 15c18 13 22 32 15 50-6 15-18 29-32 46l-20 27" stroke="url(#'+id+'B)" stroke-width="24"/></g></svg>';
}
function monthLabel(){try{var v=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',month:'long',year:'numeric'}).format(new Date());return v.charAt(0).toUpperCase()+v.slice(1)}catch(e){return''}}
function cleanCampaignLegacyMeta(card){if(!card)return;card.querySelectorAll('.campaign-meta,.campaign-calendar').forEach(function(n){n.remove()});Array.prototype.forEach.call(card.querySelectorAll('*'),function(n){if(n.children.length===0&&/^\s*Válida até\b/i.test(String(n.textContent||'')))n.remove()})}
function renderCampaign(group,item){
  var theme=campaignTheme(item),c=document.createElement('article');
  c.className='integral-balloon integral-campaign campaign-card campaign-theme-'+theme;c.dataset.campaignTheme=theme;
  c.innerHTML='<div class="campaign-top"><small class="campaign-label">CAMPANHA DO MÊS</small><span class="campaign-status">✓ Ativa</span></div><strong class="campaign-title">'+esc(item.title||'Campanha da Unidade')+'</strong>'+(item.subtitle?'<div class="campaign-subtitle">'+esc(item.subtitle)+'</div>':'')+'<p class="campaign-description">'+esc(item.message||'')+'</p><div class="campaign-art" aria-hidden="true">'+campaignIconHtml(theme)+'</div>';
  cleanCampaignLegacyMeta(c);group.appendChild(c);
}
function renderAlerts(data){
  var area=insertArea();if(!area)return;area.innerHTML='';
  (data.recados||[]).filter(function(x){return x.active!==false}).forEach(function(x){renderBalloon(area,x,'Recado da Unidade')});
  var campanhas=(data.campanhas||[]).filter(function(x){return x.active!==false});
  if(campanhas.length){var group=document.createElement('section');group.className='campaign-group';group.innerHTML='<header class="campaign-group-head"><h2>Campanhas da unidade</h2><p>'+esc(monthLabel())+'</p></header>';campanhas.forEach(function(x){renderCampaign(group,x)});area.appendChild(group)}
  if(!area.children.length)area.remove();
}
function category(m){return m==='medica'?'Solicitar atendimento com a Médica':'Solicitar atendimento com nutricionista'}
function moduleDays(data,m){var modules=data.modules||data.modulos||{};if(m==='medica')return modules.medica||modules.MEDICA||data.medica||data.MEDICA||[];return modules.nutricionista||modules.NUTRICIONISTA||data.nutricionista||data.NUTRICIONISTA||[]}
function renderLegacy(m,days){
  var box=document.getElementById(m==='medica'?'doctorSchedule':'nutritionSchedule');if(!box)return;
  days=(Array.isArray(days)?days:[]).filter(published);var old=box.querySelector('.integral-days');if(old)old.remove();
  var empty=box.querySelectorAll('p');empty.forEach(function(p){var t=String(p.textContent||'');if(/Nenhuma programação|Nenhum dia ativo/.test(t))p.hidden=false});
  if(!days.length){box.hidden=false;return}
  box.hidden=false;empty.forEach(function(p){var t=String(p.textContent||'');if(/Nenhuma programação|Nenhum dia ativo/.test(t))p.hidden=true});
  var list=document.createElement('div');list.className='integral-days';
  days.forEach(function(item){
    var day=item.day||item.dia||item.DIA||'Dia informado',date=item.date||item.data||item.DATA||'',time=item.time||item.horario||item.HORARIO||'',message=item.message||item.mensagem||item.MENSAGEM||item.service||item.servico||item.SERVICO||'Atendimento disponível';
    var b=document.createElement('button');b.type='button';b.className='integral-day';
    b.innerHTML='<strong>'+esc(day)+'</strong>'+(date?'<span>📅 '+esc(dateBr(date))+'</span>':'')+(time?'<span>🕒 '+esc(time)+'</span>':'')+'<b>'+esc(message)+'</b>';
    b.onclick=function(){var select=document.getElementById('category'),subject=document.getElementById('subject'),value=category(m);if(select){var opt=Array.prototype.find.call(select.options,function(o){return o.value===value||String(o.textContent||'').trim()===value});if(opt)select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}))}if(subject){subject.value=value+' - '+day+(date?' - '+dateBr(date):'')+(time?' - '+time:'')+': '+message;subject.dispatchEvent(new Event('input',{bubbles:true}))}};
    list.appendChild(b);
  });
  box.appendChild(list);
}
function render(data){if(!data||data.ok===false)return;lastData=data;renderAlerts(data)}
function load(forcar){if(forcar&&window.PortalTacsPublicData&&typeof window.PortalTacsPublicData.refresh==='function'){window.PortalTacsPublicData.refresh().then(render).catch(function(){});return}jsonp(render,1)}
function init(){
  style();
  window.addEventListener('portal-tacs-public-data',function(event){render(event&&event.detail)});
  load();
  var select=document.getElementById('category');
  if(select)select.addEventListener('change',function(){var value=String(select.value||'').toLowerCase();if((value.indexOf('médica')!==-1||value.indexOf('medica')!==-1||value.indexOf('nutricionista')!==-1)&&lastData)render(lastData)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)load(true)});
  setInterval(function(){load(true)},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
