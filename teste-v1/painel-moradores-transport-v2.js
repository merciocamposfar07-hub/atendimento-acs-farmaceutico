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
var consolidationEnabled=false;
var baseCheckPending=false;
var currentSituation='ATIVO';
var duplicateLock=false;
var lastSearchQuery='';

var COMPARISON_FIELDS=[
  ['idPortal','ID Portal'],['id','ID original'],['cpf','CPF'],['cns','CNS'],
  ['nome','Nome'],['nascimento','Nascimento'],['idade','Idade'],['sexo','Sexo'],
  ['endereco','Endereço'],['celular','Celular'],['telefoneContato','Telefone de contato'],
  ['microarea','Microárea'],['equipe','Equipe'],['origem','Origem'],
  ['ultimaAtualizacao','Última atualização'],['status','Status'],
  ['consentimentoWhatsapp','Consentimento WhatsApp'],['dataConsentimento','Data do consentimento'],
  ['dataCadastroPortal','Data de cadastro no portal'],['observacoes','Observações']
];

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
function normalize(v){
  var value=text(v).toUpperCase();
  if(value.normalize)value=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return value.replace(/\s+/g,' ');
}
function escapeHtml(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
}
function itemKey(item){return text(item.idPortal)+'|'+text(item.origemAba)+'|'+text(item.origemLinha)}
function itemLabel(item){return text(item.idPortal||item.moradorId||item.nome||'Cadastro sem ID')}

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
    note.textContent='PAINEL DE MORADORES: cadastro, edição, situação e consolidação de duplicidades estão liberados. Todas as alterações permanecem registradas em auditoria.';
    note.style.background='#e8f7ee';
    note.style.borderColor='#9ed6b2';
    note.style.color='#08723a';
  }else if(writesEnabled){
    note.textContent='PAINEL DE MORADORES: novo cadastro, edição e consolidação de duplicidades estão liberados. Situação cadastral permanece protegida pelo servidor.';
    note.style.background='#e7f3f7';
    note.style.borderColor='#4f8da3';
    note.style.color='#073a55';
  }
}

function setBaseLoading(loading){
  baseCheckPending=Boolean(loading);
  var searchButton=el('search');
  if(searchButton){
    searchButton.disabled=baseCheckPending;
    searchButton.textContent=baseCheckPending?'Conferindo base…':'Buscar na base real';
  }
}

function showAuthenticatedShell(message){
  writesEnabled=false;
  situationEnabled=false;
  consolidationEnabled=false;
  if(el('countResidents'))el('countResidents').textContent='…';
  if(el('schema'))el('schema').textContent='…';
  if(el('write'))el('write').textContent='AGUARDE';
  if(el('consolidation'))el('consolidation').textContent='AGUARDE';
  if(el('situation'))el('situation').textContent='AGUARDE';
  if(el('summary'))el('summary').classList.remove('hidden');
  if(el('content'))el('content').classList.remove('hidden');
  if(el('logout'))el('logout').disabled=false;
  ensureSituationUi();
  setBaseLoading(true);
  syncControls();
  var note=document.querySelector('main > .note');
  if(note){
    note.textContent='PIN validado. O painel já foi aberto; dados da base e permissões estão sendo conferidos em segundo plano.';
    note.style.background='#e7f3f7';
    note.style.borderColor='#4f8da3';
    note.style.color='#073a55';
  }
  setStatus('loginStatus',message||'PIN validado. Painel liberado; conferindo a base em segundo plano…','ok');
  setStatus('operationStatus','Painel disponível. Aguarde apenas a conferência das permissões para gravar ou pesquisar.','warn');
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
    save.disabled=!writesEnabled||duplicateLock;
    save.textContent=duplicateLock?'Salvar bloqueado — duplicidade confirmada':(writesEnabled?(isEdit?'Salvar alterações':'Salvar novo morador'):(isEdit?'Salvar alterações — bloqueado':'Salvar morador — bloqueado'));
  }
  var lock=document.querySelector('#residentForm .lock');
  if(lock){
    lock.textContent=baseCheckPending?'Conferindo permissões em segundo plano…':(writesEnabled?'Gravação habilitada pelo servidor. Confira os dados antes de salvar.':'Gravação bloqueada pelo servidor.');
    lock.style.borderStyle='solid';
    lock.style.borderColor=baseCheckPending?'#4f8da3':(writesEnabled?'#9ed6b2':'#d4a246');
    lock.style.background=baseCheckPending?'#e7f3f7':(writesEnabled?'#e8f7ee':'#fff9e9');
    lock.style.color=baseCheckPending?'#073a55':(writesEnabled?'#08723a':'#704900');
  }
  var block=el('residentSituationBlock');
  if(block)block.classList.toggle('hidden',!isEdit);
  var situationButton=el('saveSituation');
  if(situationButton)situationButton.disabled=!situationEnabled||!isEdit||duplicateLock;
  var hint=el('situationHint');
  if(hint){
    hint.textContent=!isEdit?'A situação é definida após o cadastro existir.':(duplicateLock?'Consolide a duplicidade antes de alterar este cadastro.':(situationEnabled?'Situação liberada pelo servidor.':'Situação ainda bloqueada pelo servidor.'));
  }
}

function renderBase(r,message){
  if(!r||r.ok!==true){
    setBaseLoading(false);
    syncControls();
    setStatus('loginStatus',text(r&&r.message||'Não foi possível carregar a base.'),'err');
    return false;
  }
  writesEnabled=r.escritaHabilitada===true;
  situationEnabled=r.situacaoHabilitada===true;
  consolidationEnabled=r.consolidacaoHabilitada===true;
  if(el('countResidents'))el('countResidents').textContent=String(r.totalRegistros);
  if(el('schema'))el('schema').textContent=r.schemaValido?'20/20':'ERRO';
  if(el('write'))el('write').textContent=writesEnabled?'LIBERADO':'BLOQ.';
  if(el('consolidation'))el('consolidation').textContent=consolidationEnabled?'LIBERADA':'BLOQ.';
  if(el('situation'))el('situation').textContent=situationEnabled?'LIBERADA':'PROTEGIDA';
  if(el('summary'))el('summary').classList.remove('hidden');
  if(el('content'))el('content').classList.remove('hidden');
  if(el('logout'))el('logout').disabled=false;
  ensureSituationUi();
  setBaseLoading(false);
  updateNote();
  syncControls();
  setStatus('loginStatus',message||'Sessão validada e base conferida.','ok');
  var operation=el('operationStatus');
  if(
    operation&&
    text(operation.textContent).indexOf('conferência das permissões')!==-1
  ){
    setStatus('operationStatus','Base conferida. O painel está pronto para uso.','ok');
  }
  return true;
}

function loadBase(message,done){
  post('admin_moradores_status',session(),'admin_moradores_result',function(r){
    var ok=renderBase(r,message);
    if(typeof done==='function')done(r,ok);
  });
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
    showAuthenticatedShell('PIN validado. Painel aberto imediatamente; conferindo a base em segundo plano…');
    setTimeout(function(){
      if(!active)loadBase('PIN validado e base de moradores conferida.');
    },0);
  });
}

function confirmedDuplicatePair(a,b){
  var cpfA=digits(a.cpf),cpfB=digits(b.cpf),cnsA=digits(a.cns),cnsB=digits(b.cns);
  if((cpfA&&cpfB&&cpfA!==cpfB)||(cnsA&&cnsB&&cnsA!==cnsB))return false;
  var cpfMatch=Boolean(cpfA&&cpfB&&cpfA===cpfB);
  var cnsMatch=Boolean(cnsA&&cnsB&&cnsA===cnsB);
  if(cpfMatch&&cnsMatch)return true;
  return (cpfMatch||cnsMatch)&&normalize(a.nome)===normalize(b.nome)&&text(a.nascimento)===text(b.nascimento);
}

function classifyDuplicates(list){
  var parent=list.map(function(_,i){return i});
  function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
  function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
  var i,j;
  for(i=0;i<list.length;i++)for(j=i+1;j<list.length;j++)if(confirmedDuplicatePair(list[i],list[j]))union(i,j);
  var buckets={};
  for(i=0;i<list.length;i++){
    var root=find(i);
    (buckets[root]||(buckets[root]=[])).push(list[i]);
  }
  var confirmed=[],flags={};
  Object.keys(buckets).forEach(function(k){
    if(buckets[k].length<2)return;
    confirmed.push(buckets[k]);
    buckets[k].forEach(function(item){flags[itemKey(item)]='CONFIRMADA'});
  });
  var byNameBirth={};
  list.forEach(function(item){
    if(flags[itemKey(item)])return;
    var key=normalize(item.nome)+'|'+text(item.nascimento);
    (byNameBirth[key]||(byNameBirth[key]=[])).push(item);
  });
  Object.keys(byNameBirth).forEach(function(k){
    if(byNameBirth[k].length<2)return;
    byNameBirth[k].forEach(function(item){flags[itemKey(item)]='POSSIVEL'});
  });
  return {flags:flags,confirmedGroups:confirmed};
}

function residentSummary(item){
  return '<strong>'+escapeHtml(item.nome)+'</strong>'+
    '<div class="sub">'+escapeHtml(itemLabel(item))+' • CPF '+escapeHtml(item.cpf||'—')+' • CNS '+escapeHtml(item.cns||'—')+' • '+escapeHtml(item.nascimento||'—')+'</div>'+
    '<span class="pill">'+escapeHtml(item.status||item.situacao||'ATIVO')+'</span>';
}

function loadResident(item,flag){
  if(el('residentId'))el('residentId').value=text(item.moradorId);
  if(el('originSheet'))el('originSheet').value=text(item.origemAba);
  if(el('originRow'))el('originRow').value=text(item.origemLinha);
  if(el('name'))el('name').value=text(item.nome);
  if(el('birth'))el('birth').value=text(item.nascimento);
  if(el('sex'))el('sex').value=text(item.sexo);
  if(el('cpf'))el('cpf').value=text(item.cpf);
  if(el('cns'))el('cns').value=text(item.cns);
  if(el('address'))el('address').value=text(item.endereco);
  if(el('cell'))el('cell').value=text(item.celular);
  if(el('contact'))el('contact').value=text(item.telefoneContato);
  if(el('microarea'))el('microarea').value=text(item.microarea)||'1';
  if(el('team'))el('team').value=text(item.equipe)||'USF MATIAS CDS';
  if(el('notes'))el('notes').value=text(item.observacoes);
  if(el('formTitle'))el('formTitle').textContent='Editar morador • '+itemLabel(item);
  if(el('formArea'))el('formArea').classList.remove('hidden');
  if(el('searchArea'))el('searchArea').classList.add('hidden');
  if(el('tabSearch'))el('tabSearch').classList.add('active');
  if(el('tabNew'))el('tabNew').classList.remove('active');
  currentSituation=text(item.status||item.situacao||'ATIVO').toUpperCase();
  if(el('residentSituation'))el('residentSituation').value=currentSituation;
  duplicateLock=flag==='CONFIRMADA';
  setStatus('operationStatus',duplicateLock?'Duplicidade confirmada aberta somente para comparação. Escolha o registro principal no resultado da busca e consolide antes de editar.':'Cadastro carregado para conferência. Nenhuma alteração realizada.',duplicateLock?'warn':'ok');
  syncControls();
}

function showSearch(){
  duplicateLock=false;
  if(el('tabSearch'))el('tabSearch').classList.add('active');
  if(el('tabNew'))el('tabNew').classList.remove('active');
  if(el('searchArea'))el('searchArea').classList.remove('hidden');
  if(el('formArea'))el('formArea').classList.add('hidden');
  setStatus('operationStatus','Busca reaberta. Nenhuma alteração do formulário foi salva.','ok');
  syncControls();
}

function prepareNewResident(){
  duplicateLock=false;
  if(el('residentId'))el('residentId').value='';
  if(el('originSheet'))el('originSheet').value='';
  if(el('originRow'))el('originRow').value='';
  if(el('name'))el('name').value='';
  if(el('birth'))el('birth').value='';
  if(el('sex'))el('sex').selectedIndex=0;
  if(el('cpf'))el('cpf').value='';
  if(el('cns'))el('cns').value='';
  if(el('address'))el('address').value='';
  if(el('cell'))el('cell').value='';
  if(el('contact'))el('contact').value='';
  if(el('microarea'))el('microarea').value='1';
  if(el('team'))el('team').value='USF MATIAS CDS';
  if(el('notes'))el('notes').value='';
  if(el('residentSituation'))el('residentSituation').selectedIndex=0;
  if(el('residentSituationReason'))el('residentSituationReason').value='';
  if(el('formTitle'))el('formTitle').textContent='Novo morador';
  if(el('tabSearch'))el('tabSearch').classList.remove('active');
  if(el('tabNew'))el('tabNew').classList.add('active');
  if(el('searchArea'))el('searchArea').classList.add('hidden');
  if(el('formArea'))el('formArea').classList.remove('hidden');
  currentSituation='ATIVO';
  setStatus('operationStatus','Novo cadastro em branco. Você pode voltar à busca sem salvar.','ok');
  syncControls();
}

function comparisonDetails(group){
  var details=document.createElement('details');
  details.style.marginTop='12px';
  var summary=document.createElement('summary');
  summary.textContent='Comparar os 20 campos antes de escolher o principal';
  summary.style.fontWeight='900';
  summary.style.cursor='pointer';
  details.appendChild(summary);
  var wrap=document.createElement('div');
  wrap.style.overflowX='auto';
  wrap.style.marginTop='10px';
  var table=document.createElement('table');
  table.style.width='100%';
  table.style.borderCollapse='collapse';
  table.style.minWidth=(220+group.length*210)+'px';
  var head=document.createElement('tr');
  ['Campo'].concat(group.map(itemLabel)).forEach(function(label){
    var th=document.createElement('th');
    th.textContent=label;
    th.style.textAlign='left';th.style.padding='8px';th.style.borderBottom='2px solid #a9c0ca';
    head.appendChild(th);
  });
  table.appendChild(head);
  COMPARISON_FIELDS.forEach(function(spec){
    var tr=document.createElement('tr');
    var name=document.createElement('th');
    name.textContent=spec[1];name.style.textAlign='left';name.style.padding='8px';name.style.borderBottom='1px solid #d8e3e8';
    tr.appendChild(name);
    group.forEach(function(item){
      var td=document.createElement('td');
      td.textContent=text(item[spec[0]])||'—';td.style.padding='8px';td.style.borderBottom='1px solid #d8e3e8';td.style.overflowWrap='anywhere';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  wrap.appendChild(table);details.appendChild(wrap);return details;
}

function consolidationPayload(principal,redundante){
  return {
    principal:{origemAba:text(principal.origemAba),origemLinha:Number(principal.origemLinha||0)},
    redundante:{origemAba:text(redundante.origemAba),origemLinha:Number(redundante.origemLinha||0)},
    principalMoradorId:text(principal.moradorId),
    redundanteMoradorId:text(redundante.moradorId)
  };
}

function consolidateGroup(principal,redundantes){
  if(!consolidationEnabled){setStatus('operationStatus','A consolidação está bloqueada pelo servidor.','warn');return}
  if(!redundantes.length)return;
  var ids=redundantes.map(itemLabel).join(', ');
  var confirmed=window.confirm('Confirmar consolidação?\n\nPrincipal preservado: '+itemLabel(principal)+'\nRegistro(s) redundante(s): '+ids+'\n\nA linha redundante não será apagada. Somente campos vazios do principal serão preenchidos; valores conflitantes permanecerão no principal e serão registrados na auditoria.');
  if(!confirmed)return;
  var index=0,totalFilled=[],totalConflicts=[];
  duplicateLock=true;
  function next(){
    if(index>=redundantes.length){
      duplicateLock=false;
      var complement=totalFilled.length?' Campos preenchidos: '+Array.from(new Set(totalFilled)).join(', ')+'.':'';
      var conflicts=totalConflicts.length?' Conflitos preservados no principal: '+Array.from(new Set(totalConflicts)).join(', ')+'.':'';
      var completionMessage='Consolidação concluída sem apagar linhas.'+complement+conflicts+' A lista e a contagem foram atualizadas automaticamente.';
      setStatus('operationStatus',completionMessage,'ok');
      loadBase(null,function(){
        if(lastSearchQuery){
          doSearch(lastSearchQuery,{successMessage:completionMessage});
        }else{
          setStatus('operationStatus',completionMessage,'ok');
        }
      });
      return;
    }
    var redundante=redundantes[index];
    setStatus('operationStatus','Consolidando '+itemLabel(redundante)+' em '+itemLabel(principal)+'…','warn');
    post('admin_morador_consolidar',cloneSession({payload:JSON.stringify(consolidationPayload(principal,redundante))}),'admin_moradores_result',function(r){
      if(!r||r.ok!==true){duplicateLock=false;syncControls();setStatus('operationStatus',text(r&&r.message||'O servidor recusou a consolidação.'),'err');return}
      if(r.principal&&typeof r.principal==='object')principal=r.principal;
      totalFilled=totalFilled.concat(Array.isArray(r.camposPreenchidos)?r.camposPreenchidos:[]);
      totalConflicts=totalConflicts.concat(Array.isArray(r.conflitosPreservadosNoPrincipal)?r.conflitosPreservadosNoPrincipal:[]);
      index++;next();
    });
  }
  next();
}

function confirmedGroupCard(group){
  var card=document.createElement('div');
  card.className='card';
  card.style.borderColor='#d79a23';
  card.style.background='#fff9e9';
  var title=document.createElement('div');
  title.className='status warn';
  title.style.marginTop='0';
  title.textContent='DUPLICIDADE CONFIRMADA: CPF ou CNS coincidente. Escolha abaixo qual ID será preservado como principal.';
  card.appendChild(title);
  var grid=document.createElement('div');
  grid.style.display='grid';grid.style.gap='10px';grid.style.marginTop='12px';
  group.forEach(function(item){
    var option=document.createElement('div');
    option.style.border='2px solid #c4d4db';option.style.borderRadius='15px';option.style.padding='12px';option.style.background='#fff';
    var summary=document.createElement('div');summary.innerHTML=residentSummary(item);option.appendChild(summary);
    var actions=document.createElement('div');actions.className='actions';
    var open=document.createElement('button');open.type='button';open.className='btn gray';open.textContent='Abrir '+itemLabel(item)+' para conferir';open.dataset.duplicateAction='open';
    open.addEventListener('click',function(){loadResident(item,'CONFIRMADA')});
    var keep=document.createElement('button');keep.type='button';keep.className='btn green';keep.textContent='Manter '+itemLabel(item)+' como principal';keep.disabled=!consolidationEnabled;keep.dataset.duplicateAction='consolidate';
    keep.addEventListener('click',function(){consolidateGroup(item,group.filter(function(other){return other!==item}))});
    actions.appendChild(open);actions.appendChild(keep);option.appendChild(actions);grid.appendChild(option);
  });
  card.appendChild(grid);
  card.appendChild(comparisonDetails(group));
  if(!consolidationEnabled){var locked=document.createElement('p');locked.className='muted';locked.textContent='A comparação está disponível, mas a consolidação permanece bloqueada pelo servidor.';card.appendChild(locked)}
  return card;
}

function ordinaryCard(item,flag){
  var card=document.createElement('div');card.className='card';
  var button=document.createElement('button');button.type='button';button.innerHTML=residentSummary(item);button.addEventListener('click',function(){loadResident(item,flag)});card.appendChild(button);
  if(flag==='POSSIVEL'){
    var warning=document.createElement('div');warning.className='status warn';warning.style.marginTop='10px';
    warning.textContent='Possível duplicidade: mesmo nome e nascimento, mas sem documento coincidente suficiente para consolidação automática.';
    card.appendChild(warning);
  }
  return card;
}

function renderSearchResults(list){
  var root=el('results');
  if(!root)return;
  root.innerHTML='';
  if(!list.length){root.innerHTML='<div class="card"><strong>Nenhum morador encontrado</strong></div>';setStatus('operationStatus','Busca concluída sem resultados.','ok');return}
  var classified=classifyDuplicates(list),rendered={};
  classified.confirmedGroups.forEach(function(group){
    group.forEach(function(item){rendered[itemKey(item)]=true});
    root.appendChild(confirmedGroupCard(group));
  });
  var possible=0;
  list.forEach(function(item){
    if(rendered[itemKey(item)])return;
    var flag=classified.flags[itemKey(item)]||'';
    if(flag==='POSSIVEL')possible++;
    root.appendChild(ordinaryCard(item,flag));
  });
  if(classified.confirmedGroups.length)setStatus('operationStatus',classified.confirmedGroups.length+' grupo(s) de duplicidade confirmada. Compare os 20 campos e escolha o ID principal.','warn');
  else if(possible)setStatus('operationStatus','Há cadastros com possível duplicidade que precisam de conferência.','warn');
  else setStatus('operationStatus',list.length+' resultado(s) encontrado(s). Toque em um cadastro para conferir.','ok');
}

function doSearch(query,options){
  options=options&&typeof options==='object'?options:{};
  var q=text(query!=null?query:(el('query')&&el('query').value));
  if(q.length<2){setStatus('operationStatus','Digite pelo menos 2 caracteres.','err');return}
  token=sessionStorage.getItem(TOKEN_KEY)||token||'';
  if(!token){setStatus('operationStatus','Sessão administrativa ausente. Entre novamente com o PIN.','err');return}
  if(baseCheckPending){
    setStatus('operationStatus','O painel já está aberto. Aguarde somente a conferência da base terminar.','warn');
    return;
  }
  lastSearchQuery=q;
  duplicateLock=false;
  syncControls();
  setStatus('operationStatus','Buscando na base real…','warn');
  post('admin_moradores_buscar',cloneSession({q:q}),'admin_moradores_result',function(r){
    if(!r||r.ok!==true){setStatus('operationStatus',text(r&&r.message||'Busca recusada.'),'err');return}
    renderSearchResults(Array.isArray(r.resultados)?r.resultados:[]);
    if(options.successMessage)setStatus('operationStatus',options.successMessage,'ok');
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
  if(duplicateLock){setStatus('operationStatus','Gravação bloqueada: consolide primeiro a duplicidade confirmada.','warn');return}
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
  if(duplicateLock){setStatus('operationStatus','Situação bloqueada: consolide primeiro a duplicidade confirmada.','warn');return}
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
  if(token&&!pin){
    showAuthenticatedShell('Sessão encontrada. Painel aberto; conferindo a base em segundo plano…');
    setTimeout(function(){
      if(!active)loadBase('Sessão existente validada e base conferida.');
    },0);
    return;
  }
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

function onSearchCapture(event){
  var button=event.target&&event.target.closest?event.target.closest('#search'):null;
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  doSearch();
}

function onSearchKeyCapture(event){
  if(!event.target||event.target.id!=='query'||event.key!=='Enter')return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  doSearch();
}

function onTabCapture(event){
  var target=event.target&&event.target.closest
    ?event.target.closest('#tabSearch,#tabNew')
    :null;
  if(!target)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  if(target.id==='tabSearch')showSearch();else prepareNewResident();
}

function afterUiInteraction(event){
  var target=event.target;
  if(!target)return;
  if(target.closest&&target.closest('[data-duplicate-action]'))return;
  if(target.closest&&target.closest('#results .card button')){
    setTimeout(function(){
      var card=target.closest('#results .card');
      var pill=card&&card.querySelector('.pill');
      currentSituation=text(pill&&pill.textContent||'ATIVO').toUpperCase();
      if(el('residentSituation'))el('residentSituation').value=currentSituation;
      syncControls();
    },0);
  }
}

document.addEventListener('click',onLoginCapture,true);
document.addEventListener('click',onSearchCapture,true);
document.addEventListener('click',onTabCapture,true);
document.addEventListener('keydown',onSearchKeyCapture,true);
document.addEventListener('submit',onResidentSubmitCapture,true);
document.addEventListener('click',afterUiInteraction,false);

/* Pré-aquece a implantação sem autenticar nem escrever nada. */
jsonp('admin_result',{requestId:'warmup_moradores_v2_'+Date.now()},function(){});

if(token){
  showAuthenticatedShell('Sessão administrativa encontrada. Painel aberto; conferindo a base em segundo plano…');
  setTimeout(function(){
    if(!active)loadBase('Sessão administrativa existente validada e base conferida.');
  },100);
}

window.PortalTacsMoradoresTransportV2={
  post:post,
  loadBase:loadBase,
  renderBase:renderBase,
  showAuthenticatedShell:showAuthenticatedShell,
  syncControls:syncControls,
  saveResident:saveResident,
  saveSituation:saveSituation,
  search:doSearch,
  classifyDuplicates:classifyDuplicates,
  renderSearchResults:renderSearchResults,
  loadResident:loadResident,
  showSearch:showSearch,
  prepareNewResident:prepareNewResident,
  consolidateGroup:consolidateGroup,
  version:'3.3.0'
};
}());
