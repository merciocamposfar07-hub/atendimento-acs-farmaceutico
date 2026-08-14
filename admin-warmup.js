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
  function esc(v){return texto(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
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
    var seletor=document.getElementById('areaEnvio');
    var area=(texto(seletor&&seletor.value)||new URLSearchParams(location.search).get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
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

  function instalarEstiloEntrega(){
    if(document.getElementById('rastreamentoEntregaNotificacaoEstilo'))return;
    var s=document.createElement('style');s.id='rastreamentoEntregaNotificacaoEstilo';
    s.textContent='.notificacao-entrega{margin-top:14px;padding-top:14px;border-top:1px solid #cbd9df}.notificacao-entrega-resultado{margin-top:10px;padding:12px;border:2px solid #bad0da;border-radius:15px;background:#f5fafc;color:#16384a}.notificacao-entrega-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.notificacao-entrega-num{padding:10px;border:1px solid #c6d8df;border-radius:12px;background:#fff}.notificacao-entrega-num strong{display:block;font-size:1.35rem;color:#073a55}.notificacao-entrega-num span{font-size:.78rem;font-weight:850;color:#526d7b}.notificacao-entrega-lista{margin:8px 0 0;padding-left:20px}.notificacao-entrega-nota{font-size:.82rem;line-height:1.4;color:#526d7b;margin-top:9px}body.tema-petroleo .notificacao-entrega-resultado,body.tema-petroleo .notificacao-entrega-num{background:#073a55;border-color:#0b5878;color:#fff}body.tema-petroleo .notificacao-entrega-num strong{color:#9de8ff}body.tema-petroleo .notificacao-entrega-num span,body.tema-petroleo .notificacao-entrega-nota{color:#d8edf5}@media(max-width:520px){.notificacao-entrega-grid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(s);
  }
  function adicionarEntrega(item,tipo){
    if(!item||item.querySelector('.notificacao-entrega'))return;
    var id=texto(item.dataset&&item.dataset.id),corpo=item.querySelector('.corpo');if(!id||!corpo)return;
    var wrap=document.createElement('div');wrap.className='notificacao-entrega';
    var b=document.createElement('button');b.type='button';b.className='botao cinza notificacao-entrega-botao';b.dataset.id=id;b.dataset.tipo=tipo;b.textContent='📊 Ver entrega desta notificação';
    var r=document.createElement('div');r.className='notificacao-entrega-resultado';r.hidden=true;
    wrap.appendChild(b);wrap.appendChild(r);corpo.appendChild(wrap);
  }
  function aplicarEntrega(){
    var rec=document.getElementById('listaRecados'),cam=document.getElementById('listaCampanhas');
    if(rec)rec.querySelectorAll('.item[data-id]').forEach(function(i){adicionarEntrega(i,'recado')});
    if(cam)cam.querySelectorAll('.item[data-id]').forEach(function(i){adicionarEntrega(i,'campanha')});
  }
  function numero(v){return v===null||typeof v==='undefined'||v===''?'—':String(v)}
  function renderEntrega(resultado,r){
    r.hidden=false;
    if(!resultado||resultado.ok!==true){r.innerHTML='<strong>Não foi possível consultar.</strong><div class="notificacao-entrega-nota">'+esc(resultado&&resultado.message||'Resultado indisponível.')+'</div>';return}
    if(resultado.encontrada!==true){r.innerHTML='<strong>Nenhum envio Push encontrado.</strong><div class="notificacao-entrega-nota">'+esc(resultado.message||'Esta publicação ainda não possui notificação auditada.')+'</div>';return}
    var m=resultado.metricas||{},a=resultado.aberturas||{},envio=resultado.envio||{},lista=Array.isArray(a.aparelhos)?a.aparelhos:[];
    var html='<strong>Resultado desta notificação</strong><div class="notificacao-entrega-grid">'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(m.aceitos))+'</strong><span>Aceitos pelo serviço Push</span></div>'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(m.confirmados))+'</strong><span>Confirmações no aparelho*</span></div>'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(m.falhas))+'</strong><span>Falhas de entrega</span></div>'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(m.canceladas))+'</strong><span>Inscrições inativas/canceladas</span></div>'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(m.cliques))+'</strong><span>Cliques no aviso</span></div>'+
      '<div class="notificacao-entrega-num"><strong>'+esc(numero(a.total||0))+'</strong><span>Abriram no Portal TACS</span></div></div>';
    html+='<div class="notificacao-entrega-nota">Envio …'+esc(texto(envio.onesignalId).slice(-8))+(envio.registradoEm?' • '+esc(envio.registradoEm):'')+'</div>';
    if(lista.length){html+='<div class="notificacao-entrega-nota"><strong>Aberturas identificadas:</strong></div><ul class="notificacao-entrega-lista">'+lista.map(function(x){var nome=texto(x.nome)||('Aparelho …'+texto(x.referenciaTecnica));return'<li>'+esc(nome)+(x.abertoEm?' — '+esc(x.abertoEm):'')+'</li>'}).join('')+'</ul>'}else{html+='<div class="notificacao-entrega-nota">Nenhuma abertura individual registrada ainda.</div>'}
    html+='<div class="notificacao-entrega-nota">* “Aceito” significa aceito pelo serviço Push. “Confirmação no aparelho” só aparece quando o OneSignal e a plataforma oferecem esse retorno; Safari não oferece Confirmed Receipt. “Abriu no Portal” registra o clique capturado pelo Portal TACS e pode ser associado ao nome quando o aparelho já está identificado.</div>';
    r.innerHTML=html;
  }
  function consultarEntrega(botao){
    if(!botao||botao.disabled)return;
    var api=window.PortalTacsRecadosCampanhasV12,id=texto(botao.dataset.id),tipo=texto(botao.dataset.tipo),wrap=botao.closest('.notificacao-entrega'),r=wrap&&wrap.querySelector('.notificacao-entrega-resultado');
    if(!api||typeof api.post!=='function'||!id||!r)return;
    var original=botao.textContent;botao.disabled=true;botao.textContent='Consultando OneSignal…';r.hidden=false;r.textContent='Consultando o resultado real desta notificação…';
    var payload=sessao();payload.id=id;payload.tipo=tipo;
    api.post('admin_notificacao_resultado',payload,function(res){botao.disabled=false;botao.textContent=original;renderEntrega(res,r)},'admin_result');
  }

  function instalar(){
    tentativas++;
    var lista=document.getElementById('saudeNotificacoesLista');
    if(!lista||!window.PortalTacsRecadosCampanhasV12){if(tentativas<160)return;clearInterval(timer);return}
    if(!instalado){
      instalado=true;instalarEstiloEntrega();
      lista.addEventListener('click',function(e){var b=e.target.closest('.saude-reparo-individual button');if(b)solicitar(b)});
      document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('.notificacao-entrega-botao'):null;if(b)consultarEntrega(b)});
      if(typeof MutationObserver==='function'){
        new MutationObserver(aplicar).observe(lista,{childList:true,subtree:true});
        var rec=document.getElementById('listaRecados'),cam=document.getElementById('listaCampanhas');
        if(rec)new MutationObserver(aplicarEntrega).observe(rec,{childList:true,subtree:true});
        if(cam)new MutationObserver(aplicarEntrega).observe(cam,{childList:true,subtree:true});
      }
    }
    aplicar();aplicarEntrega();clearInterval(timer);
  }
  timer=setInterval(instalar,300);instalar();
}());
