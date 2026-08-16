'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs'),'utf8');

class Range{
  constructor(sheet,row,col,rows,cols){this.sheet=sheet;this.row=row;this.col=col;this.rows=rows||1;this.cols=cols||1;}
  getDisplayValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>String(this.sheet.rows[this.row-1+r]?.[this.col-1+c]??'')));}
  getValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.rows[this.row-1+r]?.[this.col-1+c]??''));}
  setValue(v){while(this.sheet.rows.length<this.row)this.sheet.rows.push([]);this.sheet.rows[this.row-1][this.col-1]=v;return this;}
  setValues(vals){for(let r=0;r<vals.length;r++)for(let c=0;c<vals[r].length;c++)new Range(this.sheet,this.row+r,this.col+c).setValue(vals[r][c]);return this;}
  setNumberFormat(){return this;}
}
class Sheet{
  constructor(name,rows){this.name=name;this.rows=rows||[];}
  getName(){return this.name;}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));}
  getRange(r,c,rs,cs){return new Range(this,r,c,rs,cs);}
  setFrozenRows(){return this;}
  appendRow(row){this.rows.push([...row]);return this;}
  deleteRow(row){this.rows.splice(row-1,1);}
}
class Book{
  constructor(){this.sheets=new Map();}
  add(name,rows){const s=new Sheet(name,rows);this.sheets.set(name,s);return s;}
  getSheetByName(name){return this.sheets.get(name)||null;}
  insertSheet(name){return this.add(name,[]);}
}
const book=new Book();
book.add('RECADOS_PORTAL',[
  ['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO'],
  ['REC_LEGADO','Legado','Recado legado','INFORMATIVO','2026-12-31','TRUE']
]);
book.add('CAMPANHAS_PORTAL',[
  ['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO'],
  ['CAMP_LEGADA','Campanha legado','Campanha','2026-01-01','Segunda a sexta','TRUE']
]);
const context=vm.createContext({
  console,Date,JSON,Math,
  Utilities:{getUuid:()=>String(Math.random()),formatDate:()=> '2026-08-16 12:00:00'},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  SpreadsheetApp:{flush(){},getActiveSpreadsheet:()=>book},
  ContentService:{MimeType:{JAVASCRIPT:'js',JSON:'json'},createTextOutput:t=>({setMimeType(){return this;},text:t})},
  CacheService:{getScriptCache:()=>({get:()=>null,put(){},remove(){}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})},
  moradoresAdminV1ResolverContexto_:(acesso,area)=>({areaId:String(area||acesso.areaId||'JAPARANDUBA').toUpperCase(),areaNome:String(area||acesso.areaId||'JAPARANDUBA')}),
  tacsTerritorioV1ValidarAcesso_:(p)=>p.__acesso,
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
const headersMigrados=book.getSheetByName('RECADOS_PORTAL').rows[0];
assert.ok(headersMigrados.includes('AREA_ID'),'Leitura territorial deve migrar AREA_ID de forma aditiva');
assert.ok(headersMigrados.includes('HORARIO'),'Leitura territorial deve migrar HORARIO de forma aditiva');

let salvo=context.publicacoesTerritoriaisV1Salvar_(munt,tacsM,'recado',{
  titulo:'Recado Muntuns',mensagem:'Conteúdo Muntuns',prioridade:'IMPORTANTE',horario:'08:00 às 16:00',validade:'2026-12-31',ativo:'true'
});
assert.equal(salvo.ok,true);assert.equal(salvo.areaId,'MUNTUNS');
let dadosM=context.publicacoesTerritoriaisV1Dados_(munt,tacsM);
assert.equal(dadosM.recados.length,1);assert.equal(dadosM.recados[0].AREA_ID,'MUNTUNS');assert.equal(dadosM.recados[0].HORARIO,'08:00 às 16:00');
dadosJ=context.publicacoesTerritoriaisV1Dados_(japa,admin);
assert.equal(dadosJ.recados.length,1);assert.equal(dadosJ.recados[0].ID,'REC_LEGADO','Recado de Muntuns não pode aparecer em Japaranduba');

assert.throws(()=>context.publicacoesTerritoriaisV1Salvar_(munt,tacsM,'recado',{
  id:'REC_LEGADO',titulo:'Tentativa cruzada',mensagem:'X',prioridade:'INFORMATIVO',validade:'',ativo:'true'
}),/não foi encontrada nesta área/i,'Mesmo ID de outra área não pode ser editado');

console.log('PUBLICACOES_TERRITORIAIS_TESTS_OK');