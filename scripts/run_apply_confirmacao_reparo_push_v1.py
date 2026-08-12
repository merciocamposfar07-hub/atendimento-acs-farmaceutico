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
