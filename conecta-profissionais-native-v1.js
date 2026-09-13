(function(){
'use strict';

/* TAREFA_18_PROFISSIONAIS_NATIVOS_V1
   Profissionais e serviços é o terceiro painel da migração definitiva.
   A UI vive no shell da Central. O iframe legado existe somente como ponte invisível
   para a lógica já validada de leitura/gravação e nunca é exibido como painel. */

var instance=null,UNDO_KEY='conectaProfissionaisUndoTask18V1';

function text(v){return String(v==null?'':v).trim()}
function bool(v){if(v===true||v===1)return true;return ['true','1','sim','yes','ativo'].indexOf(text(v).toLowerCase())!==-1}
function num(v,p){var n=Number(v);return Number.isFinite(n)?n:(p||0)}
function esc(v){return text(v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]})}
function norm(v){var s=text(v);if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.toUpperCase().replace(/\s+/g,' ').trim()}
function idAuto(v){return norm(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)}
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
function visibleService(s){return norm(s&&s.NOME)!=='ATENDIMENTO ODONTOLOGICO DE EMERGENCIA'}

function template(areaId){
  return '<section class="csc-prof-native" data-role="root">'+
    '<p style="margin:0 0 10px;color:#8eb2c6;font-size:.78rem">Módulo nativo do Conecta • profissionais e serviços • área <strong>'+esc(areaId)+'</strong></p>'+
    '<div class="status" data-role="status">Preparando profissionais e serviços…</div>'+
    '<div class="metrics">'+
      '<div class="metric"><strong data-role="qProf">0</strong><span>Profissionais</span></div>'+
      '<div class="metric"><strong data-role="qServ">0</strong><span>Serviços</span></div>'+
      '<div class="metric"><strong data-role="qProfAtivos">0</strong><span>Profissionais ativos</span></div>'+
      '<div class="metric"><strong data-role="qServAtivos">0</strong><span>Serviços ativos</span></div>'+
    '</div>'+
    '<div class="tabs">'+
      '<button type="button" data-tab="prof">Profissionais</button>'+
      '<button type="button" data-tab="serv">Serviços</button>'+
      '<button type="button" data-tab="novo">Adicionar profissional</button>'+
    '</div>'+
    '<section class="panel" data-area="prof"><div data-role="profList"></div></section>'+
    '<section class="panel hidden" data-area="serv"><div data-role="servList"></div></section>'+
    '<section class="panel hidden" data-area="novo">'+
      '<form data-role="newForm" autocomplete="off">'+
        '<label>Nome interno<input name="nome" maxlength="100" required></label>'+
        '<label>Título exibido<input name="tituloPublico" maxlength="140" required></label>'+
        '<label>Ícone<input name="icone" value="👤" maxlength="12"></label>'+
        '<label>Ordem<input name="ordem" type="number" min="1" max="999"></label>'+
        '<label>Primeiro serviço<input name="servicoNome" maxlength="140" required></label>'+
        '<label>Descrição automática<textarea name="descricaoAutomatica" maxlength="500" required></textarea></label>'+
        '<div class="checks">'+
          '<label class="check"><input name="ativo" type="checkbox"> Ativar profissional e serviço ao criar</label>'+
          '<label class="check"><input name="permiteVagaComum" type="checkbox"> Serviço usa vagas comuns</label>'+
          '<label class="check"><input name="permiteEmergencia" type="checkbox"> Serviço usa vagas emergenciais</label>'+
        '</div>'+
        '<div class="actions"><button class="save" type="submit">Criar profissional, serviço e agenda</button></div>'+
      '</form>'+
    '</section>'+
    '<button class="undo hidden" data-role="undo" type="button">Desfazer a última alteração</button>'+
    '<iframe data-role="bridge" title="Ponte técnica de profissionais" hidden aria-hidden="true"></iframe>'+
  '</section>';
}

function create(host,options){
  var core=window.ConectaModuleCoreV1;
  if(!core||typeof core.session!=='function')throw new Error('Núcleo Conecta indisponível para Profissionais.');
  var areaId=text(options&&options.areaId||core.areaId&&core.areaId()||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA';
  var scope=(core.mode&&core.mode()||'')+'|'+areaId;
  var data={profissionais:[],servicos:[]},confirmed=false,dirty=false,visible=false,bridgeReady=false,booting=false;

  host.innerHTML=template(areaId);
  host.dataset.tacsDirty='0';

  function q(role){return host.querySelector('[data-role="'+role+'"]')}
  function setDirty(v){dirty=Boolean(v);host.dataset.tacsDirty=dirty?'1':'0'}
  function setStatus(msg,type){var n=q('status');n.textContent=msg;n.className='status'+(type?' '+type:'')}
  function bridge(){var f=q('bridge');try{return f&&f.contentWindow&&f.contentWindow.ConectaProfissionaisBridgeV1||null}catch(e){return null}}
  function readUndo(){try{var u=JSON.parse(sessionStorage.getItem(UNDO_KEY)||'null');return u&&u.areaId===areaId?u:null}catch(e){return null}}
  function writeUndo(tipo,registro){try{sessionStorage.setItem(UNDO_KEY,JSON.stringify({areaId:areaId,tipo:tipo,registro:clone(registro),criadoEm:Date.now()}))}catch(e){}syncUndo()}
  function clearUndo(){try{sessionStorage.removeItem(UNDO_KEY)}catch(e){}syncUndo()}
  function syncUndo(){q('undo').classList.toggle('hidden',!readUndo());q('undo').disabled=!confirmed}
  function findProf(id){return data.profissionais.find(function(x){return text(x.ID)===text(id)})||null}
  function findServ(id){return data.servicos.find(function(x){return text(x.ID)===text(id)})||null}
  function nextOrder(){return data.profissionais.reduce(function(m,p){return Math.max(m,num(p.ORDEM,0))},0)+1}
  function disableWrites(){
    host.querySelectorAll('.save-prof,.save-serv,[data-role="newForm"] button[type="submit"]').forEach(function(b){b.disabled=!confirmed});
    syncUndo();
  }

  function useSnapshot(s,message){
    if(!s||s.ok!==true)return false;
    confirmed=s.confirmado===true;
    data.profissionais=Array.isArray(s.profissionais)?s.profissionais:[];
    data.servicos=Array.isArray(s.servicos)?s.servicos:[];
    render();
    if(message)setStatus(message,confirmed?'ok':'warn');
    return true;
  }

  function serviceOptions(selected){
    return data.profissionais.slice().sort(function(a,b){return num(a.ORDEM,999)-num(b.ORDEM,999)}).map(function(p){
      var id=text(p.ID);return '<option value="'+esc(id)+'" '+(id===text(selected)?'selected':'')+'>'+esc(p.TITULO_PUBLICO||p.NOME||id)+'</option>';
    }).join('');
  }

  function renderProf(){
    var list=data.profissionais.slice().sort(function(a,b){return num(a.ORDEM,999)-num(b.ORDEM,999)});
    q('profList').innerHTML=list.length?list.map(function(p){
      var id=text(p.ID);
      return '<details class="card" data-kind="prof" data-id="'+esc(id)+'"><summary><strong>'+esc(p.TITULO_PUBLICO||p.NOME||id)+'</strong><div style="color:#adc4d2;font-size:.78rem;margin-top:3px">ID: '+esc(id)+' • Ordem: '+esc(p.ORDEM)+'</div></summary><div class="body">'+
        '<label>ID<input name="id" value="'+esc(id)+'" readonly></label>'+
        '<label>Nome interno<input name="nome" value="'+esc(p.NOME)+'"></label>'+
        '<label>Título público<input name="tituloPublico" value="'+esc(p.TITULO_PUBLICO)+'"></label>'+
        '<label>Ícone<input name="icone" value="'+esc(p.ICONE)+'"></label>'+
        '<label>Ordem<input name="ordem" type="number" min="1" max="999" value="'+esc(p.ORDEM)+'"></label>'+
        '<div class="checks"><label class="check"><input name="ativo" type="checkbox" '+(bool(p.ATIVO)?'checked':'')+'> Profissional ativo</label></div>'+
        '<div class="actions"><button class="save save-prof" type="button">Salvar profissional</button></div>'+
      '</div></details>';
    }).join(''):'<p style="color:#adc4d2">Nenhum profissional encontrado.</p>';
  }

  function renderServ(){
    var list=data.servicos.filter(visibleService).slice().sort(function(a,b){var pa=text(a.PROFISSIONAL_ID),pb=text(b.PROFISSIONAL_ID);if(pa!==pb)return pa.localeCompare(pb);return num(a.ORDEM,999)-num(b.ORDEM,999)});
    q('servList').innerHTML=list.length?list.map(function(s){
      var id=text(s.ID),prof=findProf(s.PROFISSIONAL_ID),nomeProf=prof?(prof.TITULO_PUBLICO||prof.NOME||prof.ID):s.PROFISSIONAL_ID;
      return '<details class="card" data-kind="serv" data-id="'+esc(id)+'"><summary><strong>'+esc(s.NOME||id)+'</strong><div style="color:#adc4d2;font-size:.78rem;margin-top:3px">'+esc(nomeProf)+' • Ordem: '+esc(s.ORDEM)+'</div></summary><div class="body">'+
        '<label>ID<input name="id" value="'+esc(id)+'" readonly></label>'+
        '<label>Profissional<select name="profissionalId">'+serviceOptions(s.PROFISSIONAL_ID)+'</select></label>'+
        '<label>Nome do serviço<input name="nome" value="'+esc(s.NOME)+'"></label>'+
        '<label>Descrição automática<textarea name="descricaoAutomatica">'+esc(s.DESCRICAO_AUTOMATICA)+'</textarea></label>'+
        '<label>Ordem<input name="ordem" type="number" min="1" max="999" value="'+esc(s.ORDEM)+'"></label>'+
        '<div class="checks">'+
          '<label class="check"><input name="ativo" type="checkbox" '+(bool(s.ATIVO)?'checked':'')+'> Serviço ativo</label>'+
          '<label class="check"><input name="permiteVagaComum" type="checkbox" '+(bool(s.PERMITE_VAGA_COMUM)?'checked':'')+'> Permite vaga comum</label>'+
          '<label class="check"><input name="permiteEmergencia" type="checkbox" '+(bool(s.PERMITE_EMERGENCIA)?'checked':'')+'> Permite emergência</label>'+
        '</div>'+
        '<div class="actions"><button class="save save-serv" type="button">Salvar serviço</button></div>'+
      '</div></details>';
    }).join(''):'<p style="color:#adc4d2">Nenhum serviço encontrado.</p>';
  }

  function render(){
    var visServ=data.servicos.filter(visibleService);
    q('qProf').textContent=data.profissionais.length;
    q('qServ').textContent=visServ.length;
    q('qProfAtivos').textContent=data.profissionais.filter(function(x){return bool(x.ATIVO)}).length;
    q('qServAtivos').textContent=visServ.filter(function(x){return bool(x.ATIVO)}).length;
    renderProf();renderServ();
    var order=host.querySelector('[data-role="newForm"] [name="ordem"]');if(order&&!order.value)order.value=nextOrder();
    disableWrites();syncUndo();
  }

  function waitBridge(attempt){
    var api=bridge();
    if(api){
      bridgeReady=true;
      api.reload(function(result){
        if(result&&result.snapshot)useSnapshot(result.snapshot,result.ok?'Profissionais e serviços confirmados pelo servidor.':'A leitura ainda não foi confirmada.');
        else setStatus('Não foi possível confirmar profissionais e serviços. A sessão da Central foi preservada.','warn');
      });
      return;
    }
    if(attempt>80){setStatus('A ponte técnica de Profissionais não ficou pronta. Volte à Central e tente novamente.','err');return}
    setTimeout(function(){waitBridge(attempt+1)},100);
  }

  function ensureBridge(){
    if(booting||bridgeReady)return;
    booting=true;
    var frame=q('bridge'),mode=core.mode&&core.mode(),access=mode==='tacs'?'&acesso=tacs':'';
    frame.onload=function(){booting=false;waitBridge(0)};
    frame.src='/atendimento-acs-farmaceutico/teste-v1/painel-profissionais-servicos-v1.html?area='+encodeURIComponent(areaId)+access+'&from=central&bridge=1&v=20260912-task18-profissionais-native-v1';
  }

  function field(card,name){var n=card.querySelector('[name="'+name+'"]');return n?n.value:''}
  function checked(card,name){var n=card.querySelector('[name="'+name+'"]');return Boolean(n&&n.checked)}

  function saveProf(card){
    var api=bridge();if(!api||!confirmed){setStatus('Aguarde a confirmação do servidor antes de editar.','warn');return}
    var before=findProf(field(card,'id'));if(!before)return;
    var payload={id:field(card,'id'),nome:field(card,'nome'),tituloPublico:field(card,'tituloPublico'),icone:field(card,'icone'),ordem:field(card,'ordem'),ativo:checked(card,'ativo')};
    if(!window.confirm('Gravar esta alteração na planilha real?'))return;
    writeUndo('profissional',before);setStatus('Salvando profissional e conferindo a releitura…','warn');
    api.saveProfessional(payload,function(r){
      if(r&&r.snapshot)useSnapshot(r.snapshot);
      if(r&&r.ok){setDirty(false);setStatus(r.message||'Profissional gravado e confirmado pela releitura.','ok')}
      else{setDirty(true);setStatus(text(r&&r.message)||'A gravação não foi confirmada integralmente.','err')}
    });
  }

  function saveServ(card){
    var api=bridge();if(!api||!confirmed){setStatus('Aguarde a confirmação do servidor antes de editar.','warn');return}
    var before=findServ(field(card,'id'));if(!before)return;
    var payload={id:field(card,'id'),profissionalId:field(card,'profissionalId'),nome:field(card,'nome'),descricaoAutomatica:field(card,'descricaoAutomatica'),ordem:field(card,'ordem'),ativo:checked(card,'ativo'),permiteVagaComum:checked(card,'permiteVagaComum'),permiteEmergencia:checked(card,'permiteEmergencia')};
    if(!window.confirm('Gravar esta alteração na planilha real?'))return;
    writeUndo('servico',before);setStatus('Salvando serviço e conferindo a releitura…','warn');
    api.saveService(payload,function(r){
      if(r&&r.snapshot)useSnapshot(r.snapshot);
      if(r&&r.ok){setDirty(false);setStatus(r.message||'Serviço gravado e confirmado pela releitura.','ok')}
      else{setDirty(true);setStatus(text(r&&r.message)||'A gravação não foi confirmada integralmente.','err')}
    });
  }

  function createProf(form){
    var api=bridge();if(!api||!confirmed){setStatus('Aguarde a confirmação do servidor antes de criar profissional.','warn');return}
    var fd=new FormData(form),payload={
      nome:text(fd.get('nome')),tituloPublico:text(fd.get('tituloPublico')),icone:text(fd.get('icone'))||'👤',
      ordem:text(fd.get('ordem')),servicoNome:text(fd.get('servicoNome')),descricaoAutomatica:text(fd.get('descricaoAutomatica')),
      ativo:form.elements.ativo.checked,permiteVagaComum:form.elements.permiteVagaComum.checked,permiteEmergencia:form.elements.permiteEmergencia.checked
    };
    if(!payload.nome||!payload.tituloPublico||!payload.servicoNome||!payload.descricaoAutomatica||!idAuto(payload.nome||payload.tituloPublico)){setStatus('Preencha nome, título público, serviço e descrição automática.','err');return}
    if(!window.confirm('Criar ou reconhecer este profissional, conferir o serviço e garantir os cinco dias úteis da agenda?'))return;
    setStatus('Criando cadastro integrado e conferindo a releitura…','warn');
    api.createProfessional(payload,function(r){
      if(r&&r.snapshot)useSnapshot(r.snapshot);
      if(r&&r.ok){setDirty(false);form.reset();form.elements.icone.value='👤';form.elements.ordem.value=nextOrder();showTab('prof');setStatus(r.message||'Cadastro integrado confirmado.','ok')}
      else setStatus(text(r&&r.message)||'O cadastro integrado não foi confirmado.','err');
    });
  }

  function restore(){
    var api=bridge(),u=readUndo();if(!api||!u||!confirmed)return;
    if(!window.confirm('Restaurar exatamente os valores anteriores da última alteração?'))return;
    setStatus('Restaurando e conferindo a releitura…','warn');
    if(u.tipo==='profissional'){
      api.saveProfessional({id:u.registro.ID,nome:u.registro.NOME,tituloPublico:u.registro.TITULO_PUBLICO,icone:u.registro.ICONE,ordem:u.registro.ORDEM,ativo:bool(u.registro.ATIVO)},done);
    }else{
      api.saveService({id:u.registro.ID,profissionalId:u.registro.PROFISSIONAL_ID,nome:u.registro.NOME,descricaoAutomatica:u.registro.DESCRICAO_AUTOMATICA,ordem:u.registro.ORDEM,ativo:bool(u.registro.ATIVO),permiteVagaComum:bool(u.registro.PERMITE_VAGA_COMUM),permiteEmergencia:bool(u.registro.PERMITE_EMERGENCIA)},done);
    }
    function done(r){
      if(r&&r.snapshot)useSnapshot(r.snapshot);
      if(r&&r.ok){clearUndo();setDirty(false);setStatus('Valores anteriores restaurados e confirmados pela releitura.','ok')}
      else setStatus(text(r&&r.message)||'A restauração não foi confirmada.','err');
    }
  }

  function showTab(name){
    host.querySelectorAll('[data-area]').forEach(function(n){n.classList.toggle('hidden',n.getAttribute('data-area')!==name)});
  }

  host.addEventListener('click',function(e){
    var tab=e.target.closest('[data-tab]');if(tab){showTab(tab.getAttribute('data-tab'));return}
    var p=e.target.closest('.save-prof');if(p){saveProf(p.closest('.card'));return}
    var s=e.target.closest('.save-serv');if(s){saveServ(s.closest('.card'));return}
  });
  host.addEventListener('input',function(e){
    if(e.target&&e.target.closest&&e.target.closest('.card,[data-role="newForm"]')&&!e.target.readOnly)setDirty(true);
  });
  host.addEventListener('change',function(e){
    if(e.target&&e.target.closest&&e.target.closest('.card,[data-role="newForm"]')&&!e.target.readOnly)setDirty(true);
  });
  q('newForm').addEventListener('submit',function(e){e.preventDefault();createProf(this)});
  q('undo').addEventListener('click',restore);

  ensureBridge();

  return{
    scope:scope,
    mount:function(){visible=true;host.hidden=false;if(!bridgeReady)ensureBridge();else{var api=bridge();if(api)api.reload(function(r){if(r&&r.snapshot)useSnapshot(r.snapshot,'Profissionais e serviços atualizados.')})}},
    hide:function(){visible=false;host.hidden=true},
    hasUnsaved:function(){return dirty},
    reset:function(){visible=false;dirty=false;host.dataset.tacsDirty='0';var f=q('bridge');if(f)f.src='about:blank';host.innerHTML='';host.hidden=true}
  };
}

function mount(host,options){
  if(!host)throw new Error('Host nativo de Profissionais não encontrado.');
  var core=window.ConectaModuleCoreV1,area=text(options&&options.areaId||core&&core.areaId&&core.areaId());
  var scope=(core&&core.mode&&core.mode()||'')+'|'+area;
  if(instance&&instance.scope!==scope){instance.reset();instance=null}
  if(!instance)instance=create(host,options||{});
  instance.mount();return instance;
}
function hide(){if(instance)instance.hide()}
function reset(){if(instance){instance.reset();instance=null}}
function hasUnsaved(){return Boolean(instance&&instance.hasUnsaved())}

window.ConectaProfissionaisNativeV1={mount:mount,hide:hide,reset:reset,hasUnsaved:hasUnsaved,marker:'TAREFA_18_PROFISSIONAIS_NATIVOS_V1'};
}());
