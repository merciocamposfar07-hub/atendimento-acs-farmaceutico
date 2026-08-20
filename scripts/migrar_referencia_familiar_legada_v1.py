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


path = 'moradores-autofill.js'
s = read(path)

if 'FAMILIA_AUTOFILL_MIGRA_LEGADO_V1' not in s:
    s = replace_once(
        s,
        "  var FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'; // FAMILIA_AUTOFILL_SEM_PUSH_V1\n",
        "  var FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'; // FAMILIA_AUTOFILL_SEM_PUSH_V1\n  var LEGACY_FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaConfirmadaV1:'; // FAMILIA_AUTOFILL_MIGRA_LEGADO_V1\n",
        'prefixo legado'
    )

    old = """  function familyStorageKey() {\n    return FAMILY_STORAGE_PREFIX + portalAreaId();\n  }\n\n  function familyReference() {\n    if (familyMemory) return familyMemory;\n    try {\n      familyMemory = String(localStorage.getItem(familyStorageKey()) || '').trim().toUpperCase();\n    } catch (e) {}\n    return /^[0-9]{1,4}[A-Z]?$/.test(familyMemory) ? familyMemory : '';\n  }\n"""
    new = """  function familyStorageKey() {\n    return FAMILY_STORAGE_PREFIX + portalAreaId();\n  }\n\n  function legacyFamilyStorageKey() {\n    return LEGACY_FAMILY_STORAGE_PREFIX + portalAreaId();\n  }\n\n  function validFamilyCode(value) {\n    return /^[0-9]{1,4}[A-Z]?$/.test(String(value || '').trim().toUpperCase());\n  }\n\n  function familyReference() {\n    if (validFamilyCode(familyMemory)) return familyMemory;\n    try {\n      var current = String(localStorage.getItem(familyStorageKey()) || '').trim().toUpperCase();\n      var legacy = String(localStorage.getItem(legacyFamilyStorageKey()) || '').trim().toUpperCase();\n      familyMemory = validFamilyCode(current) ? current : (validFamilyCode(legacy) ? legacy : '');\n      if (familyMemory && !current) localStorage.setItem(familyStorageKey(), familyMemory);\n    } catch (e) {}\n    return validFamilyCode(familyMemory) ? familyMemory : '';\n  }\n"""
    s = replace_once(s, old, new, 'migração da referência familiar')

if 'FAMILIA_AUTOFILL_MIGRA_LEGADO_V1' not in s:
    raise SystemExit('autofill: marcador de migração legada ausente')
if "LEGACY_FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaConfirmadaV1:'" not in s:
    raise SystemExit('autofill: prefixo legado ausente')
if 'localStorage.getItem(legacyFamilyStorageKey())' not in s:
    raise SystemExit('autofill: leitura legada ausente')
if 'localStorage.setItem(familyStorageKey(), familyMemory)' not in s:
    raise SystemExit('autofill: migração para a chave nova ausente')
write(path, s)


path = 'index.html'
s = read(path)
s = replace_once(
    s,
    'moradores-autofill.js?v=20260820-familia-autofill-v111',
    'moradores-autofill.js?v=20260820-familia-autofill-v112',
    'cache bust autofill v112'
)
write(path, s)


path = 'scripts/test_vinculo_familiar_notificacoes_v1.js'
s = read(path)
s = s.replace(
    "assert(INDEX_SOURCE.includes('moradores-autofill.js?v=20260820-familia-autofill-v111'));",
    "assert(INDEX_SOURCE.includes('moradores-autofill.js?v=20260820-familia-autofill-v112'));"
)
if "FAMILIA_AUTOFILL_MIGRA_LEGADO_V1" not in s:
    anchor = "assert(AUTOFILL_SOURCE.includes(\"FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'\"));\n"
    extra = (
        anchor
        + "assert(AUTOFILL_SOURCE.includes(\"LEGACY_FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaConfirmadaV1:'\"));\n"
        + "assert(AUTOFILL_SOURCE.includes('FAMILIA_AUTOFILL_MIGRA_LEGADO_V1'));\n"
        + "assert(AUTOFILL_SOURCE.includes('localStorage.getItem(legacyFamilyStorageKey())'));\n"
        + "assert(AUTOFILL_SOURCE.includes('localStorage.setItem(familyStorageKey(), familyMemory)'));\n"
    )
    if anchor not in s:
        raise SystemExit('teste: âncora do autofill não localizada')
    s = s.replace(anchor, extra, 1)
write(path, s)

print('Referência familiar legada migrada para o autofill desacoplado.')
