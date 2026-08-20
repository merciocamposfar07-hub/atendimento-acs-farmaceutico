/**
 * Portal TACS — Busca familiar exata e mensagem geral da família V1.0.0
 *
 * Camada isolada:
 * - uma consulta em formato de cadastro familiar (ex.: 012) deixa de ser
 *   busca textual e passa a varrer a fonte oficial comparando o código da
 *   família extraído do ENDERECO;
 * - buscas por nome, CPF, CNS e demais textos continuam na rotina original;
 * - permite um único envio Push para todos os aparelhos ativos vinculados
 *   à família, sem duplicar o envio por morador.
 */
var TACS_BUSCA_ENVIO_FAMILIA_V1 = Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_mensagem_familia_v1_result_',
  RESULT_SECONDS:300
});

var buscaEnvioFamiliaV1BuscarAnterior_;
var buscaEnvioFamiliaV1DoGetAnterior_;
var buscaEnvioFamiliaV1DoPostAnterior_;

(function instalarBuscaEnvioFamiliaV1_(){
  if(typeof moradoresAdminV1Buscar_==='function'){
    buscaEnvioFamiliaV1BuscarAnterior_=moradoresAdminV1Buscar_;
    moradoresAdminV1Buscar_=function(busca,contexto){
      var familia=buscaEnvioFamiliaV1ConsultaFamilia_(busca);
      if(!familia)return buscaEnvioFamiliaV1BuscarAnterior_(busca,contexto);
      return buscaEnvioFamiliaV1BuscarExata_(familia,contexto);
    };
  }
  if(typeof doGet==='function'){
    buscaEnvioFamiliaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var r=buscaEnvioFamiliaV1TratarGet_(e);
      return r||buscaEnvioFamiliaV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    buscaEnvioFamiliaV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=buscaEnvioFamiliaV1TratarPost_(e);
      return r||buscaEnvioFamiliaV1DoPostAnterior_(e);
    };
  }
})();

function buscaEnvioFamiliaV1ConsultaFamilia_(valor){
  var s=String(valor==null?'':valor).replace(/\s+/g,'').toUpperCase();
  return /^\d{3}[A-Z]?$/.test(s)?s:'';
}

function buscaEnvioFamiliaV1NormalizarFamilia_(valor){
  var s=String(valor==null?'':valor).replace(/\s+/g,'').toUpperCase();
  var m=s.match(/^(\d{1,4})([A-Z])?$/);
  if(!m)return '';
  var numero=m[1];
  if(numero.length<=3)numero=('000'+numero).slice(-3);
  return numero+(m[2]||'');
}

function buscaEnvioFamiliaV1CodigoMorador_(morador){
  if(typeof vinculoFamiliarNotifV1CodigoEndereco_!=='function'){
    throw new Error('A identificação do cadastro familiar ainda não está disponível.');
  }
  return buscaEnvioFamiliaV1NormalizarFamilia_(
    vinculoFamiliarNotifV1CodigoEndereco_(morador&&morador.endereco||'')
  );
}

function buscaEnvioFamiliaV1BuscarExata_(familia,contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1){
    return {ok:true,resultados:[],total:0,limitado:false,areaId:contexto.areaId,familiaId:familia,buscaFamiliar:true};
  }
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues(),resultados=[];
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    var chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||metaMap.porChave[chave]||null;
    if(moradoresAdminV1EstaOculto_(morador,meta))continue;
    if(buscaEnvioFamiliaV1CodigoMorador_(morador)!==familia)continue;
    var item=moradoresAdminV1ComMeta_(morador,origem,meta,chave,contexto);
    item.familiaId=familia;
    resultados.push(item);
    if(resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS)break;
  }
  return {
    ok:true,
    resultados:resultados,
    total:resultados.length,
    limitado:resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS,
    areaId:contexto.areaId,
    familiaId:familia,
    buscaFamiliar:true
  };
}

function buscaEnvioFamiliaV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=String(p.action||'').trim().toLowerCase();
  if(action!=='admin_mensagem_familia_result')return null;
  var requestId=String(p.requestId||'').trim();
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    return buscaEnvioFamiliaV1ResponderJson_({ok:false,message:'Identificador de consulta inválido.'},p.callback);
  }
  var resultado=buscaEnvioFamiliaV1LerResultado_(requestId);
  return buscaEnvioFamiliaV1ResponderJson_(
    resultado
      ?{ok:true,pendente:false,requestId:requestId,result:resultado}
      :{ok:true,pendente:true,requestId:requestId},
    p.callback
  );
}

function buscaEnvioFamiliaV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=String(p.action||'').trim().toLowerCase();
  if(['admin_mensagem_familia_enviar','admin_mensagem_familia_status'].indexOf(action)===-1)return null;
  var requestId=String(p.requestId||'').trim(),resultado;
  try{
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))throw new Error('Identificador da operação inválido.');
    if(typeof mensagemIndividualV1Contexto_!=='function')throw new Error('A camada de mensagens individuais ainda não está disponível.');
    var sessao=mensagemIndividualV1Contexto_(p,action==='admin_mensagem_familia_enviar');
    var familia=buscaEnvioFamiliaV1NormalizarFamilia_(p.familiaId||p.familia||'');
    if(!familia)throw new Error('Número do cadastro familiar inválido.');
    var membros=buscaEnvioFamiliaV1BuscarExata_(familia,sessao.contexto).resultados;
    if(!membros.length)throw new Error('Nenhum morador deste cadastro familiar foi localizado na área atual.');
    if(action==='admin_mensagem_familia_enviar'){
      resultado=buscaEnvioFamiliaV1Enviar_(p,sessao.contexto,sessao.acesso,familia,membros,requestId);
    }else{
      resultado=buscaEnvioFamiliaV1Status_(p,sessao.contexto,familia,membros);
    }
  }catch(erro){
    resultado={ok:false,message:String(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))buscaEnvioFamiliaV1GuardarResultado_(requestId,resultado);
  return buscaEnvioFamiliaV1ResponderPost_(requestId,resultado);
}

function buscaEnvioFamiliaV1Alvos_(contexto,familia){
  if(typeof mensagemIndividualV1ConfigOneSignal_!=='function'||typeof mensagemIndividualV1MapaFamilias_!=='function'){
    throw new Error('O serviço de mensagens familiares ainda não está disponível.');
  }
  var cfg=mensagemIndividualV1ConfigOneSignal_();
  var todos=notificacoesAreaV1AlvosAtivos_(cfg.appId,cfg.apiKey,contexto,notificacoesAreaV1QuantidadeAreas_());
  var mapa=mensagemIndividualV1MapaFamilias_(tacsTerritorioV1Planilha_(),contexto.areaId);
  var vistos={},alvos=[];
  todos.forEach(function(alvo){
    var id=String(alvo&&alvo.subscriptionId||'').trim().toLowerCase();
    if(!id||vistos[id]||buscaEnvioFamiliaV1NormalizarFamilia_(mapa[id])!==familia)return;
    vistos[id]=true;
    alvos.push({
      subscriptionId:alvo.subscriptionId,
      idPortal:'FAMILIA_'+familia,
      tipoAparelho:alvo.tipoAparelho,
      navegador:alvo.navegador,
      sistema:alvo.sistema
    });
  });
  return {cfg:cfg,alvos:alvos};
}

function buscaEnvioFamiliaV1Enviar_(p,contexto,acesso,familia,membros,requestId){
  if(typeof portalManutencaoV1Estado_==='function'){
    var manutencao=portalManutencaoV1Estado_(contexto.areaId);
    if(manutencao&&manutencao.ativa){
      return {ok:true,enviado:false,maintenance:true,message:'O Portal está em manutenção. A mensagem para a família não foi enviada.'};
    }
  }
  var mensagem=String(p.mensagem||'').replace(/\s+/g,' ').trim().slice(0,700);
  if(mensagem.length<3)throw new Error('Digite a mensagem que será enviada à família.');
  var resolvido=buscaEnvioFamiliaV1Alvos_(contexto,familia),alvos=resolvido.alvos,cfg=resolvido.cfg;
  if(!alvos.length){
    return {
      ok:true,enviado:false,semAparelho:true,familiaId:familia,moradores:membros.length,
      message:'A família '+familia+' ainda não possui aparelho apto e vinculado para receber notificações.'
    };
  }
  var referencia='FAMILIA_'+familia;
  var input={
    titulo:'Portal TACS — Família '+familia,
    mensagem:mensagem,
    tipo:'MENSAGEM_FAMILIA',
    referencia:referencia,
    evento:requestId
  };
  var preparados=notificacoesAreaV1PrepararComprovantes_(contexto,input,alvos),respostas;
  try{
    respostas=UrlFetchApp.fetchAll(preparados.map(function(item){
      return {
        url:TACS_NOTIFICACOES_AREA_V1.ENDPOINT,
        method:'post',
        contentType:'application/json',
        payload:JSON.stringify(notificacoesAreaV1PayloadIndividual_(cfg.appId,contexto,input,item)),
        headers:{Authorization:'Key '+cfg.apiKey},
        muteHttpExceptions:true
      };
    }));
  }catch(erroRede){
    notificacoesAreaV1MarcarFalhaLote_(preparados,erroRede);
    throw new Error('A conexão com o serviço Push falhou antes de concluir o envio para a família.');
  }
  var resumo=notificacoesAreaV1AplicarRespostasEnvio_(preparados,respostas);
  notificacoesAreaV1Auditar_(
    contexto,acesso,input,resumo.primeiroId||'',alvos.length,
    resumo.encaminhados?'ENCAMINHADA_FAMILIA':'ERRO_ENVIO_FAMILIA'
  );
  if(!resumo.encaminhados)throw new Error('O serviço Push não aceitou a mensagem para nenhum aparelho desta família.');
  return {
    ok:true,enviado:true,eventoId:requestId,familiaId:familia,moradores:membros.length,
    aparelhos:alvos.length,encaminhadas:resumo.encaminhados,falhas:resumo.falhas||0,
    message:'Mensagem encaminhada para '+resumo.encaminhados+' aparelho(s) da família '+familia+'.'
  };
}

function buscaEnvioFamiliaV1Status_(p,contexto,familia,membros){
  var evento=String(p.eventoId||p.evento||'').trim();
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(evento))throw new Error('O envio familiar não pôde ser identificado.');
  var referencia='FAMILIA_'+familia;
  var ss=tacsTerritorioV1Planilha_();
  var rec=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  var open=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  var total=0,encaminhadas=0,exibidas=0,confirmadas=0,abertas=0;
  var ultimoEnc='',ultimoExib='',ultimoConf='',ultimoAberto='';
  if(rec&&rec.getLastRow()>1){
    rec.getRange(2,1,rec.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues().forEach(function(row){
      if(String(row[0]).trim()!==evento||String(row[1]).trim().toUpperCase()!==contexto.areaId||String(row[3]).trim()!==referencia)return;
      total++;
      if(row[13]){encaminhadas++;ultimoEnc=row[13];}
      if(row[14]){exibidas++;ultimoExib=row[14];}
      if(row[15]){confirmadas++;ultimoConf=row[15];}
    });
  }
  if(open&&open.getLastRow()>1){
    open.getRange(2,1,open.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues().forEach(function(row){
      if(String(row[0]).trim()!==evento||String(row[1]).trim().toUpperCase()!==contexto.areaId||String(row[3]).trim()!==referencia)return;
      abertas++;
      ultimoAberto=row[7]||ultimoAberto;
    });
  }
  var estado=confirmadas?'CONFIRMADA':(abertas?'ABERTA':(exibidas?'EXIBIDA':(encaminhadas?'ENCAMINHADA':'AGUARDANDO')));
  return {
    ok:true,eventoId:evento,familiaId:familia,moradores:membros.length,aparelhos:total,
    encaminhadas:encaminhadas,exibidas:exibidas,abertas:abertas,confirmadas:confirmadas,
    estado:estado,
    horarios:{encaminhada:ultimoEnc,exibida:ultimoExib,aberta:ultimoAberto,confirmada:ultimoConf}
  };
}

function buscaEnvioFamiliaV1GuardarResultado_(id,r){
  try{
    CacheService.getScriptCache().put(
      TACS_BUSCA_ENVIO_FAMILIA_V1.RESULT_PREFIX+id,
      JSON.stringify(r),
      TACS_BUSCA_ENVIO_FAMILIA_V1.RESULT_SECONDS
    );
  }catch(e){}
}
function buscaEnvioFamiliaV1LerResultado_(id){
  try{
    var s=CacheService.getScriptCache().get(TACS_BUSCA_ENVIO_FAMILIA_V1.RESULT_PREFIX+id);
    return s?JSON.parse(s):null;
  }catch(e){return null;}
}
function buscaEnvioFamiliaV1ResponderPost_(requestId,resultado){
  var msg={source:'mensagem-familia-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+
    JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function buscaEnvioFamiliaV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados),cb=String(callback||'').trim();
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb)){
    return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
