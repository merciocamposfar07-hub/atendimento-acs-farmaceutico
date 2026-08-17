from pathlib import Path

p=Path('scripts/test_dom_flows.js')
t=p.read_text()
start_marker="    await fillPatient(window, 'Paciente Teste Não Bloqueante', 'Solicitação odontológica simulada.');\n"
end_marker="    await waitFor(\n      () => {\n        const current = window.PortalTacsOdontologiaV98.selecao();\n        return current && current.confirmed === true;\n"
start=t.find(start_marker)
if start < 0:
    raise SystemExit('Início do teste WhatsApp v108 não encontrado')
end=t.find(end_marker,start)
if end < 0:
    raise SystemExit('Fim do teste WhatsApp v108 não encontrado')
start += len(start_marker)
replacement=r'''    const send = window.document.querySelector('#send');
    assert.ok(send, 'Botão do WhatsApp não encontrado');
    await waitFor(() => !send.disabled, 'O botão do WhatsApp permaneceu bloqueado esperando a planilha', 800);

    const pending = window.PortalTacsOdontologiaV98.selecao();
    assert.ok(pending && pending.confirmed === false, 'O teste precisa enviar enquanto a confirmação ainda está em trânsito');
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
    assert.equal(window.PortalTacsOdontologiaV98.selecao().confirmed, false, 'O WhatsApp só abriu depois da confirmação; regressão do v107');
    assert.equal(harness.records.dentalReservations.length, reservationsBeforeSend, 'Enviar ao WhatsApp não pode criar outra reserva');
    assert.equal(harness.records.alerts.length, 0, 'O envio ao WhatsApp não pode mostrar alerta de confirmação da vaga');

'''
t=t[:start]+replacement+t[end:]
p.write_text(t)
