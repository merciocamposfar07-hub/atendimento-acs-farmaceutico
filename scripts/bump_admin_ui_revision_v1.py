#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'central-administrativa-tacs.js'
REV = '20260816-admin-ui-standard-v1'

text = PATH.read_text(encoding='utf-8')
original = text

old_tokens = [
    '20260816-padrao-petroleo-v2',
    '20260816-publicacoes-horarios-v9',
    '20260816-agendas-horarios-v9',
    '20260816-profissionais-v3',
    '20260815-csv-auto-v5',
]

for token in old_tokens:
    text = text.replace(token, REV)

# Idempotência: se já estiver na revisão nova, não altera mais nada.
if REV not in text:
    raise RuntimeError('Central: não foi possível registrar a revisão visual nos URLs dos painéis')

# Proteções mínimas contra alteração funcional acidental.
for contract in [
    "btn.dataset.permission",
    "btn.dataset.module",
    "btn.dataset.adminOnly",
    "admin_territorio_dados",
    "portalTacsTerritorioTokenV1",
]:
    if contract not in text:
        raise RuntimeError(f'Central: contrato funcional ausente após bump de revisão: {contract}')

if text != original:
    PATH.write_text(text, encoding='utf-8')
    print(f'Central atualizada para revisão {REV}')
else:
    print(f'Central já está na revisão {REV}')
