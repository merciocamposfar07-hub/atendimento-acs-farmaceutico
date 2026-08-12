'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','apps-script','ZZZZ_20_PublicacoesTerritoriaisV1.gs'),'utf8');

class Range{
  constructor(sheet,row,col,rows=1,cols=1){this.sheet=sheet;this.row=row;this.col=col;this.rows=rows;this.cols=cols;}
  getValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.cell(this.row+r,this.col+c)));}
  getDisplayValues(){return this.getValues().map(row=>row.map(v=>String(v==null?'':v)));}
  setValues(values){for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++)this.sheet.setCell(this.row+r,this.col+c,values[r][c]);return this;}
  setValue(value){this.sheet.setCell(this.row,this.col,value);return this;}
  setNumberFormat(){return this;}
}
class Sheet{
  constructor(name,rows=[]){this.name=name;this.rows=rows.map(r=>r.slice());}
  getName(){return this.name;}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return this.rows.reduce((m,r)=>Math.max(m,r.length),0);}
  getRange(r,c,rs=1,cs=1){return new Range(this,r,c,rs,cs);}
  cell(r,c){return (this.rows[r-1]||[])[c-1]??'';}
  setCell(r,c,v){while(this.rows.length<r)this.rows.push([]);while(this.rows[r-1].length<c)this.rows[r-1].push('');this.rows[r-1][c-1]=v;}
  appendRow(row){this.rows.push(row.slice());}
  deleteRow(row){this.rows.splice(row-1,1);}
  setFrozenRows(){}
}
class Book{
  constructor(){this.sheets=new Map();}
  getSheetByName(n){return this.sheets.get(n)||null;}
  insertSheet(n){const s=new Sheet(n);this.sheets.set(n,s);return s;}
  add(sheet){this.sheets.set(sheet.name,sheet);return sheet;}
}
const book=new Book();
book.add(new Sheet('RECADOS_PORTAL',[
  ['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO'],
  ['REC_LEGADO','Recado antigo','Somente Japaranduba','INFORMATIVO','2026-12-31',true]
]));
book.add(new Sheet('CAMPANHAS_PORTAL',[
  ['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO'],
  ['CAM_LEGADO','Campanha antiga','Somente Japaranduba','2026-01-01','Todos',true]
]));

const cache=new Map();let uuid=0;
const context=vm.createContext({
  console,Date,JSON,Math,Object,Array,String,Number,RegExp,isFinite,
  doGet(){return null;},doPost(){return null;},
  SpreadsheetApp:{getActiveSpreadsheet:()=>book,flush(){}},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,String(v))})},
  Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`},
  ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:content=>({content,setMimeType(){return this;}})},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput:content=>({content,setXFrameOptionsMode(){return this;}})},
  tacsTerritorioV1Planilha_:()=>book,
  tacsTerritorioV1ExigirAdmin_(a){if(!a||a.perfil!=='ADMIN_GERAL')throw new Error('admin');},
  tacsTerritorioV1LerAreas_:()=>[
    {areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',ativa:true},
    {areaId:'MUNTUNS',areaNome:'Sítio Muntuns',ativa:true}
  ],
  portalManutencaoV1StatusPublico_:areaId=>({ok:true,areaId,ativa:false})
});
vm.runInContext(source,context);

const admin={perfil:'ADMIN_GERAL',operadorId:'ADMIN'};
const tacsM={perfil:'TACS',tacsId:'T2',operadorId:'TACS:T2',areaId:'MUNTUNS',permissoes:['PUBLICACOES_GERENCIAR']};
const tacsSem={perfil:'TACS',tacsId:'T3',areaId:'OUTRA',permissoes:[]};
const japa={areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba'};
const munt={areaId:'MUNTUNS',areaNome:'Sítio Muntuns'};

assert.doesNotThrow(()=>context.publicacoesTerritoriaisV1ExigirPermissao_(tacsM));
assert.throws(()=>context.publicacoesTerritoriaisV1ExigirPermissao_(tacsSem),/não possui permissão/i);

let dadosJ=context.publicacoesTerritoriaisV1Dados_(japa,admin);
assert.equal(dadosJ.recados.length,1,'Linha legada sem AREA_ID precisa continuar em Japaranduba');
assert.equal(dadosJ.campanhas.length,1);
assert.equal(book.getSheetByName('RECADOS_PORTAL').rows[0].at(-1),'AREA_ID','Leitura territorial deve migrar cabeçalho de forma aditiva');

let salvo=context.publicacoesTerritoriaisV1Salvar_(munt,tacsM,'recado',{
  titulo:'Recado Muntuns',mensagem:'Conteúdo Muntuns',prioridade:'IMPORTANTE',validade:'2026-12-31',ativo:'true'
});
assert.equal(salvo.ok,true);assert.equal(salvo.areaId,'MUNTUNS');
let dadosM=context.publicacoesTerritoriaisV1Dados_(munt,tacsM);
assert.equal(dadosM.recados.length,1);assert.equal(dadosM.recados[0].AREA_ID,'MUNTUNS');
dadosJ=context.publicacoesTerritoriaisV1Dados_(japa,admin);
assert.equal(dadosJ.recados.length,1);assert.equal(dadosJ.recados[0].ID,'REC_LEGADO','Recado de Muntuns não pode aparecer em Japaranduba');

assert.throws(()=>context.publicacoesTerritoriaisV1Salvar_(munt,tacsM,'recado',{
  id:'REC_LEGADO',titulo:'Tentativa cruzada',mensagem:'X',prioridade:'INFORMATIVO',validade:'',ativo:'true'
}),/não foi encontrada nesta área/i,'Mesmo ID de outra área não pode ser editado');

assert.throws(()=>context.publicacoesTerritoriaisV1Remover_(munt,tacsM,'recado','REC_LEGADO'),/não foi encontrada nesta área/i);
assert.equal(context.publicacoesTerritoriaisV1Remover_(munt,tacsM,'recado',salvo.id).ok,true);
assert.equal(context.publicacoesTerritoriaisV1Dados_(munt,tacsM).recados.length,0);
assert.equal(context.publicacoesTerritoriaisV1Dados_(japa,admin).recados.length,1);

const audit=book.getSheetByName('TACS_AUDIT_PUBLICACOES');
assert.ok(audit);assert.ok(audit.getLastRow()>=3,'Salvar e remover precisam gerar auditoria');
console.log('Publicações territoriais: legado Japaranduba, Muntuns, permissão, bloqueio cruzado e auditoria validados.');
