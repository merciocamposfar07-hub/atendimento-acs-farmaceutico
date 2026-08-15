/**
 * ZZZZ_15_MoradoresAdminPortalV1.gs
 * Portal TACS — Administração de Moradores V1.4.5
 *
 * Modelo: cadastro individual de cidadão (uma pessoa por linha).
 * Consolidação de duplicidades preserva a linha de origem e o ID principal.
 *
 * Segurança:
 * - Japaranduba continua usando a mesma planilha de moradores já em produção;
 * - novas áreas usam fontes próprias cadastradas no servidor;
 * - o escopo agente/área/unidade é resolvido no servidor;
 * - o administrador geral pode alternar somente entre áreas cadastradas;
 * - reconhece o schema real A:T pelo nome exato dos cabeçalhos;
 * - nunca adivinha coluna ausente;
 * - nenhuma exclusão física;
 * - consolidação exige documento coincidente e bloqueia documentos conflitantes;
 * - correções anteriores à consolidação exigem origem exata e deixam auditoria;
 * - corrige somente o caso legado comprovável de CPF válido cujo zero inicial
 *   foi perdido no CSV, exigindo também nome e nascimento idênticos;
 * - escrita diária permanece bloqueada até validação real da leitura;
 * - a consulta pública devolve somente cadastro ATIVO e nunca expõe inativos;
 * - importação CSV é executada pelo módulo territorial separado e auditável;
 * - não altera agendas, odontologia, profissionais, recados, campanhas ou push.
 */
var TACS_MORADORES_ADMIN_V1 = Object.freeze({
  VERSAO: '1.4.5',
  DEFAULT_RESIDENT_SPREADSHEET_ID: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg',
  DEFAULT_AGENT_ID: 'AG001',
  DEFAULT_AREA_ID: 'JAPARANDUBA',
  DEFAULT_AREA_NAME: 'Sítio Japaranduba',
  DEFAULT_UNIT_ID: 'POSTO_MATIAS',
  DEFAULT_OPERATOR_ID: 'ADMIN_GERAL',
  DEFAULT_MICROAREA: '1',
  DEFAULT_EQUIPE: 'USF MATIAS CDS',
  META_SHEET: 'TACS_META_AREA',
  AUDIT_SHEET: 'TACS_AUDIT_MORADORES',
  TIMEZONE: 'America/Recife',
  MAX_HEADER_ROWS: 12,
  MAX_SEARCH_RESULTS: 80,
  WRITES_PROPERTY: 'MORADORES_ADMIN_WRITES_ENABLED',
  STATUS_PROPERTY: 'MORADORES_ADMIN_STATUS_ENABLED',
  AGENT_PROPERTY: 'PORTAL_TACS_AGENTE_ID',
  AREA_PROPERTY: 'PORTAL_TACS_AREA_ID',
  AREA_NAME_PROPERTY: 'PORTAL_TACS_AREA_NOME',
  UNIT_PROPERTY: 'PORTAL_TACS_UNIDADE_ID',
  GENERAL_ADMIN_PROPERTY: 'PORTAL_TACS_ADMIN_GERAL_ID',
  RESIDENT_SOURCE_PROPERTY: 'PORTAL_TACS_MORADORES_PLANILHA_ID',
  AREAS_PROPERTY: 'PORTAL_TACS_MORADORES_AREAS_JSON',
  PUBLIC_AREA_PROPERTY: 'PORTAL_TACS_MORADORES_AREA_PUBLICA_ID',
  PUBLIC_FILTER_PROPERTY: 'MORADORES_PUBLIC_STATUS_FILTER_VERSION',
  PUBLIC_FILTER_VERSION: '1.4.0',
  RESULT_PREFIX: 'tacs_moradores_v145_result_',
  RESULT_SECONDS: 300,
  SOURCE_CACHE_PREFIX: 'tacs_moradores_v145_fonte_',
  SOURCE_CACHE_SECONDS: 600,
  SUMMARY_CACHE_PREFIX: 'tacs_moradores_v145_resumo_',
  SUMMARY_CACHE_SECONDS: 60,
  CONSOLIDATED_STATUS: 'CONSOLIDADO',
  REVERTED_IMPORT_STATUS: 'IMPORTACAO_DESFEITA',
  SCHEMA_HEADERS: Object.freeze([
    'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO',
    'ENDERECO','CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM',
    'ULTIMA_ATUALIZACAO','STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO',
    'DATA_CADASTRO_PORTAL','OBSERVACOES'
  ])
});

var moradoresAdminV1DoGetAnterior_;
var moradoresAdminV1DoPostAnterior_;
var moradoresAdminV1GetAnterior_;
var moradoresAdminV1PostAnterior_;

(function instalarMoradoresAdminPortalV1_(){
  if(typeof doGet==='function'){
    moradoresAdminV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=moradoresAdminV1TratarGet_(e);
      return resposta||moradoresAdminV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    moradoresAdminV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=moradoresAdminV1TratarPost_(e);
      return resposta||moradoresAdminV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    moradoresAdminV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=moradoresAdminV1TratarGet_(e);
      return resposta||moradoresAdminV1GetAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    moradoresAdminV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=moradoresAdminV1TratarPost_(e);
      return resposta||moradoresAdminV1PostAnterior_(e);
    };
  }
})();

function moradoresAdminV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=moradoresAdminV1Texto_(p.action).toLowerCase();

  if(action==='buscar_morador'||action==='buscar_morador_bridge'){
    var publico;
    try{
      publico=moradoresAdminV1BuscarPublico_(p.documento||p.cpf||p.cns||'',p.areaId||p.area||'');
    }catch(erroPublico){
      publico={ok:false,encontrado:false,message:moradoresAdminV1MensagemErro_(erroPublico)};
    }
    return action==='buscar_morador_bridge'
      ?moradoresAdminV1ResponderBridgePublica_(publico,p.nonce)
      :moradoresAdminV1ResponderJson_(publico,p.callback);
  }

  if(action!=='admin_moradores_result')return null;
  try{
    var requestId=moradoresAdminV1ValidarRequestId_(p.requestId);
    var resultado=moradoresAdminV1LerResultado_(requestId);
    return moradoresAdminV1ResponderJson_({ok:true,pendente:!resultado,requestId:requestId,result:resultado||null},p.callback);
  }catch(erro){
    return moradoresAdminV1ResponderJson_({ok:false,message:moradoresAdminV1MensagemErro_(erro)},p.callback);
  }
}

function moradoresAdminV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=moradoresAdminV1Texto_(p.action).toLowerCase();
  if([
    'admin_moradores_status',
    'admin_moradores_areas',
    'admin_moradores_buscar',
    'admin_morador_salvar',
    'admin_morador_situacao',
    'admin_morador_consolidar',
    'admin_moradores_ativar_situacao'
  ].indexOf(action)===-1)return null;
  var resultado;
  try{
    var sessao=moradoresAdminV1ValidarSessao_(p);
    var contexto=moradoresAdminV1ResolverContexto_(sessao,p.areaId||p.area||'');
    if(action==='admin_moradores_status'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=moradoresAdminV1Status_(contexto);
    }else if(action==='admin_moradores_areas'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado={ok:true,areas:moradoresAdminV1AreasVisiveis_(contexto),areaId:contexto.areaId};
    }else if(action==='admin_moradores_buscar'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=moradoresAdminV1Buscar_(p.q||p.busca||'',contexto);
    }else if(action==='admin_morador_salvar'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_EDITAR');
      moradoresAdminV1ExigirEscrita_();
      resultado=moradoresAdminV1Salvar_(p,contexto);
    }else if(action==='admin_morador_situacao'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_SITUACAO');
      moradoresAdminV1ExigirSituacao_();
      resultado=moradoresAdminV1Situacao_(p,contexto);
    }else if(action==='admin_morador_consolidar'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_CONSOLIDAR');
      moradoresAdminV1ExigirEscrita_();
      resultado=moradoresAdminV1Consolidar_(p,contexto);
    }else{
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_SITUACAO');
      resultado=moradoresAdminV1AtivarSituacao_(contexto);
    }
  }catch(erro){
    resultado={ok:false,message:moradoresAdminV1MensagemErro_(erro)};
  }
  var requestId=moradoresAdminV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))moradoresAdminV1GuardarResultado_(requestId,resultado);
  return moradoresAdminV1ResponderPost_(requestId,resultado);
}

/**
 * O navegador não escolhe seu próprio escopo. Somente dados devolvidos pela
 * validação de sessão ou a configuração interna do servidor entram aqui.
 */
function moradoresAdminV1ResolverContexto_(sessao,areaSolicitada){
  sessao=sessao&&typeof sessao==='object'?sessao:{};
  var props=PropertiesService.getScriptProperties();
  var escopo=sessao.escopo&&typeof sessao.escopo==='object'?sessao.escopo:{};
  var perfil=moradoresAdminV1Texto_(sessao.perfil||escopo.perfil||'ADMIN_GERAL').toUpperCase();
  var areaSessao=moradoresAdminV1NormalizarAreaId_(sessao.areaId||escopo.areaId||props.getProperty(TACS_MORADORES_ADMIN_V1.AREA_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID);
  var areaPedida=moradoresAdminV1NormalizarAreaId_(areaSolicitada);
  var administrador=perfil==='ADMIN_GERAL'||perfil==='ADMIN_MUNICIPAL';

  if(areaPedida&&!administrador&&areaPedida!==areaSessao){
    throw new Error('Seu acesso não permite trocar a área de moradores.');
  }

  var areaId=areaPedida&&administrador?areaPedida:areaSessao;
  var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
  if(!area)throw new Error('A área solicitada não possui uma fonte de moradores ativa no servidor.');

  var contexto={
    perfil:perfil,
    operadorId:moradoresAdminV1Texto_(sessao.operadorId||escopo.operadorId||props.getProperty(TACS_MORADORES_ADMIN_V1.GENERAL_ADMIN_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_OPERATOR_ID),
    agenteId:administrador
      ?area.agenteId
      :moradoresAdminV1Texto_(sessao.agenteId||escopo.agenteId||area.agenteId),
    areaId:area.areaId,
    areaNome:area.areaNome,
    unidadeId:administrador
      ?area.unidadeId
      :moradoresAdminV1Texto_(sessao.unidadeId||escopo.unidadeId||area.unidadeId),
    planilhaId:area.planilhaId,
    permissoes:Array.isArray(sessao.permissoes)?sessao.permissoes.slice():(Array.isArray(escopo.permissoes)?escopo.permissoes.slice():[])
  };
  if(!contexto.operadorId||!contexto.agenteId||!contexto.areaId||!contexto.unidadeId)throw new Error('O escopo administrativo está incompleto.');
  return contexto;
}

function moradoresAdminV1NormalizarAreaId_(valor){
  return moradoresAdminV1Texto_(valor).toUpperCase().replace(/[^A-Z0-9_-]/g,'');
}

function moradoresAdminV1AreaPadrao_(){
  var props=PropertiesService.getScriptProperties();
  return {
    areaId:TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID,
    areaNome:moradoresAdminV1Texto_(props.getProperty(TACS_MORADORES_ADMIN_V1.AREA_NAME_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_NAME),
    unidadeId:moradoresAdminV1Texto_(props.getProperty(TACS_MORADORES_ADMIN_V1.UNIT_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_UNIT_ID),
    agenteId:moradoresAdminV1Texto_(props.getProperty(TACS_MORADORES_ADMIN_V1.AGENT_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AGENT_ID),
    planilhaId:moradoresAdminV1Texto_(props.getProperty(TACS_MORADORES_ADMIN_V1.RESIDENT_SOURCE_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_RESIDENT_SPREADSHEET_ID),
    ativa:true,
    publica:true
  };
}

function moradoresAdminV1CatalogoAreas_(){
  var props=PropertiesService.getScriptProperties();
  var raw=moradoresAdminV1Texto_(props.getProperty(TACS_MORADORES_ADMIN_V1.AREAS_PROPERTY));
  var recebidas=[];

  if(raw){
    try{
      var parsed=JSON.parse(raw);
      recebidas=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.areas)?parsed.areas:[]);
    }catch(erro){
      throw new Error('A configuração das áreas de moradores não é um JSON válido.');
    }
    if(!recebidas.length)throw new Error('A configuração das áreas não contém nenhuma área válida.');
  }

  var porId={};
  var padrao=moradoresAdminV1AreaPadrao_();
  porId[padrao.areaId]=padrao;

  recebidas.forEach(function(item){
    item=item&&typeof item==='object'?item:{};
    var area={
      areaId:moradoresAdminV1NormalizarAreaId_(item.areaId||item.id),
      areaNome:moradoresAdminV1Texto_(item.areaNome||item.nome),
      unidadeId:moradoresAdminV1NormalizarAreaId_(item.unidadeId||item.unidade),
      agenteId:moradoresAdminV1NormalizarAreaId_(item.agenteId||item.agente),
      planilhaId:moradoresAdminV1Texto_(item.planilhaId||item.spreadsheetId),
      ativa:item.ativa!==false,
      publica:item.publica!==false
    };

    if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area.areaId))throw new Error('Há uma área de moradores com ID inválido.');
    if(!area.areaNome||!area.unidadeId||!area.agenteId)throw new Error('A área '+area.areaId+' está com nome, unidade ou agente incompleto.');
    if(!/^[A-Za-z0-9_-]{20,200}$/.test(area.planilhaId))throw new Error('A área '+area.areaId+' está com ID de planilha inválido.');
    porId[area.areaId]=area;
  });

  var areas=Object.keys(porId).map(function(id){return porId[id];}).filter(function(area){return area.ativa;});
  var fontes={};
  areas.forEach(function(area){
    if(fontes[area.planilhaId]&&fontes[area.planilhaId]!==area.areaId){
      throw new Error('As áreas '+fontes[area.planilhaId]+' e '+area.areaId+' apontam para a mesma planilha. Cada área precisa de fonte própria.');
    }
    fontes[area.planilhaId]=area.areaId;
  });
  return areas;
}

function moradoresAdminV1EncontrarAreaConfigurada_(areaId){
  var id=moradoresAdminV1NormalizarAreaId_(areaId);
  var areas=moradoresAdminV1CatalogoAreas_();
  for(var i=0;i<areas.length;i++)if(areas[i].areaId===id)return areas[i];
  return null;
}

function moradoresAdminV1AreasVisiveis_(contexto){
  var administrador=contexto.perfil==='ADMIN_GERAL'||contexto.perfil==='ADMIN_MUNICIPAL';
  return moradoresAdminV1CatalogoAreas_().filter(function(area){
    return administrador||area.areaId===contexto.areaId;
  }).map(function(area){
    return {
      areaId:area.areaId,
      areaNome:area.areaNome,
      unidadeId:area.unidadeId,
      agenteId:area.agenteId
    };
  });
}

function moradoresAdminV1ExigirPermissao_(contexto,permissao){
  if(contexto.perfil==='ADMIN_GERAL'||contexto.perfil==='ADMIN_MUNICIPAL')return true;
  var permitidas=(contexto.permissoes||[]).map(function(x){return moradoresAdminV1Texto_(x).toUpperCase();});
  if(permitidas.indexOf(permissao)===-1)throw new Error('Seu acesso não possui permissão para esta operação.');
  return true;
}

function moradoresAdminV1ResolverPlanilhaId_(contexto){
  if(contexto&&contexto.planilhaId)return contexto.planilhaId;
  if(typeof tacsAreasV1ResolverFonteMoradores_==='function'){
    var externo=moradoresAdminV1Texto_(tacsAreasV1ResolverFonteMoradores_(contexto));
    if(externo)return externo;
  }
  var area=moradoresAdminV1EncontrarAreaConfigurada_(contexto&&contexto.areaId);
  if(!area)throw new Error('Esta área não possui uma fonte de moradores autorizada no servidor.');
  return area.planilhaId;
}

/**
 * Consulta pública mínima. O documento completo é usado somente para localizar
 * um cadastro ATIVO. CPF/CNS, telefone, observações, IDs internos e motivo de
 * situação nunca são devolvidos ao navegador público.
 */
function moradoresAdminV1BuscarPublico_(documento,areaSolicitada){
  var doc=moradoresAdminV1Digitos_(documento);
  var cpf=/^[0-9]{11}$/.test(doc)&&moradoresAdminV1CpfValido_(doc)?doc:'';
  var cns=/^[0-9]{15}$/.test(doc)?doc:'';
  if(!cpf&&!cns)return {ok:false,encontrado:false,message:'Informe um CPF válido ou os 15 números do CNS.'};

  var areas=moradoresAdminV1AreasPublicas_(areaSolicitada);
  var encontrados=[];

  areas.forEach(function(area){
    var contexto={
      perfil:'PUBLICO',
      operadorId:'PUBLICO',
      agenteId:area.agenteId,
      areaId:area.areaId,
      areaNome:area.areaNome,
      unidadeId:area.unidadeId,
      planilhaId:area.planilhaId,
      permissoes:[]
    };
    var fonte=moradoresAdminV1LocalizarFonte_(contexto);
    var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
    moradoresAdminV1LocalizarTodosPorDocumento_(fonte,cpf,cns).forEach(function(registro){
      var origemKey=moradoresAdminV1ChaveOrigem_(registro.origem);
      var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
      var meta=metaMap.porOrigem[origemKey]||metaMap.porChave[chave]||null;
      var situacao=moradoresAdminV1Texto_((meta&&meta.situacao)||registro.morador.status||'ATIVO').toUpperCase();
      if(situacao!=='ATIVO')return;
      encontrados.push({area:area,registro:registro});
    });
  });

  if(encontrados.length!==1){
    return {ok:true,encontrado:false,message:encontrados.length>1?'O cadastro precisa de conferência administrativa. Procure seu TACS.':'Cadastro ativo não encontrado. Confira o documento.'};
  }

  var achado=encontrados[0];
  var morador=achado.registro.morador;
  return {
    ok:true,
    encontrado:true,
    morador:{
      nome:morador.nome,
      nascimento:morador.nascimento,
      endereco:morador.endereco,
      localidade:morador.endereco,
      areaId:achado.area.areaId,
      areaNome:achado.area.areaNome,
      status:'ATIVO'
    }
  };
}

function moradoresAdminV1AreasPublicas_(areaSolicitada){
  var areas=moradoresAdminV1CatalogoAreas_().filter(function(area){return area.publica;});
  var pedida=moradoresAdminV1NormalizarAreaId_(areaSolicitada);
  if(pedida){
    areas=areas.filter(function(area){return area.areaId===pedida;});
    if(!areas.length)throw new Error('Área pública não autorizada.');
    return areas;
  }

  var fixa=moradoresAdminV1NormalizarAreaId_(PropertiesService.getScriptProperties().getProperty(TACS_MORADORES_ADMIN_V1.PUBLIC_AREA_PROPERTY));
  if(fixa){
    areas=areas.filter(function(area){return area.areaId===fixa;});
    if(!areas.length)throw new Error('A área pública configurada não está ativa.');
  }
  return areas;
}

function moradoresAdminV1ResponderBridgePublica_(payload,nonce){
  var token=moradoresAdminV1Texto_(nonce);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(token))token='';
  var mensagem={source:'portal-tacs-morador',nonce:token,payload:payload};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>'+ 
    'parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function moradoresAdminV1FiltroPublicoDisponivel_(){
  return TACS_MORADORES_ADMIN_V1.PUBLIC_FILTER_VERSION==='1.4.0';
}

function moradoresAdminV1Status_(contexto){
  var inicio=Date.now();
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var fonteMs=Date.now()-inicio;
  var resumo=moradoresAdminV1ResumoFonte_(fonte,contexto);
  var indicadoresMs=Date.now()-inicio-fonteMs;
  return {
    ok:true,
    versao:TACS_MORADORES_ADMIN_V1.VERSAO,
    perfil:contexto.perfil,
    operadorId:contexto.operadorId,
    agenteId:contexto.agenteId,
    areaId:contexto.areaId,
    areaNome:contexto.areaNome,
    unidadeId:contexto.unidadeId,
    abaFonte:fonte.sheet.getName(),
    linhaCabecalho:fonte.headerRow+1,
    totalRegistros:resumo.totalRegistros,
    totalLinhasFonte:resumo.totalLinhasFonte,
    totalColunas:resumo.totalColunas,
    schemaValido:true,
    modeloCadastro:'CIDADAO_INDIVIDUAL',
    vinculoFamiliar:'FORA_DO_ESCOPO',
    metaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET)),
    auditoriaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET)),
    escritaHabilitada:moradoresAdminV1EscritaHabilitada_(),
    situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_(),
    filtroPublicoSituacao:moradoresAdminV1FiltroPublicoDisponivel_(),
    podeAtivarSituacao:(contexto.perfil==='ADMIN_GERAL'||contexto.perfil==='ADMIN_MUNICIPAL')&&moradoresAdminV1EscritaHabilitada_(),
    consolidacaoHabilitada:moradoresAdminV1EscritaHabilitada_(),
    areas:moradoresAdminV1AreasVisiveis_(contexto),
    csvImportacao:'MODULO_TERRITORIAL_AUDITAVEL',
    isolamentoFonte:'UMA_FONTE_POR_AREA',
    desempenho:{
      fonteMs:fonteMs,
      indicadoresMs:indicadoresMs,
      totalMs:Date.now()-inicio,
      fonteEmCache:Boolean(fonte.cacheFonte),
      indicadoresEmCache:Boolean(resumo.cache)
    }
  };
}

function moradoresAdminV1ResumoFonte_(fonte,contexto){
  var chave=moradoresAdminV1ChaveCacheResumo_(contexto);
  var cache=moradoresAdminV1CacheScript_();
  if(cache){
    try{
      var salvo=cache.get(chave);
      if(salvo){
        var lido=JSON.parse(salvo);
        if(
          lido&&
          lido.abaFonte===fonte.sheet.getName()&&
          Number(lido.linhaCabecalho)===fonte.headerRow+1&&
          Number(lido.totalRegistros)>=0&&
          Number(lido.totalLinhasFonte)>=0&&
          Number(lido.totalColunas)>=20
        ){
          lido.cache=true;
          return lido;
        }
      }
    }catch(erroCacheLeitura){}
  }

  var totalLinhas=Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1));
  var resumo={
    abaFonte:fonte.sheet.getName(),
    linhaCabecalho:fonte.headerRow+1,
    totalRegistros:moradoresAdminV1ContarOperacionais_(fonte),
    totalLinhasFonte:totalLinhas,
    totalColunas:fonte.sheet.getLastColumn(),
    cache:false
  };
  if(cache){
    try{
      cache.put(
        chave,
        JSON.stringify(resumo),
        TACS_MORADORES_ADMIN_V1.SUMMARY_CACHE_SECONDS
      );
    }catch(erroCacheEscrita){}
  }
  return resumo;
}

function moradoresAdminV1ContarOperacionais_(fonte){
  var lastRow=fonte.sheet.getLastRow();
  if(lastRow<=fonte.headerRow+1)return 0;
  var quantidade=lastRow-(fonte.headerRow+1);
  var nomes=fonte.sheet.getRange(
    fonte.headerRow+2,
    fonte.map.nome+1,
    quantidade,
    1
  ).getDisplayValues();
  var situacoes=fonte.sheet.getRange(
    fonte.headerRow+2,
    fonte.map.status+1,
    quantidade,
    1
  ).getDisplayValues();
  var total=0;
  for(var i=0;i<nomes.length;i++){
    if(!moradoresAdminV1Texto_(nomes[i][0]))continue;
    if(moradoresAdminV1SituacaoOculta_(situacoes[i][0]))continue;
    total++;
  }
  return total;
}

function moradoresAdminV1CacheScript_(){
  try{
    return CacheService.getScriptCache();
  }catch(erro){
    return null;
  }
}

function moradoresAdminV1ChaveCacheFonte_(contexto){
  return TACS_MORADORES_ADMIN_V1.SOURCE_CACHE_PREFIX+
    moradoresAdminV1NormalizarAreaId_(contexto&&contexto.areaId||'SEM_AREA')+'_'+
    moradoresAdminV1Hash_(moradoresAdminV1ResolverPlanilhaId_(contexto)).slice(0,16);
}

function moradoresAdminV1ChaveCacheResumo_(contexto){
  return TACS_MORADORES_ADMIN_V1.SUMMARY_CACHE_PREFIX+
    moradoresAdminV1NormalizarAreaId_(contexto&&contexto.areaId||'SEM_AREA')+'_'+
    moradoresAdminV1Hash_(moradoresAdminV1ResolverPlanilhaId_(contexto)).slice(0,16);
}

function moradoresAdminV1InvalidarResumo_(contexto){
  var cache=moradoresAdminV1CacheScript_();
  if(!cache)return;
  try{
    cache.remove(moradoresAdminV1ChaveCacheResumo_(contexto));
  }catch(erro){}
}

function moradoresAdminV1Buscar_(busca,contexto){
  var q=moradoresAdminV1NormalizarBusca_(busca);
  if(q.length<2)throw new Error('Digite pelo menos 2 caracteres para buscar.');
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1)return {ok:true,resultados:[],total:0,limitado:false,areaId:contexto.areaId};
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues(),resultados=[];
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    var chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||metaMap.porChave[chave]||null;
    if(moradoresAdminV1EstaOculto_(morador,meta))continue;
    var hay=moradoresAdminV1NormalizarBusca_([
      morador.idPortal,morador.id,morador.nome,morador.cpf,morador.cns,
      morador.nascimento,morador.endereco,morador.celular,morador.telefoneContato,
      morador.microarea,morador.equipe,morador.status,morador.observacoes
    ].join(' '));
    if(hay.indexOf(q)===-1)continue;
    resultados.push(moradoresAdminV1ComMeta_(morador,origem,meta,chave,contexto));
    if(resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS)break;
  }
  return {ok:true,resultados:resultados,total:resultados.length,limitado:resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS,areaId:contexto.areaId};
}

function moradoresAdminV1Salvar_(p,contexto){
  var body=moradoresAdminV1ParsePayload_(p.payload);
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var dados=moradoresAdminV1NormalizarDadosEntrada_(body,contexto);
  var revisaoDuplicidade=moradoresAdminV1Booleano_(body.revisaoDuplicidade);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  try{
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);
    var origemAba=moradoresAdminV1Texto_(body.origemAba),origemLinha=Number(body.origemLinha||0),existing=null;
    if(origemAba&&origemLinha>0){
      if(origemAba!==fonte.sheet.getName())throw new Error('A origem informada não pertence à fonte oficial desta área.');
      existing=moradoresAdminV1LerPorOrigem_(fonte.ss,origemAba,origemLinha);
    }
    if(revisaoDuplicidade&&!existing){
      throw new Error('A correção anterior à consolidação exige a origem exata do cadastro.');
    }
    if(!existing&&(dados.cpf||dados.cns)){
      var porDocumento=moradoresAdminV1LocalizarTodosPorDocumento_(fonte,dados.cpf,dados.cns);
      if(porDocumento.length>1)throw new Error('Há mais de um cadastro com este CPF/CNS. Faça a consolidação antes de editar.');
      if(porDocumento.length===1)existing=porDocumento[0];
    }
    if(revisaoDuplicidade&&!moradoresAdminV1RegistroTemDuplicidadeConfirmada_(fonte,existing)){
      throw new Error('Este cadastro não pertence mais a uma duplicidade confirmada. Atualize a busca antes de editar.');
    }
    var permitirCpfLegado=Boolean(
      revisaoDuplicidade&&
      existing&&
      dados.cpf===existing.morador.cpf&&
      moradoresAdminV1CpfLegadoExistenteConfirmado_(fonte,existing)
    );
    moradoresAdminV1ValidarDadosMorador_(dados,permitirCpfLegado);
    if(!existing&&!dados.cpf&&!dados.cns&&moradoresAdminV1LocalizarPorIdentidade_(fonte,dados)){
      throw new Error('Existe um possível cadastro com o mesmo nome, nascimento e endereço. Abra esse cadastro e revise antes de criar outro.');
    }
    var ignorar=existing&&existing.origem?existing.origem:null;
    var concorrentes=(dados.cpf||dados.cns)
      ?moradoresAdminV1LocalizarTodosPorDocumento_(fonte,dados.cpf,dados.cns).filter(function(item){
        return !ignorar||item.origem.aba!==ignorar.aba||item.origem.linha!==ignorar.linha;
      })
      :[];
    if(concorrentes.length){
      if(!revisaoDuplicidade)throw new Error('Já existe outro cadastro com este CPF/CNS. Revise antes de salvar.');
      var cpfAlterado=dados.cpf!==existing.morador.cpf;
      var cnsAlterado=dados.cns!==existing.morador.cns;
      if(cpfAlterado||cnsAlterado){
        throw new Error('CPF/CNS não podem ser alterados para um documento que continua vinculado a outro cadastro. Corrija os demais campos e faça a consolidação; depois, edite o documento do cadastro principal se necessário.');
      }
    }

    var origem,criado=false,metaAnterior=null,chaveAnterior='',antes=null;
    if(existing){
      origem=existing.origem;
      antes=existing.morador;
      var metaAtual=moradoresAdminV1EncontrarMeta_(fonte.ss,moradoresAdminV1ChaveRegistro_(existing.morador),origem,moradoresAdminV1Texto_(body.moradorId),contexto);
      if(moradoresAdminV1EstaConsolidado_(existing.morador,metaAtual))throw new Error('Este cadastro já foi consolidado e não pode ser editado isoladamente.');
      chaveAnterior=moradoresAdminV1ChaveRegistro_(existing.morador);
      metaAnterior=metaAtual;
      dados=moradoresAdminV1PreservarCamposSistema_(dados,existing.morador,false,fonte);
      moradoresAdminV1EscreverLinha_(fonte,origem.linha,dados);
    }else{
      dados=moradoresAdminV1PreservarCamposSistema_(dados,null,true,fonte);
      origem=moradoresAdminV1AdicionarLinha_(fonte,dados);
      criado=true;
    }

    var novaChave=moradoresAdminV1ChaveRegistro_(dados);
    var meta=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:novaChave,
      chaveAnterior:chaveAnterior,
      moradorId:moradoresAdminV1Texto_(body.moradorId)||(metaAnterior&&metaAnterior.moradorId)||'',
      origem:origem,
      dados:dados,
      situacao:dados.status||((metaAnterior&&metaAnterior.situacao)||'ATIVO'),
      motivo:(metaAnterior&&metaAnterior.motivo)||'',
      origemCadastro:criado?'PAINEL_MANUAL':((metaAnterior&&metaAnterior.origemCadastro)||'BASE_EXISTENTE')
    },contexto);
    moradoresAdminV1Auditar_(fonte.ss,{
      moradorId:meta.moradorId,
      acao:criado?'CRIAR_MORADOR':(revisaoDuplicidade?'CORRIGIR_ANTES_CONSOLIDACAO':'EDITAR_MORADOR'),
      campos:criado?'NOVO_CADASTRO':moradoresAdminV1CamposAlterados_(antes,dados)
    },contexto);
    SpreadsheetApp.flush();
    moradoresAdminV1InvalidarResumo_(contexto);
    return {
      ok:true,
      criado:criado,
      revisaoDuplicidade:Boolean(!criado&&revisaoDuplicidade),
      message:criado?'Morador cadastrado.':(revisaoDuplicidade?'Correção salva na planilha. A comparação será atualizada antes da unificação.':'Cadastro do morador atualizado.'),
      morador:moradoresAdminV1ComMeta_(dados,origem,meta,novaChave,contexto)
    };
  }finally{
    lock.releaseLock();
  }
}

function moradoresAdminV1NormalizarDadosEntrada_(body,contexto){
  return {
    idPortal:moradoresAdminV1Texto_(body.idPortal),
    id:moradoresAdminV1Texto_(body.id),
    cpf:moradoresAdminV1Digitos_(body.cpf),
    cns:moradoresAdminV1Digitos_(body.cns),
    nome:moradoresAdminV1Texto_(body.nome),
    nascimento:moradoresAdminV1DataBr_(body.nascimento||body.dataNascimento),
    idade:'',
    sexo:moradoresAdminV1NormalizarSexo_(body.sexo),
    endereco:moradoresAdminV1Texto_(body.endereco||body.localidade)||contexto.areaNome,
    celular:moradoresAdminV1Digitos_(body.celular),
    telefoneContato:moradoresAdminV1Digitos_(body.telefoneContato),
    microarea:moradoresAdminV1Texto_(body.microarea)||TACS_MORADORES_ADMIN_V1.DEFAULT_MICROAREA,
    equipe:moradoresAdminV1Texto_(body.equipe)||TACS_MORADORES_ADMIN_V1.DEFAULT_EQUIPE,
    origem:moradoresAdminV1Texto_(body.origem),
    ultimaAtualizacao:null,
    status:moradoresAdminV1Texto_(body.status).toUpperCase(),
    consentimentoWhatsapp:moradoresAdminV1NormalizarConsentimento_(body.consentimentoWhatsapp),
    dataConsentimento:body.dataConsentimento||'',
    dataCadastroPortal:body.dataCadastroPortal||'',
    observacoes:moradoresAdminV1Texto_(body.observacoes).slice(0,1000)
  };
}

function moradoresAdminV1PreservarCamposSistema_(dados,anterior,novo,fonte){
  var agora=new Date(),out={};
  Object.keys(dados).forEach(function(k){out[k]=dados[k];});
  if(novo){
    out.idPortal=moradoresAdminV1ProximoIdPortal_(fonte);
    out.id='';
    out.origem='PAINEL_TACS';
    out.status='ATIVO';
    out.consentimentoWhatsapp=out.consentimentoWhatsapp||'NÃO';
    out.dataConsentimento='';
    out.dataCadastroPortal=agora;
  }else{
    out.idPortal=anterior.idPortal;
    out.id=anterior.id;
    out.origem=anterior.origem;
    out.status=anterior.status||'ATIVO';
    out.consentimentoWhatsapp=anterior.consentimentoWhatsapp||'NÃO';
    out.dataConsentimento=anterior.dataConsentimento;
    out.dataCadastroPortal=anterior.dataCadastroPortal;
  }
  out.ultimaAtualizacao=agora;
  out.idade=moradoresAdminV1IdadeTexto_(out.nascimento,agora);
  return out;
}

function moradoresAdminV1Situacao_(p,contexto){
  var body=moradoresAdminV1ParsePayload_(p.payload);
  var situacao=moradoresAdminV1Texto_(body.situacao).toUpperCase();
  if(['ATIVO','FORA_DA_AREA','FALECIDO','TRANSFERIDO'].indexOf(situacao)===-1)throw new Error('Situação cadastral inválida.');
  var origem={aba:moradoresAdminV1Texto_(body.origemAba),linha:Number(body.origemLinha||0)};
  if(!origem.aba||origem.linha<1)throw new Error('Origem do cadastro ausente.');
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(origem.aba!==fonte.sheet.getName())throw new Error('A origem informada não pertence à fonte oficial desta área.');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  try{
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);
    var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,origem.aba,origem.linha);
    if(!registro)throw new Error('O cadastro não foi localizado na planilha.');
    var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
    var anterior=moradoresAdminV1EncontrarMeta_(fonte.ss,chave,origem,moradoresAdminV1Texto_(body.moradorId),contexto);
    if(moradoresAdminV1EstaConsolidado_(registro.morador,anterior))throw new Error('Este cadastro já foi consolidado e não pode ter a situação alterada.');
    var antes=registro.morador.status||'ATIVO';
    registro.morador.status=situacao;
    registro.morador.ultimaAtualizacao=new Date();
    moradoresAdminV1SetCell_(fonte.sheet,origem.linha,fonte.map.status,situacao);
    moradoresAdminV1SetCell_(fonte.sheet,origem.linha,fonte.map.ultimaAtualizacao,registro.morador.ultimaAtualizacao,'dd/MM/yyyy HH:mm:ss');
    var meta=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:chave,chaveAnterior:chave,
      moradorId:moradoresAdminV1Texto_(body.moradorId)||(anterior&&anterior.moradorId)||'',
      origem:origem,dados:registro.morador,situacao:situacao,
      motivo:moradoresAdminV1Texto_(body.motivo),
      origemCadastro:(anterior&&anterior.origemCadastro)||'BASE_EXISTENTE'
    },contexto);
    moradoresAdminV1Auditar_(fonte.ss,{moradorId:meta.moradorId,acao:'ALTERAR_SITUACAO',campos:'STATUS:'+antes+'>'+situacao},contexto);
    SpreadsheetApp.flush();
    moradoresAdminV1InvalidarResumo_(contexto);
    return {ok:true,message:'Situação cadastral atualizada.',morador:moradoresAdminV1ComMeta_(registro.morador,origem,meta,chave,contexto)};
  }finally{
    lock.releaseLock();
  }
}

function moradoresAdminV1Consolidar_(p,contexto){
  var body=moradoresAdminV1ParsePayload_(p.payload);
  var principalOrigem=moradoresAdminV1OrigemConsolidacao_(body,'principal');
  var redundanteOrigem=moradoresAdminV1OrigemConsolidacao_(body,'redundante');
  if(moradoresAdminV1ChaveOrigem_(principalOrigem)===moradoresAdminV1ChaveOrigem_(redundanteOrigem))throw new Error('O cadastro principal e o redundante devem ser registros diferentes.');
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(principalOrigem.aba!==fonte.sheet.getName()||redundanteOrigem.aba!==fonte.sheet.getName())throw new Error('Os dois cadastros precisam pertencer à fonte oficial desta área.');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('A base está sendo atualizada. Tente novamente.');
  try{
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);
    var principal=moradoresAdminV1LerPorOrigem_(fonte.ss,principalOrigem.aba,principalOrigem.linha);
    var redundante=moradoresAdminV1LerPorOrigem_(fonte.ss,redundanteOrigem.aba,redundanteOrigem.linha);
    if(!principal||!redundante)throw new Error('Um dos cadastros não foi localizado na planilha.');

    var principalMeta=moradoresAdminV1EncontrarMeta_(fonte.ss,moradoresAdminV1ChaveRegistro_(principal.morador),principal.origem,moradoresAdminV1Texto_(body.principalMoradorId),contexto);
    var redundanteMeta=moradoresAdminV1EncontrarMeta_(fonte.ss,moradoresAdminV1ChaveRegistro_(redundante.morador),redundante.origem,moradoresAdminV1Texto_(body.redundanteMoradorId),contexto);
    if(moradoresAdminV1EstaConsolidado_(principal.morador,principalMeta))throw new Error('O registro escolhido como principal já está consolidado e não pode receber outro cadastro.');
    if(moradoresAdminV1EstaConsolidado_(redundante.morador,redundanteMeta))throw new Error('O registro redundante já foi consolidado anteriormente.');

    moradoresAdminV1ValidarParConsolidacao_(principal.morador,redundante.morador);
    var mescla=moradoresAdminV1MesclarDuplicidade_(principal.morador,redundante.morador);
    moradoresAdminV1AplicarMescla_(fonte,principal.origem.linha,mescla);

    var agora=new Date();
    redundante.morador.status=TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS;
    redundante.morador.ultimaAtualizacao=agora;
    moradoresAdminV1SetCell_(fonte.sheet,redundante.origem.linha,fonte.map.status,TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS);
    moradoresAdminV1SetCell_(fonte.sheet,redundante.origem.linha,fonte.map.ultimaAtualizacao,agora,'dd/MM/yyyy HH:mm:ss');

    var chavePrincipal=moradoresAdminV1ChaveRegistro_(mescla.dados);
    var metaPrincipal=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:chavePrincipal,
      chaveAnterior:moradoresAdminV1ChaveRegistro_(principal.morador),
      moradorId:moradoresAdminV1Texto_(body.principalMoradorId)||(principalMeta&&principalMeta.moradorId)||'',
      origem:principal.origem,
      dados:mescla.dados,
      situacao:mescla.dados.status||'ATIVO',
      motivo:(principalMeta&&principalMeta.motivo)||'',
      origemCadastro:(principalMeta&&principalMeta.origemCadastro)||'BASE_EXISTENTE'
    },contexto);

    var destino=mescla.dados.idPortal||metaPrincipal.moradorId||moradoresAdminV1ChaveOrigem_(principal.origem);
    var metaRedundante=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:moradoresAdminV1ChaveRegistro_(redundante.morador),
      chaveAnterior:moradoresAdminV1ChaveRegistro_(redundante.morador),
      moradorId:moradoresAdminV1Texto_(body.redundanteMoradorId)||(redundanteMeta&&redundanteMeta.moradorId)||'',
      origem:redundante.origem,
      dados:redundante.morador,
      situacao:TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS,
      motivo:'CONSOLIDADO_EM:'+destino,
      origemCadastro:(redundanteMeta&&redundanteMeta.origemCadastro)||'BASE_EXISTENTE'
    },contexto);

    moradoresAdminV1Auditar_(fonte.ss,{
      moradorId:metaPrincipal.moradorId,
      acao:'CONSOLIDAR_DUPLICIDADE',
      campos:JSON.stringify({
        principal:(mescla.dados.idPortal||'SEM_ID')+'@'+moradoresAdminV1ChaveOrigem_(principal.origem),
        redundante:(redundante.morador.idPortal||'SEM_ID')+'@'+moradoresAdminV1ChaveOrigem_(redundante.origem),
        redundanteIdInterno:metaRedundante.moradorId,
        documentos:moradoresAdminV1DocumentosConfirmacao_(principal.morador,redundante.morador),
        preenchidos:mescla.camposPreenchidos,
        conflitos:mescla.conflitos
      })
    },contexto);
    SpreadsheetApp.flush();
    moradoresAdminV1InvalidarResumo_(contexto);
    return {
      ok:true,
      consolidado:true,
      message:'Duplicidade consolidada. O ID principal foi preservado e a linha redundante foi inativada sem exclusão física.',
      principal:moradoresAdminV1ComMeta_(mescla.dados,principal.origem,metaPrincipal,chavePrincipal,contexto),
      redundante:{
        moradorId:metaRedundante.moradorId,
        idPortal:redundante.morador.idPortal,
        origemAba:redundante.origem.aba,
        origemLinha:redundante.origem.linha,
        status:TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS
      },
      camposPreenchidos:mescla.camposPreenchidos,
      conflitosPreservadosNoPrincipal:mescla.conflitos,
      comparacao:mescla.comparacao
    };
  }finally{
    lock.releaseLock();
  }
}

function moradoresAdminV1OrigemConsolidacao_(body,prefixo){
  var nested=body[prefixo]&&typeof body[prefixo]==='object'?body[prefixo]:{};
  var cap=prefixo.charAt(0).toUpperCase()+prefixo.slice(1);
  var origem={
    aba:moradoresAdminV1Texto_(nested.origemAba||body[prefixo+'OrigemAba']||body['origemAba'+cap]),
    linha:Number(nested.origemLinha||body[prefixo+'OrigemLinha']||body['origemLinha'+cap]||0)
  };
  if(!origem.aba||origem.linha<1)throw new Error('A origem do cadastro '+prefixo+' está incompleta.');
  return origem;
}

function moradoresAdminV1ValidarParConsolidacao_(principal,redundante){
  var cpfA=moradoresAdminV1Digitos_(principal.cpf),cpfB=moradoresAdminV1Digitos_(redundante.cpf);
  var cnsA=moradoresAdminV1Digitos_(principal.cns),cnsB=moradoresAdminV1Digitos_(redundante.cns);
  var cpfLegado=moradoresAdminV1CpfLegadoZeroInicial_(cpfA,cpfB);
  var cpfConflita=Boolean(cpfA&&cpfB&&cpfA!==cpfB&&!cpfLegado);
  var cnsConflita=Boolean(cnsA&&cnsB&&cnsA!==cnsB);
  if(cpfConflita||cnsConflita)throw new Error('Consolidação recusada: CPF ou CNS possui valor conflitante entre os cadastros.');
  var cpfConfirma=Boolean(cpfA&&cpfB&&cpfA===cpfB)||Boolean(cpfLegado);
  var cnsConfirma=Boolean(cnsA&&cnsB&&cnsA===cnsB);
  if(!cpfConfirma&&!cnsConfirma)throw new Error('Consolidação recusada: não há CPF ou CNS coincidente para confirmar a mesma pessoa.');
  var nomeIgual=moradoresAdminV1NormalizarBusca_(principal.nome)===moradoresAdminV1NormalizarBusca_(redundante.nome);
  var nascIgual=moradoresAdminV1DataBr_(principal.nascimento)===moradoresAdminV1DataBr_(redundante.nascimento);
  if(!(cpfConfirma&&cnsConfirma)&&(!nomeIgual||!nascIgual))throw new Error('Consolidação recusada: com apenas um documento coincidente, nome e nascimento também precisam coincidir.');
}

/**
 * Aceita exclusivamente o defeito legado observado na importação: um CPF
 * válido de 11 dígitos iniciado por zero e o mesmo valor com esse único zero
 * inicial ausente. Não completa, aproxima nem adivinha qualquer outro CPF.
 * Retorna o CPF canônico válido ou string vazia.
 */
function moradoresAdminV1CpfLegadoZeroInicial_(cpfA,cpfB){
  var a=moradoresAdminV1Digitos_(cpfA),b=moradoresAdminV1Digitos_(cpfB);
  var completo='';
  var reduzido='';

  if(a.length===11&&b.length===10){
    completo=a;
    reduzido=b;
  }else if(b.length===11&&a.length===10){
    completo=b;
    reduzido=a;
  }else{
    return '';
  }

  if(
    completo.charAt(0)!=='0'||
    completo.slice(1)!==reduzido||
    !moradoresAdminV1CpfValido_(completo)
  ){
    return '';
  }

  return completo;
}

function moradoresAdminV1DocumentosConfirmacao_(a,b){
  var out=[];
  if(a.cpf&&b.cpf&&a.cpf===b.cpf)out.push('CPF');
  else if(moradoresAdminV1CpfLegadoZeroInicial_(a.cpf,b.cpf))out.push('CPF_ZERO_INICIAL_RECUPERADO');
  if(a.cns&&b.cns&&a.cns===b.cns)out.push('CNS');
  return out.join('+');
}

function moradoresAdminV1MesclarDuplicidade_(principal,redundante){
  var dados={},preenchidos=[],conflitos=[],comparacao=[];
  Object.keys(principal).forEach(function(k){dados[k]=principal[k];});
  var cpfCanonico=moradoresAdminV1CpfLegadoZeroInicial_(principal.cpf,redundante.cpf);
  var copiaveis={cpf:true,cns:true,nome:true,nascimento:true,sexo:true,endereco:true,celular:true,telefoneContato:true,microarea:true,equipe:true,consentimentoWhatsapp:true,dataConsentimento:true,observacoes:true};
  var spec=[
    ['idPortal','ID_PORTAL'],['id','ID'],['cpf','CPF'],['cns','CNS'],['nome','NOME'],
    ['nascimento','DATA_NASCIMENTO'],['idade','IDADE'],['sexo','SEXO'],['endereco','ENDERECO'],
    ['celular','CELULAR'],['telefoneContato','TELEFONE_CONTATO'],['microarea','MICROAREA'],
    ['equipe','EQUIPE'],['origem','ORIGEM'],['ultimaAtualizacao','ULTIMA_ATUALIZACAO'],
    ['status','STATUS'],['consentimentoWhatsapp','CONSENTIMENTO_WHATSAPP'],
    ['dataConsentimento','DATA_CONSENTIMENTO'],['dataCadastroPortal','DATA_CADASTRO_PORTAL'],
    ['observacoes','OBSERVACOES']
  ];
  spec.forEach(function(item){
    var k=item[0],a=principal[k],b=redundante[k],acao='PRESERVADO_PRINCIPAL';
    if(k==='cpf'&&cpfCanonico){
      dados.cpf=cpfCanonico;
      if(moradoresAdminV1Digitos_(a)!==cpfCanonico){
        preenchidos.push('CPF');
        acao='CPF_LEGADO_CORRIGIDO_ZERO_INICIAL';
      }else{
        acao='CPF_VALIDO_PRESERVADO_ZERO_INICIAL_CONFIRMADO';
      }
    }else if(k==='idade'){
      dados.idade=moradoresAdminV1IdadeTexto_(dados.nascimento,new Date());
      acao='RECALCULADO';
    }else if(k==='ultimaAtualizacao'){
      dados.ultimaAtualizacao=new Date();
      acao='ATUALIZADO';
    }else if(copiaveis[k]&&moradoresAdminV1CampoVazio_(a)&&!moradoresAdminV1CampoVazio_(b)){
      dados[k]=b;
      preenchidos.push(item[1]);
      acao='PREENCHIDO_DO_REDUNDANTE';
    }else if(copiaveis[k]&&!moradoresAdminV1CampoVazio_(a)&&!moradoresAdminV1CampoVazio_(b)&&!moradoresAdminV1ValoresEquivalentes_(k,a,b)){
      conflitos.push(item[1]);
      acao='CONFLITO_PRESERVADO_PRINCIPAL';
    }else if(moradoresAdminV1CampoVazio_(a)&&moradoresAdminV1CampoVazio_(b)){
      acao='VAZIO_NOS_DOIS';
    }else if(['idPortal','id','origem','status','dataCadastroPortal'].indexOf(k)!==-1){
      acao='CAMPO_SISTEMA_PRESERVADO';
    }
    comparacao.push({campo:item[1],principal:moradoresAdminV1ValorComparacao_(a),redundante:moradoresAdminV1ValorComparacao_(b),resultado:moradoresAdminV1ValorComparacao_(dados[k]),acao:acao});
  });
  return {dados:dados,camposPreenchidos:preenchidos,conflitos:conflitos,comparacao:comparacao};
}

function moradoresAdminV1AplicarMescla_(fonte,row,mescla){
  var formatos={cpf:'@',cns:'@',nascimento:'dd/MM/yyyy',celular:'@',telefoneContato:'@',dataConsentimento:'dd/MM/yyyy HH:mm'};
  var headerParaCampo={CPF:'cpf',CNS:'cns',NOME:'nome',DATA_NASCIMENTO:'nascimento',SEXO:'sexo',ENDERECO:'endereco',CELULAR:'celular',TELEFONE_CONTATO:'telefoneContato',MICROAREA:'microarea',EQUIPE:'equipe',CONSENTIMENTO_WHATSAPP:'consentimentoWhatsapp',DATA_CONSENTIMENTO:'dataConsentimento',OBSERVACOES:'observacoes'};
  mescla.camposPreenchidos.forEach(function(header){
    var campo=headerParaCampo[header];
    var valor=mescla.dados[campo];
    if(campo==='nascimento')valor=moradoresAdminV1DataObjeto_(valor);
    moradoresAdminV1SetCell_(fonte.sheet,row,fonte.map[campo],valor,formatos[campo]);
  });
  moradoresAdminV1SetCell_(fonte.sheet,row,fonte.map.idade,mescla.dados.idade);
  moradoresAdminV1SetCell_(fonte.sheet,row,fonte.map.ultimaAtualizacao,mescla.dados.ultimaAtualizacao,'dd/MM/yyyy HH:mm:ss');
}

function moradoresAdminV1CampoVazio_(valor){
  return valor==null||moradoresAdminV1Texto_(valor)==='';
}

function moradoresAdminV1ValoresEquivalentes_(campo,a,b){
  if(['cpf','cns','celular','telefoneContato'].indexOf(campo)!==-1)return moradoresAdminV1Digitos_(a)===moradoresAdminV1Digitos_(b);
  if(campo==='nascimento')return moradoresAdminV1DataBr_(a)===moradoresAdminV1DataBr_(b);
  return moradoresAdminV1NormalizarBusca_(moradoresAdminV1ValorComparacao_(a))===moradoresAdminV1NormalizarBusca_(moradoresAdminV1ValorComparacao_(b));
}

function moradoresAdminV1ValorComparacao_(valor){
  if(Object.prototype.toString.call(valor)==='[object Date]'&&!isNaN(valor.getTime()))return Utilities.formatDate(valor,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy HH:mm:ss');
  return moradoresAdminV1Texto_(valor);
}

function moradoresAdminV1EstaConsolidado_(morador,meta){
  return moradoresAdminV1Texto_(morador&&morador.status).toUpperCase()===TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS||
    moradoresAdminV1Texto_(meta&&meta.situacao).toUpperCase()===TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS;
}

function moradoresAdminV1SituacaoOculta_(situacao){
  var valor=moradoresAdminV1Texto_(situacao).toUpperCase();
  return [
    TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS,
    TACS_MORADORES_ADMIN_V1.REVERTED_IMPORT_STATUS
  ].indexOf(valor)!==-1;
}

function moradoresAdminV1EstaOculto_(morador,meta){
  return moradoresAdminV1SituacaoOculta_(morador&&morador.status)||
    moradoresAdminV1SituacaoOculta_(meta&&meta.situacao);
}

function moradoresAdminV1ValidarDadosMorador_(dados,permitirCpfLegado){
  if(!dados.nome)throw new Error('Informe o nome do morador.');
  if(!dados.nascimento)throw new Error('Informe uma data de nascimento válida.');
  if(!dados.sexo)throw new Error('Informe o sexo do morador.');
  if(!dados.endereco)throw new Error('Informe o endereço do morador.');
  if(
    dados.cpf&&
    (!/^[0-9]{11}$/.test(dados.cpf)||!moradoresAdminV1CpfValido_(dados.cpf))&&
    !(permitirCpfLegado&&/^[0-9]{10}$/.test(dados.cpf))
  )throw new Error('CPF inválido.');
  if(dados.cns&&!/^[0-9]{15}$/.test(dados.cns))throw new Error('O CNS deve conter 15 números.');
}

function moradoresAdminV1LocalizarFonte_(contexto){
  var ss=SpreadsheetApp.openById(moradoresAdminV1ResolverPlanilhaId_(contexto));
  var cache=moradoresAdminV1CacheScript_();
  var chaveCache=moradoresAdminV1ChaveCacheFonte_(contexto);

  if(cache){
    try{
      var salvo=cache.get(chaveCache);
      if(salvo){
        var memo=JSON.parse(salvo);
        var abaMemo=memo&&ss.getSheetByName(moradoresAdminV1Texto_(memo.aba));
        var headerMemo=Number(memo&&memo.headerRow);
        if(
          abaMemo&&
          headerMemo>=0&&
          headerMemo<TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS&&
          abaMemo.getLastRow()>headerMemo&&
          abaMemo.getLastColumn()>=20
        ){
          var cabecalhoMemo=abaMemo.getRange(
            headerMemo+1,
            1,
            1,
            abaMemo.getLastColumn()
          ).getDisplayValues()[0];
          var schemaMemo=moradoresAdminV1MapearSchemaReal_(cabecalhoMemo);
          if(schemaMemo.ok){
            return {
              ss:ss,
              sheet:abaMemo,
              headerRow:headerMemo,
              map:schemaMemo.map,
              prioridade:moradoresAdminV1PrioridadeAba_(abaMemo.getName()),
              cacheFonte:true
            };
          }
        }
        cache.remove(chaveCache);
      }
    }catch(erroCacheFonte){}
  }

  var candidatos=[];
  ss.getSheets().forEach(function(sheet){
    if([TACS_MORADORES_ADMIN_V1.META_SHEET,TACS_MORADORES_ADMIN_V1.AUDIT_SHEET].indexOf(sheet.getName())!==-1)return;
    var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
    if(lastRow<1||lastCol<20)return;
    var scan=sheet.getRange(1,1,Math.min(lastRow,TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
    for(var i=0;i<scan.length;i++){
      var schema=moradoresAdminV1MapearSchemaReal_(scan[i]);
      if(schema.ok){
        candidatos.push({ss:ss,sheet:sheet,headerRow:i,map:schema.map,prioridade:moradoresAdminV1PrioridadeAba_(sheet.getName())});
        break;
      }
    }
  });
  if(!candidatos.length)throw new Error('Não foi localizada uma aba com o schema oficial de 20 colunas de moradores. Nenhuma coluna será presumida.');
  candidatos.sort(function(a,b){return b.prioridade-a.prioridade;});
  if(candidatos.length>1&&candidatos[0].prioridade===candidatos[1].prioridade)throw new Error('Mais de uma aba possui o schema completo de moradores. Defina uma fonte única antes de continuar.');
  candidatos[0].cacheFonte=false;
  if(cache){
    try{
      cache.put(
        chaveCache,
        JSON.stringify({
          aba:candidatos[0].sheet.getName(),
          headerRow:candidatos[0].headerRow
        }),
        TACS_MORADORES_ADMIN_V1.SOURCE_CACHE_SECONDS
      );
    }catch(erroCacheFonteEscrita){}
  }
  return candidatos[0];
}

function moradoresAdminV1MapearSchemaReal_(headers){
  var porNome={},duplicados=[];
  for(var i=0;i<headers.length;i++){
    var key=moradoresAdminV1NormalizarChave_(headers[i]);
    if(!key)continue;
    if(Object.prototype.hasOwnProperty.call(porNome,key))duplicados.push(key);else porNome[key]=i;
  }
  var spec={idPortal:'IDPORTAL',id:'ID',cpf:'CPF',cns:'CNS',nome:'NOME',nascimento:'DATANASCIMENTO',idade:'IDADE',sexo:'SEXO',endereco:'ENDERECO',celular:'CELULAR',telefoneContato:'TELEFONECONTATO',microarea:'MICROAREA',equipe:'EQUIPE',origem:'ORIGEM',ultimaAtualizacao:'ULTIMAATUALIZACAO',status:'STATUS',consentimentoWhatsapp:'CONSENTIMENTOWHATSAPP',dataConsentimento:'DATACONSENTIMENTO',dataCadastroPortal:'DATACADASTROPORTAL',observacoes:'OBSERVACOES'};
  var map={},faltantes=[];
  Object.keys(spec).forEach(function(campo){
    var key=spec[campo];
    if(!Object.prototype.hasOwnProperty.call(porNome,key)){map[campo]=-1;faltantes.push(key);}else map[campo]=porNome[key];
  });
  return {ok:faltantes.length===0&&duplicados.length===0,map:map,faltantes:faltantes,duplicados:duplicados};
}

function moradoresAdminV1PrioridadeAba_(name){
  var key=moradoresAdminV1NormalizarChave_(name);
  if(key==='MORADORES')return 100;
  if(key.indexOf('MORADOR')!==-1)return 50;
  return 0;
}

function moradoresAdminV1MontarMorador_(display,raw,map){
  return {
    idPortal:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.idPortal)),
    id:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.id)),
    cpf:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.cpf)),
    cns:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.cns)),
    nome:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.nome)),
    nascimento:moradoresAdminV1FormatarNascimento_(moradoresAdminV1Valor_(raw,map.nascimento),moradoresAdminV1Valor_(display,map.nascimento)),
    idade:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.idade)),
    sexo:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.sexo)),
    endereco:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.endereco)),
    celular:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.celular)),
    telefoneContato:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.telefoneContato)),
    microarea:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.microarea)),
    equipe:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.equipe)),
    origem:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.origem)),
    ultimaAtualizacao:moradoresAdminV1Valor_(raw,map.ultimaAtualizacao)||moradoresAdminV1Valor_(display,map.ultimaAtualizacao),
    status:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.status))||'ATIVO',
    consentimentoWhatsapp:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.consentimentoWhatsapp))||'NÃO',
    dataConsentimento:moradoresAdminV1Valor_(raw,map.dataConsentimento)||moradoresAdminV1Valor_(display,map.dataConsentimento),
    dataCadastroPortal:moradoresAdminV1Valor_(raw,map.dataCadastroPortal)||moradoresAdminV1Valor_(display,map.dataCadastroPortal),
    observacoes:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.observacoes))
  };
}

function moradoresAdminV1EscreverLinha_(fonte,row,dados){
  if(row<=fonte.headerRow+1||row>fonte.sheet.getLastRow())throw new Error('Linha de morador inválida.');
  moradoresAdminV1EscreverCamposCidadao_(fonte.sheet,row,fonte.map,dados,false);
}

function moradoresAdminV1AdicionarLinha_(fonte,dados){
  var row=fonte.sheet.getLastRow()+1;
  if(row>fonte.sheet.getMaxRows())fonte.sheet.insertRowsAfter(fonte.sheet.getMaxRows(),1);
  moradoresAdminV1EscreverCamposCidadao_(fonte.sheet,row,fonte.map,dados,true);
  return {aba:fonte.sheet.getName(),linha:row};
}

function moradoresAdminV1EscreverCamposCidadao_(sheet,row,map,dados,novo){
  if(novo){
    moradoresAdminV1SetCell_(sheet,row,map.idPortal,dados.idPortal,'@');
    moradoresAdminV1SetCell_(sheet,row,map.id,dados.id,'@');
  }
  moradoresAdminV1SetCell_(sheet,row,map.cpf,dados.cpf,'@');
  moradoresAdminV1SetCell_(sheet,row,map.cns,dados.cns,'@');
  moradoresAdminV1SetCell_(sheet,row,map.nome,dados.nome);
  moradoresAdminV1SetCell_(sheet,row,map.nascimento,moradoresAdminV1DataObjeto_(dados.nascimento),'dd/MM/yyyy');
  moradoresAdminV1SetCell_(sheet,row,map.idade,dados.idade);
  moradoresAdminV1SetCell_(sheet,row,map.sexo,dados.sexo);
  moradoresAdminV1SetCell_(sheet,row,map.endereco,dados.endereco);
  moradoresAdminV1SetCell_(sheet,row,map.celular,dados.celular,'@');
  moradoresAdminV1SetCell_(sheet,row,map.telefoneContato,dados.telefoneContato,'@');
  moradoresAdminV1SetCell_(sheet,row,map.microarea,dados.microarea);
  moradoresAdminV1SetCell_(sheet,row,map.equipe,dados.equipe);
  if(novo)moradoresAdminV1SetCell_(sheet,row,map.origem,dados.origem);
  moradoresAdminV1SetCell_(sheet,row,map.ultimaAtualizacao,dados.ultimaAtualizacao,'dd/MM/yyyy HH:mm:ss');
  if(novo){
    moradoresAdminV1SetCell_(sheet,row,map.status,dados.status);
    moradoresAdminV1SetCell_(sheet,row,map.consentimentoWhatsapp,dados.consentimentoWhatsapp);
    moradoresAdminV1SetCell_(sheet,row,map.dataConsentimento,dados.dataConsentimento);
    moradoresAdminV1SetCell_(sheet,row,map.dataCadastroPortal,dados.dataCadastroPortal,'dd/MM/yyyy HH:mm');
  }
  moradoresAdminV1SetCell_(sheet,row,map.observacoes,dados.observacoes);
}

function moradoresAdminV1SetCell_(sheet,row,index,value,format){
  if(index<0)throw new Error('Tentativa de escrever em coluna não mapeada.');
  var cell=sheet.getRange(row,index+1);
  cell.setValue(value==null?'':value);
  if(format)cell.setNumberFormat(format);
}

function moradoresAdminV1LerPorOrigem_(ss,aba,row){
  var sheet=ss.getSheetByName(aba);
  if(!sheet||row<1||row>sheet.getLastRow()||[TACS_MORADORES_ADMIN_V1.META_SHEET,TACS_MORADORES_ADMIN_V1.AUDIT_SHEET].indexOf(aba)!==-1)return null;
  var lastCol=sheet.getLastColumn();
  var scan=sheet.getRange(1,1,Math.min(sheet.getLastRow(),TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
  var headerRow=-1,map=null;
  for(var i=0;i<scan.length;i++){
    var schema=moradoresAdminV1MapearSchemaReal_(scan[i]);
    if(schema.ok){headerRow=i;map=schema.map;break;}
  }
  if(headerRow<0||row<=headerRow+1)return null;
  var range=sheet.getRange(row,1,1,lastCol),raw=range.getValues()[0],display=range.getDisplayValues()[0];
  var morador=moradoresAdminV1MontarMorador_(display,raw,map);
  return morador.nome?{origem:{aba:aba,linha:row},morador:morador}:null;
}

function moradoresAdminV1LocalizarTodosPorDocumento_(fonte,cpf,cns){
  if(!cpf&&!cns)return [];
  if(!fonte||!fonte.sheet||typeof fonte.headerRow!=='number'||!fonte.map){
    throw new Error('A fonte oficial de moradores não foi informada para a busca por documento.');
  }
  var out=[];
  var sheet=fonte.sheet;
  var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  var count=lastRow-(fonte.headerRow+1);
  if(count<=0)return out;
  var range=sheet.getRange(fonte.headerRow+2,1,count,lastCol);
  var raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(moradoresAdminV1SituacaoOculta_(morador.status))continue;
    if((cpf&&morador.cpf===cpf)||(cns&&morador.cns===cns)){
      out.push({origem:{aba:sheet.getName(),linha:fonte.headerRow+2+i},morador:morador});
    }
  }
  return out;
}

/**
 * Confirma no servidor que o registro ainda pertence a um par consolidável.
 * O navegador não consegue ativar o modo especial de edição para uma linha
 * comum apenas enviando um sinal no payload.
 */
function moradoresAdminV1RegistroTemDuplicidadeConfirmada_(fonte,registro){
  if(!fonte||!registro||!registro.origem||!registro.morador)return false;
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1)return false;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    if(origem.aba===registro.origem.aba&&origem.linha===registro.origem.linha)continue;
    var outro=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!outro.nome||moradoresAdminV1SituacaoOculta_(outro.status))continue;
    try{
      moradoresAdminV1ValidarParConsolidacao_(registro.morador,outro);
      return true;
    }catch(erroConfirmacao){}
  }
  return false;
}

/**
 * Permite conservar temporariamente o CPF legado de 10 dígitos apenas quando
 * existe na fonte o CPF canônico válido com o único zero inicial perdido e o
 * par ainda coincide em nome e nascimento. A consolidação fará a correção.
 */
function moradoresAdminV1CpfLegadoExistenteConfirmado_(fonte,registro){
  var reduzido=moradoresAdminV1Digitos_(registro&&registro.morador&&registro.morador.cpf);
  if(!/^[0-9]{10}$/.test(reduzido))return false;
  var canonico='0'+reduzido;
  if(!moradoresAdminV1CpfValido_(canonico))return false;
  return moradoresAdminV1LocalizarTodosPorDocumento_(fonte,canonico,'').some(function(item){
    if(item.origem.aba===registro.origem.aba&&item.origem.linha===registro.origem.linha)return false;
    return (
      moradoresAdminV1CpfLegadoZeroInicial_(reduzido,item.morador.cpf)===canonico&&
      moradoresAdminV1NormalizarBusca_(registro.morador.nome)===moradoresAdminV1NormalizarBusca_(item.morador.nome)&&
      moradoresAdminV1DataBr_(registro.morador.nascimento)===moradoresAdminV1DataBr_(item.morador.nascimento)
    );
  });
}

function moradoresAdminV1LocalizarDuplicado_(fonte,cpf,cns,ignore){
  if(!cpf&&!cns)return false;
  return moradoresAdminV1LocalizarTodosPorDocumento_(fonte,cpf,cns).some(function(item){return !ignore||item.origem.aba!==ignore.aba||item.origem.linha!==ignore.linha;});
}

function moradoresAdminV1LocalizarPorIdentidade_(fonte,dados){
  var target=moradoresAdminV1ChaveIdentidade_(dados);
  if(!target)return null;
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1)return null;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol),raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(moradoresAdminV1SituacaoOculta_(morador.status))continue;
    if(moradoresAdminV1ChaveIdentidade_(morador)===target)return {origem:{aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i},morador:morador};
  }
  return null;
}

function moradoresAdminV1ProximoIdPortal_(fonte){
  var lastRow=fonte.sheet.getLastRow();
  if(lastRow<=fonte.headerRow+1)return 'TACS-000001';
  var values=fonte.sheet.getRange(fonte.headerRow+2,fonte.map.idPortal+1,lastRow-(fonte.headerRow+1),1).getDisplayValues();
  var maior=0;
  values.forEach(function(row){var m=moradoresAdminV1Texto_(row[0]).match(/^TACS-(\d{1,12})$/i);if(m)maior=Math.max(maior,Number(m[1]));});
  return 'TACS-'+('000000'+(maior+1)).slice(-6);
}

/** Cabeçalhos técnicos deliberadamente diferentes dos aliases da API pública antiga. */
function moradoresAdminV1MetaHeaders_(){
  return ['ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO','DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','ESCOPO_A','ESCOPO_B','ESCOPO_C','CRIADO_EM','ATUALIZADO_EM','OPERADOR_INTERNO','ORIGEM_CADASTRO'];
}
function moradoresAdminV1AuditHeaders_(){
  return ['EVENTO_INTERNO','ID_REFERENCIA','TIPO_EVENTO','ESCOPO_A','ESCOPO_B','ESCOPO_C','OPERADOR_INTERNO','CAMPOS_EVENTO','REGISTRADO_EM'];
}

function moradoresAdminV1GarantirMeta_(ss){
  var headers=moradoresAdminV1MetaHeaders_();
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_MORADORES_ADMIN_V1.META_SHEET);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }else{
    var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if(headers.some(function(v,i){return String(atual[i]||'')!==v;}))throw new Error('A aba de metadados existe com estrutura diferente. Nenhuma alteração foi feita.');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function moradoresAdminV1GarantirAuditoria_(ss){
  var headers=moradoresAdminV1AuditHeaders_();
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }else{
    var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if(headers.some(function(v,i){return String(atual[i]||'')!==v;}))throw new Error('A aba de auditoria existe com estrutura diferente. Nenhuma alteração foi feita.');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function moradoresAdminV1LerMetaMap_(ss,contexto){
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  var out={porChave:{},porOrigem:{},porId:{}};
  if(!sheet||sheet.getLastRow()<2)return out;
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,15).getValues();
  rows.forEach(function(row,index){
    var meta=moradoresAdminV1MetaDeLinha_(row,index+2);
    if(meta.areaId!==contexto.areaId)return;
    if(meta.chave){
      var atual=out.porChave[meta.chave];
      if(!atual||(
        moradoresAdminV1Texto_(atual.situacao).toUpperCase()===TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS&&
        moradoresAdminV1Texto_(meta.situacao).toUpperCase()!==TACS_MORADORES_ADMIN_V1.CONSOLIDATED_STATUS
      ))out.porChave[meta.chave]=meta;
    }
    if(meta.aba&&meta.linha>0)out.porOrigem[moradoresAdminV1ChaveOrigem_({aba:meta.aba,linha:meta.linha})]=meta;
    if(meta.moradorId)out.porId[meta.moradorId]=meta;
  });
  return out;
}

function moradoresAdminV1MetaDeLinha_(row,sheetRow){
  return {
    sheetRow:sheetRow,
    moradorId:moradoresAdminV1Texto_(row[0]),
    chave:moradoresAdminV1Texto_(row[1]),
    aba:moradoresAdminV1Texto_(row[2]),
    linha:Number(row[3]||0),
    cpf:moradoresAdminV1Digitos_(row[4]),
    cns:moradoresAdminV1Digitos_(row[5]),
    situacao:moradoresAdminV1Texto_(row[6])||'ATIVO',
    motivo:moradoresAdminV1Texto_(row[7]),
    agenteId:moradoresAdminV1Texto_(row[8]),
    areaId:moradoresAdminV1Texto_(row[9]),
    unidadeId:moradoresAdminV1Texto_(row[10]),
    criadoEm:row[11],
    atualizadoEm:row[12],
    operadorId:moradoresAdminV1Texto_(row[13]),
    origemCadastro:moradoresAdminV1Texto_(row[14])
  };
}

function moradoresAdminV1EncontrarMeta_(ss,chave,origem,moradorId,contexto){
  var map=moradoresAdminV1LerMetaMap_(ss,contexto);
  var origemKey=moradoresAdminV1ChaveOrigem_(origem);
  if(moradorId&&map.porId[moradorId]){
    var porId=map.porId[moradorId];
    if(!origemKey||moradoresAdminV1ChaveOrigem_({aba:porId.aba,linha:porId.linha})===origemKey)return porId;
  }
  if(origemKey&&map.porOrigem[origemKey])return map.porOrigem[origemKey];
  if(chave&&map.porChave[chave]){
    var porChave=map.porChave[chave];
    if(!origemKey||moradoresAdminV1ChaveOrigem_({aba:porChave.aba,linha:porChave.linha})===origemKey)return porChave;
  }
  return null;
}

function moradoresAdminV1UpsertMeta_(ss,input,contexto){
  var sheet=moradoresAdminV1GarantirMeta_(ss),map=moradoresAdminV1LerMetaMap_(ss,contexto),existing=null;
  var origemKey=moradoresAdminV1ChaveOrigem_(input.origem);
  if(input.moradorId&&map.porId[input.moradorId]){
    var porId=map.porId[input.moradorId];
    if(!origemKey||moradoresAdminV1ChaveOrigem_({aba:porId.aba,linha:porId.linha})===origemKey)existing=porId;
  }
  if(!existing&&origemKey&&map.porOrigem[origemKey])existing=map.porOrigem[origemKey];
  if(!existing&&input.chaveAnterior&&map.porChave[input.chaveAnterior]){
    var anterior=map.porChave[input.chaveAnterior];
    if(!origemKey||moradoresAdminV1ChaveOrigem_({aba:anterior.aba,linha:anterior.linha})===origemKey)existing=anterior;
  }
  if(!existing&&input.chave&&map.porChave[input.chave]){
    var atual=map.porChave[input.chave];
    if(!origemKey||moradoresAdminV1ChaveOrigem_({aba:atual.aba,linha:atual.linha})===origemKey)existing=atual;
  }
  var agora=new Date();
  var moradorId=(existing&&existing.moradorId)||input.moradorId||('MOR-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase());
  var criadoEm=(existing&&existing.criadoEm)||agora;
  var values=[moradorId,input.chave,input.origem.aba,input.origem.linha,input.dados.cpf||'',input.dados.cns||'',input.situacao||'ATIVO',input.motivo||'',contexto.agenteId,contexto.areaId,contexto.unidadeId,criadoEm,agora,contexto.operadorId,input.origemCadastro||'BASE_EXISTENTE'];
  var row=existing&&existing.sheetRow?existing.sheetRow:sheet.getLastRow()+1;
  sheet.getRange(row,1,1,15).setValues([values]);
  sheet.getRange(row,12,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return {moradorId:moradorId,chave:input.chave,aba:input.origem.aba,linha:input.origem.linha,situacao:input.situacao||'ATIVO',motivo:input.motivo||'',agenteId:contexto.agenteId,areaId:contexto.areaId,unidadeId:contexto.unidadeId,criadoEm:criadoEm,atualizadoEm:agora,operadorId:contexto.operadorId,origemCadastro:input.origemCadastro||'BASE_EXISTENTE'};
}

function moradoresAdminV1Auditar_(ss,input,contexto){
  var sheet=moradoresAdminV1GarantirAuditoria_(ss),agora=new Date();
  sheet.appendRow(['EVT-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),input.moradorId,input.acao,contexto.agenteId,contexto.areaId,contexto.unidadeId,contexto.operadorId,moradoresAdminV1Texto_(input.campos).slice(0,600),agora]);
  sheet.getRange(sheet.getLastRow(),9).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function moradoresAdminV1CamposAlterados_(antes,depois){
  if(!antes)return 'NOVO_CADASTRO';
  var campos=[];
  ['cpf','cns','nome','nascimento','idade','sexo','endereco','celular','telefoneContato','microarea','equipe','observacoes'].forEach(function(k){
    if(moradoresAdminV1Texto_(antes[k])!==moradoresAdminV1Texto_(depois[k]))campos.push(k);
  });
  return campos.length?campos.join(','):'SEM_ALTERACAO_DE_CONTEUDO';
}

function moradoresAdminV1ChaveRegistro_(morador){
  if(morador.cpf)return 'CPF:'+morador.cpf;
  if(morador.cns)return 'CNS:'+morador.cns;
  if(morador.idPortal)return 'ID_PORTAL:'+morador.idPortal;
  return 'SEM_DOC:'+moradoresAdminV1Hash_(moradoresAdminV1ChaveIdentidade_(morador));
}
function moradoresAdminV1ChaveIdentidade_(morador){
  return [moradoresAdminV1NormalizarBusca_(morador.nome),moradoresAdminV1DataBr_(morador.nascimento),moradoresAdminV1NormalizarBusca_(morador.endereco)].join('|');
}
function moradoresAdminV1ChaveOrigem_(origem){
  if(!origem||!origem.aba||!Number(origem.linha||0))return '';
  return moradoresAdminV1Texto_(origem.aba)+'#'+Number(origem.linha);
}
function moradoresAdminV1ComMeta_(morador,origem,meta,chave,contexto){
  var situacao=meta&&meta.situacao||morador.status||'ATIVO';
  return {
    moradorId:meta&&meta.moradorId||'',chave:chave,origemAba:origem.aba,origemLinha:origem.linha,
    idPortal:morador.idPortal,id:morador.id,cpf:morador.cpf,cns:morador.cns,nome:morador.nome,
    nascimento:morador.nascimento,idade:morador.idade,sexo:morador.sexo,endereco:morador.endereco,
    celular:morador.celular,telefoneContato:morador.telefoneContato,microarea:morador.microarea,
    equipe:morador.equipe,origem:morador.origem,ultimaAtualizacao:morador.ultimaAtualizacao,
    status:situacao,situacao:situacao,motivo:meta&&meta.motivo||'',
    consentimentoWhatsapp:morador.consentimentoWhatsapp,dataConsentimento:morador.dataConsentimento,
    dataCadastroPortal:morador.dataCadastroPortal,observacoes:morador.observacoes,
    agenteId:meta&&meta.agenteId||contexto.agenteId,areaId:meta&&meta.areaId||contexto.areaId,
    unidadeId:meta&&meta.unidadeId||contexto.unidadeId
  };
}

function moradoresAdminV1EscritaHabilitada_(){
  return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY);
}
function moradoresAdminV1SituacaoHabilitada_(){
  return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY);
}
function moradoresAdminV1AtivarSituacao_(contexto){
  if(contexto.perfil!=='ADMIN_GERAL'&&contexto.perfil!=='ADMIN_MUNICIPAL'){
    throw new Error('Somente a administração geral pode liberar a situação cadastral.');
  }
  moradoresAdminV1ExigirEscrita_();
  if(!moradoresAdminV1FiltroPublicoDisponivel_()){
    throw new Error('A situação não pode ser liberada sem o filtro público de cadastros ativos.');
  }

  var props=PropertiesService.getScriptProperties();
  props.setProperty(TACS_MORADORES_ADMIN_V1.PUBLIC_FILTER_PROPERTY,TACS_MORADORES_ADMIN_V1.PUBLIC_FILTER_VERSION);
  props.setProperty(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY,'TRUE');

  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  moradoresAdminV1Auditar_(fonte.ss,{
    moradorId:'CONFIGURACAO_GLOBAL',
    acao:'ATIVAR_SITUACAO_MORADORES',
    campos:'FILTRO_PUBLICO_ATIVO:'+TACS_MORADORES_ADMIN_V1.PUBLIC_FILTER_VERSION
  },contexto);
  SpreadsheetApp.flush();
  return {ok:true,message:'Situação cadastral liberada com filtro público ativo.',situacaoHabilitada:true,filtroPublicoSituacao:true};
}
function moradoresAdminV1FlagProperty_(nome){
  var valor=String(PropertiesService.getScriptProperties().getProperty(nome)||'').trim().toUpperCase();
  return ['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(valor)!==-1;
}
function moradoresAdminV1ExigirEscrita_(){
  if(!moradoresAdminV1EscritaHabilitada_())throw new Error('A escrita de moradores ainda está bloqueada pela etapa de estabilização.');
}
function moradoresAdminV1ExigirSituacao_(){
  moradoresAdminV1ExigirEscrita_();
  if(!moradoresAdminV1SituacaoHabilitada_())throw new Error('A mudança de situação está bloqueada na configuração do servidor.');
  if(!moradoresAdminV1FiltroPublicoDisponivel_())throw new Error('A mudança de situação foi bloqueada porque o filtro público não está disponível.');
}

function moradoresAdminV1ValidarSessao_(p){
  if(typeof tacsTerritorioV1ValidarSessaoToken_==='function'){
    var territorial=tacsTerritorioV1ValidarSessaoToken_(p,true);
    if(territorial)return territorial;
  }
  if(typeof profissionaisDinamicosV1ValidarSessao_==='function')return profissionaisDinamicosV1ValidarSessao_(p);
  if(typeof tacsPushV1ValidarSessao_==='function')return tacsPushV1ValidarSessao_(p);
  throw new Error('Não foi possível validar a sessão administrativa. Entre novamente com o PIN.');
}

function moradoresAdminV1ValidarRequestId_(valor){
  var id=moradoresAdminV1Texto_(valor);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação de moradores inválido.');
  return id;
}
function moradoresAdminV1GuardarResultado_(requestId,resultado){
  try{CacheService.getScriptCache().put(TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestId,JSON.stringify(resultado),TACS_MORADORES_ADMIN_V1.RESULT_SECONDS);}catch(erro){}
}
function moradoresAdminV1LerResultado_(requestId){
  try{
    var texto=CacheService.getScriptCache().get(TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestId);
    return texto?JSON.parse(texto):null;
  }catch(erro){
    return null;
  }
}

function moradoresAdminV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-moradores-tacs-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function moradoresAdminV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados),cb=moradoresAdminV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function moradoresAdminV1ParsePayload_(text){
  try{return JSON.parse(String(text||'{}'));}catch(erro){throw new Error('Dados enviados ao servidor são inválidos.');}
}
function moradoresAdminV1Valor_(arr,index){return !arr||index<0||index>=arr.length?'':arr[index];}
function moradoresAdminV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function moradoresAdminV1Digitos_(valor){return String(valor==null?'':valor).replace(/\D/g,'');}
function moradoresAdminV1Booleano_(valor){
  if(valor===true)return true;
  return ['TRUE','1','SIM','YES'].indexOf(moradoresAdminV1Texto_(valor).toUpperCase())!==-1;
}
function moradoresAdminV1NormalizarChave_(valor){
  var texto=String(valor==null?'':valor).toUpperCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^A-Z0-9]/g,'');
}
function moradoresAdminV1NormalizarBusca_(valor){
  var texto=String(valor==null?'':valor).toLowerCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^a-z0-9]+/g,' ').trim();
}
function moradoresAdminV1NormalizarSexo_(valor){
  var v=moradoresAdminV1Texto_(valor).toUpperCase();
  if(['M','MASCULINO','HOMEM'].indexOf(v)!==-1)return 'Masculino';
  if(['F','FEMININO','MULHER'].indexOf(v)!==-1)return 'Feminino';
  if(['OUTRO','OUTROS'].indexOf(v)!==-1)return 'Outro';
  return '';
}
function moradoresAdminV1NormalizarConsentimento_(valor){
  var v=moradoresAdminV1Texto_(valor).toUpperCase();
  if(['SIM','S','TRUE','1','YES'].indexOf(v)!==-1)return 'SIM';
  if(['NAO','NÃO','N','FALSE','0','NO'].indexOf(v)!==-1)return 'NÃO';
  return '';
}
function moradoresAdminV1DataBr_(valor){
  if(Object.prototype.toString.call(valor)==='[object Date]'&&!isNaN(valor.getTime()))return Utilities.formatDate(valor,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy');
  var texto=moradoresAdminV1Texto_(valor),match=texto.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if(!match){
    var iso=texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(iso)match=[texto,iso[3],iso[2],iso[1]];
  }
  if(!match)return '';
  var dia=Number(match[1]),mes=Number(match[2]),ano=Number(match[3]);
  var data=new Date(Date.UTC(ano,mes-1,dia,12,0,0));
  if(data.getUTCFullYear()!==ano||data.getUTCMonth()!==mes-1||data.getUTCDate()!==dia)return '';
  return ('0'+dia).slice(-2)+'/'+('0'+mes).slice(-2)+'/'+ano;
}
function moradoresAdminV1DataObjeto_(br){
  var civil=moradoresAdminV1DataBr_(br);
  if(!civil)return '';
  return Utilities.parseDate(
    civil+' 12:00:00',
    TACS_MORADORES_ADMIN_V1.TIMEZONE,
    'dd/MM/yyyy HH:mm:ss'
  );
}
function moradoresAdminV1FormatarNascimento_(raw,display){
  /*
   * Nascimento é uma data civil, sem horário. O texto exibido pela planilha
   * preserva exatamente o dia da célula e deve ser usado antes do objeto Date,
   * que pode avançar ou retroceder um dia quando atravessa fusos horários.
   */
  var exibida=moradoresAdminV1DataBr_(display);
  if(exibida)return exibida;
  var textoExibido=moradoresAdminV1Texto_(display);
  if(textoExibido)return textoExibido;
  if(Object.prototype.toString.call(raw)==='[object Date]'&&!isNaN(raw.getTime()))return Utilities.formatDate(raw,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy');
  return moradoresAdminV1DataBr_(raw)||moradoresAdminV1Texto_(raw);
}
function moradoresAdminV1IdadeTexto_(nascimento,referencia){
  var nascimentoBr=moradoresAdminV1DataBr_(nascimento);
  if(!nascimentoBr)return '';
  var hojeBr=Utilities.formatDate(
    referencia instanceof Date?referencia:new Date(),
    TACS_MORADORES_ADMIN_V1.TIMEZONE,
    'dd/MM/yyyy'
  );
  var nasc=nascimentoBr.split('/').map(Number);
  var hoje=hojeBr.split('/').map(Number);
  var anos=hoje[2]-nasc[2];
  var meses=hoje[1]-nasc[1];
  if(hoje[0]<nasc[0])meses--;
  if(meses<0){anos--;meses+=12;}
  if(anos<0)return '';
  if(anos===0){
    if(meses===0){
      var dias=Math.max(0,Math.floor((
        Date.UTC(hoje[2],hoje[1]-1,hoje[0])-
        Date.UTC(nasc[2],nasc[1]-1,nasc[0])
      )/86400000));
      return dias+' dia'+(dias===1?'':'s');
    }
    return meses+' '+(meses===1?'mês':'meses');
  }
  if(meses===0)return anos+' '+(anos===1?'ano':'anos');
  return anos+' '+(anos===1?'ano':'anos')+' e '+meses+' '+(meses===1?'mês':'meses');
}
function moradoresAdminV1Hash_(valor){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(valor),Utilities.Charset.UTF_8);
  return bytes.map(function(byte){var n=byte<0?byte+256:byte;return ('0'+n.toString(16)).slice(-2);}).join('').slice(0,24);
}
function moradoresAdminV1MensagemErro_(erro){
  return moradoresAdminV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500);
}
function moradoresAdminV1CpfValido_(cpf){
  var d=moradoresAdminV1Digitos_(cpf);
  if(!/^\d{11}$/.test(d)||/^(\d)\1{10}$/.test(d))return false;
  var soma=0,i;
  for(i=0;i<9;i++)soma+=Number(d.charAt(i))*(10-i);
  var primeiro=(soma*10)%11;
  if(primeiro===10)primeiro=0;
  if(primeiro!==Number(d.charAt(9)))return false;
  soma=0;
  for(i=0;i<10;i++)soma+=Number(d.charAt(i))*(11-i);
  var segundo=(soma*10)%11;
  if(segundo===10)segundo=0;
  return segundo===Number(d.charAt(10));
}

/** Diagnóstico seguro: somente leitura, sem criação de abas. */
function testarConfiguracaoMoradoresAdminPortalV1(){
  var contexto=moradoresAdminV1ResolverContexto_({perfil:'ADMIN_GERAL'}),fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var m=fonte.map;
  var resultado={
    ok:true,
    versao:TACS_MORADORES_ADMIN_V1.VERSAO,
    perfil:contexto.perfil,
    agenteId:contexto.agenteId,
    areaId:contexto.areaId,
    areaNome:contexto.areaNome,
    unidadeId:contexto.unidadeId,
    abaFonte:fonte.sheet.getName(),
    linhaCabecalho:fonte.headerRow+1,
    totalRegistros:moradoresAdminV1ContarOperacionais_(fonte,contexto),
    totalLinhasFonte:Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1)),
    totalColunas:fonte.sheet.getLastColumn(),
    schemaValido:true,
    modeloCadastro:'CIDADAO_INDIVIDUAL',
    vinculoFamiliar:'FORA_DO_ESCOPO',
    colunasMapeadas:{
      idPortal:m.idPortal+1,id:m.id+1,cpf:m.cpf+1,cns:m.cns+1,nome:m.nome+1,
      nascimento:m.nascimento+1,idade:m.idade+1,sexo:m.sexo+1,endereco:m.endereco+1,
      celular:m.celular+1,telefoneContato:m.telefoneContato+1,microarea:m.microarea+1,
      equipe:m.equipe+1,origem:m.origem+1,ultimaAtualizacao:m.ultimaAtualizacao+1,
      status:m.status+1,consentimentoWhatsapp:m.consentimentoWhatsapp+1,
      dataConsentimento:m.dataConsentimento+1,dataCadastroPortal:m.dataCadastroPortal+1,
      observacoes:m.observacoes+1
    },
    metaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET)),
    auditoriaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET)),
    escritaHabilitada:moradoresAdminV1EscritaHabilitada_(),
    situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_(),
    isolamentoFonte:'UMA_FONTE_POR_AREA',
    nenhumaAlteracaoRealizada:true
  };
  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Prepara metadados/auditoria e libera NOVO/EDITAR. */
function ativarEscritaMoradoresAdminPortalV1(){
  var teste=testarConfiguracaoMoradoresAdminPortalV1();
  var contexto=moradoresAdminV1ResolverContexto_({perfil:'ADMIN_GERAL'}),fonte=moradoresAdminV1LocalizarFonte_(contexto);
  moradoresAdminV1GarantirMeta_(fonte.ss);
  moradoresAdminV1GarantirAuditoria_(fonte.ss);
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'TRUE');
  return {ok:true,versao:teste.versao,message:'Escrita diária de moradores habilitada.',situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_()};
}

/** Executável pelo editor e também disponível ao administrador autenticado. */
function ativarSituacaoMoradoresAdminPortalV1(){
  var contexto=moradoresAdminV1ResolverContexto_({perfil:'ADMIN_GERAL'},TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID);
  return moradoresAdminV1AtivarSituacao_(contexto);
}

function desativarSituacaoMoradoresAdminPortalV1(){
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY,'FALSE');
  return {ok:true,message:'Situação cadastral bloqueada.'};
}

/**
 * Registra novas áreas sem aceitar IDs de planilha enviados pelo navegador.
 * Deve ser chamada no editor com um array de objetos. Todas as fontes são
 * validadas no schema A:T antes da configuração ser confirmada.
 */
function configurarAreasMoradoresAdminPortalV1(areas){
  if(!Array.isArray(areas)||!areas.length)throw new Error('Informe um array com as áreas que serão ativadas.');
  var props=PropertiesService.getScriptProperties();
  var anterior=props.getProperty(TACS_MORADORES_ADMIN_V1.AREAS_PROPERTY);
  props.setProperty(TACS_MORADORES_ADMIN_V1.AREAS_PROPERTY,JSON.stringify(areas));

  try{
    var catalogo=moradoresAdminV1CatalogoAreas_();
    catalogo.forEach(function(area){
      moradoresAdminV1LocalizarFonte_({
        perfil:'ADMIN_GERAL',operadorId:'ADMIN_GERAL',agenteId:area.agenteId,
        areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,
        planilhaId:area.planilhaId,permissoes:[]
      });
    });
    return {
      ok:true,
      message:'Áreas cadastradas e fontes validadas.',
      areas:catalogo.map(function(area){return {areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,agenteId:area.agenteId};})
    };
  }catch(erro){
    if(anterior==null)props.deleteProperty(TACS_MORADORES_ADMIN_V1.AREAS_PROPERTY);
    else props.setProperty(TACS_MORADORES_ADMIN_V1.AREAS_PROPERTY,anterior);
    throw erro;
  }
}

function listarAreasMoradoresAdminPortalV1(){
  return moradoresAdminV1CatalogoAreas_().map(function(area){
    return {areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,agenteId:area.agenteId,ativa:area.ativa,publica:area.publica};
  });
}

function desativarEscritaMoradoresAdminPortalV1(){
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'FALSE');
  return {ok:true,message:'Escrita de moradores bloqueada.'};
}
