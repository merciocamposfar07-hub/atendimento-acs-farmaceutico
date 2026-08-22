from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8').strip()
START = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->'
END = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_END -->'
TARGETS = [
    'central-administrativa-tacs.html',
    'painel-oficial-organizacoes-municipios.html',
    'painel-oficial-agendas-vagas.html',
    'painel-oficial-profissionais-servicos.html',
    'painel-oficial-recados-campanhas.html',
    'painel-oficial-tacs-areas.html',
    'teste-v1/painel-moradores-v2.html',
    'teste-v1/painel-tacs-areas-v1.html',
]

block = f'{START}\n<style id="portalTacsAdminUiStandardV1">\n{SOURCE}\n</style>\n{END}'
changed = []

for rel in TARGETS:
    path = ROOT / rel
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

print(f'ADMIN_UI_STANDARD_INJETADO={len(changed)}')
for rel in changed:
    print(rel)
