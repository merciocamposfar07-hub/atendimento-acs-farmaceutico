'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const core=read('conecta-module-core-v1.js');
const morador=read('conecta-morador-session-v1.js');
const index=read('index.html');

// Painéis: resposta visual local, cache primeiro, remoto depois.
assert.match(central,/PRECARREGAMENTO_REAL_PAINEIS_2026_09_16_V1/);
assert.match(central,/schedulePanelRuntimePrewarm\(\)/);
assert.match(central,/showShellFrame\(name,frame,title\|\|'Painel',routeId\)/);
assert.match(core,/prime:performancePrime/);
assert.match(core,/commit:performanceCommit/);
assert.match(core,/requiresRemote:true/);
assert.match(core,/localStorage\.setItem\(key,JSON\.stringify\(item\)\)/);

// Morador: família é aquecida antes do toque e o toque não espera Apps Script.
assert.match(morador,/RESPOSTA_IMEDIATA_MORADOR_2026_09_16_V1/);
assert.match(morador,/familyMemberCache=\{\},familyMemberLoads=\{\},familyWarmGeneration=0/);
assert.match(morador,/warmFamilyMembers\(Array\.isArray\(resident\.familia\)\?resident\.familia:\[\]\)/);
assert.match(morador,/function resolveFamilyMember\(tok\)/);
assert.match(morador,/if\(familyMemberCache\[key\]\)return Promise\.resolve\(familyMemberCache\[key\]\)/);
assert.match(morador,/function warmFamilyMembers\(members\)/);
assert.match(morador,/\.csc-family-person:active\{transform:scale\(\.985\)/);

const start=morador.indexOf('function selectFamilyMember(button)');
const end=morador.indexOf('function promptMemberCpf',start);
assert.ok(start>=0&&end>start,'selectFamilyMember não encontrado');
const select=morador.slice(start,end);
const visual=select.indexOf("classList.toggle('active',x===button)");
const local=select.indexOf("setField('name',name);setField('birth',birth)");
const remote=select.indexOf('resolveFamilyMember(tok)');
assert.ok(visual>=0&&local>visual&&remote>local,'O toque do familiar voltou a esperar a rede antes da resposta local.');
assert.match(select,/if\(cached\)\{applyFamilyMemberData\(cached,name,birth\);return\}/);

// O HTML publicado precisa carregar a revisão nova.
assert.match(index,/conecta-morador-session-v1\.js\?v=(?:17e3f567c705|34dbc4fee357)/);

console.log('RESPOSTA_IMEDIATA_CONECTA_OK: painéis preservam shell/cache-first e o Portal do Morador responde localmente antes da consulta remota.');
