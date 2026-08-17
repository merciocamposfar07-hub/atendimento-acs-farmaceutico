from pathlib import Path

p = Path('scripts/test_dom_flows.js')
t = p.read_text()

old_loader = """        if (parsed.hostname === 'script.google.com') {
          const source = harness.apiResponse(url);
          return source == null ? null : Promise.resolve(Buffer.from(source));
        }
"""
new_loader = """        if (parsed.hostname === 'script.google.com') {
          const source = harness.apiResponse(url);
          if (source == null) return null;
          if (parsed.searchParams.get('action') === 'reservar_get' && harness.reservationMessageDelay > 0) {
            let timer = null;
            const delayed = new Promise(resolve => {
              timer = setTimeout(
                () => resolve(Buffer.from(source)),
                harness.reservationMessageDelay
              );
            });
            delayed.abort = function () {
              if (timer) clearTimeout(timer);
              timer = null;
            };
            return delayed;
          }
          return Promise.resolve(Buffer.from(source));
        }
"""
if new_loader not in t:
    if old_loader not in t:
        raise SystemExit('Loader JSONP não encontrado')
    t = t.replace(old_loader, new_loader, 1)

start = t.index('async function testNonBlockingDentalCard() {')
end = t.index('\nasync function testRegularDental(harness) {', start)
new_test = r'''async function testNonBlockingDentalCard() {
  const harness = new Harness();
  harness.reservationMessageDelay = 300;
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico de emergência (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)'),
      'A vaga emergencial única não apareceu para o teste JSONP'
    );
    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)');
    slot.click();

    const cacheKey = window.PortalTacsOdontologiaV98.cacheKey;
    const cached = JSON.parse(window.localStorage.getItem(cacheKey));
    const monday = cached.data.dias.find(item => item.data === '2099-08-03');
    assert.equal(monday.vagasEmergenciais, 0, 'A última vaga emergencial precisa virar 0 no cache já no clique');
    const renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));
    assert.match(renderedMonday.textContent, /Sem vaga de emergência/, 'A tela deve mostrar 0 imediatamente após o clique');

    await fillPatient(window, 'Paciente Teste JSONP', 'Solicitação odontológica simulada.');
    const card = window.document.querySelector('#sendPetroleumCard');
    assert.ok(card, 'Botão visível do card não encontrado');
    assert.equal(card.disabled, true, 'Enquanto a gravação do clique não voltou do servidor, o envio deve permanecer protegido');

    const pending = window.PortalTacsOdontologiaV98.selecao();
    assert.ok(pending && pending.confirmed === false, 'A simulação precisa observar o intervalo antes da confirmação JSONP');

    await waitFor(
      () => harness.records.dentalReservations.length === 1,
      'A rota JSONP não gravou a reserva simulada no estado persistente',
      2000
    );
    await waitFor(
      () => {
        const current = window.PortalTacsOdontologiaV98.selecao();
        return current && current.confirmed === true && !card.disabled;
      },
      'O botão não foi liberado depois que a gravação foi confirmada',
      2000
    );

    const serverSlot = harness.dental.find(item => item.data === '2099-08-03');
    assert.equal(serverSlot.vagasEmergenciais, 0, 'O estado persistente do servidor simulado deve ficar em 0');
    const reservationsBeforeSend = harness.records.dentalReservations.length;
    const started = Date.now();
    card.click();
    await waitFor(
      () => harness.records.shares.length === 1,
      'O compartilhamento não abriu depois que a vaga já estava confirmada',
      1400
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1400, `O envio voltou a fazer uma segunda conferência e demorou ${elapsed} ms`);
    assert.equal(
      harness.records.dentalReservations.length,
      reservationsBeforeSend,
      'O clique em enviar não pode criar uma segunda reserva'
    );
    assert.equal(harness.records.alerts.length, 0, 'O envio não pode exibir alerta de confirmação da vaga');

    await window.PortalTacsOdontologiaV98.atualizar();
    await waitFor(
      () => {
        const cardMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(cardNode => /Segunda-feira/.test(cardNode.textContent));
        return cardMonday && /Sem vaga de emergência/.test(cardMonday.textContent);
      },
      'Após releitura/atualização, a vaga reservada reapareceu como disponível',
      2000
    );
    assert.equal(harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais, 0);
  } finally {
    window.close();
  }
}
'''
t = t[:start] + new_test + t[end:]
# A reserva funcional agora passa por reservar_get, não pelo POST antigo.
t = t.replace("assert.equal(reservation.action, 'reservar');", "assert.equal(reservation.action, 'reservar_get');", 1)
p.write_text(t)
