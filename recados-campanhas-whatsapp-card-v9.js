(function(){
'use strict';
if(window.PortalTacsPublicacoesWhatsAppV9)return;
window.PortalTacsPublicacoesWhatsAppV9=true;

function txt(v){return String(v==null?'':v).trim()}
function field(card,name){var e=card&&card.querySelector('[name="'+name+'"]');return e?txt(e.value):''}
function dateBr(v){var m=txt(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}
function territory(){
  var i=window.PortalTacsTerritoryIdentity||{},select=document.getElementById('areaEnvio'),p=new URLSearchParams(location.search||'');
  var id=txt(i.areaId||select&&select.value||p.get('area')||'JAPARANDUBA').toUpperCase();
  var area=txt(i.areaNome)||(id==='JAPARANDUBA'?'Sítio Japaranduba':id.replace(/_/g,' '));
  return{areaId:id,areaName:area,unitName:txt(i.unidadeNome)||'Unidade de Saúde',tacsName:txt(i.tacsNome)||''};
}
function read(card,type){
  var t=territory();
  return{
    type:type,
    title:field(card,'titulo')||(type==='recado'?'Recado da Unidade':'Campanha de Saúde'),
    message:field(card,'mensagem'),
    priority:field(card,'prioridade'),
    validity:field(card,'validade'),
    start:field(card,'inicio'),
    days:field(card,'dias'),
    time:field(card,'horario'),
    areaName:t.areaName,
    unitName:t.unitName,
    tacsName:t.tacsName
  };
}
function roundRect(ctx,x,y,w,h,r){var rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  var words=txt(text).split(/\s+/).filter(Boolean),line='',lines=[];
  words.forEach(function(word){var test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test});
  if(line)lines.push(line);if(!lines.length)lines=[''];
  if(maxLines&&lines.length>maxLines){lines=lines.slice(0,maxLines);var last=lines[maxLines-1];while(last.length>1&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[maxLines-1]=last+'…'}
  lines.forEach(function(value,index){ctx.fillText(value,x,y+index*lineHeight)});
  return y+lines.length*lineHeight;
}
function draw(data){
  var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d');
  var g=ctx.createLinearGradient(0,0,1080,1920);g.addColorStop(0,'#041f34');g.addColorStop(.52,'#073a55');g.addColorStop(1,'#0b5878');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
  ctx.globalAlpha=.11;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(930,250,280,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(140,1710,350,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#78e5a6';roundRect(ctx,72,90,560,86,43);ctx.fill();ctx.fillStyle='#073a55';ctx.font='900 35px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.type==='recado'?'RECADO DA UNIDADE':'CAMPANHA DE SAÚDE',112,146);
  ctx.fillStyle='#fff';ctx.font='900 69px -apple-system,BlinkMacSystemFont,Arial';var y=285;y=wrap(ctx,data.title,78,y,924,82,4)+28;
  ctx.fillStyle='rgba(255,255,255,.97)';var boxY=y;roundRect(ctx,70,boxY,940,920,45);ctx.fill();
  y=boxY+80;ctx.fillStyle='#102d40';ctx.font='800 40px -apple-system,BlinkMacSystemFont,Arial';
  if(data.priority){ctx.fillStyle='#08723a';ctx.font='900 38px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PRIORIDADE: '+data.priority.toUpperCase(),125,y);y+=72}
  if(data.start){ctx.fillStyle='#102d40';ctx.font='800 40px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Início: '+dateBr(data.start),125,y);y+=68}
  if(data.validity){ctx.fillText('Validade: '+dateBr(data.validity),125,y);y+=68}
  if(data.days){y=wrap(ctx,'Dias: '+data.days,125,y,820,55,3)+14}
  if(data.time){ctx.fillStyle='#0b5878';ctx.font='900 42px -apple-system,BlinkMacSystemFont,Arial';y=wrap(ctx,'Horário: '+data.time,125,y,820,58,3)+18}
  ctx.fillStyle='#102d40';ctx.font='900 42px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('INFORMAÇÃO',125,y);y+=64;
  ctx.fillStyle='#415b69';ctx.font='700 39px -apple-system,BlinkMacSystemFont,Arial';wrap(ctx,data.message,125,y,820,54,11);
  ctx.fillStyle='#78e5a6';ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PORTAL TACS',78,1734);
  ctx.fillStyle='#fff';ctx.font='700 34px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.unitName,78,1792);ctx.fillText(data.areaName,78,1840);
  return c;
}
function blob(canvas){return new Promise(function(resolve,reject){canvas.toBlob(function(b){b?resolve(b):reject(new Error('Não foi possível gerar o card.'))},'image/png',1)})}
function filename(data){return('portal-tacs-'+data.type+'-'+data.title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)+'.png'}
function openImage(b,status){var u=URL.createObjectURL(b),w=window.open(u,'_blank');if(!w)location.href=u;if(status)status.textContent='Card aberto. Compartilhe a imagem pelo WhatsApp.';setTimeout(function(){URL.revokeObjectURL(u)},120000)}
function share(card,type,button,status){
  var data=read(card,type);button.disabled=true;if(status)status.textContent='Criando card azul-petróleo…';
  blob(draw(data)).then(function(b){var f=new File([b],filename(data),{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]}))){return navigator.share({files:[f],title:data.title,text:'Portal TACS • '+data.areaName}).then(function(){if(status)status.textContent='Card compartilhado/aberto no menu do aparelho.'}).catch(function(err){if(err&&err.name==='AbortError')return;openImage(b,status)})}openImage(b,status)}).catch(function(err){if(status)status.textContent=err&&err.message||'Não foi possível criar o card.'}).finally(function(){button.disabled=false});
}
function inject(card,type){
  if(!card||card.querySelector('.publicacao-whatsapp-v9'))return;
  var actions=card.querySelector('.corpo .acoes');if(!actions)return;
  var box=document.createElement('div');box.className='publicacao-whatsapp-v9';
  box.innerHTML='<button type="button" class="botao publicacao-card-whatsapp">📱 Compartilhar card azul-petróleo no WhatsApp</button><div class="publicacao-whatsapp-status" aria-live="polite"></div>';
  actions.insertAdjacentElement('afterend',box);var b=box.querySelector('button'),s=box.querySelector('.publicacao-whatsapp-status');b.addEventListener('click',function(){share(card,type,b,s)});
}
function scan(){document.querySelectorAll('#listaRecados .item[data-id]').forEach(function(c){inject(c,'recado')});document.querySelectorAll('#listaCampanhas .item[data-id]').forEach(function(c){inject(c,'campanha')})}
function style(){if(document.getElementById('publicacoesWhatsappV9Style'))return;var s=document.createElement('style');s.id='publicacoesWhatsappV9Style';s.textContent='.publicacao-whatsapp-v9{display:grid;gap:8px;margin-top:12px}.publicacao-card-whatsapp{background:linear-gradient(145deg,#073a55,#0b5878)!important;border:2px solid #69c7e7!important;color:#fff!important}.publicacao-whatsapp-status{min-height:20px;color:#d8eef7;font-size:.86rem;font-weight:800;line-height:1.4}';document.head.appendChild(s)}
function init(){style();scan();['listaRecados','listaCampanhas'].forEach(function(id){var n=document.getElementById(id);if(n)new MutationObserver(scan).observe(n,{childList:true,subtree:true})})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
