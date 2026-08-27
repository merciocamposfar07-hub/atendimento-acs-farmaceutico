from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

public = ROOT / 'apps-script/ZZ_12_PublicoAgendasPortalV1.gs'
text = public.read_text(encoding='utf-8')
old = """  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (isNaN(valor.getTime())) return '';
    return Utilities.formatDate(
      valor,
      PUBLICO_AGENDAS_PORTAL_V1.FUSO,
      'yyyy-MM-dd'
    );
  }"""
new = """  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (isNaN(valor.getTime())) return '';
    // DATA da agenda é uma data civil. Não converter meia-noite UTC para Recife,
    // pois isso faz 28/08 virar 27/08 e fecha indevidamente a vaga do dia seguinte.
    return String(valor.getUTCFullYear()).padStart(4, '0') + '-' +
      String(valor.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(valor.getUTCDate()).padStart(2, '0');
  }"""
if old not in text:
    raise SystemExit('Trecho público de data civil não localizado exatamente uma vez.')
public.write_text(text.replace(old, new, 1), encoding='utf-8')

territorial = ROOT / 'apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs'
text = territorial.read_text(encoding='utf-8')
old = "function agendasProfissionaisTerritoriaisV1Data_(v){if(!v)return'';if(Object.prototype.toString.call(v)==='[object Date]'){if(isNaN(v.getTime()))return'';return Utilities.formatDate(v,'America/Recife','yyyy-MM-dd');}var s=agendasProfissionaisTerritoriaisV1Texto_(v),m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);return m?m[3]+'-'+m[2]+'-'+m[1]:'';}"
new = "function agendasProfissionaisTerritoriaisV1Data_(v){if(!v)return'';if(Object.prototype.toString.call(v)==='[object Date]'){if(isNaN(v.getTime()))return'';return String(v.getUTCFullYear()).padStart(4,'0')+'-'+String(v.getUTCMonth()+1).padStart(2,'0')+'-'+String(v.getUTCDate()).padStart(2,'0');}var s=agendasProfissionaisTerritoriaisV1Texto_(v),m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);return m?m[3]+'-'+m[2]+'-'+m[1]:'';}"
if old not in text:
    raise SystemExit('Trecho territorial de data civil não localizado exatamente uma vez.')
territorial.write_text(text.replace(old, new, 1), encoding='utf-8')

test = ROOT / 'scripts/test_agenda_data_civil_v1.js'
test.write_text("""'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(file){const c={console,Date,Object,String,Number,Boolean,Math,JSON,RegExp,Error};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});return c;}
const a=load('apps-script/ZZ_12_PublicoAgendasPortalV1.gs');
const b=load('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const d=new Date('2026-08-28T00:00:00.000Z');
assert.equal(a.publicoAgendasV1DataIso_(d),'2026-08-28');
assert.equal(b.agendasProfissionaisTerritoriaisV1Data_(d),'2026-08-28');
assert.equal(a.publicoAgendasV1DataIso_('28/08/2026'),'2026-08-28');
assert.equal(b.agendasProfissionaisTerritoriaisV1Data_('28/08/2026'),'2026-08-28');
console.log('AGENDA_DATA_CIVIL_V1_OK');
""", encoding='utf-8')

package = ROOT / 'package.json'
text = package.read_text(encoding='utf-8')
needle = 'node scripts/test_agenda_data_civil_v1.js'
if needle not in text:
    anchor = 'node scripts/test_public_agendas_apps_script.js && '
    if anchor not in text:
        raise SystemExit('Ponto de inclusão no package.json não localizado.')
    package.write_text(text.replace(anchor, anchor + needle + ' && ', 1), encoding='utf-8')

(ROOT / '.github/apps-script-release-request').write_text(
    'AGENDA_MEDICA_DATA_CIVIL_V1_20260827_DEPLOY1\n', encoding='utf-8'
)

print('AGENDA_MEDICA_DATA_CIVIL_PATCH_OK')
