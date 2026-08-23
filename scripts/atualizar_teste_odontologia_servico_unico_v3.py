from pathlib import Path
import re

p = Path('scripts/test_dom_flows.js')
s = p.read_text(encoding='utf-8')

# O serviço odontológico público permanece único; comum/emergencial é tipo de vaga.
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
      'A vaga emergencial única não apareceu para o teste de confirmação'
    );

    const reservationsBeforeClick = harness.records.dentalReservations.length;
    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)');
    slot.click();

    await waitFor(
      () => harness.records.dentalReservations.length === reservationsBeforeClick + 1,
      'A reserva não foi iniciada no clique da vaga'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.action, 'reservar_get');
    assert.equal(reservation.type, 'emergencial');
    assert.equal(reservation.date, '2099-08-03');
    assert.match(reservation.requestId, /^MATIAS-/);

    assert.equal(
      harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais,
      0,
      'O servidor simulado deve abater a vaga exatamente uma vez'
    );
    let renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));
    assert.match(renderedMonday.textContent, /1 vaga de emergência disponível/, 'A tela deve manter a quantidade anterior enquanto a confirmação está em trânsito');

    // Este harness antigo não implementa buscar_morador. Dispare somente o CPF,
    // espere a resposta fictícia terminar e então preencha os demais dados manuais.
    // Assim o mock não apaga nome/localidade/nascimento depois do preenchimento.
    setField(window, '#cpf', '52998224725');
    await waitFor(
      () => /buscar_morador/.test(window.document.querySelector('#cpfStatus')?.textContent || ''),
      'A busca fictícia buscar_morador não terminou no harness'
    );
    setField(window, '#birth', '28121984');
    setField(window, '#name', 'Paciente Teste Confirmação');
    setField(window, '#locality', 'Sítio Japaranduba');
    setField(window, '#subject', 'Solicitação odontológica simulada.');

    const send = window.document.querySelector('#send');
    assert.ok(send, 'Controle-base de envio não encontrado');
    assert.equal(send.disabled, true, 'O envio precisa continuar bloqueado antes da confirmação do servidor');
    assert.equal(
      Boolean(window.PortalTacsOdontologiaV98 && window.PortalTacsOdontologiaV98.formularioValido()),
      false,
      'O gate odontológico não pode liberar o envio antes da confirmação'
    );

    const statusPending = window.document.querySelector('#dentalStatus');
    assert.doesNotMatch(statusPending.textContent, /Vaga reservada na agenda|O envio pelo WhatsApp está liberado/, 'Não pode existir sucesso antes da confirmação');

    await waitFor(
      () => /Vaga reservada na agenda/.test(window.document.querySelector('#dentalStatus').textContent),
      'A confirmação real da reserva não concluiu',
      3500
    );
    renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));
    assert.match(renderedMonday.textContent, /Sem vaga de emergência/, 'Somente após a confirmação a tela deve aplicar a quantidade devolvida pelo servidor');

    try {
      await waitFor(
        () => Boolean(window.PortalTacsOdontologiaV98 && window.PortalTacsOdontologiaV98.formularioValido()),
        'O gate odontológico não foi liberado após a confirmação',
        1000
      );
    } catch (error) {
      const snapshot = {
        selection: window.PortalTacsOdontologiaV98 && window.PortalTacsOdontologiaV98.selecao ? window.PortalTacsOdontologiaV98.selecao() : null,
        name: window.document.querySelector('#name')?.value || '',
        locality: window.document.querySelector('#locality')?.value || '',
        cpf: window.document.querySelector('#cpf')?.value || '',
        birth: window.document.querySelector('#birth')?.value || '',
        subject: window.document.querySelector('#subject')?.value || '',
        category: window.document.querySelector('#category')?.value || '',
        ageStatus: window.document.querySelector('#ageStatus')?.textContent || '',
        cpfStatus: window.document.querySelector('#cpfStatus')?.textContent || ''
      };
      throw new Error(error.message + ' :: ' + JSON.stringify(snapshot));
    }

    const visibleCard = window.document.querySelector('#sendPetroleumCard');
    if (visibleCard) {
      await waitFor(() => !visibleCard.disabled, 'O botão visível de envio não foi liberado após a confirmação', 1000);
    }

    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(harness.records.dentalReservations.length, reservationsBeforeClick + 1, 'A confirmação não pode criar uma segunda reserva');
    assert.equal(harness.records.alerts.length, 0, 'A confirmação não deve mostrar alerta indevido');
    assert.equal(harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais, 0, 'A vaga deve permanecer abatida uma única vez');
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
    "assert.match(renderedMonday.textContent, /1 vaga de emergência disponível/",
    "setField(window, '#cpf', '52998224725');",
    "() => /buscar_morador/.test(window.document.querySelector('#cpfStatus')?.textContent || '')",
    "setField(window, '#birth', '28121984');",
    "assert.equal(send.disabled, true",
    "window.PortalTacsOdontologiaV98.formularioValido()",
    "assert.doesNotMatch(statusPending.textContent, /Vaga reservada na agenda|O envio pelo WhatsApp está liberado/",
    "assert.match(renderedMonday.textContent, /Sem vaga de emergência/",
    "const snapshot = {",
    "const visibleCard = window.document.querySelector('#sendPetroleumCard');"
]
for item in checks:
    if item not in s:
        raise SystemExit('Contrato do teste atualizado incompleto: ' + item)

p.write_text(s, encoding='utf-8')
print('Teste odontológico atualizado para confirmação real do servidor antes do envio.')
