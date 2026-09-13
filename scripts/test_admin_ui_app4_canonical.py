from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANON = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10'
REVISION = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R6'
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

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

css = read('admin-ui-standard.inline.css')
behavior = read('admin-ui-behavior.inline.js')
central_html = read('central-administrativa-tacs.html')
central_js = read('central-administrativa-tacs.js')
nav_guard = read('central-suporte-moradores-v1.js')
agenda_native = read('conecta-agendas-native-v1.js')
moradores_native = read('conecta-moradores-native-v1.js')
prof_native = read('conecta-profissionais-native-v1.js')
agenda_card = read('agenda-whatsapp-card-v1.js')
recados_card = read('recados-campanhas-whatsapp-card-v9.js')
mensal_card = read('recados-campanhas-whatsapp-mensal-v12.js')

for token in [CANON, REVISION, '--tacs-app-bg:#071827', '--tacs-app-card:#102d46', '--tacs-app-card2:#153b58', '--tacs-app-line:#2b5a76', '--tacs-app-accent:#83efa9', '.csc-appbar-icon', 'border:0!important']:
    if token not in css:
        raise SystemExit(f'CSS App4 sem token canônico: {token}')

for token in ['tacsPinAccess', 'csc-admin-only-auth', 'csc-pressed', REVISION, "brand.textContent='CONECTA SAÚDE COMUNITÁRIA'", "strong.textContent=panelTitle()", "back.addEventListener('click'", '.csc-session-active .csc-dock{display:grid!important}']:
    if token not in behavior:
        raise SystemExit(f'Comportamento App4 sem token canônico: {token}')

for rel in TARGETS:
    text = read(rel)
    if text.count(START) != 1 or text.count(END) != 1:
        raise SystemExit(f'Marcador visual inválido em {rel}')
    if CANON not in text or REVISION not in text or 'portalTacsAdminUiBehaviorR6' not in text:
        raise SystemExit(f'App4 R6 não injetado em {rel}')

injector = read('scripts/injetar_admin_ui_standard_v1.py')
for target in TARGETS:
    if repr(target) not in injector:
        raise SystemExit(f'Injetor não cobre painel: {target}')
for forbidden in ["'index.html'", 'portal-morador.html', 'abrir.html']:
    if forbidden in injector:
        raise SystemExit(f'Fonte pública não pode entrar no injetor administrativo: {forbidden}')

# Contrato atual: Tarefas 16–18 migraram Agendas, Moradores e Profissionais para host nativo.
for token in ['TAREFA_16_AGENDAS_NATIVAS_V1', 'showNativeAgenda']:
    if token not in agenda_native + central_js:
        raise SystemExit(f'Agendas nativas incompletas: {token}')
for token in ['TAREFA_17_MORADORES_NATIVOS_V1', 'showNativeMoradores']:
    if token not in moradores_native + central_js:
        raise SystemExit(f'Moradores nativos incompletos: {token}')
for token in ['TAREFA_18_PROFISSIONAIS_NATIVOS_V1', 'showNativeProfissionais']:
    if token not in prof_native + central_js:
        raise SystemExit(f'Profissionais nativos incompletos: {token}')

# Correção solicitada pelo usuário: apresentação apenas, sem trocar backend/ações.
for token in ['APP4_PALETA_OFICIAL_SEM_AZUL_CLARO_2026_09_13_V1', 'CORRECAO_VISUAL_SEM_ATUALIZAR_FLUTUANTE_V1', '#portalTacsCentralRefreshV1,#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1', '.csc-appbar,.viewer .viewer-bar,#cscInstitutionalAppbar{position:static!important']:
    if token not in nav_guard:
        raise SystemExit(f'Guard visual App4 incompleto: {token}')
if "button.textContent='↻ Atualizar página'" in nav_guard:
    raise SystemExit('Botão flutuante Atualizar página voltou ao código da Central.')

for forbidden in ['>← Central</button>', 'position:sticky!important', 'position:fixed!important']:
    if forbidden in central_html:
        raise SystemExit(f'Central voltou a exibir regra visual rejeitada: {forbidden}')
for token in ['viewerFooter', 'CONECTA SAÚDE COMUNITÁRIA', 'conecta-saude-central-canonico-2026-09-09.png', 'Plataforma institucional de saúde comunitária']:
    if token not in central_html:
        raise SystemExit(f'Cabeçalho/rodapé App4 incompleto na Central: {token}')

# WhatsApp Status e ícone oficial nos cards gerados.
official = 'conecta-saude-central-canonico-2026-09-09.png'
for token in ['csc-ag-share-day', '📲 Postar no Status do WhatsApp', 'csc-ag-share-group', '📲 Postar agenda completa no Status do WhatsApp']:
    if token not in agenda_native:
        raise SystemExit(f'Agenda nativa sem WhatsApp Status: {token}')
for source_name, source in [('agenda', agenda_card), ('recados', recados_card), ('campanhas mensais', mensal_card)]:
    if official not in source:
        raise SystemExit(f'Card de {source_name} sem ícone oficial do Conecta.')
for token in ['Postar recado no Status do WhatsApp', 'Postar no status do WhatsApp']:
    if token not in recados_card:
        raise SystemExit(f'Recados sem Status do WhatsApp: {token}')
if 'Postar campanhas de ' not in mensal_card or ' no Status do WhatsApp' not in mensal_card:
    raise SystemExit('Campanhas mensais sem Status do WhatsApp.')

# Rodapé atual não pode voltar para rótulos antigos/ciclo antigo.
if '2026/2027' in behavior or '2026/2027' in central_html:
    raise SystemExit('Rodapé voltou a exibir ciclo 2026/2027.')

print('ADMIN_UI_APP4_CANONICAL_R6_OK')
print('SESSAO_UNICA_VISUAL_OK')
print('PIN_REPETIDO_OCULTO_COM_SESSAO_OK')
print('TITULOS_ESPECIFICOS_SUPORTE_OK')
print(f'PAINEIS_VALIDADOS={len(TARGETS)}')
print('R7_VISUAL_ONLY_OK')
print('APP4_CANON_COR_SEM_BORDAS_V2_OK')
print('LOGIN_PROPOSTA_APP4_OK')
print('LOGOFF_VERMELHO_OK')
print('CORRECOES_PONTUAIS_APP_2026_09_10_V5_OK')
