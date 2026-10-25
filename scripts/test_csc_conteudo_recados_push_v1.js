'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const backend=fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs','utf8');
const page=fs.readFileSync('confirmar-recebimento.html','utf8');
const script=page.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,'Página de confirmação precisa conter script');
new Function(script[1]);

function sheet(name,headers,lines){
  const rows=[headers].concat(lines);
  return {
    getLastRow:()=>rows.length,
    getLastColumn:()=>rows[0].length,
    setFrozenRows(){},
    appendRow(r){rows.push(r);return this},
    getRange(r,c,n=1,w=1){return{
      getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>(rows[r-1+i]||[])[c-1+j]??'')),
      getDisplayValues(){return this.getValues().map(row=>row.map(x=>String(x??'')))},
      setValues(v){v.forEach((row,i)=>row.forEach((value,j)=>{while(rows.length<r+i)rows.push([]);rows[r-1+i][c-1+j]=value}));return this},
      setNumberFormat(){return this}
    }}
  };
}
const receiptHeaders=[
 'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','ONESIGNAL_ID','SUBSCRIPTION_ID','ID_PORTAL','TOKEN_HASH',
 'TIPO_APARELHO','NAVEGADOR','SISTEMA','ESTADO','CRIADO_EM','ENCAMINHADO_EM',
 'EXIBIDO_EM','CONFIRMADO_EM','ORIGEM','DETALHE'
];
const ss={
  sheets:{
    TACS_NOTIFICACOES_COMPROVANTES:sheet('comprovantes',receiptHeaders,[]),
    RECADOS_PORTAL:sheet('recados',['ID','AREA_ID','TITULO','MENSAGEM'],
      [['RECADO_OLD','JAPARANDUBA','Recado já enviado','Segunda-feira não haverá atendimento na unidade']])
  },
  getSheetByName(name){return this.sheets[name]||null},
  insertSheet(name){const sh=sheet(name,[],[]);this.sheets[name]=sh;return sh}
};
const ctx=vm.createContext({
  console,Date,JSON,Object,Math,Array,String,Number,Boolean,RegExp,Error,
  tacsTerritorioV1Planilha_:()=>ss,
  Utilities:{
    DigestAlgorithm:{SHA_256:'sha'},Charset:{UTF_8:'utf8'},
    computeDigest(_,value){return Array.from(crypto.createHash('sha256').update(String(value)).digest()).map(byte=>byte>127?byte-256:byte)}
  },
  ContentService:{
    MimeType:{JSON:'JSON',JAVASCRIPT:'JS'},
    createTextOutput(v){return {data:v,setMimeType(type){this.type=type;return this}}}
  }
});
vm.runInContext(backend,ctx);
const token='f'.repeat(64),tokenOld='a'.repeat(64);
const hash=ctx.notificacoesAreaV1HashToken_(token),hashOld=ctx.notificacoesAreaV1HashToken_(tokenOld);
function receipt(event,type,ref,hash) {
 return [event,'JAPARANDUBA',type,ref,'','sub','',''+hash,'iPhone','Safari','iOS','ENCAMINHADO','','','','','',''];
}
const eventNew='evt_geral_20261025_01',eventOld='evt_geral_20261025_00';
ss.sheets.TACS_NOTIFICACOES_COMPROVANTES.appendRow(receipt(eventNew,'RECADO','RECADO_1',hash));
ss.sheets.TACS_NOTIFICACOES_COMPROVANTES.appendRow(receipt(eventOld,'RECADO','RECADO_OLD',hashOld));
ctx.notificacoesAreaV1GuardarConteudoGeral_(ss,{areaId:'JAPARANDUBA'},{
  evento:eventNew,tipo:'RECADO',referencia:'RECADO_1',
  titulo:'Funcionamento da unidade',mensagem:'Na segunda-feira não haverá atendimento na unidade de saúde.'
});
let data=ctx.notificacoesAreaV1ConteudoPublicoToken_(token);
assert.equal(data.ok,true);
assert.equal(data.fonte,'ENVIO_ORIGINAL');
assert.equal(data.titulo,'Funcionamento da unidade');
assert.equal(data.mensagem,'Na segunda-feira não haverá atendimento na unidade de saúde.');
assert.equal(data.ciente,false);
assert.equal(ss.sheets.TACS_NOTIFICACOES_CONTEUDO_V1.getLastRow(),2,'Criar uma cópia única');
ctx.notificacoesAreaV1GuardarConteudoGeral_(ss,{areaId:'JAPARANDUBA'},{
  evento:eventNew,tipo:'RECADO',referencia:'RECADO_1',
  titulo:'Nova edição indevida',mensagem:'Jamais substituir a mensagem original'
});
assert.equal(ss.sheets.TACS_NOTIFICACOES_CONTEUDO_V1.getLastRow(),2,'Não duplicar histórico');

const old=ctx.notificacoesAreaV1ConteudoPublicoToken_(tokenOld);
assert.equal(old.ok,true);
assert.equal(old.fonte,'PUBLICACAO_ATUAL','Recuperar a publicação anterior sem alegar que é o texto arquivado');
assert.match(old.mensagem,/Segunda-feira não haverá atendimento/);
assert.equal(ctx.notificacoesAreaV1ConteudoPublicoToken_('b'.repeat(64)).ok,false,'Token de outro aparelho não revela conteúdo');
assert.equal(ctx.notificacoesAreaV1ConteudoPublicoToken_('qualquer-coisa').ok,false);
ss.sheets.TACS_NOTIFICACOES_COMPROVANTES.appendRow(receipt('msgv1_12345','MENSAGEM_INDIVIDUAL','MORADOR',''+hashOld));
assert.equal(ctx.notificacoesAreaV1ConteudoPublicoToken_('a'.repeat(64)).ok,false,'Token individual não acessa rota pública geral');
const payloadGeneral=ctx.notificacoesAreaV1PayloadIndividual_('APP',{areaId:'JAPARANDUBA'},{
  titulo:'Atenção',mensagem:'Comunicado geral',tipo:'RECADO',referencia:'RECADO_1',evento:eventNew
},{token,alvo:{subscriptionId:'sub'}});
assert.equal(payloadGeneral.web_buttons,undefined,'Aviso geral não pode ter botão que pula leitura');
assert.match(payloadGeneral.url,/confirmar-recebimento\.html\?t=/);
const payloadIndividual=ctx.notificacoesAreaV1PayloadIndividual_('APP',{areaId:'JAPARANDUBA'},{
  titulo:'Particular',mensagem:'Aviso particular',tipo:'MENSAGEM_INDIVIDUAL',referencia:'MORADOR',evento:'evt_123'
},{token,alvo:{subscriptionId:'sub'}});
assert.equal(payloadIndividual.web_buttons[0].id,'confirmar_recebimento','Preservar tipo individual');
const get=ctx.notificacoesAreaV1TratarGet_({parameter:{action:'publico_notificacao_conteudo',t:token,callback:'meuCallback'}});
assert.equal(get.type,'JS');
assert.match(get.data,/^meuCallback\(\{/);
assert.equal(JSON.stringify(ss.sheets.TACS_NOTIFICACOES_CONTEUDO_V1).includes(token),false,'Não gravar segredo no histórico');

function el(id){
 return {id,hidden:id==='conteudoGeral'||id==='recarregar'||id==='confirmar'||id==='fecharNotificacao'||id==='fonteAntiga',
 disabled:id==='confirmar',textContent:'',className:'',style:{},listeners:{},addEventListener(n,cb){this.listeners[n]=cb},
 click(){if(this.disabled)return;this.listeners.click?.()},remove(){this.parentNode=null}};
}
const ids={};
for(const id of ['portal','estado','fecharNotificacao','confirmar','recarregar','conteudoGeral','tituloGeral','textoGeral','fonteAntiga','fechamentoAjuda'])ids[id]=el(id);
let posts=0,provided=0,timerId=0;
const win={opener:null};
const mockDoc={
 getElementById:id=>ids[id],referrer:'',
 createElement:()=>({parentNode:null,src:'',remove(){this.parentNode=null}}),
 head:{appendChild(node){
   node.parentNode=this;
   const u=new URL(node.src),cb=decodeURIComponent(u.searchParams.get('callback')||'');
   if(u.searchParams.get('action')==='publico_notificacao_conteudo'){
     provided++;win[cb]({ok:true,individual:false,titulo:'Título geral',mensagem:'Texto exibido integralmente antes da ciência',fonte:'ENVIO_ORIGINAL',ciente:false});
   }else if(u.searchParams.get('action')==='publico_confirmar_recebimento_result'){
     win[cb]({ok:true,pendente:false,result:{ok:true}});
   }
 }}
};
const history={replaceState(){},length:1};
const location={search:'?t='+token,pathname:'/confirmar-recebimento.html',origin:'https://example.invalid'};
function Params(q){const obj=new URLSearchParams(q);this.get=k=>obj.get(k);this.set=(k,v)=>obj.set(k,v);this.toString=()=>obj.toString()}
new Function('document','window','location','history','URLSearchParams','navigator','fetch','setTimeout','clearTimeout',script[1])(
 mockDoc,win,location,history,Params,{userAgent:'iPhone'},
 ()=>{posts++;return Promise.resolve()},cb=>{cb();return ++timerId},()=>{});
assert.equal(provided,1);
assert.equal(posts,0,'A página não registra ciência antes do clique');
assert.equal(ids.textoGeral.textContent,'Texto exibido integralmente antes da ciência');
assert.equal(ids.conteudoGeral.hidden,false);
assert.equal(ids.confirmar.disabled,false);
assert.equal(ids.confirmar.hidden,false);
ids.confirmar.click();
assert.equal(posts,1,'Registrar exatamente um POST após clique');
assert.equal(ids.fecharNotificacao.hidden,false);
assert.equal(ids.confirmar.hidden,true);
console.log('CSC_AVISO_GERAL_OK: texto fiel, legado, token, leitura antes da ciência e confirmação em clique.');
