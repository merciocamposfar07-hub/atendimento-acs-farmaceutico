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

// Reserva real começa no clique. O controlador atual usa JSONP reservar_get
// e confirma em segundo plano sem bloquear o envio do morador.
assert.match(dental,/function postReservation\(item\)/);
assert.match(dental,/params\.set\('action', 'reservar_get'\)/);
assert.match(dental,/params\.set\('requestId', item\.requestId\)/);
assert.match(dental,/params\.set\('date', item\.date\)/);
assert.match(dental,/params\.set\('type', item\.type\)/);
assert.match(dental,/function persistInBackground\(item\)/);
assert.match(dental,/persistInBackground\(item\);/);
assert.match(dental,/optimisticRemaining: Math\.max\(0, Number\(available\) - 1\)/);
assert.match(dental,/if \(type === 'emergencial'\) slot\.emergency = item\.optimisticRemaining;/);

// Serviço público odontológico permanece único; comum/emergencial é tipo de vaga.
assert.match(dental,/category\.value = REGULAR;/);
assert.match(dental,/var category = REGULAR;/);
assert.match(dental,/Tipo de vaga odontológica:/);

// Envio não volta a ser refém da latência do Apps Script.
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/var shouldDisable = !formReady\(\) \|\| !selection\.confirmed/);
assert.match(dental,/Vaga selecionada\. A quantidade foi reduzida no portal e o envio pelo WhatsApp já está liberado/);
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
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260818-cache-territorial-v115/);
assert.match(index,/if\(!window\.__PORTAL_TACS_ODONTOLOGIA_V98__\)loadDental\(\)/);
assert.match(dental,/CACHE_FRESH_MS = 90 \* 1000/);
assert.match(dental,/function readAgendaCache\(\)/);
assert.match(dental,/function currentAreaId\(\)/);
console.log('DENTAL_CACHE_TERRITORIAL_V115_OK');
