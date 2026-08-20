/**
 * Portal TACS — Mensagens individuais para moradores V1.0.0
 *
 * Camada isolada. Não altera o emissor geral de recados/campanhas.
 * Fluxo: morador selecionado -> família do cadastro -> aparelhos Push ativos
 * já vinculados a essa família -> comprovantes existentes de encaminhamento,
 * exibição, abertura e confirmação.
 */
var TACS_MENSAGEM_INDIVIDUAL_V1=Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_msg_individual_v1_result_',
  RESULT_SECONDS:300,
  TIPOS:Object.freeze(['CONFIRMAR_ATENDIMENTO','ALTERAR_DATA','LEMBRETE','CANCELAMENTO','OUTRA_MENSAGEM'])
});

var mensagemIndividualV1DoGetAnterior_;
var mensagemIndividualV1DoPostAnterior_;

(function instalarMensagemIndividualV1_(){
  if(typeof doGet==='function'){
    mensagemIndividualV1DoGetAnterior_=doGet;
    doGet=function(e){var r=mensagemIndividualV1TratarGet_(e);return r||mensagemIndividualV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    mensagemIndividualV1DoPostAnterior_=doPost;
    doPost=function(e){var r=mensagemIndividualV1TratarPost_(e);return r||mensagemIndividualV1DoPostAnterior_(e);};
  }
})();

function mensagemIndividualV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=mensagemIndividualV1Texto_(p.action).toLowerCase();
  if(action!=='admin_mensagem_individual_result')return null;
  var requestId=mensagemIndividualV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return mensagemIndividualV1ResponderJson_({ok:false,message:'Identificador de consulta inválido.'},p.callback);
  var resultado=mensagemIndividualV1LerResultado_(requestId);
  return mensagemIndividualV1ResponderJson_(resultado?{ok:true,pendente:false,requestId:requestId,result:resultado}:{ok:true,pendente:true,requestId:requestId},p.callback);
}

function mensagemIndividualV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=mensagemIndividualV1Texto_(p.action).toLowerCase();
  if(['admin_mensagem_individual_buscar','admin_mensagem_individual_enviar','admin_mensagem_individual_status'].indexOf(action)===-1)return null;
  var requestId=mensagemIndividualV1Texto_(p.requestId),resultado;
  try{
    requestId=mensagemIndividualV1ValidarRequestId_(requestId);
    var sessao=mensagemIndividualV1Contexto_(p,action==='admin_mensagem_individual_enviar');
    if(action==='admin_mensagem_individual_buscar')resultado=mensagemIndividualV1Buscar_(p,sessao.contexto);
    else if(action==='admin_mensagem_individual_status')resultado=mensagemIndividualV1Status_(p,sessao.contexto);
    else resultado=mensagemIndividualV1Enviar_(p,sessao.contexto,sessao.acesso,requestId);
  }catch(erro){resultado={ok:false,message:mensagemIndividualV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))mensagemIndividualV1GuardarResultado_(requestId,resultado);
  return mensagemIndividualV1ResponderPost_(requestId,resultado);
}

function mensagemIndividualV1Contexto_(p,exigirPublicacao){
  if(typeof tacsTerritorioV1ValidarAcesso_!=='function'||typeof moradoresAdminV1ResolverContexto_!=='function')throw new Error('A camada territorial ainda não está disponível.');
  var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
  var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
  moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
  if(exigirPublicacao){
    if(typeof notificacoesAreaV1ExigirPublicacao_!=='function')throw new Error('O serviço de notificações ainda não está disponível.');
    notificacoesAreaV1ExigirPublicacao_(acesso);
  }
  return {acesso:acesso,contexto:contexto};
}

function mensagemIndividualV1NormalizarFamilia_(valor){
  var s=mensagemIndividualV1Texto_(valor).toUpperCase().replace(/\s+/g,'');
  var m=s.match(/^(\d{1,4})([A-Z])?$/);
  if(!m)return '';
  var numero=m[1];
  if(numero.length<=3)numero=('000'+numero).slice(-3);
  return numero+(m[2]||'');
}

function mensagemIndividualV1FamiliaMorador_(morador){
  if(typeof vinculoFamiliarNotifV1CodigoEndereco_!=='function')throw new Error('A identificação familiar ainda não está disponível.');
  return mensagemIndividualV1Texto_(vinculoFamiliarNotifV1CodigoEndereco_(morador&&morador.endereco||'')).toUpperCase();
}

function mensagemIndividualV1Buscar_(p,contexto){
  var q=mensagemIndividualV1Texto_(p.q||p.busca||'');
  if(q.length<2)throw new Error('Digite pelo menos 2 caracteres para buscar.');
  var familia=mensagemIndividualV1NormalizarFamilia_(q);
  var base=moradoresAdminV1Buscar_(familia||q,contexto);
  var resultados=Array.isArray(base&&base.resultados)?base.resultados:[];
  if(familia){
    resultados=resultados.filter(function(item){return mensagemIndividualV1FamiliaMorador_(item)===familia;});
  }
  resultados=resultados.map(function(item){
    var copia={};Object.keys(item||{}).forEach(function(k){copia[k]=item[k];});
    copia.familiaId=mensagemIndividualV1FamiliaMorador_(item);
    return copia;
  });
  return {ok:true,resultados:resultados,total:resultados.length,limitado:Boolean(base&&base.limitado),areaId:contexto.areaId,familiaId:familia||''};
}

function mensagemIndividualV1ResolverMorador_(p,contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var origemAba=mensagemIndividualV1Texto_(p.origemAba),origemLinha=Number(p.origemLinha||0);
  if(!origemAba||origemLinha<2)throw new Error('Selecione novamente o morador antes de enviar a mensagem.');
  if(origemAba!==fonte.sheet.getName())throw new Error('O cadastro selecionado não pertence à área atual.');
  var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,origemAba,origemLinha);
  if(!registro||!registro.morador||!registro.morador.nome)throw new Error('O cadastro do morador não foi localizado.');
  var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
  var meta=moradoresAdminV1EncontrarMeta_(fonte.ss,chave,registro.origem,mensagemIndividualV1Texto_(p.moradorId),contexto);
  if(moradoresAdminV1EstaOculto_(registro.morador,meta))throw new Error('Este cadastro não está disponível para envio individual.');
  var item=moradoresAdminV1ComMeta_(registro.morador,registro.origem,meta,chave,contexto);
  if(p.moradorId&&item.moradorId&&mensagemIndividualV1Texto_(p.moradorId)!==mensagemIndividualV1Texto_(item.moradorId))throw new Error('O cadastro mudou desde a busca. Pesquise o morador novamente.');
  var situacao=mensagemIndividualV1Texto_(item.status||item.situacao||'ATIVO').toUpperCase();
  if(situacao!=='ATIVO')throw new Error('A mensagem individual só pode ser enviada para cadastro com situação ATIVO.');
  var familia=mensagemIndividualV1FamiliaMorador_(item);
  if(!familia)throw new Error('Este morador ainda não possui número de cadastro familiar reconhecido no endereço.');
  return {item:item,familiaId:familia,referencia:mensagemIndividualV1Texto_(item.idPortal||item.moradorId||chave)};
}

function mensagemIndividualV1MapaFamilias_(ss,areaId){
  var mapa={},nome=(typeof TACS_VINCULO_FAMILIAR_NOTIF_V1!=='undefined'&&TACS_VINCULO_FAMILIAR_NOTIF_V1.SHEET)||'TACS_NOTIFICACOES_FAMILIAS';
  var sheet=ss.getSheetByName(nome);if(!sheet||sheet.getLastRow()<=1)return mapa;
  sheet.getRange(2,1,sheet.getLastRow()-1,Math.min(sheet.getLastColumn(),8)).getDisplayValues().forEach(function(row){
    var sub=mensagemIndividualV1Texto_(row[0]).toLowerCase(),area=mensagemIndividualV1Texto_(row[1]).toUpperCase(),familia=mensagemIndividualV1Texto_(row[2]).toUpperCase();
    if(sub&&area===mensagemIndividualV1Texto_(areaId).toUpperCase()&&familia)mapa[sub]=familia;
  });
  return mapa;
}

function mensagemIndividualV1Alvos_(appId,apiKey,contexto,morador){
  var todos=notificacoesAreaV1AlvosAtivos_(appId,apiKey,contexto,notificacoesAreaV1QuantidadeAreas_());
  var ss=tacsTerritorioV1Planilha_(),mapa=mensagemIndividualV1MapaFamilias_(ss,contexto.areaId),vistos={};
  return todos.filter(function(alvo){
    var id=mensagemIndividualV1Texto_(alvo&&alvo.subscriptionId).toLowerCase();
    if(!id||vistos[id]||mapa[id]!==morador.familiaId)return false;
    vistos[id]=true;return true;
  }).map(function(alvo){
    return {subscriptionId:alvo.subscriptionId,idPortal:morador.referencia,tipoAparelho:alvo.tipoAparelho,navegador:alvo.navegador,sistema:alvo.sistema};
  });
}

function mensagemIndividualV1DataBr_(valor){
  var s=mensagemIndividualV1Texto_(valor),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)throw new Error('Informe uma data válida.');
  var ano=Number(m[1]),mes=Number(m[2]),dia=Number(m[3]),d=new Date(Date.UTC(ano,mes-1,dia,12));
  if(d.getUTCFullYear()!==ano||d.getUTCMonth()!==mes-1||d.getUTCDate()!==dia)throw new Error('Informe uma data válida.');
  return ('0'+dia).slice(-2)+'/'+('0'+mes).slice(-2)+'/'+ano;
}

function mensagemIndividualV1Conteudo_(p,morador){
  var tipo=mensagemIndividualV1Texto_(p.tipo).toUpperCase();
  if(TACS_MENSAGEM_INDIVIDUAL_V1.TIPOS.indexOf(tipo)===-1)throw new Error('Selecione o tipo da mensagem.');
  var nome=mensagemIndividualV1Texto_(morador.item.nome).split(' ')[0]||'Morador';
  var servico=mensagemIndividualV1Texto_(p.servico).slice(0,120);
  var hora=mensagemIndividualV1Texto_(p.hora);
  if(hora&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))throw new Error('Informe um horário válido.');
  var data='';
  if(tipo!=='OUTRA_MENSAGEM'){
    if(!servico)throw new Error('Informe o serviço relacionado à mensagem.');
    data=mensagemIndividualV1DataBr_(p.data);
  }
  var quando=data+(hora?' às '+hora:'');
  if(tipo==='CONFIRMAR_ATENDIMENTO')return {titulo:'Portal TACS — Atendimento confirmado',mensagem:nome+', seu atendimento de '+servico+' está confirmado para '+quando+'.'};
  if(tipo==='ALTERAR_DATA')return {titulo:'Portal TACS — Nova data do atendimento',mensagem:nome+', a nova data do seu atendimento de '+servico+' é '+quando+'.'};
  if(tipo==='LEMBRETE')return {titulo:'Portal TACS — Lembrete de atendimento',mensagem:nome+', lembramos que seu atendimento de '+servico+' será em '+quando+'.'};
  if(tipo==='CANCELAMENTO')return {titulo:'Portal TACS — Atendimento cancelado',mensagem:nome+', seu atendimento de '+servico+', previsto para '+quando+', foi cancelado. Aguarde nova orientação do TACS.'};
  var livre=mensagemIndividualV1Texto_(p.mensagem).slice(0,700);
  if(livre.length<3)throw new Error('Digite a mensagem que será enviada ao morador.');
  return {titulo:'Portal TACS — Mensagem individual',mensagem:livre};
}

function mensagemIndividualV1ConfigOneSignal_(){
  if(typeof TACS_NOTIFICACOES_AREA_V1==='undefined')throw new Error('O serviço Push ainda não está disponível.');
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  if(!apiKey)throw new Error('O serviço Push não está configurado para envio individual.');
  return {appId:appId,apiKey:apiKey};
}

function mensagemIndividualV1Enviar_(p,contexto,acesso,requestId){
  if(typeof portalManutencaoV1Estado_==='function'){
    var manutencao=portalManutencaoV1Estado_(contexto.areaId);
    if(manutencao&&manutencao.ativa)return {ok:true,enviado:false,maintenance:true,message:'O Portal está em manutenção. A mensagem individual não foi enviada.'};
  }
  var morador=mensagemIndividualV1ResolverMorador_(p,contexto),conteudo=mensagemIndividualV1Conteudo_(p,morador),cfg=mensagemIndividualV1ConfigOneSignal_();
  var alvos=mensagemIndividualV1Alvos_(cfg.appId,cfg.apiKey,contexto,morador);
  if(!alvos.length)return {ok:true,enviado:false,semAparelho:true,morador:{nome:morador.item.nome,familiaId:morador.familiaId},message:'Este morador ainda não possui aparelho apto e vinculado ao cadastro familiar para receber a mensagem.'};
  var input={titulo:conteudo.titulo,mensagem:conteudo.mensagem,tipo:'MENSAGEM_INDIVIDUAL',referencia:morador.referencia,evento:requestId};
  var preparados=notificacoesAreaV1PrepararComprovantes_(contexto,input,alvos),respostas;
  try{
    respostas=UrlFetchApp.fetchAll(preparados.map(function(item){return {url:TACS_NOTIFICACOES_AREA_V1.ENDPOINT,method:'post',contentType:'application/json',payload:JSON.stringify(notificacoesAreaV1PayloadIndividual_(cfg.appId,contexto,input,item)),headers:{Authorization:'Key '+cfg.apiKey},muteHttpExceptions:true};}));
  }catch(erroRede){
    notificacoesAreaV1MarcarFalhaLote_(preparados,erroRede);throw new Error('A conexão com o serviço Push falhou antes de concluir o envio individual.');
  }
  var resumo=notificacoesAreaV1AplicarRespostasEnvio_(preparados,respostas);
  notificacoesAreaV1Auditar_(contexto,acesso,input,resumo.primeiroId||'',alvos.length,resumo.encaminhados?'ENCAMINHADA_INDIVIDUAL_MORADOR':'ERRO_ENVIO_INDIVIDUAL_MORADOR');
  if(!resumo.encaminhados)throw new Error('O serviço Push não aceitou a mensagem para nenhum aparelho deste cadastro familiar.');
  return {ok:true,enviado:true,eventoId:requestId,referencia:morador.referencia,morador:{nome:morador.item.nome,familiaId:morador.familiaId},aparelhos:alvos.length,encaminhadas:resumo.encaminhados,falhas:resumo.falhas||0,message:'Mensagem encaminhada para '+resumo.encaminhados+' aparelho(s). Acompanhe abaixo a exibição, abertura e confirmação.'};
}

function mensagemIndividualV1Status_(p,contexto){
  var evento=mensagemIndividualV1Texto_(p.eventoId||p.evento),morador=mensagemIndividualV1ResolverMorador_(p,contexto);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(evento))throw new Error('O envio individual não pôde ser identificado.');
  var ss=tacsTerritorioV1Planilha_(),rec=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET),open=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  var total=0,encaminhadas=0,exibidas=0,confirmadas=0,abertas=0,ultimoEnc='',ultimoExib='',ultimoConf='',ultimoAberto='';
  if(rec&&rec.getLastRow()>1){
    rec.getRange(2,1,rec.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues().forEach(function(row){
      if(mensagemIndividualV1Texto_(row[0])!==evento||mensagemIndividualV1Texto_(row[1]).toUpperCase()!==contexto.areaId||mensagemIndividualV1Texto_(row[3])!==morador.referencia)return;
      total++;if(row[13]){encaminhadas++;ultimoEnc=row[13];}if(row[14]){exibidas++;ultimoExib=row[14];}if(row[15]){confirmadas++;ultimoConf=row[15];}
    });
  }
  if(open&&open.getLastRow()>1){
    open.getRange(2,1,open.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues().forEach(function(row){
      if(mensagemIndividualV1Texto_(row[0])!==evento||mensagemIndividualV1Texto_(row[1]).toUpperCase()!==contexto.areaId||mensagemIndividualV1Texto_(row[3])!==morador.referencia)return;
      abertas++;ultimoAberto=row[7]||ultimoAberto;
    });
  }
  var estado=confirmadas?'CONFIRMADA':(abertas?'ABERTA':(exibidas?'EXIBIDA':(encaminhadas?'ENCAMINHADA':'AGUARDANDO')));
  return {ok:true,eventoId:evento,morador:{nome:morador.item.nome,familiaId:morador.familiaId},aparelhos:total,encaminhadas:encaminhadas,exibidas:exibidas,abertas:abertas,confirmadas:confirmadas,estado:estado,horarios:{encaminhada:ultimoEnc,exibida:ultimoExib,aberta:ultimoAberto,confirmada:ultimoConf}};
}

function mensagemIndividualV1ValidarRequestId_(v){var s=mensagemIndividualV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(s))throw new Error('Identificador da operação inválido.');return s;}
function mensagemIndividualV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_MENSAGEM_INDIVIDUAL_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_MENSAGEM_INDIVIDUAL_V1.RESULT_SECONDS);}catch(e){}}
function mensagemIndividualV1LerResultado_(id){try{var s=CacheService.getScriptCache().get(TACS_MENSAGEM_INDIVIDUAL_V1.RESULT_PREFIX+id);return s?JSON.parse(s):null;}catch(e){return null;}}
function mensagemIndividualV1ResponderPost_(requestId,resultado){var msg={source:'mensagem-individual-morador-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function mensagemIndividualV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=mensagemIndividualV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function mensagemIndividualV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function mensagemIndividualV1Erro_(e){return mensagemIndividualV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,500);}
