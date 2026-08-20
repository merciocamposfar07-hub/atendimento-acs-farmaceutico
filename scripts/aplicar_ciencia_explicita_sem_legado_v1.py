from pathlib import Path


def rep(path, old, new):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit('Trecho ausente em '+path+'\n'+old[:120])
    p.write_text(s.replace(old,new,1),encoding='utf-8')

p='apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs'
rep(p,
"  TIPOS:Object.freeze(['MENSAGEM_INDIVIDUAL','MENSAGEM_FAMILIA']),\n  MAX_EVENTOS:12\n});",
"  TIPOS:Object.freeze(['MENSAGEM_INDIVIDUAL','MENSAGEM_FAMILIA']),\n  MAX_EVENTOS:12,\n  HISTORY_SHEET:'TACS_MENSAGENS_CIENCIA_V1',\n  HISTORY_HEADERS:Object.freeze(['EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','TITULO','MENSAGEM','CRIADO_EM'])\n});")
rep(p,
"var comprovacaoMensagensV1PayloadAnterior_;",
"var comprovacaoMensagensV1PayloadAnterior_;\nvar comprovacaoMensagensV1PrepararAnterior_;")
rep(p,
"  if(typeof doGet==='function'){",
"  if(typeof notificacoesAreaV1PrepararComprovantes_==='function'){\n    comprovacaoMensagensV1PrepararAnterior_=notificacoesAreaV1PrepararComprovantes_;\n    notificacoesAreaV1PrepararComprovantes_=function(contexto,input,alvos){\n      var preparados=comprovacaoMensagensV1PrepararAnterior_(contexto,input,alvos);\n      var tipo=comprovacaoMensagensV1Texto_(input&&input.tipo).toUpperCase();\n      if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)!==-1)comprovacaoMensagensV1RegistrarEvento_(contexto,input);\n      return preparados;\n    };\n  }\n  if(typeof doGet==='function'){")
anchor="function comprovacaoMensagensV1TratarGet_(e){"
insert="""function comprovacaoMensagensV1GarantirHistorico_(ss){
  var sheet=ss.getSheetByName(TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_SHEET);
  if(!sheet){sheet=ss.insertSheet(TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_SHEET);sheet.getRange(1,1,1,TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_HEADERS.length).setValues([TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_HEADERS]);sheet.setFrozenRows(1);}
  return sheet;
}

function comprovacaoMensagensV1RegistrarEvento_(contexto,input){
  var evento=comprovacaoMensagensV1Texto_(input&&input.evento),tipo=comprovacaoMensagensV1Texto_(input&&input.tipo).toUpperCase();
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(evento)||TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)===-1)throw new Error('A mensagem não pôde ser registrada para comprovação de ciência.');
  var ss=tacsTerritorioV1Planilha_(),sheet=comprovacaoMensagensV1GarantirHistorico_(ss),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O registro de ciência está ocupado. Tente enviar novamente em instantes.');
  try{
    if(sheet.getLastRow()>1){
      var ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues();
      for(var i=ids.length-1;i>=0;i--)if(comprovacaoMensagensV1Texto_(ids[i][0])===evento)return;
    }
    sheet.appendRow([evento,comprovacaoMensagensV1Texto_(contexto.areaId).toUpperCase(),tipo,comprovacaoMensagensV1Texto_(input.referencia),comprovacaoMensagensV1Texto_(input.titulo).slice(0,220),comprovacaoMensagensV1Texto_(input.mensagem).slice(0,900),new Date()]);
    sheet.getRange(sheet.getLastRow(),7).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }finally{lock.releaseLock();}
}

"""
rep(p,anchor,insert+anchor)
old="""function comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino){
  var ss=tacsTerritorioV1Planilha_();
  var audit=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  var rec=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  var open=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  var eventos=[];
  if(audit&&audit.getLastRow()>1){
    var ar=audit.getRange(2,1,audit.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues();
    for(var i=ar.length-1;i>=0&&eventos.length<TACS_COMPROVACAO_MENSAGENS_V1.MAX_EVENTOS;i--){
      var row=ar[i];
      if(comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId)continue;
      if(comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo)continue;
      if(comprovacaoMensagensV1Texto_(row[3])!==referencia)continue;
      eventos.push({eventoId:comprovacaoMensagensV1Texto_(row[0]),titulo:comprovacaoMensagensV1Texto_(row[4]),registradoEm:comprovacaoMensagensV1Texto_(row[9])});
    }
  }
  if(!eventos.length)return {ok:true,encontrado:false,destino:destino,historico:[],message:'Ainda não existe mensagem enviada para este destino.'};
"""
new="""function comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino){
  var ss=tacsTerritorioV1Planilha_();
  var history=ss.getSheetByName(TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_SHEET);
  var rec=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  var open=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  var eventos=[];
  if(history&&history.getLastRow()>1){
    var hr=history.getRange(2,1,history.getLastRow()-1,TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_HEADERS.length).getDisplayValues();
    for(var i=hr.length-1;i>=0&&eventos.length<TACS_COMPROVACAO_MENSAGENS_V1.MAX_EVENTOS;i--){
      var row=hr[i];
      if(comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId)continue;
      if(comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo)continue;
      if(comprovacaoMensagensV1Texto_(row[3])!==referencia)continue;
      eventos.push({eventoId:comprovacaoMensagensV1Texto_(row[0]),titulo:comprovacaoMensagensV1Texto_(row[4]),mensagem:comprovacaoMensagensV1Texto_(row[5]),registradoEm:comprovacaoMensagensV1Texto_(row[6])});
    }
  }
  if(!eventos.length)return {ok:true,encontrado:false,destino:destino,historico:[],message:'Ainda não existe mensagem com comprovação explícita enviada para este destino.'};
"""
rep(p,old,new)

p='teste-v1/mensagem-relatorio-entrega-v1.js'
rep(p,
".msg-rel-device{margin-top:9px;padding:10px;border:2px solid #d5e2e7;border-radius:13px;background:#f8fbfc}",
".msg-rel-message{margin-top:9px;padding:10px 12px;border:2px solid #d5e2e7;border-radius:13px;background:#f8fbfc;white-space:pre-wrap}.msg-rel-device{margin-top:9px;padding:10px;border:2px solid #d5e2e7;border-radius:13px;background:#f8fbfc}")
rep(p,
"card.innerHTML='<h3>'+esc(ev.titulo||'Mensagem do Portal TACS')+'</h3><small>'+esc(ev.registradoEm||'')+'</small><div class=\"msg-rel-badge\">'",
"card.innerHTML='<h3>'+esc(ev.titulo||'Mensagem do Portal TACS')+'</h3><small>'+esc(ev.registradoEm||'')+'</small><div class=\"msg-rel-message\">'+esc(ev.mensagem||'')+'</div><div class=\"msg-rel-badge\">'")

p='scripts/test_comprovacao_ciencia_mensagens_v1.js'
s=Path(p).read_text(encoding='utf-8')
needle="ok(backend.includes(\"estadoGeral='CIENCIA_TOTAL'\"),'estado de ciência total ausente');"
extra="""ok(backend.includes("HISTORY_SHEET:'TACS_MENSAGENS_CIENCIA_V1'"),'histórico explícito não isolado');
ok(backend.includes('comprovacaoMensagensV1RegistrarEvento_'),'registro do evento explícito ausente');
ok(!backend.includes('var audit=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET)'),'relatório ainda mistura eventos legados');
ok(report.includes('ev.mensagem'),'relatório não mostra o texto efetivamente enviado');"""
if needle not in s: raise SystemExit('âncora teste ausente')
Path(p).write_text(s.replace(needle,needle+'\n'+extra,1),encoding='utf-8')
print('CIENCIA_EXPLICITA_SEM_LEGADO_V1_OK')
