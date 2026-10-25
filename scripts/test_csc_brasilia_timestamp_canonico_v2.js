'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const msg=fs.readFileSync('apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs','utf8');
const report=fs.readFileSync('apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs','utf8');
const push=fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs','utf8');
const event='msgv1_enviar_1792890546059_test1234';
const modern={
  envio:'2026-10-25T01:09:16.000Z',
  exibida:'2026-10-25T04:13:33.000Z',
  aberta:'2026-10-25T05:24:08.000Z',
  ciente:'2026-10-25T05:24:55.000Z',
  registro:'2026-10-25T01:09:15.000Z'
};
const old={
  envio:'24/10/2026 15:09:16',
  exibida:'24/10/2026 15:13:33',
  aberta:'24/10/2026 15:24:08',
  ciente:'24/10/2026 15:24:55',
  registro:'24/10/2026 15:09:15'
};
function format(date,zone,pattern){
  assert.equal(zone,'America/Sao_Paulo');
  assert.equal(pattern,'dd/MM/yyyy HH:mm:ss');
  const parts=new Intl.DateTimeFormat('pt-BR',{
    timeZone:zone,day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return [p.day,p.month,p.year].join('/')+' '+[p.hour,p.minute,p.second].join(':');
}
const config={RECEIPT_SHEET:'REC',OPEN_SHEET:'OPEN',
  RECEIPT_HEADERS:Array(18),OPEN_HEADERS:Array(8)};
function sourceFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,'Função ausente: '+name);
  const end=source.indexOf('\nfunction ',start+name.length);
  return source.slice(start,end>=0?end:undefined);
}
function mockRows(t){
  const receipt=[
    event,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','TEST_REF','', 'sub1','','',
    'iPhone','Safari','iOS','CONFIRMADO',t.registro,t.envio,t.exibida,t.ciente,
    'BOTAO_CIENCIA_MENSAGEM',''
  ];
  const opening=[event,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','TEST_REF','','sub1','',t.aberta];
  const history=[event,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','TEST_REF','Aviso','Mensagem',t.registro];
  let count=0;
  const sheet=r=>({getLastRow:()=>2,getRange:()=>({
    getValues:()=>{count++;return [r]},
    getDisplayValues:()=>{throw Error('Leitura preformatada de horario proibida')}
  })});
  return {sheets:{REC:sheet(receipt),OPEN:sheet(opening),TACS_MENSAGENS_CIENCIA_V1:sheet(history)},readCount:()=>count};
}
function status(t){
  const {sheets}=mockRows(t);
  const subset=sourceFunction(msg,'mensagemIndividualV1InstanteStatus_')+'\n'+
    sourceFunction(msg,'mensagemIndividualV1Status_');
  const context=vm.createContext({
    Date,console,
    Utilities:{formatDate:format},
    mensagemIndividualV1Texto_:v=>String(v==null?'':v).trim(),
    mensagemIndividualV1ResolverMorador_:()=>({referencia:'TEST_REF',familiaId:'001',item:{nome:'TESTE'}}),
    tacsTerritorioV1Planilha_:()=>({getSheetByName:n=>sheets[n]||null}),
    TACS_NOTIFICACOES_AREA_V1:config
  });
  new vm.Script(subset).runInContext(context);
  return context.mensagemIndividualV1Status_({eventoId:event},{areaId:'JAPARANDUBA'});
}
function historico(t){
  const {sheets,readCount}=mockRows(t);
  const context=vm.createContext({
    Date,console,
    Utilities:{formatDate:format},
    tacsTerritorioV1Planilha_:()=>({getSheetByName:n=>sheets[n]||null}),
    TACS_NOTIFICACOES_AREA_V1:config
  });
  new vm.Script(report).runInContext(context);
  const r=context.comprovacaoMensagensV1MontarRelatorio_({areaId:'JAPARANDUBA'},
    'MENSAGEM_INDIVIDUAL','TEST_REF',{escopo:'INDIVIDUAL'});
  assert.ok(r.encontrado);
  assert.equal(r.historico.length,1);
  assert.equal(readCount(),3,'As três tabelas devem ser lidas como valores brutos.');
  return r.historico[0];
}
assert.match(push,/individual\?agora\.toISOString\(\):agora/);
assert.match(push,/setNumberFormat\(individual\?'@'/);
assert.match(push,/individual\?'':agora/);
assert.match(push,/new Date\(\)\.toISOString\(\)/);
assert.match(report,/celula\.setNumberFormat\('@'\)\.setValue\(agora\.toISOString\(\)\)/);
assert.doesNotMatch(sourceFunction(msg,'mensagemIndividualV1Status_'),/ajuste=horas\*3600000/);

const novoStatus=status(modern),novoHistorico=historico(modern);
assert.equal(novoStatus.confirmadas,1);
assert.equal(novoStatus.horarios.encaminhada,'24/10/2026 22:09:16');
assert.equal(novoStatus.horarios.confirmada,'25/10/2026 02:24:55');
assert.equal(novoHistorico.registradoEm,'24/10/2026 22:09:15');
assert.equal(novoHistorico.aparelhos[0].encaminhadoEm,novoStatus.horarios.encaminhada);
assert.equal(novoHistorico.aparelhos[0].exibidoEm,novoStatus.horarios.exibida);
assert.equal(novoHistorico.aparelhos[0].abertoEm,novoStatus.horarios.aberta);
assert.equal(novoHistorico.aparelhos[0].cienteEm,novoStatus.horarios.confirmada);
assert.equal(novoHistorico.estado,'CIENCIA_TOTAL');

const antigoStatus=status(old),antigoHistorico=historico(old);
assert.equal(antigoStatus.confirmadas,1,'Ciência real de evento antigo não pode desaparecer.');
assert.equal(antigoHistorico.estado,'CIENCIA_TOTAL');
assert.equal(antigoStatus.horarios.confirmada,'');
assert.equal(antigoHistorico.aparelhos[0].cienteEm,'Horário histórico não verificável');
assert.equal(antigoHistorico.aparelhos[0].encaminhadoEm,'Horário histórico não verificável');
assert.equal(antigoHistorico.aparelhos[0].abertoEm,'Horário histórico não verificável');
console.log('BRASILIA_V2_OK: instante UTC, status e comprovante iguais; legado suspeito sem hora inventada.');
