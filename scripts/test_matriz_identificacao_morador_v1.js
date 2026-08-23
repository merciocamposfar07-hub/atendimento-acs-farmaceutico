'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const digits=v=>String(v||'').replace(/\D/g,'');
const AREA_SOURCE=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const FAMILY_SOURCE=read('apps-script/ZZZZ_43_IdentificacaoFamiliarPublicaV1.gs');
const FRONTEND=read('portal-identificacao-familia-v1.js');
const PACKAGE=JSON.parse(read('package.json'));

function resident(cpf,cns,name,status='ATIVO'){
  const row=new Array(20).fill('');
  row[0]=`P_${name.toUpperCase().replace(/\W/g,'_')}`;
  row[2]=cpf;row[3]=cns;row[4]=name;row[15]=status;
  return row;
}

function makeAreaBook(rows){
  const headers=['ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO','CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO','STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL','OBSERVACOES'];
  const all=[headers,...rows];
  return {getSheetByName(name){if(name!=='MORADORES')return null;return {
    getLastRow(){return all.length;},getLastColumn(){return 20;},
    getRange(row,col,rowCount=1,colCount=1){return {getDisplayValues(){return all.slice(row-1,row-1+rowCount).map(r=>Array.from({length:colCount},(_,i)=>String((r||[])[col-1+i]??'')));}};}
  };}};
}

function testMaskedDocuments(){
  const cache=new Map();
  const books={
    JAPA:makeAreaBook([resident('12345678901','123456789012345','Pessoa Japa')]),
    MUNT:makeAreaBook([resident('98765432109','987654321098765','Pessoa Muntuns')])
  };
  const ctx=vm.createContext({
    console,Date,JSON,Math,Object,Array,String,Number,RegExp,isFinite,
    doGet(){return null;},doPost(){return null;},
    moradoresAdminV1CpfValido_(){return true;},
    CacheService:{getScriptCache(){return {get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,String(v)),remove:k=>cache.delete(k)};}},
    SpreadsheetApp:{openById(id){return books[id];}},
    Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest(_a,v){return Array.from(crypto.createHash('sha256').update(String(v)).digest()).map(b=>b>127?b-256:b);}},
    PropertiesService:{getScriptProperties(){return {getProperty(){return null;},setProperty(){}};}},
    ContentService:{MimeType:{JSON:'JSON',JAVASCRIPT:'JS'},createTextOutput(content){return {content,setMimeType(){return this;}};}},
    HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput(content){return {content,setXFrameOptionsMode(){return this;}};}}
  });
  vm.runInContext(AREA_SOURCE,ctx);
  ctx.tacsTerritorioV1LerAreas_=()=>[
    {areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',planilhaId:'JAPA',ativa:true,consultaPorDocumento:true},
    {areaId:'MUNTUNS',areaNome:'Sítio Muntuns',planilhaId:'MUNT',ativa:true,consultaPorDocumento:true}
  ];
  ctx.tacsTerritorioV1ConferirFonte_=id=>({planilhaId:id,aba:'MORADORES',linhaCabecalho:1,totalColunas:20,schema:'20/20'});
  const cpf=ctx.tacsTerritorioV1IdentificarAreaPublica_({documento:'123.456.789-01',dispositivo:'device-mask-cpf'});
  assert.equal(cpf.encontrado,true);assert.equal(cpf.areaId,'JAPARANDUBA','CPF com máscara deve localizar a mesma pessoa/área do CPF sem máscara.');
  const cns=ctx.tacsTerritorioV1IdentificarAreaPublica_({documento:'987 654 321 098 765',dispositivo:'device-mask-cns'});
  assert.equal(cns.encontrado,true);assert.equal(cns.areaId,'MUNTUNS','CNS formatado deve ser normalizado para os mesmos 15 dígitos.');
}

function makeResidentSheet(name,rows){
  return {
    __name:name,__rows:rows,
    getName(){return name;},getLastRow(){return this.__rows.length+1;},getLastColumn(){return 20;},
    getRange(row,col,rowCount=1,colCount=20){
      const start=Math.max(0,row-2);
      const selected=this.__rows.slice(start,start+rowCount);
      return {getValues(){return selected.map(r=>r.slice());},getDisplayValues(){return selected.map(r=>r.map(v=>String(v==null?'':v)));}};
    }
  };
}

function testComplementAndRepeatRecognition(){
  const MIGUEL_CNS='898001234567890';
  const ANA_CNS='898009999999999';
  const NEW_CPF='52998224725';
  const DUP_CPF='11122233344';
  const japa=makeResidentSheet('MORADORES',[
    resident('',MIGUEL_CNS,'Miguel'),
    resident('',ANA_CNS,'Ana')
  ]);
  const munt=makeResidentSheet('MORADORES',[resident(DUP_CPF,'777777777777777','Outra Pessoa')]);
  const sequence=[];
  const contextById={JAPA:{sheet:japa,ss:{id:'JAPA'}},MUNT:{sheet:munt,ss:{id:'MUNT'}}};
  const map={cpf:2,cns:3,nome:4,ultimaAtualizacao:14,status:15};
  const ctx=vm.createContext({
    console,Date,JSON,Math,Object,Array,String,Number,RegExp,URLSearchParams,
    moradoresAdminV1NormalizarAreaId_:v=>String(v||'').toUpperCase(),
    moradoresAdminV1AreasPublicas_:area=>area==='JAPARANDUBA'?[{areaId:'JAPARANDUBA',areaNome:'Japaranduba',agenteId:'T1',unidadeId:'U1',planilhaId:'JAPA'}]:[],
    moradoresAdminV1Digitos_:digits,
    moradoresAdminV1CpfValido_:()=>true,
    moradoresAdminV1CatalogoAreas_:()=>[
      {ativa:true,areaId:'JAPARANDUBA',areaNome:'Japaranduba',agenteId:'T1',unidadeId:'U1',planilhaId:'JAPA'},
      {ativa:true,areaId:'MUNTUNS',areaNome:'Muntuns',agenteId:'T2',unidadeId:'U1',planilhaId:'MUNT'}
    ],
    moradoresAdminV1LocalizarFonte_:contexto=>({sheet:contextById[contexto.planilhaId].sheet,ss:contextById[contexto.planilhaId].ss,headerRow:0,map}),
    moradoresAdminV1LerMetaMap_:()=>({porOrigem:{},porChave:{}}),
    moradoresAdminV1MontarMorador_:(display)=>({idPortal:display[0],id:display[1],cpf:digits(display[2]),cns:digits(display[3]),nome:String(display[4]||''),status:String(display[15]||'')}),
    moradoresAdminV1ChaveRegistro_:m=>m.idPortal||m.nome,
    moradoresAdminV1ChaveOrigem_:o=>`${o.aba}:${o.linha}`,
    moradoresAdminV1EstaOculto_:()=>false,
    moradoresAdminV1SetCell_:(sheet,row,index,value)=>{sheet.__rows[row-2][index]=value;if(index===2||index===3)sequence.push(`documento:${index}`);else sequence.push(`campo:${index}`);},
    moradoresAdminV1Auditar_:()=>sequence.push('auditoria'),
    moradoresAdminV1InvalidarResumo_:()=>sequence.push('invalidar'),
    LockService:{getScriptLock(){return {tryLock(){return true;},releaseLock(){sequence.push('unlock');}};}},
    SpreadsheetApp:{flush(){sequence.push('flush');}},
    CacheService:{getScriptCache(){return {put(){},get(){return null;}};}},
    ContentService:{MimeType:{JSON:'JSON',JAVASCRIPT:'JS'},createTextOutput(content){return {content,setMimeType(){return this;}};}}
  });
  vm.runInContext(FAMILY_SOURCE,ctx);
  const success=ctx.identificacaoFamiliarPublicaV1ComplementarDocumento_({areaId:'JAPARANDUBA',documentoLocalizador:MIGUEL_CNS,documentoNovo:NEW_CPF});
  assert.equal(success.ok,true);assert.equal(success.complementado,true);
  assert.equal(digits(japa.__rows[0][2]),NEW_CPF,'A gravação confirmada precisa atualizar a mesma linha do morador, não criar outra.');
  assert.equal(japa.__rows.length,2,'Complementar documento não pode criar nova linha de morador.');
  assert(sequence.indexOf('documento:2')>=0&&sequence.indexOf('auditoria')>sequence.indexOf('documento:2'),'A auditoria deve ocorrer depois da escrita documental efetiva.');
  const contexto=ctx.identificacaoFamiliarPublicaV1Contexto_('JAPARANDUBA');
  const repeat=ctx.identificacaoFamiliarPublicaV1LocalizarUnico_(NEW_CPF,contexto);
  assert.equal(repeat.morador.nome,'Miguel','O CPF recém-vinculado precisa reconhecer imediatamente o mesmo morador em nova consulta.');
  assert.equal(ctx.identificacaoFamiliarPublicaV1DocumentoJaExiste_(DUP_CPF),true,'Duplicidade precisa ser detectada também em outra área ativa.');
  const writesBefore=sequence.filter(x=>x.startsWith('documento:')).length;
  assert.throws(()=>ctx.identificacaoFamiliarPublicaV1ComplementarDocumento_({areaId:'JAPARANDUBA',documentoLocalizador:ANA_CNS,documentoNovo:DUP_CPF}),/já está associado a outro cadastro/);
  assert.equal(sequence.filter(x=>x.startsWith('documento:')).length,writesBefore,'CPF duplicado em outra área deve bloquear antes de qualquer escrita.');
  assert.throws(()=>ctx.identificacaoFamiliarPublicaV1ComplementarDocumento_({areaId:'JAPARANDUBA',documentoLocalizador:MIGUEL_CNS,documentoNovo:'22233344455'}),/já possui CPF registrado/,'Documento existente nunca pode ser substituído automaticamente.');
}

function testPermanentContracts(){
  assert.match(FRONTEND,/documento ficará guardado somente nesta tela/,'Aparelho sem família reconhecida não pode receber lista de integrantes automaticamente.');
  assert.doesNotMatch(FRONTEND,/localStorage\.setItem\([^\n]*(?:pendingMissing|documentoNovo)/i,'Documento pendente não pode ser persistido no navegador.');
  assert.match(FAMILY_SOURCE,/moradoresAdminV1CatalogoAreas_\(\).*ativa!==false/,'Unicidade documental precisa abranger todas as áreas ativas.');
  assert.doesNotMatch(FAMILY_SOURCE,/appendRow\([^\n]*morador/i,'Complemento não pode criar linha duplicada.');
  const suite=PACKAGE.scripts.test;
  [
    'test_public_area_identification.js','test_identificacao_familiar_publica_v1.js',
    'test_troca_aparelho_notificacoes_v1.js','test_familia_aparelho_beneficiario_v1.js'
  ].forEach(name=>assert(suite.includes(name),`${name} precisa permanecer no gate completo da matriz de identificação.`));
}

testMaskedDocuments();
testComplementAndRepeatRecognition();
testPermanentContracts();
console.log('MATRIZ_IDENTIFICACAO_MORADOR_V1_OK: máscara CPF/CNS, território, complemento, unicidade global, repetição, auditoria e ausência de linha duplicada validados.');
