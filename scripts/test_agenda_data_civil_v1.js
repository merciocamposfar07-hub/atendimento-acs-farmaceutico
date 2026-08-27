'use strict';
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
