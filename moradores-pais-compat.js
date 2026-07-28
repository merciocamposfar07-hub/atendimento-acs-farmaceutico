(function(){
  'use strict';

  var API='https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var timer=null;

  function el(id){return document.getElementById(id)}
  function digits(value){return String(value||'').replace(/\D/g,'')}
  function key(value){var text=String(value||'').toLowerCase();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/[^a-z0-9]/g,'')}
  function aliasesMother(){return ['nomeMae','nome_da_mae','nome da mãe','nome da mae','mae','mãe','maeNome','nomeDaMae','motherName','filiacaoMae','filiacao1']}
  function aliasesFather(){return ['nomePai','nome_do_pai','nome do pai','pai','paiNome','nomeDoPai','fatherName','filiacaoPai','filiacao2']}

  function findValue(source,aliases){
    var wanted=aliases.map(key),queue=[source],visited=[];
    while(queue.length){
      var current=queue.shift();
      if(!current||typeof current!=='object'||visited.indexOf(current)!==-1)continue;
      visited.push(current);
      var keys=Object.keys(current);
      for(var i=0;i<keys.length;i++){
        var name=keys[i],value=current[name];
        if(wanted.indexOf(key(name))!==-1&&value!==undefined&&value!==null&&String(value).trim())return String(value).trim();
        if(value&&typeof value==='object')queue.push(value);
      }
    }
    return '';
  }

  function findRow(source){
    var doc=digits(el('cpf')&&el('cpf').value),queue=[source],visited=[];
    if(doc.length!==11&&doc.length!==15)return null;
    while(queue.length){
      var current=queue.shift();
      if(!current||typeof current!=='object'||visited.indexOf(current)!==-1)continue;
      visited.push(current);
      if(Array.isArray(current)&&current.length>=9){
        var cpf=digits(current[2]),cns=digits(current[3]);
        if(doc===cpf||doc===cns)return current;
      }
      Object.keys(current).forEach(function(name){var value=current[name];if(value&&typeof value==='object')queue.push(value)});
    }
    return null;
  }

  function setField(id,value){
    var field=el(id);if(!field||!value)return false;
    field.value=String(value).trim();
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.dispatchEvent(new Event('change',{bubbles:true}));
    var help=field.parentElement&&field.parentElement.querySelector('.help');
    if(help){help.textContent='Carregado automaticamente do cadastro ✓';help.className='help valid'}
    return true;
  }

  function fill(payload){
    if(!payload||typeof payload!=='object')return false;
    window.TACS_ULTIMA_RESPOSTA_MORADOR=payload;
    var mother=findValue(payload,aliasesMother());
    var father=findValue(payload,aliasesFather());
    if(!mother||!father){
      var row=findRow(payload);
      if(row){if(!mother)mother=String(row[6]||'').trim();if(!father)father=String(row[7]||'').trim()}
    }
    var changed=false;
    if(mother)changed=setField('motherName',mother)||changed;
    if(father)changed=setField('fatherName',father)||changed;
    return changed;
  }

  function lookup(){
    var input=el('cpf'),doc=digits(input&&input.value);
    if(doc.length!==11&&doc.length!==15)return;
    var callback='paisCompat_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'),done=false;
    var timeout=setTimeout(cleanup,9000);
    function cleanup(){if(done)return;done=true;clearTimeout(timeout);try{delete window[callback]}catch(e){}if(script.parentNode)script.remove()}
    window[callback]=function(data){fill(data);cleanup()};
    script.onerror=cleanup;
    script.src=API+'?action=buscar_morador&documento='+encodeURIComponent(doc)+'&callback='+encodeURIComponent(callback)+'&pais=1&v='+Date.now();
    document.head.appendChild(script);
  }

  window.addEventListener('message',function(event){
    var message=event.data;
    if(message&&message.source==='portal-tacs-morador'&&message.payload)fill(message.payload);
  });
  document.addEventListener('tacs:morador',function(event){fill(event.detail)});
  document.addEventListener('input',function(event){
    if(!event.target||event.target.id!=='cpf')return;
    clearTimeout(timer);timer=setTimeout(lookup,1400);
  },true);
  document.addEventListener('change',function(event){if(event.target&&event.target.id==='cpf')lookup()},true);

  setTimeout(function(){if(window.TACS_MORADOR_ATUAL)fill(window.TACS_MORADOR_ATUAL);lookup()},1200);
}());
