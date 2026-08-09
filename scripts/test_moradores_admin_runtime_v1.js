'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const crypto=require('crypto');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs'),'utf8');

const metrics={rangeCalls:0,sheetWrites:0,spreadsheetFlushes:0,openedSpreadsheetIds:[]};
const cache=new Map();
const properties=new Map();

function failSheetWrite(operation){metrics.sheetWrites+=1;throw new Error('ESCRITA_INDEVIDA_NO_TESTE: '+operation);}
function cloneRows(rows,startRow,startCol,numRows,numCols){
  const out=[];
  for(let r=0;r<numRows;r+=1){
    const source=rows[startRow-1+r]||[];
    const row=[];
    for(let c=0;c<numCols;c+=1){row.push(source[startCol-1+c]==null?'':source[startCol-1+c]);}
    out.push(row);
  }
  return out;
}

const headers=[
  'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO','CELULAR',
  'TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO','STATUS',
  'CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL','OBSERVACOES'
];

const residentRows=[headers];
for(let i=1;i<=1000;i+=1){
  residentRows.push([
    'TACS-'+String(i).padStart(6,'0'),'',
    i===999?'52998224725':'',String(700000000000000+i).padStart(15,'0'),
    'Morador '+String(i).padStart(4,'0'),'01/01/1990','36 anos e 7 meses',
    i%2?'Masculino':'Feminino',
    'Sítio JAPARANDUBA, '+String(i).padStart(3,'0')+'. ZONA RURAL, Chã Grande/PE',
    '8199999'+String(i).padStart(4,'0'),'','1','USF MATIAS CDS','CDS','25/02/2026','ATIVO','NÃO','','27/07/2026 00:38',''
  ]);
}

function makeRange(startRow,startCol,numRows,numCols){
  return {
    getValues(){return cloneRows(residentRows,startRow,startCol,numRows,numCols);},
    getDisplayValues(){return cloneRows(residentRows,startRow,startCol,numRows,numCols).map(row=>row.map(v=>String(v==null?'':v)));},
    setValue(){return failSheetWrite('setValue');},
    setValues(){return failSheetWrite('setValues');},
    setNumberFormat(){return failSheetWrite('setNumberFormat');}
  };
}

const residentSheet={
  getName(){return 'MORADORES';},
  getLastRow(){return residentRows.length;},
  getLastColumn(){return headers.length;},
  getMaxRows(){return 2000;},
  getRange(startRow,startCol,numRows,numCols){metrics.rangeCalls+=1;return makeRange(startRow,startCol,numRows||1,numCols||1);},
  insertRowsAfter(){return failSheetWrite('insertRowsAfter');},
  appendRow(){return failSheetWrite('appendRow');},
  setFrozenRows(){return failSheetWrite('setFrozenRows');}
};

const spreadsheet={
  getSheets(){return [residentSheet];},
  getSheetByName(name){return name==='MORADORES'?residentSheet:null;},
  insertSheet(){return failSheetWrite('insertSheet');}
};

const context={
  console,
  SpreadsheetApp:{
    openById(id){metrics.openedSpreadsheetIds.push(String(id));return spreadsheet;},
    flush(){metrics.spreadsheetFlushes+=1;throw new Error('flush não deve ocorrer em leitura');}
  },
  PropertiesService:{
    getScriptProperties(){return{
      getProperty(name){return properties.has(name)?properties.get(name):null;},
      setProperty(name,value){properties.set(name,String(value));},
      deleteProperty(name){properties.delete(name);}
    };}
  },
  CacheService:{
    getScriptCache(){return{
      get(key){return cache.has(key)?cache.get(key):null;},
      put(key,value){cache.set(key,String(value));}
    };}
  },
  Utilities:{
    getUuid(){return '12345678-1234-4123-8123-123456789abc';},
    computeDigest(_algorithm,value){return Array.from(crypto.createHash('sha256').update(String(value),'utf8').digest());},
    DigestAlgorithm:{SHA_256:'SHA_256'},
    Charset:{UTF_8:'UTF_8'},
    formatDate(date,_tz,format){
      const d=new Date(date);const day=String(d.getDate()).padStart(2,'0');const month=String(d.getMonth()+1).padStart(2,'0');
      if(format==='dd/MM/yyyy HH:mm')return day+'/'+month+'/'+d.getFullYear()+' 00:00';
      return day+'/'+month+'/'+d.getFullYear();
    },
    sleep(){}
  },
  LockService:{
    getScriptLock(){return{
      tryLock(){throw new Error('Lock não deve ser solicitado enquanto a escrita estiver bloqueada.');},
      releaseLock(){}
    };}
  },
  HtmlService:{
    XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},
    createHtmlOutput(content){return{content,setXFrameOptionsMode(){return this;}};}
  },
  ContentService:{
    MimeType:{JAVASCRIPT:'JAVASCRIPT',JSON:'JSON'},
    createTextOutput(content){return{content,setMimeType(){return this;}};}
  },
  profissionaisDinamicosV1ValidarSessao_(){
    return{dispositivo:'iphone-teste',criadoEm:Date.now(),expiraEm:Date.now()+60000};
  }
};

vm.createContext(context);
vm.runInContext(backend,context,{filename:'ZZZZ_15_MoradoresAdminPortalV1.gs'});

assert.strictEqual(context.TACS_MORADORES_ADMIN_V1.VERSAO,'1.2.0');

const legacyScope=context.moradoresAdminV1ResolverContexto_({dispositivo:'iphone-teste'});
assert.strictEqual(legacyScope.perfil,'ADMIN_GERAL');
assert.strictEqual(legacyScope.agenteId,'AG001');
assert.strictEqual(legacyScope.areaId,'JAPARANDUBA');
assert.strictEqual(legacyScope.areaNome,'Sítio Japaranduba');
assert.strictEqual(legacyScope.unidadeId,'POSTO_MATIAS');

metrics.rangeCalls=0;metrics.sheetWrites=0;
const diagnostic=context.testarConfiguracaoMoradoresAdminPortalV1();
assert.strictEqual(diagnostic.ok,true);
assert.strictEqual(diagnostic.versao,'1.2.0');
assert.strictEqual(diagnostic.totalRegistros,1000);
assert.strictEqual(diagnostic.totalColunas,20);
assert.strictEqual(diagnostic.schemaValido,true);
assert.strictEqual(diagnostic.modeloCadastro,'CIDADAO_INDIVIDUAL');
assert.strictEqual(diagnostic.vinculoFamiliar,'CAMADA_SEPARADA_PLANEJADA');
assert.deepStrictEqual(JSON.parse(JSON.stringify(diagnostic.colunasMapeadas)),{
  idPortal:1,id:2,cpf:3,cns:4,nome:5,nascimento:6,idade:7,sexo:8,endereco:9,celular:10,
  telefoneContato:11,microarea:12,equipe:13,origem:14,ultimaAtualizacao:15,status:16,
  consentimentoWhatsapp:17,dataConsentimento:18,dataCadastroPortal:19,observacoes:20
});
assert.strictEqual(diagnostic.escritaHabilitada,false);
assert.strictEqual(diagnostic.situacaoHabilitada,false);
assert.strictEqual(diagnostic.nenhumaAlteracaoRealizada,true);
assert.strictEqual(metrics.sheetWrites,0,'Diagnóstico realizou escrita na planilha.');
assert.strictEqual(metrics.spreadsheetFlushes,0,'Diagnóstico executou flush.');

metrics.rangeCalls=0;
const search=context.moradoresAdminV1Buscar_('Morador 0999',legacyScope);
assert.strictEqual(search.ok,true);
assert.strictEqual(search.resultados.length,1);
assert.strictEqual(search.resultados[0].nome,'Morador 0999');
assert.strictEqual(search.resultados[0].idPortal,'TACS-000999');
assert.strictEqual(search.resultados[0].endereco.includes('JAPARANDUBA'),true);
assert.strictEqual(search.resultados[0].areaId,'JAPARANDUBA');
assert.ok(metrics.rangeCalls<=3,'A busca fez leituras por linha em vez de leitura em lote.');
assert.strictEqual(metrics.sheetWrites,0,'Busca realizou escrita na planilha.');

// Bebê/cidadão sem CPF e sem CNS não depende de mãe/pai para validação estrutural.
assert.doesNotThrow(()=>context.moradoresAdminV1ValidarDadosMorador_({
  nome:'Bebê Teste',nascimento:'08/08/2026',sexo:'Feminino',endereco:'Sítio Japaranduba',cpf:'',cns:''
}));
const identity=context.moradoresAdminV1ChaveIdentidade_({
  nome:'Bebê Teste',nascimento:'08/08/2026',endereco:'Sítio Japaranduba'
});
assert.ok(identity.includes('bebe teste'));
assert.ok(identity.includes('08/08/2026'));
assert.ok(identity.includes('sitio japaranduba'));

// Cabeçalho incompleto deve falhar, nunca inferir posições.
const broken=headers.slice();broken[4]='NOME_ERRADO';
const schemaBroken=context.moradoresAdminV1MapearSchemaReal_(broken);
assert.strictEqual(schemaBroken.ok,false);
assert.ok(schemaBroken.faltantes.includes('NOME'));

const requestIdStatus='moradores_status_runtime_001';
context.moradoresAdminV1TratarPost_({parameter:{
  action:'admin_moradores_status',token:'token-teste',dispositivo:'iphone-teste',requestId:requestIdStatus
}});
const statusEnvelope=JSON.parse(cache.get(context.TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestIdStatus));
assert.strictEqual(statusEnvelope.ok,true);
assert.strictEqual(statusEnvelope.escritaHabilitada,false);
assert.strictEqual(metrics.sheetWrites,0,'Rota admin_moradores_status realizou escrita.');

const requestIdWrite='morador_salvar_bloqueado_001';
context.moradoresAdminV1TratarPost_({parameter:{
  action:'admin_morador_salvar',token:'token-teste',dispositivo:'iphone-teste',requestId:requestIdWrite,
  payload:JSON.stringify({nome:'Bebê que não pode ser gravado',nascimento:'08/08/2026',sexo:'Feminino',endereco:'Sítio Japaranduba'})
}});
const blockedWrite=JSON.parse(cache.get(context.TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestIdWrite));
assert.strictEqual(blockedWrite.ok,false);
assert.ok(/escrita de moradores ainda está bloqueada/i.test(blockedWrite.message));
assert.strictEqual(metrics.sheetWrites,0,'A rota de salvar tocou na planilha com o gate bloqueado.');
assert.strictEqual(metrics.spreadsheetFlushes,0,'A rota de salvar executou flush com o gate bloqueado.');

assert.ok(metrics.openedSpreadsheetIds.every(id=>id===context.TACS_MORADORES_ADMIN_V1.DEFAULT_RESIDENT_SPREADSHEET_ID),'Foi aberta fonte diferente da autorizada.');

console.log('OK — runtime Moradores V1.2: schema A:T, cidadão sem mãe/pai, leitura em lote e zero escrita validados.');
