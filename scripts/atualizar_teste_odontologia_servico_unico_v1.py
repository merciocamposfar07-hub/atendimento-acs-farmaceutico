from pathlib import Path

path = Path('scripts/test_dom_flows.js')
s = path.read_text(encoding='utf-8')
old = "category.value = 'Solicitar atendimento odontológico de emergência (dentista)';"
new = "category.value = 'Solicitar atendimento odontológico (dentista)';"

count = s.count(old)
if count != 1:
    raise SystemExit(f'Esperava 1 ocorrência do serviço odontológico legado no teste; encontrei {count}.')

s = s.replace(old, new, 1)

# Gates: o teste continua validando a vaga emergencial dentro da agenda única.
required = [
    "category.value = 'Solicitar atendimento odontológico (dentista)';",
    "#dentalSlots .sheet-dental-choice.emergency:not(:disabled)",
    "assert.equal(durableGet.type, 'emergencial');",
    "assert.equal(durableGet.date, '2099-08-03');",
    "assert.equal(monday.vagasEmergenciais, 0",
]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit('Gates do teste odontológico falharam: ' + ' | '.join(missing))

path.write_text(s, encoding='utf-8')
print('Teste atualizado para a agenda odontológica única; validação emergencial preservada.')
