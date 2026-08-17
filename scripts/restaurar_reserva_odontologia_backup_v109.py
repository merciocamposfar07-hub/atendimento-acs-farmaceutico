from pathlib import Path

p=Path('portal-odontologia-segunda-sexta.js')
t=p.read_text()

replacements=[
(
"  // A vaga é reservada no clique. O envio só é liberado depois que o\n  // Apps Script confirma a gravação; não existe nova conferência no botão Enviar.\n  var shouldDisable = !formReady();",
"  // Comportamento restaurado do ponto estável: o envio só é liberado depois que\n  // a reserva foi realmente confirmada na planilha.\n  var shouldDisable = !formReady() || !selection.confirmed;"
),
(
"  function persistInBackground(item) {\n    reserveViaJsonp(item).then(function (result) {",
"  function persistInBackground(item) {\n    // Restaura o transporte que funcionava no fluxo estável: POST por formulário/iframe\n    // no próprio clique, aguardando a resposta real da planilha antes de liberar envio.\n    postReservation(item).then(function (result) {"
),
(
"    // A redução visual acontece no clique e a mesma reserva é enviada imediatamente\n    // por transporte durável. Todos os canais usam o MESMO requestId, então o backend\n    // idempotente nunca desconta a vaga duas vezes.\n    saveSlotsCache();\n    queueDurableReservation(item);",
"    // Mantém a redução visual imediata, mas a operação só é considerada concluída\n    // quando o POST estável confirma a gravação real na planilha.\n    saveSlotsCache();"
),
(
"    window.addEventListener('pagehide', function () {\n      // Se o Safari sair para o WhatsApp/compartilhamento antes da confirmação visual,\n      // reenfileira a MESMA reserva. O requestId idempotente impede abatimento duplo.\n      if (selection && !selection.confirmed) queueDurableReservation(selection);\n    });",
"    window.addEventListener('pagehide', function () {\n      // Nenhuma nova reserva é disparada ao sair da página. A reserva já foi iniciada\n      // no clique e o envio só é liberado após confirmação real.\n    });"
),
(
"    prontoParaEnvio: function () {\n      return Boolean(selection && formReady());\n    },\n    formularioValido: function () {\n      return Boolean(selection && formReady());\n    }",
"    prontoParaEnvio: function () {\n      return Boolean(selection && selection.confirmed && formReady());\n    },\n    formularioValido: function () {\n      return Boolean(selection && selection.confirmed && formReady());\n    }"
)
]

for old,new in replacements:
    if new in t:
        continue
    if old not in t:
        raise SystemExit('Trecho esperado não encontrado; abortando sem alterar o portal.')
    t=t.replace(old,new,1)

p.write_text(t)

idx=Path('index.html')
s=idx.read_text()
old='portal-odontologia-segunda-sexta.js?v=20260817-dental-sync-admin-v108'
new='portal-odontologia-segunda-sexta.js?v=20260817-restaura-reserva-estavel-v109'
if new not in s:
    if old not in s:
        raise SystemExit('Cache-buster odontologia v108 não encontrado; abortando.')
    s=s.replace(old,new,1)
idx.write_text(s)
