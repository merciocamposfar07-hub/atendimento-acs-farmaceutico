'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js');
const config=read('agenda-config.js');
const index=read('index.html');
const backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs');
const territorial=read('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const card=read('portal-ajustes-finais.js');
const admin=read('painel-oficial-agendas-vagas.html');

new vm.Script(dental,{filename:'portal-odontologia-segunda-sexta.js'});
new vm.Script(backend,{filename:'ZZZZ_36_CorrecaoDataOdontologiaV1.gs'});

// Reserva crítica: o mesmo requestId é enviado ao servidor e reutilizado nas retentativas.
assert.match(dental,/function postReservation\(item\)/);
assert.match(dental,/params\.set\('action', 'reservar_get'\)/);
assert.match(dental,/params\.set\('requestId', item\.requestId\)/);
assert.match(dental,/params\.set\('date', item\.date\)/);
assert.match(dental,/params\.set\('type', item\.type\)/);
assert.match(dental,/function verifyReservation\(item, attempt\)/);
assert.match(dental,/postReservation\(item\)\.then/);
assert.match(dental,/scheduleVerify\(item, attempt \+ 1,/);
assert.match(dental,/function persistInBackground\(item\) \{\s*verifyReservation\(item, 0\);\s*\}/s);

// Nenhuma vaga é abatida no navegador antes da resposta autoritativa.
assert.doesNotMatch(dental,/optimisticRemaining/);
assert.match(dental,/function applyServerRemaining\(item, remaining\)/);
assert.match(dental,/item\.serverRemaining = Math\.max\(0, Number\(remaining\)\)/);
assert.match(dental,/serverRemaining: null/);
assert.doesNotMatch(dental,/selection = item;\s*if \(type === 'emergencial'\) slot\.emergency/s);
assert.match(dental,/Confirmando sua vaga na agenda\. Não envie ainda\./);
assert.match(dental,/A confirmação da vaga está demorando\. Não envie ainda\./);
assert.doesNotMatch(dental,/A quantidade foi reduzida no portal e o envio pelo WhatsApp já está liberado/);

// Envio só existe depois de confirmação inequívoca do servidor.
assert.match(dental,/selection &&\s*selection\.confirmed &&/s);
assert.match(dental,/if \(!selection \|\| !selection\.confirmed\) return;/);
assert.match(dental,/if \(selection\.confirmed\) delete send\.dataset\.dentalReservationPending/);
assert.match(dental,/else send\.dataset\.dentalReservationPending = '1'/);
assert.match(dental,/if \(selection\.confirmed\) return 'Vaga reservada na agenda\. O envio pelo WhatsApp está liberado\.'/);
assert.match(card,/return Boolean\(api\.formularioValido\(\)\)/,'O botão de card deve obedecer ao mesmo gate odontológico confirmado.');

// O backend territorial atual é idempotente, serializa a escrita e desconta exatamente uma vez.
assert.match(backend,/action==='reserva_status'\|\|action==='status_reserva_odontologia'/);
assert.match(backend,/var lock=LockService\.getScriptLock\(\)/);
assert.match(backend,/if\(!lock\.tryLock\(15000\)\)/);
assert.match(backend,/agendasProfissionaisTerritoriaisV1Encontrar_\(reservas,'CODIGO_SOLICITACAO',requestId,areaId\)/);
assert.match(backend,/if\(existente\)\{/);
assert.match(backend,/alreadyReserved:true/);
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/agenda\.sheet\.getRange\(alvo\.row,indice\+1\)\.setValue\(restantes\)/);
assert.match(backend,/CODIGO_SOLICITACAO:requestId/);
assert.match(backend,/AREA_ID:areaId/);
assert.match(backend,/SpreadsheetApp\.flush\(\)/);
assert.match(backend,/finally\{lock\.releaseLock\(\);\}/);

// Serviço público odontológico permanece isolado; demais profissionais não são alterados.
assert.match(dental,/category\.value = REGULAR;/);
assert.match(dental,/var category = REGULAR;/);
assert.match(dental,/Tipo de vaga odontológica:/);
assert.match(territorial,/ABA_AGENDAS:'PAINEL_PROFISSIONAIS'/);
assert.match(territorial,/agendasProfissionaisTerritoriaisV1Dados_/);
assert.match(admin,/function sincronizarVagasOdontologia\(\)/);
assert.match(admin,/jsonp\('agenda',\{areaId:areaId\}/);
assert.match(admin,/setInterval\(sincronizarVagasOdontologia,5000\)/);
assert.match(admin,/edicaoPendente/);

assert.match(config,/DENTAL_AGENDA_API_URL/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=[^"']+/,'O módulo odontológico deve ser carregado com a versão integral da publicação.');
assert.match(index,/if\(!window\.__PORTAL_TACS_ODONTOLOGIA_V98__\)loadDental\(\)/);
assert.match(dental,/CACHE_FRESH_MS = 90 \* 1000/);
assert.match(dental,/function readAgendaCache\(\)/);
assert.match(dental,/function currentAreaId\(\)/);
console.log('DENTAL_SERVER_CONFIRMATION_V1_OK');
