from pathlib import Path

path = Path('scripts/test_dom_flows.js')
s = path.read_text(encoding='utf-8')
old = "category.value = 'Solicitar atendimento odontológico de emergência (dentista)';"
new = "category.value = 'Solicitar atendimento odontológico (dentista)';"

count = s.count(old)
if count != 2:
    raise SystemExit(f'Esperava 2 ocorrências do serviço odontológico legado nos testes; encontrei {count}.')

s = s.replace(old, new)

# Gates: os dois testes passam a abrir a agenda odontológica única,
# mas continuam validando especificamente o fluxo das vagas emergenciais.
if s.count(new) < 2:
    raise SystemExit('Os dois testes não foram convertidos para o serviço odontológico único.')

required = [
    "#dentalSlots .sheet-dental-choice.emergency:not(:disabled)",
    "#dentalSlots .sheet-dental-choice.emergency",
    "assert.equal(durableGet.type, 'emergencial');",
    "assert.equal(durableGet.date, '2099-08-03');",
    "assert.equal(monday.vagasEmergenciais, 0",
]
missing = [item for item in required if item not in s]
if missing:
    raise SystemExit('Gates do teste odontológico falharam: ' + ' | '.join(missing))

path.write_text(s, encoding='utf-8')
print('Dois testes atualizados para a agenda odontológica única; validações emergenciais preservadas.')
