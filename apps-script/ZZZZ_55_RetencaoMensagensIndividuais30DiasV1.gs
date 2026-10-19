/**
 * Portal CSC — retenção de mensagens particulares (30 dias corridos).
 * Escopo: somente registros TIPO=MENSAGEM_INDIVIDUAL em quatro tabelas.
 * Não exclui Recados, Campanhas, Mensagens Familiares ou dados cadastrais.
 * A execução é paginada, invocada pelo relatório individual autenticado.
 */
var TACS_MENSAGEM_INDIVIDUAL_RETENCAO_V1=Object.freeze({
  DIAS:30,
  LIMITE_LINHAS:220,
  COOLDOWN_SEGUNDOS:21600,
  CHAVE_COOLDOWN:'csc_individual_retencao_30dias_ultima_v1'
});
function mensagemIndividualRetencaoV1Instante_(valor,eventoId){
  var id=String(eventoId||'').match(/^msgv1_enviar_(\d{13})_[A-Za-z0-9]+$/);
  if(id){var tempoId=Number(id[1]);if(isFinite(tempoId)&&tempoId>1500000000000)return tempoId;}
  if(Object.prototype.toString.call(valor)==='[object Date]'){
    var n=valor.getTime();return isFinite(n)?n:NaN;
  }
  var texto=String(valor==null?'':valor).trim(),m=texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m){
    var iso=m[3]+'-'+m[2]+'-'+m[1]+'T'+(m[4]||'00')+':'+(m[5]||'00')+':'+(m[6]||'00')+'-03:00';
    var data=Date.parse(iso);return isFinite(data)?data:NaN;
  }
  var n2=Date.parse(texto);return isFinite(n2)?n2:NaN;
}
function mensagemIndividualRetencaoV1Vigente_(valor,eventoId){
  var ms=mensagemIndividualRetencaoV1Instante_(valor,eventoId);
  /* Sem data verificável, não arriscar apagar documento do morador. */
  return !isFinite(ms)||ms>Date.now()-TACS_MENSAGEM_INDIVIDUAL_RETENCAO_V1.DIAS*86400000;
}
function mensagemIndividualRetencaoV1Limpar_(forcar){
  var cfg=TACS_MENSAGEM_INDIVIDUAL_RETENCAO_V1,scriptCache=CacheService.getScriptCache();
  if(!forcar&&scriptCache.get(cfg.CHAVE_COOLDOWN)==='1')return {ok:true,executou:false};
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(3000))return {ok:true,executou:false,bloqueio:true};
  try{
    var ss=tacsTerritorioV1Planilha_(),cutoff=Date.now()-cfg.DIAS*86400000;
    var oldEvents={},removed={},remaining=cfg.LIMITE_LINHAS;
    var tables=[
      {key:'historico',name:TACS_COMPROVACAO_MENSAGENS_V1.HISTORY_SHEET,typeIndex:2,dateIndex:6},
      {key:'comprovantes',name:TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET,typeIndex:2,dateIndex:12},
      {key:'aberturas',name:TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET,typeIndex:2,dateIndex:7},
      {key:'auditoria',name:TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET,typeIndex:2,dateIndex:9}
    ];
    /* Descobrir os eventos vencidos antes de excluir qualquer linha. */
    tables.forEach(function(t){
      var sh=ss.getSheetByName(t.name);
      if(!sh||sh.getLastRow()<=1)return;
      var rows=sh.getRange(2,1,sh.getLastRow()-1,Math.max(t.typeIndex,t.dateIndex)+1).getValues();
      rows.forEach(function(row){
        if(String(row[t.typeIndex]||'').toUpperCase()!=='MENSAGEM_INDIVIDUAL')return;
        var evento=String(row[0]||''),ms=mensagemIndividualRetencaoV1Instante_(row[t.dateIndex],evento);
        if(isFinite(ms)&&ms<=cutoff&&evento)oldEvents[evento]=true;
      });
    });
    tables.forEach(function(t){
      if(remaining<=0)return;
      var sh=ss.getSheetByName(t.name),deleted=0;
      if(!sh||sh.getLastRow()<=1){removed[t.key]=0;return;}
      var rows=sh.getRange(2,1,sh.getLastRow()-1,Math.max(t.typeIndex,t.dateIndex)+1).getValues();
      var remove=[];
      rows.forEach(function(row,i){
        if(String(row[t.typeIndex]||'').toUpperCase()!=='MENSAGEM_INDIVIDUAL')return;
        var evento=String(row[0]||''),ms=mensagemIndividualRetencaoV1Instante_(row[t.dateIndex],evento);
        if((oldEvents[evento]||(isFinite(ms)&&ms<=cutoff))&&remove.length<remaining)remove.push(i+2);
      });
      /* Excluir em ordem decrescente evita deslocar os números das linhas. */
      for(var n=remove.length-1;n>=0;n--){sh.deleteRow(remove[n]);deleted++;}
      remaining-=deleted;removed[t.key]=deleted;
    });
    var hasMore=remaining===0;
    if(!hasMore)scriptCache.put(cfg.CHAVE_COOLDOWN,'1',cfg.COOLDOWN_SEGUNDOS);
    return {ok:true,executou:true,excluidos:removed,continuar:hasMore};
  }finally{lock.releaseLock();}
}