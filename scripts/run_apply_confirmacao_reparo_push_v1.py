from pathlib import Path

source = Path('scripts/apply_confirmacao_reparo_push_v1.py').read_text(encoding='utf-8')
old = "write_text(r'''\\\\\n'use strict';"
new = "write_text(r'''\n'use strict';"
if old not in source:
    raise SystemExit('O executor não encontrou o trecho esperado no gerador do teste.')
source = source.replace(old, new, 1)
exec(compile(source, 'scripts/apply_confirmacao_reparo_push_v1.py', 'exec'))
