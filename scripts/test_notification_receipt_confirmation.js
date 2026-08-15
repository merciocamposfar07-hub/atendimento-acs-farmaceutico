'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs','utf8');
const headers=[
  'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','ONESIGNAL_ID','SUBSCRIPTION_ID','ID_PORTAL',
  'TOKEN_HASH','TIPO_APARELHO','NAVEGADOR','SISTEMA','ESTADO','CRIADO_EM','ENCAMINHADO_EM',
  'EXIBIDO_EM','CONFIRMADO_EM','ORIGEM','DETALHE'
];
const rows=[headers.slice()];

function ensure(row,column){while(rows.length<row)rows.push([]);while(rows[row-1].length<column)rows[row-1].push('')}
function range(row,column,rowCount=1,columnCount=1){return {
  getValues(){return Array.from({length:rowCount},(_,r)=>Array.from({length:columnCount},(_,c)=>(rows[row-1+r]||[])[column-1+c]??''))},
  getDisplayValues(){return this.getValues().map(line=>line.map(value=>value instanceof Date?value.toISOString():String(value??'')))},
  setValues(values){values.forEach((line,r)=>line.forEach((value,c)=>{ensure(row+r,column+c);rows[row-1+r][column-1+c]=value}));return this},
  setNumberFormat(){return this}
}}
const sheet={getLastRow(){return rows.length},getLastColumn(){return headers.length},getRange:range,setFrozenRows(){}};
const spreadsheet={getSheetByName(name){return name==='TACS_NOTIFICACOES_COMPROVANTES'?sheet:null},insertSheet(){throw new Error('A aba de teste já deve existir.')}};
let uuid=0;
const context=vm.createContext({
  console,Date,JSON,Math,Object,Array,String,Number,Boolean,RegExp,Error,
  Utilities:{
    DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
    getUuid(){uuid++;return `${String(uuid).padStart(8,'0')}-0000-4000-8000-${String(uuid).padStart(12,'0')}`},
    computeDigest(_algorithm,value){return Array.from(crypto.createHash('sha256').update(String(value)).digest()).map(byte=>byte>127?byte-256:byte)},
    formatDate(value){return new Date(value).toISOString().replace('T',' ').slice(0,19)}
  },
  LockService:{getScriptLock(){return {tryLock(){return true},releaseLock(){}}}},
  tacsTerritorioV1Planilha_(){return spreadsheet}
});
vm.runInContext(source,context);

const token=context.notificacoesAreaV1NovoToken_();
assert.match(token,/^[0-9a-f]{64}$/);
const hash=context.notificacoesAreaV1HashToken_(token);
assert.match(hash,/^[0-9a-f]{64}$/);
assert.notEqual(hash,token);

const notificationId='11111111-2222-4333-8444-555555555555';
rows.push([
  'evento_receipt_123','JAPARANDUBA','RECADO','RECADO_1',notificationId,
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee','MORADOR_1',hash,'Android','Chrome','Android',
  'ENCAMINHADO',new Date(),'','','','',''
]);

let result=context.notificacoesAreaV1RegistrarComprovacao_(token,notificationId,'EXIBIDO_TECNICO','WEBHOOK_ANDROID_CHROME');
assert.equal(result.ok,true);assert.equal(result.estado,'EXIBIDO_TECNICO');assert.ok(rows[1][14] instanceof Date);assert.equal(rows[1][15],'');
result=context.notificacoesAreaV1RegistrarComprovacao_(token,notificationId,'CONFIRMADO','BOTAO_ANDROID_CHROME');
assert.equal(result.ok,true);assert.equal(result.estado,'CONFIRMADO');assert.ok(rows[1][15] instanceof Date);assert.equal(rows[1][16],'BOTAO_ANDROID_CHROME');
result=context.notificacoesAreaV1RegistrarComprovacao_(token,notificationId,'CONFIRMADO','BOTAO_ANDROID_CHROME');
assert.equal(result.duplicada,true);
assert.throws(()=>context.notificacoesAreaV1RegistrarComprovacao_(token,'99999999-2222-4333-8444-555555555555','CONFIRMADO','BOTAO_ANDROID_CHROME'),/não confere/);
assert.equal(JSON.stringify(rows).includes(token),false,'O token secreto não pode ser persistido na planilha.');

const payload=context.notificacoesAreaV1PayloadIndividual_('app',{areaId:'JAPARANDUBA'},{
  titulo:'Recado',mensagem:'Mensagem fiel',tipo:'RECADO',referencia:'RECADO_1',evento:'evento_receipt_123'
},{token,alvo:{subscriptionId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'}});
assert.deepEqual(Array.from(payload.include_subscription_ids),['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee']);
assert.equal(payload.web_buttons[0].id,'confirmar_recebimento');
assert.equal(payload.web_buttons[0].url,'_osp=do_not_open');
assert.match(payload.url,/confirmar-recebimento\.html\?t=/);
assert.equal(payload.data.confirmacaoToken,token);

console.log('Comprovação individual: token secreto, exibição Android, confirmação expressa e idempotência validados.');
