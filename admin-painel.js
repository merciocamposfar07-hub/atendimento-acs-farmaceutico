(function(){
  'use strict';

  var MAIN_API = String(window.TACS_ADMIN_API_URL || 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();
  var NOTICE_API = String(window.POSTO_MATIAS_AVISOS_API_URL || '').trim();
  var DENTAL_API = String(window.DENTAL_AGENDA_API_URL || '').trim();
  var ONE_SIGNAL_URL = 'https://dashboard.onesignal.com/apps/e2294b98-c72b-4f8c-a055-de28979676dc/notifications/new';

  var DEFAULT_NURSE = [
    {day:'Segunda-feira',service:'Visita',icon:'🏠',available:true},
    {day:'Terça-feira',service:'Pré-natal',icon:'🤰',available:true},
    {day:'Quarta-feira',service:'Folga',icon:'❌',available:false},
    {day:'Quinta-feira',service:'Puericultura - acompanhamento de crianças e adolescentes',icon:'👶',available:true},
    {day:'Sexta-feira',service:'Preventivo',icon:'🌸',available:true}
  ];

  var nurseModel = DEFAULT_NURSE.map(copy);
  var dentalModel = [];

  function copy(value){ return Object.assign({}, value); }
  function byId(id){ return document.getElementById(id); }
  function setStatus(id,text,type){ var box=byId(id); box.textContent=text; box.className='status'+(type?' '+type:''); }
  function escapeHtml(value){ return String(value == null ? '' : value).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];}); }
  function numberValue(value){ var n=Number(value); return Number.isInteger(n)&&n>=0?n:0; }
  function isoDate(value){
    var text=String(value||'').trim(),m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return text;
    m=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? m[3]+'-'+m[2]+'-'+m[1] : '';
  }
  function formatDate(value){ var d=isoDate(value); if(!d)return ''; var p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
  function weekdayName(value){
    var d=isoDate(value); if(!d)return 'Data inválida';
    var p=d.split('-').map(Number),date=new Date(Date.UTC(p[0],p[1]-1,p[2]));
    var names=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    return names[date.getUTCDay()];
  }
  function adminKey(){
    var key=String(sessionStorage.getItem('tacs-admin-key')||'').trim();
    if(!key){
      key=String(prompt('Digite a chave administrativa do Painel TACS:')||'').trim();
      if(key) sessionStorage.setItem('tacs-admin-key',key);
    }
    return key;
  }
  function jsonp(api,action,onOk,onFail,extra){
    if(!api){ onFail(new Error('Serviço não configurado.')); return; }
    var cb='tacsAdmin'+Date.now()+Math.floor(Math.random()*99999),script=document.createElement('script'),done=false;
    var timer=setTimeout(function(){finish(new Error('Tempo esgotado.'))},14000);
    function finish(error,data){ if(done)return; done=true; clearTimeout(timer); delete window[cb]; if(script.parentNode)script.remove(); error?onFail(error):onOk(data); }
    window[cb]=function(data){finish(null,data)};
    script.onerror=function(){finish(new Error('Não foi possível acessar o serviço.'))};
    var params='action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&v='+Date.now();
    if(extra) Object.keys(extra).forEach(function(k){params+='&'+encodeURIComponent(k)+'='+encodeURIComponent(extra[k])});
    script.src=api+(api.indexOf('?')<0?'?':'&')+params;
    document.head.appendChild(script);
  }
  function postForm(api,fields,expectedSource,timeoutMs){
    return new Promise(function(resolve,reject){
      if(!api){reject(new Error('Serviço não configurado.'));return;}
      var nonce='admin-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),frameName='adminFrame'+Date.now(),iframe=document.createElement('iframe'),form=document.createElement('form'),done=false;
      var timer=setTimeout(function(){finish(new Error('O serviço demorou para responder.'))},timeoutMs||18000);
      function cleanup(){clearTimeout(timer);window.removeEventListener('message',receive);if(form.parentNode)form.remove();setTimeout(function(){if(iframe.parentNode)iframe.remove()},200)}
      function finish(error,data){if(done)return;done=true;cleanup();error?reject(error):resolve(data)}
      function receive(event){var data=event.data;if(!data||data.nonce!==nonce)return;if(expectedSource&&data.source!==expectedSource)return;data.ok===false?finish(new Error(data.message||'A publicação foi recusada.')):finish(null,data)}
      function add(name,value){var input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value==null?'':value);form.appendChild(input)}
      iframe.name=frameName;iframe.hidden=true;iframe.setAttribute('aria-hidden','true');form.method='post';form.action=api;form.target=frameName;form.hidden=true;
      Object.keys(fields).forEach(function(k){add(k,fields[k])});add('nonce',nonce);
      window.addEventListener('message',receive);document.body.append(iframe,form);form.submit();
    });
  }

  function activateTab(id){
    document.querySelectorAll('.tab').forEach(function(tab){tab.classList.toggle('active',tab.dataset.tab===id)});
    document.querySelectorAll('.admin-section').forEach(function(section){section.hidden=section.id!==id});
  }
  document.querySelectorAll('.tab').forEach(function(tab){tab.addEventListener('click',function(){activateTab(tab.dataset.tab)})});

  function renderNurse(){
    var box=byId('nurseDays');box.innerHTML='';
    nurseModel.forEach(function(item,index){
      var row=document.createElement('div');row.className='day';
      row.innerHTML='<strong>'+escapeHtml(item.day)+'</strong><input aria-label="Ícone" maxlength="4" value="'+escapeHtml(item.icon)+'"><input aria-label="Atendimento" value="'+escapeHtml(item.service)+'"><select aria-label="Situação"><option value="true"'+(item.available?' selected':'')+'>Atendimento</option><option value="false"'+(!item.available?' selected':'')+'>Folga / indisponível</option></select><span></span>';
      var fields=row.querySelectorAll('input,select');
      fields[0].addEventListener('input',function(){nurseModel[index].icon=this.value});
      fields[1].addEventListener('input',function(){nurseModel[index].service=this.value});
      fields[2].addEventListener('change',function(){nurseModel[index].available=this.value==='true'});
      box.appendChild(row);
    });
  }
  function loadNurse(){
    setStatus('nurseStatus','Carregando a programação atual...');
    jsonp(MAIN_API,'agenda_enfermeira',function(data){
      if(data&&data.ok!==false&&Array.isArray(data.dias)&&data.dias.length){nurseModel=data.dias.map(copy);renderNurse();setStatus('nurseStatus','Programação atual carregada.','success')}
      else{nurseModel=DEFAULT_NURSE.map(copy);renderNurse();setStatus('nurseStatus','A agenda padrão foi exibida porque o serviço não retornou a programação salva.','warning')}
    },function(){nurseModel=DEFAULT_NURSE.map(copy);renderNurse();setStatus('nurseStatus','Não foi possível conectar ao serviço. A agenda padrão foi exibida temporariamente.','error')});
  }
  function saveNurse(){
    var key=adminKey();if(!key){setStatus('nurseStatus','Publicação cancelada: chave não informada.','warning');return}
    setStatus('nurseStatus','Publicando agenda da enfermeira...');
    var frame=document.createElement('iframe'),form=document.createElement('form');frame.name='saveNurse'+Date.now();frame.hidden=true;form.method='post';form.action=MAIN_API;form.target=frame.name;form.hidden=true;
    [['action','salvar_agenda_enfermeira'],['adminKey',key],['payload',JSON.stringify({dias:nurseModel})]].forEach(function(pair){var input=document.createElement('input');input.type='hidden';input.name=pair[0];input.value=pair[1];form.appendChild(input)});
    document.body.append(frame,form);form.submit();setTimeout(function(){form.remove();frame.remove();loadNurse()},1900);
  }

  function updateNoticePreview(){
    var title=byId('noticeTitle').value.trim(),message=byId('noticeMessage').value.trim(),priority=byId('noticePriority').value,preview=byId('noticePreview');
    if(!title&&!message){preview.hidden=true;preview.innerHTML='';return}
    preview.className='notice-preview'+(priority==='importante'?' important':priority==='urgente'?' urgent':'');
    preview.innerHTML='<small>'+escapeHtml(priority)+'</small><strong>'+escapeHtml(title||'Aviso')+'</strong><p>'+escapeHtml(message)+'</p>';preview.hidden=false;
  }
  ['noticeTitle','noticeMessage','noticePriority'].forEach(function(id){byId(id).addEventListener(id==='noticePriority'?'change':'input',updateNoticePreview)});

  function fillNotices(data){
    var medical=data&&data.atendimentoMedico||{},notice=data&&Array.isArray(data.avisos)&&data.avisos[0]||{};
    byId('medicalStatus').value=medical.situacao||'aguardando';
    byId('medicalDate').value=medical.data||'';
    byId('medicalTime').value=medical.horario||'';
    byId('medicalNote').value=medical.observacao||'';
    byId('noticePriority').value=notice.prioridade||'informativo';
    byId('noticeValidity').value=isoDate(notice.validade||'');
    byId('noticeTitle').value=notice.titulo||'';
    byId('noticeMessage').value=notice.mensagem||'';
    updateNoticePreview();
  }
  function loadNotices(){
    setStatus('noticeStatus','Carregando os avisos atuais...');
    jsonp(NOTICE_API,'avisos',function(data){
      if(data&&data.ok!==false){fillNotices(data);setStatus('noticeStatus','Avisos atuais carregados'+(data.atualizadoEm?' — '+data.atualizadoEm:'')+'.','success')}
      else setStatus('noticeStatus','O serviço não retornou os avisos atuais.','error');
    },function(){setStatus('noticeStatus','Não foi possível carregar os avisos atuais.','error')});
  }
  function noticePayload(){
    return {
      action:'publicarAvisos',adminKey:String(sessionStorage.getItem('tacs-admin-key')||''),
      unidade:'Unidade de Saúde Posto Matias',area:'Sítio Japaranduba',
      medicalStatus:byId('medicalStatus').value,medicalDate:byId('medicalDate').value.trim(),medicalTime:byId('medicalTime').value.trim(),medicalNote:byId('medicalNote').value.trim(),
      priority:byId('noticePriority').value,validity:byId('noticeValidity').value,title:byId('noticeTitle').value.trim(),message:byId('noticeMessage').value.trim()
    };
  }
  function publishNotices(){
    if(!NOTICE_API){setStatus('noticeStatus','Serviço de avisos não configurado.','error');return}
    var button=byId('publishNotices'),payload=noticePayload();button.disabled=true;setStatus('noticeStatus','Publicando avisos...');
    fetch(NOTICE_API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)})
      .then(function(){
        setStatus('noticeStatus','Publicação enviada. Conferindo o mural...','warning');
        setTimeout(function(){button.disabled=false;loadNotices();if(byId('openPushAfterNotice').checked){byId('pushTitle').value=payload.title||'Portal TACS – Posto Matias';byId('pushMessage').value=payload.message||payload.medicalNote||'Novo aviso disponível no Portal TACS.';window.open(ONE_SIGNAL_URL,'_blank','noopener')}},1800);
      })
      .catch(function(){button.disabled=false;setStatus('noticeStatus','Não foi possível enviar a publicação. Confira a conexão.','error')});
  }

  function renderDental(){
    var box=byId('dentalRows');box.innerHTML='';
    if(!dentalModel.length){setStatus('dentalStatus','A agenda ainda não possui datas. Use “Adicionar outra data”.','warning')}
    dentalModel.forEach(function(item,index){
      var row=document.createElement('div');row.className='dental-row';
      row.innerHTML='<label>Data<input type="date" value="'+escapeHtml(isoDate(item.data))+'"></label><label>Dia<input value="'+escapeHtml(item.dia||weekdayName(item.data))+'" readonly></label><label>Vagas comuns<input type="number" inputmode="numeric" min="0" step="1" value="'+numberValue(item.vagasComuns)+'"></label><label>Vagas emergenciais<input type="number" inputmode="numeric" min="0" step="1" value="'+numberValue(item.vagasEmergenciais)+'"></label><button type="button" class="icon-button" aria-label="Remover data">×</button>';
      var inputs=row.querySelectorAll('input'),remove=row.querySelector('button');
      inputs[0].addEventListener('change',function(){dentalModel[index].data=this.value;dentalModel[index].dia=weekdayName(this.value);inputs[1].value=dentalModel[index].dia});
      inputs[2].addEventListener('input',function(){dentalModel[index].vagasComuns=numberValue(this.value)});
      inputs[3].addEventListener('input',function(){dentalModel[index].vagasEmergenciais=numberValue(this.value)});
      remove.addEventListener('click',function(){dentalModel.splice(index,1);renderDental()});
      box.appendChild(row);
    });
  }
  function loadDental(){
    setStatus('dentalStatus','Carregando a agenda odontológica...');
    jsonp(DENTAL_API,'agenda',function(data){
      if(data&&data.ok!==false&&Array.isArray(data.dias)){dentalModel=data.dias.map(function(item){return {data:isoDate(item.data),dia:item.dia||weekdayName(item.data),vagasComuns:numberValue(item.vagasComuns),vagasEmergenciais:numberValue(item.vagasEmergenciais)}});renderDental();setStatus('dentalStatus','Agenda odontológica carregada'+(data.atualizadoEm?' — '+data.atualizadoEm:'')+'.','success')}
      else setStatus('dentalStatus','O serviço não retornou a agenda odontológica.','error');
    },function(){setStatus('dentalStatus','Não foi possível carregar a agenda odontológica.','error')});
  }
  function addDentalDate(){
    var last=dentalModel.length?dentalModel[dentalModel.length-1].data:'',date;
    if(last){var p=last.split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]+1));date=d.toISOString().slice(0,10)}
    else date=new Date(Date.now()+86400000).toISOString().slice(0,10);
    dentalModel.push({data:date,dia:weekdayName(date),vagasComuns:0,vagasEmergenciais:0});renderDental();
  }
  function validDentalRows(){
    if(!dentalModel.length)return 'Adicione pelo menos uma data.';
    var seen={};
    for(var i=0;i<dentalModel.length;i++){
      var item=dentalModel[i],date=isoDate(item.data),weekday=weekdayName(date);
      if(!date)return 'Há uma data inválida.';
      if(seen[date])return 'A data '+formatDate(date)+' está repetida.';
      seen[date]=true;
      if(['Segunda-feira','Terça-feira','Quinta-feira'].indexOf(weekday)===-1)return formatDate(date)+' não é segunda, terça ou quinta-feira.';
      item.data=date;item.dia=weekday;item.vagasComuns=numberValue(item.vagasComuns);item.vagasEmergenciais=numberValue(item.vagasEmergenciais);
    }
    dentalModel.sort(function(a,b){return a.data.localeCompare(b.data)});return '';
  }
  function saveDental(){
    var error=validDentalRows();if(error){setStatus('dentalStatus',error,'error');renderDental();return}
    var key=adminKey();if(!key){setStatus('dentalStatus','Publicação cancelada: chave não informada.','warning');return}
    var button=byId('saveDental');button.disabled=true;setStatus('dentalStatus','Publicando agenda odontológica...');
    postForm(DENTAL_API,{action:'salvar_agenda',adminKey:key,payload:JSON.stringify({dias:dentalModel})},'agenda-odontologica-tacs',20000)
      .then(function(data){button.disabled=false;if(data&&Array.isArray(data.dias)){dentalModel=data.dias.map(copy);renderDental()}setStatus('dentalStatus','Agenda odontológica publicada.','success')})
      .catch(function(err){button.disabled=false;setStatus('dentalStatus',String(err&&err.message||err)+(/Ação inválida/i.test(String(err&&err.message||err))?' O serviço odontológico ainda precisa ser implantado com a atualização administrativa.':''),'error')});
  }

  function copyPush(){
    var text=byId('pushTitle').value.trim()+'\n\n'+byId('pushMessage').value.trim();
    if(!text.trim()){setStatus('pushStatus','Digite o título e a mensagem.','warning');return}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){setStatus('pushStatus','Título e mensagem copiados. Cole-os no OneSignal.','success')}).catch(function(){setStatus('pushStatus','Não foi possível copiar automaticamente. Selecione o texto manualmente.','error')})}
    else setStatus('pushStatus','Seu navegador não permitiu a cópia automática.','warning');
  }

  byId('saveNurse').addEventListener('click',saveNurse);
  byId('resetNurse').addEventListener('click',function(){nurseModel=DEFAULT_NURSE.map(copy);renderNurse();setStatus('nurseStatus','Agenda padrão restaurada na tela. Toque em publicar para confirmar.','warning')});
  byId('reloadNurse').addEventListener('click',loadNurse);
  byId('publishNotices').addEventListener('click',publishNotices);
  byId('reloadNotices').addEventListener('click',loadNotices);
  byId('clearMedical').addEventListener('click',function(){byId('medicalStatus').value='aguardando';byId('medicalDate').value='';byId('medicalTime').value='';byId('medicalNote').value='';setStatus('noticeStatus','Atendimento médico limpo na tela. Toque em publicar para confirmar.','warning')});
  byId('clearNotice').addEventListener('click',function(){byId('noticePriority').value='informativo';byId('noticeValidity').value='';byId('noticeTitle').value='';byId('noticeMessage').value='';updateNoticePreview();setStatus('noticeStatus','Comunicado geral limpo na tela. Toque em publicar para confirmar.','warning')});
  byId('addDentalDate').addEventListener('click',addDentalDate);
  byId('saveDental').addEventListener('click',saveDental);
  byId('reloadDental').addEventListener('click',loadDental);
  byId('copyPush').addEventListener('click',copyPush);
  byId('refreshAll').addEventListener('click',function(){loadNurse();loadNotices();loadDental()});
  byId('forgetKey').addEventListener('click',function(){sessionStorage.removeItem('tacs-admin-key');alert('A chave administrativa foi removida deste navegador.')});

  renderNurse();
  loadNurse();
  loadNotices();
  loadDental();
}());
