from pathlib import Path

path = Path('scripts/apply_confirmacao_reparo_push_v1.py')
source = path.read_text(encoding='utf-8')
marker = "Path('scripts/test_notification_repair_confirmation.js').write_text(r'''"
pos = source.find(marker)
if pos < 0:
    raise SystemExit('O executor não encontrou o gerador do teste de confirmação.')
pos += len(marker)
if source[pos:pos + 2] != "\\\n":
    raise SystemExit('O gerador do teste não possui a barra temporária esperada.')
source = source[:pos] + source[pos + 1:]
exec(compile(source, 'scripts/apply_confirmacao_reparo_push_v1.py', 'exec'))

legacy = Path('scripts/test_territorio_csv_notifications.js')
text = legacy.read_text(encoding='utf-8')
old = "assert.equal(context.TACS_NOTIFICACOES_AREA_V1.VERSAO, '1.0.3');"
new = "assert.equal(context.TACS_NOTIFICACOES_AREA_V1.VERSAO, '1.0.4');"
if text.count(old) != 1:
    raise SystemExit('O teste legado de notificações não contém exatamente a versão 1.0.3 esperada.')
legacy.write_text(text.replace(old, new, 1), encoding='utf-8')
