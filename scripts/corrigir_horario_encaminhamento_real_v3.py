from pathlib import Path

NOTIF = Path('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs')
MSG = Path('apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs')
REPORT = Path('apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs')


def bloco_funcao(texto, nome):
    inicio = texto.index('function ' + nome + '(')
    fim = texto.find('\nfunction ', inicio + 1)
    if fim < 0:
        fim = len(texto)
    return inicio, fim, texto[inicio:fim]


def substituir_no_bloco(texto, nome, antigo, novo):
    inicio, fim, bloco = bloco_funcao(texto, nome)
    if novo in bloco:
        return texto
    if antigo not in bloco:
        raise SystemExit('Ponto cirúrgico não localizado em ' + nome)
    bloco = bloco.replace(antigo, novo, 1)
    return texto[:inicio] + bloco + texto[fim:]


def main():
    n = NOTIF.read_text()

    full_row_item = "      sheet.getRange(item.row,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([linha]);"
    apply_cells = """      if(linha[4])sheet.getRange(item.row,5).setValues([[linha[4]]]);
      sheet.getRange(item.row,12).setValues([[linha[11]]]);
      if(linha[13]&&!sheet.getRange(item.row,14).getValues()[0][0])sheet.getRange(item.row,14).setValues([[linha[13]]]).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sheet.getRange(item.row,18).setValues([[linha[17]||'']]);"""
    n = substituir_no_bloco(n, 'notificacoesAreaV1AplicarRespostasEnvio_', full_row_item, apply_cells)

    fail_cells = """      sheet.getRange(item.row,12).setValues([[linha[11]]]);
      sheet.getRange(item.row,18).setValues([[linha[17]||'']]);"""
    n = substituir_no_bloco(n, 'notificacoesAreaV1MarcarFalhaLote_', full_row_item, fail_cells)

    full_row_confirm = "      sheet.getRange(i+2,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([row]);"
    confirm_cells = """      if(notificationId&&!idRegistrado)sheet.getRange(i+2,5).setValues([[row[4]]]);
      sheet.getRange(i+2,12).setValues([[row[11]]]);
      if(estado==='CONFIRMADO'){
        if(!duplicada)sheet.getRange(i+2,16).setValues([[row[15]]]).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        sheet.getRange(i+2,17).setValues([[row[16]||'']]);
        sheet.getRange(i+2,18).setValues([[row[17]||'']]);
      }else if(!duplicada){
        sheet.getRange(i+2,15).setValues([[row[14]]]).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        if(row[11]!=='CONFIRMADO'){
          sheet.getRange(i+2,17).setValues([[row[16]||'']]);
          sheet.getRange(i+2,18).setValues([[row[17]||'']]);
        }
      }"""
    n = substituir_no_bloco(n, 'notificacoesAreaV1RegistrarComprovacao_', full_row_confirm, confirm_cells)
    NOTIF.write_text(n)

    m = MSG.read_text()
    audit_status = """  if(encaminhadas&&typeof notificacoesAreaV1AuditoriaPorEvento_==='function'){
    try{
      var auditoriaEnvio=notificacoesAreaV1AuditoriaPorEvento_(contexto.areaId,evento);
      if(auditoriaEnvio&&auditoriaEnvio.registradoEm)ultimoEnc=mensagemIndividualV1Texto_(auditoriaEnvio.registradoEm);
    }catch(erroAuditoriaEnvio){}
  }
"""
    if 'var auditoriaEnvio=notificacoesAreaV1AuditoriaPorEvento_' not in m:
        anchor = "  if(open&&open.getLastRow()>1){"
        if anchor not in m:
            raise SystemExit('Âncora do status individual não localizada')
        m = m.replace(anchor, audit_status + anchor, 1)
    MSG.write_text(m)

    r = REPORT.read_text()
    audit_report = """    var auditoriaEnvio=typeof notificacoesAreaV1AuditoriaPorEvento_==='function'?notificacoesAreaV1AuditoriaPorEvento_(contexto.areaId,ev.eventoId):null;
    var encaminhadoAuditoria=comprovacaoMensagensV1Texto_(auditoriaEnvio&&auditoriaEnvio.registradoEm)||comprovacaoMensagensV1Texto_(ev.registradoEm);
"""
    if 'var encaminhadoAuditoria=' not in r:
        anchor = "    var vistos={},aparelhos=[],cont={destinados:0,encaminhados:0,exibidos:0,abertos:0,cientes:0,falhas:0};\n"
        if anchor not in r:
            raise SystemExit('Âncora do relatório persistente não localizada')
        r = r.replace(anchor, anchor + audit_report, 1)
    old = "encaminhadoEm:enc,exibidoEm:exib,abertoEm:abr,cienteEm:cie,"
    new = "encaminhadoEm:enc?(encaminhadoAuditoria||enc):'',exibidoEm:exib,abertoEm:abr,cienteEm:cie,"
    if new not in r:
        if old not in r:
            raise SystemExit('Campo de horário do relatório não localizado')
        r = r.replace(old, new, 1)
    REPORT.write_text(r)

    n = NOTIF.read_text()
    m = MSG.read_text()
    r = REPORT.read_text()
    for fn in ['notificacoesAreaV1AplicarRespostasEnvio_', 'notificacoesAreaV1MarcarFalhaLote_']:
        _, _, b = bloco_funcao(n, fn)
        if 'RECEIPT_HEADERS.length).setValues([linha])' in b:
            raise SystemExit(fn + ' ainda regrava a linha inteira')
    _, _, b = bloco_funcao(n, 'notificacoesAreaV1RegistrarComprovacao_')
    if 'RECEIPT_HEADERS.length).setValues([row])' in b:
        raise SystemExit('RegistrarComprovacao ainda regrava a linha inteira')
    if "notificacoesAreaV1AuditoriaPorEvento_(contexto.areaId,evento)" not in m:
        raise SystemExit('Status individual sem horário auditado')
    if "encaminhadoEm:enc?(encaminhadoAuditoria||enc):''" not in r:
        raise SystemExit('Relatório persistente sem horário auditado')

    print('Correção do horário de encaminhamento aplicada e validada estruturalmente.')


if __name__ == '__main__':
    main()
