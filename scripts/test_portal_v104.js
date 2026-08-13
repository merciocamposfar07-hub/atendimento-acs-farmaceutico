'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const index=read('index.html');
const agenda=read('agenda-enfermeira.js');
const integral=read('portal-controle-integral.js');

// Somente os dois módulos alterados recebem cachebuster novo.
assert.match(index,/agenda-enfermeira\.js\?v=20260813-portal-v104/);
assert.match(index,/portal-controle-integral\.js\?v=20260813-portal-v104/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260812-desempenho-v101/,'Odontologia não pode ser alterada neste pacote');
assert.match(index,/portal-ajustes-finais\.js\?v=20260806-profissionais-dinamicos-v1/,'Regras finais do formulário devem permanecer intactas');
assert.match(index,/portal-auto-update\.js\?v=20260812-v101/,'Motor de atualização não deve ser reescrito neste pacote');

// Há somente um renderizador ATIVO das agendas profissionais.
assert.match(integral,/function render\(data\)\{if\(!data\|\|data\.ok===false\)return;lastData=data;renderAlerts\(data\)\}/);
assert.doesNotMatch(integral,/function render\(data\)[^\n]*renderLegacy\('medica'/,'Camada antiga não pode redesenhar a agenda da Médica');
assert.match(integral,/function renderLegacy\(/,'Fallback histórico deve permanecer no arquivo; não apagar código funcional sem necessidade');

// Regras funcionais das agendas permanecem presentes.
assert.match(agenda,/item\.active === true &&\s*item\.closedNow !== true &&\s*!unavailableStatus\(item\.status\)/);
assert.match(agenda,/category\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
assert.match(agenda,/subject\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/);
assert.match(agenda,/window\.portalTacsSincronizar = syncPortal/);
assert.match(agenda,/window\.PortalTacsPublicData\.get\(\)/,'Agenda deve continuar usando a camada única de dados públicos/cache');

// Aparência mais viva sem usar opacity global nos dias indisponíveis.
assert.match(agenda,/\.portal-agenda\{[^}]*background:#e7f5fb/);
assert.match(agenda,/data-module=\\"nutricionista\\"[^}]*background:#e9f9ef/);
assert.match(agenda,/\.agenda-day:disabled\{opacity:1;background:#fff3f2/);
assert.doesNotMatch(agenda,/\.agenda-day:disabled\{opacity:\.58/);
assert.match(agenda,/\.agenda-day:disabled b\{color:#b54039\}/);
assert.match(agenda,/\.agenda-day:not\(:disabled\)\{border-color:#51a976;background:#f7fff9\}/);

console.log('PORTAL_TACS_V104_REGRESSION_OK');
