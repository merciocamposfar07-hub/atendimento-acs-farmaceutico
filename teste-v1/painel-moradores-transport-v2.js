(function(){
'use strict';

var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var token=sessionStorage.getItem(TOKEN_KEY)||'';
var device=localStorage.getItem(DEVICE_KEY)||'';
var active=null;
var writesEnabled=false;
var situationEnabled=false;
var currentSituation='ATIVO';

if(!device){
  device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  localStorage.setItem(DEVICE_KEY,device);
}

function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
function setStatus(id,msg,type){
  var node=el(id);
  if(!node)return;
  node.textContent=msg;
  node.className='status'+(type?' '+type:'');
}
function requestId(action){
  return 'morv2_'+String(action||'op').replace(/[^a-z0-9]/gi,'')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
}
function session(){return{token:token,dispositivo:device}}
function cloneSession(extra){
  var out=session();
  Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});
  return out;
}
function digits(v){return String(v==null?'':v).replace(/\D/g,'')}

function jsonp(action,extra,cb){
  var name='mrV2Cb'+Date.now()+Math.floor(Math.random()*100000);
  var script=document.createElement('script');
  var done=false;
  var timer=setTimeout(function(){finish({ok:false,message:'O servidor demorou para responder à consulta.'})},18000);
  function finish(result){
    if(done)return;
    done=true;
    clearTimeout(timer);
    try{delete window[name]}catch(ignore){}
    if(script.parentNode)script.remove();
    cb(result);
  }
  window[name]=finish;
  script.onerror=function(){finish({ok:false,message:'Falha ao consultar o servidor.'})};
  var q='action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(name)+'&v='+Date.now();
  Object.keys(extra||{}).forEach(function(k){q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(extra[k])});
  script.src=API+'?'+q;
  document.head.appendChild(script);
}

function finish(result){
  if(!active)return;
  clearTimeout(active.timeout);
  clearTimeout(active.pollTimer);
  var cb=active.callback;
  if(active.form&&active.form.parentNode)active.form.remove();
  var frame=active.frame;
  active=null;
  if(frame&&frame.parentNode){setTimeout(function(){if(frame.parentNode)frame.remove()},250)}
  var login=el('login');
  var logout=el('logout');
  if(login)login.disabled=false;
  if(logout)logout.disabled=!token;
  cb(result||{ok:false,message:'Resposta vazia do servidor.'});
}

function messageResult(data){
  if(!active||!data||typeof data!=='object')return null;
  var rid=text(data.requestId||(data.result&&data.result.requestId));
  if(rid&&rid!==active.id)return null;
  if(Object.prototype.hasOwnProperty.call(data,'result'))return data.result;
  if(Object.prototype.hasOwnProperty.call(data,'payload'))return data.payload;
  return Object.prototype.hasOwnProperty.call(data,'ok')?data:null;
}

window.addEventListener('message',function(event){
  if(!active||!active.frame||event.source!==active.frame.contentWindow)return;
  var data=event.data;
  if(typeof data==='string'){
    try{data=JSON.parse(data)}catch(ignore){return}
  }
  var result=messageResult(data);
  if(result)finish(result);
});

function schedulePoll(){
  if(!active)return;
  clearTimeout(active.pollTimer);
  active.pollTimer=setTimeout(pollResult,active.nextWait);
}

function pollResult(){
  if(!active)return;
  var current=active;
  jsonp(current.resultAction,{requestId:current.id},function(r){
    if(!active||active.id!==current.id)return;
    if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
    if(Date.now()>=current.limit){
      finish({ok:false,message:'A confirmação do servidor ainda está em processamento. A operação não foi reenviada.'});
      return;
    }
    current.nextWait=Math.min(8000,current.nextWait+1000);
    schedulePoll();
  });
}

function post(action,payload,resultAction,cb){
  if(active){cb({ok:false,message:'Aguarde a operação anterior terminar.'});return}
  var rid=requestId(action);
  var fields={};
  Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
  fields.action=action;
  fields.requestId=rid;

  var frame=document.createElement('iframe');
  var form=document.createElement('form');
  frame.name='mrV2Frame'+Date.now()+Math.floor(Math.random()*1000);
  frame.className='bridge';
  frame.setAttribute('aria-hidden','true');
  frame.src='about:blank';
  form.method='POST';
  form.action=API+'?_='+Date.now();
  form.target=frame.name;
  form.className='bridge';

  Object.keys(fields).forEach(function(k){
    var input=document.createElement('input');
    input.type='hidden';
    input.name=k;
    input.value=String(fields[k]==null?'':fields[k]);
    form.appendChild(input);
  });

  active={
    id:rid,
    action:action,
    resultAction:resultAction,
    callback:cb,
    frame:frame,
    form:form,
    pollTimer:null,
    nextWait:2500,
    limit:Date.now()+74000,
    timeout:setTimeout(function(){finish({ok:false,message:'A confirmação do servidor ainda está em processamento. A operação não foi reenviada.'})},75000)
  };

  var login=el('login');
  var logout=el('logout');
  if(login)login.disabled=true;
  if(logout)logout.disabled=true;
  document.body.appendChild(frame);
  document.body.appendChild(form);
  form.submit();
  schedulePoll();
}

function updateNote(){
  var note=document.querySelector('main > .note');
  if(!note)return;
  if(writesEnabled&&situationEnabled){
    note.textContent='PAINEL DE MORADORES: cadastro, edição e situação cadastral estão liberados. Todas as alterações permanecem registradas em auditoria.';
    note.style.background='#e8f7ee';
    note.style.borderColor='#9ed6b2';
    note.style.color='#08723a';
  }else if(writesEnabled){
    note.textContent='PAINEL DE MORADORES: novo cadastro e edição estão liberados. Situação cadastral permanece protegida pelo servidor até a liberação definitiva.';
    note.style.background='#fff6dd';
    note.style.borderColor='#dfaa43';
    note.style.color='#704900';
  }
}

function ensureSituationUi(){
  var form=el('residentForm');
  if(!form||el('residentSituationBlock'))return;
  var block=document.createElement('div');
  block.id='residentSituationBlock';
  block.className='wide';
  block.innerHTML=''
    +'<div class="status" style="margin-top:18px">'
    +'<strong style="display:block;margin-bottom:8px">Situação cadastral</strong>'
    +'<label for="residentSituation">Situação</label>'
    +'<select id="residentSituation" class="field">'
    +'<option value="ATIVO">ATIVO</option>'
    +'<option value="FORA_DA_AREA">SAIU DA ÁREA</option>'
    +'<option value="TRANSFERIDO">TRANSFERIDO</option>'
    +'<option value="FALECIDO">FALECIDO</option>'
    +'</select>'
    +'<label for="residentSituationReason">Motivo / observação da situação</label>'
    +'<textarea id="residentSituationReason" class="field" maxlength="500" placeholder="Opcional para ATIVO; recomendado nas demais situações."></textarea>'
    +'<div class="actions"><button id="saveSituation" class="btn" type="button">Atualizar situação</button></div>'
    +'<div id="situationHint" class="muted" style="margin-top:8px"></div>'
    +'</div>';
  var actions=form.querySelector('.actions');
  if(actions)form.insertBefore(block,actions);else form.appendChild(block);
  el('saveSituation').addEventListener('click',saveSituation);
  syncControls();
}

function syncControls(){
  var save=el('save');
  var isEdit=Boolean(text(el('originRow')&&el('originRow').value));
  if(save){
    save.disabled=!writesEnabled;
    save.textContent=writesEnabled?(isEdit?'Salvar alterações':'Salvar novo morador'):(isEdit?'Salvar alterações — bloqueado':'Salvar morador — bloqueado');
  }
  var lock=document.querySelector('#residentForm .lock');
  if(lock){
    lock.textContent=writesEnabled?'Gravação habilitada pelo servidor. Confira os dados antes de salvar.':'Gravação bloqueada pelo servidor.';
    lock.style.borderStyle=writesEnabled?'solid':'dashed';
    lock.style.borderColor=writesEnabled?'#9ed6b2':'#d4a246';
    lock.style.background=writesEnabled?'#e8f7ee':'#fff9e9';
    lock.style.color=writesEnabled?'#08723a':'#704900';
  }
  var block=el('residentSituationBlock');
  if(block)block.classList.toggle('hidden',!isEdit);
  var situationButton=el('saveSituation');
  if(situationButton)situationButton.disabled=!situationEnabled||!isEdit;
  var hint=el('situationHint');
  if(hint){
    hint.textContent=!isEdit?'A situação é definida após o cadastro existir.':(situationEnabled?'Situação liberada pelo servidor.':'Situação ainda bloqueada pelo servidor.');
  }
}

function renderBase(r,message){
  if(!r||r.ok!==true){setStatus('loginStatus',text(r&&r.message||'Não foi possível carregar a base.'),'err');return false}
  writesEnabled=r.escritaHabilitada===true;
  situationEnabled=r.situacaoHabilitada===true;
  if(el('countResidents'))el('countResidents').textContent=String(r.totalRegistros);
  if(el('schema'))el('schema').textContent=r.schemaValido?'20/20':'ERRO';
  if(el('write'))el('write').textContent=writesEnabled?'LIBERADO':'BLOQ.';
  if(el('situation'))el('situation').textContent=situationEnabled?'LIBERADA':'BLOQ.';
  if(el('summary'))el('summary').classList.remove('hidden');
  if(el('content'))el('content').classList.remove('hidden');
  if(el('logout'))el('logout').disabled=false;
  ensureSituationUi();
  updateNote();
  syncControls();
  setStatus('loginStatus',message||'Sessão validada e base conferida.','ok');
  return true;
}

function loadBase(message){
  post('admin_moradores_status',session(),'admin_moradores_result',function(r){renderBase(r,message)});
}

function loginWithPin(pin){
  setStatus('loginStatus','Validando PIN com o servidor…','warn');
  post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){
    if(el('pin'))el('pin').value='';
    if(!r||r.ok!==true||!r.token){
      token='';
      sessionStorage.removeItem(TOKEN_KEY);
      setStatus('loginStatus',text(r&&r.message||'Login recusado pelo servidor.'),'err');
      return;
    }
    token=r.token;
    sessionStorage.setItem(TOKEN_KEY,token);
    setStatus('loginStatus','PIN validado. Conferindo a base de moradores…','warn');
    loadBase('PIN validado e base de moradores conferida.');
  });
}

function collectResidentPayload(){
  var isEdit=Boolean(text(el('originRow')&&el('originRow').value));
  return {
    moradorId:text(el('residentId')&&el('residentId').value),
    origemAba:text(el('originSheet')&&el('originSheet').value),
    origemLinha:text(el('originRow')&&el('originRow').value),
    idPortal:text(el('residentId')&&el('residentId').value),
    nome:text(el('name')&&el('name').value),
    nascimento:text(el('birth')&&el('birth').value),
    dataNascimento:text(el('birth')&&el('birth').value),
    sexo:text(el('sex')&&el('sex').value),
    cpf:digits(el('cpf')&&el('cpf').value),
    cns:digits(el('cns')&&el('cns').value),
    endereco:text(el('address')&&el('address').value),
    celular:text(el('cell')&&el('cell').value),
    telefoneContato:text(el('contact')&&el('contact').value),
    microarea:text(el('microarea')&&el('microarea').value),
    equipe:text(el('team')&&el('team').value),
    observacoes:text(el('notes')&&el('notes').value),
    operacao:isEdit?'EDITAR_MORADOR':'CRIAR_MORADOR',
    modo:isEdit?'EDITAR_MORADOR':'NOVO_CADASTRO'
  };
}

function validateResidentPayload(p){
  if(!p.nome)return 'Informe o nome completo.';
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(p.nascimento))return 'Informe a data de nascimento no formato DD/MM/AAAA.';
  if(!p.sexo)return 'Selecione o sexo.';
  if(p.cpf&&p.cpf.length!==11)return 'O CPF deve conter 11 números.';
  if(p.cns&&p.cns.length!==15)return 'O CNS deve conter 15 números.';
  return '';
}

function saveResident(){
  if(!writesEnabled){setStatus('operationStatus','A gravação está bloqueada pelo servidor.','warn');return}
  var payload=collectResidentPayload();
  var error=validateResidentPayload(payload);
  if(error){setStatus('operationStatus',error,'err');return}
  var isEdit=Boolean(payload.origemLinha);
  var actionLabel=isEdit?'Salvando alterações…':'Cadastrando morador…';
  setStatus('operationStatus',actionLabel,'warn');
  post('admin_morador_salvar',cloneSession({payload:JSON.stringify(payload)}),'admin_moradores_result',function(r){
    if(!r||r.ok!==true){setStatus('operationStatus',text(r&&r.message||'O servidor recusou a gravação.'),'err');return}
    var morador=r.morador&&typeof r.morador==='object'?r.morador:null;
    if(morador){
      if(el('residentId'))el('residentId').value=text(morador.moradorId||morador.idPortal||payload.moradorId);
      if(el('originSheet'))el('originSheet').value=text(morador.origemAba||payload.origemAba);
      if(el('originRow'))el('originRow').value=text(morador.origemLinha||payload.origemLinha);
      currentSituation=text(morador.situacao||currentSituation||'ATIVO').toUpperCase();
      if(el('residentSituation'))el('residentSituation').value=currentSituation;
    }
    setStatus('operationStatus',text(r.message||(isEdit?'Cadastro atualizado.':'Morador cadastrado.')),'ok');
    loadBase();
    setTimeout(syncControls,0);
  });
}

function saveSituation(){
  if(!situationEnabled){setStatus('operationStatus','A alteração de situação ainda está bloqueada pelo servidor.','warn');return}
  var origemAba=text(el('originSheet')&&el('originSheet').value);
  var origemLinha=text(el('originRow')&&el('originRow').value);
  if(!origemAba||!origemLinha){setStatus('operationStatus','Abra um morador existente antes de alterar a situação.','err');return}
  var situacao=text(el('residentSituation')&&el('residentSituation').value).toUpperCase();
  var motivo=text(el('residentSituationReason')&&el('residentSituationReason').value);
  if(['ATIVO','FORA_DA_AREA','FALECIDO','TRANSFERIDO'].indexOf(situacao)===-1){setStatus('operationStatus','Situação cadastral inválida.','err');return}
  var payload={
    moradorId:text(el('residentId')&&el('residentId').value),
    origemAba:origemAba,
    origemLinha:origemLinha,
    situacao:situacao,
    motivo:motivo
  };
  setStatus('operationStatus','Atualizando situação cadastral…','warn');
  post('admin_morador_situacao',cloneSession({payload:JSON.stringify(payload)}),'admin_moradores_result',function(r){
    if(!r||r.ok!==true){setStatus('operationStatus',text(r&&r.message||'O servidor recusou a alteração de situação.'),'err');return}
    currentSituation=situacao;
    setStatus('operationStatus',text(r.message||'Situação cadastral atualizada.'),'ok');
    loadBase();
  });
}

function onLoginCapture(event){
  var button=event.target&&event.target.closest?event.target.closest('#login'):null;
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  var pin=text(el('pin')&&el('pin').value).replace(/\D/g,'');
  token=sessionStorage.getItem(TOKEN_KEY)||token||'';
  if(token&&!pin){loadBase('Sessão existente validada e base conferida.');return}
  if(!/^\d{4,8}$/.test(pin)){setStatus('loginStatus','Digite um PIN numérico de 4 a 8 dígitos.','err');return}
  loginWithPin(pin);
}

function onResidentSubmitCapture(event){
  var form=event.target;
  if(!form||form.id!=='residentForm')return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  saveResident();
}

function afterUiInteraction(event){
  var target=event.target;
  if(!target)return;
  if(target.closest&&target.closest('#results .card button')){
    setTimeout(function(){
      var card=target.closest('#results .card');
      var pill=card&&card.querySelector('.pill');
      currentSituation=text(pill&&pill.textContent||'ATIVO').toUpperCase();
      if(el('residentSituation'))el('residentSituation').value=currentSituation;
      syncControls();
    },0);
  }
  if(target.id==='tabNew'||target.id==='tabSearch')setTimeout(syncControls,0);
}

document.addEventListener('click',onLoginCapture,true);
document.addEventListener('submit',onResidentSubmitCapture,true);
document.addEventListener('click',afterUiInteraction,false);

/* Pré-aquece a implantação sem autenticar nem escrever nada. */
jsonp('admin_result',{requestId:'warmup_moradores_v2_'+Date.now()},function(){});

if(token){
  setTimeout(function(){
    if(!active)loadBase('Sessão administrativa existente validada e base conferida.');
  },350);
}

window.PortalTacsMoradoresTransportV2={
  post:post,
  loadBase:loadBase,
  syncControls:syncControls,
  saveResident:saveResident,
  saveSituation:saveSituation,
  version:'2.1.0'
};
}());