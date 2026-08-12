#!/usr/bin/env python3
from pathlib import Path

SRC = Path('apps-script/ZZZZ_17_TacsAreasAdminV1.gs')
source = SRC.read_text(encoding='utf-8')

source = source.replace(
    "  RESULT_PREFIX:'tacs_territorio_v1_result_',\n  RESULT_SECONDS:300,",
    "  RESULT_PREFIX:'tacs_territorio_v1_result_',\n  PUBLIC_RESULT_PREFIX:'tacs_territorio_v1_public_result_',\n  PUBLIC_RATE_PREFIX:'tacs_territorio_v1_public_rate_',\n  RESULT_SECONDS:300,\n  PUBLIC_RATE_SECONDS:900,\n  PUBLIC_RATE_MAX:12,",
    1
)

start = source.index('function tacsTerritorioV1TratarGet_(e){')
end = source.index('\nfunction tacsTerritorioV1TratarPost_(e){', start)
new_get = r'''function tacsTerritorioV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=tacsTerritorioV1Texto_(p.action).toLowerCase();
  if(action==='publico_areas_ativas'){
    try{
      return tacsTerritorioV1ResponderJson_({
        ok:true,areas:tacsTerritorioV1AreasPublicas_(),areaPadrao:'JAPARANDUBA'
      },p.callback);
    }catch(erroPublico){
      return tacsTerritorioV1ResponderJson_({ok:false,message:'Não foi possível carregar as áreas agora.'},p.callback);
    }
  }
  if(action==='publico_area_result'){
    try{
      var requestIdPublico=tacsTerritorioV1ValidarRequestId_(p.requestId);
      var resultadoPublico=tacsTerritorioV1LerResultadoPublico_(requestIdPublico);
      return tacsTerritorioV1ResponderJson_({
        ok:true,pendente:!resultadoPublico,requestId:requestIdPublico,result:resultadoPublico||null
      },p.callback);
    }catch(erroResultadoPublico){
      return tacsTerritorioV1ResponderJson_({ok:false,message:'Não foi possível confirmar a identificação agora.'},p.callback);
    }
  }
  if(action!=='admin_territorio_result')return null;
  try{
    var requestId=tacsTerritorioV1ValidarRequestId_(p.requestId);
    var resultado=tacsTerritorioV1LerResultado_(requestId);
    return tacsTerritorioV1ResponderJson_({
      ok:true,pendente:!resultado,requestId:requestId,result:resultado||null
    },p.callback);
  }catch(erro){
    return tacsTerritorioV1ResponderJson_({ok:false,message:tacsTerritorioV1Erro_(erro)},p.callback);
  }
}'''
source = source[:start] + new_get + source[end:]

start = source.index('function tacsTerritorioV1TratarPost_(e){')
end = source.index('\nfunction tacsTerritorioV1LoginTacs_(p){', start)
new_post_and_helpers = r'''function tacsTerritorioV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=tacsTerritorioV1Texto_(p.action).toLowerCase();
  var aceitas=[
    'publico_identificar_area',
    'admin_territorio_login_tacs','admin_territorio_dados','admin_territorio_salvar_tacs',
    'admin_territorio_salvar_area','admin_territorio_validar_area',
    'admin_territorio_encerrar_sessao'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var resultado;
  try{
    if(action==='publico_identificar_area'){
      resultado=tacsTerritorioV1IdentificarAreaPublica_(p);
    }else if(action==='admin_territorio_login_tacs'){
      resultado=tacsTerritorioV1LoginTacs_(p);
    }else if(action==='admin_territorio_encerrar_sessao'){
      resultado=tacsTerritorioV1EncerrarSessao_(p);
    }else{
      var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
      if(action==='admin_territorio_dados')resultado=tacsTerritorioV1Dados_(acesso);
      else if(action==='admin_territorio_salvar_tacs'){
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1SalvarTacs_(p,acesso);
      }else if(action==='admin_territorio_salvar_area'){
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1SalvarArea_(p,acesso);
      }else{
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1ValidarArea_(p,acesso);
      }
    }
  }catch(erro){
    resultado=action==='publico_identificar_area'
      ?{ok:false,message:'Não foi possível conferir sua área agora. Tente novamente.'}
      :{ok:false,message:tacsTerritorioV1Erro_(erro)};
  }
  var requestId=tacsTerritorioV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    if(action==='publico_identificar_area')tacsTerritorioV1GuardarResultadoPublico_(requestId,resultado);
    else tacsTerritorioV1GuardarResultado_(requestId,resultado);
  }
  return tacsTerritorioV1ResponderPost_(requestId,resultado);
}

function tacsTerritorioV1AreasPublicas_(){
  return tacsTerritorioV1LerAreas_().filter(function(area){
    return area&&area.ativa===true&&!!tacsTerritorioV1Id_(area.areaId);
  }).map(function(area){
    return {areaId:tacsTerritorioV1Id_(area.areaId),areaNome:tacsTerritorioV1Texto_(area.areaNome||area.areaId)};
  }).sort(function(a,b){
    return a.areaNome.localeCompare? a.areaNome.localeCompare(b.areaNome,'pt-BR') : (a.areaNome>b.areaNome?1:-1);
  });
}

function tacsTerritorioV1IdentificarAreaPublica_(p){
  p=p&&typeof p==='object'?p:{};
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  if(!dispositivo||dispositivo.length>180)throw new Error('Dispositivo inválido.');
  tacsTerritorioV1LimitarConsultaPublica_(dispositivo);

  var documento=tacsTerritorioV1Digitos_(p.documento||p.cpf||p.cns);
  var tipo='';
  if(documento.length===11){
    if(/^(\d)\1{10}$/.test(documento))throw new Error('Documento inválido.');
    if(typeof moradoresAdminV1CpfValido_==='function'&&!moradoresAdminV1CpfValido_(documento))throw new Error('Documento inválido.');
    tipo='CPF';
  }else if(documento.length===15){
    if(/^(\d)\1{14}$/.test(documento))throw new Error('Documento inválido.');
    tipo='CNS';
  }else{
    throw new Error('Documento inválido.');
  }

  var encontradas=[];
  tacsTerritorioV1LerAreas_().forEach(function(area){
    if(!area||area.ativa!==true||area.consultaPorDocumento===false)return;
    if(tacsTerritorioV1AreaContemDocumento_(area,tipo,documento)){
      encontradas.push({
        areaId:tacsTerritorioV1Id_(area.areaId),
        areaNome:tacsTerritorioV1Texto_(area.areaNome||area.areaId)
      });
    }
  });

  if(encontradas.length===1){
    return {ok:true,encontrado:true,ambiguo:false,areaId:encontradas[0].areaId,areaNome:encontradas[0].areaNome};
  }
  if(encontradas.length>1){
    return {ok:true,encontrado:false,ambiguo:true,message:'Seu cadastro aparece em mais de uma área. Procure seu TACS para corrigir o cadastro.'};
  }
  return {ok:true,encontrado:false,ambiguo:false,message:'Documento não localizado nas áreas disponíveis.'};
}

function tacsTerritorioV1AreaContemDocumento_(area,tipo,documento){
  var fonte=tacsTerritorioV1ConferirFonte_(area.planilhaId);
  var ss=SpreadsheetApp.openById(area.planilhaId);
  var sheet=ss.getSheetByName(fonte.aba);
  if(!sheet)return false;
  var ultimaLinha=sheet.getLastRow();
  if(ultimaLinha<=fonte.linhaCabecalho)return false;
  var ultimaColuna=Math.max(20,sheet.getLastColumn());
  var cabecalho=sheet.getRange(fonte.linhaCabecalho,1,1,ultimaColuna).getDisplayValues()[0].map(tacsTerritorioV1Chave_);
  var indiceDocumento=cabecalho.indexOf(tipo);
  var indiceStatus=cabecalho.indexOf('STATUS');
  if(indiceDocumento<0)return false;
  var total=ultimaLinha-fonte.linhaCabecalho;
  var documentos=sheet.getRange(fonte.linhaCabecalho+1,indiceDocumento+1,total,1).getDisplayValues();
  var status=indiceStatus>=0
    ?sheet.getRange(fonte.linhaCabecalho+1,indiceStatus+1,total,1).getDisplayValues()
    :[];
  var bloqueados=['FORA_DA_AREA','TRANSFERIDO','FALECIDO','IMPORTACAO_DESFEITA'];
  for(var i=0;i<documentos.length;i++){
    if(tacsTerritorioV1Digitos_(documentos[i][0])!==documento)continue;
    var situacao=indiceStatus>=0?tacsTerritorioV1Id_(status[i][0]):'';
    if(bloqueados.indexOf(situacao)===-1)return true;
  }
  return false;
}

function tacsTerritorioV1LimitarConsultaPublica_(dispositivo){
  var cache=CacheService.getScriptCache();
  var chave=TACS_TERRITORIO_V1.PUBLIC_RATE_PREFIX+tacsTerritorioV1Hash_(dispositivo).slice(0,32);
  var estado={tentativas:0};
  try{
    var raw=cache.get(chave);
    if(raw)estado=JSON.parse(raw);
  }catch(erroLeitura){estado={tentativas:0};}
  estado.tentativas=Number(estado.tentativas||0)+1;
  if(estado.tentativas>TACS_TERRITORIO_V1.PUBLIC_RATE_MAX){
    throw new Error('Muitas tentativas de identificação.');
  }
  cache.put(chave,JSON.stringify(estado),TACS_TERRITORIO_V1.PUBLIC_RATE_SECONDS);
}
'''
source = source[:start] + new_post_and_helpers + source[end:]

anchor = 'function tacsTerritorioV1GuardarResultado_(id,resultado){'
pos = source.index(anchor)
public_result_helpers = r'''function tacsTerritorioV1GuardarResultadoPublico_(id,resultado){
  try{
    CacheService.getScriptCache().put(
      TACS_TERRITORIO_V1.PUBLIC_RESULT_PREFIX+id,
      JSON.stringify(resultado),
      TACS_TERRITORIO_V1.RESULT_SECONDS
    );
  }catch(erro){}
}
function tacsTerritorioV1LerResultadoPublico_(id){
  try{
    var raw=CacheService.getScriptCache().get(TACS_TERRITORIO_V1.PUBLIC_RESULT_PREFIX+id);
    return raw?JSON.parse(raw):null;
  }catch(erro){return null;}
}

'''
source = source[:pos] + public_result_helpers + source[pos:]
SRC.write_text(source, encoding='utf-8')

TEST = r'''\'use strict\';
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
'''.replace("\\'use strict\\';", "'use strict';")
Path('scripts/test_public_area_identification.js').write_text(TEST,encoding='utf-8')

pkg = Path('package.json')
pkg_text = pkg.read_text(encoding='utf-8')
needle = 'node scripts/test_territorio_csv_notifications.js && node scripts/test_territorio_dom.js'
replacement = 'node scripts/test_territorio_csv_notifications.js && node scripts/test_public_area_identification.js && node scripts/test_territorio_dom.js'
if needle not in pkg_text:
    raise SystemExit('Comando de testes territorial não encontrado no package.json')
pkg.write_text(pkg_text.replace(needle,replacement,1),encoding='utf-8')
print('Identificação pública de área preparada.')
