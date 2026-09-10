from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8').strip()
BEHAVIOR = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8').strip()
START = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->'
END = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_END -->'
CANON = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10'
REVISION = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R5'

# Somente área administrativa. Portal do Morador / Portal TACS público não entra aqui.
TARGETS = [
    'central-administrativa-tacs.html',
    'painel-oficial-organizacoes-municipios.html',
    'painel-oficial-agendas-vagas.html',
    'painel-oficial-profissionais-servicos.html',
    'painel-oficial-recados-campanhas.html',
    'painel-oficial-tacs-areas.html',
    'painel-suporte-moradores-v2.html',
    'painel-suporte-moradores.html',
    'teste-v1/painel-moradores-v2.html',
    'teste-v1/painel-profissionais-servicos-v1.html',
    'teste-v1/painel-tacs-areas-v1.html',
]

if CANON not in SOURCE or REVISION not in SOURCE:
    raise SystemExit(f'CSS administrativo não contém os contratos canônicos {CANON} / {REVISION}')
if REVISION not in BEHAVIOR:
    raise SystemExit(f'Comportamento administrativo não contém a revisão {REVISION}')

block = (
    f'{START}\n'
    f'<style id="portalTacsAdminUiStandardV1">\n{SOURCE}\n</style>\n'
    f'<script id="portalTacsAdminUiBehaviorR5">\n{BEHAVIOR}\n</script>\n'
    f'{END}'
)
changed = []

for rel in TARGETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f'{rel}: arquivo administrativo não encontrado')
    text = path.read_text(encoding='utf-8')
    if START in text and END in text:
        before, rest = text.split(START, 1)
        _, after = rest.split(END, 1)
        new = before + block + after
    else:
        marker = '</head>'
        if marker not in text:
            raise SystemExit(f'{rel}: </head> não encontrado')
        new = text.replace(marker, block + '\n' + marker, 1)
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed.append(rel)

print(f'ADMIN_UI_APP4_CANON={CANON}')
print(f'ADMIN_UI_APP4_REVISION={REVISION}')
print(f'ADMIN_UI_STANDARD_INJETADO={len(changed)}')
for rel in changed:
    print(rel)
