(function(){
'use strict';
if(window.PortalCscSolicitacaoCardOficialV1)return;

var CSC_CARD_ICON='/atendimento-acs-farmaceutico/conecta-saude-homologacao/v15/assets/conecta-saude-central-canonico-2026-09-09.png?v=20260920-solicitacao-card-icon-v1';

function clean(value){return String(value==null?'':value).trim()}
function normalizeArea(value){
  var text=clean(value).toUpperCase();
  if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return text.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}
function parseBirth(value){
  var text=clean(value),match=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!match)return null;
  var day=Number(match[1]),month=Number(match[2]),year=Number(match[3]),date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return{year:year,month:month,day:day};
}
function recifeParts(){
  var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),result={};
  parts.forEach(function(part){result[part.type]=Number(part.value)});
  return result;
}
function daysInMonth(year,month){return new Date(Date.UTC(year,month,0)).getUTCDate()}
function compareDate(a,b){if(a.year!==b.year)return a.year-b.year;if(a.month!==b.month)return a.month-b.month;return a.day-b.day}
function addYears(date,amount){var year=date.year+amount;return{year:year,month:date.month,day:Math.min(date.day,daysInMonth(year,date.month))}}
function addMonths(date,amount){var total=date.year*12+(date.month-1)+amount,year=Math.floor(total/12),month=(total%12)+1;return{year:year,month:month,day:Math.min(date.day,daysInMonth(year,month))}}
function utcStamp(date){return Date.UTC(date.year,date.month-1,date.day)}
function detailedAge(value){
  var birth=parseBirth(value);if(!birth)return'Não informada';
  var today=recifeParts();if(compareDate(birth,today)>0)return'Não informada';
  var totalDays=Math.floor((utcStamp(today)-utcStamp(birth))/86400000);
  if(totalDays<31)return totalDays+(totalDays===1?' dia':' dias');
  var years=today.year-birth.year;if(compareDate(addYears(birth,years),today)>0)years-=1;
  var afterYears=addYears(birth,years),months=0;
  while(months<12&&compareDate(addMonths(afterYears,months+1),today)<=0)months+=1;
  var afterMonths=addMonths(afterYears,months),days=Math.floor((utcStamp(today)-utcStamp(afterMonths))/86400000);
  if(years>=2)return years+' anos';
  if(years===1)return'1 ano'+(months?' e '+months+(months===1?' mês':' meses'):'');
  return months+(months===1?' mês':' meses')+(days?' e '+days+(days===1?' dia':' dias'):'');
}
function wrapText(ctx,text,maxWidth){
  var words=clean(text||'Não informado').split(/\s+/),lines=[],line='';
  words.forEach(function(word){
    var test=line?line+' '+word:word;
    if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test;
  });
  if(line)lines.push(line);
  return lines;
}
function drawLines(ctx,text,x,y,width,height,maxLines){
  var lines=wrapText(ctx,text,width),limit=Math.min(lines.length,maxLines||lines.length);
  for(var index=0;index<limit;index+=1){
    var value=lines[index];
    if(index===limit-1&&lines.length>limit)value+='…';
    ctx.fillText(value,x,y+index*height);
  }
  return y+limit*height;
}
function roundRect(ctx,x,y,width,height,radius){
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+width,y,x+width,y+height,radius);ctx.arcTo(x+width,y+height,x,y+height,radius);ctx.arcTo(x,y+height,x,y,radius);ctx.arcTo(x,y,x+width,y,radius);ctx.closePath();
}
function escapeRegExp(value){return String(value==null?'':value).replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')}
function corporateRequest(data){
  var service=clean(data.category).replace(/^Solicitar\s+/i,'')||'Serviço informado';
  var raw=clean(data.description);
  [clean(data.category),service].forEach(function(prefix){
    if(!prefix)return;
    raw=raw.replace(new RegExp('^'+escapeRegExp(prefix)+'\\s*(?:[-–:]\\s*)?','i'),'').trim();
  });
  var day='',dayMatch=raw.match(/^((?:Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado|Domingo)(?:-feira)?)\s*[-–]\s*/i);
  if(dayMatch){day=clean(dayMatch[1]);raw=raw.slice(dayMatch[0].length).trim()}
  var status='',statusWithDetail=raw.match(/^Situa[cç][aã]o\s*:\s*([^:]+?)\s*:\s*(.+)$/i);
  if(statusWithDetail){status=clean(statusWithDetail[1]);raw=clean(statusWithDetail[2])}
  else{
    var statusOnly=raw.match(/^Situa[cç][aã]o\s*:\s*([^–-]+?)(?:\s*[-–]\s*(.+))?$/i);
    if(statusOnly){status=clean(statusOnly[1]);raw=clean(statusOnly[2])}
  }
  raw=raw.replace(/\s+-\s+/g,' – ').trim();
  if(raw&&!/[.!?]$/.test(raw))raw+='.';
  return{service:service,description:raw||'Não informada.',day:day,status:status};
}
function loadOfficialCscCardIcon(){
  return new Promise(function(resolve,reject){
    var image=new Image(),done=false;
    function finish(ok){if(done)return;done=true;if(ok&&image.naturalWidth)resolve(image);else reject(new Error('Não foi possível carregar o ícone oficial do Conecta Saúde Comunitária.'))}
    image.onload=function(){finish(true)};image.onerror=function(){finish(false)};image.src=CSC_CARD_ICON;
    if(image.complete)setTimeout(function(){finish(Boolean(image.naturalWidth))},0);
  });
}
function create(data){
  data=data||{};
  return loadOfficialCscCardIcon().then(function(logo){
    var summary=corporateRequest(data),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
    var ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,1080,1920);
    gradient.addColorStop(0,'#031b2d');gradient.addColorStop(0.55,'#073a55');gradient.addColorStop(1,'#0b5878');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);

    ctx.drawImage(logo,52,34,160,160);
    ctx.fillStyle='#8df0b4';ctx.font='900 48px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    drawLines(ctx,'CONECTA SAÚDE COMUNITÁRIA',235,78,760,55,2);
    ctx.fillStyle='#ffffff';ctx.font='900 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR',235,185);

    ctx.fillStyle='rgba(255,255,255,.12)';roundRect(ctx,52,210,976,350,30);ctx.fill();
    var infoY=257;
    function identityBlock(label,value,valueSize,maxLines){
      ctx.fillStyle='#8df0b4';ctx.font='900 24px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText(label,82,infoY);infoY+=38;
      ctx.fillStyle='#ffffff';ctx.font='850 '+valueSize+'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      infoY=drawLines(ctx,value,82,infoY,890,valueSize+7,maxLines)+19;
    }
    identityBlock('ÁREA DE ATENDIMENTO',clean(data.areaName)||'Não informada',38,2);
    identityBlock('TACS RESPONSÁVEL',clean(data.tacsName)||'TACS responsável pela área',31,2);
    identityBlock('UNIDADE DE SAÚDE',clean(data.unitName)||'Unidade de Saúde',29,2);

    ctx.fillStyle='rgba(141,240,180,.13)';roundRect(ctx,52,590,976,180,30);ctx.fill();
    ctx.fillStyle='#8df0b4';ctx.font='900 25px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('SERVIÇO SOLICITADO',82,638);
    ctx.fillStyle='#ffffff';ctx.font='900 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    drawLines(ctx,summary.service,82,698,900,52,2);

    ctx.fillStyle='rgba(255,255,255,.98)';roundRect(ctx,48,805,984,895,38);ctx.fill();
    var cursor=862;
    function block(label,value,maxLines,spacing,fontSize){
      ctx.fillStyle='#0b5878';ctx.font='900 23px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText(label.toUpperCase(),88,cursor);cursor+=33;
      ctx.fillStyle='#102b3c';var size=fontSize||36;ctx.font='800 '+size+'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      cursor=drawLines(ctx,value,88,cursor,900,size+7,maxLines)+(spacing||18);
    }
    block('Nome completo',clean(data.name)||'Não informado',2,17,38);
    block('Data e horário do envio',clean(data.sentAt)||'Não informado',1,16,35);
    block('Nascimento e idade',(clean(data.birth)||'Não informada')+' • '+(clean(data.age)||detailedAge(data.birth)),2,16,35);
    block('CPF ou CNS',clean(data.document)||'Não informado',1,16,35);
    block('Localidade / comunidade',clean(data.locality)||'Não informada',3,18,34);
    if(clean(data.recipient))block('Solicitação para',clean(data.recipient),1,16,34);
    block('Descrição da solicitação',summary.description,4,13,34);
    if(summary.day)block('Dia informado',summary.day,1,12,32);
    if(summary.status)block('Situação',summary.status,1,8,32);

    ctx.fillStyle='#8df0b4';ctx.fillRect(52,1742,976,7);
    ctx.fillStyle='#ffffff';ctx.font='850 31px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('Código: '+clean(data.code),60,1810);
    ctx.fillStyle='#d8e7ee';ctx.font='700 26px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('Gerado pelo Portal CSC - '+(clean(data.areaName)||'Área de atendimento'),60,1855);

    return new Promise(function(resolve,reject){
      canvas.toBlob(function(blob){if(!blob)reject(new Error('Não foi possível gerar o card.'));else resolve(blob)},'image/png',1);
    });
  });
}
function filename(data){return'solicitacao-'+normalizeArea(data&&data.areaId||data&&data.areaName||'area').toLowerCase()+'-portal-csc.png'}
function share(data){
  data=data||{};
  return create(data).then(function(blob){
    var file=new File([blob],filename(data),{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      return navigator.share({
        title:'Solicitação do morador',
        text:'Solicitação do Portal CSC — Conecta Saúde Comunitária • '+clean(data.areaName)+' • TACS '+clean(data.tacsName)+'.',
        files:[file]
      }).then(function(){return{ok:true,shared:true}});
    }
    var url=URL.createObjectURL(blob),opened=null;
    try{opened=window.open(url,'_blank')}catch(e){}
    if(!opened)window.location.href=url;
    setTimeout(function(){URL.revokeObjectURL(url)},120000);
    return{ok:true,shared:false,fallback:true};
  });
}
window.PortalCscSolicitacaoCardOficialV1=Object.freeze({create:create,share:share,detailedAge:detailedAge,officialIcon:CSC_CARD_ICON});
}());
