(function(){
'use strict';
var PORTAL_URL='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/';
var MODULES={
  medica:{icon:'🩺',title:'Atendimento médico'},
  enfermeira:{icon:'👩‍⚕️',title:'Agenda da Enfermeira Chefe'},
  nutricionista:{icon:'🥗',title:'Atendimento com nutricionista'},
  odontologia:{icon:'🦷',title:'Atendimento odontológico'}
};
var STATUS_LABELS={aguardando:'Aguardando confirmação',confirmado:'Confirmado',alterado:'Data alterada',cancelado:'Cancelado',desativado:'Desativado'};
function clean(value){return String(value==null?'':value).trim()}
function field(card,selector){var el=card.querySelector(selector);return el?clean(el.value):''}
function checked(card,selector){var el=card.querySelector(selector);return !!(el&&el.checked)}
function moduleName(card){var section=card.closest('[data-section]');return section?clean(section.getAttribute('data-section')):''}
function formatDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;var p=value.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function readCard(card){
  var module=moduleName(card),meta=MODULES[module]||{icon:'🏥',title:'Atendimento da Unidade'};
  var data={
    module:module,
    icon:meta.icon,
    title:meta.title,
    day:clean((card.querySelector('.day-title strong')||{}).textContent),
    active:checked(card,'.f-active'),
    date:field(card,'.f-date'),
    time:field(card,'.f-time'),
    status:field(card,'.f-status'),
    message:field(card,'.f-message'),
    service:field(card,'.f-service'),
    serviceIcon:field(card,'.f-icon'),
    common:Number(field(card,'.f-common')||0),
    emergency:Number(field(card,'.f-emergency')||0),
    extra:field(card,'.f-extra')==='true'
  };
  if(module==='enfermeira'){
    data.title=data.service||meta.title;
    if(data.serviceIcon)data.icon=data.serviceIcon;
  }
  if(module==='odontologia'&&data.extra)data.day+=' (Dia Extra)';
  return data;
}
function linesFor(data){
  var lines=[];
  lines.push('🏥 UNIDADE DE SAÚDE POSTO MATIAS');
  lines.push('');
  lines.push(data.icon+' '+data.title.toUpperCase());
  lines.push('📆 '+(data.day||'Dia a confirmar'));
  if(data.date)lines.push('📅 '+formatDate(data.date));
  if(data.time)lines.push('🕒 '+data.time);
  if(data.module==='odontologia'){
    lines.push('✅ Vagas comuns: '+data.common);
    lines.push('🚨 Vagas emergenciais: '+data.emergency);
    if(data.extra)lines.push('⭐ Dia Extra');
  }else if(data.module==='enfermeira'){
    if(data.service)lines.push('📌 '+data.service);
  }else{
    if(data.status)lines.push('Situação: '+(STATUS_LABELS[data.status]||data.status));
    if(data.message)lines.push(data.message);
  }
  lines.push('');
  lines.push('📍 Sítio Japaranduba');
  lines.push('🔗 '+PORTAL_URL);
  return lines;
}
function shareText(data,button){
  var text=linesFor(data).join('\n');
  button.disabled=true;
  var done=function(){button.disabled=false};
  if(navigator.share){
    navigator.share({title:data.title,text:text}).then(done).catch(function(err){done();if(err&&err.name!=='AbortError')openWhatsApp(text)});
  }else{
    openWhatsApp(text);done();
  }
}
function openWhatsApp(text){window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener')}
function roundRect(ctx,x,y,w,h,r){var rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  var words=clean(text).split(/\s+/),line='',lines=[];
  words.forEach(function(word){var test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test});
  if(line)lines.push(line);
  if(maxLines&&lines.length>maxLines){lines=lines.slice(0,maxLines);var last=lines[maxLines-1];while(ctx.measureText(last+'…').width>maxWidth&&last.length>1)last=last.slice(0,-1);lines[maxLines-1]=last+'…'}
  lines.forEach(function(value,index){ctx.fillText(value,x,y+(index*lineHeight))});
  return y+(lines.length*lineHeight);
}
function drawCard(data){
  var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;var ctx=canvas.getContext('2d');
  var gradient=ctx.createLinearGradient(0,0,1080,1920);gradient.addColorStop(0,'#041f34');gradient.addColorStop(.5,'#062c46');gradient.addColorStop(1,'#0a4265');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
  ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(920,230,260,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(160,1670,330,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#78e5a6';roundRect(ctx,80,100,500,90,45);ctx.fill();ctx.fillStyle='#062c46';ctx.font='900 36px -apple-system, BlinkMacSystemFont, Arial';ctx.fillText('AVISO DA UNIDADE',125,158);
  ctx.fillStyle='#ffffff';ctx.font='900 70px -apple-system, BlinkMacSystemFont, Arial';var y=300;y=wrap(ctx,data.icon+' '+data.title,80,y,920,84,3)+35;
  ctx.fillStyle='#d8edf6';ctx.font='800 52px -apple-system, BlinkMacSystemFont, Arial';y=wrap(ctx,data.day||'Dia a confirmar',80,y,920,65,2)+30;
  ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,70,y,940,760,46);ctx.fill();
  var panelY=y+75;ctx.fillStyle='#102b3c';ctx.font='900 54px -apple-system, BlinkMacSystemFont, Arial';
  if(data.date){ctx.fillText('📅  '+formatDate(data.date),130,panelY);panelY+=95}
  if(data.time){ctx.fillText('🕒  '+data.time,130,panelY);panelY+=95}
  if(data.module==='odontologia'){
    ctx.fillStyle='#078b45';ctx.fillText('✅  '+data.common+' vaga'+(data.common===1?'':'s')+' '+(data.common===1?'comum':'comuns'),130,panelY);panelY+=95;
    ctx.fillStyle='#a33a32';ctx.fillText('🚨  '+data.emergency+' vaga'+(data.emergency===1?'':'s')+' '+(data.emergency===1?'emergencial':'emergenciais'),130,panelY);panelY+=95;
    if(data.extra){ctx.fillStyle='#a96700';ctx.fillText('⭐  DIA EXTRA',130,panelY);panelY+=95}
  }else{
    var situation=data.module==='enfermeira'?(data.service||'Atendimento informado'):(STATUS_LABELS[data.status]||data.status||'Atendimento informado');
    ctx.fillStyle='#078b45';ctx.font='900 50px -apple-system, BlinkMacSystemFont, Arial';panelY=wrap(ctx,situation,130,panelY,820,64,3)+25;
    var message=data.module==='enfermeira'?'':data.message;
    if(message){ctx.fillStyle='#415b69';ctx.font='700 42px -apple-system, BlinkMacSystemFont, Arial';wrap(ctx,message,130,panelY,820,58,5)}
  }
  ctx.fillStyle='#78e5a6';ctx.font='900 40px -apple-system, BlinkMacSystemFont, Arial';ctx.fillText('PORTAL TACS',80,1730);
  ctx.fillStyle='#ffffff';ctx.font='700 34px -apple-system, BlinkMacSystemFont, Arial';ctx.fillText('Unidade de Saúde Posto Matias',80,1790);ctx.fillText('Sítio Japaranduba',80,1840);
  return canvas;
}
function canvasBlob(canvas){return new Promise(function(resolve,reject){canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('Não foi possível criar o card.'))},'image/png',1)})}
function safeName(data){return ('portal-tacs-'+data.module+'-'+data.day).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png'}
function shareCard(data,button,statusBox){
  button.disabled=true;if(statusBox){statusBox.textContent='Criando o card azul-petróleo...';statusBox.className='whatsapp-share-status'}
  var canvas=drawCard(data);
  canvasBlob(canvas).then(function(blob){
    var file=new File([blob],safeName(data),{type:'image/png'}),payload={files:[file],title:data.title,text:'Card da Unidade de Saúde Posto Matias'};
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      return navigator.share(payload).then(function(){if(statusBox){statusBox.textContent='Card pronto. No WhatsApp, escolha Meu status.';statusBox.className='whatsapp-share-status success'}}).catch(function(err){if(err&&err.name==='AbortError')return;openImage(blob,statusBox)});
    }
    openImage(blob,statusBox);
  }).catch(function(err){if(statusBox){statusBox.textContent=err.message||'Não foi possível criar o card.';statusBox.className='whatsapp-share-status error'}}).finally(function(){button.disabled=false});
}
function openImage(blob,statusBox){var url=URL.createObjectURL(blob),win=window.open(url,'_blank');if(!win)location.href=url;if(statusBox){statusBox.textContent='O card foi aberto. Compartilhe a imagem no Status do WhatsApp.';statusBox.className='whatsapp-share-status success'}setTimeout(function(){URL.revokeObjectURL(url)},120000)}
function inject(card){
  if(card.querySelector('.whatsapp-day-actions'))return;
  var actions=document.createElement('div');actions.className='whatsapp-day-actions';
  actions.innerHTML='<button type="button" class="btn whatsapp-text-button">💬 Compartilhar por escrito no WhatsApp</button><button type="button" class="btn whatsapp-card-button">📱 Compartilhar card azul-petróleo no Status</button><div class="whatsapp-share-status">Os botões usam os dados preenchidos neste dia.</div>';
  var statusBox=actions.querySelector('.whatsapp-share-status');
  actions.querySelector('.whatsapp-text-button').addEventListener('click',function(){shareText(readCard(card),this)});
  actions.querySelector('.whatsapp-card-button').addEventListener('click',function(){shareCard(readCard(card),this,statusBox)});
  var dayActions=card.querySelector('.day-actions');
  if(dayActions&&dayActions.nextSibling)card.insertBefore(actions,dayActions.nextSibling);else card.appendChild(actions);
}
function scan(){document.querySelectorAll('.week .day-card').forEach(inject)}
function init(){scan();document.querySelectorAll('.week').forEach(function(week){new MutationObserver(scan).observe(week,{childList:true,subtree:true})})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
