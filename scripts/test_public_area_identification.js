'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname,'..','apps-script','ZZZZ_17_TacsAreasAdminV1.gs'),'utf8');
const HEADERS=['ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO','CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO','STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL','OBSERVACOES'];

function makeSheet(rows){
  return {
    getLastRow(){return rows.length;}, getLastColumn(){return Math.max(...rows.map(r=>r.length));},
    getRange(row,col,rowCount=1,colCount=1){return {getDisplayValues(){return rows.slice(row-1,row-1+rowCount).map(r=>Array.from({length:colCount},(_,i)=>String((r||[])[col-1+i]??'')));}};}
  };
}
function makeBook(rows){const sheet=makeSheet(rows);return {getSheetByName(name){return name==='MORADORES'?sheet:null;}};}
function resident(cpf,cns,name,status='ATIVO'){const row=new Array(20).fill('');row[2]=cpf;row[3]=cns;row[4]=name;row[15]=status;return row;}

const books={
  JAPA:makeBook([HEADERS,resident('12345678901','123456789012345','Pessoa Japa')]),
  MUNT:makeBook([HEADERS,resident('98765432109','987654321098765','Pessoa Muntuns')])
};
const cache=new Map();
const context=vm.createContext({
  console,Date,JSON,Math,Object,Array,String,Number,RegExp,isFinite,
  doGet(){return null;},doPost(){return null;},
  moradoresAdminV1CpfValido_(){return true;},
  CacheService:{getScriptCache(){return {get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,String(v)),remove:k=>cache.delete(k)};}},
  SpreadsheetApp:{openById(id){if(!books[id])throw new Error('missing');return books[id];}},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest(_a,v){return Array.from(crypto.createHash('sha256').update(String(v)).digest()).map(b=>b>127?b-256:b);}},
  PropertiesService:{getScriptProperties(){return {getProperty(){return null;},setProperty(){}};}},
  ContentService:{MimeType:{JSON:'JSON',JAVASCRIPT:'JS'},createTextOutput(content){return {content,setMimeType(){return this;}};}},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput(content){return {content,setXFrameOptionsMode(){return this;}};}}
});
vm.runInContext(source,context);
context.tacsTerritorioV1LerAreas_=()=>[
  {areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',planilhaId:'JAPA',ativa:true,consultaPorDocumento:true},
  {areaId:'MUNTUNS',areaNome:'Sítio Muntuns',planilhaId:'MUNT',ativa:true,consultaPorDocumento:true}
];
context.tacsTerritorioV1ConferirFonte_=id=>({planilhaId:id,aba:'MORADORES',linhaCabecalho:1,totalColunas:20,schema:'20/20'});

function parse(output){return JSON.parse(output.content);}
let areas=parse(context.tacsTerritorioV1TratarGet_({parameter:{action:'publico_areas_ativas'}}));
assert.equal(areas.ok,true);assert.equal(areas.areas.length,2);assert.deepEqual(Object.keys(areas.areas[0]).sort(),['areaId','areaNome']);
assert.doesNotMatch(JSON.stringify(areas),/planilhaId|tacsId|cpf|cns/i);

function identify(documento,device){
  const requestId='public_'+device.replace(/[^a-z0-9]/gi,'')+'_'+Date.now();
  context.tacsTerritorioV1TratarPost_({parameter:{action:'publico_identificar_area',requestId,documento,dispositivo:device}});
  return parse(context.tacsTerritorioV1TratarGet_({parameter:{action:'publico_area_result',requestId}})).result;
}
let j=identify('12345678901','devjapa');assert.equal(j.ok,true);assert.equal(j.encontrado,true);assert.equal(j.areaId,'JAPARANDUBA');
let m=identify('987654321098765','devmuntuns');assert.equal(m.encontrado,true);assert.equal(m.areaId,'MUNTUNS');
let none=identify('11122233344','devnone');assert.equal(none.ok,true);assert.equal(none.encontrado,false);assert.equal(none.ambiguo,false);
assert.doesNotMatch(JSON.stringify(j),/12345678901|Pessoa Japa/);

books.MUNT=makeBook([HEADERS,resident('12345678901','999888777666555','Duplicado')]);
let ambiguous=identify('12345678901','devamb');assert.equal(ambiguous.encontrado,false);assert.equal(ambiguous.ambiguo,true);assert.equal(ambiguous.areaId,undefined);

books.MUNT=makeBook([HEADERS,resident('55544433322','555444333222111','Fora','TRANSFERIDO')]);
let inactive=identify('55544433322','devinactive');assert.equal(inactive.encontrado,false);

context.tacsTerritorioV1LerAreas_=()=>[
  {areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',planilhaId:'JAPA',ativa:true,consultaPorDocumento:false}
];
let disabled=identify('12345678901','devdisabled');assert.equal(disabled.encontrado,false);

console.log('Identificação pública de área: CPF/CNS, isolamento, ambiguidade, situação e privacidade validados.');
