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
    'APP4_CANON_COR_SEM_BORDAS_2026_09_11_V2',
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
    'border:0!important',
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
for token in [
    'SESSAO_UNICA_PAINEL_2026_09_11_V1',
    '.csc-admin-panel .csc-auth-control',
    '.csc-admin-panel #tacsPinPublicacoes',
    '.csc-admin-panel .csc-resident-redundant-tacs-access',
]:
    if token not in css:
        raise SystemExit(f'CSS de sessão única incompleto: {token}')
for token in [
    "ROOT.classList.toggle('csc-admin-panel',!CENTRAL)",
    "var loginPasswordIds=['pin','adminPin','tacsPinLogin','tacsPinAccess','tacsPinPublicacoes']",
    "'entrarTacs'",
]:
    if token not in behavior:
        raise SystemExit(f'Comportamento de sessão única incompleto: {token}')
for forbidden in [
    '.csc-moradores-access #tacsPinAccess,.csc-moradores-access label[for="tacsPinAccess"],.csc-moradores-access #loginTacs{display:block!important}',
    'function enforceSingleEntry()',
    "singleEntryStyle.id='cscSingleEntryGateV1'",
]:
    if forbidden in css or forbidden in behavior:
        raise SystemExit(f'Regressão de autenticação interna: {forbidden}')
print('PIN_REPETIDO_OCULTO_COM_SESSAO_OK')
print('TITULOS_ESPECIFICOS_SUPORTE_OK')
print(f'PAINEIS_VALIDADOS={len(TARGETS)}')


# R7 VISUAL ONLY — nenhuma regra de autenticação faz parte desta revisão.
for token in [
    'R7 VISUAL ONLY — UNIFICAÇÃO CROMÁTICA + MARCA/LEITURA',
    'APP4_CANON_COR_SEM_BORDAS_2026_09_11_V2',
    'width:104px!important',
    'font-size:1.08rem!important',
    'color:#d8e6ee!important',
    'width:80px!important',
    'background:#071827!important',
]:
    if token not in css:
        raise SystemExit(f'Visual R7 sem requisito obrigatório: {token}')
print('R7_VISUAL_ONLY_OK')

# APP4 V2 — cor exatamente do protótipo aprovado e balões sem borda.
for token in [
    'background:linear-gradient(145deg,#153b58,#102d46)!important',
    'background:linear-gradient(145deg,#174765,#0c3049)!important',
    'background:#135272!important',
    'background:#236581!important',
    '#results>.card>button:first-child',
]:
    if token not in css:
        raise SystemExit(f'App4 V2 sem cor canônica obrigatória: {token}')
if 'UNISONO_SEM_BORDAS_2026_09_11_V1' in css:
    raise SystemExit('Bloco visual incorreto anterior ainda está ativo.')

behavior_v2 = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
for token in [
    'function keepFinalSkinLast()',
    "node.id!=='cscApp4FinalSkinR6'",
    'background:linear-gradient(145deg,#153b58,#102d46)!important',
    'border:0!important',
]:
    if token not in behavior_v2:
        raise SystemExit(f'Skin final App4 V2 incompleta: {token}')

msg_ind = (ROOT / 'teste-v1/mensagem-individual-morador-v1.js').read_text(encoding='utf-8')
msg_integ = (ROOT / 'teste-v1/mensagem-individual-morador-integracao-v1.js').read_text(encoding='utf-8')
msg_rel = (ROOT / 'teste-v1/mensagem-relatorio-entrega-v1.js').read_text(encoding='utf-8')
for source_name, source in [('mensagem individual',msg_ind),('integração moradores',msg_integ),('relatório entrega',msg_rel)]:
    if 'background:#fff!important' in source or 'background:#fff8df!important' in source:
        raise SystemExit(f'{source_name} voltou a criar balão branco.')
for forbidden in ['border:3px solid #69c7e7!important','border:3px solid #8df0b4!important','border:3px solid #ffd36a!important']:
    if forbidden in msg_ind or forbidden in msg_integ or forbidden in msg_rel:
        raise SystemExit(f'Extensão de moradores voltou a criar borda rejeitada: {forbidden}')
print('APP4_CANON_COR_SEM_BORDAS_V2_OK')

# LOGIN PROPOSTA — referência exata do protótipo 4 • App institucional.
central_login = (ROOT / 'central-administrativa-tacs.html').read_text(encoding='utf-8')
for token in [
    'Proposta do Conecta Saúde Comunitária',
    'class="csc-login-purpose-card"',
    'LOGIN_PROPOSTA_APP4_2026_09_11_V1',
    'background:linear-gradient(145deg,#153b58,#102d46)!important',
    'border:0!important',
]:
    if token not in central_login:
        raise SystemExit(f'Tela de acesso sem requisito da proposta App4: {token}')
for forbidden in [
    'Entre como administrador ou TACS da sua área.',
    'Porque o Conecta Saúde Comunitária foi desenvolvido',
]:
    if forbidden in central_login:
        raise SystemExit(f'Tela de acesso voltou a exibir texto removido: {forbidden}')
print('LOGIN_PROPOSTA_APP4_OK')

# LOGOFF — exceção funcional solicitada ao padrão cromático geral.
for token in [
    'LOGOFF_VERMELHO_2026_09_11_V1',
    'html body #logout.csc-logout-button',
    'background:#972f2f!important',
]:
    if token not in css:
        raise SystemExit(f'Logoff vermelho incompleto no CSS canônico: {token}')
if '#logout.csc-logout-button{background:#972f2f!important' not in behavior_v2:
    raise SystemExit('Skin final voltou a pintar o Logoff de azul.')
print('LOGOFF_VERMELHO_OK')

# CORRECOES_PONTUAIS_APP_2026_09_10_V5
behavior_now = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8')
css_now = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8')

# 1. Diagnóstico: mesma página, sem iframe visual, sem cartões brancos e com ciclo de reparo.
support_v2 = (ROOT / 'painel-suporte-moradores-v2.html').read_text(encoding='utf-8')
for token in [
    'DIAGNOSTICO_INLINE_CORRECAO_PONTUAL_V4',
    'id="devicesPane"',
    'id="diagLista"',
    'function diagPhase(a)',
    "txt(a&&a.status).toUpperCase()==='ATIVO'",
    "Reparo concluído",
    "Aguardando morador abrir o Portal",
    '#devicesPane iframe{display:none!important}',
    'data-diag-filter="ATIVO"',
    'data-diag-filter="INATIVO"',
    'data-diag-filter="REPARO"',
    'data-diag-filter="SEM_CONFIRMACAO"',
    'id="diagDetails"',
    "diagFilter=PENDING_VIEW?'PENDENTES':''",
]:
    if token not in support_v2:
        raise SystemExit(f'Diagnóstico inline V4 incompleto: {token}')
if 'id="diagFrame"' in support_v2:
    raise SystemExit('Diagnóstico voltou a criar iframe/tela interna visível.')
if 'Reparo já solicitado' in support_v2:
    raise SystemExit('Diagnóstico voltou ao estado permanente "Reparo já solicitado".')

support_legacy = (ROOT / 'painel-suporte-moradores.html').read_text(encoding='utf-8')
for token in [
    "location.replace('/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?'",
    "p.set('tab','devices')",
    "p.set('v','20260910-diagnostico-inline-v4')",
]:
    if token not in support_legacy:
        raise SystemExit(f'Rota legada do diagnóstico incompleta: {token}')

# 2. Agendas: a autenticação é da Central; o módulo não mostra PIN nem botão Atualizar página.
agenda_html = (ROOT / 'painel-oficial-agendas-vagas.html').read_text(encoding='utf-8')
for forbidden in [
    'Digite o PIN para carregar as agendas',
    'Abra Agendas e vagas pela Central Administrativa.',
    'Atualizar página',
    'Atualizar pagina',
]:
    if forbidden in agenda_html:
        raise SystemExit(f'Agendas ainda contém elemento rejeitado: {forbidden}')
for token in [
    "if(loginStatus)loginStatus.classList.add('oculto')",
    'agendaRemoveAtualizarPaginaV1',
    'AGENDA_CLEANUP_LIMITADO_V2',
]:
    if token not in agenda_html:
        raise SystemExit(f'Agendas sem proteção solicitada: {token}')
if 'new MutationObserver(limpar).observe' in agenda_html:
    raise SystemExit('Agendas voltou a usar MutationObserver contínuo que pode travar o iPhone.')

agenda_card_js = (ROOT / 'agenda-whatsapp-card-v1.js').read_text(encoding='utf-8')
for forbidden in [
    "b.id='atualizarPaginaAgendasFlutuante'",
    "b.innerHTML='<span aria-hidden=\"true\">↻</span><span>Atualizar página</span>'",
]:
    if forbidden in agenda_card_js:
        raise SystemExit('O script de cards do WhatsApp voltou a criar o botão flutuante Atualizar página.')

# 3. Vínculo: só confirma depois da resposta do servidor.
municipios_html = (ROOT / 'painel-oficial-organizacoes-municipios.html').read_text(encoding='utf-8')
for token in [
    "button.textContent='Vínculo salvo'",
    '✓ Vínculo salvo',
    "if(apply(r,'Área vinculada e conferida.'))showAreaFeedback",
]:
    if token not in municipios_html:
        raise SystemExit(f'Confirmação de vínculo incompleta: {token}')

# 4. Prontuários: botão inferior e busca integrada em todas as áreas do administrador.
moradores_html = (ROOT / 'teste-v1/painel-moradores-v2.html').read_text(encoding='utf-8')
moradores_transport = (ROOT / 'teste-v1/painel-moradores-transport-v2.js').read_text(encoding='utf-8')
if '>TACS, áreas e importação CSV</a>' in moradores_html:
    raise SystemExit('Atalho TACS/áreas/CSV voltou ao painel de moradores.')
for token in [
    'var PRONTUARIOS_VIEW=',
    'function searchProntuariosTodasAreas(',
    "cloneSession({q:q,areaId:areaId})",
    "item._areaId=areaId",
    'prontuario-area',
    'Abrindo prontuário da área ',
]:
    if token not in moradores_transport:
        raise SystemExit(f'Prontuários multiárea incompleto: {token}')
if 'csc-resident-redundant-tacs-access' not in behavior_now:
    raise SystemExit('Bloco de segundo acesso TACS voltou ao painel Moradores.')

# 5. Sino: tela própria de pendências reúne chamados de morador e avarias do sistema.
for token in [
    'PENDENCIAS_RAPIDAS_AREA_V1',
    'Pendências dos moradores',
    'Pendências do sistema',
    'function diagIsPending(a)',
    "$('ticketsPane').classList.remove('hidden');",
    "$('devicesPane').classList.remove('hidden');",
]:
    if token not in support_v2:
        raise SystemExit(f'Central rápida de pendências incompleta: {token}')

# 6. Navegação inferior e Perfil.
for token in [
    "['▦','Prontuários',openRecordsPage]",
    'view=prontuarios&all=1',
    "['🔔','Pendências',openPendingPage]",
    'view=pending',
    "['●','Perfil',openProfilePage]",
    'Array.isArray(ctx.tacs)?ctx.tacs:[]',
    '<h3>Administradores</h3>',
    '<h3>TACS cadastrados</h3>',
    '<h3>Áreas</h3>',
    'csc-profile-area-jump',
    'csc-profile-admin-toggle',
    'csc-profile-admin-names',
]:
    if token not in behavior_now:
        raise SystemExit(f'Navegação/Perfil incompletos: {token}')

# 7. Rodapé institucional em todas as superfícies injetadas.
for token in [
    'Conecta Saúde Comunitária - tecnologia aproximando pessoas, serviços e comunidade.',
    'Conecta Saúde Comunitária — Plataforma',
]:
    if token not in behavior_now:
        raise SystemExit(f'Rodapé institucional incompleto: {token}')
for token in [
    'RODAPE_INSTITUCIONAL_V3',
    '.csc-platform-footer',
    'background:#071827!important',
    'CAMPOS_SEM_BALOES_BRANCOS_2026_09_10_V1',
    'AREA_CONTROL_SEM_BRANCO_2026_09_10_V2',
    'PRONTUARIO_AREA_IDENTIFICACAO_V1',
]:
    if token not in css_now:
        raise SystemExit(f'Estilo tela única/rodapé/campos incompleto: {token}')

# 8. Recados/Campanhas segue sem loop de MutationObserver.
mensal_js = (ROOT / 'recados-campanhas-whatsapp-mensal-v12.js').read_text(encoding='utf-8')
for token in ['existing&&existing.dataset.signature===signature','subtree:false']:
    if token not in mensal_js:
        raise SystemExit(f'Recados/Campanhas sem correção da trava: {token}')

# 9. Wrappers internos constroem novamente o shell canônico.
for wrapper in ['painel-oficial-profissionais-servicos.html','painel-oficial-tacs-areas.html']:
    txt_wrapper = (ROOT / wrapper).read_text(encoding='utf-8')
    if 'delete window.PortalTacsAdminApp4ShellR6' not in txt_wrapper:
        raise SystemExit(f'Wrapper sem reinicialização do shell único: {wrapper}')

central_js = (ROOT / 'central-administrativa-tacs.js').read_text(encoding='utf-8')
if 'AGENDA_DIRECT_NAV_V1' not in central_js or "if(name==='agendas'){location.assign" not in central_js:
    raise SystemExit('Agendas não está usando a rota direta anti-travamento.')

territorio_gs = (ROOT / 'apps-script/ZZZZ_17_TacsAreasAdminV1.gs').read_text(encoding='utf-8')
for token in ['tacsTerritorioV1AdministradoresContexto_', 'administradores:administradores']:
    if token not in territorio_gs:
        raise SystemExit(f'Perfil sem leitura nominal de administradores: {token}')

if '2026/2027' in behavior_now:
    raise SystemExit('Rodapé voltou a exibir ciclo 2026/2027 sem necessidade funcional.')

nav = (ROOT / 'central-suporte-moradores-v1.js').read_text(encoding='utf-8')
if "var REVISION='20260910-pontuais-v5'" not in nav:
    raise SystemExit('Rotas administrativas sem a revisão pontual V5 de cache.')

print('CORRECOES_PONTUAIS_APP_2026_09_10_V5_OK')
