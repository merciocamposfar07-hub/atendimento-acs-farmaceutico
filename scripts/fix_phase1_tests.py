#!/usr/bin/env python3
from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(label + ' não encontrado')
    return text.replace(old, new, 1)

# O pacote Apps Script ganhou módulos públicos antes do módulo de Moradores.
p = Path('scripts/test_build_apps_script_release.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    """  assert.strictEqual(first[0].file, 'ZZZZ_15_ArquivoRealDoServidor.js');
  assert.strictEqual(first[0].operation, 'substituido');
  assert.ok(first.every((item) => item.file.endsWith('.js')));
  assert.match(
    fs.readFileSync(path.join(target, first[0].file), 'utf8'),
    /VERSAO:\\s*'1\\.4\\.5'/
  );
""",
    """  const residentFirst = first.find((item) => item.file === 'ZZZZ_15_ArquivoRealDoServidor.js');
  assert.ok(residentFirst, 'O módulo de Moradores precisa permanecer no pacote.');
  assert.strictEqual(residentFirst.operation, 'substituido');
  assert.ok(first.every((item) => item.file.endsWith('.js')));
  assert.match(
    fs.readFileSync(path.join(target, residentFirst.file), 'utf8'),
    /VERSAO:\\s*'1\\.4\\.5'/
  );
""",
    'Bloco JS do teste de release'
)
s = replace_once(
    s,
    "  assert.strictEqual(report[0].file, 'ZZZZ_15_ArquivoRealDoServidor.gs');",
    "  assert.ok(report.some((item) => item.file === 'ZZZZ_15_ArquivoRealDoServidor.gs'));",
    'Bloco GS do teste de release'
)
p.write_text(s, encoding='utf-8')

# A odontologia aprovada reserva/desconta no clique da vaga. O envio posterior
# ao WhatsApp não pode fazer uma segunda reserva.
p = Path('scripts/test_dom_flows.js')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    """    slots[0].click();
    await fillPatient(
""",
    """    const reservationsBeforeClick = harness.records.dentalReservations.length;
    slots[0].click();
    await waitFor(
      () => harness.records.dentalReservations.length === reservationsBeforeClick + 1,
      'A vaga comum não foi reservada no clique'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.action, 'reservar');
    assert.equal(reservation.date, '2099-08-03');
    assert.equal(reservation.type, 'comum');
    assert.match(reservation.requestId, /^MATIAS-/);
    assert.equal(harness.dental[0].vagasComuns, 1, 'A vaga comum não foi abatida no clique');
    await fillPatient(
""",
    'Seleção comum do teste odontológico'
)

s = replace_once(
    s,
    """    const before = harness.records.whatsAppMessages.length;
    send.click();
    await wait(40);
    assert.equal(
      harness.records.whatsAppMessages.length,
      before,
      'O WhatsApp abriu antes da confirmação da reserva comum'
    );
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a reserva comum'
    );

    assert.equal(harness.records.dentalReservations.length, 1);
    const reservation = harness.records.dentalReservations[0];
    assert.equal(reservation.action, 'reservar');
    assert.equal(reservation.date, '2099-08-03');
    assert.equal(reservation.type, 'comum');
    assert.match(reservation.requestId, /^MATIAS-/);
    assert.equal(harness.dental[0].vagasComuns, 1, 'A vaga comum não foi abatida exatamente uma vez');
""",
    """    const before = harness.records.whatsAppMessages.length;
    const reservationsBeforeSend = harness.records.dentalReservations.length;
    send.click();
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a vaga comum já reservada'
    );
    assert.equal(
      harness.records.dentalReservations.length,
      reservationsBeforeSend,
      'O envio pelo WhatsApp não pode descontar outra vaga comum'
    );
""",
    'Envio comum antigo do teste odontológico'
)

s = replace_once(
    s,
    """    slots[1].click();
    await fillPatient(
""",
    """    const emergencyReservationsBeforeClick = harness.records.dentalReservations.length;
    slots[1].click();
    await waitFor(
      () => harness.records.dentalReservations.length === emergencyReservationsBeforeClick + 1,
      'A vaga emergencial não foi reservada no clique'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.date, '2099-08-04');
    assert.equal(reservation.type, 'emergencial');
    assert.equal(harness.dental[1].vagasEmergenciais, 1, 'A vaga emergencial não foi abatida no clique');
    await fillPatient(
""",
    'Seleção emergencial do teste odontológico'
)

s = replace_once(
    s,
    """    const before = harness.records.whatsAppMessages.length;
    send.click();
    await wait(40);
    assert.equal(
      harness.records.whatsAppMessages.length,
      before,
      'O WhatsApp abriu antes da confirmação da reserva emergencial'
    );
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a reserva emergencial'
    );

    assert.equal(harness.records.dentalReservations.length, 2);
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.date, '2099-08-04');
    assert.equal(reservation.type, 'emergencial');
    assert.equal(
      harness.dental[1].vagasEmergenciais,
      1,
      'A vaga emergencial não foi abatida exatamente uma vez'
    );
""",
    """    const before = harness.records.whatsAppMessages.length;
    const emergencyReservationsBeforeSend = harness.records.dentalReservations.length;
    send.click();
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a vaga emergencial já reservada'
    );
    assert.equal(
      harness.records.dentalReservations.length,
      emergencyReservationsBeforeSend,
      'O envio pelo WhatsApp não pode descontar outra vaga emergencial'
    );
""",
    'Envio emergencial antigo do teste odontológico'
)

p.write_text(s, encoding='utf-8')
print('Testes legados alinhados ao empacotamento multiárea e à reserva odontológica no clique.')
