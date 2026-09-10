from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANON = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10'
REVISION = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R5'
START = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->'
END = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_END -->'
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

css = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8')
behavior = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
required_css = [
    'R5 FINAL',
    'background:linear-gradient(145deg,#174765,#0c3049)',
    'border:2px solid #69b8c0',
    'background:#135272',
    'background:#236581',
    CANON,
    REVISION,
    '--tacs-app-bg:#071827',
    '--tacs-app-top:#0b263d',
    '--tacs-app-card:#102d46',
    '--tacs-app-card2:#153b58',
    '--tacs-app-line:#2b5a76',
    '--tacs-app-accent:#83efa9',
    '--tacs-app-accent2:#62c8e8',
    '.csc-appbar-icon',
    'width:80px',
    '.module-grid,.modules',
    'border:1px solid var(--tacs-app-line)',
    '.csc-session-active .csc-auth-control',
    '#portalTacsBackCentralV1{display:none!important}',
]
for token in required_css:
    if token not in css:
        raise SystemExit(f'CSS canônico R5 sem token obrigatório: {token}')

# A revisão rejeita a antiga moldura grossa azul-clara aplicada a todos os cards.
for forbidden in [
    '.panel,.painel,.card,.box,.caixa,.newbox{\n  min-width:0;\n  max-width:100%;\n  color:var(--tacs-app-text)!important;\n  background:linear-gradient(145deg,#174765,#0c3049)!important;\n  border:2px solid #69b8c0!important',
    'border-left:1px solid var(--tacs-app-line)',
    'border-right:1px solid var(--tacs-app-line)',
]:
    if forbidden in css:
        raise SystemExit('CSS R5 ainda contém moldura estrutural rejeitada')

required_behavior = [
    'tacsPinAccess',
    'csc-admin-only-auth',
    'csc-pressed',
    REVISION,
    "var ADMIN_TOKEN='portalTacsAdminTokenV1'",
    "var TERRITORY_TOKEN='portalTacsTerritorioTokenV1'",
    "brand.textContent='CONECTA SAÚDE COMUNITÁRIA'",
    "strong.textContent=panelTitle()",
    "ROOT.classList.toggle('csc-session-active',active)",
    'painel-suporte-moradores(?:-v2)?',
    "return 'Diagnóstico dos aparelhos'",
    "return 'Suporte aos moradores'",
    '.csc-session-missing .csc-dock{display:none!important}',
    '.csc-session-active .csc-dock{display:grid!important}',
    "back.addEventListener('click'",
    "navigator.vibrate(8)",
]
for token in required_behavior:
    if token not in behavior:
        raise SystemExit(f'Comportamento App4 R5 sem token obrigatório: {token}')

for rel in TARGETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f'Painel administrativo ausente: {rel}')
    text = path.read_text(encoding='utf-8')
    if text.count(START) != 1 or text.count(END) != 1:
        raise SystemExit(f'Marcador visual inválido em {rel}')
    if CANON not in text or REVISION not in text:
        raise SystemExit(f'App4 R5 não injetado em {rel}')
    if 'portalTacsAdminUiBehaviorR5' not in text:
        raise SystemExit(f'Comportamento R5 não injetado em {rel}')

injector = (ROOT / 'scripts/injetar_admin_ui_standard_v1.py').read_text(encoding='utf-8')
for target in TARGETS:
    if repr(target) not in injector:
        raise SystemExit(f'Injetor não cobre painel: {target}')
for forbidden in ["'index.html'", 'portal-morador.html', 'abrir.html']:
    if forbidden in injector:
        raise SystemExit(f'Fonte pública não pode entrar no injetor administrativo: {forbidden}')

print('ADMIN_UI_APP4_CANONICAL_R5_OK')
print('SESSAO_UNICA_VISUAL_OK')
print('PIN_REPETIDO_OCULTO_COM_SESSAO_OK')
print('TITULOS_ESPECIFICOS_SUPORTE_OK')
print(f'PAINEIS_VALIDADOS={len(TARGETS)}')
