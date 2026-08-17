/*
 * ZZZZ_37_ReparoSchemaReservasOdontologiaV1.gs
 * Portal TACS — reparo estritamente aditivo da aba RESERVAS_ODONTOLOGIA V1.0.0
 *
 * Problema confirmado em produção em 17/08/2026:
 * a rota de reserva abortava antes de VAGAS_COMUNS/VAGAS_EMERGENCIAIS -= 1
 * porque a aba legada RESERVAS_ODONTOLOGIA não possuía VAGAS_RESTANTES.
 *
 * Este módulo NÃO altera valores existentes e NÃO recria nenhuma aba.
 * Apenas acrescenta cabeçalhos obrigatórios ausentes antes da validação da tabela.
 */
var TACS_REPARO_SCHEMA_RESERVAS_ODONTOLOGIA_V1=Object.freeze({
  VERSAO:'1.0.0',
  MODULO:'RESERVAS_ODONTOLOGIA'
});

var tacsReparoSchemaReservasTabelaAnterior_=agendasProfissionaisTerritoriaisV1Tabela_;
agendasProfissionaisTerritoriaisV1Tabela_=function(ss,nome,obrigatorios,criar){
  if(nome===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS){
    tacsReparoSchemaReservasOdontologiaV1Garantir_(ss,nome);
  }
  return tacsReparoSchemaReservasTabelaAnterior_(ss,nome,obrigatorios,criar);
};

function tacsReparoSchemaReservasOdontologiaV1Garantir_(ss,nome){
  var sheet=ss&&ss.getSheetByName?ss.getSheetByName(nome):null;
  if(!sheet)return;

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
  if(!faltantes.length)return;

  var inicio=sheet.getLastColumn()+1;
  sheet.getRange(1,inicio,1,faltantes.length).setValues([faltantes]);
  SpreadsheetApp.flush();
}
