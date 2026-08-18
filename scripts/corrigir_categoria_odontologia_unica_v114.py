from pathlib import Path

js = Path('portal-odontologia-segunda-sexta.js')
s = js.read_text(encoding='utf-8')

old_switch = "category.value = type === 'emergencial' ? EMERGENCY : REGULAR;"
new_switch = "category.value = REGULAR;"
if s.count(old_switch) != 1:
    raise SystemExit(f'Troca interna antiga encontrada {s.count(old_switch)} vez(es).')
s = s.replace(old_switch, new_switch, 1)

old_message = "var category = selection.type === 'emergencial' ? EMERGENCY : REGULAR;"
new_message = "var category = REGULAR;"
if s.count(old_message) != 1:
    raise SystemExit(f'Categoria antiga da mensagem encontrada {s.count(old_message)} vez(es).')
s = s.replace(old_message, new_message, 1)

checks = [
    "category.value = REGULAR;",
    "var category = REGULAR;",
    "Tipo de vaga odontológica: ' + (selection.type === 'emergencial' ? 'emergencial' : 'comum')",
    "if (type === 'emergencial') slot.emergency = item.optimisticRemaining;",
    "persistInBackground(item);"
]
for item in checks:
    if item not in s:
        raise SystemExit('Contrato odontológico não preservado: ' + item)

js.write_text(s, encoding='utf-8')

html = Path('index.html')
h = html.read_text(encoding='utf-8')
old_ver = 'portal-odontologia-segunda-sexta.js?v=20260818-expiracao-horario-v112'
new_ver = 'portal-odontologia-segunda-sexta.js?v=20260818-odontologia-unica-v114'
if h.count(old_ver) != 1:
    raise SystemExit(f'Versão odontológica v112 encontrada {h.count(old_ver)} vez(es).')
h = h.replace(old_ver, new_ver, 1)
html.write_text(h, encoding='utf-8')

print('Categoria odontológica única preservada para vaga comum e emergencial; cache bust v114 aplicado.')
