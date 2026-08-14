(function(){
  'use strict';

  if(typeof document==='undefined'||typeof document.createElement!=='function'||!document.head)return;


  var existente=window.PortalTacsAdminWarmup;
  if(existente&&typeof existente.iniciar==='function'){
    existente.iniciar();
    return;
  }

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var CACHE_KEY='portalTacsAdminStatusV5';
  var WARM_KEY='portalTacsAppsScriptWarmAtV1';
  var CACHE_MS=5*60*1000;
  var WARM_MS=3*60*1000;
  var TIMEOUT_MS=6000;
  var emCurso=null;
  var ultimaConclusao=lerInstanteAquecido();
  var cacheInicial=lerCache();
  var estado={
    api:API,
    situacao:cacheInicial?'pronta':'aguardando',
    resultado:cacheInicial,
    ready:null,
    iniciar:iniciar
  };

  window.PortalTacsAdminWarmup=estado;

  function lerJson(chave){
    try{return JSON.parse(localStorage.getItem(chave)||'null')}catch(e){return null}
  }

  function lerInstanteAquecido(){
    try{return Number(localStorage.getItem(WARM_KEY)||0)}catch(e){return 0}
  }

  function lerCache(){
    var item=lerJson(CACHE_KEY);
    if(!item||!item.resultado||item.resultado.ok!==true)return null;
    if(Date.now()-Number(item.salvoEm||0)>CACHE_MS)return null;
    return item.resultado;
  }

  function servidorAquecido(){
    return Date.now()-lerInstanteAquecido()<WARM_MS;
  }

  function salvar(resultado){
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({salvoEm:Date.now(),resultado:resultado}));
      localStorage.setItem(WARM_KEY,String(Date.now()));
    }catch(e){}
  }

  function avisar(){
    try{window.dispatchEvent(new CustomEvent('portal-tacs-admin-warmup',{detail:estado.resultado}))}catch(e){}
  }

  function consultar(concluir){
    var nome='__portalTacsAdminStatus_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var script=document.createElement('script');
    var encerrado=false;
    var timer;

    function limpar(){
      clearTimeout(timer);
      if(script.parentNode)script.parentNode.removeChild(script);
      try{delete window[nome]}catch(e){window[nome]=undefined}
    }

    function finalizar(resposta){
      if(encerrado)return;
      encerrado=true;
      limpar();
      concluir(resposta&&resposta.ok===true?{ok:true,resposta:resposta,tentativas:1}:{ok:false,tentativas:1});
    }

    window[nome]=finalizar;
    script.async=true;
    script.src=API+(API.indexOf('?')<0?'?':'&')+'action=admin_status&callback='+encodeURIComponent(nome)+'&_='+Date.now();
    script.onerror=function(){finalizar(null)};
    document.head.appendChild(script);
    timer=setTimeout(function(){finalizar(null)},TIMEOUT_MS);
  }

  function iniciar(forcar){
    if(emCurso)return emCurso;
    var cache=lerCache();
    if(!forcar&&servidorAquecido()){
      var recente=cache||{ok:true,aquecido:true,origem:'atividade-recente'};
      estado.resultado=recente;
      estado.situacao='pronta';
      estado.ready=Promise.resolve(recente);
      return estado.ready;
    }

    estado.situacao='preparando';
    emCurso=new Promise(function(resolve){
      consultar(function(resultado){
        var preservado=resultado.ok?resultado:(lerCache()||resultado);
        estado.resultado=preservado;
        estado.situacao=resultado.ok?'pronta':(preservado.ok?'pronta-com-cache':'nao-confirmada');
        ultimaConclusao=Date.now();
        if(resultado.ok)salvar(resultado);
        emCurso=null;
        avisar();
        resolve(preservado);
      });
    });

    if(!forcar&&cache){
      estado.resultado=cache;
      estado.ready=Promise.resolve(cache);
      return estado.ready;
    }
    estado.ready=emCurso;
    return emCurso;
  }

  function reaquecerAoVoltar(){
    if(document.visibilityState==='visible'&&Date.now()-ultimaConclusao>=5*60*1000){
      iniciar(true);
    }
  }

  window.addEventListener('online',function(){ iniciar(true); });
  document.addEventListener('visibilitychange',reaquecerAoVoltar);
  window.addEventListener('pageshow',reaquecerAoVoltar);
  estado.ready=iniciar();
}());

(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;

  var instalado=false,tentativas=0,timer=null;
  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1';

  function texto(v){return String(v==null?'':v).trim()}
  function estadoCartao(cartao){
    var s=cartao&&cartao.querySelector('.saude-status');
    if(!s)return'';
    if(s.classList.contains('ATIVO'))return'ATIVO';
    if(s.classList.contains('INATIVO'))return'INATIVO';
    if(s.classList.contains('REPARO'))return'REPARO';
    if(s.classList.contains('SEM_CONFIRMACAO'))return'SEM_CONFIRMACAO';
    return texto(s.textContent).toUpperCase();
  }
  function referenciaCartao(cartao){
    var m=texto(cartao&&cartao.textContent).match(/Referência técnica:\s*…([0-9a-f]{8})/i);
    return m?m[1].toLowerCase():'';
  }
  function nomeCartao(cartao){var h=cartao&&cartao.querySelector('h3');return texto(h&&h.textContent)||'este aparelho'}
  function sessao(){
    var area=(new URLSearchParams(location.search).get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
    var s={dispositivo:localStorage.getItem(DEVICE_KEY)||'',areaId:area};
    var territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
    var token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(territorio)s.territorioToken=territorio;else if(token)s.token=token;
    return s;
  }
  function status(msg,tipo){
    var e=document.getElementById('saudeNotificacoesStatus');if(!e)return;
    e.textContent=msg;e.className='status'+(tipo?' '+tipo:'');
  }
  function botaoPara(cartao){
    if(!cartao||cartao.querySelector('.saude-reparo-individual'))return;
    var estado=estadoCartao(cartao),ref=referenciaCartao(cartao);
    if(!ref||estado==='ATIVO')return;
    var wrap=document.createElement('div');wrap.className='acoes saude-reparo-individual';
    var b=document.createElement('button');b.type='button';b.className='botao';b.dataset.ref=ref;b.dataset.nome=nomeCartao(cartao);
    if(estado==='REPARO'){
      b.classList.add('cinza');b.disabled=true;b.textContent='✓ Reparo já solicitado para este aparelho';
    }else{
      b.classList.add('verde');b.textContent='🔧 Solicitar reparo deste aparelho';
    }
    wrap.appendChild(b);cartao.appendChild(wrap);
  }
  function aplicar(){document.querySelectorAll('#saudeNotificacoesLista .saude-aparelho').forEach(botaoPara)}
  function solicitar(botao){
    if(!botao||botao.disabled)return;
    var ref=texto(botao.dataset.ref).toLowerCase(),nome=texto(botao.dataset.nome)||'este aparelho';
    if(!/^[0-9a-f]{8}$/.test(ref)){status('Referência técnica inválida. Atualize a situação e tente novamente.','erro');return}
    var api=window.PortalTacsRecadosCampanhasV12;
    if(!api||typeof api.post!=='function'){status('O painel ainda está preparando a conexão. Tente novamente em alguns segundos.','aviso');return}
    if(!window.confirm('Solicitar reparo somente para '+nome+'? Os demais aparelhos não serão alterados.'))return;
    botao.disabled=true;botao.textContent='Solicitando reparo…';status('Solicitando reparo somente para '+nome+'…','aviso');
    var payload=sessao();payload.subscriptionRef=ref;
    api.post('admin_notificacoes_solicitar_reparo_aparelho',payload,function(r){
      if(!r||r.ok!==true){botao.disabled=false;botao.textContent='🔧 Solicitar reparo deste aparelho';status(texto(r&&r.message||'Não foi possível solicitar o reparo deste aparelho.'),'erro');return}
      status(texto(r.message||'Reparo solicitado somente para este aparelho.'),'ok');
      var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){atualizar.click()},250);
    },'admin_notificacoes_saude_result');
  }
  function instalar(){
    tentativas++;
    var lista=document.getElementById('saudeNotificacoesLista');
    if(!lista||!window.PortalTacsRecadosCampanhasV12){if(tentativas<160)return;clearInterval(timer);return}
    if(!instalado){
      instalado=true;
      lista.addEventListener('click',function(e){var b=e.target.closest('.saude-reparo-individual button');if(b)solicitar(b)});
      if(typeof MutationObserver==='function')new MutationObserver(aplicar).observe(lista,{childList:true,subtree:true});
    }
    aplicar();clearInterval(timer);
  }
  timer=setInterval(instalar,300);instalar();
}());
