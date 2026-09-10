'use strict';
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
