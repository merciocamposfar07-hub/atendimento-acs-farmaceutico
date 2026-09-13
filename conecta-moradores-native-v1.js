(function(){
'use strict';

/* TAREFA_17_MORADORES_NATIVOS_V1
   Moradores é o segundo painel da migração definitiva.
   A lógica validada de busca/cadastro/edição/consolidação continua no transporte existente,
   mas a superfície viva passa a ser o host nativo da Central. */
var instance=null;

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}

function template(areaId){
  return '<section class="csc-mor-native" data-role="root">'+
    '<p id="areaHeading" class="native-note">Cadastro individual de cidadãos • '+areaId+'.</p>'+
    '<div class="csc-mor-native-note">PAINEL DE MORADORES: as permissões e a consolidação de duplicidades são controladas pelo servidor após o login.</div>'+
    '<section class="panel">'+
      '<div id="loginStatus" class="status">Conferindo sessão e base de moradores…</div>'+
      '<div id="areaControl" class="area-control hidden"><label for="areaSelect">Área de moradores</label><select id="areaSelect" class="field"></select></div>'+
      '<div id="summary" class="summary hidden">'+
        '<div class="number"><strong id="countResidents">—</strong><span>Moradores ativos</span></div>'+
        '<div class="number"><strong id="schema">—</strong><span>Schema</span></div>'+
        '<div class="number"><strong id="write">—</strong><span>Novo/Editar</span></div>'+
        '<div class="number"><strong id="consolidation">—</strong><span>Consolidação</span></div>'+
        '<div class="number"><strong id="situation">—</strong><span>Situação cadastral</span></div>'+
      '</div>'+
      '<button id="logout" type="button" hidden disabled aria-hidden="true"></button>'+
    '</section>'+
    '<section id="content" class="panel hidden">'+
      '<div class="tabs"><button id="tabSearch" class="tab active" type="button">Buscar / editar</button><button id="tabNew" class="tab" type="button">Novo morador</button></div>'+
      '<div id="operationStatus" class="status">Nenhuma alteração realizada.</div>'+
      '<div id="searchArea">'+
        '<h2>Buscar morador</h2><p class="muted">Busque por nome, CPF, CNS, ID Portal, endereço ou telefone.</p>'+
        '<label for="query">Busca</label><input id="query" class="field" placeholder="Ex.: Maria Adriana">'+
        '<div class="actions"><button id="search" class="btn" type="button">Buscar na base real</button></div>'+
        '<div id="results" class="list"></div>'+
      '</div>'+
      '<div id="formArea" class="hidden">'+
        '<h2 id="formTitle">Novo morador</h2>'+
        '<p class="muted">Uma pessoa por cadastro. CPF/CNS podem ficar vazios quando ainda não existirem, como em recém-nascido.</p>'+
        '<form id="residentForm" autocomplete="off">'+
          '<input id="residentId" type="hidden"><input id="originSheet" type="hidden"><input id="originRow" type="hidden">'+
          '<div class="grid">'+
            '<div class="wide"><label for="name">Nome completo</label><input id="name" class="field" maxlength="160" required></div>'+
            '<div><label for="birth">Data de nascimento</label><input id="birth" class="field" type="text" placeholder="DD/MM/AAAA" inputmode="numeric" autocomplete="bday" maxlength="10" aria-describedby="birthHint birthAge" required><small id="birthHint" class="muted">Digite somente os números; as barras serão colocadas automaticamente.</small><div id="birthAge" class="age-readout" aria-live="polite">Idade: —</div></div>'+
            '<div><label for="sex">Sexo</label><select id="sex" class="field" required><option value="">Selecione</option><option>Masculino</option><option>Feminino</option><option>Outro</option></select></div>'+
            '<div><label for="cpf">CPF</label><input id="cpf" class="field" inputmode="numeric" maxlength="14"></div>'+
            '<div><label for="cns">CNS</label><input id="cns" class="field" inputmode="numeric" maxlength="18"></div>'+
            '<div class="wide"><label for="address">Endereço</label><input id="address" class="field" maxlength="260"></div>'+
            '<div><label for="cell">Celular</label><input id="cell" class="field" inputmode="tel"></div>'+
            '<div><label for="contact">Telefone de contato</label><input id="contact" class="field" inputmode="tel"></div>'+
            '<div><label for="microarea">Microárea</label><input id="microarea" class="field" value="1"></div>'+
            '<div><label for="team">Equipe</label><input id="team" class="field" value="USF MATIAS CDS"></div>'+
            '<div class="wide"><label for="notes">Observações</label><textarea id="notes" class="field" maxlength="1000"></textarea></div>'+
          '</div>'+
          '<div class="lock">Aguardando confirmação das permissões do servidor.</div>'+
          '<div class="actions"><button id="save" class="btn green" type="submit" disabled>Salvar morador</button></div>'+
        '</form>'+
      '</div>'+
    '</section>'+
  '</section>';
}

function loadTransport(done){
  if(window.PortalTacsMoradoresTransportV2){done(true);return}
  var id='cscMoradoresTransportTask17',existing=document.getElementById(id);
  if(existing){
    existing.addEventListener('load',function(){done(Boolean(window.PortalTacsMoradoresTransportV2))},{once:true});
    existing.addEventListener('error',function(){done(false)},{once:true});
    return;
  }
  var s=document.createElement('script');s.id=id;s.async=false;
  s.src='/atendimento-acs-farmaceutico/teste-v1/painel-moradores-transport-v2.js?v=20260912-task17-moradores-native-v1';
  s.onload=function(){done(Boolean(window.PortalTacsMoradoresTransportV2))};
  s.onerror=function(){done(false)};
  document.head.appendChild(s);
}

function create(host,options){
  var core=window.ConectaModuleCoreV1;
  if(!core||typeof core.session!=='function')throw new Error('Núcleo Conecta indisponível para Moradores.');
  var areaId=normArea(options&&options.areaId||core.areaId&&core.areaId())||'JAPARANDUBA';
  var scope=(core.mode&&core.mode()||'')+'|'+areaId;
  var dirty=false,visible=false,loaded=false;

  host.innerHTML=template(areaId);
  host.dataset.tacsDirty='0';

  function setDirty(v){dirty=Boolean(v);host.dataset.tacsDirty=dirty?'1':'0'}
  function notify(type){
    if(type==='write-confirmed')setDirty(false);
  }
  function config(){
    return{
      native:true,
      hostId:host.id||'nativeModuleHost',
      areaId:areaId,
      view:'',
      onState:notify
    };
  }
  function bindDirty(){
    host.addEventListener('input',function(e){
      var form=e.target&&e.target.closest?e.target.closest('#residentForm'):null;
      if(form&&e.target.type!=='hidden'&&!e.target.readOnly)setDirty(true);
    });
    host.addEventListener('change',function(e){
      var form=e.target&&e.target.closest?e.target.closest('#residentForm'):null;
      if(form&&e.target.type!=='hidden'&&!e.target.readOnly)setDirty(true);
    });
  }
  function boot(){
    window.ConectaMoradoresNativeConfigV1=config();
    loadTransport(function(ok){
      if(!ok){
        var status=host.querySelector('#loginStatus');
        if(status){status.textContent='Não foi possível carregar o módulo nativo de Moradores. Volte à Central e tente novamente.';status.className='status err'}
        return;
      }
      loaded=true;
      if(window.PortalTacsMoradoresTransportV2&&typeof window.PortalTacsMoradoresTransportV2.rebindNativeContext==='function'){
        window.PortalTacsMoradoresTransportV2.rebindNativeContext(config());
      }
    });
  }

  bindDirty();
  boot();

  return{
    scope:scope,
    mount:function(next){
      visible=true;host.hidden=false;
      if(next&&next.areaId&&normArea(next.areaId)!==areaId)return false;
      window.ConectaMoradoresNativeConfigV1=config();
      if(loaded&&window.PortalTacsMoradoresTransportV2&&typeof window.PortalTacsMoradoresTransportV2.rebindNativeContext==='function'){
        window.PortalTacsMoradoresTransportV2.rebindNativeContext(config());
      }
      return true;
    },
    hide:function(){visible=false;host.hidden=true},
    hasUnsaved:function(){return dirty},
    reset:function(){visible=false;dirty=false;host.dataset.tacsDirty='0';host.innerHTML='';host.hidden=true},
    isVisible:function(){return visible}
  };
}

function mount(host,options){
  if(!host)throw new Error('Host nativo de Moradores não encontrado.');
  var core=window.ConectaModuleCoreV1;
  var area=normArea(options&&options.areaId||core&&core.areaId&&core.areaId());
  var scope=(core&&core.mode&&core.mode()||'')+'|'+area;
  if(instance&&instance.scope!==scope){instance.reset();instance=null}
  if(!instance)instance=create(host,options||{});
  instance.mount(options||{});
  return instance;
}
function hide(){if(instance)instance.hide()}
function reset(){if(instance){instance.reset();instance=null}}
function hasUnsaved(){return Boolean(instance&&instance.hasUnsaved())}

window.ConectaMoradoresNativeV1={
  mount:mount,hide:hide,reset:reset,hasUnsaved:hasUnsaved,
  marker:'TAREFA_17_MORADORES_NATIVOS_V1'
};
}());
