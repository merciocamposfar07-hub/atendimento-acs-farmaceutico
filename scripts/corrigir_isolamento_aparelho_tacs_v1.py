from pathlib import Path
import re

backend = Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs')
s = backend.read_text(encoding='utf-8')
pattern = r"function aparelhoTacsTesteV1Checkin_\(p\)\{\n.*?^\}\n"
novo = """function aparelhoTacsTesteV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id),area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'JAPARANDUBA');
  var device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.dispositivoTacs||p.deviceId),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||'');
  var tokenAutorizado=Boolean(device&&chave&&aparelhoTacsTesteV1TokenValido_(device,area,chave));
  if(sub&&tokenAutorizado)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);
  var protegido=tokenAutorizado;
  if(!protegido&&sub)protegido=Boolean(aparelhoTacsTesteV1MapaAtivos_(area)[sub]);
  if(!sub||!protegido)return aparelhoTacsTesteV1CheckinAnterior_(p);
  aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area);
  aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area);
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});
  delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=aparelhoTacsTesteV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};
  resultado.aparelhoTacsTeste=true;resultado.vinculadoMorador=false;resultado.vinculadoFamilia=false;resultado.familiaId='';resultado.familiaDiferente=false;
  resultado.message='Aparelho TACS / teste ativo. Este aparelho fica fora de vínculos com moradores e famílias durante os testes.';
  return resultado;
}
"""
s2, n = re.subn(pattern, novo, s, count=1, flags=re.S|re.M)
if n != 1:
    if 'var protegido=tokenAutorizado;' not in s:
        raise SystemExit('Função de check-in TACS não encontrada; abortando.')
    s2 = s
backend.write_text(s2, encoding='utf-8')

front = Path('portal-notification-health.js')
f = front.read_text(encoding='utf-8')
marker = "  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0,familyCheckTimer=null;\n"
helpers = """  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0,familyCheckTimer=null;
  var TEST_DEVICE_KEY='portalTacsDispositivoV1',TEST_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';
"""
if "TEST_DEVICE_KEY='portalTacsDispositivoV1'" not in f:
    if marker not in f:
        raise SystemExit('Ponto de inserção do modo TACS não encontrado.')
    f = f.replace(marker, helpers, 1)

helper_marker = "  function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}\n"
helper_code = helper_marker + """  function testDeviceId(){try{return text(localStorage.getItem(TEST_DEVICE_KEY)||'')}catch(e){return''}}
  function testTechnicalToken(device){device=text(device);if(!device)return'';try{return text(localStorage.getItem(TEST_TOKEN_PREFIX+areaId()+':'+device)||'')}catch(e){return''}}
  function testHandoffPending(){try{return /(?:^|[#&])tacsTeste=/.test(String(location.hash||''))}catch(e){return false}}
"""
if 'function testTechnicalToken(device)' not in f:
    if helper_marker not in f:
        raise SystemExit('Helper UUID não encontrado.')
    f = f.replace(helper_marker, helper_code, 1)

old_payload = """      var info=deviceInfo(),doc=documentValue(),payload={subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false',optedIn:st.optedIn?'true':'false',tokenAtivo:st.token?'true':'false',areaConfirmada:st.areaConfirmed?'true':'false',tipoAparelho:info.device,navegador:info.browser,sistema:info.os,reparoAplicado:text(options.reparoAplicado||'')};
      if(validDocument(doc))payload.documento=doc;
"""
new_payload = """      var info=deviceInfo(),doc=documentValue(),testDevice=testDeviceId(),testToken=testTechnicalToken(testDevice),testMode=Boolean(testDevice&&testToken)||testHandoffPending(),payload={subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false',optedIn:st.optedIn?'true':'false',tokenAtivo:st.token?'true':'false',areaConfirmada:st.areaConfirmed?'true':'false',tipoAparelho:info.device,navegador:info.browser,sistema:info.os,reparoAplicado:text(options.reparoAplicado||'')};
      if(testDevice)payload.dispositivo=testDevice;
      if(testToken)payload.chaveTacsTeste=testToken;
      if(!testMode&&validDocument(doc))payload.documento=doc;
"""
if old_payload in f:
    f = f.replace(old_payload, new_payload, 1)
elif 'if(!testMode&&validDocument(doc))payload.documento=doc;' not in f:
    raise SystemExit('Payload de check-in esperado não encontrado.')

old_fp = "      var fp=[payload.subscriptionId,payload.areaId,payload.permission,payload.optedIn,payload.tokenAtivo,payload.areaConfirmada,payload.reparoAplicado,payload.reparoSubscriptionOriginal||'',payload.documento||''].join('|');"
new_fp = "      var fp=[payload.subscriptionId,payload.areaId,payload.permission,payload.optedIn,payload.tokenAtivo,payload.areaConfirmada,payload.reparoAplicado,payload.reparoSubscriptionOriginal||'',payload.dispositivo||'',payload.chaveTacsTeste?'TACS_TESTE':'',payload.documento||''].join('|');"
if old_fp in f:
    f = f.replace(old_fp, new_fp, 1)
elif new_fp not in f:
    raise SystemExit('Fingerprint do check-in não encontrado.')
front.write_text(f, encoding='utf-8')

index = Path('index.html')
h = index.read_text(encoding='utf-8')
h2 = re.sub(r"portal-notification-health\.js\?v=[^\"']+", 'portal-notification-health.js?v=20260826-tacs-test-isolation-v1', h, count=1)
if h2 == h and 'portal-notification-health.js?v=20260826-tacs-test-isolation-v1' not in h:
    raise SystemExit('Referência do health JS não encontrada.')
index.write_text(h2, encoding='utf-8')

release = Path('.github/apps-script-release-request')
release.write_text('ISOLAMENTO_APARELHO_TACS_TESTE_V1_20260826\n', encoding='utf-8')

b = backend.read_text(encoding='utf-8')
f = front.read_text(encoding='utf-8')
h = index.read_text(encoding='utf-8')
assert 'var protegido=tokenAutorizado;' in b
assert 'aparelhoTacsTesteV1MapaAtivos_(area)[sub]' in b
assert 'aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area)' in b
assert 'aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area)' in b
assert 'resultado.vinculadoMorador=false' in b
assert 'payload.dispositivo=testDevice' in f
assert 'payload.chaveTacsTeste=testToken' in f
assert 'if(!testMode&&validDocument(doc))payload.documento=doc' in f
assert '20260826-tacs-test-isolation-v1' in h
print('ISOLAMENTO_TACS_TESTE_OK')
