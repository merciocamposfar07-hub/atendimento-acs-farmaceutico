(function(){
'use strict';
if(window.PortalTacsAgendaWhatsAppV2)return;
window.PortalTacsAgendaWhatsAppV2=true;

var CARD_UNIT='Unidade de Saúde Posto Matias';
var CARD_BRAND='Conecta Saúde Comunitária';
var CARD_FOOTER='PORTAL TACS';
var CARD_REVISION='20260823-card-institucional-v1';

function txt(v){return String(v==null?'':v).trim()}
function field(card,name){var e=card&&card.querySelector('[name="'+name+'"]');return e?txt(e.value):''}
function checked(card,name){var e=card&&card.querySelector('[name="'+name+'"]');return !!(e&&e.checked)}
function dateBr(v){var m=txt(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}
function roundRect(ctx,x,y,w,h,r){var rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function wrapLines(ctx,text,maxWidth){var words=txt(text).split(/\s+/).filter(Boolean),lines=[],line='';words.forEach(function(word){var test=line?line+' '+word:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test});if(line)lines.push(line);return lines.length?lines:['']}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){var lines=wrapLines(ctx,text,maxWidth);if(maxLines&&lines.length>maxLines){lines=lines.slice(0,maxLines);var last=lines[maxLines-1];while(last.length>1&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[maxLines-1]=last+'…'}lines.forEach(function(value,index){ctx.fillText(value,x,y+index*lineHeight)});return y+lines.length*lineHeight}
function fitFont(ctx,text,weight,start,min,maxWidth){var size=start;while(size>min){ctx.font=weight+' '+size+'px -apple-system,BlinkMacSystemFont,Arial';if(ctx.measureText(text).width<=maxWidth)return size;size--}ctx.font=weight+' '+min+'px -apple-system,BlinkMacSystemFont,Arial';return min}
function assetUrl(path){try{return new URL(path,document.baseURI).href}catch(e){return path}}
function loadImage(src){return new Promise(function(resolve,reject){var img=new Image();img.onload=function(){resolve(img)};img.onerror=function(){reject(new Error('Falha ao carregar imagem: '+src))};img.src=src})}
function loadConectaLogo(){return loadImage(assetUrl('icons/conecta-saude-comunitaria-card.svg?v='+CARD_REVISION)).catch(function(){return null})}
function norm(v){return txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function titleCase(v){return txt(v).toLowerCase().replace(/(^|[\s/-])([a-záàâãéêíóôõúç])/g,function(_,a,b){return a+b.toUpperCase()})}
function professionalHeading(data){
  var key=norm(data.module||data.title),name=titleCase(data.title||data.module||'Atendimento');
  if(key.indexOf('NUTRICIONISTA')!==-1)return{lead:'Atendimento com a',name:'Nutricionista'};
  if(key.indexOf('ODONTO')!==-1||key.indexOf('DENTISTA')!==-1)return{lead:'Atendimento com a',name:'Dentista'};
  if(key.indexOf('MEDIC')!==-1)return{lead:'Atendimento com a',name:'Médica'};
  if(key.indexOf('ENFERMEIR')!==-1)return{lead:'Atendimento com a',name:'Enfermeira'};
  if(key.indexOf('PSICOLOG')!==-1)return{lead:'Atendimento com o',name:'Psicólogo'};
  return{lead:'Atendimento com',name:name};
}
function isNutrition(data){return norm(data.module||data.title).indexOf('NUTRICIONISTA')!==-1}

function territory(){
  var i=window.PortalTacsTerritoryIdentity||{},p=new URLSearchParams(location.search||''),id=txt(i.areaId||p.get('area')||'JAPARANDUBA').toUpperCase();
  var area=txt(i.areaNome)||(id==='JAPARANDUBA'?'Sítio Japaranduba':id.replace(/_/g,' '));
  return{areaName:area,unitName:CARD_UNIT,cityName:'Chã Grande - PE'};
}
function read(card){
  var t=territory(),summary=card.querySelector('summary'),title=summary&&summary.querySelector('h3');
  return{module:field(card,'modulo'),title:txt(title&&title.textContent)||field(card,'modulo')||'Atendimento',day:field(card,'dia'),date:field(card,'data'),time:field(card,'horario'),status:field(card,'situacao'),message:field(card,'mensagem'),common:Math.max(0,Number(field(card,'vagasComuns'))||0),emergency:Math.max(0,Number(field(card,'vagasEmergenciais'))||0),active:checked(card,'ativo'),extra:checked(card,'diaExtra'),areaName:t.areaName,unitName:t.unitName,cityName:t.cityName};
}
function readGroup(group){
  var t=territory(),summary=group.querySelector(':scope > summary'),name=summary&&summary.querySelector('.grupoProfissionalNome strong'),cards=Array.from(group.querySelectorAll('.agendaProfissionalCorpo > details.cartao'));
  return{title:txt(name&&name.textContent)||'Agenda do profissional',days:cards.map(read),areaName:t.areaName,unitName:t.unitName,cityName:t.cityName};
}

function paintBackground(ctx){
  var g=ctx.createLinearGradient(0,0,1080,1920);
  g.addColorStop(0,'#071d31');g.addColorStop(.58,'#06334e');g.addColorStop(1,'#075878');
  ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
  ctx.save();ctx.globalAlpha=.08;ctx.fillStyle='#5cc6e5';ctx.beginPath();ctx.arc(1110,120,300,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawBrand(ctx,logo,areaName){
  if(logo)ctx.drawImage(logo,58,58,258,258);
  ctx.fillStyle='#fff';ctx.textAlign='left';
  ctx.font='900 58px -apple-system,BlinkMacSystemFont,Arial';
  ctx.fillText('Conecta Saúde',355,150);
  ctx.fillText('Comunitária',355,216);
  ctx.textAlign='center';
  fitFont(ctx,CARD_UNIT,'900',58,42,950);
  ctx.fillText(CARD_UNIT,540,366);
  ctx.font='500 40px -apple-system,BlinkMacSystemFont,Arial';
  ctx.fillText('Área atendida: '+(areaName||'Sítio Japaranduba'),540,428);
  ctx.textAlign='left';
}
function drawTitle(ctx,data,y){
  var h=professionalHeading(data);
  ctx.fillStyle='#fff';ctx.font='900 74px -apple-system,BlinkMacSystemFont,Arial';
  y=wrap(ctx,h.lead,88,y,910,82,2)+3;
  fitFont(ctx,h.name,'900',90,58,910);
  y=wrap(ctx,h.name,88,y,910,96,2)+28;
  return y;
}
function drawFooter(ctx){
  var y=1726,h=150;
  ctx.fillStyle='rgba(3,31,54,.78)';roundRect(ctx,0,y,1080,h,78);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 68px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(CARD_FOOTER,540,1825);ctx.textAlign='left';
}
function drawDetailsPanel(ctx,data,y){
  var panelX=68,panelW=944,panelBottom=1678,panelH=Math.max(650,panelBottom-y);
  ctx.fillStyle='#f8fbfb';roundRect(ctx,panelX,y,panelW,panelH,54);ctx.fill();
  var x=126,cy=y+102,maxW=828,dark='#09234a';
  ctx.fillStyle=dark;ctx.font='900 48px -apple-system,BlinkMacSystemFont,Arial';
  ctx.fillText(data.active?'AGENDA ATIVA':'AGENDA INATIVA',x,cy);cy+=92;
  ctx.font='900 43px -apple-system,BlinkMacSystemFont,Arial';
  ctx.fillText(data.extra?'DIA EXTRA':'DIA DE ATENDIMENTO',x,cy);cy+=82;
  ctx.font='900 68px -apple-system,BlinkMacSystemFont,Arial';
  cy=wrap(ctx,data.day||'Dia não informado',x,cy,maxW,76,2)+22;
  ctx.font='800 46px -apple-system,BlinkMacSystemFont,Arial';
  if(data.date){ctx.fillText('Data: '+dateBr(data.date),x,cy);cy+=76}
  if(data.time){cy=wrap(ctx,'Horário: '+data.time,x,cy,maxW,58,2)+18}
  if(data.status){ctx.font='800 43px -apple-system,BlinkMacSystemFont,Arial';cy=wrap(ctx,'Situação: '+data.status,x,cy,maxW,54,2)+24}
  ctx.font='900 43px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('VAGAS DISPONÍVEIS',x,cy);cy+=66;
  ctx.fillStyle='#0a6538';ctx.font='900 48px -apple-system,BlinkMacSystemFont,Arial';
  ctx.fillText(data.common+' vaga(s) comum(ns)',x,cy);cy+=62;
  if(!isNutrition(data)){
    ctx.fillStyle='#8f2f2f';ctx.font='900 43px -apple-system,BlinkMacSystemFont,Arial';
    ctx.fillText(data.emergency+' vaga(s) de emergência',x,cy);cy+=62;
  }
  if(data.message&&cy<panelBottom-125){
    ctx.fillStyle=dark;ctx.font='900 36px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('INFORMAÇÃO',x,cy);cy+=52;
    ctx.font='700 32px -apple-system,BlinkMacSystemFont,Arial';wrap(ctx,data.message,x,cy,maxW,42,Math.max(1,Math.floor((panelBottom-cy-55)/42)));
  }
}
function draw(data){
  var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d');
  paintBackground(ctx);
  return loadConectaLogo().then(function(logo){
    drawBrand(ctx,logo,data.areaName);
    var y=555;y=drawTitle(ctx,data,y);
    drawDetailsPanel(ctx,data,y);
    drawFooter(ctx);
    return c;
  });
}

function drawGroup(data){
  var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d');
  paintBackground(ctx);
  return loadConectaLogo().then(function(logo){
    drawBrand(ctx,logo,data.areaName);
    ctx.fillStyle='#fff';ctx.font='900 66px -apple-system,BlinkMacSystemFont,Arial';
    var h=professionalHeading({title:data.title,module:data.title}),y=560;
    ctx.fillText('Agenda completa',88,y);y+=82;
    fitFont(ctx,h.name,'900',78,54,900);y=wrap(ctx,h.name,88,y,900,84,2)+28;

    var panelX=68,panelY=y,panelW=944,panelBottom=1678,panelH=panelBottom-panelY;
    ctx.fillStyle='#f8fbfb';roundRect(ctx,panelX,panelY,panelW,panelH,54);ctx.fill();
    var days=data.days.slice(0,7),rowGap=18,top=panelY+42,available=panelBottom-top-38;
    var rowH=Math.min(205,Math.max(125,Math.floor((available-rowGap*Math.max(0,days.length-1))/Math.max(1,days.length))));
    days.forEach(function(day,index){
      var ry=top+index*(rowH+rowGap),compact=rowH<170,dark='#09234a';
      ctx.fillStyle=day.active?'#ffffff':'#fff4f4';roundRect(ctx,102,ry,876,rowH,30);ctx.fill();
      ctx.strokeStyle=day.active?'#d7e4e8':'#e2b6b6';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=dark;ctx.font=(compact?'900 31px':'900 36px')+' -apple-system,BlinkMacSystemFont,Arial';
      ctx.fillText((day.extra?'DIA EXTRA • ':'')+(day.day||'Dia'),138,ry+(compact?38:45));
      ctx.font=(compact?'700 25px':'700 29px')+' -apple-system,BlinkMacSystemFont,Arial';
      var meta=[];if(day.date)meta.push(dateBr(day.date));if(day.time)meta.push(day.time);
      ctx.fillText(meta.join(' • ')||'Data/horário não informado',138,ry+(compact?72:82));
      ctx.font=(compact?'800 24px':'800 27px')+' -apple-system,BlinkMacSystemFont,Arial';
      ctx.fillText(day.active?'AGENDA ATIVA':'AGENDA INATIVA',138,ry+(compact?104:119));
      ctx.fillStyle='#0a6538';ctx.fillText(day.common+' vaga(s) comum(ns)',138,ry+(compact?136:158));
      if(!isNutrition(day)){ctx.fillStyle='#8f2f2f';ctx.fillText(day.emergency+' emergência',525,ry+(compact?136:158))}
    });
    drawFooter(ctx);return c;
  });
}

function dataUrlToBlob(dataUrl){var p=dataUrl.split(','),mime=(p[0].match(/:(.*?);/)||[])[1]||'image/png',bin=atob(p[1]),len=bin.length,arr=new Uint8Array(len);for(var i=0;i<len;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime})}
function blob(canvas){return new Promise(function(resolve,reject){try{if(canvas.toBlob){canvas.toBlob(function(b){if(b){resolve(b);return}try{resolve(dataUrlToBlob(canvas.toDataURL('image/png')))}catch(e){reject(e)}},'image/png',1);return}resolve(dataUrlToBlob(canvas.toDataURL('image/png')))}catch(e){reject(e)}})}
function safeName(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}
function filename(data){return'portal-tacs-agenda-'+safeName(data.title)+'-'+safeName(data.day)+'.png'}
function filenameGroup(data){return'portal-tacs-agenda-completa-'+safeName(data.title)+'.png'}
function openImage(b,button,resetText){var u=URL.createObjectURL(b),w=null;try{w=window.open(u,'_blank')}catch(e){}if(!w)location.href=u;button.textContent='Card aberto';setTimeout(function(){button.textContent=resetText;URL.revokeObjectURL(u)},2500)}
function shareBlob(canvas,data,button,group){var resetText=group?'📲 Card da agenda completa':'📲 Card para WhatsApp';button.disabled=true;button.textContent='Criando card…';Promise.resolve(canvas).then(blob).then(function(b){var f=null,canFiles=false;try{f=new File([b],group?filenameGroup(data):filename(data),{type:'image/png'});canFiles=!!(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]})))}catch(e){canFiles=false}if(canFiles){return navigator.share({files:[f],title:data.title,text:'Portal TACS • '+data.areaName}).then(function(){button.textContent='Card compartilhado'}).catch(function(err){if(err&&err.name==='AbortError')return;openImage(b,button,resetText)})}openImage(b,button,resetText)}).catch(function(err){try{console.error('Portal TACS — erro ao criar card',err)}catch(e){}button.textContent='Erro ao criar card'}).finally(function(){setTimeout(function(){button.disabled=false;button.textContent=resetText},2200)})}
function share(card,button){var data=read(card);shareBlob(draw(data),data,button,false)}
function shareGroup(group,button){var data=readGroup(group);shareBlob(drawGroup(data),data,button,true)}

function style(){if(document.getElementById('agendaWhatsAppCardV2Style'))return;var s=document.createElement('style');s.id='agendaWhatsAppCardV2Style';s.textContent='.agendaWhatsappCardV1{margin-top:10px!important;background:linear-gradient(145deg,#0b5878,#073a55)!important;color:#fff!important;border:3px solid #69c7e7!important;box-shadow:0 7px 18px rgba(7,58,85,.20)!important}.agendaWhatsappCardV1:disabled,.agendaWhatsappGrupoV2:disabled{opacity:.6!important}.grupoProfissional>summary{position:relative!important;padding-bottom:76px!important}.agendaWhatsappGrupoV2{position:absolute!important;left:14px!important;right:14px!important;bottom:12px!important;width:auto!important;min-height:48px!important;border:2px solid #69c7e7!important;border-radius:999px!important;background:#0b5878!important;color:#fff!important;font-size:.82rem!important;font-weight:900!important;line-height:1.1!important;padding:9px 12px!important;z-index:3!important;box-shadow:0 5px 14px rgba(7,58,85,.18)!important}.agendaWhatsappGrupoV2:active{transform:scale(.99)}.agendaAtualizarPaginaFlutuanteV2{position:fixed!important;right:max(14px,calc(env(safe-area-inset-right) + 10px))!important;bottom:max(96px,calc(env(safe-area-inset-bottom) + 86px))!important;left:auto!important;top:auto!important;width:auto!important;max-width:calc(100vw - 28px)!important;min-height:54px!important;padding:10px 18px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;border:3px solid #d9f0f9!important;border-radius:999px!important;background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important;font-size:.96rem!important;font-weight:900!important;line-height:1!important;white-space:nowrap!important;box-shadow:0 9px 24px rgba(0,0,0,.30)!important;z-index:2147483000!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}.agendaAtualizarPaginaFlutuanteV2:active{transform:scale(.98)!important}.agendaAtualizarPaginaFlutuanteV2:disabled{opacity:.75!important}@media(max-width:560px){.grupoProfissional>summary{padding-bottom:78px!important}.agendaWhatsappGrupoV2{font-size:.78rem!important}.agendaAtualizarPaginaFlutuanteV2{right:14px!important;bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))!important;font-size:.92rem!important;padding:10px 16px!important}}';document.head.appendChild(s)}
function injectRefreshButton(){var antigo=document.getElementById('atualizarPaginaAgendas');if(antigo&&antigo.parentNode)antigo.parentNode.removeChild(antigo);if(document.getElementById('atualizarPaginaAgendasFlutuante'))return;if(!document.body)return;var b=document.createElement('button');b.id='atualizarPaginaAgendasFlutuante';b.type='button';b.className='agendaAtualizarPaginaFlutuanteV2';b.setAttribute('aria-label','Atualizar página');b.setAttribute('title','Atualizar página');b.innerHTML='<span aria-hidden="true">↻</span><span>Atualizar página</span>';b.addEventListener('click',function(){if(b.disabled)return;b.disabled=true;b.innerHTML='<span aria-hidden="true">↻</span><span>Atualizando…</span>';setTimeout(function(){window.location.reload()},40)});document.body.appendChild(b)}
function injectDayButtons(){document.querySelectorAll('#listaAgendas details.cartao').forEach(function(card){if(card.dataset.whatsappAgendaV1==='1')return;var actions=card.querySelector('.acoes');if(!actions)return;card.dataset.whatsappAgendaV1='1';var b=document.createElement('button');b.type='button';b.className='botao agendaWhatsappCardV1';b.textContent='📲 Card para WhatsApp';b.addEventListener('click',function(){share(card,b)});actions.appendChild(b)})}
function injectGroupButtons(){document.querySelectorAll('#listaAgendas details.grupoProfissional').forEach(function(group){if(group.dataset.whatsappGrupoV2==='1')return;var summary=group.querySelector(':scope > summary');if(!summary)return;group.dataset.whatsappGrupoV2='1';var b=document.createElement('button');b.type='button';b.className='agendaWhatsappGrupoV2';b.textContent='📲 Card da agenda completa';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();shareGroup(group,b)});summary.appendChild(b)})}
function inject(){style();injectRefreshButton();injectDayButtons();injectGroupButtons()}

/* CORRECAO_RELEITURA_AGENDA_V1 — preservada sem alteração funcional. */
var ultimaAgendaSalva=null;
function normalTexto(v){return txt(v).replace(/\s+/g,' ').toUpperCase()}
function normalHora(v){var m=txt(v).match(/^(\d{1,2}):(\d{2})/);return m?String(m[1]).padStart(2,'0')+':'+m[2]:txt(v)}
function snapshotAgenda(card){return card?{modulo:normalTexto(field(card,'modulo')),dia:normalTexto(field(card,'dia')),data:field(card,'data'),horario:normalTexto(field(card,'horario')),situacao:normalTexto(field(card,'situacao')),mensagem:normalTexto(field(card,'mensagem')),encerraHorario:normalHora(field(card,'encerraHorario')),vagasComuns:Number(field(card,'vagasComuns'))||0,vagasEmergenciais:Number(field(card,'vagasEmergenciais'))||0,diaExtra:checked(card,'diaExtra'),ativo:checked(card,'ativo')}:null}
function agendaAtualIgual(s){if(!s)return false;var cards=Array.from(document.querySelectorAll('#listaAgendas details.cartao')),card=cards.find(function(c){return normalTexto(field(c,'modulo'))===s.modulo&&normalTexto(field(c,'dia'))===s.dia});if(!card)return false;var a=snapshotAgenda(card);return a.data===s.data&&a.horario===s.horario&&a.situacao===s.situacao&&a.mensagem===s.mensagem&&a.encerraHorario===s.encerraHorario&&a.vagasComuns===s.vagasComuns&&a.vagasEmergenciais===s.vagasEmergenciais&&a.diaExtra===s.diaExtra&&a.ativo===s.ativo}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.salvarAgenda');if(b)ultimaAgendaSalva=snapshotAgenda(b.closest('details.cartao'))},true);
function corrigirFalsoAlerta(){var s=document.getElementById('statusOperacao');if(!s||!ultimaAgendaSalva)return;var msg=txt(s.textContent);if(msg.indexOf('releitura não coincidiu integralmente')===-1)return;if(agendaAtualIgual(ultimaAgendaSalva)){s.textContent='Agenda gravada e confirmada pela releitura da planilha.';s.className='status ok';ultimaAgendaSalva=null}}
var observer=new MutationObserver(function(){inject();corrigirFalsoAlerta()});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});document.addEventListener('DOMContentLoaded',inject);inject();
}());
