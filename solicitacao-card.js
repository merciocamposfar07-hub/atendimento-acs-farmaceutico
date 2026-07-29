(function(){
  'use strict';

  var WHATSAPP_NUMBER='5581989613130';
  var requestCode='';

  function el(id){return document.getElementById(id)}
  function value(id){var field=el(id);return field?String(field.value||'').trim():''}
  function digits(v){return String(v||'').replace(/\D/g,'')}
  function showToast(message){var old=el('portalToast');if(old)old.remove();var box=document.createElement('div');box.id='portalToast';box.className='toast';box.setAttribute('role','status');box.textContent=message;document.body.appendChild(box);setTimeout(function(){if(box.parentNode)box.remove()},6000)}
  function recifeDateTime(){return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'short'}).format(new Date())}
  function recifeToday(){var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),out={};parts.forEach(function(p){out[p.type]=p.value});return out.year+'-'+out.month+'-'+out.day}
  function randomSuffix(){var alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',out='';if(window.crypto&&window.crypto.getRandomValues){var values=new Uint8Array(4);window.crypto.getRandomValues(values);values.forEach(function(v){out+=alphabet.charAt(v%alphabet.length)})}else{for(var i=0;i<4;i++)out+=alphabet.charAt(Math.floor(Math.random()*alphabet.length))}return out}
  function makeRequestCode(){var p=recifeToday().split('-');return 'MATIAS-'+p[2]+p[1]+p[0].slice(2)+'-'+randomSuffix()}
  function formatDate(input){var text=String(input||'').trim(),m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[3]+'/'+m[2]+'/'+m[1];m=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[1]+'/'+m[2]+'/'+m[3]:text}
  function toIsoDate(input){var text=String(input||'').trim(),m=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:text}
  function ageText(){var status=el('ageStatus'),text=status?String(status.textContent||'').trim():'';return /^Idade:/i.test(text)?text.replace(/^Idade:\s*/i,''):'Não informada'}
  function documentLabel(){return digits(value('cpf')).length===15?'CNS':'CPF'}
  function requestDescription(){var category=value('category');return category==='Implanon'?value('implanonChoice'):value('subject')}
  function dentalDetails(){var selected=document.querySelector('.slot.selected');if(!selected)return '';var day=selected.querySelector('strong'),date=selected.querySelector('span'),category=value('category'),type=category.indexOf('emergência')>=0?'Vaga emergencial':'Vaga comum';return type+' — '+(day?day.textContent.trim():'')+' — '+(date?date.textContent.trim():'')}

  function updatePortalText(){
    var privacy=document.querySelector('.privacy');
    if(privacy)privacy.textContent='Nome, data de nascimento, idade, CPF/CNS, endereço e solicitação serão enviados ao TACS em um card pelo WhatsApp. Esses dados não ficam armazenados nesta página.';
    var send=el('send');
    if(send)send.innerHTML='Enviar solicitação em card pelo WhatsApp<small>O celular abrirá o compartilhamento para escolher o WhatsApp e o destinatário.</small>';
  }

  function selectedDentalData(){var selected=document.querySelector('.slot.selected');if(!selected)return null;var dateNode=selected.querySelector('span'),date=toIsoDate(dateNode?dateNode.textContent:'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;return {date:date,type:value('category').indexOf('emergência')>=0?'emergencial':'comum'}}
  function reserveDental(){
    var dental=selectedDentalData(),api=String(window.DENTAL_AGENDA_API_URL||'').trim();if(!dental||!api)return Promise.resolve();
    return new Promise(function(resolve,reject){var nonce='card-'+Date.now()+'-'+randomSuffix(),frameName='cardReservation'+Date.now(),iframe=document.createElement('iframe'),form=document.createElement('form'),done=false,timer=setTimeout(function(){finish(new Error('A confirmação da vaga demorou.'))},20000);
      function finish(error,data){if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);if(form.parentNode)form.remove();setTimeout(function(){if(iframe.parentNode)iframe.remove()},200);error?reject(error):resolve(data)}
      function receive(event){var data=event.data;if(!data||data.source!=='agenda-odontologica-tacs'||data.nonce!==nonce)return;data.ok?finish(null,data):finish(new Error(data.message||'Não foi possível reservar a vaga.'))}
      function add(name,val){var input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(val);form.appendChild(input)}
      iframe.name=frameName;iframe.hidden=true;form.method='post';form.action=api;form.target=frameName;form.hidden=true;add('action','reservar');add('requestId',requestCode);add('date',dental.date);add('type',dental.type);add('nonce',nonce);window.addEventListener('message',receive);document.body.append(iframe,form);form.submit();
    })
  }

  function requestData(){
    if(!requestCode)requestCode=makeRequestCode();
    return {code:requestCode,sentAt:recifeDateTime(),category:value('category'),name:value('name'),birth:formatDate(value('birth')),age:ageText(),documentLabel:documentLabel(),document:value('cpf'),locality:value('locality'),description:requestDescription(),dental:dentalDetails()};
  }

  function wrap(ctx,text,maxWidth){
    var paragraphs=String(text||'').split('\n'),lines=[];
    paragraphs.forEach(function(paragraph){
      if(!paragraph){lines.push('');return}
      var words=paragraph.split(/\s+/),line='';
      words.forEach(function(word){
        var test=line?line+' '+word:word;
        if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test;
      });
      if(line)lines.push(line);
    });
    return lines;
  }

  function drawLines(ctx,text,x,y,maxWidth,lineHeight,maxLines){
    var lines=wrap(ctx,text,maxWidth),limit=Math.min(lines.length,maxLines||lines.length);
    for(var i=0;i<limit;i++){
      var line=lines[i];
      if(i===limit-1&&lines.length>limit)line=line.replace(/[\s.,;:!?-]*$/,'')+'…';
      ctx.fillText(line,x,y+i*lineHeight);
    }
    return y+limit*lineHeight;
  }

  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

  function createCardFile(data){
    var rows=[
      {label:'Nome completo',value:data.name,max:3},
      {label:'Nascimento e idade',value:data.birth+' • '+data.age,max:2},
      {label:data.documentLabel,value:data.document,max:2},
      {label:'Onde mora',value:data.locality,max:4}
    ];
    if(data.dental)rows.push({label:'Vaga odontológica',value:data.dental,max:3});
    rows.push({label:'Descrição',value:data.description,max:9});

    var measureCanvas=document.createElement('canvas');
    measureCanvas.width=1440;
    measureCanvas.height=2600;
    var measureCtx=measureCanvas.getContext('2d');

    var width=1440;
    var headerX=90;
    var contentX=120;
    var contentWidth=1180;
    var categoryWidth=1260;
    var lineHeightValue=62;
    var lineHeightCategory=72;

    measureCtx.font='900 56px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    var categoryLines=wrap(measureCtx,data.category,categoryWidth);
    var categoryHeight=Math.min(categoryLines.length,3)*lineHeightCategory;

    var contentHeight=0;
    rows.forEach(function(row){
      measureCtx.font='700 50px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      var lines=wrap(measureCtx,row.value||'Não informado',contentWidth);
      var usedLines=Math.min(lines.length,row.max||3);
      contentHeight+=56 + usedLines*lineHeightValue + 34;
    });

    var topContentY=520 + categoryHeight + 40;
    var panelY=topContentY;
    var panelHeight=88 + contentHeight + 42;
    var footerY=panelY + panelHeight + 150;
    var canvasHeight=Math.max(1900, footerY + 110);

    var canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=canvasHeight;
    var ctx=canvas.getContext('2d');

    var gradient=ctx.createLinearGradient(0,0,width,canvasHeight);
    gradient.addColorStop(0,'#041f34');
    gradient.addColorStop(.55,'#062c46');
    gradient.addColorStop(1,'#0d5f8a');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,width,canvasHeight);

    ctx.fillStyle='#70e39f';
    ctx.font='900 46px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('PORTAL TACS • POSTO MATIAS',headerX,125);

    ctx.fillStyle='#ffffff';
    ctx.font='900 82px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR',headerX,225);

    ctx.fillStyle='rgba(255,255,255,.13)';
    roundRect(ctx,80,285,1280,150,34);
    ctx.fill();

    ctx.fillStyle='#ffffff';
    ctx.font='800 40px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Código: '+data.code,120,350);
    ctx.fillText('Enviado em: '+data.sentAt,120,402);

    ctx.fillStyle='#ffffff';
    ctx.font='900 56px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    var y=520;
    y=drawLines(ctx,data.category,headerX,y,categoryWidth,lineHeightCategory,3)+40;

    ctx.fillStyle='rgba(255,255,255,.97)';
    roundRect(ctx,70,panelY,1300,panelHeight,42);
    ctx.fill();

    y=panelY+88;

    function row(label,val,max){
      ctx.fillStyle='#0d5f8a';
      ctx.font='900 40px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label.toUpperCase(),contentX,y);
      y+=56;
      ctx.fillStyle='#102b3c';
      ctx.font='700 50px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      y=drawLines(ctx,val||'Não informado',contentX,y,contentWidth,lineHeightValue,max||3)+34;
    }

    rows.forEach(function(item){row(item.label,item.value,item.max)});

    ctx.fillStyle='#ffffff';
    ctx.font='850 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('TACS responsável: Mércio José Campos dos Santos',90,footerY);
    ctx.fillStyle='#d8e7ee';
    ctx.font='650 35px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Unidade de Saúde Posto Matias • Sítio Japaranduba',90,footerY+52);

    var dataUrl=canvas.toDataURL('image/png',1),parts=dataUrl.split(','),binary=atob(parts[1]),bytes=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new File([bytes],'solicitacao-'+data.code+'.png',{type:'image/png'});
  }

  function fallbackText(data){return 'SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS\n\nCódigo: '+data.code+'\nCategoria: '+data.category+'\nNome: '+data.name+'\nNascimento: '+data.birth+' • '+data.age+'\n'+data.documentLabel+': '+data.document+'\nOnde mora: '+data.locality+'\nDescrição: '+data.description+(data.dental?'\n'+data.dental:'')}

  function shareRequest(){
    var data=requestData(),file=createCardFile(data),button=el('send'),original=button.innerHTML;button.disabled=true;button.textContent='Preparando o card...';
    var dentalPromise=reserveDental();
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:'Solicitação '+data.code,text:'Solicitação ao TACS — '+data.name}).then(function(){showToast('Card compartilhado. A solicitação foi preparada para o WhatsApp.')}).catch(function(error){if(!error||error.name!=='AbortError')showToast('Não foi possível abrir o compartilhamento do card.')});
    }else{
      var url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);window.open('https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(fallbackText(data)),'_blank','noopener');showToast('O card foi salvo. Anexe-o à conversa do WhatsApp aberta.');
    }
    dentalPromise.then(function(){if(data.dental)showToast('Vaga odontológica reservada e card preparado.')}).catch(function(error){showToast(error&&error.message?error.message:'Não foi possível confirmar a vaga odontológica.')}).finally(function(){button.disabled=false;button.innerHTML=original});
    if(!data.dental)setTimeout(function(){button.disabled=false;button.innerHTML=original},1200);
  }

  function replaceSendHandler(){var old=el('send');if(!old||old.dataset.cardRequest==='5')return;var button=old.cloneNode(true);button.dataset.cardRequest='5';old.parentNode.replaceChild(button,old);button.addEventListener('click',shareRequest)}
  function install(){updatePortalText();replaceSendHandler()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}());