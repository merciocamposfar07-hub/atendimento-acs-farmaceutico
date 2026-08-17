'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js'),config=read('agenda-config.js'),index=read('index.html'),backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),card=read('portal-ajustes-finais.js');

// Reserva continua começando no clique da vaga e abatendo visualmente de imediato.
assert.match(dental,/optimisticRemaining: Math\.max\(0, Number\(available\) - 1\)/);
assert.match(dental,/persistInBackground\(item\);/);
assert.match(dental,/add\('action', 'reservar'\)/);

// Envio não pode depender da confirmação assíncrona da planilha.
assert.doesNotMatch(dental,/var pending = !selection\.confirmed/);
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/dentalReservationPending = '1'/);
assert.match(dental,/if \(!formReady\(\)\) \{ refreshSend\(\); return; \}[\s\S]*openWhatsApp\(\);/);
assert.doesNotMatch(dental,/if \(!selection\.confirmed \|\| !formReady\(\)\)/);
assert.match(dental,/prontoParaEnvio: function \(\) \{[\s\S]*selection && formReady\(\)/);
assert.match(dental,/formularioValido: function \(\)/);
assert.doesNotMatch(config,/dentalReservationPending === '1'/);

// O card usa o mesmo requestId ainda pendente e abre o compartilhamento sem await da reserva.
assert.match(card,/dental && dental\.requestId \? dental\.requestId : makeCode/);
assert.match(card,/var current = currentDentalSelection\(\);[\s\S]*reservedSelection = dental\.key;[\s\S]*return Promise\.resolve\(current\);/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);
assert.doesNotMatch(card,/return reserveDentalIfNeeded\(\)\.then/);
assert.doesNotMatch(card,/Confirmando os dados e a disponibilidade/);
assert.match(card,/Abrindo as opções de envio/);

// O fallback legado também dispara a reserva sem bloquear a abertura do WhatsApp.
assert.match(index,/reserveSlot\(\)\.then\([\s\S]*\.catch\(function\(\)\{loadDental\(\)\}\);sendMessage\(\)\}/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-whatsapp-bridge-v4/);
assert.match(index,/portal-ajustes-finais\.js\?v=20260817-dental-card-bridge-v4/);

// Backend e recuperação permanecem disponíveis para sincronização em segundo plano.
assert.match(dental,/function fetchReservationStatus\(item\)/);
assert.match(dental,/action=reserva_status/);
assert.match(backend,/reserva_status/);
assert.match(backend,/function correcaoDataOdontologiaV1StatusReserva_/);
assert.match(backend,/VERSAO:'2\.1\.0'/);
console.log('DENTAL_NONBLOCKING_SEND_GATE_V104_OK');
