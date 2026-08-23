'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const SOURCE=fs.readFileSync(path.join(__dirname,'..','apps-script','ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),'utf8');
const DATE='2099-08-24';
const RESERVA_HEADERS=['CODIGO_SOLICITACAO','REGISTRADA_EM','DATA_CONSULTA','TIPO_VAGA','SITUACAO','VAGAS_RESTANTES','AREA_ID','ATUALIZADO_EM'];
let common=2,emergency=1,setCount=0,lockCount=0,releaseCount=0;
const reservationRows=[];

const reservaSheet={
  getLastColumn(){return RESERVA_HEADERS.length;},
  getRange(row,col,rowCount,colCount){
    return {
      getDisplayValues(){if(row===1)return [RESERVA_HEADERS.slice(col-1,col-1+colCount)];return [[]];},
      setValues(){throw new Error('Schema de reservas já deveria estar completo.');}
    };
  }
};
const agendaSheet={
  getRange(row,col){
    return {
      getDisplayValues(){return [[col===4?DATE:'']];},
      setValue(value){
        if(col===1)common=Number(value);
        else if(col===2)emergency=Number(value);
        setCount+=1;
        return this;
      }
    };
  }
};
const ss={getSheetByName(name){return name==='RESERVAS'?reservaSheet:name==='PAINEL_PROFISSIONAIS'?agendaSheet:null;}};
const agendaTable={
  sheet:agendaSheet,
  headers:['VAGAS_COMUNS','VAGAS_EMERGENCIAIS','ATUALIZADO_EM','DATA'],
  rows:[{row:2,values:[common,emergency,'',DATE]}]
};
const reservaTable={sheet:reservaSheet,headers:RESERVA_HEADERS,rows:reservationRows};

const context=vm.createContext({
  console,Date,JSON,Math,Object,Array,String,Number,RegExp,
  TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1:{AREA_PADRAO:'JAPARANDUBA',ABA_RESERVAS:'RESERVAS',RESERVA_HEADERS:RESERVA_HEADERS,ABA_AGENDAS:'PAINEL_PROFISSIONAIS',AGENDA_HEADERS:['VAGAS_COMUNS','VAGAS_EMERGENCIAIS','ATUALIZADO_EM','DATA']},
  Utilities:{formatDate(_date,_tz,pattern){return pattern==='yyyy-MM-dd'?'2099-08-23':'23/08/2099 10:00';}},
  LockService:{getScriptLock(){return {tryLock(){lockCount+=1;return true;},releaseLock(){releaseCount+=1;}};}},
  SpreadsheetApp:{flush(){}},
  agendasProfissionaisTerritoriaisV1AreaId_(value){return String(value||'').toUpperCase();},
  agendasProfissionaisTerritoriaisV1Planilha_(){return ss;},
  agendasProfissionaisTerritoriaisV1Tabela_(_ss,name){return name==='RESERVAS'?reservaTable:agendaTable;},
  agendasProfissionaisTerritoriaisV1Encontrar_(table,_field,requestId,areaId){
    const found=table.rows.find(row=>row.CODIGO_SOLICITACAO===requestId&&row.AREA_ID===areaId);
    return found?{values:found}:null;
  },
  agendasProfissionaisTerritoriaisV1Objeto_(_headers,values){return values;},
  agendasProfissionaisTerritoriaisV1LinhasArea_(){agendaTable.rows[0].values=[common,emergency,'',DATE];return agendaTable.rows;},
  agendasProfissionaisTerritoriaisV1Modulo_(value){return String(value||'').toLowerCase();},
  agendasProfissionaisTerritoriaisV1Booleano_(value){return value===true||String(value).toLowerCase()==='true';},
  agendasProfissionaisTerritoriaisV1Indice_(_table,field,required){const map={VAGAS_COMUNS:0,VAGAS_EMERGENCIAIS:1,ATUALIZADO_EM:2,DATA:3,ENCERRA_HORARIO:-1};const v=Object.prototype.hasOwnProperty.call(map,field)?map[field]:-1;if(v<0&&required!==false)throw new Error('Campo ausente '+field);return v;},
  agendasProfissionaisTerritoriaisV1Adicionar_(_table,item){reservationRows.push(Object.assign({},item));},
  agendasProfissionaisTerritoriaisV1NaoNegativo_(value){return Math.max(0,Number(value)||0);},
  agendasProfissionaisTerritoriaisV1Normalizar_(value){return String(value||'').trim().toUpperCase();},
  agendasProfissionaisTerritoriaisV1Data_(value){return String(value||'');},
  agendasProfissionaisTerritoriaisV1ResponderJson_(x){return x;},
  agendasProfissionaisTerritoriaisV1ResponderReserva_(_n,x){return x;}
});
vm.runInContext(SOURCE,context);

// Substitui apenas a montagem do item da linha por dados controlados do cenário.
context.agendasProfissionaisTerritoriaisV1Objeto_=function(_headers,values){
  if(values&&values.CODIGO_SOLICITACAO)return values;
  return {MODULO:'odontologia',DATA:DATE,ATIVO:true,SITUACAO:'Atendimento',VAGAS_COMUNS:common,VAGAS_EMERGENCIAIS:emergency,ATUALIZADO_EM:''};
};

const request={areaId:'JAPARANDUBA',requestId:'MATIAS-240899-ABCD',date:DATE,type:'comum'};
const first=context.correcaoDataOdontologiaV1Reservar_(request);
assert.equal(first.ok,true);
assert.equal(first.alreadyReserved,false);
assert.equal(first.remaining,1);
assert.equal(common,1);
assert.equal(reservationRows.length,1);

const second=context.correcaoDataOdontologiaV1Reservar_(request);
assert.equal(second.ok,true);
assert.equal(second.alreadyReserved,true);
assert.equal(second.remaining,1);
assert.equal(common,1,'Mesmo requestId não pode descontar a vaga novamente.');
assert.equal(reservationRows.length,1,'Mesmo requestId não pode criar segunda reserva.');
assert.equal(lockCount,2);
assert.equal(releaseCount,2,'O lock precisa ser liberado em todos os caminhos de reserva.');

const status=context.correcaoDataOdontologiaV1StatusReserva_({areaId:'JAPARANDUBA',requestId:request.requestId});
assert.equal(status.ok,true);assert.equal(status.found,true);assert.equal(status.remaining,1);assert.equal(status.areaId,'JAPARANDUBA');
const otherArea=context.correcaoDataOdontologiaV1StatusReserva_({areaId:'MUNTUNS',requestId:request.requestId});
assert.equal(otherArea.ok,true);assert.equal(otherArea.found,false,'Uma área não pode enxergar a reserva registrada em outra.');

// setValue da vaga + ATUALIZADO_EM ocorre apenas na primeira reserva; a segunda é idempotente.
assert.equal(setCount,2);
console.log('DENTAL_RESERVA_TERRITORIAL_V1_OK: lock, abatimento único, idempotência por requestId e isolamento de área validados.');
