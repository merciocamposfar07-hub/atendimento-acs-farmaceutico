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

css = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8')
behavior = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
required_css = [
    'background:#071827!important',
    'background-image:none!important',
    'width:70px!important',
    'font-size:2.25rem!important',
    'R6 FINAL',
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
        raise SystemExit(f'CSS canônico R6 sem token obrigatório: {token}')

# A revisão rejeita a antiga moldura grossa azul-clara aplicada a todos os cards.
for forbidden in [
    '.panel,.painel,.card,.box,.caixa,.newbox{\n  min-width:0;\n  max-width:100%;\n  color:var(--tacs-app-text)!important;\n  background:linear-gradient(145deg,#174765,#0c3049)!important;\n  border:2px solid #69b8c0!important',
    'border-left:1px solid var(--tacs-app-line)',
    'border-right:1px solid var(--tacs-app-line)',
]:
    if forbidden in css:
        raise SystemExit('CSS R6 ainda contém moldura estrutural rejeitada')

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
        raise SystemExit(f'Comportamento App4 R6 sem token obrigatório: {token}')

for rel in TARGETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f'Painel administrativo ausente: {rel}')
    text = path.read_text(encoding='utf-8')
    if text.count(START) != 1 or text.count(END) != 1:
        raise SystemExit(f'Marcador visual inválido em {rel}')
    if CANON not in text or REVISION not in text:
        raise SystemExit(f'App4 R6 não injetado em {rel}')
    if 'portalTacsAdminUiBehaviorR6' not in text:
        raise SystemExit(f'Comportamento R6 não injetado em {rel}')

injector = (ROOT / 'scripts/injetar_admin_ui_standard_v1.py').read_text(encoding='utf-8')
for target in TARGETS:
    if repr(target) not in injector:
        raise SystemExit(f'Injetor não cobre painel: {target}')
for forbidden in ["'index.html'", 'portal-morador.html', 'abrir.html']:
    if forbidden in injector:
        raise SystemExit(f'Fonte pública não pode entrar no injetor administrativo: {forbidden}')

print('ADMIN_UI_APP4_CANONICAL_R6_OK')
print('SESSAO_UNICA_VISUAL_OK')
print('PIN_REPETIDO_OCULTO_COM_SESSAO_OK')
print('TITULOS_ESPECIFICOS_SUPORTE_OK')
print(f'PAINEIS_VALIDADOS={len(TARGETS)}')


# R7 VISUAL ONLY — nenhuma regra de autenticação faz parte desta revisão.
for token in [
    'R7 VISUAL ONLY — UNIFICAÇÃO CROMÁTICA + MARCA/LEITURA',
    'width:104px!important',
    'font-size:1.08rem!important',
    'color:#d8e6ee!important',
    'width:80px!important',
    'background:#071827!important',
]:
    if token not in css:
        raise SystemExit(f'Visual R7 sem requisito obrigatório: {token}')
print('R7_VISUAL_ONLY_OK')


# AJUSTES_PONTUAIS_2026_09_10_V1
behavior_now = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
if "csc-resident-redundant-tacs-access" not in behavior_now:
    raise SystemExit('Acesso TACS redundante ainda não foi marcado para ocultação no painel Moradores.')
moradores_html = (ROOT / 'teste-v1/painel-moradores-v2.html').read_text(encoding='utf-8')
if '>TACS, áreas e importação CSV</a>' in moradores_html:
    raise SystemExit('Atalho TACS/áreas/CSV ainda existe no painel Moradores.')
for wrapper in ['painel-oficial-profissionais-servicos.html','painel-oficial-tacs-areas.html']:
    txt_wrapper = (ROOT / wrapper).read_text(encoding='utf-8')
    if 'delete window.PortalTacsAdminApp4ShellR6' not in txt_wrapper:
        raise SystemExit(f'Wrapper sem reinicialização do shell único: {wrapper}')
municipios_html = (ROOT / 'painel-oficial-organizacoes-municipios.html').read_text(encoding='utf-8')
if "button.textContent='Vínculo salvo!'" not in municipios_html:
    raise SystemExit('Confirmação visual Vínculo salvo! ausente.')
mensal_js = (ROOT / 'recados-campanhas-whatsapp-mensal-v12.js').read_text(encoding='utf-8')
for token in ["box.dataset.signature=signature","existing&&existing.dataset.signature===signature","subtree:false"]:
    if token not in mensal_js:
        raise SystemExit(f'Correção de trava Recados/Campanhas incompleta: {token}')
print('AJUSTES_PONTUAIS_2026_09_10_V1_OK')


# CORRECOES_PONTUAIS_APP_2026_09_10_V2
support_html = (ROOT / 'painel-suporte-moradores-v2.html').read_text(encoding='utf-8')
if 'id="diagFrame"' in support_html:
    raise SystemExit('Diagnóstico ainda usa iframe/tela dentro de tela.')
for token in ['DIAGNOSTICO_INLINE_V1','diag-inline-device','admin_notificacoes_saude_result','Reparo automático em andamento','Reparo concluído']:
    if token not in support_html:
        raise SystemExit(f'Diagnóstico inline incompleto: {token}')

agenda_html = (ROOT / 'painel-oficial-agendas-vagas.html').read_text(encoding='utf-8')
if 'Digite o PIN para carregar as agendas' in agenda_html:
    raise SystemExit('Agendas ainda pede segundo PIN.')
if 'id="atualizarPaginaAgendasFlutuante"' in agenda_html:
    raise SystemExit('Agendas ainda contém botão Atualizar página do rodapé.')

municipios_html = (ROOT / 'painel-oficial-organizacoes-municipios.html').read_text(encoding='utf-8')
for token in ["button.textContent='Vínculo salvo!'","box.textContent='Vínculo salvo!'"]:
    if token not in municipios_html:
        raise SystemExit(f'Confirmação de vínculo incompleta: {token}')

behavior = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
for token in [
    "['▦','Prontuários',openRecordsPage]",
    "['🔔','Pendências',openPendingPage]",
    "TACS cadastrados",
    "Administradores",
    "tecnologia aproximando pessoas, serviços e comunidade.",
    "Ano letivo 2026",
    "return 'Pendências da área'",
]:
    if token not in behavior:
        raise SystemExit(f'Dock/Perfil/Rodapé incompleto: {token}')

css_now = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8')
for token in ['RODAPE_PLATAFORMA_2026_V1','.csc-platform-footer','background:#071827!important']:
    if token not in css_now:
        raise SystemExit(f'Rodapé/tela única incompleto: {token}')

mensal = (ROOT / 'recados-campanhas-whatsapp-mensal-v12.js').read_text(encoding='utf-8')
for token in ['existing&&existing.dataset.signature===signature','subtree:false']:
    if token not in mensal:
        raise SystemExit(f'Recados/Campanhas sem correção de trava: {token}')

moradores = (ROOT / 'teste-v1/painel-moradores-v2.html').read_text(encoding='utf-8')
if '>TACS, áreas e importação CSV</a>' in moradores:
    raise SystemExit('Atalho TACS/áreas/CSV voltou ao painel de moradores.')

print('CORRECOES_PONTUAIS_APP_2026_09_10_V2_OK')
