'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js'),config=read('agenda-config.js'),index=read('index.html'),backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),card=read('portal-ajustes-finais.js');

// Redução visual e cache local acontecem no clique, antes de qualquer navegação.
assert.match(dental,/optimisticRemaining: Math\.max\(0, Number\(available\) - 1\)/);
assert.match(dental,/saveSlotsCache\(\);\s*queueDurableReservation\(item\);/);

// A reserva ganha transporte durável para sobreviver ao compartilhamento do iPhone.
assert.match(dental,/function queueDurableReservation\(item\)/);
assert.match(dental,/navigator\.sendBeacon\(API, params\)/);
assert.match(dental,/keepalive:\s*true/);
assert.match(dental,/pagehide[\s\S]*queueDurableReservation\(selection\)/);

// Continua existindo a confirmação normal por iframe e a idempotência do backend.
assert.match(dental,/function postReservation\(item\)/);
assert.match(dental,/add\('action', 'reservar'\)/);
assert.match(backend,/CODIGO_SOLICITACAO/);
assert.match(backend,/if\(existente\)/);
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/setValue\(restantes\)/);
assert.match(backend,/SpreadsheetApp\.flush\(\)/);

// Envio continua não bloqueante.
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/var pending = !selection\.confirmed/);
assert.match(dental,/if \(!formReady\(\)\) \{ refreshSend\(\); return; \}[\s\S]*openWhatsApp\(\);/);
assert.doesNotMatch(config,/dentalReservationPending === '1'/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);
assert.doesNotMatch(card,/Confirmando os dados e a disponibilidade/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-whatsapp-bridge-v5/);
console.log('DENTAL_VACANCY_PERSISTENCE_V105_OK');
