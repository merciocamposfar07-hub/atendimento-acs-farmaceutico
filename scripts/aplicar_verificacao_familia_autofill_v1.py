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


# 1) OneSignal fica responsável apenas pelas notificações no frontend.
path = 'portal-notification-health.js'
s = read(path)
if 'function showFamilyContext(result)' in s:
    start = s.find('  function showFamilyContext(result){')
    end = s.find('  function checkin(options){', start)
    if start < 0 or end < 0:
        raise SystemExit('notification-health: bloco familiar não localizado com segurança')
    s = s[:start] + s[end:]

s = s.replace(
    "return postCheckin(payload).then(function(result){showFamilyContext(result);if(result&&result.reparoPendente)showPendingRepair(result);else if(result&&payload.reparoAplicado)clearPendingRepair();return result})",
    "return postCheckin(payload).then(function(result){if(result&&result.reparoPendente)showPendingRepair(result);else if(result&&payload.reparoAplicado)clearPendingRepair();return result})"
)
if 'showFamilyContext' in s or 'familyDeviceNotice' in s:
    raise SystemExit('notification-health: a exibição de família ainda depende do OneSignal')
write(path, s)


# 2) Verificação familiar passa a acompanhar o mesmo buscar_morador do autofill.
path = 'moradores-autofill.js'
s = read(path)
if "portalTacsFamiliaAutofillV1:" not in s:
    s = replace_once(
        s,
        "  var ageObserver = null;\n",
        "  var ageObserver = null;\n  var familyMemory = '';\n  var FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'; // FAMILIA_AUTOFILL_SEM_PUSH_V1\n",
        'autofill variáveis familiares'
    )

    anchor = "  function validCpf(value) {\n"
    helpers = """  function familyStorageKey() {\n    return FAMILY_STORAGE_PREFIX + portalAreaId();\n  }\n\n  function familyReference() {\n    if (familyMemory) return familyMemory;\n    try {\n      familyMemory = String(localStorage.getItem(familyStorageKey()) || '').trim().toUpperCase();\n    } catch (e) {}\n    return /^[0-9]{1,4}[A-Z]?$/.test(familyMemory) ? familyMemory : '';\n  }\n\n  function rememberFamilyReference(payload) {\n    var current = familyReference();\n    if (current) return current;\n    var family = String(payload && payload.familiaId || '').trim().toUpperCase();\n    if (!/^[0-9]{1,4}[A-Z]?$/.test(family)) return '';\n    familyMemory = family;\n    try { localStorage.setItem(familyStorageKey(), family); } catch (e) {}\n    return family;\n  }\n\n  function clearFamilyNotice() {\n    var notice = document.getElementById('familyAutofillNotice');\n    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);\n  }\n\n  function applyFamilyContext(payload) {\n    if (!payload || payload.familiaDiferente !== true) {\n      clearFamilyNotice();\n      rememberFamilyReference(payload);\n      return;\n    }\n    var notice = document.getElementById('familyAutofillNotice');\n    if (!notice) {\n      notice = document.createElement('div');\n      notice.id = 'familyAutofillNotice';\n      notice.className = 'info amber full';\n      notice.setAttribute('role', 'status');\n      var status = document.getElementById('cpfStatus');\n      var label = status && status.closest ? status.closest('label') : null;\n      if (label && label.parentNode) label.parentNode.insertBefore(notice, label.nextSibling);\n      else {\n        var form = document.querySelector('.form-panel') || document.body;\n        form.appendChild(notice);\n      }\n    }\n    notice.textContent = payload.messageFamilia || 'Esta pessoa pertence a outro cadastro familiar desta mesma área. Você pode continuar a solicitação normalmente.';\n  }\n\n"""
    idx = s.find(anchor)
    if idx < 0:
        raise SystemExit('autofill: âncora validCpf não localizada')
    s = s[:idx] + helpers + s[idx:]

    s = replace_once(
        s,
        "    window.TACS_MORADOR_ATUAL = null;\n",
        "    window.TACS_MORADOR_ATUAL = null;\n    clearFamilyNotice();\n",
        'autofill limpar aviso familiar'
    )

    s = replace_once(
        s,
        "        if (fillFields(payload)) {\n          setStatus(status,",
        "        if (fillFields(payload)) {\n          applyFamilyContext(payload);\n          setStatus(status,",
        'autofill aplicar contexto após preenchimento'
    )

    s = replace_once(
        s,
        "'&areaId=' + encodeURIComponent(portalAreaId()) + '&callback='",
        "'&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&callback='",
        'autofill JSONP família'
    )

    s = replace_once(
        s,
        "'&areaId=' + encodeURIComponent(portalAreaId()) + '&nonce='",
        "'&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&nonce='",
        'autofill bridge família'
    )

required = [
    "FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'",
    'function applyFamilyContext(payload)',
    "familiaReferencia=' + encodeURIComponent(familyReference())",
    'applyFamilyContext(payload);'
]
for marker in required:
    if marker not in s:
        raise SystemExit('autofill: marcador ausente: ' + marker)
write(path, s)


# 3) Cache bust explícito para iPhone e demais navegadores.
path = 'index.html'
s = read(path)
import re
s, count_notif = re.subn(
    r'portal-notification-health\.js\?v=[^"\']+',
    'portal-notification-health.js?v=20260820-notif-only-v107',
    s,
    count=1
)
s, count_auto = re.subn(
    r'moradores-autofill\.js\?v=[^"\']+',
    'moradores-autofill.js?v=20260820-familia-autofill-v111',
    s,
    count=1
)
if count_notif != 1 or count_auto != 1:
    raise SystemExit(f'index cache bust: notification={count_notif}, autofill={count_auto}')
write(path, s)


# 4) Incluir o módulo desacoplado na publicação do Apps Script.
path = 'scripts/build_apps_script_release.js'
s = read(path)
if "marker: 'TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1'" not in s:
    old = """  {\n    source: 'apps-script/ZZZZ_38_ContinuidadeVinculoFamiliaIphoneV1.gs',\n    marker: 'TACS_CONTINUIDADE_VINCULO_FAMILIA_IPHONE_V1'\n  }\n];"""
    new = """  {\n    source: 'apps-script/ZZZZ_38_ContinuidadeVinculoFamiliaIphoneV1.gs',\n    marker: 'TACS_CONTINUIDADE_VINCULO_FAMILIA_IPHONE_V1'\n  },\n  {\n    source: 'apps-script/ZZZZ_39_VerificacaoFamiliaAutofillV1.gs',\n    marker: 'TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1'\n  }\n];"""
    s = replace_once(s, old, new, 'build release módulo 39')
write(path, s)


# 5) Atualizar o contrato antigo do teste de saúde: família não pertence ao frontend Push.
path = 'scripts/test_notification_health_registry.js'
s = read(path)
s = s.replace(
    'assert(front.includes("if(!oneSignal){showFamilyContext(null);return Promise.resolve(null)}"));',
    'assert(front.includes("if(!oneSignal)return Promise.resolve(null)"));'
)
old_block = """assert(front.includes(\"var FAMILY_STORAGE_PREFIX='portalTacsFamiliaConfirmadaV1:'\"));\nassert(front.includes(\"localStorage.setItem(familyStorageKey(),family)\"));\nassert(!front.includes('sessionStorage.setItem'));\nassert(!/localStorage\\.setItem\\([^\\n]{0,120}(cpf|cns|documento)/i.test(front));"""
new_block = """assert(!front.includes('familyDeviceNotice'));\nassert(!front.includes('showFamilyContext'));\nassert(!front.includes('localStorage.setItem')&&!front.includes('sessionStorage.setItem'));"""
if old_block in s:
    s = s.replace(old_block, new_block, 1)
elif new_block not in s:
    raise SystemExit('teste saúde: bloco de armazenamento antigo não localizado')
write(path, s)


# 6) Estender o teste de vínculo já existente para cobrir o desacoplamento do autofill.
path = 'scripts/test_vinculo_familiar_notificacoes_v1.js'
s = read(path)
marker = 'VERIFICACAO_FAMILIA_AUTOFILL_V1_TESTS_OK'
if marker not in s:
    extra = r'''

const FAMILY_AUTOFILL_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'ZZZZ_39_VerificacaoFamiliaAutofillV1.gs'),
  'utf8'
);
const AUTOFILL_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'moradores-autofill.js'), 'utf8');
const NOTIFICATION_FRONT_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'portal-notification-health.js'), 'utf8');
const INDEX_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(FAMILY_AUTOFILL_SOURCE.includes("TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1=Object.freeze({VERSAO:'1.0.0'})"));
assert(FAMILY_AUTOFILL_SOURCE.includes('vinculoFamiliarNotifV1CodigoEndereco_'));
assert(FAMILY_AUTOFILL_SOURCE.includes('vinculoFamiliarNotifV1Decidir_'));
assert(FAMILY_AUTOFILL_SOURCE.includes("action!=='buscar_morador'&&action!=='buscar_morador_bridge'"));
assert(AUTOFILL_SOURCE.includes("FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'"));
assert(AUTOFILL_SOURCE.includes("familiaReferencia=' + encodeURIComponent(familyReference())"));
assert(AUTOFILL_SOURCE.includes('applyFamilyContext(payload);'));
assert(AUTOFILL_SOURCE.includes("notice.id = 'familyAutofillNotice'"));
assert(!NOTIFICATION_FRONT_SOURCE.includes('familyDeviceNotice'));
assert(!NOTIFICATION_FRONT_SOURCE.includes('showFamilyContext'));
assert(INDEX_SOURCE.includes('portal-notification-health.js?v=20260820-notif-only-v107'));
assert(INDEX_SOURCE.includes('moradores-autofill.js?v=20260820-familia-autofill-v111'));
console.log('VERIFICACAO_FAMILIA_AUTOFILL_V1_TESTS_OK');
'''
    s = s + extra
write(path, s)

print('Verificação familiar desacoplada do Push preparada com escopo estrito.')
