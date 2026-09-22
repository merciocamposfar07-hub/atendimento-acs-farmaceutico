(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var oneSignal=null,pendingMissing='',pendingType='',pendingOwnerLookup='',currentResident=null,complementing=false,memberPointer=null,lastMemberActivation={token:'',at:0},residentIdentityToken='',residentEnrollmentCpf='',residentBirthConfirm='',residentNameConfirm='',residentRecoveryToken='',residentServerCpfHint='',residentAccessBusy=false,activeFamilyId='',familySnapshot=null,memberResolvedCache={},memberResolvePromises={},wantedMemberToken='',internalMemberSwitch=false,memberCacheWarmGeneration=0;
  var FAMILY_BOX='portalFamilyLookupV1',DOC_BOX='portalDocumentComplementV1',PIN_BOX='portalResidentPinV1',STYLE_ID='portalFamilyLookupStyleV1',DEVICE_KEY='portalTacsDispositivoV1',PROFILE_KEY='portalConectaMoradorQuickV1',TOKEN_KEY='portalConectaMoradorTokenV1',TEST_PROFILE_KEY='portalConectaMoradorQuickTesteV1',TEST_TOKEN_KEY='portalConectaMoradorTokenTesteV1',BOOTSTRAP_KEY='portalConectaMoradorBootstrapV2',TEST_BOOTSTRAP_KEY='portalConectaMoradorBootstrapTesteV2',AREA_KEY='portalTacsCentralAreaV1',LAST_ROLE_KEY='portalConectaLastRoleV1',ADMIN_TRUST_KEY='portalConectaRecoveryTrustV1:admin',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:',FAMILY_STORAGE_PREFIX='portalTacsFamiliaAutofillV1:',LEGACY_FAMILY_STORAGE_PREFIX='portalTacsFamiliaConfirmadaV1:';
  var familyQueryPromises={};
  /* BUSCA_FAMILIAR_TOQUE_RESILIENTE_2026_09_16_V1 */
  var familySearchPointer=null,lastFamilySearch={family:'',at:0};
  function text(v){return String(v==null?'':v).trim()}
  function digits(v){return text(v).replace(/\D/g,'').slice(0,15)}
  function normalizeFamily(v){var s=text(v).toUpperCase().replace(/\s+/g,''),m=s.match(/^(\d{1,4})([A-Z])?$/);if(!m)return'';var n=m[1];if(n.length<=3)n=('000'+n).slice(-3);return n+(m[2]||'')}
  function familyCandidate(v){var s=digits(v);return /^\d{2,4}$/.test(s)?normalizeFamily(s):''}
  function areaId(){var a='';try{var p=new URLSearchParams(location.search||'');a=p.get('areaId')||p.get('area')||p.get('territorio')||''}catch(e){}if(!a)try{a=window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function'?window.PortalTacsArea.id():window.TACS_AREA_ID}catch(e){}return text(a||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function rememberedFamily(){try{var atual=text(localStorage.getItem(FAMILY_STORAGE_PREFIX+areaId())||''),legado=text(localStorage.getItem(LEGACY_FAMILY_STORAGE_PREFIX+areaId())||'');return normalizeFamily(atual||legado)}catch(e){return''}}
  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}
  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription,s=text(p&&p.id).toLowerCase();return subValido(s)?s:''}catch(e){return''}}
  function aguardarSubscription(limitMs){return new Promise(function(resolve){var inicio=Date.now();function verificar(){var sub=subscriptionId();if(sub){resolve(sub);return}if(Date.now()-inicio>=Number(limitMs||1600)){resolve('');return}setTimeout(verificar,160)}verificar()})}
  function novoDeviceId(){var bytes=new Uint8Array(16),out='';if(window.crypto&&window.crypto.getRandomValues){window.crypto.getRandomValues(bytes);for(var i=0;i<bytes.length;i++)out+=('0'+bytes[i].toString(16)).slice(-2)}else out=Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);return'iphone-'+out}
  function deviceId(criar){try{var d=text(localStorage.getItem(DEVICE_KEY)||'');if(!d&&criar){d=novoDeviceId();localStorage.setItem(DEVICE_KEY,d)}return d}catch(e){return''}}
  function tokenKey(){var d=deviceId(false);return d?TECH_TOKEN_PREFIX+areaId()+':'+d:''}
  function technicalToken(){try{var k=tokenKey();return k?text(localStorage.getItem(k)||''):''}catch(e){return''}}
  function tacsTeste(){try{var p=new URLSearchParams(location.search||'');return p.get('modoTeste')==='1'&&Boolean(deviceId(false)&&technicalToken())}catch(e){return false}}
  function residentProfileKey(){return tacsTeste()?TEST_PROFILE_KEY:PROFILE_KEY}
  function residentTokenKey(){return tacsTeste()?TEST_TOKEN_KEY:TOKEN_KEY}
  function residentBootstrapKey(){return tacsTeste()?TEST_BOOTSTRAP_KEY:BOOTSTRAP_KEY}
  function formatDoc(v){var d=digits(v);if(d.length===11)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);if(d.length===15)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,10)+'.'+d.slice(10);return d}
  function formatCpfInput(v){var d=String(v==null?'':v).replace(/\D/g,'').slice(0,11);return d.length>9?d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9):d.length>6?d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6):d.length>3?d.slice(0,3)+'.'+d.slice(3):d}
  function formatBirthInput(v){var d=String(v==null?'':v).replace(/\D/g,'').slice(0,8);return d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d}
  function normalizeBirthStored(v){var s=text(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);if(m)return normalizeBirthInput(m[3]+m[2]+m[1]);return normalizeBirthInput(s)}
  function docType(v){var d=digits(v);if(/^\d{11}$/.test(d))return 'CPF';if(/^\d{15}$/.test(d))return 'CNS';return ''}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
  function ensureStyle(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+FAMILY_BOX+',#'+DOC_BOX+',#'+PIN_BOX+'{grid-column:1/-1;margin-top:10px;padding:15px;border:2px solid #62c8e8;border-radius:16px;background:#123f59;color:#f7fcff}#'+FAMILY_BOX+'[hidden],#'+DOC_BOX+'[hidden],#'+PIN_BOX+'[hidden]{display:none!important}.tacs-family-action,.tacs-family-member,.tacs-doc-action{width:100%;min-height:54px;border:2px solid #49bfe6;border-radius:14px;background:#074b68;color:#fff;padding:11px 14px;font-weight:900;font-size:16px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(73,191,230,.22)}.tacs-family-member{position:relative;margin-top:9px;text-align:left;background:#12384d;color:#fff;border-color:#4f7f96;touch-action:manipulation;-webkit-tap-highlight-color:rgba(73,191,230,.22);user-select:none;-webkit-user-select:none;transition:transform .08s ease,box-shadow .08s ease}.tacs-family-action.tacs-family-pressed,.tacs-family-member.tacs-family-pressed,.tacs-family-member:active{transform:scale(.985);box-shadow:0 0 0 3px rgba(73,191,230,.28)}.tacs-family-member[aria-busy="true"]{opacity:.72;cursor:wait}.tacs-family-member[data-loading="1"]{opacity:1!important;overflow:hidden}.tacs-family-member[data-loading="1"]::after{content:"Aguarde, buscando morador…";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:10px;background:#0a2d3e;color:#fff;border-radius:12px;font-size:16px;font-weight:950;line-height:1.25;text-align:center;z-index:3}.tacs-family-member span{display:block;margin-top:5px;color:#dcecf4;font-size:15px;font-weight:800;line-height:1.35}.tacs-family-title{display:block;margin-bottom:8px;font-size:18px;font-weight:950}.tacs-family-help{margin:7px 0 0;font-weight:750}.tacs-family-title{color:#fff}.tacs-family-help{color:#e3f0f5;font-size:16px;line-height:1.42}.tacs-doc-action{font-size:17px}.tacs-family-confirm{display:grid;gap:9px;margin-top:10px}.tacs-family-confirm input{min-height:54px;width:100%;border:2px solid #8aa7b5;border-radius:14px;padding:11px 13px}.tacs-family-ok{border-color:#62c8e8!important;background:#123f59!important;color:#f7fcff!important}.tacs-family-ok .tacs-family-title,.tacs-family-ok .tacs-family-help{color:#f7fcff!important}.tacs-family-warn{border-color:#e6bd62!important;background:#513b12!important;color:#fff4cf!important}.tacs-family-warn .tacs-family-title{color:#fff!important}.tacs-family-warn .tacs-family-help{color:#fff0c2!important}.tacs-pin-cpf-required{border:3px solid #ff7b83!important;background:#7a1f28!important;color:#fff!important}.tacs-pin-cpf-required .tacs-family-title{color:#fff!important;font-size:21px!important;line-height:1.28!important}.tacs-pin-cpf-required .tacs-family-help{color:#ffe8ea!important;font-size:16px!important;line-height:1.42!important;font-weight:800!important}.tacs-pin-cpf-required input{width:100%;min-height:58px;margin-top:8px;border:2px solid #ff9ca2;border-radius:14px;padding:12px 14px;font-size:18px;background:#4f2026;color:#fff}.tacs-pin-cpf-required input::placeholder{color:#ffd4d7;opacity:1}.tacs-pin-cpf-required .tacs-pin-action{background:#17754f!important;color:#fff!important}.tacs-pin-box{border:2px solid #62c8e8!important;background:#123f59!important;color:#f7fcff!important}.tacs-pin-box .tacs-family-title{color:#fff!important;font-size:20px!important;line-height:1.3!important}.tacs-pin-box .tacs-family-help{color:#e3f0f5!important;font-size:16px!important;line-height:1.42!important;font-weight:750!important}.tacs-pin-box input{width:100%;min-height:58px;margin-top:8px;border:2px solid #62c8e8;border-radius:14px;padding:12px 14px;font-size:18px;background:#0c4d6b;color:#fff}.tacs-pin-box input::placeholder{color:#c9dce6;opacity:1}.tacs-pin-actions{display:grid;gap:8px;margin-top:12px}.tacs-pin-action{width:100%;min-height:56px;border:0;border-radius:14px;background:#17754f;color:#fff;font-weight:900;font-size:17px;touch-action:manipulation}.tacs-pin-action:disabled{opacity:.6}';document.head.appendChild(s)}
  function makeBox(id){var b=document.getElementById(id);if(b)return b;var status=document.getElementById('cpfStatus'),label=status&&status.closest?status.closest('label'):null;if(!label||!label.parentNode)return null;b=document.createElement('div');b.id=id;b.hidden=true;b.setAttribute('role','status');label.parentNode.insertBefore(b,label.nextSibling);return b}
  function box(){return makeBox(FAMILY_BOX)}
  function docBox(){return makeBox(DOC_BOX)}
  function pinBox(){var b=document.getElementById(PIN_BOX);if(b)return b;var family=box();if(!family||!family.parentNode)return null;b=document.createElement('div');b.id=PIN_BOX;b.hidden=true;b.setAttribute('role','status');family.parentNode.insertBefore(b,family);return b}
  function primaryDocumentLabel(){var input=document.getElementById('cpf');return input&&input.closest?input.closest('label'):null}
  function placePinFirst(){var b=pinBox(),label=primaryDocumentLabel();if(b&&label&&label.parentNode&&b!==label.previousSibling)label.parentNode.insertBefore(b,label);if(label)label.hidden=true}
  function placePinDefault(){var b=pinBox(),family=box();if(b&&family&&family.parentNode&&b.nextSibling!==family)family.parentNode.insertBefore(b,family);var label=primaryDocumentLabel();if(label)label.hidden=false}
  function residentVaultExists(){if(tacsTeste())return false;try{var v=window.ConectaPinLocalV2;return Boolean(v&&typeof v.existe==='function'&&v.existe('morador'))}catch(e){return false}}
  function recoveryCpfHtml(){if(tacsTeste())return '';var value=residentServerCpfHint?formatCpfInput(residentServerCpfHint):'';return '<div class="tacs-family-help" style="margin-top:16px"><strong>Esqueceu ou precisa criar um novo PIN?</strong><br>Use seu CPF somente para recuperar o acesso.</div><input id="portalResidentRecoveryCpf" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="CPF para recuperar o PIN" value="'+escapeHtml(value)+'"><div class="tacs-pin-actions"><button type="button" class="tacs-family-action" data-resident-pin-recovery="1">Recuperar / criar novo PIN com CPF</button></div>'}

  function readResidentProfileKey(key,prefix){try{var p=JSON.parse(localStorage.getItem(key)||'null'),q=text(p&&p.quickKey);return p&&prefix.test(q)?p:null}catch(e){return null}}
  function residentProfile(){
    try{
      if(tacsTeste()){
        var teste=readResidentProfileKey(TEST_PROFILE_KEY,/^cmtq1\./);
        if(teste)return teste;
        /* PIN_TESTE_MIGRACAO_PERFIL_20260918:
           recupera PIN fictício criado quando o estado técnico ainda estava terminando
           de ser reconhecido e o quickKey cmtq1 foi salvo acidentalmente na chave real. */
        var deslocado=readResidentProfileKey(PROFILE_KEY,/^cmtq1\./);
        if(deslocado){
          localStorage.setItem(TEST_PROFILE_KEY,JSON.stringify(deslocado));
          try{localStorage.removeItem(PROFILE_KEY)}catch(ignore){}
          return deslocado;
        }
        return null;
      }
      return readResidentProfileKey(PROFILE_KEY,/^cmq1\./);
    }catch(e){return null}
  }
  function residentSessionToken(){try{return text(sessionStorage.getItem(residentTokenKey())||'')}catch(e){return''}}
  function administrativeDeviceLocal(){try{var v=window.ConectaPinLocalV2,localAdmin=Boolean(v&&typeof v.existe==='function'&&v.existe('admin')),trusted=Boolean(text(localStorage.getItem(ADMIN_TRUST_KEY)||''));return localAdmin||trusted}catch(e){return false}}
  function saveResidentAccess(r){
    try{
      r=r||{};
      var quick=text(r.quickKey),tok=text(r.token),profileKey=residentProfileKey(),tokenStoreKey=residentTokenKey(),bootstrapStoreKey=residentBootstrapKey();
      if(/^cmtq1\./.test(quick))profileKey=TEST_PROFILE_KEY;
      else if(/^cmq1\./.test(quick))profileKey=PROFILE_KEY;
      if(/^cmts1\./.test(tok)){tokenStoreKey=TEST_TOKEN_KEY;bootstrapStoreKey=TEST_BOOTSTRAP_KEY}
      else if(/^cms1\./.test(tok)){tokenStoreKey=TOKEN_KEY;bootstrapStoreKey=BOOTSTRAP_KEY}
      var cpf=text(r.cpf||residentEnrollmentCpf||residentProfile()&&residentProfile().cpf||'');
      if(quick)localStorage.setItem(profileKey,JSON.stringify({
        quickKey:quick,areaId:r.areaId||areaId(),areaNome:r.areaNome||'',nome:r.nome||'',
        cpf:cpf,nascimento:normalizeBirthStored(r.nascimento||''),localidade:text(r.endereco||r.localidade||''),familiaId:normalizeFamily(r.familiaId||activeFamilyId||'')
      }));
      else{
        var atual=residentProfile();
        if(atual&&cpf){atual.cpf=cpf;if(r.nascimento)atual.nascimento=normalizeBirthStored(r.nascimento);if(r.familiaId)atual.familiaId=normalizeFamily(r.familiaId);localStorage.setItem(profileKey,JSON.stringify(atual))}
      }
      if(tok)sessionStorage.setItem(tokenStoreKey,tok);
      sessionStorage.setItem(bootstrapStoreKey,JSON.stringify({
        perfil:'MORADOR',areaId:r.areaId||areaId(),areaNome:r.areaNome||'',cpf:cpf,nome:r.nome||residentProfile()&&residentProfile().nome||'',
        nascimento:normalizeBirthStored(r.nascimento||''),endereco:r.endereco||r.localidade||'',notificacoesAtivas:Boolean(r.notificacoesAtivas),
        silencioso:Boolean(r.silencioso),familiaId:normalizeFamily(r.familiaId||activeFamilyId||''),familia:Array.isArray(r.familia)?r.familia:[]
      }));
      if(r.areaId)localStorage.setItem(AREA_KEY,r.areaId);
      localStorage.setItem(LAST_ROLE_KEY,'MORADOR');
    }catch(e){}
  }
  function setPinBox(html,cls){var b=pinBox();if(!b)return;b.className=cls||'tacs-pin-box';b.innerHTML=html;b.hidden=false}
  function hidePin(){var b=pinBox();if(b){b.hidden=true;b.innerHTML='';b.className=''}placePinDefault()}
  function setBox(html,cls){var b=box();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}
  function setDocBox(html,cls){var b=docBox();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}
  function hide(){var b=box();if(b){b.hidden=true;b.innerHTML='';b.className=''}}
  function hideDoc(){var b=docBox();if(b){b.hidden=true;b.innerHTML='';b.className=''}}
  function jsonp(params){return new Promise(function(resolve,reject){var cb='__tacsFam_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null,new Error('A consulta demorou demais. Tente novamente.'))},12000);function finish(data,err){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();err?reject(err):resolve(data)}window[cb]=function(d){finish(d,null)};s.onerror=function(){finish(null,new Error('Não foi possível consultar agora.'))};params.callback=cb;params._=Date.now();s.src=API+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');document.head.appendChild(s)})}
  function jsonpRetry(params,maxAttempts){var limit=Math.max(1,Math.min(2,Number(maxAttempts||2)));function run(attempt){var copy={};Object.keys(params||{}).forEach(function(k){copy[k]=params[k]});return jsonp(copy).catch(function(err){if(attempt>=limit)throw err;return new Promise(function(resolve){setTimeout(resolve,300)}).then(function(){return run(attempt+1)})})}return run(1)}
  /* RESTAURA_FALLBACK_GET_FAMILIA_2026_09_16_V1
     Fallback exclusivo da consulta familiar. Não altera seleção, PIN, autofill,
     backend, documentos nem demais consultas do Portal. */
  function fetchFamiliaJson(params){
    if(!window.fetch)return Promise.reject(new Error('Consulta alternativa indisponível.'));
    var p={};
    Object.keys(params||{}).forEach(function(k){if(k!=='callback')p[k]=params[k]});
    p._=Date.now();
    var url=API+'?'+Object.keys(p).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(p[k])}).join('&');
    return fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'follow'}).then(function(r){
      if(!r.ok)throw new Error('Consulta alternativa indisponível.');
      return r.json();
    });
  }
  function residentRequestId(action){return 'portal_morador_'+action+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
  function residentPost(action,payload){if(residentAccessBusy)return Promise.reject(new Error('Aguarde a operação em andamento.'));residentAccessBusy=true;var id=residentRequestId(action),body=new URLSearchParams(),started=Date.now();body.set('action',action);body.set('requestId',id);Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});if(/^conecta_morador_/.test(action)){body.set('fluxoMoradorExplicito','SIM');if(tacsTeste()){body.set('modoTacsTeste','SIM');body.set('areaId',body.get('areaId')||areaId());body.set('dispositivo',body.get('dispositivo')||deviceId(true));body.set('chaveTacsTeste',technicalToken())}}return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function poll(){return jsonp({action:'conecta_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw new Error(r.result.message||'Não foi possível concluir o acesso.')}if(Date.now()-started>30000)throw new Error('A operação demorou demais. Tente novamente.');return new Promise(function(resolve){setTimeout(resolve,500)}).then(poll)}).catch(function(err){if(Date.now()-started>30000)throw err;return new Promise(function(resolve){setTimeout(resolve,650)}).then(poll)})}).finally(function(){residentAccessBusy=false})}
  function handoffCode(){try{var h=String(location.hash||'').replace(/^#/,'');var q=new URLSearchParams(h);return text(q.get('tacsTeste')||'')}catch(e){return''}}
  function limparHandoff(){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){try{location.hash=''}catch(_){}}}
  function salvarTokenTecnico(v){try{var d=deviceId(true),k=TECH_TOKEN_PREFIX+areaId()+':'+d;if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}}
  function requestIdHandoff(){return 'tacs_handoff_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
  function aguardarResgate(id,inicio){return jsonp({action:'admin_notificacoes_saude_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw new Error(r.result.message||'Não foi possível autorizar este Portal.')}if(Date.now()-inicio>25000)throw new Error('A autorização do modo TACS demorou demais. Abra novamente pelo painel.');return new Promise(function(resolve){setTimeout(resolve,700)}).then(function(){return aguardarResgate(id,inicio)})})}
  function resgatarModoTacsTeste(){var codigo=handoffCode();if(!codigo)return Promise.resolve(false);var id=requestIdHandoff(),d=deviceId(true),body=new URLSearchParams();setBox('<strong class="tacs-family-title">Ativando modo TACS / teste neste Portal…</strong><p class="tacs-family-help">Aguarde a confirmação técnica.</p>','');body.set('action','publico_aparelho_tacs_resgatar');body.set('requestId',id);body.set('areaId',areaId());body.set('dispositivo',d);body.set('codigo',codigo);return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return aguardarResgate(id,Date.now())}).then(function(r){if(!r.chaveTecnica)throw new Error('O servidor não devolveu a autorização técnica.');salvarTokenTecnico(r.chaveTecnica);try{var u=new URL(location.href);u.searchParams.set('modoTeste','1');u.hash='';history.replaceState(null,'',u.pathname+u.search)}catch(ignoreUrl){limparHandoff()}try{if(window.PortalTacsManutencao&&typeof window.PortalTacsManutencao.atualizar==='function')window.PortalTacsManutencao.atualizar().catch(function(){})}catch(ignore){}hidePin();if(!residentSessionToken())renderResidentPinLogin();setBox('<strong class="tacs-family-title">✓ Modo TACS / teste ativo</strong><p class="tacs-family-help">O Portal seguirá o mesmo fluxo do morador. PINs e alterações deste teste ficam isolados dos cadastros reais.</p>','tacs-family-ok');return true}).catch(function(e){setBox('<strong class="tacs-family-title">Não foi possível ativar o modo TACS / teste</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn');return false})}
  function pendingLabel(){return pendingType==='CPF'?'CPF':'Cartão SUS (CNS)'}
  function normalizeBirthInput(v){var d=String(v==null?'':v).replace(/\D/g,'').slice(0,8);if(d.length!==8)return'';var dia=Number(d.slice(0,2)),mes=Number(d.slice(2,4)),ano=Number(d.slice(4));if(ano<1900||ano>2100)return'';var dt=new Date(Date.UTC(ano,mes-1,dia));if(dt.getUTCFullYear()!==ano||dt.getUTCMonth()!==mes-1||dt.getUTCDate()!==dia)return'';return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4)}
  function renderMissingCpfBirth(cpf,message){residentEnrollmentCpf=digits(cpf);setPinBox('<strong class="tacs-family-title">Confirme seu CPF com a data de nascimento</strong><p class="tacs-family-help">'+escapeHtml(message||'Este CPF ainda não está no banco de dados. Informe sua data de nascimento para localizar seu cadastro com segurança.')+'</p><input id="portalResidentBirthConfirm" type="text" inputmode="numeric" maxlength="10" autocomplete="bday" placeholder="DD/MM/AAAA" value="'+escapeHtml(formatBirthInput(residentBirthConfirm))+'"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-birth-confirm="1">Confirmar CPF</button></div>','tacs-pin-box')}
  function renderMissingCpfName(message){setPinBox('<strong class="tacs-family-title">Confirme seu cadastro</strong><p class="tacs-family-help">'+escapeHtml(message||'Há mais de uma pessoa com esta data de nascimento. Informe seu nome completo.')+'</p><input id="portalResidentNameConfirm" type="text" autocomplete="name" placeholder="Nome completo" value="'+escapeHtml(residentNameConfirm)+'"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-name-confirm="1">Continuar</button></div>','tacs-pin-box')}
  function handleMissingCpfConfirmation(r){if(r&&r.identidadeToken&&!r.provisorio){residentIdentityToken=text(r.identidadeToken);residentBirthConfirm=normalizeBirthStored(r.nascimento||residentBirthConfirm)||residentBirthConfirm;if(r.revisarCpf===true){renderMissingCpfReview();return}renderResidentPinCreate(r,residentEnrollmentCpf);return}if(r&&r.precisaNome){renderMissingCpfName(r.message);return}if(r&&r.precisaArea){setPinBox('<strong class="tacs-family-title">Não foi possível confirmar nesta área</strong><p class="tacs-family-help">'+escapeHtml(r.message||'Confira sua comunidade e tente novamente.')+'</p>','tacs-family-warn');return}setPinBox('<strong class="tacs-family-title">Não foi possível confirmar o cadastro</strong><p class="tacs-family-help">'+escapeHtml(r&&r.message||'Confira os dados e tente novamente.')+'</p>','tacs-family-warn')}
  function confirmMissingCpfBirth(){var field=document.getElementById('portalResidentBirthConfirm'),birth=normalizeBirthInput(field&&field.value);if(!birth){setPinBox('<strong class="tacs-family-title">Data de nascimento incompleta</strong><p class="tacs-family-help">Informe dia, mês e ano no formato DD/MM/AAAA.</p>','tacs-family-warn');setTimeout(function(){renderMissingCpfBirth(residentEnrollmentCpf,'Informe novamente a data completa.')},900);return}residentBirthConfirm=birth;residentPost('conecta_morador_confirmar',{cpf:residentEnrollmentCpf,nascimento:residentBirthConfirm,nome:'',areaId:areaId(),dispositivo:deviceId(true)}).then(handleMissingCpfConfirmation).catch(function(e){setPinBox('<strong class="tacs-family-title">Não foi possível confirmar</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn')})}
  function confirmMissingCpfName(){residentNameConfirm=text(document.getElementById('portalResidentNameConfirm')&&document.getElementById('portalResidentNameConfirm').value);if(residentNameConfirm.length<3){renderMissingCpfName('Informe seu nome completo para continuar.');return}residentPost('conecta_morador_confirmar',{cpf:residentEnrollmentCpf,nascimento:residentBirthConfirm,nome:residentNameConfirm,areaId:areaId(),dispositivo:deviceId(true)}).then(handleMissingCpfConfirmation).catch(function(e){setPinBox('<strong class="tacs-family-title">Não foi possível confirmar</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn')})}
  function renderMissingCpfReview(){setPinBox('<strong class="tacs-family-title">Confira seus dados antes de salvar</strong><p class="tacs-family-help">Pare um momento e verifique se os 11 números do CPF e a data de nascimento estão corretos.</p><div class="tacs-family-help"><strong>CPF:</strong> '+escapeHtml(formatDoc(residentEnrollmentCpf))+'<br><strong>Data de nascimento:</strong> '+escapeHtml(residentBirthConfirm)+'</div><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-cpf-review-confirm="1">Confirmar e continuar</button><button type="button" class="tacs-family-action" data-resident-cpf-review-correct="1">Corrigir</button></div>','tacs-pin-box')}
  function correctMissingCpf(){hidePin();residentIdentityToken='';residentBirthConfirm='';residentNameConfirm='';var input=document.getElementById('cpf');if(input){try{input.focus();input.select()}catch(e){}}}
  function confirmReviewedMissingCpf(){if(digits(residentEnrollmentCpf).length!==11||!residentIdentityToken||!residentBirthConfirm){renderMissingCpfBirth(residentEnrollmentCpf,'Confira novamente o CPF e a data de nascimento.');return}residentPost('conecta_morador_confirmar',{cpf:residentEnrollmentCpf,nascimento:residentBirthConfirm,areaId:areaId(),identidadeToken:residentIdentityToken,confirmarCpf:'SIM',dispositivo:deviceId(true)}).then(function(r){if(!r||!r.identidadeToken||r.provisorio===true)throw new Error(r&&r.message||'Não foi possível salvar o CPF.');residentIdentityToken=text(r.identidadeToken);pendingMissing='';pendingType='';pendingOwnerLookup='';renderResidentPinCreate(r,residentEnrollmentCpf);var input=document.getElementById('cpf');if(input){setTimeout(function(){input.value=formatDoc(residentEnrollmentCpf);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))},120)}}).catch(function(e){setPinBox('<strong class="tacs-family-title">Não foi possível salvar o CPF</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn')})}
  function renderResidentPinCreate(r,cpf){placePinDefault();residentIdentityToken=text(r&&r.identidadeToken);residentEnrollmentCpf=digits(cpf);if(!residentIdentityToken)return;setPinBox('<strong class="tacs-family-title">Agora crie o seu PIN com quatro números.</strong><p class="tacs-family-help">Digite 4 números e confirme o mesmo PIN. Da próxima vez, este aparelho poderá acessar sua família usando o PIN.</p><input id="portalResidentPinNew" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="PIN de 4 números"><input id="portalResidentPinConfirm" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="Confirmar PIN de 4 números"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-pin-create="1">Salvar PIN</button></div>','tacs-pin-box')}
  function preparedSelectedIdentity(cpf){var d=digits(cpf),r=wantedMemberToken&&memberResolvedCache[wantedMemberToken];if(!r||digits(r.documentoAcesso)!==d||!r.acessoPreparado||!text(r.identidadeToken))return null;return r}
  function beginResidentPinEnrollment(cpf){
    var d=digits(cpf);
    if(!/^\d{11}$/.test(d)||residentSessionToken())return Promise.resolve(null);
    if(residentProfile()||residentVaultExists()){renderResidentPinLogin();return Promise.resolve(null)}
    if(residentEnrollmentCpf&&residentEnrollmentCpf!==d)return Promise.resolve(null);
    residentEnrollmentCpf=d;
    var prepared=preparedSelectedIdentity(d);
    if(prepared){renderResidentPinCreate(prepared,d);return Promise.resolve(prepared)}
    setPinBox('<strong class="tacs-family-title">Preparando seu acesso por PIN…</strong><p class="tacs-family-help">Seu CPF foi reconhecido. Aguarde um instante.</p>','tacs-pin-box');
    return residentPost('conecta_morador_identificar',{cpf:d,dispositivo:deviceId(true)}).then(function(r){
      if(r&&r.jaPossuiPin===true){
        residentServerCpfHint=d;
        renderResidentPinLogin(r.message||'Este aparelho já possui PIN.');
        return r;
      }
      if(r&&r.identidadeToken&&!r.provisorio){renderResidentPinCreate(r,d);return r}
      if(r&&r.precisaNascimento){renderMissingCpfBirth(d,'Confirme sua data de nascimento para continuar e criar o PIN.');return r}
      throw new Error(r&&r.message||'Não foi possível preparar o PIN.');
    }).catch(function(e){setPinBox('<strong class="tacs-family-title">Não foi possível preparar o PIN agora</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn');return null});
  }
  /* PIN_OBRIGATORIO_APOS_SELECAO_MORADOR_2026_09_16_V1
     Se o integrante vier pelo CNS porque ainda não há CPF utilizável, o primeiro
     acesso não pode seguir direto para o serviço: solicita CPF, confirma nascimento
     e então reutiliza o fluxo canônico de criação do PIN. */
  function renderResidentCpfForPin(){
    if(residentSessionToken())return false;
    if(residentProfile()){renderResidentPinLogin();return true}
    setPinBox('<strong class="tacs-family-title">Antes de continuar, digite o seu CPF</strong><p class="tacs-family-help">Este cadastro foi localizado pelo Cartão SUS. Digite os 11 números do seu CPF. Em seguida, confirme sua data de nascimento; só depois você criará o PIN.</p><input id="portalResidentCpfForPin" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-cpf-pin-start="1">Continuar</button></div>','tacs-pin-cpf-required');
    return true;
  }
  function startResidentCpfForPin(){
    var field=document.getElementById('portalResidentCpfForPin'),cpf=digits(field&&field.value);
    if(!/^\d{11}$/.test(cpf)){
      setPinBox('<strong class="tacs-family-title">Antes de continuar, digite o seu CPF</strong><p class="tacs-family-help">Informe os 11 números do seu CPF. Depois será solicitada sua data de nascimento; o PIN será criado somente na etapa seguinte.</p><input id="portalResidentCpfForPin" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-cpf-pin-start="1">Continuar</button></div>','tacs-pin-cpf-required');
      return;
    }
    residentEnrollmentCpf=cpf;residentIdentityToken='';residentBirthConfirm='';residentNameConfirm='';
    renderMissingCpfBirth(cpf,'Confirme sua data de nascimento para vincular este CPF ao cadastro correto e criar seu PIN.');
  }
  function notificationAlreadyActive(){
    var status=document.getElementById('notificationStatus'),button=document.getElementById('notificationButton');
    var statusText=text(status&&status.textContent).toLowerCase(),buttonText=text(button&&button.textContent).toLowerCase();
    return statusText.indexOf('avisos ativados neste aparelho')!==-1||buttonText==='avisos ativados';
  }
  function pinCreatedConfirmation(){
    if(notificationAlreadyActive()){
      return '<strong class="tacs-family-title">✓ PIN criado e confirmado</strong><p class="tacs-family-help">Seu acesso foi salvo. As notificações deste aparelho já estão ativas.</p>';
    }
    return '<strong class="tacs-family-title">✓ PIN criado e confirmado</strong><p class="tacs-family-help">Seu acesso foi salvo. O Portal está conferindo automaticamente o estado das notificações deste aparelho.</p>';
  }
  function createResidentPinFromPortal(){
    var a=digits(document.getElementById('portalResidentPinNew')&&document.getElementById('portalResidentPinNew').value),b=digits(document.getElementById('portalResidentPinConfirm')&&document.getElementById('portalResidentPinConfirm').value),btn=document.querySelector('[data-resident-pin-create]');
    if(!/^\d{4}$/.test(a)||a!==b){renderResidentPinCreate({identidadeToken:residentIdentityToken},residentEnrollmentCpf);return}
    if(!residentIdentityToken){setPinBox('<strong class="tacs-family-title">Identificação expirada</strong><p class="tacs-family-help">Digite seu CPF novamente para preparar o PIN.</p>','tacs-family-warn');return}
    if(btn)btn.disabled=true;
    residentPost('conecta_morador_criar_pin',{identidadeToken:residentIdentityToken,pin:a,confirmacao:b,dispositivo:deviceId(true)}).then(function(r){
      saveResidentAccess(r);
      return saveResidentVault(a,r,residentProfile()).then(function(){
        setPinBox(pinCreatedConfirmation(),'tacs-pin-box');
        try{document.dispatchEvent(new CustomEvent('tacs:pin-criado-confirmado',{detail:{areaId:r&&r.areaId||areaId()}}))}catch(ignore){}
        return r;
      });
    }).catch(function(e){
      var msg=text(e&&e.message);
      if(msg.indexOf('PIN já foi criado')!==-1||msg.indexOf('já possui PIN')!==-1){
        var input=document.getElementById('cpf'),d=digits(input&&input.value)||residentEnrollmentCpf;
        if(/^\d{11}$/.test(d))residentServerCpfHint=d;
        residentIdentityToken='';
        renderResidentPinLogin(msg);
        return;
      }
      setPinBox('<strong class="tacs-family-title">Não foi possível salvar o PIN</strong><p class="tacs-family-help">'+escapeHtml(msg)+'</p>','tacs-family-warn');
    }).finally(function(){var x=document.querySelector('[data-resident-pin-create]');if(x)x.disabled=false});
  }
  function residentPinLoginHtml(message){
    var note=message?'<p class="tacs-family-help">'+escapeHtml(message)+'</p>':'<p class="tacs-family-help">Este aparelho já possui um acesso de morador. Digite o PIN de 4 números para abrir sua família.</p>';
    return '<strong class="tacs-family-title">Acesse com seu PIN</strong>'+note+'<input id="portalResidentPinLogin" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password" placeholder="PIN de 4 números"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-pin-login="1">Entrar com PIN</button></div>'+recoveryCpfHtml();
  }
  function renderResidentPinLogin(message){
    var p=residentProfile(),disponivel=Boolean(p||residentVaultExists()||/^\d{11}$/.test(residentServerCpfHint));
    if(!disponivel||residentSessionToken())return false;
    placePinFirst();
    setPinBox(residentPinLoginHtml(message),'tacs-pin-box');
    setTimeout(function(){var o=window.PortalTacsOrientacaoMoradorV1;if(o&&typeof o.refreshGuide==='function')o.refreshGuide()},0);
    return true;
  }
  function renderResidentRecoveryCpf(message){
    if(tacsTeste()){renderResidentPinLogin();return}
    placePinFirst();
    var value=residentServerCpfHint?formatCpfInput(residentServerCpfHint):'';
    setPinBox('<strong class="tacs-family-title">Recuperar ou criar novo PIN</strong><p class="tacs-family-help">'+escapeHtml(message||'Informe o CPF do morador. O acesso só será recuperado neste mesmo aparelho já reconhecido.')+'</p><input id="portalResidentRecoveryCpf" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00" value="'+escapeHtml(value)+'"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-pin-recovery="1">Continuar com CPF</button><button type="button" class="tacs-family-action" data-resident-pin-recovery-cancel="1">Voltar ao PIN</button></div>','tacs-pin-box');
  }
  function startResidentPinRecovery(){
    if(tacsTeste())return;
    var field=document.getElementById('portalResidentRecoveryCpf'),cpf=digits(field&&field.value),p=residentProfile();
    if(!/^\d{11}$/.test(cpf)){renderResidentRecoveryCpf('Informe um CPF válido com 11 números.');return}
    residentServerCpfHint=cpf;
    setPinBox('<strong class="tacs-family-title">Confirmando o acesso deste aparelho…</strong><p class="tacs-family-help">Aguarde um instante.</p>','tacs-pin-box');
    residentPost('conecta_pin_recuperar_iniciar',{perfil:'MORADOR',cpf:cpf,dispositivo:deviceId(true),quickKey:p&&p.quickKey||''}).then(function(r){
      residentRecoveryToken=text(r&&r.recuperacaoToken);
      if(!residentRecoveryToken)throw new Error('Não foi possível iniciar a recuperação.');
      setPinBox('<strong class="tacs-family-title">Crie o novo PIN</strong><p class="tacs-family-help">Digite 4 números e confirme o mesmo PIN.</p><input id="portalResidentRecoveryPin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="Novo PIN de 4 números"><input id="portalResidentRecoveryConfirm" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="Confirmar novo PIN"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-pin-recovery-save="1">Salvar novo PIN</button><button type="button" class="tacs-family-action" data-resident-pin-recovery-cancel="1">Cancelar</button></div>','tacs-pin-box');
    }).catch(function(e){renderResidentRecoveryCpf(e&&e.message?e.message:'Não foi possível recuperar o PIN agora.')});
  }
  function saveResidentRecoveredPin(){
    var a=digits(document.getElementById('portalResidentRecoveryPin')&&document.getElementById('portalResidentRecoveryPin').value),b=digits(document.getElementById('portalResidentRecoveryConfirm')&&document.getElementById('portalResidentRecoveryConfirm').value),btn=document.querySelector('[data-resident-pin-recovery-save]');
    if(!/^\d{4}$/.test(a)||a!==b){setPinBox('<strong class="tacs-family-title">Crie o novo PIN</strong><p class="tacs-family-help">Os dois campos precisam ter exatamente os mesmos 4 números.</p><input id="portalResidentRecoveryPin" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="Novo PIN de 4 números"><input id="portalResidentRecoveryConfirm" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" placeholder="Confirmar novo PIN"><div class="tacs-pin-actions"><button type="button" class="tacs-pin-action" data-resident-pin-recovery-save="1">Salvar novo PIN</button><button type="button" class="tacs-family-action" data-resident-pin-recovery-cancel="1">Cancelar</button></div>','tacs-pin-box');return}
    if(!residentRecoveryToken){renderResidentRecoveryCpf('A confirmação expirou. Informe o CPF novamente.');return}
    if(btn)btn.disabled=true;
    residentPost('conecta_pin_recuperar_salvar',{recuperacaoToken:residentRecoveryToken,pin:a,confirmacao:b,dispositivo:deviceId(true)}).then(function(r){
      residentRecoveryToken='';
      saveResidentAccess(r);
      return saveResidentVault(a,r,residentProfile()).then(function(){
        placePinDefault();
        if(!openResidentInline(r,true))setPinBox('<strong class="tacs-family-title">✓ Novo PIN salvo</strong><p class="tacs-family-help">Acesso recuperado e dados prontos.</p>','tacs-pin-box');
        return r;
      });
    }).catch(function(e){renderResidentRecoveryCpf(e&&e.message?e.message:'Não foi possível salvar o novo PIN.')}).finally(function(){var x=document.querySelector('[data-resident-pin-recovery-save]');if(x)x.disabled=false});
  }
  function residentSnapshot(r,p){
 r=r||{};p=p||residentProfile()||{};
 return {perfil:'MORADOR',areaId:r.areaId||p.areaId||areaId(),areaNome:r.areaNome||p.areaNome||'',nome:r.nome||p.nome||'',cpf:r.cpf||p.cpf||'',nascimento:normalizeBirthStored(r.nascimento||p.nascimento||''),endereco:r.endereco||r.localidade||p.localidade||'',notificacoesAtivas:Boolean(r.notificacoesAtivas===true),silencioso:Boolean(r.silencioso===true),provisorio:Boolean(r.provisorio===true),pendenciaId:text(r.pendenciaId),familiaId:normalizeFamily(r.familiaId||p.familiaId||''),familia:Array.isArray(r.familia)?r.familia.slice():[]};
}
function saveResidentVault(pin,r,p){
 var v=window.ConectaPinLocalV2;if(!v||typeof v.guardar!=='function')return Promise.resolve(false);
 var snap=residentSnapshot(r,p);
 return Promise.resolve(v.guardar('morador',pin,{device:deviceId(true),quickKey:text(r&&r.quickKey)||text(p&&p.quickKey),areaId:snap.areaId,areaNome:snap.areaNome,snapshot:snap,salvoRemotoEm:Date.now()})).catch(function(){return false});
}
function openResidentInline(r,confirmed){
 var api=window.ConectaMoradorSessionV1;
 if(api&&typeof api.openInline==='function')return api.openInline(r,confirmed);
 return false;
}
function loginResidentPinFromPortal(){
 var p=residentProfile(),pin=digits(document.getElementById('portalResidentPinLogin')&&document.getElementById('portalResidentPinLogin').value),btn=document.querySelector('[data-resident-pin-login]'),hintCpf=residentServerCpfHint;
 if(!p&&!residentVaultExists()&&!/^\d{11}$/.test(hintCpf)){hidePin();return}
 if(!/^\d{4}$/.test(pin)){renderResidentPinLogin('Digite os 4 números do seu PIN.');return}
 if(btn)btn.disabled=true;
 var v=window.ConectaPinLocalV2,local=v&&typeof v.abrir==='function'?Promise.resolve(v.abrir('morador',pin)):Promise.resolve(null);
 local.then(function(saved){
  var localOpened=false;
  if(saved&&text(saved.device)===deviceId(true)){
   if(!p&&text(saved.quickKey)){
    var cached=residentSnapshot(saved.snapshot||saved,{});
    saveResidentAccess({quickKey:text(saved.quickKey),areaId:cached.areaId,areaNome:cached.areaNome,nome:cached.nome,cpf:cached.cpf,nascimento:cached.nascimento,endereco:cached.endereco,familiaId:cached.familiaId,familia:cached.familia,notificacoesAtivas:cached.notificacoesAtivas,silencioso:cached.silencioso});
    p=residentProfile();
   }
   if(!p||!saved.quickKey||text(saved.quickKey)===text(p.quickKey)){
    var snap=residentSnapshot(saved.snapshot||saved,p||{});
    try{sessionStorage.setItem(residentBootstrapKey(),JSON.stringify(snap))}catch(e){}
    placePinDefault();
    localOpened=openResidentInline(snap,false);
   }
  }
  if(!localOpened)setPinBox('<strong class="tacs-family-title">Aguarde enquanto seus dados carregam…</strong><p class="tacs-family-help">Validando seu PIN e preparando sua família.</p>','tacs-pin-box');
  var cpfFallback=/^\d{11}$/.test(hintCpf)?hintCpf:'';
  return residentPost('conecta_morador_login_pin',{quickKey:p&&p.quickKey||'',cpf:cpfFallback,pin:pin,dispositivo:deviceId(true)}).then(function(r){
   saveResidentAccess(r);
   p=residentProfile()||p;
   return saveResidentVault(pin,r,p).then(function(){
    placePinDefault();
    if(!openResidentInline(r,true)&&!localOpened)setPinBox('<strong class="tacs-family-title">✓ PIN confirmado</strong><p class="tacs-family-help">Dados prontos.</p>','tacs-pin-box');
    return r;
   });
  }).catch(function(e){
   if(localOpened){
    var aviso=document.getElementById('portalDocumentComplementV1');
    if(aviso){aviso.hidden=false;aviso.className='tacs-family-warn';aviso.innerHTML='<strong class="tacs-family-title">Sincronização pendente</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>'}
    return null;
   }
   renderResidentPinLogin(e&&e.message?e.message:'PIN não confirmado.');
   return null;
  });
 }).catch(function(e){renderResidentPinLogin(e&&e.message?e.message:'PIN não confirmado.');}).finally(function(){var x=document.querySelector('[data-resident-pin-login]');if(x)x.disabled=false});
}
  function renderStart(){var input=document.getElementById('cpf'),current=digits(input&&input.value),fam=familyCandidate(current);if(!fam){if(pendingMissing&&current===pendingMissing)return;if(docType(current)&&ensureFamilySelectorVisible())return;hide();return}var ajuda=pendingMissing?'O '+pendingLabel()+' informado será vinculado somente depois que você escolher a pessoa correta desta família.':'Ao buscar, todos os integrantes cadastrados desta família serão exibidos.';setBox('<strong class="tacs-family-title">Cadastro familiar '+escapeHtml(fam)+'</strong><button type="button" class="tacs-family-action" data-family-search="'+escapeHtml(fam)+'">👨‍👩‍👧‍👦 Buscar esta família</button><p class="tacs-family-help">'+escapeHtml(ajuda)+'</p>','')}
  function renderMembers(r){var m=Array.isArray(r&&r.membros)?r.membros:[],title=pendingMissing?'De quem é este '+pendingLabel()+'?':'Quem precisa do atendimento?',help=pendingMissing?'Este '+pendingLabel()+' ainda não está vinculado a nenhum morador desta família. Toque na pessoa correta para vincular com segurança.':'Família '+escapeHtml(r.familiaId)+'. Toque no nome para carregar nome, nascimento e localidade.',html='<strong class="tacs-family-title">'+escapeHtml(title)+'</strong><p class="tacs-family-help">'+help+'</p>';activeFamilyId=normalizeFamily(r&&r.familiaId||'');familySnapshot=r||null;m.forEach(function(i){seedMemberCacheFromSnapshot(i,activeFamilyId);html+='<button type="button" class="tacs-family-member" data-member-token="'+escapeHtml(i.token)+'" data-member-name="'+escapeHtml(i.nome)+'"'+(i.temDocumento?'':' disabled')+'>'+escapeHtml(i.nome)+'<span>'+(i.nascimento?'Nascimento: '+escapeHtml(i.nascimento):'')+(i.temDocumento?'':' • Sem CPF/CNS para carregamento automático')+'</span></button>'});warmMemberCache(m);setBox(html,'tacs-family-ok')}
  /* SELETOR_FAMILIAR_PERSISTENTE_2026_09_16_V1
     Enquanto houver uma família ativa e o campo principal estiver mostrando o
     CPF/CNS do integrante escolhido, a lista familiar permanece disponível. */
  function ensureFamilySelectorVisible(){
    if(!activeFamilyId||!familySnapshot)return false;
    var b=box();
    if(!b)return false;
    if(b.hidden||!b.querySelector('[data-member-token]'))renderMembers(familySnapshot);
    else b.hidden=false;
    return true;
  }
  function seedMemberCacheFromSnapshot(item,familiaId){
    if(!item||!item.token)return false;
    var key=text(item.token),doc=digits(item.documentoAcesso||''),local=text(item.localidade||item.comunidade||item.endereco||item['endereço']||'');
    if(!key||!text(item.nome)||!text(item.nascimento)||!local)return false;
    memberResolvedCache[key]={
      ok:true,
      snapshot:true,
      membroToken:key,
      documentoAcesso:docType(doc)?doc:'',
      tipoDocumento:text(item.tipoDocumento||''),
      temDocumento:Boolean(item.temDocumento&&docType(doc)),
      identidadeToken:text(item.identidadeToken||''),
      acessoPreparado:Boolean(item.acessoPreparado&&item.identidadeToken),
      nome:text(item.nome),
      nascimento:text(item.nascimento),
      localidade:local,
      areaId:text(item.areaId||areaId()),
      familiaId:normalizeFamily(item.familiaId||familiaId||activeFamilyId)
    };
    return true;
  }
  function resolveMemberToken(token,maxAttempts){var key=text(token);if(!key)return Promise.reject(new Error('Integrante inválido.'));if(memberResolvedCache[key])return Promise.resolve(memberResolvedCache[key]);if(memberResolvePromises[key])return memberResolvePromises[key];memberResolvePromises[key]=jsonpRetry({action:'publico_familia_membro',areaId:areaId(),token:key},maxAttempts||2).then(function(r){if(!r||r.ok!==true||!r.documentoAcesso)throw new Error(r&&r.message||'Não foi possível carregar este integrante.');memberResolvedCache[key]=r;return r}).finally(function(){delete memberResolvePromises[key]});return memberResolvePromises[key]}
  function warmMemberCache(membros){
    var generation=++memberCacheWarmGeneration,list=Array.isArray(membros)?membros.filter(function(i){return i&&i.temDocumento&&i.token}):[];
    list.forEach(function(item){
      if(generation!==memberCacheWarmGeneration)return;
      var key=text(item.token);
      if(!key||memberResolvedCache[key]||memberResolvePromises[key])return;
      resolveMemberToken(key,1).catch(function(){return null});
    });
  }

  function consultarFamilia(fam,documento){var p={action:'publico_familia_consultar',areaId:areaId(),subscriptionId:subscriptionId(),dispositivo:deviceId(false),chaveTacsTeste:technicalToken()};if(fam)p.familia=fam;if(documento)p.documento=digits(documento);var key=p.areaId+'|'+text(p.familia||'')+'|'+text(p.documento||'');if(familyQueryPromises[key])return familyQueryPromises[key];familyQueryPromises[key]=jsonpRetry(p,2).catch(function(primaryError){return fetchFamiliaJson(p).catch(function(){throw primaryError})}).then(function(r){if(r&&r.ok===true&&r.autorizada===true){renderMembers(r);return r}setBox(escapeHtml(r&&r.message||'Não foi possível consultar a família.'),'tacs-family-warn');return r}).finally(function(){delete familyQueryPromises[key]});return familyQueryPromises[key]}
  function searchFamily(fam){hideDoc();setBox('<strong class="tacs-family-title">Aguarde, buscando moradores da família '+escapeHtml(fam)+'…</strong>','');return consultarFamilia(fam,'').catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn')})}
  function searchFamilyResolved(fam,documento){var family=normalizeFamily(fam),d=digits(documento);if(!family||!docType(d))return searchFamilyByDocument(d);hideDoc();setBox('<strong class="tacs-family-title">Carregando os integrantes da família…</strong>','');return consultarFamilia(family,d).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn');return null})}
  function searchFamilyByDocument(documento){var d=digits(documento);if(!docType(d))return Promise.resolve(null);hideDoc();setBox('<strong class="tacs-family-title">Carregando os integrantes da família…</strong>','');return consultarFamilia('',d).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn');return null})}
  function fillSelectedDocument(documento,nome){var input=document.getElementById('cpf');if(!input)return;internalMemberSwitch=true;input.value=documento;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));internalMemberSwitch=false;var api=window.TacsMoradoresAutofillV1;if(api&&typeof api.cached==='function'&&api.cached(documento)){hideDoc()}else setDocBox('<strong class="tacs-family-title">'+escapeHtml(nome||'Cadastro selecionado')+'</strong><p class="tacs-family-help">Carregando os dados deste integrante…</p>','tacs-family-ok')}
  function familySearchButton(target){return target&&target.closest?target.closest('[data-family-search]'):null}
  function activateFamilySearchButton(button,e){
    if(!button)return false;
    var fam=normalizeFamily(button.getAttribute('data-family-search'));
    if(!fam)return false;
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    var now=Date.now();
    if(lastFamilySearch.family===fam&&now-lastFamilySearch.at<900)return true;
    lastFamilySearch={family:fam,at:now};
    button.classList.add('tacs-family-pressed');button.setAttribute('aria-busy','true');
    searchFamily(fam).finally(function(){button.classList.remove('tacs-family-pressed');button.removeAttribute('aria-busy')});
    return true;
  }
  function memberButton(target){return target&&target.closest?target.closest('[data-member-token]'):null}
  function releaseMemberButton(token){var b=document.querySelector('[data-member-token="'+String(token).replace(/"/g,'')+'"]');if(b){b.classList.remove('tacs-family-pressed');b.removeAttribute('aria-busy');b.removeAttribute('aria-disabled');b.removeAttribute('data-loading');b.disabled=false}}
  function activateMemberButton(button,e){if(!button)return false;var token=text(button.getAttribute('data-member-token'));if(!token)return false;if(e&&typeof e.preventDefault==='function')e.preventDefault();if(button.disabled||button.getAttribute('aria-busy')==='true')return true;var now=Date.now();if(lastMemberActivation.token===token&&now-lastMemberActivation.at<1200)return true;lastMemberActivation={token:token,at:now};button.classList.add('tacs-family-pressed');var cached=memberResolvedCache[token];if(cached&&!(pendingMissing&&pendingType&&!docType(cached.documentoAcesso))){applyResolvedMember(token,cached,pendingMissing,pendingType);return true}if(cached&&pendingMissing&&pendingType&&!docType(cached.documentoAcesso))delete memberResolvedCache[token];button.setAttribute('aria-busy','true');button.setAttribute('aria-disabled','true');button.setAttribute('data-loading','1');button.disabled=true;var nome=text(button.getAttribute('data-member-name'))||'este familiar';setDocBox('<strong class="tacs-family-title">Aguarde, buscando morador…</strong><p class="tacs-family-help">Carregando os dados de <strong>'+escapeHtml(nome)+'</strong>.</p>','tacs-family-ok');selectMember(token);return true}
  function applyMemberWithoutSecondLookup(r){
    var api=window.TacsMoradoresAutofillV1;
    if(!api)return false;
    var resident={
      nome:r.nome||'',
      nascimento:r.nascimento||'',
      localidade:r.localidade||'',
      endereco:r.localidade||'',
      areaId:r.areaId||areaId(),
      membroToken:r.membroToken||'',
      tipoDocumento:r.tipoDocumento||'',
      temDocumento:Boolean(r.temDocumento),
      identidadeToken:r.identidadeToken||'',
      acessoPreparado:Boolean(r.acessoPreparado)
    };
    if(docType(r.documentoAcesso)&&typeof api.applyResolved==='function'){
      return api.applyResolved(r.documentoAcesso,resident,r.familiaId||activeFamilyId);
    }
    if(typeof api.applyFamilySnapshot==='function'){
      return api.applyFamilySnapshot(resident,r.familiaId||activeFamilyId);
    }
    return false;
  }
  function applyResolvedMember(token,r,candidate,candidateType){var localizer=digits(r.documentoAcesso),localizerType=docType(localizer);if(candidate&&candidateType&&localizerType&&candidateType!==localizerType){setDocBox('<strong class="tacs-family-title">'+escapeHtml(r.nome||'Cadastro selecionado')+'</strong><p class="tacs-family-help">Vinculando o '+escapeHtml(pendingLabel())+' à pessoa selecionada…</p>','tacs-family-ok');return complementDocument(localizer,candidate,function(){fillSelectedDocument(candidate,r.nome)}).finally(function(){releaseMemberButton(token)})}if(candidate&&candidateType&&localizerType===candidateType){pendingMissing='';pendingType='';pendingOwnerLookup='';setDocBox('<strong class="tacs-family-title">Documento não alterado</strong><p class="tacs-family-help">Este cadastro já possui '+escapeHtml(candidateType)+' registrado. Documento existente nunca é substituído automaticamente.</p>','tacs-family-warn')}if(!applyMemberWithoutSecondLookup(r))fillSelectedDocument(r.documentoAcesso,r.nome);else hideDoc();ensureFamilySelectorVisible();releaseMemberButton(token);return r}
  function selectMember(token){var candidate=pendingMissing,candidateType=pendingType;wantedMemberToken=token;return resolveMemberToken(token,2).then(function(r){if(wantedMemberToken!==token){releaseMemberButton(token);return null}return applyResolvedMember(token,r,candidate,candidateType)}).catch(function(e){releaseMemberButton(token);if(wantedMemberToken!==token)return null;setDocBox('<strong class="tacs-family-title">Não foi possível carregar este familiar agora.</strong><p class="tacs-family-help">'+escapeHtml(e&&e.message?e.message:'Tente novamente.')+' Toque no nome novamente para repetir.</p>','tacs-family-warn');return null})}
  function complementRequestId(){return 'doc_publico_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
  function pollComplement(id,started){return new Promise(function(resolve,reject){function again(){jsonp({action:'publico_documento_complementar_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)resolve(r.result);else reject(new Error(r.result.message||'Não foi possível atualizar o cadastro.'));return}if(Date.now()-started>25000){reject(new Error('A atualização demorou demais. Tente novamente.'));return}setTimeout(again,900)}).catch(function(){if(Date.now()-started>25000)reject(new Error('Não foi possível confirmar a atualização.'));else setTimeout(again,1200)})}again()})}
  function complementDocument(localizer,newDoc,onSuccess){if(complementing)return Promise.resolve(false);if(tacsTeste()){var simulated={ok:true,teste:true,message:'Documento validado somente nesta simulação. Nenhum cadastro real foi alterado.'};pendingMissing='';pendingType='';pendingOwnerLookup='';setDocBox('<strong class="tacs-family-title">✓ Simulação concluída</strong><p class="tacs-family-help">'+escapeHtml(simulated.message)+'</p>','tacs-family-ok');if(typeof onSuccess==='function')onSuccess(simulated);return Promise.resolve(simulated)}complementing=true;var id=complementRequestId(),body=new URLSearchParams();body.set('action','publico_documento_complementar');body.set('requestId',id);body.set('areaId',areaId());body.set('documentoLocalizador',digits(localizer));body.set('documentoNovo',digits(newDoc));setDocBox('<strong class="tacs-family-title">Salvando o documento no cadastro…</strong>','');return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return pollComplement(id,Date.now())}).then(function(r){pendingMissing='';pendingType='';pendingOwnerLookup='';setDocBox('<strong class="tacs-family-title">✓ Cadastro atualizado</strong><p class="tacs-family-help">'+escapeHtml(r.message)+'</p>','tacs-family-ok');if(typeof onSuccess==='function')onSuccess(r);return r}).catch(function(e){setDocBox('<strong class="tacs-family-title">Não foi possível salvar automaticamente</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn');throw e}).finally(function(){complementing=false})}
  function maybeOfferComplement(){var input=document.getElementById('cpf'),current=digits(input&&input.value),currentType=docType(current);if(!pendingMissing||!currentType||!currentResident||current===pendingMissing||currentType===pendingType){hideDoc();return}var label=pendingLabel(),nome=escapeHtml(currentResident.nome||currentResident.name||'este morador');setDocBox('<strong class="tacs-family-title">Quer facilitar seus próximos acessos?</strong><p>O cadastro de <strong>'+nome+'</strong> foi localizado pelo '+(currentType==='CPF'?'CPF':'Cartão SUS')+'. O '+label+' que você informou antes ainda não está no cadastro.</p><button type="button" class="tacs-doc-action" data-doc-save="1">Salvar '+label+' neste cadastro</button><p class="tacs-family-help">O Portal só preenche campo vazio. Documento existente nunca é substituído automaticamente.</p>','')}
  function startOwnerSelection(){var fam=rememberedFamily(),key=pendingType+':'+pendingMissing+':'+fam;if(!pendingMissing)return;if(fam){if(pendingOwnerLookup===key)return;pendingOwnerLookup=key;setBox('<strong class="tacs-family-title">'+escapeHtml(pendingLabel())+' ainda não vinculado</strong><p class="tacs-family-help">Vou mostrar os integrantes da família '+escapeHtml(fam)+' para você indicar de quem é este documento.</p>','');searchFamily(fam,'');return}setBox('<strong class="tacs-family-title">'+escapeHtml(pendingLabel())+' ainda não vinculado</strong><p class="tacs-family-help">Se este documento é de alguém da sua família, informe agora o número do cadastro familiar no campo acima. O documento ficará guardado somente nesta tela até você escolher a pessoa correta.</p>','tacs-family-warn')}
  function documentoNaoLocalizado(documento,tipo){var d=digits(documento),resolved=text(tipo).toUpperCase()||docType(d);if(!d||!resolved||docType(d)!==resolved)return false;currentResident=null;hideDoc();if(resolved==='CPF'&&(!administrativeDeviceLocal()||tacsTeste())){pendingMissing='';pendingType='';pendingOwnerLookup='';if(residentEnrollmentCpf!==d||!document.getElementById('portalResidentBirthConfirm')){residentIdentityToken='';residentBirthConfirm='';residentNameConfirm='';renderMissingCpfBirth(d,'Este CPF ainda não está no banco de dados. Confirme com sua data de nascimento.')}return true}pendingMissing=d;pendingType=resolved;pendingOwnerLookup='';setTimeout(startOwnerSelection,0);return true}
  function observeStatus(){var status=document.getElementById('cpfStatus');if(!status||status.dataset.familyDocObserver==='1')return;status.dataset.familyDocObserver='1';var observer=new MutationObserver(function(){var t=text(status.textContent),input=document.getElementById('cpf'),d=digits(input&&input.value),type=docType(d);if(!type)return;if((type==='CPF'&&t.indexOf('CPF não localizado')!==-1)||(type==='CNS'&&(t.indexOf('Cartão SUS não localizado')!==-1||t.indexOf('CNS não localizado')!==-1)))documentoNaoLocalizado(d,type)});observer.observe(status,{childList:true,subtree:true,characterData:true})}
  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();docBox();pinBox();observeStatus();if(!residentSessionToken())renderResidentPinLogin();resgatarModoTacsTeste().then(function(ok){if(!ok)renderStart()})}
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='cpf'&&!internalMemberSwitch)setTimeout(renderStart,0)});
  document.addEventListener('pointerdown',function(e){var b=familySearchButton(e.target);if(!b||b.disabled||e.button>0)return;familySearchPointer={id:e.pointerId,x:e.clientX,y:e.clientY,button:b};b.classList.add('tacs-family-pressed')},{passive:true});
  document.addEventListener('pointermove',function(e){if(!familySearchPointer||familySearchPointer.id!==e.pointerId)return;if(Math.abs(e.clientX-familySearchPointer.x)>32||Math.abs(e.clientY-familySearchPointer.y)>32){if(familySearchPointer.button)familySearchPointer.button.classList.remove('tacs-family-pressed');familySearchPointer=null}},{passive:true});
  document.addEventListener('pointercancel',function(e){if(familySearchPointer&&familySearchPointer.id===e.pointerId){if(familySearchPointer.button)familySearchPointer.button.classList.remove('tacs-family-pressed');familySearchPointer=null}},{passive:true});
  document.addEventListener('pointerup',function(e){if(!familySearchPointer||familySearchPointer.id!==e.pointerId)return;var b=familySearchPointer.button,dx=Math.abs(e.clientX-familySearchPointer.x),dy=Math.abs(e.clientY-familySearchPointer.y);familySearchPointer=null;if(!b||dx>32||dy>32)return;activateFamilySearchButton(b,e)});
  document.addEventListener('pointerdown',function(e){var b=memberButton(e.target);if(!b||b.disabled||e.button>0)return;memberPointer={id:e.pointerId,x:e.clientX,y:e.clientY,button:b};b.classList.add('tacs-family-pressed')},{passive:true});
  document.addEventListener('pointermove',function(e){if(!memberPointer||memberPointer.id!==e.pointerId)return;if(Math.abs(e.clientX-memberPointer.x)>32||Math.abs(e.clientY-memberPointer.y)>32){if(memberPointer.button)memberPointer.button.classList.remove('tacs-family-pressed');memberPointer=null}},{passive:true});
  document.addEventListener('pointercancel',function(e){if(memberPointer&&memberPointer.id===e.pointerId){if(memberPointer.button)memberPointer.button.classList.remove('tacs-family-pressed');memberPointer=null}},{passive:true});
  document.addEventListener('pointerup',function(e){if(!memberPointer||memberPointer.id!==e.pointerId)return;var b=memberPointer.button,dx=Math.abs(e.clientX-memberPointer.x),dy=Math.abs(e.clientY-memberPointer.y);memberPointer=null;if(!b||dx>32||dy>32)return;activateMemberButton(b,e)});
  document.addEventListener('input',function(e){
    var target=e&&e.target;
    if(!target||!target.id)return;
    if(target.id==='portalResidentCpfForPin'||target.id==='portalResidentRecoveryCpf'){
      var cpf=formatCpfInput(target.value);
      if(target.value!==cpf)target.value=cpf;
      return;
    }
    if(target.id==='portalResidentBirthConfirm'){
      var nascimento=formatBirthInput(target.value);
      if(target.value!==nascimento)target.value=nascimento;
    }
  });
  document.addEventListener('click',function(e){var b=memberButton(e.target);if(b){activateMemberButton(b,e);return}var t=e.target&&e.target.closest?e.target.closest('[data-family-search],[data-doc-save],[data-resident-pin-create],[data-resident-pin-login],[data-resident-pin-recovery],[data-resident-pin-recovery-save],[data-resident-pin-recovery-cancel],[data-resident-cpf-pin-start],[data-resident-birth-confirm],[data-resident-name-confirm],[data-resident-cpf-review-confirm],[data-resident-cpf-review-correct]'):e.target;if(!t||!t.getAttribute)return;if(t.getAttribute('data-resident-pin-create')==='1'){createResidentPinFromPortal();return}if(t.getAttribute('data-resident-pin-login')==='1'){loginResidentPinFromPortal();return}if(t.getAttribute('data-resident-pin-recovery')==='1'){startResidentPinRecovery();return}if(t.getAttribute('data-resident-pin-recovery-save')==='1'){saveResidentRecoveredPin();return}if(t.getAttribute('data-resident-pin-recovery-cancel')==='1'){residentRecoveryToken='';renderResidentPinLogin();return}if(t.getAttribute('data-resident-cpf-pin-start')==='1'){startResidentCpfForPin();return}if(t.getAttribute('data-resident-birth-confirm')==='1'){confirmMissingCpfBirth();return}if(t.getAttribute('data-resident-name-confirm')==='1'){confirmMissingCpfName();return}if(t.getAttribute('data-resident-cpf-review-confirm')==='1'){confirmReviewedMissingCpf();return}if(t.getAttribute('data-resident-cpf-review-correct')==='1'){correctMissingCpf();return}var f=t.getAttribute('data-family-search');if(f){activateFamilySearchButton(t,e);return}if(t.getAttribute('data-doc-save')==='1'){var input=document.getElementById('cpf');complementDocument(digits(input&&input.value),pendingMissing).catch(function(){})}});
  document.addEventListener('tacs:morador',function(e){currentResident=e&&e.detail||null;setTimeout(function(){
    maybeOfferComplement();
    var input=document.getElementById('cpf'),d=digits(input&&input.value),fam=normalizeFamily(currentResident&&(currentResident.familiaBeneficiario||currentResident.familiaId)||'');
    if(residentSessionToken())return;
    if(residentProfile()||residentVaultExists()){renderResidentPinLogin();return}

    /* FAMILIA_SNAPSHOT_COMPLETO_2026_09_18_V2
       A família já entrega documento + identidadeToken no snapshot. O toque reutiliza ambos localmente,
       preenchendo CPF/CNS, nome, nascimento e localidade sem nova consulta do cidadão. */
    if(!pendingMissing&&currentResident&&currentResident.identidadeToken){
      residentIdentityToken=text(currentResident.identidadeToken);
      renderResidentPinCreate({identidadeToken:residentIdentityToken},'');
      if(fam&&activeFamilyId===fam&&familySnapshot){ensureFamilySelectorVisible();hideDoc()}
      return;
    }
    if(!pendingMissing&&currentResident&&currentResident.tipoDocumento==='CNS'&&currentResident.temDocumento){
      renderResidentCpfForPin();
      if(fam&&activeFamilyId===fam&&familySnapshot){ensureFamilySelectorVisible();hideDoc()}
      return;
    }

    if(!pendingMissing&&docType(d)){
      if(docType(d)==='CPF')beginResidentPinEnrollment(d);
      else if(docType(d)==='CNS')renderResidentCpfForPin();
      if(fam&&activeFamilyId===fam&&familySnapshot){ensureFamilySelectorVisible();hideDoc();return}
      if(fam)searchFamilyResolved(fam,d);else searchFamilyByDocument(d)
    }
  },0)});
  document.addEventListener('tacs:documento-nao-localizado',function(e){var d=e&&e.detail||{};documentoNaoLocalizado(d.documento,d.tipoDocumento||d.tipo)});
  window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(o){oneSignal=o});
  window.PortalTacsIdentificacaoFamilia={instalar:install,buscarFamilia:searchFamily,buscarPorDocumento:searchFamilyByDocument,documentoNaoLocalizado:documentoNaoLocalizado,resgatarModoTacsTeste:resgatarModoTacsTeste,modoTacsAtivo:tacsTeste};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());