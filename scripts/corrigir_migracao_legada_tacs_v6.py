from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]


def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({text.count(old)})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# 1) O painel novo deixou de depender do Push, mas também parou de enviar a subscriptionId.
# Sem ela o backend não conseguia reconhecer/migrar um aparelho que já estava marcado
# como TACS/teste na tabela legada. Reintroduzimos a leitura do OneSignal SOMENTE como
# ponte de migração; ativar/desativar o modo técnico continua funcionando sem Push.
replace_once(
    Path('admin-aparelho-tacs-teste-v1.js'),
    "  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';\n  var BOX_ID='aparelhoTacsTesteV1Box',STYLE_ID='aparelhoTacsTesteV1Style',operando=false,ultimoEstado=null;",
    "  var APP_ID='e2294b98-c72b-4f8c-a055-de28979676dc',SAFARI_ID='web.onesignal.auto.4bead971-106d-461b-853f-83aecbd62d40';\n  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';\n  var BOX_ID='aparelhoTacsTesteV1Box',STYLE_ID='aparelhoTacsTesteV1Style',operando=false,ultimoEstado=null,oneSignalRef=null,oneSignalTentado=false;"
)
replace_once(
    Path('admin-aparelho-tacs-teste-v1.js'),
    "  function salvarChave(v){try{if(v)localStorage.setItem(tokenStorageKey(),v);else localStorage.removeItem(tokenStorageKey())}catch(e){}}\n  function sessao(){var s={dispositivo:device(),areaId:areaAtual()},t=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',a=sessionStorage.getItem(TOKEN_KEY)||'';if(t)s.territorioToken=t;else if(a)s.token=a;var c=chaveTecnica();if(c)s.chaveTacsTeste=c;return s}",
    "  function salvarChave(v){try{if(v)localStorage.setItem(tokenStorageKey(),v);else localStorage.removeItem(tokenStorageKey())}catch(e){}}\n  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(txt(v).toLowerCase())}\n  function subscriptionId(){try{var p=oneSignalRef&&oneSignalRef.User&&oneSignalRef.User.PushSubscription,s=txt(p&&p.id).toLowerCase();return subValido(s)?s:''}catch(e){return''}}\n  function sessao(){var s={dispositivo:device(),areaId:areaAtual()},t=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',a=sessionStorage.getItem(TOKEN_KEY)||'';if(t)s.territorioToken=t;else if(a)s.token=a;var c=chaveTecnica(),sub=subscriptionId();if(c)s.chaveTacsTeste=c;if(sub)s.subscriptionId=sub;return s}"
)

anchor="  function instalar(){box();consultar();var a=document.getElementById('areaEnvio');"
addition=r'''  function iniciarOneSignalOpcional(){
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
'''
p=ROOT/'admin-aparelho-tacs-teste-v1.js'
text=p.read_text(encoding='utf-8')
if addition not in text:
    if text.count(anchor)!=1:
        raise SystemExit('admin-aparelho-tacs-teste-v1.js: ponto de instalação V6 não encontrado')
    text=text.replace(anchor,addition+anchor,1)
text=text.replace(
    "  function instalar(){box();consultar();var a=document.getElementById('areaEnvio');",
    "  function instalar(){box();consultar();iniciarOneSignalOpcional();var a=document.getElementById('areaEnvio');",
    1
)
p.write_text(text,encoding='utf-8')

# 2) No Portal público, não mostra a confirmação por CPF imediatamente se o OneSignal
# ainda estiver terminando de disponibilizar a subscriptionId do aparelho legado.
# Faz apenas uma espera curta e uma única repetição; moradores comuns continuam no fluxo protegido.
p=ROOT/'portal-identificacao-familia-v1.js'
text=p.read_text(encoding='utf-8')
replace_target="  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription;return text(p&&p.id).toLowerCase()}catch(e){return''}}"
replacement="  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}\n  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription,s=text(p&&p.id).toLowerCase();return subValido(s)?s:''}catch(e){return''}}\n  function aguardarSubscription(limitMs){return new Promise(function(resolve){var inicio=Date.now();function verificar(){var sub=subscriptionId();if(sub){resolve(sub);return}if(Date.now()-inicio>=Number(limitMs||1600)){resolve('');return}setTimeout(verificar,160)}verificar()})}"
if replacement not in text:
    if text.count(replace_target)!=1:
        raise SystemExit('portal-identificacao-familia-v1.js: subscriptionId esperado não encontrado')
    text=text.replace(replace_target,replacement,1)

old_search="  function searchFamily(fam,confirmation){pendingMissing='';pendingType='';hideDoc();setBox('<strong class=\"tacs-family-title\">Procurando a família '+escapeHtml(fam)+'…</strong>','');var p={action:'publico_familia_consultar',areaId:areaId(),familia:fam,subscriptionId:subscriptionId(),dispositivo:deviceId(),chaveTacsTeste:technicalToken()};if(confirmation)p.documentoConfirmacao=digits(confirmation);jsonp(p).then(function(r){if(r&&r.ok===true&&r.autorizada===true){renderMembers(r);return}if(r&&r.requerConfirmacao===true){renderConfirm(r.familiaId||fam,r.message);return}setBox(escapeHtml(r&&r.message||'Não foi possível consultar a família.'),'tacs-family-warn')}).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn')})}"
new_search="  function consultarFamilia(fam,confirmation,repetiu){var p={action:'publico_familia_consultar',areaId:areaId(),familia:fam,subscriptionId:subscriptionId(),dispositivo:deviceId(),chaveTacsTeste:technicalToken()};if(confirmation)p.documentoConfirmacao=digits(confirmation);return jsonp(p).then(function(r){if(r&&r.ok===true&&r.autorizada===true){renderMembers(r);return r}if(r&&r.requerConfirmacao===true&&!repetiu&&!technicalToken()&&!subscriptionId()){setBox('<strong class=\"tacs-family-title\">Verificando a autorização deste aparelho…</strong><p class=\"tacs-family-help\">Aguarde um instante.</p>','');return aguardarSubscription(1800).then(function(sub){if(sub)return consultarFamilia(fam,confirmation,true);renderConfirm(r.familiaId||fam,r.message);return r})}if(r&&r.requerConfirmacao===true){renderConfirm(r.familiaId||fam,r.message);return r}setBox(escapeHtml(r&&r.message||'Não foi possível consultar a família.'),'tacs-family-warn');return r})}\n  function searchFamily(fam,confirmation){pendingMissing='';pendingType='';hideDoc();setBox('<strong class=\"tacs-family-title\">Procurando a família '+escapeHtml(fam)+'…</strong>','');return consultarFamilia(fam,confirmation,false).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn')})}"
if new_search not in text:
    if text.count(old_search)!=1:
        raise SystemExit('portal-identificacao-familia-v1.js: searchFamily esperado não encontrado')
    text=text.replace(old_search,new_search,1)
p.write_text(text,encoding='utf-8')

# 3) Cache-busters V6 e versão pública nova.
OLD='20260821-tacs-device-v5';NEW='20260821-tacs-device-v6'
for path,old,new in [
    ('recados-campanhas-whatsapp-mensal-v12.js','admin-aparelho-tacs-teste-v1.js?v='+OLD,'admin-aparelho-tacs-teste-v1.js?v='+NEW),
    ('painel-oficial-recados-campanhas.html','recados-campanhas-whatsapp-mensal-v12.js?v='+OLD,'recados-campanhas-whatsapp-mensal-v12.js?v='+NEW),
    ('portal-auto-update.js','portal-identificacao-familia-v1.js?v='+OLD,'portal-identificacao-familia-v1.js?v='+NEW),
    ('index.html','portal-auto-update.js?v='+OLD,'portal-auto-update.js?v='+NEW),
]:
    replace_once(Path(path),old,new)

(ROOT/'portal-version.json').write_text(json.dumps({
    'version':'modo-tacs-device-v6-20260821-1136',
    'releasedAt':'2026-08-21T14:36:00Z',
    'scope':'Migração real do aparelho TACS/teste legado e espera curta da identificação técnica antes de pedir CPF/CNS'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 4) Atualiza testes para a ponte opcional de migração. Push continua não sendo requisito.
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace("assert.doesNotMatch(admin,/OneSignal/);","assert.match(admin,/OneSignalDeferred/);\nassert.match(admin,/subscriptionId/);\nassert.doesNotMatch(admin,/requestPermission\\s*\\(|Notifications\\.requestPermission/);")
t=t.replace('admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v5','admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v6')
if "assert.match(familyClient,/aguardarSubscription\\(1800\\)/);" not in t:
    marker="assert.match(familyClient,/nome, nascimento e localidade/);"
    if marker not in t: raise SystemExit('test_aparelho_tacs_teste_v1.js: marcador family não encontrado')
    t=t.replace(marker,marker+"\nassert.match(familyClient,/aguardarSubscription\\(1800\\)/);",1)
p.write_text(t,encoding='utf-8')

p=ROOT/'scripts/test_identificacao_familiar_publica_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace('portal-identificacao-familia-v1\\.js\\?v=202608(?:20-v1|21-tacs-device-v3|21-tacs-device-v5)','portal-identificacao-familia-v1\\.js\\?v=202608(?:20-v1|21-tacs-device-v3|21-tacs-device-v5|21-tacs-device-v6)')
p.write_text(t,encoding='utf-8')

p=ROOT/'scripts/test_quality_gate_v101.js'
t=p.read_text(encoding='utf-8')
t=t.replace('portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3|21-tacs-device-v5)','portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3|21-tacs-device-v5|21-tacs-device-v6)')
p.write_text(t,encoding='utf-8')

print('TACS V6 aplicado: migração legada volta a receber subscriptionId sem tornar Push obrigatório e o Portal espera a identificação técnica antes de pedir documento.')