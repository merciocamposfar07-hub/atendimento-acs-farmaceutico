(function(){
'use strict';

/* TAREFA_16_AGENDAS_NATIVAS_V1
   Agendas e vagas é montado diretamente no shell da Central.
   A página painel-oficial-agendas-vagas.html permanece apenas como fallback histórico.
*/
var UNDO_KEY='portalTacsUndoAgendaV1',instance=null;

function text(v){return String(v==null?'':v)}
function bool(v){if(v===true||v===1)return true;return ['true','1','sim','yes','ativo'].indexOf(text(v).trim().toLowerCase())!==-1}
function num(v,p){var n=Number(v);return Number.isFinite(n)?n:(p||0)}
function esc(v){return text(v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]})}
function normalSituacao(v){return text(v).toUpperCase().replace(/_/g,' ').replace(/\s+/g,' ').trim()}
function normalId(v){return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')}
function normalDia(v){var s=text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();if(s.indexOf('SEGUNDA')===0)return'SEGUNDA';if(s.indexOf('TERCA')===0)return'TERCA';if(s.indexOf('QUARTA')===0)return'QUARTA';if(s.indexOf('QUINTA')===0)return'QUINTA';if(s.indexOf('SEXTA')===0)return'SEXTA';return s}
function ordemDia(v){var d=normalDia(v),m={SEGUNDA:1,TERCA:2,QUARTA:3,QUINTA:4,SEXTA:5};return Object.prototype.hasOwnProperty.call(m,d)?m[d]:99}
function dataInput(v){var s=text(v).trim();if(!s)return'';var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];var d=new Date(s);if(isNaN(d.getTime()))return'';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}

function create(host){
  var core=window.ConectaModuleCoreV1,transportFactory=window.ConectaAgendasTransportV1;
  if(!core||typeof core.session!=='function')throw new Error('Núcleo Conecta indisponível para Agendas.');
  if(!transportFactory||typeof transportFactory.create!=='function')throw new Error('Transporte nativo de Agendas indisponível.');
  var perf=core.performance,requests=core.requests,policy=core.sessionPolicy;
  var areaId=normalId(core.areaId&&core.areaId())||'JAPARANDUBA';
  var scope=(core.mode&&core.mode()||'')+'|'+areaId;
  var transport=transportFactory.create({requests:requests});
  var state={profissionais:[],agendas:[]},confirmed=false,dirty=false,visible=false,initialized=false,dentalBusy=false,syncTimer=null;

  host.innerHTML=
    '<section class="csc-ag-native" data-role="root">'+
      '<p class="native-note">Módulo nativo do Conecta • área <strong data-role="area"></strong></p>'+
      '<div class="status aviso" data-role="status">Preparando agendas e vagas…</div>'+
      '<div class="metrics">'+
        '<div class="metric"><strong data-role="qAgendas">0</strong><span>agendas</span></div>'+
        '<div class="metric"><strong data-role="qAtivas">0</strong><span>ativas</span></div>'+
        '<div class="metric"><strong data-role="qProf">0</strong><span>profissionais</span></div>'+
        '<div class="metric"><strong data-role="qVagas">0</strong><span>vagas configuradas</span></div>'+
      '</div>'+
      '<div class="filters">'+
        '<label>Profissional<select data-role="filtroProf"><option value="">Todos</option></select></label>'+
        '<label>Dia<select data-role="filtroDia"><option value="">Todos</option><option>SEGUNDA</option><option>TERCA</option><option>QUARTA</option><option>QUINTA</option><option>SEXTA</option></select></label>'+
      '</div>'+
      '<div data-role="lista"></div>'+
      '<button class="undo" data-role="undo" type="button" hidden>Desfazer a última alteração</button>'+
    '</section>';

  function q(role){return host.querySelector('[data-role="'+role+'"]')}
  q('area').textContent=areaId;

  function setStatus(message,type){var n=q('status');n.textContent=message;n.className='status'+(type?' '+type:'')}
  function setDirty(v){dirty=Boolean(v);host.dataset.tacsDirty=dirty?'1':'0'}
  function session(){return core.session({areaId:areaId,escopo:'agendas'})}
  function ready(){return core.ready?core.ready():Boolean(session().token||session().territorioToken)}
  function prof(id){var key=normalId(id);return state.profissionais.find(function(x){return normalId(x.ID)===key})||null}
  function achar(modulo,dia){var m=normalId(modulo),d=normalDia(dia);return state.agendas.find(function(a){return normalId(a.MODULO)===m&&normalDia(a.DIA)===d})||null}
  function chave(a){return normalId(a.MODULO)+'|'+normalDia(a.DIA)}

  function setUndo(record){try{sessionStorage.setItem(UNDO_KEY,JSON.stringify({registro:clone(record),criadoEm:Date.now(),areaId:areaId}))}catch(e){}updateUndo()}
  function readUndo(){try{var u=JSON.parse(sessionStorage.getItem(UNDO_KEY)||'null');return u&&u.areaId===areaId?u:null}catch(e){return null}}
  function clearUndo(){try{sessionStorage.removeItem(UNDO_KEY)}catch(e){}updateUndo()}
  function updateUndo(){q('undo').hidden=!readUndo()}
  function lockWrites(){host.querySelectorAll('.csc-ag-save').forEach(function(b){b.disabled=!confirmed});q('undo').disabled=!confirmed}

  function performancePayload(r){return{ok:true,profissionais:Array.isArray(r&&r.profissionais)?r.profissionais:[],agendas:Array.isArray(r&&r.agendas)?r.agendas:[]}}
  function prime(){
    if(!perf||typeof perf.prime!=='function')return false;
    var item=perf.prime('agendas',function(data){applyData(data,false)});
    if(item){setStatus('Última confirmação exibida. Sincronizando agendas em segundo plano…','aviso');return true}
    return false;
  }
  function applyData(r,isConfirmed){
    confirmed=isConfirmed===true;
    state.profissionais=Array.isArray(r&&r.profissionais)?r.profissionais:[];
    state.agendas=Array.isArray(r&&r.agendas)?r.agendas:[];
    fillFilters();render();setDirty(false);
  }
  function classifyFailure(r){
    if(policy&&typeof policy.classify==='function')return policy.classify(r);
    return{explicitAuthRefusal:false,temporary:true,preserveSession:true};
  }
  function load(message,done,options){
    options=options||{};
    if(!ready()){setStatus('A sessão da Central não está disponível. Volte à Central.','erro');if(done)done(false,{ok:false});return}
    var had=options.skipPrime?false:prime();
    if(!had&&!options.silent)setStatus('Carregando agendas e vagas…','aviso');
    var payload=session();
    transport.read('admin_dados',payload,function(r){
      if(!r||r.ok!==true){
        var failure=classifyFailure(r);confirmed=false;lockWrites();
        if(failure.explicitAuthRefusal){
          if(core.reportAuthIssue)core.reportAuthIssue(text(r&&r.message)||'Sessão recusada ao carregar Agendas.');
          setStatus('A sessão foi recusada pelo servidor. Volte à Central.','erro');
        }else setStatus(had?'Últimos dados válidos permanecem para consulta. A sessão foi preservada.':'Servidor temporariamente indisponível. A sessão foi preservada.','aviso');
        if(done)done(false,r);return;
      }
      var diff=perf&&typeof perf.commit==='function'?perf.commit('agendas',performancePayload(r)):{changed:true};
      if(diff.changed||!initialized||options.forceApply)applyData(r,true);else{confirmed=true;lockWrites()}
      initialized=true;
      setStatus(message||'Agendas e vagas confirmadas pelo servidor.','ok');
      if(done)done(true,r);
    });
  }

  function fillFilters(){
    var f=q('filtroProf'),current=f.value;
    f.innerHTML='<option value="">Todos</option>'+state.profissionais.slice().sort(function(a,b){return num(a.ORDEM,999)-num(b.ORDEM,999)}).map(function(p){return'<option value="'+esc(p.ID)+'">'+esc(p.TITULO_PUBLICO||p.NOME||p.ID)+'</option>'}).join('');
    f.value=current;
  }
  function cardHtml(a){
    var active=bool(a.ATIVO),vagas=num(a.VAGAS_COMUNS)+num(a.VAGAS_EMERGENCIAIS);
    return '<details class="card" data-key="'+esc(chave(a))+'"><summary><div><h3>'+esc(a.DIA)+' • '+esc(a.HORARIO||'Sem horário')+'</h3><div class="sub">'+vagas+' vaga(s)</div></div><span class="signal '+(active?'ativo':'inativo')+'">'+(active?'Ativa':'Inativa')+'</span></summary><div class="card-body">'+
      '<label>Profissional<input name="modulo" value="'+esc(a.MODULO)+'" readonly></label>'+
      '<label>Dia<input name="dia" value="'+esc(a.DIA)+'" readonly></label>'+
      '<label>Data específica<input name="data" type="date" value="'+esc(dataInput(a.DATA))+'"></label>'+
      '<label>Horário<input name="horario" value="'+esc(a.HORARIO)+'" placeholder="Ex.: 08:00 às 12:00"></label>'+
      '<label>Situação<select name="situacao"><option value="">SEM SITUAÇÃO DEFINIDA</option><option value="ATENDIMENTO">ATENDIMENTO</option><option value="SEM ATENDIMENTO">SEM ATENDIMENTO</option><option value="FERIADO">FERIADO</option><option value="CANCELADO">CANCELADO</option></select></label>'+
      '<label>Mensagem<textarea name="mensagem">'+esc(a.MENSAGEM)+'</textarea></label>'+
      '<label>Vagas comuns<input name="vagasComuns" type="number" min="0" max="999" value="'+esc(a.VAGAS_COMUNS)+'"></label>'+
      '<label>Vagas emergenciais<input name="vagasEmergenciais" type="number" min="0" max="999" value="'+esc(a.VAGAS_EMERGENCIAIS)+'"></label>'+
      '<div class="checks"><label class="check"><input name="ativo" type="checkbox" '+(active?'checked':'')+'> Agenda ativa</label>'+
      '<label>Hora de expiração<input name="encerraHorario" type="time" value="'+esc(text(a.ENCERRA_HORARIO)||(bool(a.ENCERRA_12H)?'12:00':''))+'"></label>'+
      '<label class="check"><input name="diaExtra" type="checkbox" '+(bool(a.DIA_EXTRA)?'checked':'')+'> Dia extra</label></div>'+
      '<button class="save csc-ag-save" type="button">Salvar agenda</button></div></details>';
  }
  function render(){
    var filterProf=q('filtroProf').value,filterDay=q('filtroDia').value;
    var list=state.agendas.slice().filter(function(a){return(!filterProf||normalId(a.MODULO)===normalId(filterProf))&&(!filterDay||normalDia(a.DIA)===normalDia(filterDay))}).sort(function(a,b){
      var pa=prof(a.MODULO),pb=prof(b.MODULO),oa=pa?num(pa.ORDEM,999):999,ob=pb?num(pb.ORDEM,999):999;
      if(oa!==ob)return oa-ob;var da=ordemDia(a.DIA),db=ordemDia(b.DIA);if(da!==db)return da-db;return num(a.ORDEM,999)-num(b.ORDEM,999);
    });
    var groups={},order=[];
    list.forEach(function(a){var m=normalId(a.MODULO);if(!groups[m]){groups[m]={p:prof(a.MODULO)||{},items:[]};order.push(m)}groups[m].items.push(a)});
    var html='';
    order.forEach(function(m){
      var g=groups[m],p=g.p,total=g.items.reduce(function(t,a){return t+num(a.VAGAS_COMUNS)+num(a.VAGAS_EMERGENCIAIS)},0),activeCount=g.items.filter(function(a){return bool(a.ATIVO)}).length;
      html+='<details class="group"><summary><div class="group-name"><span>'+esc(p.ICONE||'📅')+'</span><div><strong>'+esc(p.TITULO_PUBLICO||p.NOME||g.items[0].MODULO)+'</strong><span class="group-meta">'+g.items.length+' dia(s) • '+activeCount+' ativo(s) • '+total+' vaga(s)</span></div></div><span>▾</span></summary><div class="group-body">';
      g.items.forEach(function(a){html+=cardHtml(a)});html+='</div></details>';
    });
    q('lista').innerHTML=html||'<div class="empty">Nenhuma agenda encontrada para este filtro.</div>';
    list.forEach(function(a){
      var cards=host.querySelectorAll('.card'),card=null;
      for(var i=0;i<cards.length;i++)if(cards[i].dataset.key===chave(a)){card=cards[i];break}
      if(card){var s=card.querySelector('[name="situacao"]');if(s)s.value=normalSituacao(a.SITUACAO)}
    });
    q('qAgendas').textContent=state.agendas.length;
    q('qAtivas').textContent=state.agendas.filter(function(a){return bool(a.ATIVO)}).length;
    q('qProf').textContent=state.profissionais.length;
    q('qVagas').textContent=state.agendas.reduce(function(t,a){return t+num(a.VAGAS_COMUNS)+num(a.VAGAS_EMERGENCIAIS)},0);
    updateUndo();lockWrites();
  }

  function field(card,name){var n=card.querySelector('[name="'+name+'"]');return n?n.value:''}
  function checked(card,name){var n=card.querySelector('[name="'+name+'"]');return n&&n.checked?'true':'false'}
  function payload(card){return Object.assign(session(),{
    modulo:field(card,'modulo'),dia:field(card,'dia'),data:field(card,'data'),horario:field(card,'horario').trim(),
    situacao:normalSituacao(field(card,'situacao')),mensagem:field(card,'mensagem').trim(),encerraHorario:field(card,'encerraHorario'),
    encerra12h:field(card,'encerraHorario')==='12:00'?'true':'false',vagasComuns:field(card,'vagasComuns'),
    vagasEmergenciais:field(card,'vagasEmergenciais'),diaExtra:checked(card,'diaExtra'),ativo:checked(card,'ativo')
  })}
  function recordValue(r,n){if(!r)return null;if(n==='data')return dataInput(r.DATA);if(n==='horario')return text(r.HORARIO).trim();if(n==='situacao')return normalSituacao(r.SITUACAO);if(n==='mensagem')return text(r.MENSAGEM).trim();if(n==='encerraHorario')return text(r.ENCERRA_HORARIO||((bool(r.ENCERRA_12H))?'12:00':'')).trim();if(n==='vagasComuns')return num(r.VAGAS_COMUNS);if(n==='vagasEmergenciais')return num(r.VAGAS_EMERGENCIAIS);if(n==='diaExtra')return bool(r.DIA_EXTRA);if(n==='ativo')return bool(r.ATIVO);return''}
  function payloadValue(p,n){if(n==='data')return text(p.data).trim();if(n==='horario')return text(p.horario).trim();if(n==='situacao')return normalSituacao(p.situacao);if(n==='mensagem')return text(p.mensagem).trim();if(n==='encerraHorario')return text(p.encerraHorario).trim();if(n==='vagasComuns')return num(p.vagasComuns);if(n==='vagasEmergenciais')return num(p.vagasEmergenciais);if(n==='diaExtra')return bool(p.diaExtra);if(n==='ativo')return bool(p.ativo);return''}
  function sameExact(current,p){
    if(!current||normalId(current.MODULO)!==normalId(p.modulo)||normalDia(current.DIA)!==normalDia(p.dia))return false;
    return ['data','horario','situacao','mensagem','encerraHorario','vagasComuns','vagasEmergenciais','diaExtra','ativo'].every(function(n){return recordValue(current,n)===payloadValue(p,n)});
  }
  function sameChanges(current,p,before){
    if(!current||!before||normalId(current.MODULO)!==normalId(p.modulo)||normalDia(current.DIA)!==normalDia(p.dia))return false;
    var fields=['data','horario','situacao','mensagem','encerraHorario','vagasComuns','vagasEmergenciais','diaExtra','ativo'],changed=false;
    for(var i=0;i<fields.length;i++){var n=fields[i],old=recordValue(before,n),wanted=payloadValue(p,n);if(old!==wanted){changed=true;if(recordValue(current,n)!==wanted)return false}}
    return changed?true:sameExact(current,p);
  }

  function save(card){
    if(!confirmed){setStatus('Aguarde a confirmação dos dados atuais antes de salvar.','aviso');return}
    var p=payload(card),before=clone(achar(p.modulo,p.dia));
    if(!before){setStatus('Agenda não encontrada na leitura atual.','erro');return}
    if(!window.confirm('Gravar esta agenda na planilha real?'))return;
    setUndo(before);setStatus('Salvando agenda e aguardando confirmação real…','aviso');
    transport.post('admin_salvar_agenda',p,function(r){
      if(!r||r.ok!==true){setStatus((text(r&&r.message)||'Não foi possível salvar a agenda.')+' A sessão foi preservada.','erro');return}
      load('Alteração enviada. Conferindo a leitura real…',function(ok){
        if(!ok){setDirty(true);setStatus('A alteração foi enviada, mas a releitura ainda não foi confirmada. Não faça outra alteração.','aviso');return}
        var current=achar(p.modulo,p.dia);
        if(!sameChanges(current,p,before)){setDirty(true);setStatus('A releitura ainda diverge do que foi salvo. Não faça outra alteração.','erro');return}
        setDirty(false);setStatus('Agenda salva e confirmada pela releitura do servidor.','ok');
      },{skipPrime:true,forceApply:true,silent:true});
    });
  }
  function restore(){
    if(!confirmed){setStatus('Aguarde a confirmação atual antes de restaurar.','aviso');return}
    var u=readUndo();if(!u||!u.registro)return;
    if(!window.confirm('Restaurar exatamente os valores anteriores da última agenda alterada?'))return;
    var r=u.registro,p=Object.assign(session(),{
      modulo:r.MODULO,dia:r.DIA,data:dataInput(r.DATA),horario:text(r.HORARIO),situacao:normalSituacao(r.SITUACAO),mensagem:text(r.MENSAGEM),
      encerraHorario:text(r.ENCERRA_HORARIO)||((bool(r.ENCERRA_12H))?'12:00':''),
      encerra12h:(text(r.ENCERRA_HORARIO)||((bool(r.ENCERRA_12H))?'12:00':''))==='12:00'?'true':'false',
      vagasComuns:num(r.VAGAS_COMUNS),vagasEmergenciais:num(r.VAGAS_EMERGENCIAIS),diaExtra:bool(r.DIA_EXTRA)?'true':'false',ativo:bool(r.ATIVO)?'true':'false'
    });
    setStatus('Restaurando e conferindo todos os campos…','aviso');
    transport.post('admin_salvar_agenda',p,function(x){
      if(!x||x.ok!==true){setStatus((text(x&&x.message)||'A restauração falhou.')+' O registro anterior foi preservado.','erro');return}
      load('Restauração enviada. Conferindo leitura real…',function(ok){
        if(!ok)return;
        if(sameExact(achar(p.modulo,p.dia),p)){clearUndo();setDirty(false);setStatus('Valores anteriores restaurados e confirmados pela releitura.','ok')}
        else{setDirty(true);setStatus('A restauração foi enviada, mas a releitura ainda diverge.','erro')}
      },{skipPrime:true,forceApply:true,silent:true});
    });
  }

  function syncDental(){
    if(!visible||document.hidden||dentalBusy||dirty||!confirmed||!ready()||transport.isBusy())return;
    dentalBusy=true;
    transport.publicAgenda(areaId,function(r){
      dentalBusy=false;if(!r||r.ok!==true||!Array.isArray(r.dias))return;var changed=false;
      r.dias.forEach(function(day){
        var record=state.agendas.find(function(a){return normalId(a.MODULO)==='ODONTOLOGIA'&&normalDia(a.DIA)===normalDia(day.dia)});if(!record)return;
        var common=Number(Object.prototype.hasOwnProperty.call(day,'vagasComunsConfiguradas')?day.vagasComunsConfiguradas:day.vagasComuns);
        var urgent=Number(Object.prototype.hasOwnProperty.call(day,'vagasEmergenciaisConfiguradas')?day.vagasEmergenciaisConfiguradas:day.vagasEmergenciais);
        if(Number.isFinite(common)&&num(record.VAGAS_COMUNS)!==common){record.VAGAS_COMUNS=common;changed=true}
        if(Number.isFinite(urgent)&&num(record.VAGAS_EMERGENCIAIS)!==urgent){record.VAGAS_EMERGENCIAIS=urgent;changed=true}
      });
      if(changed)render();
    });
  }

  q('lista').addEventListener('click',function(e){var b=e.target.closest('.csc-ag-save');if(b)save(b.closest('.card'))});
  ['input','change'].forEach(function(kind){q('lista').addEventListener(kind,function(e){var n=e.target;if(n&&n.matches&&n.matches('input,select,textarea')&&!n.readOnly)setDirty(true)})});
  q('filtroProf').addEventListener('change',render);
  q('filtroDia').addEventListener('change',render);
  q('undo').addEventListener('click',restore);
  syncTimer=setInterval(syncDental,5000);

  return{
    scope:scope,
    mount:function(){visible=true;host.hidden=false;if(!initialized)load('Agendas e vagas confirmadas pelo servidor.',null,{silent:true});else setTimeout(syncDental,100)},
    hide:function(){visible=false;host.hidden=true},
    hasUnsaved:function(){return dirty},
    reload:function(){load('Agendas e vagas atualizadas e confirmadas.',null,{skipPrime:true,forceApply:true})},
    reset:function(){visible=false;if(syncTimer)clearInterval(syncTimer);syncTimer=null;transport.destroy();host.innerHTML='';host.hidden=true;host.dataset.tacsDirty='0'}
  };
}

function mount(host){
  if(!host)throw new Error('Host nativo de Agendas não encontrado.');
  var core=window.ConectaModuleCoreV1;
  var scope=(core&&core.mode&&core.mode()||'')+'|'+normalId(core&&core.areaId&&core.areaId());
  if(instance&&instance.scope!==scope){instance.reset();instance=null}
  if(!instance)instance=create(host);
  instance.mount();
  return instance;
}
function hide(){if(instance)instance.hide()}
function reset(){if(instance){instance.reset();instance=null}}
function hasUnsaved(){return Boolean(instance&&instance.hasUnsaved())}
function reload(){if(instance)instance.reload()}

window.ConectaAgendasNativeV1={
  mount:mount,hide:hide,reset:reset,hasUnsaved:hasUnsaved,reload:reload,
  marker:'TAREFA_16_AGENDAS_NATIVAS_V1'
};
}());
