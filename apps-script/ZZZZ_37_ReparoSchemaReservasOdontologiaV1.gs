/*
 * ZZZZ_37_ReparoSchemaReservasOdontologiaV1.gs
 * Portal TACS — reparo estritamente aditivo da aba RESERVAS_ODONTOLOGIA V1.1.0
 *
 * Problema confirmado em produção em 17/08/2026:
 * a rota de reserva abortava antes de VAGAS_COMUNS/VAGAS_EMERGENCIAIS -= 1
 * porque a aba legada RESERVAS_ODONTOLOGIA não possuía VAGAS_RESTANTES.
 *
 * Este módulo NÃO altera valores existentes e NÃO recria nenhuma aba.
 * Apenas acrescenta cabeçalhos obrigatórios ausentes antes da validação da tabela.
 */
var TACS_REPARO_SCHEMA_RESERVAS_ODONTOLOGIA_V1=Object.freeze({
  VERSAO:'1.1.0',
  MODULO:'RESERVAS_ODONTOLOGIA'
});

var tacsReparoSchemaReservasDoGetAnterior_=doGet;
doGet=function(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=String(p.action||'').trim().toLowerCase();
  if(action==='reparar_schema_reservas_odonto_v114'){
    var resultado;
    try{resultado=tacsReparoSchemaReservasOdontologiaV1Migrar_();}
    catch(erro){resultado={ok:false,message:erro&&erro.message?erro.message:String(erro)};}
    return agendasProfissionaisTerritoriaisV1ResponderJson_(resultado,p.callback);
  }
  return tacsReparoSchemaReservasDoGetAnterior_(e);
};

function tacsReparoSchemaReservasOdontologiaV1Migrar_(){
  var ss=agendasProfissionaisTerritoriaisV1Planilha_();
  var nome=TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS;
  var sheet=ss.getSheetByName(nome);
  if(!sheet)throw new Error('A aba RESERVAS_ODONTOLOGIA não foi encontrada.');
  var adicionadas=tacsReparoSchemaReservasOdontologiaV1Garantir_(ss,nome);
  var headers=sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getDisplayValues()[0];
  return{ok:true,versao:TACS_REPARO_SCHEMA_RESERVAS_ODONTOLOGIA_V1.VERSAO,adicionadas:adicionadas,headers:headers};
}

function tacsReparoSchemaReservasOdontologiaV1Garantir_(ss,nome){
  var sheet=ss&&ss.getSheetByName?ss.getSheetByName(nome):null;
  if(!sheet)return[];

  var lastColumn=Math.max(1,sheet.getLastColumn());
  var headers=sheet.getRange(1,1,1,lastColumn).getDisplayValues()[0].map(function(valor){
    return agendasProfissionaisTerritoriaisV1Normalizar_(valor);
  });
  var obrigatorios=TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS.slice().concat(['AREA_ID','ATUALIZADO_EM']);
  var faltantes=[];
  obrigatorios.forEach(function(header){
    var normal=agendasProfissionaisTerritoriaisV1Normalizar_(header);
    if(headers.indexOf(normal)===-1){
      faltantes.push(header);
      headers.push(normal);
    }
  });
  if(!faltantes.length)return[];

  var inicio=sheet.getLastColumn()+1;
  sheet.getRange(1,inicio,1,faltantes.length).setValues([faltantes]);
  SpreadsheetApp.flush();
  return faltantes;
}
