'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const html=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const agenda=read('conecta-agendas-native-v1.js');
const moradores=read('conecta-moradores-native-v1.js');
const profissionais=read('conecta-profissionais-native-v1.js');
const canon=read('DECISAO_CANONICA_UI_CENTRAL_APP_INSTITUCIONAL_2026_09_10.md');

new Function(central);
new Function(agenda);
new Function(moradores);
new Function(profissionais);

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

// Painéis antigos embutidos não exibem um segundo cabeçalho/seta.
assert.match(central,/function normalizeEmbeddedPanelFrame\(frame\)/);
assert.match(central,/#cscInstitutionalAppbar\{display:none!important\}/);
assert.match(central,/#portalTacsBackCentralV1\{display:none!important\}/);
assert.match(central,/normalizeEmbeddedPanelFrame\(frame\)/);

// Os módulos nativos não exibem texto técnico criado durante a migração.
assert.doesNotMatch(agenda,/Módulo nativo do Conecta/);
assert.doesNotMatch(moradores,/Módulo nativo do Conecta/);
assert.doesNotMatch(profissionais,/Módulo nativo do Conecta/);

// Moradores volta aos textos visuais já existentes antes da migração.
assert.match(moradores,/Cadastro individual de cidadãos/);
assert.match(moradores,/as permissões e a consolidação de duplicidades são controladas pelo servidor após o login/);
assert.match(moradores,/Busque por nome, CPF, CNS, ID Portal, endereço ou telefone\./);
assert.match(moradores,/como em recém-nascido/);

// Nenhuma lógica funcional das tarefas nativas foi removida.
assert.match(agenda,/TAREFA_16_AGENDAS_NATIVAS_V1/);
assert.match(moradores,/TAREFA_17_MORADORES_NATIVOS_V1/);
assert.match(profissionais,/TAREFA_18_PROFISSIONAIS_NATIVOS_V1/);
assert.match(central,/showNativeAgenda/);
assert.match(central,/showNativeMoradores/);
assert.match(central,/showNativeProfissionais/);

console.log('RESTAURACAO_APP4_PAINEIS_OK: cabeçalho único App4 restaurado, ícone oficial presente, retorno duplicado removido, faixa/borda superior removida e textos técnicos retirados.');
