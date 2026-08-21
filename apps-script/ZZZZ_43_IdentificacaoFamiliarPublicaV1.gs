/**
 * Portal TACS — Identificação familiar pública e complemento documental V1.0.0
 *
 * Escopo isolado:
 * - permite consultar cadastro familiar na área pública atual usando 2/002, 34/034 etc.;
 * - só devolve integrantes após validar o aparelho já vinculado à família OU
 *   confirmar CPF/CNS de um integrante ativo da mesma família;
 * - permite complementar apenas CPF/CNS ausente, nunca substituir documento existente;
 * - revalida unicidade, situação ativa e território no servidor antes de gravar;
 * - registra auditoria e invalida somente o resumo de moradores da área.
 */
var TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1=Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_ident_familiar_publica_v1_',
  RESULT_SECONDS:300
});

var identificacaoFamiliarPublicaV1DoGetAnterior_;
var identificacaoFamiliarPublicaV1DoPostAnterior_;

(function instalarIdentificacaoFamiliarPublicaV1_(){
  if(typeof doGet==='function'){
    identificacaoFamiliarPublicaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var r=identificacaoFamiliarPublicaV1TratarGet_(e);
      return r||identificacaoFamiliarPublicaV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    identificacaoFamiliarPublicaV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=identificacaoFamiliarPublicaV1TratarPost_(e);
      return r||identificacaoFamiliarPublicaV1DoPostAnterior_(e);
    };
  }
})();

function identificacaoFamiliarPublicaV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=identificacaoFamiliarPublicaV1Texto_(p.action).toLowerCase();
  if(action==='publico_familia_consultar'){
    var resposta;
    try{resposta=identificacaoFamiliarPublicaV1ConsultarFamilia_(p);}catch(erro){resposta={ok:false,message:identificacaoFamiliarPublicaV1Erro_(erro)};}
    return identificacaoFamiliarPublicaV1ResponderJson_(resposta,p.callback);
  }
  if(action==='publico_documento_complementar_result'){
    var id=identificacaoFamiliarPublicaV1Texto_(p.requestId);
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))return identificacaoFamiliarPublicaV1ResponderJson_({ok:false,message:'Identificador inválido.'},p.callback);
    var resultado=identificacaoFamiliarPublicaV1LerResultado_(id);
    return identificacaoFamiliarPublicaV1ResponderJson_(resultado?{ok:true,pendente:false,result:resultado}:{ok:true,pendente:true},p.callback);
  }
  return null;
}

function identificacaoFamiliarPublicaV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=identificacaoFamiliarPublicaV1Texto_(p.action).toLowerCase();
  if(action!=='publico_documento_complementar')return null;
  var requestId=identificacaoFamiliarPublicaV1Texto_(p.requestId),resultado;
  try{
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))throw new Error('Identificador da operação inválido.');
    resultado=identificacaoFamiliarPublicaV1ComplementarDocumento_(p);
  }catch(erro){resultado={ok:false,message:identificacaoFamiliarPublicaV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))identificacaoFamiliarPublicaV1GuardarResultado_(requestId,resultado);
  return identificacaoFamiliarPublicaV1ResponderPost_(requestId,resultado);
}

function identificacaoFamiliarPublicaV1NormalizarFamilia_(valor){
  if(typeof buscaEnvioFamiliaV1NormalizarFamilia_==='function')return buscaEnvioFamiliaV1NormalizarFamilia_(valor);
  var s=identificacaoFamiliarPublicaV1Texto_(valor).toUpperCase().replace(/\s+/g,''),m=s.match(/^(\d{1,4})([A-Z])?$/);
  if(!m)return '';
  var numero=m[1];if(numero.length<=3)numero=('000'+numero).slice(-3);
  return numero+(m[2]||'');
}

function identificacaoFamiliarPublicaV1Contexto_(areaSolicitada){
  var areaId=moradoresAdminV1NormalizarAreaId_(areaSolicitada);
  if(!areaId)throw new Error('Área do atendimento não informada.');
  var areas=moradoresAdminV1AreasPublicas_(areaId);
  if(areas.length!==1||areas[0].areaId!==areaId)throw new Error('Área pública não autorizada.');
  var area=areas[0];
  return {perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
}

function identificacaoFamiliarPublicaV1CodigoMorador_(morador){
  if(typeof vinculoFamiliarNotifV1CodigoEndereco_!=='function')throw new Error('A identificação familiar ainda não está disponível.');
  return identificacaoFamiliarPublicaV1NormalizarFamilia_(vinculoFamiliarNotifV1CodigoEndereco_(morador&&morador.endereco||''));
}

function identificacaoFamiliarPublicaV1Membros_(familia,contexto){
  if(typeof buscaEnvioFamiliaV1BuscarExata_!=='function')throw new Error('A busca familiar ainda não está disponível.');
  var lista=buscaEnvioFamiliaV1BuscarExata_(familia,contexto).resultados||[];
  return lista.map(function(item){
    return {nome:item.nome,nascimento:item.nascimento,endereco:item.endereco,localidade:item.endereco,areaId:contexto.areaId,areaNome:contexto.areaNome,status:'ATIVO',familiaId:familia};
  });
}

function identificacaoFamiliarPublicaV1AparelhoDaFamilia_(subscriptionId,contexto,familia){
  var sub=identificacaoFamiliarPublicaV1Texto_(subscriptionId).toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sub))return false;
  if(typeof mensagemIndividualV1MapaFamilias_!=='function')return false;
  var mapa=mensagemIndividualV1MapaFamilias_(tacsTerritorioV1Planilha_(),contexto.areaId);
  return identificacaoFamiliarPublicaV1NormalizarFamilia_(mapa[sub])===familia;
}

function identificacaoFamiliarPublicaV1DocumentoConfirmaFamilia_(documento,contexto,familia){
  var doc=moradoresAdminV1Digitos_(documento);
  if(!identificacaoFamiliarPublicaV1TipoDocumento_(doc))return false;
  var achado=moradoresAdminV1BuscarPublico_(doc,contexto.areaId);
  if(!achado||achado.ok!==true||achado.encontrado!==true||!achado.morador)return false;
  return identificacaoFamiliarPublicaV1CodigoMorador_(achado.morador)===familia;
}

function identificacaoFamiliarPublicaV1ConsultarFamilia_(p){
  var contexto=identificacaoFamiliarPublicaV1Contexto_(p.areaId||p.area||'');
  var familia=identificacaoFamiliarPublicaV1NormalizarFamilia_(p.familia||p.familiaId||'');
  if(!familia)throw new Error('Informe um número de cadastro familiar válido.');
  var porAparelho=identificacaoFamiliarPublicaV1AparelhoDaFamilia_(p.subscriptionId,contexto,familia);
  var porDocumento=!porAparelho&&identificacaoFamiliarPublicaV1DocumentoConfirmaFamilia_(p.documentoConfirmacao||p.documento||'',contexto,familia);
  if(!porAparelho&&!porDocumento){
    return {ok:true,autorizada:false,requerConfirmacao:true,familiaId:familia,message:'Para proteger os dados da família, confirme uma vez com o CPF ou Cartão SUS (CNS) de um integrante cadastrado.'};
  }
  var membros=identificacaoFamiliarPublicaV1Membros_(familia,contexto);
  if(!membros.length)return {ok:true,autorizada:false,requerConfirmacao:false,familiaId:familia,message:'Nenhum cadastro ativo desta família foi localizado na área atual.'};
  return {ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,autorizacao:porAparelho?'APARELHO_VINCULADO':'DOCUMENTO_CONFIRMADO',membros:membros};
}

function identificacaoFamiliarPublicaV1TipoDocumento_(doc){
  doc=moradoresAdminV1Digitos_(doc);
  if(/^[0-9]{11}$/.test(doc)&&moradoresAdminV1CpfValido_(doc))return 'CPF';
  if(/^[0-9]{15}$/.test(doc))return 'CNS';
  return '';
}

function identificacaoFamiliarPublicaV1LocalizarUnico_(documento,contexto){
  var doc=moradoresAdminV1Digitos_(documento),tipo=identificacaoFamiliarPublicaV1TipoDocumento_(doc);
  if(!tipo)throw new Error('Documento de localização inválido.');
  var fonte=moradoresAdminV1LocalizarFonte_(contexto),metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn(),achados=[];
  if(lastRow<=fonte.headerRow+1)return null;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol),raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    if((tipo==='CPF'?morador.cpf:morador.cns)!==doc)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i},chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||metaMap.porChave[chave]||null;
    if(moradoresAdminV1EstaOculto_(morador,meta))continue;
    achados.push({fonte:fonte,morador:morador,origem:origem,chave:chave,meta:meta});
  }
  if(achados.length!==1)throw new Error(achados.length>1?'O cadastro precisa de conferência administrativa. Procure seu TACS.':'Cadastro ativo não encontrado pelo documento de confirmação.');
  return achados[0];
}

function identificacaoFamiliarPublicaV1DocumentoJaExiste_(documento){
  var doc=moradoresAdminV1Digitos_(documento),tipo=identificacaoFamiliarPublicaV1TipoDocumento_(doc);
  if(!tipo)return true;
  var areas=moradoresAdminV1CatalogoAreas_().filter(function(area){return area.ativa!==false;});
  for(var a=0;a<areas.length;a++){
    var area=areas[a],contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
    var fonte=moradoresAdminV1LocalizarFonte_(contexto),lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
    if(lastRow<=fonte.headerRow+1)continue;
    var display=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol).getDisplayValues();
    for(var i=0;i<display.length;i++){
      var morador=moradoresAdminV1MontarMorador_(display[i],display[i],fonte.map);
      if((tipo==='CPF'?morador.cpf:morador.cns)===doc)return true;
    }
  }
  return false;
}

function identificacaoFamiliarPublicaV1ComplementarDocumento_(p){
  var contexto=identificacaoFamiliarPublicaV1Contexto_(p.areaId||p.area||'');
  var localizador=moradoresAdminV1Digitos_(p.documentoLocalizador||p.documentoAtual||'');
  var novo=moradoresAdminV1Digitos_(p.documentoNovo||p.novoDocumento||'');
  var tipoLocalizador=identificacaoFamiliarPublicaV1TipoDocumento_(localizador),tipoNovo=identificacaoFamiliarPublicaV1TipoDocumento_(novo);
  if(!tipoLocalizador||!tipoNovo)throw new Error('Informe documentos válidos para confirmar o cadastro.');
  if(tipoLocalizador===tipoNovo)throw new Error('Use o outro documento para complementar o cadastro: CPF e Cartão SUS devem ser diferentes.');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O cadastro está sendo atualizado. Tente novamente em instantes.');
  try{
    var achado=identificacaoFamiliarPublicaV1LocalizarUnico_(localizador,contexto),campo=tipoNovo==='CPF'?'cpf':'cns';
    if(!achado)throw new Error('Cadastro não localizado.');
    if(moradoresAdminV1Digitos_(achado.morador[campo]))throw new Error('Este cadastro já possui '+tipoNovo+' registrado. Para alterar um documento existente, procure seu TACS.');
    if(identificacaoFamiliarPublicaV1DocumentoJaExiste_(novo))throw new Error('Este '+tipoNovo+' já está associado a outro cadastro e não pode ser incluído automaticamente. Procure seu TACS.');
    moradoresAdminV1SetCell_(achado.fonte.sheet,achado.origem.linha,achado.fonte.map[campo],novo,'@');
    var agora=new Date();
    moradoresAdminV1SetCell_(achado.fonte.sheet,achado.origem.linha,achado.fonte.map.ultimaAtualizacao,agora,'dd/MM/yyyy HH:mm:ss');
    var moradorId=identificacaoFamiliarPublicaV1Texto_((achado.meta&&achado.meta.moradorId)||achado.morador.idPortal||achado.morador.id||achado.chave);
    moradoresAdminV1Auditar_(achado.fonte.ss,{moradorId:moradorId,acao:'COMPLEMENTAR_'+tipoNovo+'_PORTAL_PUBLICO',campos:tipoNovo+'_PREENCHIDO_EM_CAMPO_VAZIO'},contexto);
    SpreadsheetApp.flush();
    moradoresAdminV1InvalidarResumo_(contexto);
    return {ok:true,complementado:true,tipo:tipoNovo,message:tipoNovo+' adicionado ao cadastro. A partir de agora você pode acessar usando CPF ou Cartão SUS.'};
  }finally{lock.releaseLock();}
}

function identificacaoFamiliarPublicaV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1.RESULT_SECONDS);}catch(e){}}
function identificacaoFamiliarPublicaV1LerResultado_(id){try{var s=CacheService.getScriptCache().get(TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1.RESULT_PREFIX+id);return s?JSON.parse(s):null;}catch(e){return null;}}
function identificacaoFamiliarPublicaV1ResponderPost_(requestId,resultado){var msg={source:'identificacao-familiar-publica-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function identificacaoFamiliarPublicaV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=identificacaoFamiliarPublicaV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function identificacaoFamiliarPublicaV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function identificacaoFamiliarPublicaV1Erro_(e){return identificacaoFamiliarPublicaV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,500);}
