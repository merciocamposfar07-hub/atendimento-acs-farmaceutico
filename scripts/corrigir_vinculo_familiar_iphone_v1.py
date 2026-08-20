from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 trecho, encontrado {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: início não encontrado')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'{label}: fim não encontrado')
    return text[:a] + replacement + text[b:]


# 1) Frontend: preservar contexto familiar e aguardar a identidade Push sem mutar o OneSignal.
path = 'portal-notification-health.js'
s = read(path)
if 'FAMILIA_RESILIENTE_IPHONE_V1' not in s:
    s = replace_once(
        s,
        "  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0;",
        "  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0,familyCheckTimer=null;\n  var FAMILY_STORAGE_PREFIX='portalTacsFamiliaConfirmadaV1:'; // FAMILIA_RESILIENTE_IPHONE_V1",
        'frontend variáveis'
    )

    helper_start = "  function state(){"
    helper_block = """  function familyStorageKey(){return FAMILY_STORAGE_PREFIX+areaId()}\n  function familyCodeFromResident(resident){\n    var value=text(resident&&(resident.endereco||resident.localidade||resident.comunidade)).toUpperCase();\n    if(!value)return '';\n    try{if(value.normalize)value=value.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}catch(e){}\n    var match=value.match(/,\\s*([0-9]{1,4}[A-Z]?)\\s*\\.\\s*(?:ZONA\\s+RURAL\\b|ZONA\\b|RURAL\\b)/);\n    if(!match)match=value.match(/,\\s*([0-9]{1,4}[A-Z]?)\\s*\\./);\n    return match?text(match[1]).toUpperCase():'';\n  }\n  function readConfirmedFamily(){try{return text(localStorage.getItem(familyStorageKey())).toUpperCase()}catch(e){return ''}}\n  function rememberConfirmedFamily(result){\n    var family=text(result&&result.familiaId).toUpperCase();\n    if(!family)return '';\n    try{localStorage.setItem(familyStorageKey(),family)}catch(e){}\n    return family;\n  }\n  function waitSubscriptionState(limitMs){return new Promise(function(resolve){var start=Date.now();function test(){var st=state();if(uuid(st.subscriptionId)){resolve(st);return}if(Date.now()-start>=Number(limitMs||9000)){resolve(st);return}setTimeout(test,250)}test()})}\n"""
    idx = s.find(helper_start)
    if idx < 0:
        raise SystemExit('frontend: âncora state não encontrada')
    s = s[:idx] + helper_block + s[idx:]

    new_show = """  function showFamilyContext(result){\n    if(result&&result.familiaId)rememberConfirmedFamily(result);\n    var linkedFamily=readConfirmedFamily(),residentFamily=familyCodeFromResident(currentResident);\n    var different=Boolean(result&&result.familiaDiferente===true);\n    if(!different&&linkedFamily&&residentFamily)different=linkedFamily!==residentFamily;\n    var notice=document.getElementById('familyDeviceNotice');\n    if(!different){if(notice&&notice.parentNode)notice.parentNode.removeChild(notice);return}\n    if(!notice){\n      notice=document.createElement('div');notice.id='familyDeviceNotice';notice.className='info amber full';notice.setAttribute('role','status');\n      var status=document.getElementById('cpfStatus'),label=status&&status.closest?status.closest('label'):null;\n      if(label&&label.parentNode)label.parentNode.insertBefore(notice,label.nextSibling);else{var form=document.querySelector('.form-panel')||document.body;form.appendChild(notice)}\n    }\n    notice.textContent='Esta pessoa pertence a outro cadastro familiar desta mesma área. Você pode continuar a solicitação normalmente.';\n  }\n"""
    s = replace_between(s, '  function showFamilyContext(result){', '  function checkin(options){', new_show, 'frontend showFamilyContext')

    new_checkin = """  function checkin(options){\n    options=options||{};\n    if(!oneSignal){showFamilyContext(null);return Promise.resolve(null)}\n    var initial=state();\n    var ready=uuid(initial.subscriptionId)?Promise.resolve(initial):waitSubscriptionState(10000);\n    return ready.then(function(st){\n      if(!uuid(st.subscriptionId)){showFamilyContext(null);return null}\n      var info=deviceInfo(),doc=documentValue(),payload={subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false',optedIn:st.optedIn?'true':'false',tokenAtivo:st.token?'true':'false',areaConfirmada:st.areaConfirmed?'true':'false',tipoAparelho:info.device,navegador:info.browser,sistema:info.os,reparoAplicado:text(options.reparoAplicado||'')};\n      if(validDocument(doc))payload.documento=doc;\n      if(options.reparoAplicado&&pendingRepairSubscriptionId)payload.reparoSubscriptionOriginal=pendingRepairSubscriptionId;\n      var fp=[payload.subscriptionId,payload.areaId,payload.permission,payload.optedIn,payload.tokenAtivo,payload.areaConfirmada,payload.reparoAplicado,payload.reparoSubscriptionOriginal||'',payload.documento||''].join('|');\n      if(!options.force&&fp===lastFingerprint){showFamilyContext(null);return null}\n      lastFingerprint=fp;\n      return postCheckin(payload).then(function(result){\n        if(result&&result.familiaId)rememberConfirmedFamily(result);\n        showFamilyContext(result);\n        if(result&&result.reparoPendente)showPendingRepair(result);else if(result&&payload.reparoAplicado)clearPendingRepair();\n        return result;\n      }).catch(function(){lastFingerprint='';showFamilyContext(null);return null});\n    });\n  }\n"""
    s = replace_between(s, '  function checkin(options){', '  function scheduleCheckin(force){', new_checkin, 'frontend checkin')

    s = replace_between(
        s,
        '  function scheduleCheckin(force){',
        "  document.addEventListener('click'",
        "  function scheduleCheckin(force){clearTimeout(familyCheckTimer);familyCheckTimer=setTimeout(function(){familyCheckTimer=null;checkin({force:Boolean(force)})},350)}\n",
        'frontend schedule'
    )

    s = replace_once(
        s,
        "  document.addEventListener('tacs:morador',function(event){currentResident=event&&event.detail||null;scheduleCheckin(true)});",
        "  document.addEventListener('tacs:morador',function(event){currentResident=event&&event.detail||null;showFamilyContext(null);scheduleCheckin(true)});\n  document.addEventListener('input',function(event){var target=event&&event.target;if(!target||target.id!=='cpf')return;currentResident=null;showFamilyContext(null)},true);",
        'frontend evento morador'
    )

    s = replace_once(
        s,
        "if(window.TACS_MORADOR_ATUAL)currentResident=window.TACS_MORADOR_ATUAL;scheduleCheckin(true)});",
        "if(window.TACS_MORADOR_ATUAL)currentResident=window.TACS_MORADOR_ATUAL;showFamilyContext(null);scheduleCheckin(true)});",
        'frontend OneSignal init'
    )
    write(path, s)


# 2) Backend: recuperar vínculo familiar quando o OneSignal renovar a Subscription ID.
path = 'apps-script/ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'
s = read(path)
if "VERSAO:'1.0.2'" not in s:
    s = replace_once(s, 'V1.0.1', 'V1.0.2', 'backend cabeçalho versão')
    s = replace_once(s, "VERSAO:'1.0.1'", "VERSAO:'1.0.2'", 'backend constante versão')

    new_checkin = """function vinculoFamiliarNotifV1Checkin_(p){\n  p=p&&typeof p==='object'?p:{};\n  var subscriptionId=vinculoFamiliarNotifV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();\n  var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||'JAPARANDUBA');\n  var documento=p.documento||p.cpf||p.cns||'';\n  var vinculo=vinculoFamiliarNotifV1Ler_(subscriptionId,areaId);\n  var morador=vinculoFamiliarNotifV1ResolverMoradorDocumento_(documento,areaId);\n\n  if(!vinculo){\n    var legado=vinculoFamiliarNotifV1ResolverLegado_(subscriptionId,areaId);\n    if(legado&&legado.familiaId){\n      vinculo=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,legado,'MIGRADO_ID_PORTAL');\n    }\n  }\n\n  if(vinculo){\n    vinculo=vinculoFamiliarNotifV1ReconciliarReferencia_(vinculo,areaId);\n  }\n\n  var resultado;\n  if(vinculo){\n    var parametros=Object.assign({},p);\n    delete parametros.documento;\n    delete parametros.cpf;\n    delete parametros.cns;\n    resultado=vinculoFamiliarNotifV1CheckinAnterior_(parametros);\n  }else{\n    // Primeiro deixa o check-in oficial registrar a identidade OneSignal da inscrição atual.\n    // Depois recupera, de forma somente-leitura, o vínculo familiar de uma inscrição anterior\n    // pertencente ao mesmo usuário OneSignal. O envio Push não é alterado.\n    resultado=vinculoFamiliarNotifV1CheckinAnterior_(p);\n    var continuidade=vinculoFamiliarNotifV1ResolverContinuidade_(subscriptionId,areaId);\n    if(continuidade&&continuidade.familiaId){\n      vinculo=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,continuidade,'MIGRADO_ONESIGNAL_ID');\n      if(vinculo)vinculo=vinculoFamiliarNotifV1ReconciliarReferencia_(vinculo,areaId);\n    }\n  }\n\n  var decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);\n  if(decisao.acao==='VINCULAR'){\n    vinculo=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,morador,'DOCUMENTO_VALIDADO');\n    decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);\n  }\n\n  if(!resultado||typeof resultado!=='object')resultado={ok:true};\n  resultado.vinculadoFamilia=Boolean(vinculo&&vinculo.familiaId);\n  resultado.familiaId=vinculo&&vinculo.familiaId?vinculo.familiaId:'';\n  resultado.familiaDiferente=decisao.acao==='OUTRA_FAMILIA';\n  resultado.familiaBeneficiario=morador&&morador.familiaId?morador.familiaId:'';\n  if(resultado.familiaDiferente){\n    resultado.message='Esta pessoa pertence a outro cadastro familiar desta mesma área. A solicitação pode continuar normalmente.';\n  }\n  return resultado;\n}\n\n"""
    s = replace_between(s, 'function vinculoFamiliarNotifV1Checkin_(p){', 'function vinculoFamiliarNotifV1Decidir_(', new_checkin, 'backend checkin')

    continuity = """function vinculoFamiliarNotifV1ResolverContinuidade_(subscriptionId,areaId){\n  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId))return null;\n  var ss=tacsTerritorioV1Planilha_();\n  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);\n  var last=registry.getLastRow();if(last<=1)return null;\n  var rows=registry.getRange(2,1,last-1,4).getDisplayValues();\n  var onesignalId='',i;\n  for(i=rows.length-1;i>=0;i--){\n    if(vinculoFamiliarNotifV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;\n    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;\n    onesignalId=vinculoFamiliarNotifV1Texto_(rows[i][3]).toLowerCase();\n    if(onesignalId)break;\n  }\n  if(!onesignalId)return null;\n  for(i=rows.length-1;i>=0;i--){\n    var antiga=vinculoFamiliarNotifV1Texto_(rows[i][0]).toLowerCase();\n    if(!antiga||antiga===subscriptionId)continue;\n    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;\n    if(vinculoFamiliarNotifV1Texto_(rows[i][3]).toLowerCase()!==onesignalId)continue;\n    var vinculo=vinculoFamiliarNotifV1Ler_(antiga,areaId);\n    if(vinculo&&vinculo.familiaId)return vinculo;\n  }\n  return null;\n}\n\n"""
    anchor = 'function vinculoFamiliarNotifV1ResolverLegado_(subscriptionId,areaId){'
    idx = s.find(anchor)
    if idx < 0:
        raise SystemExit('backend: âncora ResolverLegado não encontrada')
    s = s[:idx] + continuity + s[idx:]
    write(path, s)


# 3) Cache bust: garantir que o iPhone não continue executando um JS antigo.
path = 'index.html'
s = read(path)
s = s.replace('portal-notification-health.js?v=20260813-notif-health-v106', 'portal-notification-health.js?v=20260820-familia-resiliente-v1')
s = s.replace('moradores-autofill.js?v=20260817-aguarde-v110', 'moradores-autofill.js?v=20260820-aguarde-v111')
if 'portal-notification-health.js?v=20260820-familia-resiliente-v1' not in s:
    raise SystemExit('index: cache bust de notification-health não aplicado')
if 'moradores-autofill.js?v=20260820-aguarde-v111' not in s:
    raise SystemExit('index: cache bust de moradores-autofill não aplicado')
write(path, s)

print('Correção de vínculo familiar iPhone aplicada com escopo estrito.')
