'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js');
const config=read('agenda-config.js');
const index=read('index.html');
const backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs');
const territorial=read('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const card=read('portal-ajustes-finais.js');
const admin=read('painel-oficial-agendas-vagas.html');

// Reserva real começa no clique e possui redundância idempotente para Safari.
assert.match(dental,/function reserveViaJsonp\(item\)/);
assert.match(dental,/function queueDurableReservation\(item\)/);
assert.match(dental,/action=reservar_get&areaId=/);
assert.match(dental,/saveSlotsCache\(\);\s*queueDurableReservation\(item\);/);
assert.match(dental,/pagehide[\s\S]*queueDurableReservation\(selection\)/);

// Envio não volta a ser refém da latência do Apps Script.
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/var shouldDisable = !formReady\(\) \|\| !selection\.confirmed/);
assert.match(dental,/Boolean\(selection && formReady\(\)\)/);
assert.match(card,/return Boolean\(api\.formularioValido\(\)\)/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);

// O abatimento e o painel administrativo usam a MESMA fonte PAINEL_PROFISSIONAIS.
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/setValue\(restantes\)/);
assert.match(backend,/SpreadsheetApp\.flush\(\)/);
assert.match(territorial,/ABA_AGENDAS:'PAINEL_PROFISSIONAIS'/);
assert.match(territorial,/agendasProfissionaisTerritoriaisV1Dados_/);
assert.match(admin,/function sincronizarVagasOdontologia\(\)/);
assert.match(admin,/jsonp\('agenda',\{areaId:areaId\}/);
assert.match(admin,/setInterval\(sincronizarVagasOdontologia,5000\)/);
assert.match(admin,/edicaoPendente/);

assert.match(config,/DENTAL_AGENDA_API_URL/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-sync-admin-v108/);
console.log('DENTAL_SYNC_ADMIN_V108_OK');
