from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

text = text.replace("VERSAO:'2.2.0'", "VERSAO:'2.3.0'", 1)

helper = r'''
function correcaoDataOdontologiaV1GarantirSchemaReservas_(ss){
  var nome=TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS;
  var sheet=ss.getSheetByName(nome);
  if(!sheet)return;
  var headers=sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getDisplayValues()[0].map(function(valor){
    return agendasProfissionaisTerritoriaisV1Normalizar_(valor);
  });
  var obrigatorios=TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS.slice().concat(['AREA_ID','ATUALIZADO_EM']);
  var faltantes=[];
  obrigatorios.forEach(function(header){
    var normal=agendasProfissionaisTerritoriaisV1Normalizar_(header);
    if(headers.indexOf(normal)===-1){faltantes.push(header);headers.push(normal);}
  });
  if(!faltantes.length)return;
  sheet.getRange(1,sheet.getLastColumn()+1,1,faltantes.length).setValues([faltantes]);
  SpreadsheetApp.flush();
}

'''
marker = 'function correcaoDataOdontologiaV1StatusReserva_(p){'
if 'function correcaoDataOdontologiaV1GarantirSchemaReservas_(ss)' not in text:
    if marker not in text:
        raise SystemExit('Ponto de inserção do reparo não encontrado')
    text = text.replace(marker, helper + marker, 1)

old_status = "  var reservas=agendasProfissionaisTerritoriaisV1Tabela_(agendasProfissionaisTerritoriaisV1Planilha_(),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);"
new_status = "  var ss=agendasProfissionaisTerritoriaisV1Planilha_();\n  correcaoDataOdontologiaV1GarantirSchemaReservas_(ss);\n  var reservas=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);"
if old_status in text:
    text = text.replace(old_status, new_status, 1)
elif new_status not in text:
    raise SystemExit('Trecho de status da reserva não encontrado')

old_reserve = "    var ss=agendasProfissionaisTerritoriaisV1Planilha_();\n    var reservas=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);"
new_reserve = "    var ss=agendasProfissionaisTerritoriaisV1Planilha_();\n    correcaoDataOdontologiaV1GarantirSchemaReservas_(ss);\n    var reservas=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);"
if old_reserve in text:
    text = text.replace(old_reserve, new_reserve, 1)
elif new_reserve not in text:
    raise SystemExit('Trecho de reserva não encontrado')

required = [
    "VERSAO:'2.3.0'",
    'function correcaoDataOdontologiaV1GarantirSchemaReservas_(ss)',
    'correcaoDataOdontologiaV1GarantirSchemaReservas_(ss);',
    'var restantes=disponiveis-1;',
    'setValue(restantes)',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f'Contrato ausente após patch: {needle}')

path.write_text(text)
print('PATCH_ODONTOLOGIA_SCHEMA_V115_OK')
