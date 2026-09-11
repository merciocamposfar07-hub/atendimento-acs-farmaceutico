const fs=require('fs');
const assert=require('assert');

function read(path){return fs.readFileSync(path,'utf8');}
const central=read('central-administrativa-tacs.html');
const centralJs=read('central-administrativa-tacs.js');
const unified=read('conecta-acesso-unificado-v1.js');
const resident=read('conecta-morador-session-v1.js');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const health=read('apps-script/ZZZZ_22_SaudeNotificacoesV1.gs');
const support=read('painel-suporte-moradores-v2.html');
const areas=read('teste-v1/painel-tacs-areas-v1.js');
const areasHtml=read('teste-v1/painel-tacs-areas-v1.html');
const build=read('scripts/build_apps_script_release.js');

new Function(centralJs);
new Function(unified);
new Function(resident);
new Function(backend);
new Function(areas);

assert(central.includes('conecta-acesso-unificado-v1.js'),'A Central deve carregar a entrada unificada');
assert(unified.includes("b.id='tabMorador'"),'Entrada unificada deve oferecer perfil Morador');
assert(unified.includes("p.textContent='Esqueci meu PIN'"),'Tela de acesso deve oferecer Esqueci meu PIN');
assert(unified.includes("currentRecoveryRole"),'Recuperação deve respeitar o perfil escolhido');
assert(unified.includes("chaveConfianca:proof"),'Recuperação deve enviar prova do aparelho');
assert(!/SMS|WhatsApp OTP|c[oó]digo SMS/i.test(unified),'Recuperação não deve depender de SMS');

assert(backend.includes("TRUST_SHEET:'TACS_CONECTA_APARELHOS_CONFIAVEIS'"),'Backend deve persistir somente prova hash de aparelho confiável');
assert(backend.includes("conecta_recuperacao_registrar_aparelho"),'Backend deve registrar aparelho confiável após autenticação');
assert(backend.includes("dispositivoHash:conectaAcessoV1Hash_(dispositivo)"),'Recuperação deve ficar vinculada ao mesmo aparelho');
assert(backend.includes("recupere o PIN em um aparelho já reconhecido"),'Admin/TACS não podem redefinir PIN só conhecendo CPF');
assert(backend.includes("recupere o PIN no aparelho já reconhecido por este morador"),'Morador não pode redefinir PIN só conhecendo CPF');
assert(backend.includes("function conectaAcessoV1SalvarCpf_"),'Primeiro acesso deve poder qualificar o cadastro existente com CPF');
assert(backend.includes("CPF_PREENCHIDO_EM_CAMPO_VAZIO"),'CPF deve ser escrito no registro canônico quando o campo estiver vazio');
assert(backend.includes("Cadastro pendente de conferência. Você pode continuar normalmente com sua solicitação."),'Morador sem correspondência segura não pode ser bloqueado');
assert(backend.includes("function conectaAcessoV1ContarPendenciasArea_"),'Pendências cadastrais devem alimentar a Central');
assert(backend.includes("O PIN deve ter exatamente 4 números."),'PIN do morador deve ter quatro números');
assert(build.includes("apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs"),'Módulo unificado deve entrar no release Apps Script');

assert(resident.includes('Esta etapa é obrigatória.'),'Notificações devem ser obrigatórias no primeiro acesso');
assert(!/Agora n[aã]o/i.test(resident),'Gate inicial não deve oferecer pular notificações');
assert(resident.includes("conecta_morador_notificacao_confirmar"),'Ativação precisa ser confirmada no backend');
assert(resident.includes("renderFamily"),'Sessão autenticada deve apresentar núcleo familiar');
assert(resident.includes("portalConectaMoradorTokenV1"),'Próximos acessos devem usar sessão do morador');

assert(centralJs.includes('LOGOFF_PRESERVA_CACHE_V2'),'Logoff deve preservar cache e dados locais');
assert(centralJs.includes("sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY)"),'Logoff deve remover somente tokens de autenticação');
assert(!/sessionStorage\.clear\(|localStorage\.clear\(/.test(centralJs),'Logoff não pode apagar armazenamento inteiro');
assert(centralJs.includes('LOGIN_PREFETCH_ESTATICO_V2'),'Login deve aquecer recursos sem bloquear o carregamento inicial');
assert(centralJs.includes("window.addEventListener('load'"),'Pré-carga deve começar depois do primeiro load ou por interação no PIN');
assert(centralJs.includes("fetch(url+'?v=20260910-login-prefetch-v2'"),'Pré-carga deve usar fetch assíncrono/cache');
assert(centralJs.includes("location.assign(url+sep+'from=central&_cb='+Date.now());"),'Agendas deve usar navegação direta quando exigido');
assert(centralJs.includes("'painel-oficial-agendas-vagas.html'"),'Agendas e Vagas deve manter rota direta');
assert(!centralJs.includes("link.rel='prefetch'"),'Não voltar ao prefetch que mantém o Safari carregando');

assert(health.includes('REPAIR_VALID_HOURS:24'),'Solicitação de reparo deve expirar em 24 horas');
assert(health.includes('autoNoPrimeiroAcesso'), 'Reparo expirado com vínculo deve poder ser automático no primeiro acesso');
assert(health.includes('if(expirado&&!vinculado)return null'),'Sem vínculo válido, reparo expirado deve liberar nova ação administrativa');

assert(support.includes("var diagFilter=''"),'Diagnóstico não deve abrir mostrando automaticamente a lista de aptos');
assert(support.includes("data-diag-filter"),'Indicadores do diagnóstico devem ser clicáveis');
assert(support.includes("diagDetails.hidden=!diagFilter"),'Detalhes devem ficar ocultos até selecionar indicador');

assert(areasHtml.includes('id="areaLinkState"'),'Formulário de área deve expor estado real do vínculo');
assert(areasHtml.includes('id="saveAreaButton"'),'Botão de vínculo deve ter estado controlável');
assert(areas.includes("✓ Área vinculada e ativa"),'Área ativa já vinculada deve aparecer como confirmada');
assert(areas.includes("Salvar novo vínculo"),'Mudança real de vínculo deve habilitar Salvar novo vínculo');
assert(areas.includes("Vínculo confirmado:"),'Confirmação deve informar área/unidade vinculadas');

assert(central.includes('portalTacsCentralContextCacheV3:'),'Perfil deve ler o cache V3 usado pela Central');
assert(central.includes('ctx.administradores'),'Perfil deve listar administradores reais retornados pelo servidor');
assert(central.includes('Plataforma institucional de saúde comunitária.'),'Rodapé deve usar assinatura institucional final');
assert(!/2026\/2027/.test(central),'Rodapé não pode ter 2026/2027');
assert(central.includes('plataforma de gestão e acesso à saúde comunitária'),'Login deve explicar claramente o que é o Conecta');
assert(central.includes('acessível pelo celular'),'Login deve explicitar o acesso pelo celular');
assert(central.includes('Porque o Conecta Saúde Comunitária foi desenvolvido'),'Título institucional aprovado deve permanecer no acesso.');
assert(central.includes('Porque o Conecta Saúde Comunitária foi desenvolvido'),'Título institucional do acesso deve usar a redação aprovada.');
assert(central.includes('Tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível.'),'Login deve fechar com a assinatura institucional');

console.log('Conecta acesso unificado e correções pendentes: OK');
