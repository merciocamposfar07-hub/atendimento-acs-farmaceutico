from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# A DATA da agenda é uma data civil. A planilha já exibe a data correta
# (ex.: 11/09/2026); portanto o portal deve ler esse texto exibido e não o
# objeto Date bruto do Google Sheets, que pode sofrer deslocamento de fuso.
public = ROOT / 'apps-script/ZZ_12_PublicoAgendasPortalV1.gs'
text = public.read_text(encoding='utf-8')
old = "    var dataBruta = publicoAgendasV1Valor_(valores[linha], indices.data);"
new = """    // DATA da agenda é civil: usar exatamente o valor exibido na planilha.
    // Isso impede que 11/09/2026 seja publicado como 10/09/2026 por conversão de fuso.
    var dataBruta = publicoAgendasV1Valor_(exibidos[linha], indices.data);"""

if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Ponto de leitura da data da agenda não localizado com segurança.')

# Versão apenas para rastrear a correção pública e facilitar invalidação/diagnóstico.
if "VERSAO: '1.3.0'" in text:
    text = text.replace("VERSAO: '1.3.0'", "VERSAO: '1.3.1'", 1)
elif "VERSAO: '1.3.1'" not in text:
    raise SystemExit('Versão do módulo público de agendas não reconhecida.')

public.write_text(text, encoding='utf-8')

test = ROOT / 'scripts/test_agenda_data_civil_v1.js'
test.write_text("""'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps-script/ZZ_12_PublicoAgendasPortalV1.gs'),'utf8');
assert.match(source,/var dataBruta = publicoAgendasV1Valor_\(exibidos\[linha\], indices\.data\);/);
assert.doesNotMatch(source,/var dataBruta = publicoAgendasV1Valor_\(valores\[linha\], indices\.data\);/);
function load(file){
  const c={console,Date,Object,String,Number,Boolean,Math,JSON,RegExp,Error};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
  return c;
}
const a=load('apps-script/ZZ_12_PublicoAgendasPortalV1.gs');
assert.equal(a.publicoAgendasV1DataIso_('11/09/2026'),'2026-09-11');
assert.equal(a.publicoAgendasV1DataIso_('2026-09-11'),'2026-09-11');
console.log('AGENDA_DATA_CIVIL_DISPLAY_V2_OK');
""", encoding='utf-8')

print('AGENDA_MEDICA_DATA_CIVIL_DISPLAY_PATCH_OK')
