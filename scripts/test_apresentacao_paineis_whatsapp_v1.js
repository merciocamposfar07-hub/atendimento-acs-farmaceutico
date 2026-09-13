'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const centralHtml=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const uiCss=read('admin-ui-standard.inline.css');
const agenda=read('conecta-agendas-native-v1.js');
const agendaCss=read('conecta-agendas-native-v1.css');
const moradoresCss=read('conecta-moradores-native-v1.css');
const profCss=read('conecta-profissionais-native-v1.css');
const agendaWa=read('agenda-whatsapp-card-v1.js');
const recadosWa=read('recados-campanhas-whatsapp-card-v9.js');
const mensalWa=read('recados-campanhas-whatsapp-mensal-v12.js');
const agendaLegacy=read('painel-oficial-agendas-vagas.html');
const recadosLegacy=read('painel-oficial-recados-campanhas.html');

new Function(central);
new Function(quick);
new Function(agenda);
new Function(agendaWa);
new Function(recadosWa);
new Function(mensalWa);

const official=/conecta-saude-central-canonico-2026-09-09\.png/;

// Sem botão flutuante de atualizar página na Central.
assert.doesNotMatch(quick,/button\.textContent='↻ Atualizar página'/);
assert.match(quick,/CORRECAO_VISUAL_SEM_ATUALIZAR_FLUTUANTE_V1/);

// Cabeçalho App4 é parte do fluxo da página, não sticky.
assert.match(uiCss,/\.csc-appbar\{\s*position:static;\s*top:auto;/);
assert.doesNotMatch(uiCss,/\.csc-appbar\{\s*position:sticky;/);
assert.match(centralHtml,/cscPanelVisualConsistencyV2/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer>\.viewer-bar\{[\s\S]*position:static!important/);
assert.match(central,/csc-frame-viewer/);
assert.match(central,/#cscInstitutionalAppbar\{display:flex!important;position:static!important/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer:not\(\[hidden\]\)\{[\s\S]*background:#071827!important/);
assert.match(centralHtml,/\.viewer\.csc-native-viewer>\.viewer-platform-footer\{[\s\S]*background:#071827!important/);
assert.match(central,/html,body,main,footer,\.footer\{background:#071827!important/);

// Ícone oficial + título no cabeçalho e rodapé institucional nos painéis nativos.
assert.match(centralHtml,official);
assert.match(centralHtml,/CONECTA SAÚDE COMUNITÁRIA/);
assert.match(centralHtml,/id="viewerTitle"/);
assert.match(centralHtml,/id="viewerFooter"/);
assert.match(centralHtml,/tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível/);
assert.match(centralHtml,/Plataforma institucional de saúde comunitária/);

// Nenhum módulo nativo mantém elemento sticky/fixed próprio.
for(const [name,css] of [['Agendas',agendaCss],['Moradores',moradoresCss],['Profissionais',profCss]]){
  assert.doesNotMatch(css,/position:(?:sticky|fixed)/,name+' não pode criar barra/controle fixo próprio.');
}

// Agendas nativas recuperaram os dois compartilhamentos de WhatsApp sem tocar na gravação.
assert.match(agenda,/csc-ag-share-day/);
assert.match(agenda,/📲 Postar no Status do WhatsApp/);
assert.match(agenda,/csc-ag-share-group/);
assert.match(agenda,/📲 Postar agenda completa no Status do WhatsApp/);
assert.match(agenda,/PortalTacsAgendaWhatsAppV2API/);
assert.match(agenda,/admin_salvar_agenda/);
assert.match(central,/agenda-whatsapp-card-v1\.js/);
assert.match(agendaWa,official);
assert.match(central,/agenda-whatsapp-card-v1\.js\?v=20260913-apresentacao-paineis-v2/);
assert.match(central,/conecta-agendas-native-v1\.js\?v=20260913-apresentacao-paineis-v2/);
assert.match(central,/revision='20260913-apresentacao-paineis-v2'/);
assert.match(centralHtml,/central-administrativa-tacs\.js\?v=[^\"'\\s<]+/);
assert.match(centralHtml,/central-tacs-login-rapido-v1\.js\?v=[^\"'\\s<]+/);
assert.match(agendaWa,/officialIcon:CONECTA_OFFICIAL_ICON/);

// Recados e campanhas continuam oferecendo Status do WhatsApp e agora usam o ícone oficial.
assert.match(recadosLegacy,/recados-campanhas-whatsapp-card-v9\.js/);
assert.match(recadosLegacy,/recados-campanhas-whatsapp-mensal-v12\.js/);
assert.match(recadosLegacy,/recados-campanhas-whatsapp-card-v9\.js\?v=[^\"'\\s<]+/);
assert.match(recadosLegacy,/recados-campanhas-whatsapp-mensal-v12\.js\?v=[^\"'\\s<]+/);
assert.match(recadosWa,/Postar recado no Status do WhatsApp/);
assert.match(recadosWa,/Postar no status do WhatsApp/);
assert.match(recadosWa,official);
assert.match(recadosWa,/ctx\.drawImage\(portalIcon/);
assert.match(mensalWa,/Postar campanhas de .* no Status do WhatsApp/);
assert.match(mensalWa,official);
assert.match(mensalWa,/ctx\.drawImage\(conectaIcon/);

// Os painéis oficiais já carregam a infraestrutura App4 e o rodapé institucional.
for(const [name,html] of [['Agendas',agendaLegacy],['Recados',recadosLegacy]]){
  assert.match(html,/cscPlatformFooter/,name+' sem rodapé App4.');
  assert.match(html,/CONECTA SAÚDE COMUNITÁRIA/,name+' sem cabeçalho/marca App4.');
  assert.match(html,/\.csc-appbar\{\s*position:static;\s*top:auto;/,name+' ainda mantém cabeçalho sticky.');
}

// Correção é apenas de apresentação/compartilhamento: marcadores funcionais nativos permanecem.
assert.match(agenda,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(read('conecta-moradores-native-v1.js'),/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.match(read('conecta-profissionais-native-v1.js'),/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);

console.log('APRESENTACAO_PAINEIS_WHATSAPP_OK: sem Atualizar página flutuante, cabeçalhos rolam com o conteúdo, cabeçalho/rodapé App4 permanecem, Agendas e Recados mantêm WhatsApp Status e os cards usam o ícone oficial do Conecta.');
