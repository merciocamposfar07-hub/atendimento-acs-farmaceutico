(function(){
'use strict';
if(window.PortalTacsPublicacoesWhatsAppV11)return;
window.PortalTacsPublicacoesWhatsAppV11=true;

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
    type:type,title:field(card,'titulo')||(type==='recado'?'Recado da Unidade':'Campanha de Saúde'),
    message:field(card,'mensagem'),priority:field(card,'prioridade'),validity:field(card,'validade'),
    start:field(card,'inicio'),days:field(card,'dias'),time:field(card,'horario'),
    areaName:t.areaName,unitName:t.unitName,tacsName:t.tacsName,
    subtitle:field(card,'subtitulo'),theme:themeFromCard(card,field(card,'titulo'))
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
function normalizeTheme(v){var n=txt(v).toLowerCase();return n.normalize?n.normalize('NFD').replace(/[\u0300-\u036f]/g,''):n}
function themeFromCard(card,title){var cls=card&&String(card.className||''),m=cls.match(/camp-theme-([a-z0-9-]+)/);if(m)return m[1];var n=normalizeTheme(title),list=['lilas','dourado','azul-marinho','laranja','amarelo','vermelho','verde','roxo','rosa','azul'];for(var i=0;i<list.length;i++)if(n.indexOf(list[i])!==-1)return list[i];return'azul'}
function campaignPalette(theme){var p={lilas:['#ead9ff','#d4adf2','#32105f','#6f2ab5'],dourado:['#ffe7a3','#f6c954','#4f3400','#a66a00'],roxo:['#e4d4ff','#b995e8','#2e1258','#6331a8'],laranja:['#ffe0b5','#f2a24d','#512700','#b85d00'],'azul-marinho':['#163a69','#0b2443','#ffffff','#72a8df'],verde:['#d8f2df','#79c992','#123f23','#17723a'],azul:['#d8efff','#79bce8','#0b3654','#17618f'],amarelo:['#fff5b8','#f2d257','#4c3d00','#9b7900'],vermelho:['#ffd6d6','#e78383','#5d1717','#9e2f2f'],rosa:['#ffdbea','#ef9cbd','#641d3a','#a53e68']};return p[theme]||p.azul}
function monthYear(data){var m=txt(data.start).match(/^(\d{4})-(\d{2})-/),months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return m?(months[Number(m[2])-1]+' '+m[1]):''}
function fitFont(ctx,text,maxWidth,start,min,weight){var size=start;do{ctx.font=(weight||900)+' '+size+'px -apple-system,BlinkMacSystemFont,Arial';if(ctx.measureText(text).width<=maxWidth)return size;size-=2}while(size>min);return min}
function drawRibbon(ctx,x,y,w,h,color1,color2){ctx.save();var g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,color2);g.addColorStop(.5,color1);g.addColorStop(1,color2);ctx.strokeStyle=g;ctx.lineWidth=Math.max(18,w*.17);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(30,12,55,.25)';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(x+w*.34,y+h*.10);ctx.bezierCurveTo(x+w*.04,y+h*.27,x+w*.18,y+h*.43,x+w*.55,y+h*.73);ctx.lineTo(x+w*.76,y+h*.94);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w*.64,y+h*.10);ctx.bezierCurveTo(x+w*.95,y+h*.27,x+w*.80,y+h*.46,x+w*.49,y+h*.72);ctx.lineTo(x+w*.28,y+h*.94);ctx.stroke();ctx.restore()}
function drawMotherBaby(ctx,x,y,w,h){ctx.save();var g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff0a5');g.addColorStop(.34,'#f7c542');g.addColorStop(1,'#9b6100');ctx.fillStyle=g;ctx.strokeStyle='#9b6100';ctx.lineWidth=5;ctx.shadowColor='rgba(91,57,0,.24)';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(x+w*.53,y+h*.25,w*.16,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+w*.52,y+h*.38);ctx.bezierCurveTo(x+w*.24,y+h*.45,x+w*.18,y+h*.77,x+w*.34,y+h*.91);ctx.bezierCurveTo(x+w*.55,y+h*1.02,x+w*.82,y+h*.88,x+w*.79,y+h*.60);ctx.bezierCurveTo(x+w*.76,y+h*.44,x+w*.66,y+h*.38,x+w*.52,y+h*.38);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe8a0';ctx.beginPath();ctx.arc(x+w*.57,y+h*.61,w*.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8a5500';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w*.34,y+h*.56);ctx.bezierCurveTo(x+w*.43,y+h*.72,x+w*.62,y+h*.76,x+w*.76,y+h*.66);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w*.31,y+h*.70);ctx.bezierCurveTo(x+w*.45,y+h*.87,x+w*.68,y+h*.88,x+w*.80,y+h*.74);ctx.stroke();ctx.fillStyle='#f1b82f';ctx.beginPath();ctx.moveTo(x+w*.86,y+h*.40);ctx.bezierCurveTo(x+w*.77,y+h*.29,x+w*.65,y+h*.43,x+w*.86,y+h*.57);ctx.bezierCurveTo(x+w*1.07,y+h*.43,x+w*.95,y+h*.29,x+w*.86,y+h*.40);ctx.fill();ctx.restore()}
function artUrl(theme){if(theme==='lilas')return'/atendimento-acs-farmaceutico/assets/campanhas/agosto-lilas-referencia.svg?v=20260817-ref2';if(theme==='dourado')return'/atendimento-acs-farmaceutico/assets/campanhas/agosto-dourado-referencia.svg?v=20260817-ref2';return''}
function loadArt(theme){return new Promise(function(resolve){var url=artUrl(theme);if(!url){resolve(null);return}var img=new Image();img.onload=function(){resolve(img)};img.onerror=function(){resolve(null)};img.src=url})}
function drawImageContain(ctx,img,x,y,w,h){var r=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*r,dh=img.naturalHeight*r;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}
function drawCampaign(data){
  return loadArt(data.theme).then(function(referenceArt){
    var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d'),p=campaignPalette(data.theme),bg=ctx.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,'#041f34');bg.addColorStop(.60,'#073a55');bg.addColorStop(1,'#0b5878');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
    ctx.globalAlpha=.10;ctx.fillStyle='#7fc9e6';ctx.beginPath();ctx.arc(990,250,300,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle='#21b9f3';ctx.lineWidth=6;roundRect(ctx,58,65,105,105,25);ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 62px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('T',93,137);ctx.font='900 38px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('TACS – TÉCNICO AGENTE',188,105);ctx.fillText('COMUNITÁRIO DE SAÚDE',188,150);
    ctx.font='900 70px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Campanhas da unidade',58,300);ctx.fillStyle='#64df9a';ctx.font='900 49px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(monthYear(data),58,372);
    var x=48,y=440,w=984,h=1040,grad=ctx.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,p[0]);grad.addColorStop(1,p[1]);ctx.fillStyle=grad;roundRect(ctx,x,y,w,h,48);ctx.fill();ctx.strokeStyle=p[3];ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle=p[3];roundRect(ctx,84,492,405,72,30);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 31px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('CAMPANHA DO MÊS',116,540);
    ctx.fillStyle='rgba(255,255,255,.90)';roundRect(ctx,790,492,190,72,35);ctx.fill();ctx.fillStyle='#08723a';ctx.font='900 32px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('✓ Ativa',825,540);
    ctx.fillStyle=p[2];var titleSize=fitFont(ctx,data.title,640,70,48,900);ctx.font='900 '+titleSize+'px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.title,86,690);
    ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';var sy=wrap(ctx,data.subtitle,86,760,625,49,3)+20;ctx.fillStyle=p[3];ctx.fillRect(86,sy,82,8);sy+=85;
    ctx.fillStyle=p[2];ctx.font='800 40px -apple-system,BlinkMacSystemFont,Arial';wrap(ctx,data.message,86,sy,610,54,6);
    if(referenceArt){var ax=data.theme==='lilas'?720:700,ay=data.theme==='lilas'?640:670,aw=data.theme==='lilas'?270:310,ah=data.theme==='lilas'?520:410;ctx.save();ctx.shadowColor='rgba(45,24,6,.23)';ctx.shadowBlur=18;ctx.shadowOffsetY=8;drawImageContain(ctx,referenceArt,ax,ay,aw,ah);ctx.restore()}
    else if(data.theme==='dourado')drawMotherBaby(ctx,735,690,225,330);else drawRibbon(ctx,735,690,225,330,p[3],p[1]);
    /* A validade continua disponível como dado interno, mas não é exibida no card da campanha. */
    ctx.fillStyle='#79e5a6';ctx.font='900 35px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PORTAL TACS',60,1710);ctx.fillStyle='#fff';ctx.font='700 32px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.unitName,60,1760);ctx.fillText(data.areaName,60,1805);
    return c;
  });
}
function blob(canvas){return new Promise(function(resolve,reject){canvas.toBlob(function(b){b?resolve(b):reject(new Error('Não foi possível gerar o card.'))},'image/png',1)})}
function filename(data){return('portal-tacs-'+data.type+'-'+data.title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)+'.png'}
function openImage(b,status){var u=URL.createObjectURL(b),w=window.open(u,'_blank');if(!w)location.href=u;if(status)status.textContent='Card aberto. Compartilhe a imagem pelo WhatsApp.';setTimeout(function(){URL.revokeObjectURL(u)},120000)}
function share(card,type,button,status){
  var data=read(card,type);button.disabled=true;if(status)status.textContent=type==='campanha'?'Criando card da campanha…':'Criando card azul-petróleo…';
  var canvasPromise=type==='campanha'?drawCampaign(data):Promise.resolve(draw(data));
  canvasPromise.then(blob).then(function(b){var f=new File([b],filename(data),{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]}))){return navigator.share({files:[f],title:data.title,text:'Portal TACS • '+data.areaName}).then(function(){if(status)status.textContent='Card compartilhado/aberto no menu do aparelho.'}).catch(function(err){if(err&&err.name==='AbortError')return;openImage(b,status)})}openImage(b,status)}).catch(function(err){if(status)status.textContent=err&&err.message||'Não foi possível criar o card.'}).finally(function(){button.disabled=false});
}
function inject(card,type){
  if(!card)return;
  var flag=type==='campanha'?'whatsappCampanhaV11':'whatsappRecadoV11';if(card.dataset[flag]==='1')return;card.dataset[flag]='1';
  var box=document.createElement('div');box.className='publicacao-whatsapp-v11 '+(type==='campanha'?'publicacao-campanha-status':'publicacao-recado-card');
  var label=type==='campanha'?'Postar no status do WhatsApp':'Compartilhar card azul-petróleo no WhatsApp';
  box.innerHTML='<button type="button" class="botao publicacao-card-whatsapp"><span class="wa-mark" aria-hidden="true">◉</span> '+label+'</button><div class="publicacao-whatsapp-status" aria-live="polite"></div>';
  if(type==='campanha'){card.insertAdjacentElement('afterend',box)}else{var actions=card.querySelector('.corpo .acoes');if(!actions){card.dataset[flag]='0';return}actions.insertAdjacentElement('afterend',box)}
  var b=box.querySelector('button'),st=box.querySelector('.publicacao-whatsapp-status');b.addEventListener('click',function(){share(card,type,b,st)});
}
function scan(){document.querySelectorAll('#listaRecados .item[data-id]').forEach(function(c){inject(c,'recado')});document.querySelectorAll('#listaCampanhas .item[data-id]').forEach(function(c){inject(c,'campanha')})}
function style(){if(document.getElementById('publicacoesWhatsappV11Style'))return;var s=document.createElement('style');s.id='publicacoesWhatsappV11Style';s.textContent='.publicacao-whatsapp-v11{display:grid;gap:7px;min-width:0;max-width:100%}.publicacao-campanha-status{margin:-4px 0 14px}.publicacao-recado-card{margin-top:12px}.publicacao-card-whatsapp{width:100%!important;min-height:58px!important;background:linear-gradient(145deg,#073a55,#0b5878)!important;border:3px solid #69c7e7!important;border-radius:22px!important;color:#fff!important;font-weight:900!important;box-shadow:0 7px 18px rgba(7,58,85,.20)!important}.wa-mark{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:5px;border:2px solid currentColor;border-radius:50%;font-size:12px;line-height:1}.publicacao-whatsapp-status{min-height:0;color:#536b78;font-size:.84rem;font-weight:800;line-height:1.35}.publicacao-whatsapp-status:empty{display:none}#listaCampanhas .item[hidden]+.publicacao-campanha-status{display:none!important}';document.head.appendChild(s)}
function init(){style();scan();['listaRecados','listaCampanhas'].forEach(function(id){var n=document.getElementById(id);if(n)new MutationObserver(scan).observe(n,{childList:true,subtree:true})})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());