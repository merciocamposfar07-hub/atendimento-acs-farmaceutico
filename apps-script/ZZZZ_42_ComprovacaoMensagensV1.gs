/**
 * Portal TACS — comprovação de ciência e relatório de mensagens V1.0.0
 *
 * Escopo isolado:
 * - somente MENSAGEM_INDIVIDUAL e MENSAGEM_FAMILIA;
 * - preserva recados/campanhas e o emissor geral;
 * - abertura não é tratada como ciência;
 * - ciência exige ação explícita "Li e estou ciente";
 * - cria relatório administrativo persistente por morador ou família.
 */
var TACS_COMPROVACAO_MENSAGENS_V1 = Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_comprovacao_mensagens_v1_result_',
  RESULT_SECONDS:300,
  CIENCIA_PAGE:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/confirmar-ciencia.html',
  TIPOS:Object.freeze(['MENSAGEM_INDIVIDUAL','MENSAGEM_FAMILIA']),
  MAX_EVENTOS:12,
  HISTORY_SHEET:'TACS_MENSAGENS_CIENCIA_V1',
  HISTORY_HEADERS:Object.freeze(['EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','TITULO','MENSAGEM','CRIADO_EM'])
});

var comprovacaoMensagensV1DoGetAnterior_;
var comprovacaoMensagensV1DoPostAnterior_;
var comprovacaoMensagensV1PayloadAnterior_;
var comprovacaoMensagensV1PrepararAnterior_;

(function instalarComprovacaoMensagensV1_(){
  if(typeof notificacoesAreaV1PayloadIndividual_==='function'){
    comprovacaoMensagensV1PayloadAnterior_=notificacoesAreaV1PayloadIndividual_;
    notificacoesAreaV1PayloadIndividual_=function(appId,contexto,input,item){
      var tipo=comprovacaoMensagensV1Texto_(input&&input.tipo).toUpperCase();
      if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)===-1){
        return comprovacaoMensagensV1PayloadAnterior_(appId,contexto,input,item);
      }
      return comprovacaoMensagensV1Payload_(appId,contexto,input,item);
    };
  }
  if(typeof notificacoesAreaV1PrepararComprovantes_==='function'){
    comprovacaoMensagensV1PrepararAnterior_=notificacoesAreaV1PrepararComprovantes_;
    notificacoesAreaV1PrepararComprovantes_=function(contexto,input,alvos){
      var preparados=comprovacaoMensagensV1PrepararAnterior_(contexto,input,alvos);
      var tipo=comprovacaoMensagensV1Texto_(input&&input.tipo).toUpperCase();
      if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)!==-1)comprovacaoMensagensV1RegistrarEvento_(contexto,input);
      return preparados;
    };
  }
  if(typeof doGet==='function'){
    comprovacaoMensagensV1DoGetAnterior_=doGet;
    doGet=function(e){var r=comprovacaoMensagensV1TratarGet_(e);return r||comprovacaoMensagensV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    comprovacaoMensagensV1DoPostAnterior_=doPost;
    doPost=function(e){var r=comprovacaoMensagensV1TratarPost_(e);return r||comprovacaoMensagensV1DoPostAnterior_(e);};
  }
})();

function comprovacaoMensagensV1Payload_(appId,contexto,input,item){
  var pagina=TACS_COMPROVACAO_MENSAGENS_V1.CIENCIA_PAGE+'?t='+encodeURIComponent(item.token);
  var mensagem=comprovacaoMensagensV1Texto_(input.mensagem).slice(0,820)+'\n\nAbra o aviso e confirme: Li e estou ciente.';
  return {
    app_id:appId,
    target_channel:'push',
    headings:{pt:input.titulo,en:input.titulo},
    contents:{pt:mensagem,en:mensagem},
    include_subscription_ids:[item.alvo.subscriptionId],
    url:pagina,
    web_buttons:[{
      id:TACS_NOTIFICACOES_AREA_V1.CONFIRM_ACTION,
      text:'Li e estou ciente',
      url:'_osp=do_not_open'
    }],
    data:{
      areaId:contexto.areaId,
      tipo:input.tipo,
      referenciaId:input.referencia,
      evento:input.evento,
      confirmacaoToken:item.token,
      comprovacao:'CIENCIA_EXPLICITA_V1'
    }
  };
}

function comprovacaoMensagensV1GarantirHistorico_(ss){
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

function comprovacaoMensagensV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=comprovacaoMensagensV1Texto_(p.action).toLowerCase();
  if(['admin_mensagem_comprovante_result','publico_mensagem_comprovante_result'].indexOf(action)===-1)return null;
  var requestId=comprovacaoMensagensV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return comprovacaoMensagensV1ResponderJson_({ok:false,message:'Identificador de consulta inválido.'},p.callback);
  var resultado=comprovacaoMensagensV1LerResultado_(requestId);
  return comprovacaoMensagensV1ResponderJson_(resultado?{ok:true,pendente:false,requestId:requestId,result:resultado}:{ok:true,pendente:true,requestId:requestId},p.callback);
}

function comprovacaoMensagensV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=comprovacaoMensagensV1Texto_(p.action).toLowerCase();
  if(['publico_mensagem_aberta_token','publico_mensagem_ciente_token','admin_mensagem_relatorio'].indexOf(action)===-1)return null;
  var requestId=comprovacaoMensagensV1Texto_(p.requestId),resultado;
  try{
    requestId=comprovacaoMensagensV1ValidarRequestId_(requestId);
    if(action==='publico_mensagem_aberta_token')resultado=comprovacaoMensagensV1RegistrarAberturaToken_(p);
    else if(action==='publico_mensagem_ciente_token')resultado=comprovacaoMensagensV1RegistrarCienciaToken_(p);
    else{
      if(typeof mensagemIndividualV1Contexto_!=='function')throw new Error('A camada administrativa de mensagens ainda não está disponível.');
      var sessao=mensagemIndividualV1Contexto_(p,false);
      resultado=comprovacaoMensagensV1Relatorio_(p,sessao.contexto);
    }
  }catch(erro){resultado={ok:false,message:comprovacaoMensagensV1Erro_(erro)};}
  comprovacaoMensagensV1GuardarResultado_(requestId,resultado);
  return comprovacaoMensagensV1ResponderPost_(requestId,resultado);
}

function comprovacaoMensagensV1ComprovanteToken_(token){
  token=comprovacaoMensagensV1Texto_(token).toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(token))throw new Error('O comprovante desta mensagem é inválido.');
  if(typeof notificacoesAreaV1HashToken_!=='function')throw new Error('O serviço de comprovantes ainda não está disponível.');
  var hash=notificacoesAreaV1HashToken_(token),ss=tacsTerritorioV1Planilha_();
  var sheet=notificacoesAreaV1GarantirComprovantes_(ss);
  if(sheet.getLastRow()<=1)throw new Error('O comprovante desta mensagem não foi localizado.');
  var values=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getValues();
  for(var i=values.length-1;i>=0;i--){
    var row=values[i];
    if(comprovacaoMensagensV1Texto_(row[7]).toLowerCase()!==hash)continue;
    var tipo=comprovacaoMensagensV1Texto_(row[2]).toUpperCase();
    if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)===-1)throw new Error('Este comprovante não pertence a uma mensagem individual ou familiar.');
    return {
      row:row,
      token:token,
      eventoId:comprovacaoMensagensV1Texto_(row[0]),
      areaId:comprovacaoMensagensV1Texto_(row[1]).toUpperCase(),
      tipo:tipo,
      referenciaId:comprovacaoMensagensV1Texto_(row[3]),
      onesignalId:comprovacaoMensagensV1Texto_(row[4]),
      subscriptionId:comprovacaoMensagensV1Texto_(row[5]).toLowerCase()
    };
  }
  throw new Error('O comprovante desta mensagem não foi localizado.');
}

function comprovacaoMensagensV1RegistrarAberturaToken_(p){
  var c=comprovacaoMensagensV1ComprovanteToken_(p.token||p.confirmacaoToken);
  var auditoria={eventoId:c.eventoId,areaId:c.areaId,tipo:c.tipo,referenciaId:c.referenciaId,onesignalId:c.onesignalId};
  var r=notificacoesAreaV1RegistrarAbertura_(c.areaId,auditoria,c.subscriptionId);
  return {ok:true,aberta:Boolean(r&&r.registrada),duplicada:Boolean(r&&r.duplicada),eventoId:c.eventoId,tipo:c.tipo};
}

function comprovacaoMensagensV1RegistrarCienciaToken_(p){
  var c=comprovacaoMensagensV1ComprovanteToken_(p.token||p.confirmacaoToken);
  var r=notificacoesAreaV1RegistrarComprovacao_(c.token,'','CONFIRMADO','BOTAO_CIENCIA_MENSAGEM');
  return {ok:true,ciente:true,duplicada:Boolean(r&&r.duplicada),eventoId:c.eventoId,tipo:c.tipo,confirmadoEm:r&&r.confirmadoEm?r.confirmadoEm:''};
}

function comprovacaoMensagensV1Relatorio_(p,contexto){
  var escopo=comprovacaoMensagensV1Texto_(p.escopo).toUpperCase(),tipo,referencia,destino;
  if(escopo==='INDIVIDUAL'){
    var morador=mensagemIndividualV1ResolverMorador_(p,contexto);
    tipo='MENSAGEM_INDIVIDUAL';referencia=morador.referencia;
    destino={escopo:'INDIVIDUAL',nome:morador.item.nome,familiaId:morador.familiaId,referencia:referencia};
  }else if(escopo==='FAMILIA'){
    if(typeof buscaEnvioFamiliaV1NormalizarFamilia_!=='function'||typeof buscaEnvioFamiliaV1BuscarExata_!=='function')throw new Error('A busca familiar ainda não está disponível.');
    var familia=buscaEnvioFamiliaV1NormalizarFamilia_(p.familiaId||p.familia||'');
    if(!familia)throw new Error('Número do cadastro familiar inválido.');
    var membros=buscaEnvioFamiliaV1BuscarExata_(familia,contexto).resultados||[];
    if(!membros.length)throw new Error('Nenhum morador desta família foi localizado na área atual.');
    tipo='MENSAGEM_FAMILIA';referencia='FAMILIA_'+familia;
    destino={escopo:'FAMILIA',familiaId:familia,moradores:membros.length,referencia:referencia};
  }else throw new Error('Informe se o relatório é individual ou familiar.');
  return comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino);
}

function comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino){
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

  var recRows=rec&&rec.getLastRow()>1?rec.getRange(2,1,rec.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues():[];
  var openRows=open&&open.getLastRow()>1?open.getRange(2,1,open.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues():[];
  var abertura={};
  openRows.forEach(function(row){
    if(comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId||comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo||comprovacaoMensagensV1Texto_(row[3])!==referencia)return;
    var key=comprovacaoMensagensV1Texto_(row[0])+'|'+comprovacaoMensagensV1Texto_(row[5]).toLowerCase();
    if(!abertura[key])abertura[key]=comprovacaoMensagensV1Texto_(row[7]);
  });

  eventos.forEach(function(ev){
    var vistos={},aparelhos=[],cont={destinados:0,encaminhados:0,exibidos:0,abertos:0,cientes:0,falhas:0};
    var auditoriaEnvio=typeof notificacoesAreaV1AuditoriaPorEvento_==='function'?notificacoesAreaV1AuditoriaPorEvento_(contexto.areaId,ev.eventoId):null;
    var encaminhadoAuditoria=comprovacaoMensagensV1Texto_(auditoriaEnvio&&auditoriaEnvio.registradoEm)||comprovacaoMensagensV1Texto_(ev.registradoEm);
    recRows.forEach(function(row){
      if(comprovacaoMensagensV1Texto_(row[0])!==ev.eventoId||comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId||comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo||comprovacaoMensagensV1Texto_(row[3])!==referencia)return;
      var sub=comprovacaoMensagensV1Texto_(row[5]).toLowerCase();if(!sub||vistos[sub])return;vistos[sub]=true;
      var estado=comprovacaoMensagensV1Texto_(row[11]).toUpperCase(),enc=comprovacaoMensagensV1Texto_(row[13]),exib=comprovacaoMensagensV1Texto_(row[14]),cie=comprovacaoMensagensV1Texto_(row[15]);
      var abr=abertura[ev.eventoId+'|'+sub]||'';
      cont.destinados++;if(enc)cont.encaminhados++;if(exib)cont.exibidos++;if(abr)cont.abertos++;if(cie)cont.cientes++;if(estado==='FALHA_ENVIO')cont.falhas++;
      aparelhos.push({
        referenciaTecnica:sub.slice(-8),tipoAparelho:comprovacaoMensagensV1Texto_(row[8])||'Aparelho',
        navegador:comprovacaoMensagensV1Texto_(row[9]),sistema:comprovacaoMensagensV1Texto_(row[10]),estado:estado,
        encaminhadoEm:enc?(encaminhadoAuditoria||enc):'',exibidoEm:exib,abertoEm:abr,cienteEm:cie,
        origem:comprovacaoMensagensV1Texto_(row[16]),detalhe:comprovacaoMensagensV1Texto_(row[17])
      });
    });
    var estadoGeral='AGUARDANDO';
    if(cont.destinados&&cont.cientes===cont.destinados)estadoGeral='CIENCIA_TOTAL';
    else if(cont.cientes)estadoGeral='CIENCIA_PARCIAL';
    else if(cont.abertos)estadoGeral='ABERTA';
    else if(cont.exibidos)estadoGeral='EXIBIDA';
    else if(cont.encaminhados)estadoGeral='ENCAMINHADA';
    else if(cont.falhas)estadoGeral='FALHA';
    ev.estado=estadoGeral;ev.resumo=cont;ev.aparelhos=aparelhos;
  });
  return {
    ok:true,encontrado:true,destino:destino,historico:eventos,
    message:'Abertura e ciência são estados distintos. “Ciente” só aparece após confirmação explícita no aparelho.',
    observacao:destino.escopo==='INDIVIDUAL'
      ?'Em aparelho familiar compartilhado, a confirmação comprova ciência naquele aparelho para a mensagem destinada ao morador; não identifica biologicamente quem tocou.'
      :'O relatório familiar comprova o que ocorreu em cada aparelho vinculado à família, não uma confirmação individual de cada morador.'
  };
}

function comprovacaoMensagensV1ValidarRequestId_(v){var s=comprovacaoMensagensV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(s))throw new Error('Identificador da operação inválido.');return s;}
function comprovacaoMensagensV1GuardarResultado_(id,r){try{if(/^[A-Za-z0-9_-]{8,160}$/.test(id))CacheService.getScriptCache().put(TACS_COMPROVACAO_MENSAGENS_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_COMPROVACAO_MENSAGENS_V1.RESULT_SECONDS);}catch(e){}}
function comprovacaoMensagensV1LerResultado_(id){try{var s=CacheService.getScriptCache().get(TACS_COMPROVACAO_MENSAGENS_V1.RESULT_PREFIX+id);return s?JSON.parse(s):null;}catch(e){return null;}}
function comprovacaoMensagensV1ResponderPost_(requestId,resultado){var msg={source:'comprovacao-mensagens-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function comprovacaoMensagensV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=comprovacaoMensagensV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function comprovacaoMensagensV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function comprovacaoMensagensV1Erro_(e){return comprovacaoMensagensV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,500);}
