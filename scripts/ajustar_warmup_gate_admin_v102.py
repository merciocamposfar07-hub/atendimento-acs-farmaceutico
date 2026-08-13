from pathlib import Path

# Depois de remover a UI de atualização do Portal TACS dos painéis administrativos,
# manter uma guarda explícita só para os recursos realmente usados pelo warmup.
p = Path('admin-warmup.js')
text = p.read_text(encoding='utf-8')
needle = "  'use strict';\n\n"
guard = "  'use strict';\n\n  if(typeof document==='undefined'||typeof document.createElement!=='function'||!document.head)return;\n\n"
if guard not in text:
    if needle not in text:
        raise SystemExit('admin-warmup: cabeçalho não encontrado')
    text = text.replace(needle, guard, 1)
p.write_text(text, encoding='utf-8')

p = Path('scripts/test_quality_gate_v101.js')
text = p.read_text(encoding='utf-8')
old_dom = "registrar('resiliencia', 'Pré-aquecimento tolera DOM mínimo', contem(warmup, \"typeof document.getElementById!=='function'\"));"
new_dom = "registrar('resiliencia', 'Pré-aquecimento tolera DOM mínimo', contem(warmup, \"typeof document==='undefined'||typeof document.createElement!=='function'||!document.head\"));"
if old_dom not in text:
    raise SystemExit('quality gate: critério antigo de DOM mínimo não encontrado')
text = text.replace(old_dom, new_dom, 1)

# O gate antigo exigia portal-auto-update dentro de todos os painéis. Isso é justamente
# o que gerava a UI flutuante indevida. O critério correto é exigir o warmup administrativo.
old = "registrar('resiliencia', 'Autoatualização é carregada nos painéis', [agenda, profissionais, recados].every(t => contem(t, 'admin-warmup.js?v=20260812-auto-v101')));"
new = "registrar('resiliencia', 'Pré-aquecimento administrativo é carregado sem UI do Portal', contem(agenda, 'admin-warmup.js?v=20260812-auto-v101') && contem(profissionais, 'admin-warmup.js?v=20260813-admin-v102') && contem(recados, 'admin-warmup.js?v=20260813-admin-v102') && !contem(warmup, 'portal-auto-update.js'));"
if old not in text:
    raise SystemExit('quality gate: critério antigo de autoatualização não encontrado')
text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('WARMUP_GATE_ADMIN_V102_OK')
