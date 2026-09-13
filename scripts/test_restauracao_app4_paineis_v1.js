'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const html=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const agenda=read('conecta-agendas-native-v1.js');
const moradores=read('conecta-moradores-native-v1.js');
const profissionais=read('conecta-profissionais-native-v1.js');
const agendaWhatsapp=read('agenda-whatsapp-card-v1.js');
const recadosWhatsapp=read('recados-campanhas-whatsapp-card-v9.js');
const canon=read('DECISAO_CANONICA_UI_CENTRAL_APP_INSTITUCIONAL_2026_09_10.md');

new Function(central);
new Function(agenda);
new Function(moradores);
new Function(profissionais);
new Function(agendaWhatsapp);
new Function(recadosWhatsapp);

// Referência visual canônica continua sendo o Protótipo 4 / App institucional.
assert.match(canon,/4 • App institucional/);
assert.match(canon,/aparência canônica aprovada/);

// O shell dos painéis usa um único cabeçalho App4.
assert.match(html,/RESTAURACAO_APP4_PAINEL_2026_09_12_V1/);
assert.match(html,/class="viewer-official-icon"/);
assert.match(html,/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(html,/CONECTA SAÚDE COMUNITÁRIA/);
assert.match(html,/id="viewerBack"[^>]*aria-label="Voltar à Central"[^>]*>‹<\/button>/);
assert.doesNotMatch(html,/>← Central<\/button>/);

// Tela única: sem a borda estrutural ciano que havia sido reintroduzida pelo viewer.
assert.match(html,/html body \.viewer \.viewer-bar\{[\s\S]*background:#071827!important[\s\S]*border:0!important[\s\S]*border-bottom:0!important/);
assert.match(html,/html body #cscModuleOpening\{[\s\S]*border:0!important/);

// Guarda final de 13/09: rodapé garantido, botão flutuante removido e cabeçalho não fixo.
assert.match(html,/CORRECAO_VISUAL_CONTRATO_APP4_2026_09_13_V2/);
assert.match(html,/#portalTacsCentralRefreshV1,#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1,#atualizarPaginaAgendas,#atualizarPaginaAgendasFlutuante,\.agendaAtualizarPaginaFlutuanteV2\{display:none!important/);
assert.match(html,/function ensurePlatformFooter\(\)/);
assert.match(html,/Conecta Saúde Comunitária — tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível/);
assert.match(html,/Plataforma institucional de saúde comunitária/);
assert.match(html,/function imp\(n,p,v\)/);
assert.match(html,/style\.setProperty\(p,v,'important'\)/);
assert.match(html,/html body \.viewer\.csc-native-viewer>\.viewer-bar\{[\s\S]*position:static!important/);
assert.doesNotMatch(html,/Atualizar página<\/button>/);

// Painéis antigos usam o próprio cabeçalho App4 no fluxo da página; o shell externo fica oculto.
assert.match(central,/function normalizeEmbeddedPanelFrame\(frame\)/);
assert.match(central,/#cscInstitutionalAppbar\{display:flex!important;position:static!important/);
assert.match(central,/#portalTacsBackCentralV1\{display:none!important\}/);
assert.match(central,/normalizeEmbeddedPanelFrame\(frame\)/);
assert.match(html,/\.viewer\.csc-frame-viewer>\.viewer-bar,[\s\S]*\.viewer\.csc-frame-viewer>\.viewer-platform-footer\{display:none!important\}/);
assert.match(html,/\.viewer\.csc-native-viewer>\.viewer-bar\{[\s\S]*position:static!important/);

// Os módulos nativos não exibem texto técnico criado durante a migração.
assert.doesNotMatch(agenda,/Módulo nativo do Conecta/);
assert.doesNotMatch(moradores,/Módulo nativo do Conecta/);
assert.doesNotMatch(profissionais,/Módulo nativo do Conecta/);

// Moradores volta aos textos visuais já existentes antes da migração.
assert.match(moradores,/Cadastro individual de cidadãos/);
assert.match(moradores,/as permissões e a consolidação de duplicidades são controladas pelo servidor após o login/);
assert.match(moradores,/Busque por nome, CPF, CNS, ID Portal, endereço ou telefone\./);
assert.match(moradores,/como em recém-nascido/);

// WhatsApp Status: agenda nativa e recados/campanhas usam os geradores existentes com ícone oficial.
assert.match(agenda,/csc-ag-share-day/);
assert.match(agenda,/csc-ag-share-group/);
assert.match(agenda,/Postar no Status do WhatsApp/);
assert.match(agenda,/Postar agenda completa no Status do WhatsApp/);
assert.match(agenda,/PortalTacsAgendaWhatsAppV2API/);
assert.match(agendaWhatsapp,/CONECTA_OFFICIAL_ICON='\/atendimento-acs-farmaceutico\/conecta-saude-homologacao\/v15\/assets\/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(agendaWhatsapp,/shareData:function\(data,button\)/);
assert.match(agendaWhatsapp,/shareGroupData:function\(data,button\)/);
assert.match(recadosWhatsapp,/PORTAL_TACS_STATUS_ICON='\/atendimento-acs-farmaceutico\/conecta-saude-homologacao\/v15\/assets\/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(recadosWhatsapp,/Postar no status do WhatsApp/);
assert.match(recadosWhatsapp,/Postar recado no Status do WhatsApp/);

// Nenhuma lógica funcional das tarefas nativas foi removida.
assert.match(agenda,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(moradores,/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.match(profissionais,/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);
assert.match(central,/showNativeAgenda/);
assert.match(central,/showNativeMoradores/);
assert.match(central,/showNativeProfissionais/);

console.log('RESTAURACAO_APP4_PAINEIS_OK: cabeçalho App4 sem fixação indevida, rodapé garantido, atualizar flutuante removido e botões WhatsApp Status preservados com ícone oficial.');
