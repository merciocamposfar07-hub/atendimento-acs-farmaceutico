(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsAparelhoTesteAdminV1)return;
  window.PortalTacsAparelhoTesteAdminV1=true;

  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var APP_ID='e2294b98-c72b-4f8c-a055-de28979676dc';
  var SAFARI_ID='web.onesignal.auto.4bead971-106d-461b-853f-83aecbd62d40';
  var TOKEN_KEY='portalTacsAdminTokenV1';
  var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
  var DEVICE_KEY='portalTacsDispositivoV1';
  var BOX_ID='aparelhoTacsTesteV1Box';
  var STYLE_ID='aparelhoTacsTesteV1Style';
  var OneSignalRef=null,operando=false,ultimoEstado=null;

  function txt(v){return String(v==null?'':v).trim()}
  function areaAtual(){
    var select=document.getElementById('areaEnvio');
    var area=txt(select&&select.value)||new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA';
    return String(area).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
  }
  function sessao(){
    var s={dispositivo:localStorage.getItem(DEVICE_KEY)||'',areaId:areaAtual()};
    var territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
    var token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(territorio)s.territorioToken=territorio;else if(token)s.token=token;
    return s;
  }
  function temSessao(){var s=sessao();return Boolean(s.territorioToken||s.token)}
  function estadoPush(){
    try{
      var push=OneSignalRef&&OneSignalRef.User&&OneSignalRef.User.PushSubscription;
      return {id:txt(push&&push.id).toLowerCase(),optedIn:Boolean(push&&push.optedIn===true),permission:Boolean(OneSignalRef&&OneSignalRef.Notifications&&OneSignalRef.Notifications.permission===true)};
    }catch(e){return{id:'',optedIn:false,permission:false}}
  }
  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(txt(v).toLowerCase())}
  function requestId(){return 'ap_tacs_teste_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)}

  function estilo(){
    if(document.getElementById(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='#'+BOX_ID+'{margin:12px 0;padding:15px;border:2px solid #69c7e7;border-radius:17px;background:#eaf7fc;color:#073a55}#'+BOX_ID+' strong{display:block;font-size:1.08rem}#'+BOX_ID+' .apt-status{margin:7px 0 10px;font-weight:850;line-height:1.45}#'+BOX_ID+' .apt-help{margin:9px 0 0;color:#526d7b;font-size:.9rem;font-weight:750;line-height:1.45}#'+BOX_ID+' button{width:100%;min-height:54px;border:0;border-radius:15px;padding:12px 15px;background:#073a55;color:#fff;font-weight:950}#'+BOX_ID+' button[data-active="1"]{background:#607985}#'+BOX_ID+' button:disabled{opacity:.5;cursor:not-allowed}body.tema-petroleo #'+BOX_ID+'{background:#073a55;border-color:#69c7e7;color:#fff}body.tema-petroleo #'+BOX_ID+' .apt-help{color:#d8edf5}';
    document.head.appendChild(s);
  }
  function garantirBox(){
    var box=document.getElementById(BOX_ID);if(box)return box;
    var sec=document.getElementById('saudeNotificacoes');if(!sec)return null;
    estilo();box=document.createElement('div');box.id=BOX_ID;
    box.innerHTML='<strong>🛠 Este aparelho</strong><div class="apt-status" aria-live="polite">Identificando esta instalação…</div><button type="button" disabled>Preparando…</button><p class="apt-help">O modo TACS / teste mantém Recados e Campanhas ativos, mas impede vínculo com famílias e mensagens individuais/familiares.</p>';
    var acoes=sec.querySelector('.saude-acoes');
    if(acoes&&acoes.parentNode)acoes.insertAdjacentElement('afterend',box);else sec.appendChild(box);
    box.querySelector('button').addEventListener('click',alternar);
    return box;
  }
  function render(estado,msgErro){
    var box=garantirBox();if(!box)return;
    var st=box.querySelector('.apt-status'),b=box.querySelector('button'),push=estadoPush();
    if(msgErro){st.textContent=msgErro;b.disabled=true;b.textContent='Modo TACS / teste indisponível';b.dataset.active='0';return}
    if(!temSessao()){st.textContent='Entre no painel para configurar este aparelho.';b.disabled=true;b.textContent='Entre no painel';b.dataset.active='0';return}
    if(!subValido(push.id)||!push.optedIn||!push.permission){
      st.textContent='Este navegador ainda não está com uma inscrição Push ativa e identificável.';
      b.disabled=true;b.textContent='Ative os avisos no Portal TACS primeiro';b.dataset.active='0';return;
    }
    if(!estado){st.textContent='Consultando o modo deste aparelho…';b.disabled=true;b.textContent='Aguarde…';b.dataset.active='0';return}
    var ativo=estado.aparelhoTacsTeste===true;
    st.textContent=txt(estado.message)||(ativo?'Aparelho em modo TACS / teste.':'Aparelho em modo normal.');
    b.disabled=operando||(!ativo&&estado.disponivel===false);
    b.dataset.active=ativo?'1':'0';
    b.textContent=ativo?'Voltar este aparelho ao modo morador':'🛠 Marcar este aparelho como TACS / teste';
  }

  function jsonpResultado(id,inicio){
    return new Promise(function(resolve,reject){
      function consultar(){
        var cb='__aptTeste_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'),fim=false;
        var timer=setTimeout(function(){encerrar(null)},5500);
        function limpar(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}if(script.parentNode)script.remove()}
        function encerrar(data){if(fim)return;fim=true;limpar();if(data&&data.ok===true&&data.pendente===false&&data.result){resolve(data.result);return}if(Date.now()-inicio>25000){reject(new Error('A atualização deste aparelho demorou demais. Tente novamente.'));return}setTimeout(consultar,900)}
        window[cb]=encerrar;script.onerror=function(){encerrar(null)};
        script.src=API+'?action=admin_notificacoes_saude_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
        document.head.appendChild(script);
      }
      consultar();
    });
  }
  function executar(modo){
    var push=estadoPush();
    if(!temSessao())return Promise.reject(new Error('Entre no painel antes de configurar este aparelho.'));
    if(!subValido(push.id)||!push.optedIn||!push.permission)return Promise.reject(new Error('Ative os avisos no Portal TACS neste aparelho antes de usar o modo teste.'));
    var id=requestId(),body=new URLSearchParams(),s=sessao();
    body.set('action','admin_notificacoes_aparelho_tacs_teste');body.set('requestId',id);body.set('modo',modo);body.set('subscriptionId',push.id);
    Object.keys(s).forEach(function(k){body.set(k,s[k])});
    return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'})
      .catch(function(){})
      .then(function(){return jsonpResultado(id,Date.now())});
  }
  function consultarEstado(){
    if(operando)return;
    garantirBox();render(null);
    var push=estadoPush();if(!temSessao()||!subValido(push.id)||!push.optedIn||!push.permission){render(null);return}
    executar('CONSULTAR').then(function(r){ultimoEstado=r;render(r)}).catch(function(e){render(null,e.message)});
  }
  function alternar(){
    if(operando)return;
    var ativo=Boolean(ultimoEstado&&ultimoEstado.aparelhoTacsTeste===true);
    var pergunta=ativo
      ?'Voltar este aparelho ao modo morador? O vínculo familiar antigo não será restaurado automaticamente. Ele só voltará a se vincular quando for identificado normalmente no Portal.'
      :'Marcar este aparelho como TACS / teste? Ele continuará recebendo Recados e Campanhas desta área, mas não receberá mensagens individuais/familiares e não ficará vinculado às famílias pesquisadas.';
    if(!window.confirm(pergunta))return;
    operando=true;render(ultimoEstado);
    var box=garantirBox(),st=box&&box.querySelector('.apt-status');if(st)st.textContent=ativo?'Retirando o modo TACS / teste…':'Ativando o modo TACS / teste…';
    executar(ativo?'DESATIVAR':'ATIVAR').then(function(r){
      if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível atualizar este aparelho.');
      ultimoEstado=r;operando=false;render(r);
      var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){atualizar.click()},250);
    }).catch(function(e){operando=false;render(ultimoEstado,e.message||'Não foi possível atualizar este aparelho.');});
  }

  function iniciarOneSignal(){
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async function(OneSignal){
      try{
        OneSignalRef=OneSignal;
        if(!window.__portalTacsAparelhoTesteOneSignalInitV1){
          window.__portalTacsAparelhoTesteOneSignalInitV1=true;
          await OneSignal.init({
            appId:APP_ID,safari_web_id:SAFARI_ID,
            serviceWorkerPath:'/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js',
            serviceWorkerParam:{scope:'/atendimento-acs-farmaceutico/push/'},
            autoResubscribe:true,notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false
          });
        }
        consultarEstado();
        var push=OneSignal.User&&OneSignal.User.PushSubscription;
        if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){setTimeout(consultarEstado,100)});
      }catch(e){render(null,'Não foi possível identificar a inscrição Push deste aparelho no painel. Abra o Portal TACS neste aparelho e confirme que os avisos estão ativos.');}
    });
    if(!document.querySelector('script[data-onesignal-sdk]')){
      var script=document.createElement('script');script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.defer=true;script.dataset.onesignalSdk='1';document.head.appendChild(script);
    }
  }

  function instalar(){
    garantirBox();iniciarOneSignal();
    var area=document.getElementById('areaEnvio');if(area)area.addEventListener('change',function(){ultimoEstado=null;setTimeout(consultarEstado,200)});
    var sec=document.getElementById('saudeNotificacoes');if(sec&&typeof MutationObserver!=='undefined'){
      new MutationObserver(function(){if(!sec.classList.contains('oculto'))setTimeout(consultarEstado,120)}).observe(sec,{attributes:true,attributeFilter:['class']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
}());
