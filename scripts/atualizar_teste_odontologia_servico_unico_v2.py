from pathlib import Path

p = Path('scripts/test_dom_flows.js')
s = p.read_text(encoding='utf-8')

s = s.replace(
    "category.value = 'Solicitar atendimento odontológico de emergência (dentista)';",
    "category.value = 'Solicitar atendimento odontológico (dentista)';"
)

old = """    await waitFor(
      () => harness.records.durableGetReservations.length >= 1,
      'A reserva durável GET não foi enfileirada no clique da vaga'
    );
    const durableGet = harness.records.durableGetReservations[0];
    assert.equal(durableGet.action, 'reservar_get');
    assert.equal(durableGet.type, 'emergencial');
    assert.equal(durableGet.date, '2099-08-03');
    assert.equal(durableGet.keepalive, true);
    assert.match(durableGet.requestId, /^MATIAS-/);
"""

new = """    await waitFor(
      () => harness.records.dentalReservations.length >= 1,
      'A reserva em segundo plano não foi iniciada no clique da vaga'
    );
    const backgroundReservation = harness.records.dentalReservations[0];
    assert.equal(backgroundReservation.action, 'reservar_get');
    assert.equal(backgroundReservation.type, 'emergencial');
    assert.equal(backgroundReservation.date, '2099-08-03');
    assert.match(backgroundReservation.requestId, /^MATIAS-/);
"""

if old in s:
    s = s.replace(old, new, 1)

checks = [
    "Solicitar atendimento odontológico (dentista)",
    "const backgroundReservation = harness.records.dentalReservations[0];",
    "assert.equal(backgroundReservation.type, 'emergencial');",
    "assert.equal(monday.vagasEmergenciais, 0",
    "assert.ok(pending && pending.confirmed === false",
    "assert.ok(elapsed < 1000"
]
for item in checks:
    if item not in s:
        raise SystemExit('Teste odontológico incompleto: ' + item)

if "durableGet.keepalive" in s:
    raise SystemExit('Ainda existe exigência do transporte antigo no teste.')

p.write_text(s, encoding='utf-8')
print('Teste odontológico alinhado ao serviço único e à reserva em segundo plano atual.')
