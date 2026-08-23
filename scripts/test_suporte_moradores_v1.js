const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const bootstrap=read('central-suporte-moradores-v1.js');
const performance=read('central-admin-performance-v1.js');
const panelV1=read('painel-suporte-moradores.html');
const panelV2=read('painel-suporte-moradores-v2.html');
const portal=read('portal-institucional-suporte-v1.js');
const autoUpdate=read('portal-auto-update.js');
const backend=read('apps-script/ZZZZ_48_SuporteMoradoresV1.gs');
const builder=read('scripts/build_apps_script_release.js');

assert.strictEqual((central.match(/data-module="suporte"/g)||[]).length,1,'Central deve ter exatamente um módulo Suporte aos moradores');
assert(central.includes('<strong>Suporte aos moradores</strong>'),'Rótulo do módulo de suporte ausente');
assert(central.includes('central-suporte-moradores-v1.js'),'Central não carrega o bootstrap de suporte/desempenho');
assert(bootstrap.includes('BLOCO_1_CONTROLE_UNICO_V1'),'Bootstrap do suporte deve respeitar o controlador único da Central');
assert(!bootstrap.includes('painel-suporte-moradores-v2.html'),'Bootstrap do suporte não pode navegar diretamente para painéis');
assert(performance.includes("if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html"),'Controlador oficial não aponta Suporte para a interface dedicada V2');
assert(performance.includes("name==='suporte'"),'Controlador oficial deve tratar Suporte como módulo próprio');

assert(panelV1.includes('Vínculos protegidos'),'Diagnóstico deve explicar a preservação dos vínculos');
assert(panelV1.includes('admin_suporte_moradores_diagnostico'),'Interface de diagnóstico não usa o endpoint dedicado');
assert(panelV1.includes('admin_notificacoes_solicitar_reparo_aparelho'),'Reparo individual seguro ausente');
assert(!panelV1.includes('admin_notificacoes_solicitar_reparo_area'),'Diagnóstico dedicado não deve disparar reparo coletivo');
assert(!/removeItem\s*\(\s*DEVICE_KEY/.test(panelV1),'Interface não pode apagar a identidade local do aparelho');
assert(!/localStorage\.clear\s*\(/.test(panelV1),'Interface não pode limpar os vínculos locais');

assert(panelV2.includes('Chamados dos moradores'),'Painel V2 deve ter a caixa de chamados');
assert(panelV2.includes('Diagnóstico dos aparelhos'),'Painel V2 deve manter o diagnóstico técnico separado');
assert(panelV2.includes('NOVO')&&panelV2.includes('EM_ANALISE')&&panelV2.includes('RESPONDIDO')&&panelV2.includes('RESOLVIDO'),'Estados do chamado incompletos');
assert(panelV2.includes('admin_suporte_chamados_listar')&&panelV2.includes('admin_suporte_chamado_atualizar'),'Painel V2 não está conectado aos chamados administrativos');
assert(panelV2.includes('painel-suporte-moradores.html'),'Painel V2 deve reutilizar o diagnóstico existente sem duplicá-lo');

assert(portal.includes('Conecta Saúde Comunitária'),'Assinatura institucional Conecta Saúde ausente no Portal');
['Privacidade','Acessibilidade','Sobre','Suporte'].forEach((label)=>assert(portal.includes(label),'Link institucional ausente: '+label));
assert(portal.includes("data-portal-info=\"support\""),'Rodapé não possui acionamento de suporte');
assert(portal.includes('publico_suporte_chamado_criar'),'Portal não cria chamado de suporte');
assert(portal.includes('publico_suporte_chamado_status'),'Portal não consulta resposta do suporte');
assert(portal.includes('PortalTacsReparoV9'),'Suporte de notificações deve consultar o diagnóstico/reparo já existente');
assert(portal.includes('top:calc(10px + env(safe-area-inset-top))')&&portal.includes('bottom:auto!important'),'Botão Atualizar não foi deslocado para o topo');
assert(portal.includes('Versão ')||portal.includes("'Versão '+"),'Rodapé deve expor a versão do sistema');
assert(!/localStorage\.clear\s*\(/.test(portal),'Camada institucional não pode limpar conexões locais');
assert(!/removeItem\s*\([^)]*(?:Dispositivo|subscription|OneSignal)/i.test(portal),'Camada institucional não pode apagar identidade Push');
assert(autoUpdate.includes('loadInstitutionalPortal'),'Atualização automática não carrega a camada institucional');
assert(autoUpdate.includes('portal-institucional-suporte-v1.js'),'Script institucional não está integrado ao Portal');

assert(backend.includes('var TACS_SUPORTE_MORADORES_V1 = Object.freeze('),'Marcador do módulo Apps Script ausente');
assert(backend.includes("TICKET_SHEET:'TACS_SUPORTE_CHAMADOS'"),'Chamados devem ficar em aba própria');
assert(backend.includes('publico_suporte_chamado_criar')&&backend.includes('publico_suporte_chamado_status'),'Rotas públicas do suporte ausentes');
assert(backend.includes('admin_suporte_chamados_listar')&&backend.includes('admin_suporte_chamado_atualizar'),'Rotas administrativas do suporte ausentes');
assert(backend.includes("fonte:'REGISTRO_LOCAL_ONESIGNAL_DIRETO'"),'Diagnóstico deve registrar a fonte direta');
assert(backend.includes('vinculosPreservados:true'),'Contrato de preservação dos vínculos ausente');
assert(!backend.includes('saudeNotificacoesV1UpsertRegistro_('),'Suporte não pode regravar o registro técnico de aparelhos');
assert(!/unsubscribe|delete_subscription|removeSubscription/i.test(backend),'Módulo não pode conter rotina de desligamento de inscrição');
assert(!backend.includes('saudeNotificacoesV1ExportarSubscriptions_('),'Diagnóstico cotidiano não deve depender da exportação CSV do OneSignal');
assert(backend.includes('saudeNotificacoesV1IdentidadePorSubscription_(')&&backend.includes('saudeNotificacoesV1ViewUser_('),'Conferência direta por inscrição não foi implementada');
assert(backend.includes('suporteMoradoresV1Hash_(token)'),'Token público deve ser armazenado como hash');
assert(!/TICKET_HEADERS[^\n]*CPF|TICKET_HEADERS[^\n]*CNS/.test(backend),'A aba de suporte não deve persistir CPF/CNS como coluna');
assert(backend.includes("mensagemIndividualV1Enviar_"),'Resposta opcional por Push deve reutilizar o envio individual existente');
assert(backend.includes("Resposta interna salva sem aviso Push."),'Resposta interna não pode depender do Push');

assert(builder.includes("source: 'apps-script/ZZZZ_48_SuporteMoradoresV1.gs'"),'Builder do Apps Script não inclui o módulo de suporte');
assert(builder.includes("marker: 'TACS_SUPORTE_MORADORES_V1'"),'Builder não valida o marcador do suporte');

console.log('Suporte aos moradores V2: módulo dedicado sob controlador único, rodapé institucional, chamados internos e preservação de vínculos validados.');