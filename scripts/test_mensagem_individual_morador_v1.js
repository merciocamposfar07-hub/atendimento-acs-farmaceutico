'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(ROOT,p),'utf8')}

const backend=read('apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs');
const familyBackend=read('apps-script/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs');
const frontend=read('teste-v1/mensagem-individual-morador-v1.js');
const familyFrontend=read('teste-v1/mensagem-familia-v1.js');
const integration=read('teste-v1/mensagem-individual-morador-integracao-v1.js');
const panel=read('teste-v1/painel-moradores-v2.html');
const transport=read('teste-v1/painel-moradores-transport-v2.js');
const build=read('scripts/build_apps_script_release.js');

new vm.Script(backend,{filename:'ZZZZ_40_MensagensIndividuaisMoradorV1.gs'});
new vm.Script(familyBackend,{filename:'ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs'});
new vm.Script(frontend,{filename:'mensagem-individual-morador-v1.js'});
new vm.Script(familyFrontend,{filename:'mensagem-familia-v1.js'});
new vm.Script(integration,{filename:'mensagem-individual-morador-integracao-v1.js'});

assert.match(backend,/admin_mensagem_individual_buscar/);
assert.match(backend,/admin_mensagem_individual_enviar/);
assert.match(backend,/admin_mensagem_individual_status/);
assert.match(backend,/TACS_NOTIFICACOES_FAMILIAS|TACS_VINCULO_FAMILIAR_NOTIF_V1/);
assert.match(backend,/mapa\[id\]!==morador\.familiaId/,'O destinatário individual precisa continuar filtrado pela família vinculada no servidor.');
assert.match(backend,/notificacoesAreaV1PrepararComprovantes_/);
assert.match(backend,/notificacoesAreaV1AplicarRespostasEnvio_/);
assert.match(backend,/RECEIPT_SHEET/);
assert.match(backend,/OPEN_SHEET/);

assert.match(familyBackend,/TACS_BUSCA_ENVIO_FAMILIA_V1/);
assert.match(familyBackend,/admin_mensagem_familia_enviar/);
assert.match(familyBackend,/admin_mensagem_familia_status/);
assert.match(familyBackend,/admin_mensagem_familia_result/);
assert.match(familyBackend,/buscaEnvioFamiliaV1BuscarExata_/);
assert.match(familyBackend,/buscaEnvioFamiliaV1CodigoMorador_\(morador\)!==familia/,'A família precisa ser comparada de forma exata, não por substring.');
assert.match(familyBackend,/vistos\[id\]/,'O envio geral da família precisa deduplicar aparelhos.');
assert.match(familyBackend,/'FAMILIA_'\+familia/,'O comprovante familiar precisa ter referência própria.');
assert.match(build,/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1\.gs/);
assert.match(build,/TACS_BUSCA_ENVIO_FAMILIA_V1/);

assert.doesNotMatch(frontend,/subscriptionId|subscription_id|include_subscription_ids/i,'A interface individual não pode expor identificadores técnicos de Push.');
assert.doesNotMatch(familyFrontend,/subscriptionId|subscription_id|include_subscription_ids/i,'A interface familiar não pode expor identificadores técnicos de Push.');
assert.doesNotMatch(integration,/subscriptionId|subscription_id|include_subscription_ids/i,'A integração do painel não pode expor identificadores técnicos de Push.');
assert.match(frontend,/Confirmar atendimento/);
assert.match(frontend,/Alterar data/);
assert.match(frontend,/Lembrete/);
assert.match(frontend,/Cancelamento/);
assert.match(frontend,/Outra mensagem/);
assert.match(frontend,/Exibida no aparelho/);
assert.match(frontend,/Aberta/);
assert.match(frontend,/Recebimento confirmado/);
assert.match(familyFrontend,/Enviar para toda a família/);
assert.match(familyFrontend,/admin_mensagem_familia_enviar/);
assert.match(familyFrontend,/admin_mensagem_familia_status/);

assert.match(panel,/mensagem-individual-morador-v1\.js\?v=/,'O painel deve continuar carregando o módulo individual.');
assert.match(panel,/mensagem-individual-morador-integracao-v1\.js\?v=/,'O painel deve continuar carregando a integração isolada.');
assert.match(integration,/cadastro familiar/i,'A integração deve explicar a busca por cadastro familiar.');
assert.match(integration,/002, 012, 072/,'A interface deve exemplificar números familiares com zeros à esquerda.');
assert.ok(integration.includes('function familiaConsulta(v)')&&integration.includes('/^\\d{3}[A-Z]?$/'),'A interface deve reconhecer código familiar de três dígitos.');
assert.doesNotMatch(integration,/search\.addEventListener\('click'/,'Os botões não podem depender do clique Buscar, pois o transporte principal bloqueia propagação.');
assert.doesNotMatch(integration,/input\.addEventListener\('keydown'/,'Os botões não podem depender do Enter bloqueado pelo transporte principal.');
assert.match(integration,/originSheet/,'A ação individual deve reaproveitar a origem já carregada pelo painel.');
assert.match(integration,/originRow/,'A ação individual deve reaproveitar a linha já carregada pelo painel.');
assert.match(integration,/residentId/,'A ação individual deve reaproveitar o identificador do cadastro selecionado.');
assert.match(integration,/garantirBotoesCards/,'Os botões individuais devem nascer a partir dos cartões já renderizados.');
assert.match(integration,/garantirBotaoFormulario/,'O morador selecionado deve ter botão individual também no formulário.');
assert.match(transport,/function onSearchCapture/,'O teste precisa refletir o manipulador real que captura a busca.');
assert.match(transport,/stopImmediatePropagation/,'O transporte principal continua bloqueando propagação e não deve ser alterado.');
assert.match(integration,/Mensagem individual/,'Cada morador precisa ter ação individual.');
assert.match(integration,/Enviar mensagem para toda a família/,'A busca familiar precisa ter ação geral da família.');
assert.match(integration,/PortalTacsMensagemFamilia/,'A ação familiar deve usar módulo próprio.');
assert.match(integration,/MutationObserver/,'A integração deve acrescentar ações sem reescrever a renderização existente.');
assert.match(transport,/admin_moradores_buscar/,'A busca original de moradores precisa permanecer intacta no transporte.');
assert.doesNotMatch(transport,/admin_mensagem_familia_/,'O transporte original não deve incorporar a nova rota familiar.');
assert.doesNotMatch(transport,/PortalTacsMensagemFamilia/,'O transporte original não deve ser acoplado à nova interface familiar.');

// Regressão real do caso fotografado: "012" não pode trazer pessoas apenas
// porque ID/CNS/endereço contém a sequência 012 em outro contexto.
const moradores=[
  {nome:'VALDEILSON GENIVAL DA SILVA',endereco:'SÍTIO JAPARANDUBA, 012, ZONA RURAL',cpf:'',cns:'898004165621252',status:'ATIVO'},
  {nome:'PATRÍCIA DA SILVA',endereco:'SÍTIO JAPARANDUBA, 012, ZONA RURAL',cpf:'',cns:'700000000000001',status:'ATIVO'},
  {nome:'GENIVAL SEVERINO DA SILVA',endereco:'SÍTIO JAPARANDUBA, 099, ZONA RURAL',cpf:'',cns:'705002237336259',status:'ATIVO'},
  {nome:'OUTRA PESSOA',endereco:'SÍTIO JAPARANDUBA, 045, ZONA RURAL',cpf:'',cns:'999990129999999',status:'ATIVO'}
];
let buscaTextualChamadas=0;
const sandbox={
  console,
  TACS_MORADORES_ADMIN_V1:{MAX_SEARCH_RESULTS:80},
  moradoresAdminV1Buscar_:function(busca,contexto){buscaTextualChamadas++;return {ok:true,resultados:[{nome:'BUSCA TEXTUAL '+busca}],areaId:contexto.areaId}},
  moradoresAdminV1LocalizarFonte_:function(){return {
    headerRow:0,map:{},ss:{},
    sheet:{
      getName:()=> 'MORADORES',
      getLastRow:()=> moradores.length+1,
      getLastColumn:()=> 1,
      getRange:()=>({
        getValues:()=>moradores.map(m=>[m]),
        getDisplayValues:()=>moradores.map(m=>[m])
      })
    }
  }},
  moradoresAdminV1LerMetaMap_:()=>({porOrigem:{},porChave:{}}),
  moradoresAdminV1MontarMorador_:(displayRow)=>displayRow[0],
  moradoresAdminV1ChaveRegistro_:(m)=>m.nome,
  moradoresAdminV1ChaveOrigem_:(o)=>o.aba+'|'+o.linha,
  moradoresAdminV1EstaOculto_:()=>false,
  moradoresAdminV1ComMeta_:(m,o)=>Object.assign({},m,{origemAba:o.aba,origemLinha:o.linha}),
  vinculoFamiliarNotifV1CodigoEndereco_:(endereco)=>{
    const m=String(endereco||'').match(/,\s*(\d{3}[A-Z]?)\s*,/i);
    return m?m[1].toUpperCase():'';
  },
  doGet:function(){return null},
  doPost:function(){return null},
  mensagemIndividualV1ConfigOneSignal_:()=>({appId:'app',apiKey:'key'}),
  notificacoesAreaV1AlvosAtivos_:()=>[
    {subscriptionId:'sub-a',tipoAparelho:'celular',navegador:'Chrome',sistema:'Android'},
    {subscriptionId:'sub-a',tipoAparelho:'celular',navegador:'Chrome',sistema:'Android'},
    {subscriptionId:'sub-b',tipoAparelho:'celular',navegador:'Safari',sistema:'iOS'},
    {subscriptionId:'sub-c',tipoAparelho:'tablet',navegador:'Chrome',sistema:'Android'}
  ],
  mensagemIndividualV1MapaFamilias_:()=>({'sub-a':'012','sub-b':'012','sub-c':'099'}),
  tacsTerritorioV1Planilha_:()=>({}),
  notificacoesAreaV1QuantidadeAreas_:()=>1
};
vm.createContext(sandbox);
new vm.Script(familyBackend,{filename:'ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs'}).runInContext(sandbox);

const familia012=sandbox.moradoresAdminV1Buscar_('012',{areaId:'JAPARANDUBA'});
assert.equal(familia012.buscaFamiliar,true);
assert.equal(familia012.familiaId,'012');
assert.deepEqual(
  Array.from(familia012.resultados,m=>m.nome),
  ['VALDEILSON GENIVAL DA SILVA','PATRÍCIA DA SILVA'],
  'A busca 012 deve devolver somente membros cujo código familiar extraído do endereço é 012.'
);
assert.equal(buscaTextualChamadas,0,'Uma busca familiar válida não pode cair na pesquisa textual antiga.');

const buscaNome=sandbox.moradoresAdminV1Buscar_('VALDEILSON',{areaId:'JAPARANDUBA'});
assert.equal(buscaNome.resultados[0].nome,'BUSCA TEXTUAL VALDEILSON');
assert.equal(buscaTextualChamadas,1,'Busca por nome deve continuar usando a rotina original.');

const buscaAmbigua=sandbox.moradoresAdminV1Buscar_('12',{areaId:'JAPARANDUBA'});
assert.equal(buscaAmbigua.resultados[0].nome,'BUSCA TEXTUAL 12');
assert.equal(buscaTextualChamadas,2,'Dois dígitos não devem ser reinterpretados silenciosamente como família.');

const alvos=sandbox.buscaEnvioFamiliaV1Alvos_({areaId:'JAPARANDUBA'},'012').alvos;
assert.equal(alvos.length,2,'Família 012 deve receber uma vez por aparelho vinculado, sem duplicação.');
assert.deepEqual(Array.from(alvos,a=>a.subscriptionId),['sub-a','sub-b']);
assert.ok(alvos.every(a=>a.idPortal==='FAMILIA_012'));

console.log('Mensagem individual + busca/envio familiar V1: família exata, deduplicação e isolamento validados.');
