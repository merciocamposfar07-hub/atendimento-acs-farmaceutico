from pathlib import Path
import hashlib,re

JS=Path('recados-campanhas-whatsapp-card-v9.js')
HTML=Path('painel-oficial-recados-campanhas.html')
src=JS.read_text(encoding='utf-8')
marker='function normalizeTheme'
if marker not in src:
    raise SystemExit('Marcador do renderer de campanhas não encontrado')

campaign_before=hashlib.sha256(src[src.index(marker):].encode()).hexdigest()
old="type:type,title:field(card,'titulo')||(type==='recado'?'Recado da Unidade':'Campanha de Saúde'),"
new="type:type,title:field(card,'titulo')||(type==='recado'?'Recado do TACS':'Campanha de Saúde'),"
if old not in src:
    raise SystemExit('Fallback antigo do título de Recado não encontrado')
src=src.replace(old,new,1)

start=src.index('function draw(data){')
end=src.index(marker,start)
recado=r'''var PORTAL_TACS_STATUS_ICON='/atendimento-acs-farmaceutico/icons/portal-tacs-oficial-card.jpg?v=20260903-recado-tacs-premium-v1';
var portalTacsStatusIconPromise=null;
function loadPortalTacsStatusIcon(){
  if(portalTacsStatusIconPromise)return portalTacsStatusIconPromise;
  portalTacsStatusIconPromise=new Promise(function(resolve){
    var img=new Image();img.decoding='async';img.onload=function(){resolve(img)};img.onerror=function(){resolve(null)};img.src=PORTAL_TACS_STATUS_ICON;
  });
  return portalTacsStatusIconPromise;
}
function draw(data){
  return loadPortalTacsStatusIcon().then(function(portalIcon){
    var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    var g=ctx.createLinearGradient(0,0,1080,1920);g.addColorStop(0,'#031b2f');g.addColorStop(.50,'#073850');g.addColorStop(1,'#0b5a7a');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
    ctx.globalAlpha=.10;ctx.fillStyle='#79c8e5';ctx.beginPath();ctx.arc(1010,245,300,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(100,1760,360,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#72e3a0';roundRect(ctx,70,76,600,98,49);ctx.fill();
    ctx.fillStyle='#062c45';ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';ctx.textBaseline='alphabetic';ctx.fillText('RECADO DO TACS',116,140);
    ctx.strokeStyle='#72e3a0';ctx.lineWidth=5;ctx.beginPath();ctx.arc(104,238,39,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(104,225,12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(82,268,22,0,Math.PI);ctx.arc(126,268,22,Math.PI,0);ctx.closePath();ctx.fill();
    var autor=txt(data.tacsName)||'Mércio José Campos dos Santos';
    ctx.fillStyle='#fff';ctx.font='800 35px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(autor,166,250);
    ctx.fillStyle='#fff';ctx.font='900 70px -apple-system,BlinkMacSystemFont,Arial';var y=365;y=wrap(ctx,data.title,72,y,936,80,4)+24;
    var boxY=y,boxBottom=1570,boxH=Math.max(700,boxBottom-boxY);if(boxY+boxH>1570)boxH=1570-boxY;
    ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,.14)';ctx.shadowBlur=20;ctx.shadowOffsetY=8;roundRect(ctx,64,boxY,952,boxH,50);ctx.fill();ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    y=boxY+82;
    if(data.priority){ctx.fillStyle='#08783f';ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PRIORIDADE: '+data.priority.toUpperCase(),120,y);y+=70}
    if(data.validity){ctx.fillStyle='#08783f';ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Validade: '+dateBr(data.validity),120,y);y+=68}
    if(data.start){ctx.fillStyle='#0f3046';ctx.font='800 34px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Início: '+dateBr(data.start),120,y);y+=54}
    if(data.days){ctx.fillStyle='#0f3046';ctx.font='800 34px -apple-system,BlinkMacSystemFont,Arial';y=wrap(ctx,'Dias: '+data.days,120,y,840,46,2)+4}
    if(data.time){ctx.fillStyle='#0f3046';ctx.font='800 34px -apple-system,BlinkMacSystemFont,Arial';y=wrap(ctx,'Horário: '+data.time,120,y,840,46,2)+8}
    ctx.fillStyle='#d3dadd';ctx.fillRect(120,y,840,3);y+=66;
    ctx.fillStyle='#0a3150';ctx.font='900 43px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('INFORMAÇÃO',120,y);y+=54;ctx.fillStyle='#d3dadd';ctx.fillRect(120,y,840,3);y+=62;
    ctx.fillStyle='#0f3046';ctx.font='800 39px -apple-system,BlinkMacSystemFont,Arial';wrap(ctx,data.message,120,y,840,55,11);
    var footerY=1690;
    if(portalIcon){ctx.save();roundRect(ctx,70,footerY,158,145,28);ctx.clip();ctx.drawImage(portalIcon,70,footerY,158,145);ctx.restore()}
    ctx.fillStyle='#67e09b';ctx.font='900 48px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PORTAL TACS',260,1750);
    ctx.fillStyle='#fff';ctx.font='700 32px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.unitName,260,1800);ctx.fillText(data.areaName,260,1844);
    return c;
  });
}
'''
src=src[:start]+recado+src[end:]

campaign_after=hashlib.sha256(src[src.index(marker):].encode()).hexdigest()
if campaign_before!=campaign_after:
    raise SystemExit('BLOQUEADO: renderer de campanhas foi alterado fora do escopo')
if 'conecta' in src[start:src.index(marker,start)].lower():
    raise SystemExit('BLOQUEADO: referência ao Conecta no renderer de Recados')
JS.write_text(src,encoding='utf-8')

html=HTML.read_text(encoding='utf-8')
pattern=r'(recados-campanhas-whatsapp-card-v9\.js)(?:\?v=[^\"\']*)?'
html2,n=re.subn(pattern,r'\1?v=20260903-recado-tacs-premium-v1',html,count=1)
if n!=1:
    raise SystemExit('Referência do gerador WhatsApp não encontrada no painel')
HTML.write_text(html2,encoding='utf-8')
print('PATCH_RECADO_TACS_PREMIUM_V1_OK')
