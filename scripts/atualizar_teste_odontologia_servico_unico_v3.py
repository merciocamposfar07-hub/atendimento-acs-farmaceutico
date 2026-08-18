from pathlib import Path
import re

p = Path('scripts/test_dom_flows.js')
s = p.read_text(encoding='utf-8')

# O serviço odontológico público agora é único; a escolha comum/emergencial ocorre dentro da agenda.
s = s.replace(
    "category.value = 'Solicitar atendimento odontológico de emergência (dentista)';",
    "category.value = 'Solicitar atendimento odontológico (dentista)';"
)

pattern = re.compile(
    r"async function testNonBlockingDentalCard\(\) \{.*?\n\}\n\nasync function testRegularDental",
    re.S,
)

replacement = r'''async function testNonBlockingDentalCard() {
  const harness = new Harness();
  harness.reservationMessageDelay = 1500;
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)'),
      'A vaga emergencial única não apareceu para o teste não bloqueante'
    );

    const reservationsBeforeClick = harness.records.dentalReservations.length;
    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)');
    slot.click();

    await waitFor(
      () => harness.records.dentalReservations.length === reservationsBeforeClick + 1,
      'A reserva em segundo plano não foi iniciada no clique da vaga'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.action, 'reservar_get');
    assert.equal(reservation.type, 'emergencial');
    assert.equal(reservation.date, '2099-08-03');
    assert.match(reservation.requestId, /^MATIAS-/);

    assert.equal(
      harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais,
      0,
      'A última vaga emergencial precisa virar 0 já no clique'
    );
    const renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));
    assert.match(renderedMonday.textContent, /Sem vaga de emergência/, 'A tela deve mostrar 0 imediatamente após o clique');

    await fillPatient(window, 'Paciente Teste Não Bloqueante', 'Solicitação odontológica simulada.');
    const send = window.document.querySelector('#send');
    assert.ok(send, 'Botão do WhatsApp não encontrado');
    await waitFor(() => !send.disabled, 'O botão do WhatsApp permaneceu bloqueado esperando a planilha', 800);

    const statusBeforeSend = window.document.querySelector('#dentalStatus');
    assert.match(statusBeforeSend.textContent, /Vaga selecionada/, 'A seleção deve ser aceita antes da confirmação do servidor');
    assert.doesNotMatch(statusBeforeSend.textContent, /Vaga reservada na agenda/, 'O teste precisa enviar enquanto a confirmação ainda está em trânsito');

    const reservationsBeforeSend = harness.records.dentalReservations.length;
    const started = Date.now();
    send.click();
    await waitFor(
      () => harness.records.whatsAppMessages.length === 1,
      'O WhatsApp não abriu durante a sincronização da vaga',
      1000
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1000, `O WhatsApp ficou bloqueado ${elapsed} ms esperando a agenda`);
    assert.equal(harness.records.dentalReservations.length, reservationsBeforeSend, 'Enviar ao WhatsApp não pode criar outra reserva');
    assert.equal(harness.records.alerts.length, 0, 'O envio ao WhatsApp não pode mostrar alerta de confirmação da vaga');

    await waitFor(
      () => /Vaga reservada na agenda/.test(window.document.querySelector('#dentalStatus').textContent),
      'A confirmação em segundo plano não concluiu',
      3000
    );
    assert.equal(harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais, 0, 'O servidor simulado deve permanecer em 0');

    window.dispatchEvent(new window.Event('pageshow'));
    await waitFor(
      () => {
        const cardMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(cardNode => /Segunda-feira/.test(cardNode.textContent));
        return cardMonday && /Sem vaga de emergência/.test(cardMonday.textContent);
      },
      'Após releitura da agenda, a vaga reservada reapareceu como disponível',
      2000
    );
  } finally {
    window.close();
  }
}

async function testRegularDental'''

s, count = pattern.subn(lambda _m: replacement, s, count=1)
if count != 1:
    raise SystemExit(f'Função testNonBlockingDentalCard não localizada exatamente uma vez: {count}.')

checks = [
    "category.value = 'Solicitar atendimento odontológico (dentista)';",
    "harness.records.dentalReservations.length === reservationsBeforeClick + 1",
    "assert.equal(reservation.type, 'emergencial');",
    "assert.match(renderedMonday.textContent, /Sem vaga de emergência/",
    "assert.doesNotMatch(statusBeforeSend.textContent, /Vaga reservada na agenda/",
    "assert.ok(elapsed < 1000",
    "window.dispatchEvent(new window.Event('pageshow'));"
]
for item in checks:
    if item not in s:
        raise SystemExit('Contrato do teste atualizado incompleto: ' + item)

if 'PortalTacsOdontologiaV98.cacheKey' in s or 'PortalTacsOdontologiaV98.selecao' in s or 'PortalTacsOdontologiaV98.atualizar' in s:
    raise SystemExit('O teste ainda depende da API privada odontológica antiga.')

p.write_text(s, encoding='utf-8')
print('Teste não bloqueante atualizado para DOM e reserva real do controlador atual.')
