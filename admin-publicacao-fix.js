(function(){
  'use strict';

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();
  var KEY_STORAGE='tacs-admin-key';

  function byId(id){return document.getElementById(id)}
  function clean(value){return String(value==null?'':value).trim()}
  function status(message,type){var box=byId('nurseStatus');if(!box)return;box.textContent=message;box.className='status'+(type?' '+type:'')}
  function getKey(){try{return clean(localStorage.getItem(KEY_STORAGE)||sessionStorage.getItem(KEY_STORAGE))}catch(e){return ''}}
  function readAgenda(){return Array.prototype.map.call(document.querySelectorAll('#nurseDays .day'),function(row){var fields=row.querySelectorAll('input,select');return {day:clean(row.querySelector('strong')&&row.querySelector('strong').textContent),icon:clean(fields[0]&&fields[0].value),service:clean(fields[1]&&fields[1].value),available:!!(fields[2]&&fields[2].value==='true')}})}
  function normalize(list){return (list||[]).map(function(item){return {day:clean(item.day),service:clean(item.service),icon:clean(item.icon),available:!!item.available}})}
  function same(a,b){return JSON.stringify(normalize(a))===JSON.stringify(normalize(b))}

  function jsonp(action,onDone){var cb='tacsVerify'+Date.now()+Math.floor(Math.random()*99999),script=document.createElement('script'),finished=false,timer=setTimeout(function(){finish(new Error('Tempo esgotado ao conferir a agenda.'))},14000);function finish(error,data){if(finished)return;finished=true;clearTimeout(timer);try{delete window[cb]}catch(e){}if(script.parentNode)script.remove();onDone(error,data)}window[cb]=function(data){finish(null,data)};script.onerror=function(){finish(new Error('Não foi possível conferir a agenda salva.'))};script.src=API+(API.indexOf('?')<0?'?':'&')+'action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&v='+Date.now();document.head.appendChild(script)}

  function send(expected,key){var frame=document.createElement('iframe'),form=document.createElement('form');frame.name='tacsPublishFix'+Date.now();frame.hidden=true;form.method='post';form.action=API;form.target=frame.name;form.hidden=true;function add(name,value){var input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value);form.appendChild(input)}add('action','salvar_agenda_enfermeira');add('adminKey',key);add('payload',JSON.stringify({dias:expected}));add('nonce','fix-'+Date.now());document.body.append(frame,form);form.submit();setTimeout(function(){if(form.parentNode)form.remove();if(frame.parentNode)frame.remove()},25000)}

  function verify(expected,button,attempt){attempt=attempt||0;jsonp('agenda_enfermeira',function(error,data){if(!error&&data&&Array.isArray(data.dias)&&same(data.dias,expected)){button.disabled=false;status('Agenda da enfermeira publicada e confirmada no portal.','success');return}if(attempt<3){setTimeout(function(){verify(expected,button,attempt+1)},1200);return}button.disabled=false;if(error)status('A publicação foi enviada, mas não foi possível conferir o portal agora. Toque em Recarregar para verificar.','warning');else status('A agenda ainda não apareceu no servidor. Confira a chave administrativa e tente publicar novamente.','error')})}

  function publish(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();var button=byId('saveNurse');if(!button||button.disabled)return;var key=getKey();if(!key){var access=document.querySelector('.access-box');if(access){access.open=true;access.scrollIntoView({behavior:'smooth',block:'center'})}status('Salve primeiro a chave administrativa neste aparelho.','warning');return}var expected=readAgenda();button.disabled=true;status('Publicando agenda da enfermeira...','warning');send(expected,key);setTimeout(function(){status('Publicação enviada. Conferindo os dados salvos...','warning');verify(expected,button,0)},1200)}

  function bind(){var button=byId('saveNurse');if(!button||button.dataset.confirmFix==='1')return;button.dataset.confirmFix='1';button.addEventListener('click',publish,true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
}());
