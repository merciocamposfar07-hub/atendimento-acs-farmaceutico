'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const centralHtml=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const login=read('central-tacs-login-rapido-v1.js');
const agenda=read('conecta-agendas-native-v1.js');
const agendaCss=read('conecta-agendas-native-v1.css');
const agendaShare=read('agenda-whatsapp-card-v1.js');
const recados=read('painel-oficial-recados-campanhas.html');
const recadosShare=read('recados-campanhas-whatsapp-card-v9.js');
const adminUi=read('admin-ui-behavior.inline.js');

new Function(central);
new Function(login);
new Function(agenda);
new Function(agendaShare);
new Function(recadosShare);

// 1) Botão flutuante "Atualizar página" não pertence à Central.
assert.doesNotMatch(login,/Atualizar página/);
assert.match(login,/CORRECAO_VISUAL_SEM_ATUALIZAR_FLUTUANTE_V1/);

// 2) Cabeçalho de painel não fica preso ao topo durante a rolagem.
assert.match(centralHtml,/CORRECAO_APRESENTACAO_PAINEIS_V2/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer>\.viewer-bar\{[\s\S]*position:static!important/);
assert.match(central,/cscInstitutionalAppbar\{display:flex!important;position:static!important/);

// 3) Fundo estrutural único, sem divisão de cor entre cabeçalho/conteúdo/rodapé.
assert.match(centralHtml,/\.viewer\.csc-native-viewer:not\(\[hidden\]\)\{[\s\S]*background:#071827!important/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer>\.viewer-bar\{[\s\S]*background:#071827!important/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer>\.viewer-platform-footer\{[\s\S]*background:#071827!important/);
assert.match(central,/html,body,main,footer,\.footer\{background:#071827!important/);

// 4) Cabeçalho com ícone oficial + marca + nome do painel.
assert.match(centralHtml,/class="viewer-official-icon"/);
assert.match(centralHtml,/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(centralHtml,/CONECTA SAÚDE COMUNITÁRIA/);
assert.match(centralHtml,/id="viewerTitle"/);
assert.match(adminUi,/function buildAppbar\(\)/);
assert.match(adminUi,/officialIcon/);

// 5) Rodapé canônico em módulos nativos e painéis legados.
assert.match(centralHtml,/id="viewerFooter"/);
assert.match(centralHtml,/Conecta Saúde Comunitária — tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível\./);
assert.match(centralHtml,/Plataforma institucional de saúde comunitária\./);
assert.match(adminUi,/function buildPlatformFooter\(\)/);
assert.match(adminUi,/Plataforma institucional de saúde comunitária\./);

// 6) Agendas mantém botão de Status do WhatsApp no card e na agenda completa.
assert.match(agenda,/Postar no Status do WhatsApp/);
assert.match(agenda,/Postar agenda completa no Status do WhatsApp/);
assert.match(agenda,/csc-ag-share-day/);
assert.match(agenda,/csc-ag-share-group/);
assert.match(agenda,/PortalTacsAgendaWhatsAppV2API/);
assert.match(agendaCss,/\.csc-ag-native \.share\{width:100%/);
assert.match(central,/agenda-whatsapp-card-v1\.js\?v=20260913-apresentacao-paineis-v2/);

// 7) Card de agenda usa o ícone oficial do Conecta.
assert.match(agendaShare,/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(agendaShare,/CONECTA SAÚDE/);
assert.match(agendaShare,/COMUNITÁRIA/);

// 8) Recados/campanhas mantém publicação no Status e card com ícone oficial.
assert.match(recados,/recados-campanhas-whatsapp-card-v9\.js\?v=20260913-apresentacao-paineis-v2/);
assert.match(recados,/recados-campanhas-whatsapp-mensal-v12\.js\?v=20260913-apresentacao-paineis-v2/);
assert.match(recadosShare,/Postar recado no Status do WhatsApp/);
assert.match(recadosShare,/Postar no status do WhatsApp/);
assert.match(recadosShare,/conecta-saude-central-canonico-2026-09-09\.png/);
assert.match(recadosShare,/CONECTA SAÚDE/);
assert.match(recadosShare,/COMUNITÁRIA/);

// 9) Nenhuma destas correções altera o backend.
assert.doesNotMatch(central,/script\.google\.com\/macros\/s\/.*20260913-apresentacao-paineis-v2/);

console.log('APRESENTACAO_PAINEIS_APP4_V2_OK: sem Atualizar página flutuante, cabeçalho não fixo, fundo estrutural único, ícone/rodapé canônicos e WhatsApp restaurado em Agendas e Recados.');
