(function(){
  'use strict';

  var WHATSAPP_NUMBER='5581989613130';
  var MORADORES_API='https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var requestCode='';
  var parentTimer=null;

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

  function insertParentFields(){
    if(el('motherName')||!el('locality'))return;
    var localityLabel=el('locality').closest('label');
    var mother=document.createElement('label');mother.innerHTML='Nome da mãe<input id="motherName" autocomplete="off" placeholder="Nome completo da mãe"><span class="help">Preenchido automaticamente pelo cadastro.</span>';
    var father=document.createElement('label');father.innerHTML='Nome do pai<input id="fatherName" autocomplete="off" placeholder="Nome completo do pai"><span class="help">Preenchido automaticamente pelo cadastro.</span>';
    localityLabel.insertAdjacentElement('afterend',father);localityLabel.insertAdjacentElement('afterend',mother);
    var privacy=document.querySelector('.privacy');if(privacy)privacy.textContent='Nome, data de nascimento, idade, CPF/CNS, nome da mãe, nome do pai, endereço e solicitação serão enviados ao TACS em um card pelo WhatsApp. Esses dados não ficam armazenados nesta página.';
    var send=el('send');if(send){send.innerHTML='Enviar solicitação em card pelo WhatsApp<small>O celular abrirá o compartilhamento para escolher o WhatsApp e o destinatário.</small>'}
  }

  function normalizedKey(v){var t=String(v||'').toLowerCase();if(t.normalize)t=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return t.replace(/[^a-z0-9]/g,'')}
  function findDeepValue(source,names){var wanted=names.map(normalizedKey),queue=[source],visited=[];while(queue.length){var current=queue.shift();if(!current||typeof current!=='object'||visited.indexOf(current)!==-1)continue;visited.push(current);Object.keys(current).forEach(function(key){var item=current[key],nk=normalizedKey(key);if(!findDeepValue.result&&wanted.indexOf(nk)!==-1&&item!==undefined&&item!==null&&String(item).trim())findDeepValue.result=String(item).trim();if(item&&typeof item==='object')queue.push(item)});if(findDeepValue.result){var found=findDeepValue.result;findDeepValue.result='';return found}}return ''}
  function fillParents(payload){var resident=payload&&payload.morador?payload.morador:payload;if(!resident||typeof resident!=='object')return;var mother=findDeepValue(resident,['nomeMae','nome_mae','nome da mãe','nome da mae','mae','mãe','maeNome','nomeDaMae','motherName']);var father=findDeepValue(resident,['nomePai','nome_pai','nome do pai','pai','paiNome','nomeDoPai','fatherName']);if(mother&&el('motherName')){el('motherName').value=mother;el('motherName').dispatchEvent(new Event('input',{bubbles:true}))}if(father&&el('fatherName')){el('fatherName').value=father;el('fatherName').dispatchEvent(new Event('input',{bubbles:true}))}}
  function lookupParents(){
    var doc=digits(value('cpf'));if(doc.length!==11&&doc.length!==15)return;
    var callback='paisTacs_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'),done=false;
    var timer=setTimeout(cleanup,7000);
    function cleanup(){if(done)return;done=true;clearTimeout(timer);try{delete window[callback]}catch(e){}if(script.parentNode)script.remove()}
    window[callback]=function(data){fillParents(data);cleanup()};
    script.onerror=cleanup;script.src=MORADORES_API+'?action=buscar_morador&documento='+encodeURIComponent(doc)+'&callback='+encodeURIComponent(callback)+'&v='+Date.now();document.head.appendChild(script);
  }
  function installParentLookup(){
    document.addEventListener('tacs:morador',function(event){fillParents(event.detail)});
    document.addEventListener('input',function(event){if(!event.target||event.target.id!=='cpf')return;clearTimeout(parentTimer);if(el('motherName'))el('motherName').value='';if(el('fatherName'))el('fatherName').value='';parentTimer=setTimeout(lookupParents,1200)},true);
    document.addEventListener('change',function(event){if(event.target&&event.target.id==='cpf')lookupParents()},true);
    if(window.TACS_MORADOR_ATUAL)fillParents(window.TACS_MORADOR_ATUAL);
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
    return {code:requestCode,sentAt:recifeDateTime(),category:value('category'),name:value('name'),birth:formatDate(value('birth')),age:ageText(),documentLabel:documentLabel(),document:value('cpf'),mother:value('motherName')||'Não informado',father:value('fatherName')||'Não informado',locality:value('locality'),description:requestDescription(),dental:dentalDetails()};
  }
  function wrap(ctx,text,maxWidth){var paragraphs=String(text||'').split('\n'),lines=[];paragraphs.forEach(function(paragraph){if(!paragraph){lines.push('');return}var words=paragraph.split(/\s+/),line='';words.forEach(function(word){var test=line?line+' '+word:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test});if(line)lines.push(line)});return lines}
  function drawLines(ctx,text,x,y,maxWidth,lineHeight,maxLines){var lines=wrap(ctx,text,maxWidth),limit=Math.min(lines.length,maxLines||lines.length);for(var i=0;i<limit;i++){var line=lines[i];if(i===limit-1&&lines.length>limit)line=line.replace(/[\s.,;:!?-]*$/,'')+'…';ctx.fillText(line,x,y+i*lineHeight)}return y+limit*lineHeight}
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function createCardFile(data){
    var canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;var ctx=canvas.getContext('2d');var gradient=ctx.createLinearGradient(0,0,1080,1920);gradient.addColorStop(0,'#041f34');gradient.addColorStop(.55,'#062c46');gradient.addColorStop(1,'#0d5f8a');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
    ctx.fillStyle='#70e39f';ctx.font='900 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('PORTAL TACS • POSTO MATIAS',70,92);
    ctx.fillStyle='#ffffff';ctx.font='900 59px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('SOLICITAÇÃO DO MORADOR',70,170);
    ctx.fillStyle='rgba(255,255,255,.12)';roundRect(ctx,65,215,950,112,30);ctx.fill();ctx.fillStyle='#ffffff';ctx.font='800 29px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('Código: '+data.code,96,265);ctx.fillText('Enviado em: '+data.sentAt,96,305);
    ctx.fillStyle='#ffffff';ctx.font='900 38px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';var y=390;y=drawLines(ctx,data.category,70,y,940,47,3)+24;
    ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,55,y,970,1390-y,34);ctx.fill();y+=58;ctx.fillStyle='#102b3c';ctx.font='750 30px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    function row(label,val,max){ctx.fillStyle='#0d5f8a';ctx.font='900 27px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText(label.toUpperCase(),92,y);y+=38;ctx.fillStyle='#102b3c';ctx.font='700 31px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';y=drawLines(ctx,val||'Não informado',92,y,890,40,max||3)+20}
    row('Nome completo',data.name,3);row('Nascimento e idade',data.birth+' • '+data.age,2);row(data.documentLabel,data.document,2);row('Nome da mãe',data.mother,3);row('Nome do pai',data.father,3);row('Onde mora',data.locality,4);if(data.dental)row('Vaga odontológica',data.dental,3);row('Descrição',data.description,7);
    ctx.fillStyle='#ffffff';ctx.font='850 29px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('TACS responsável: Mércio José Campos dos Santos',70,1810);ctx.fillStyle='#d8e7ee';ctx.font='650 24px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';ctx.fillText('Unidade de Saúde Posto Matias • Sítio Japaranduba',70,1855);
    var dataUrl=canvas.toDataURL('image/png',1),parts=dataUrl.split(','),binary=atob(parts[1]),bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new File([bytes],'solicitacao-'+data.code+'.png',{type:'image/png'});
  }
  function fallbackText(data){return 'SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS\n\nCódigo: '+data.code+'\nCategoria: '+data.category+'\nNome: '+data.name+'\nNascimento: '+data.birth+' • '+data.age+'\n'+data.documentLabel+': '+data.document+'\nMãe: '+data.mother+'\nPai: '+data.father+'\nOnde mora: '+data.locality+'\nDescrição: '+data.description+(data.dental?'\n'+data.dental:'')}
  function shareRequest(){
    var mother=value('motherName'),father=value('fatherName');if(!mother||!father){showToast('Os nomes da mãe e do pai não foram carregados. Aguarde a consulta ou confira o cadastro.');return}
    var data=requestData(),file=createCardFile(data),button=el('send'),original=button.innerHTML;button.disabled=true;button.textContent='Preparando o card...';
    var dentalPromise=reserveDental();
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:'Solicitação '+data.code,text:'Solicitação ao TACS — '+data.name}).then(function(){showToast('Card compartilhado. A solicitação foi preparada para o WhatsApp.')}).catch(function(error){if(!error||error.name!=='AbortError')showToast('Não foi possível abrir o compartilhamento do card.')});
    }else{
      var url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1500);window.open('https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(fallbackText(data)),'_blank','noopener');showToast('O card foi salvo. Anexe-o à conversa do WhatsApp aberta.')
    }
    dentalPromise.then(function(){if(data.dental)showToast('Vaga odontológica reservada e card preparado.')}).catch(function(error){showToast(error&&error.message?error.message:'Não foi possível confirmar a vaga odontológica.')}).finally(function(){button.disabled=false;button.innerHTML=original});
    if(!data.dental)setTimeout(function(){button.disabled=false;button.innerHTML=original},1200);
  }

  function replaceSendHandler(){var old=el('send');if(!old||old.dataset.cardRequest==='2')return;var button=old.cloneNode(true);button.dataset.cardRequest='2';old.parentNode.replaceChild(button,old);button.addEventListener('click',shareRequest)}
  function install(){insertParentFields();installParentLookup();replaceSendHandler();setTimeout(function(){if(window.TACS_MORADOR_ATUAL)fillParents(window.TACS_MORADOR_ATUAL);else lookupParents()},1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}());
