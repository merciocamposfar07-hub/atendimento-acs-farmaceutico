from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANON = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10'
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
    'teste-v1/painel-profissionais-servicos-v1.html',
    'teste-v1/painel-tacs-areas-v1.html',
]

css = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8')
required = [
    CANON,
    '--tacs-app-bg:#071827',
    '--tacs-app-top:#0b263d',
    '--tacs-app-card:#102d46',
    '--tacs-app-accent:#83efa9',
    '--tacs-app-accent2:#62c8e8',
    'conecta-saude-central-canonico-2026-09-09.png',
]
for token in required:
    if token not in css:
        raise SystemExit(f'CSS canônico sem token obrigatório: {token}')

for rel in TARGETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f'Painel administrativo ausente: {rel}')
    text = path.read_text(encoding='utf-8')
    if text.count(START) != 1 or text.count(END) != 1:
        raise SystemExit(f'Marcador visual inválido em {rel}')
    if CANON not in text:
        raise SystemExit(f'App4 canônico não injetado em {rel}')

injector = (ROOT / 'scripts/injetar_admin_ui_standard_v1.py').read_text(encoding='utf-8')
for forbidden in ["'index.html'", 'portal-morador.html', 'abrir.html']:
    if forbidden in injector:
        raise SystemExit(f'Fonte pública não pode entrar no injetor administrativo: {forbidden}')

print('ADMIN_UI_APP4_CANONICAL_OK')
print(f'PAINEIS_VALIDADOS={len(TARGETS)}')
