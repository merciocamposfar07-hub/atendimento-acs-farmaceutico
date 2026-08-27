(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsAparelhoTesteAdminV1)return;window.PortalTacsAparelhoTesteAdminV1=true;
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var APP_ID='e2294b98-c72b-4f8c-a055-de28979676dc',SAFARI_ID='web.onesignal.auto.4bead971-106d-461b-853f-83aecbd62d40';
  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';
  var BOX_ID='aparelhoTacsTesteV1Box',STYLE_ID='aparelhoTacsTesteV1Style',operando=false,ultimoEstado=null,oneSignalRef=null,oneSignalTentado=false;
  function txt(v){return String(v==null?'':v).trim()}
  function areaAtual(){var s=document.getElementById('areaEnvio'),a=txt(s&&s.value)||new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA';return String(a).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function novoDevice(){var bytes=new Uint8Array(16),out='';if(window.crypto&&window.crypto.getRandomValues){window.crypto.getRandomValues(bytes);for(var i=0;i<bytes.length;i++)out+=('0'+bytes[i].toString(16)).slice(-2)}else out=Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);return'iphone-'+out}
  function device(){var d='';try{d=txt(localStorage.getItem(DEVICE_KEY)||'');if(!d){d=novoDevice();localStorage.setItem(DEVICE_KEY,d)}}catch(e){}return d}
  function tokenStorageKey(){return TECH_TOKEN_PREFIX+areaAtual()+':'+device()}
  function chaveTecnica(){try{return txt(localStorage.getItem(tokenStorageKey())||'')}catch(e){return''}}
  function salvarChave(v){try{if(v)localStorage.setItem(tokenStorageKey(),v);else localStorage.removeItem(tokenStorageKey())}catch(e){}}
  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(txt(v).toLowerCase())}
  function subscriptionId(){try{var p=oneSignalRef&&oneSignalRef.User&&oneSignalRef.User.PushSubscription,s=txt(p&&p.id).toLowerCase();return subValido(s)?s:''}catch(e){return''}}
  function sessao(){var s={dispositivo:device(),areaId:areaAtual()},t=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',a=sessionStorage.getItem(TOKEN_KEY)||'';if(t)s.territorioToken=t;else if(a)s.token=a;var c=chaveTecnica(),sub=subscriptionId();if(c)s.chaveTacsTeste=c;if(sub)s.subscriptionId=sub;return s}
  function temSessao(){var s=sessao();return Boolean(s.territorioToken||s.token)}
  function requestId(){return'ap_tacs_device_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)}
  function estilo(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+BOX_ID+'{margin:12px 0;padding:15px;border:2px solid #69c7e7;border-radius:17px;background:#eaf7fc;color:#073a55}#'+BOX_ID+' strong{display:block;font-size:1.08rem}#'+BOX_ID+' .apt-status{margin:7px 0 10px;font-weight:850;line-height:1.45}#'+BOX_ID+' .apt-help{margin:9px 0 0;color:#526d7b;font-size:.9rem;font-weight:750;line-height:1.45}#'+BOX_ID+' button{width:100%;min-height:54px;border:0;border-radius:15px;padding:12px 15px;background:#073a55;color:#fff;font-weight:950}#'+BOX_ID+' button[data-active="1"]{background:#607985}#'+BOX_ID+' button[data-apt-clean="1"]{margin-top:9px;background:#805300}#'+BOX_ID+' button:disabled{opacity:.5;cursor:not-allowed}body.tema-petroleo #'+BOX_ID+'{background:#073a55;border-color:#69c7e7;color:#fff}body.tema-petroleo #'+BOX_ID+' .apt-help{color:#d8edf5}';document.head.appendChild(s)}
  function box(){var b=document.getElementById(BOX_ID);if(b)return b;var sec=document.getElementById('saudeNotificacoes');if(!sec)return null;estilo();b=document.createElement('div');b.id=BOX_ID;b.innerHTML='<strong>🛠 Este aparelho</strong><div class="apt-status" aria-live="polite">Identificando este aparelho…</div><button type="button" data-apt-toggle="1" disabled>Preparando…</button><button type="button" data-apt-open="1" hidden style="margin-top:9px;background:#08704f">Abrir Portal TACS em modo teste</button><button type="button" data-apt-clean="1" hidden>🧹 Sanear vínculos antigos deste aparelho</button><p class="apt-help">O modo TACS / teste libera a busca técnica pelo número do cadastro familiar nesta área. O saneamento histórico remove apenas vínculos comprovados deste aparelho de teste; cadastros de moradores e inscrições Push não são apagados.</p>';var a=sec.querySelector('.saude-acoes');if(a&&a.parentNode)a.insertAdjacentElement('afterend',b);else sec.appendChild(b);b.querySelector('[data-apt-toggle]').addEventListener('click',alternar);b.querySelector('[data-apt-open]').addEventListener('click',abrirPortalTeste);b.querySelector('[data-apt-clean]').addEventListener('click',sanearHistorico);return b}
  function render(estado,erro){var b=box();if(!b)return;var st=b.querySelector('.apt-status'),bt=b.querySelector('[data-apt-toggle]'),abrir=b.querySelector('[data-apt-open]'),limpar=b.querySelector('[data-apt-clean]');if(erro){st.textContent=erro;bt.disabled=false;bt.dataset.active='0';bt.textContent='Tentar novamente';if(abrir)abrir.disabled=false;if(limpar)limpar.disabled=false;return}if(!temSessao()){st.textContent='Entre no painel para configurar este aparelho.';bt.disabled=true;bt.textContent='Entre no painel';if(abrir)abrir.hidden=true;if(limpar)limpar.hidden=true;return}if(!estado){st.textContent='Consultando a autorização técnica deste aparelho…';bt.disabled=true;bt.textContent='Aguarde…';if(limpar)limpar.hidden=true;return}var ativo=estado.aparelhoTacsTeste===true,autorizado=estado.autorizadoNesteAparelho===true;st.textContent=txt(estado.message)||(ativo?'Modo TACS / teste ativo.':'Modo TACS / teste desativado.');bt.disabled=operando;bt.dataset.active=ativo&&autorizado?'1':'0';bt.textContent=ativo&&autorizado?'Voltar este aparelho ao modo morador':(ativo?'🔐 Renovar autorização deste aparelho':'🛠 Ativar modo TACS / teste');if(abrir){abrir.hidden=!ativo;abrir.disabled=operando}if(limpar){limpar.hidden=!(ativo&&autorizado);limpar.disabled=operando}}
  function jsonpResultado(id,inicio){return new Promise(function(resolve,reject){function consultar(){var cb='__aptDevice_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null)},5000);function clean(){clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove()}function finish(data){if(done)return;done=true;clean();if(data&&data.ok===true&&data.pendente===false&&data.result){resolve(data.result);return}if(Date.now()-inicio>25000){reject(new Error('A atualização deste aparelho demorou demais. Tente novamente.'));return}setTimeout(consultar,850)}window[cb]=finish;s.onerror=function(){finish(null)};s.src=API+'?action=admin_notificacoes_saude_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)}consultar()})}
  function enviar(action,modo){if(!temSessao())return Promise.reject(new Error('Entre no painel antes de configurar este aparelho.'));var id=requestId(),body=new URLSearchParams(),s=sessao();body.set('action',action);body.set('requestId',id);if(modo)body.set('modo',modo);Object.keys(s).forEach(function(k){body.set(k,s[k])});return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return jsonpResultado(id,Date.now())})}
  function executar(modo){return enviar('admin_notificacoes_aparelho_tacs_teste',modo)}
  function consultar(){if(operando)return;box();render(null);if(!temSessao()){render(null);return}executar('CONSULTAR').then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível consultar este aparelho.');if(r.chaveTecnica){salvarChave(r.chaveTecnica);r.autorizadoNesteAparelho=true}ultimoEstado=r;render(r)}).catch(function(e){render(ultimoEstado,e.message)})}
  function abrirPortalTeste(){
    if(operando)return;operando=true;render(ultimoEstado);
    var b=box(),st=b&&b.querySelector('.apt-status');if(st)st.textContent='Preparando abertura segura do Portal TACS…';
    executar('TRANSFERIR').then(function(r){
      if(!r||r.ok!==true||!r.codigoTransferencia)throw new Error(txt(r&&r.message)||'Não foi possível criar a autorização temporária.');
      var destino='/atendimento-acs-farmaceutico/?area='+encodeURIComponent(areaAtual())+'#tacsTeste='+encodeURIComponent(r.codigoTransferencia);
      window.location.href=destino;
    }).catch(function(e){operando=false;render(ultimoEstado,e.message||'Não foi possível abrir o Portal em modo TACS / teste.')});
  }
  function sanearHistorico(){
    if(operando)return;
    if(!ultimoEstado||ultimoEstado.aparelhoTacsTeste!==true||ultimoEstado.autorizadoNesteAparelho!==true){consultar();return}
    if(!subscriptionId()){render(ultimoEstado,'A inscrição Push atual deste aparelho ainda não está disponível. Aguarde a identificação das notificações e tente novamente.');return}
    if(!window.confirm('Auditar e remover somente vínculos históricos tecnicamente comprovados deste aparelho TACS / teste? Nenhum cadastro de morador ou inscrição Push será apagado.'))return;
    operando=true;render(ultimoEstado);var b=box(),st=b&&b.querySelector('.apt-status');if(st)st.textContent='Conferindo o histórico técnico deste aparelho…';
    enviar('admin_notificacoes_aparelho_tacs_sanear_historico','').then(function(r){
      if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível sanear o histórico deste aparelho.');
      operando=false;ultimoEstado=ultimoEstado||{};render(ultimoEstado);if(st)st.textContent=txt(r.message)||'Saneamento histórico concluído.';
    }).catch(function(e){operando=false;render(ultimoEstado,e.message||'Não foi possível sanear o histórico deste aparelho.')});
  }
  function alternar(){if(operando)return;if(!ultimoEstado){consultar();return}var ativo=ultimoEstado.aparelhoTacsTeste===true&&ultimoEstado.autorizadoNesteAparelho===true,modo=ativo?'DESATIVAR':'ATIVAR',pergunta=ativo?'Voltar este aparelho ao modo morador?':'Ativar o modo TACS / teste neste aparelho? A autorização ficará vinculada a este navegador e a esta área.';if(!window.confirm(pergunta))return;operando=true;render(ultimoEstado);var b=box(),st=b&&b.querySelector('.apt-status');if(st)st.textContent=ativo?'Desativando o modo TACS / teste…':'Ativando e autorizando este aparelho…';executar(modo).then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível atualizar este aparelho.');if(modo==='ATIVAR'){if(!r.chaveTecnica)throw new Error('O servidor não devolveu a autorização técnica deste aparelho.');salvarChave(r.chaveTecnica);r.autorizadoNesteAparelho=true}else salvarChave('');ultimoEstado=r;operando=false;render(r);var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){atualizar.click()},250)}).catch(function(e){operando=false;render(ultimoEstado,e.message)})}
  function iniciarOneSignalOpcional(){
    if(oneSignalTentado)return;oneSignalTentado=true;
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async function(OneSignal){
      oneSignalRef=OneSignal;
      try{
        if(!window.__portalTacsAparelhoTesteOneSignalMigracaoV6){
          window.__portalTacsAparelhoTesteOneSignalMigracaoV6=true;
          await OneSignal.init({appId:APP_ID,safari_web_id:SAFARI_ID,serviceWorkerPath:'/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/atendimento-acs-farmaceutico/push/'},autoResubscribe:true,notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false});
        }
      }catch(e){}
      setTimeout(consultar,120);
      try{var push=OneSignal.User&&OneSignal.User.PushSubscription;if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){setTimeout(consultar,120)})}catch(e){}
    });
    if(!document.querySelector('script[data-onesignal-sdk-migracao-tacs]')){
      var sdk=document.createElement('script');sdk.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';sdk.defer=true;sdk.dataset.onesignalSdkMigracaoTacs='1';document.head.appendChild(sdk);
    }
  }
  function instalar(){box();consultar();iniciarOneSignalOpcional();var a=document.getElementById('areaEnvio');if(a)a.addEventListener('change',function(){ultimoEstado=null;setTimeout(consultar,150)});var sec=document.getElementById('saudeNotificacoes');if(sec&&typeof MutationObserver!=='undefined')new MutationObserver(function(){if(!sec.classList.contains('oculto'))setTimeout(consultar,100)}).observe(sec,{attributes:true,attributeFilter:['class']})}
  window.PortalTacsAparelhoTesteV3={deviceId:device,chave:chaveTecnica,consultar:consultar,sanearHistorico:sanearHistorico};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
}());