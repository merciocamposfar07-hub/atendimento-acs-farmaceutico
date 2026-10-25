'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const backend=fs.readFileSync('apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs','utf8');
const notification=fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs','utf8');
const frontend=fs.readFileSync('teste-v1/mensagem-individual-morador-v1.js','utf8');

assert.match(notification,/Utilities\.formatDate\(data,'America\/Sao_Paulo'/);
assert.match(frontend,/timeZone:'America\/Sao_Paulo'/);
assert.doesNotMatch(frontend,/timeZone:'America\/Recife'/);

function formatDate(date,zone,pattern){
  assert.equal(zone,'America/Sao_Paulo');
  assert.equal(pattern,'dd/MM/yyyy HH:mm:ss');
  const parts=new Intl.DateTimeFormat('pt-BR',{
    timeZone:zone,day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const p=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return p.day+'/'+p.month+'/'+p.year+' '+p.hour+':'+p.minute+':'+p.second;
}

const id='msgv1_enviar_1792890546059_70la3zfh';
const historico=[id,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','MORADORA_TESTE','Aviso','Mensagem completa',new Date('2026-10-25T01:09:15Z')];
const recibo=[
  id,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','MORADORA_TESTE',
  '11111111-2222-4333-8444-555555555555','aparelho-01','MORADORA_TESTE',
  'hash','iPhone','Safari','iOS','ENCAMINHADO',
  new Date('2026-10-25T01:09:15Z'),new Date('2026-10-25T01:09:16Z'),
  new Date('2026-10-25T04:13:33Z'),'','',''
];
const abertura=[
  id,'JAPARANDUBA','MENSAGEM_INDIVIDUAL','MORADORA_TESTE',
  '11111111-2222-4333-8444-555555555555','aparelho-01','MORADORA_TESTE',
  new Date('2026-10-25T05:24:08Z')
];
let leiturasBrutas=0,leiturasFormatadas=0;
function tabela(linha){
  return{
    getLastRow(){return 2},
    getRange(){return{
      getValues(){leiturasBrutas++;return [linha]},
      getDisplayValues(){leiturasFormatadas++;throw Error('Proibido usar fuso da planilha no relatório')}
    }}
  };
}
const planilhas={
  TACS_MENSAGENS_CIENCIA_V1:tabela(historico),
  RECIBOS:tabela(recibo),
  ABERTURAS:tabela(abertura)
};
const contexto=vm.createContext({
  console,Date,Utilities:{formatDate},
  TACS_NOTIFICACOES_AREA_V1:{
    RECEIPT_SHEET:'RECIBOS',OPEN_SHEET:'ABERTURAS',
    RECEIPT_HEADERS:Array(18),OPEN_HEADERS:Array(8)
  },
  tacsTerritorioV1Planilha_:()=>({getSheetByName:n=>planilhas[n]||null}),
  notificacoesAreaV1AuditoriaPorEvento_:()=>({registradoEm:'24/10/2026 22:09:25'})
});
new vm.Script(backend,{filename:'ZZZZ_42_ComprovacaoMensagensV1.gs'}).runInContext(contexto);

const resultado=contexto.comprovacaoMensagensV1MontarRelatorio_(
  {areaId:'JAPARANDUBA'},'MENSAGEM_INDIVIDUAL','MORADORA_TESTE',{escopo:'INDIVIDUAL'}
);
assert.equal(resultado.encontrado,true);
assert.equal(resultado.historico.length,1);
const mensagem=resultado.historico[0];
assert.equal(mensagem.registradoEm,'24/10/2026 22:09:15');
assert.equal(mensagem.aparelhos.length,1);
const aparelho=mensagem.aparelhos[0];
assert.equal(aparelho.encaminhadoEm,'24/10/2026 22:09:16');
assert.equal(aparelho.exibidoEm,'25/10/2026 01:13:33');
assert.equal(aparelho.abertoEm,'25/10/2026 02:24:08');
assert.equal(aparelho.cienteEm,'');
assert.equal(mensagem.estado,'ABERTA');
assert.equal(leiturasBrutas,3);
assert.equal(leiturasFormatadas,0);
assert.equal(formatDate(new Date(1792890546059),'America/Sao_Paulo','dd/MM/yyyy HH:mm:ss'),'24/10/2026 22:09:06');
console.log('Horário de Brasília aprovado: registro, encaminhamento, exibição, abertura e ciência preservados.');
