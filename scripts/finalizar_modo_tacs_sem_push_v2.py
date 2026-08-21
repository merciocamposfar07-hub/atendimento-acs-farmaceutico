from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'scripts/test_aparelho_tacs_teste_v1.js'
text = p.read_text(encoding='utf-8')
if text.startswith("\\'use strict\\';"):
    text = "'use strict';" + text[len("\\'use strict\\';"):]
p.write_text(text, encoding='utf-8')
print('Finalização da correção aplicada.')