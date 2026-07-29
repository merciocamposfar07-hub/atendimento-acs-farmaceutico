(function(){
  'use strict';

  function el(id){return document.getElementById(id)}
  function value(id){var node=el(id);return node?String(node.value||'').trim():''}
  function formatDate(input){var text=String(input||'').trim(),m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[3]+'/'+m[2]+'/'+m[1];return text}
  function ageText(){var node=el('ageStatus'),text=node?String(node.textContent||'').trim():'';return /^Idade:/i.test(text)?text.replace(/^Idade:\s*/i,''):'Não informada'}
  function code(){var p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',year:'2-digit',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};p.forEach(function(x){o[x.type]=x.value});var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',suffix='';for(var i=0;i<4;i++)suffix+=chars.charAt(Math.floor(Math.random()*chars.length));return 'MATIAS-'+o.day+o.month+o.year+'-'+suffix}
  function sentAt(){return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'short'}).format(new Date())}
  function category(){return value('category')}
  function locality(){return value('locality')}
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function wrap(ctx,text,maxWidth){var words=String(text||'').split(/\s+/),lines=[],line='';words.forEach(function(word){var test=line?line+' '+word:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test});if(line)lines.push(line);return lines}
  function drawLines(ctx,text,x,y,maxWidth,lineHeight,maxLines){var lines=wrap(ctx,text,maxWidth),limit=Math.min(lines.length,maxLines||lines.length);for(var i=0;i<limit;i++){var line=lines[i];if(i===limit-1&&lines.length>limit)line=line.replace(/[\s.,;:!?-]*$/,'')+'…';ctx.fillText(line,x,y+i*lineHeight)}return y+limit*lineHeight}
  function fileFromCanvas(canvas,name){var data=canvas.toDataURL('image/png',1).split(','),binary=atob(data[1]),bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new File([bytes],name,{type:'image/png'})}
  function show(message){var old=el('portalToast');if(old)old.remove();var box=document.createElement('div');box.id='portalToast';box.className='toast';box.textContent=message;document.body.appendChild(box);setTimeout(function(){if(box.parentNode)box.remove()},6000)}

  function makeCard(){
    var data={code:code(),sentAt:sentAt(),category:category(),name:value('name'),birth:formatDate(value('birth')),age:ageText(),locality:locality()};
    var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;var ctx=canvas.getContext('2d');
    var gradient=ctx.createLinearGradient(0,0,1080,1920);gradient.addColorStop(0,'#031b2d');gradient.addColorStop(.52,'#083857');gradient.addColorStop(1,'#0f6c9d');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);

    ctx.fillStyle='rgba(112,227,159,.16)';roundRect(ctx,60,68,330,82,24);ctx.fill();ctx.fillStyle='#70e39f';ctx.font='900 36px Arial';ctx.fillText('PORTAL TACS',96,121);
    ctx.fillStyle='#fff';ctx.font='900 72px Arial';ctx.fillText('SOLICITAÇÃO',60,236);ctx.fillText('DO MORADOR',60,314);

    ctx.fillStyle='rgba(255,255,255,.11)';roundRect(ctx,60,370,960,205,34);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='900 50px Arial';var categoryBottom=drawLines(ctx,data.category,92,438,900,60,2);
    ctx.fillStyle='#9edcf5';ctx.font='800 30px Arial';ctx.fillText('Atendimento solicitado',92,Math.max(528,categoryBottom+18));

    ctx.fillStyle='rgba(255,255,255,.98)';roundRect(ctx,50,620,980,860,40);ctx.fill();
    function block(label,val,top,maxLines){ctx.fillStyle='#0d5f8a';ctx.font='900 30px Arial';ctx.fillText(label.toUpperCase(),90,top);ctx.fillStyle='#102b3c';ctx.font='900 50px Arial';return drawLines(ctx,val||'Não informado',90,top+54,900,60,maxLines||3)}
    var cursor=700;cursor=block('Nome',data.name,cursor,3)+44;cursor=block('Data',data.sentAt,cursor,2)+44;cursor=block('Nascimento',data.birth+' • '+data.age,cursor,3)+44;cursor=block('Localidade',data.locality,cursor,4)+44;cursor=block('Código',data.code,cursor,2)+10;

    ctx.fillStyle='rgba(255,255,255,.15)';roundRect(ctx,60,1535,960,170,30);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 42px Arial';ctx.fillText('Posto Matias • Sítio Japaranduba',92,1610);ctx.fillStyle='#dbe9f1';ctx.font='800 32px Arial';ctx.fillText('TACS responsável: Mércio José Campos dos Santos',92,1666);
    ctx.fillStyle='#fff';ctx.font='900 30px Arial';ctx.fillText('Card otimizado para Status do WhatsApp',92,1820);ctx.fillStyle='#cfe0ea';ctx.font='700 26px Arial';ctx.fillText('Compartilhe no WhatsApp e escolha “Meu status”.',92,1866);
    return fileFromCanvas(canvas,'status-'+data.code+'.png');
  }

  async function share(){var button=el('sendStatusCard');if(!button)return;var original=button.innerHTML;button.disabled=true;button.textContent='Preparando card para Status...';try{var file=makeCard();if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Card para Status',text:'Portal TACS • Posto Matias'});show('Card para Status preparado.')}else{var url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);show('O card foi salvo no aparelho.')} }catch(error){if(!error||error.name!=='AbortError')show('Não foi possível gerar o card agora.')}finally{button.disabled=false;button.innerHTML=original}}

  document.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('#sendStatusCard');if(!button)return;event.preventDefault();event.stopImmediatePropagation();share()},true);
}());