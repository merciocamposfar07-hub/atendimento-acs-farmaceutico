/**
 * ZZZZ_15_MoradoresAdminPortalV1.gs
 * Portal TACS — Administração de Moradores V1.2
 *
 * Modelo: cadastro individual de cidadão (uma pessoa por linha).
 * Vínculos familiares serão uma camada própria e não criam colunas artificiais
 * de mãe/pai na base MORADORES.
 *
 * Segurança:
 * - Japaranduba continua usando a mesma planilha já em produção;
 * - o escopo agente/área/unidade é resolvido no servidor;
 * - futuras áreas terão fonte própria de moradores;
 * - reconhece o schema real A:T pelo nome exato dos cabeçalhos;
 * - nunca adivinha coluna ausente;
 * - nenhuma exclusão física;
 * - escrita diária permanece bloqueada até validação real;
 * - saída/transferência/óbito permanecem bloqueados até o filtro público existir;
 * - CSV real permanece fora deste módulo até o CRUD diário estar estabilizado;
 * - não altera agendas, odontologia, profissionais, recados, campanhas ou push.
 */
var TACS_MORADORES_ADMIN_V1 = Object.freeze({
  VERSAO: '1.2.0',
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
  RESULT_PREFIX: 'tacs_moradores_v12_result_',
  RESULT_SECONDS: 300,
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
  if(action!=='admin_moradores_result')return null;
  try{
    var requestId=moradoresAdminV1ValidarRequestId_(p.requestId);
    var resultado=moradoresAdminV1LerResultado_(requestId);
    return moradoresAdminV1ResponderJson_({
      ok:true,pendente:!resultado,requestId:requestId,result:resultado||null
    },p.callback);
  }catch(erro){
    return moradoresAdminV1ResponderJson_({
      ok:false,message:moradoresAdminV1MensagemErro_(erro)
    },p.callback);
  }
}

function moradoresAdminV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=moradoresAdminV1Texto_(p.action).toLowerCase();
  if([
    'admin_moradores_status','admin_moradores_buscar',
    'admin_morador_salvar','admin_morador_situacao'
  ].indexOf(action)===-1)return null;

  var resultado;
  try{
    var sessao=moradoresAdminV1ValidarSessao_(p);
    var contexto=moradoresAdminV1ResolverContexto_(sessao);
    if(action==='admin_moradores_status'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=moradoresAdminV1Status_(contexto);
    }else if(action==='admin_moradores_buscar'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=moradoresAdminV1Buscar_(p.q||p.busca||'',contexto);
    }else if(action==='admin_morador_salvar'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_EDITAR');
      moradoresAdminV1ExigirEscrita_();
      resultado=moradoresAdminV1Salvar_(p,contexto);
    }else{
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_SITUACAO');
      moradoresAdminV1ExigirSituacao_();
      resultado=moradoresAdminV1Situacao_(p,contexto);
    }
  }catch(erro){
    resultado={ok:false,message:moradoresAdminV1MensagemErro_(erro)};
  }

  var requestId=moradoresAdminV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    moradoresAdminV1GuardarResultado_(requestId,resultado);
  }
  return moradoresAdminV1ResponderPost_(requestId,resultado);
}

function moradoresAdminV1ResolverContexto_(sessao){
  sessao=sessao&&typeof sessao==='object'?sessao:{};
  var props=PropertiesService.getScriptProperties();
  var escopo=sessao.escopo&&typeof sessao.escopo==='object'?sessao.escopo:{};
  var contexto={
    perfil:moradoresAdminV1Texto_(sessao.perfil||escopo.perfil||'ADMIN_GERAL').toUpperCase(),
    operadorId:moradoresAdminV1Texto_(sessao.operadorId||escopo.operadorId||props.getProperty(TACS_MORADORES_ADMIN_V1.GENERAL_ADMIN_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_OPERATOR_ID),
    agenteId:moradoresAdminV1Texto_(sessao.agenteId||escopo.agenteId||props.getProperty(TACS_MORADORES_ADMIN_V1.AGENT_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AGENT_ID),
    areaId:moradoresAdminV1Texto_(sessao.areaId||escopo.areaId||props.getProperty(TACS_MORADORES_ADMIN_V1.AREA_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID),
    areaNome:moradoresAdminV1Texto_(sessao.areaNome||escopo.areaNome||props.getProperty(TACS_MORADORES_ADMIN_V1.AREA_NAME_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_NAME),
    unidadeId:moradoresAdminV1Texto_(sessao.unidadeId||escopo.unidadeId||props.getProperty(TACS_MORADORES_ADMIN_V1.UNIT_PROPERTY)||TACS_MORADORES_ADMIN_V1.DEFAULT_UNIT_ID),
    permissoes:Array.isArray(sessao.permissoes)?sessao.permissoes.slice():(Array.isArray(escopo.permissoes)?escopo.permissoes.slice():[])
  };
  if(!contexto.operadorId||!contexto.agenteId||!contexto.areaId||!contexto.unidadeId){
    throw new Error('O escopo administrativo está incompleto.');
  }
  return contexto;
}

function moradoresAdminV1ExigirPermissao_(contexto,permissao){
  if(contexto.perfil==='ADMIN_GERAL'||contexto.perfil==='ADMIN_MUNICIPAL')return true;
  var permitidas=(contexto.permissoes||[]).map(function(x){
    return moradoresAdminV1Texto_(x).toUpperCase();
  });
  if(permitidas.indexOf(permissao)===-1){
    throw new Error('Seu acesso não possui permissão para esta operação.');
  }
  return true;
}

function moradoresAdminV1ResolverPlanilhaId_(contexto){
  if(typeof tacsAreasV1ResolverFonteMoradores_==='function'){
    var externo=moradoresAdminV1Texto_(tacsAreasV1ResolverFonteMoradores_(contexto));
    if(externo)return externo;
  }
  if(contexto.areaId!==TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID){
    throw new Error('Esta área ainda não possui uma fonte de moradores autorizada no servidor.');
  }
  return moradoresAdminV1Texto_(
    PropertiesService.getScriptProperties().getProperty(TACS_MORADORES_ADMIN_V1.RESIDENT_SOURCE_PROPERTY)||
    TACS_MORADORES_ADMIN_V1.DEFAULT_RESIDENT_SPREADSHEET_ID
  );
}

function moradoresAdminV1Status_(contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
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
    totalRegistros:Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1)),
    totalColunas:fonte.sheet.getLastColumn(),
    schemaValido:true,
    modeloCadastro:'CIDADAO_INDIVIDUAL',
    vinculoFamiliar:'CAMADA_SEPARADA_PLANEJADA',
    metaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET)),
    auditoriaExiste:Boolean(fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET)),
    escritaHabilitada:moradoresAdminV1EscritaHabilitada_(),
    situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_(),
    csvImportacao:'PREVIA_LOCAL_APENAS',
    isolamentoFonte:'UMA_FONTE_POR_AREA'
  };
}

function moradoresAdminV1Buscar_(busca,contexto){
  var q=moradoresAdminV1NormalizarBusca_(busca);
  if(q.length<2)throw new Error('Digite pelo menos 2 caracteres para buscar.');
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var lastRow=fonte.sheet.getLastRow();
  var lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1){
    return {ok:true,resultados:[],total:0,limitado:false,areaId:contexto.areaId};
  }
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues();
  var display=range.getDisplayValues();
  var resultados=[];
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    var hay=moradoresAdminV1NormalizarBusca_([
      morador.idPortal,morador.id,morador.nome,morador.cpf,morador.cns,
      morador.nascimento,morador.endereco,morador.celular,
      morador.telefoneContato,morador.microarea,morador.equipe,
      morador.status,morador.observacoes
    ].join(' '));
    if(hay.indexOf(q)===-1)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    var chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porChave[chave]||metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||null;
    resultados.push(moradoresAdminV1ComMeta_(morador,origem,meta,chave,contexto));
    if(resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS)break;
  }
  return {
    ok:true,resultados:resultados,total:resultados.length,
    limitado:resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS,
    areaId:contexto.areaId
  };
}

function moradoresAdminV1Salvar_(p,contexto){
  var body=moradoresAdminV1ParsePayload_(p.payload);
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var dados=moradoresAdminV1NormalizarDadosEntrada_(body,contexto);
  moradoresAdminV1ValidarDadosMorador_(dados);

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000)){
    throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  }

  try{
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);

    var origemAba=moradoresAdminV1Texto_(body.origemAba);
    var origemLinha=Number(body.origemLinha||0);
    var existing=null;

    if(origemAba&&origemLinha>0){
      existing=moradoresAdminV1LerPorOrigem_(fonte.ss,origemAba,origemLinha);
    }

    if(!existing&&(dados.cpf||dados.cns)){
      var porDocumento=moradoresAdminV1LocalizarTodosPorDocumento_(fonte.ss,dados.cpf,dados.cns);
      if(porDocumento.length>1){
        throw new Error('Há mais de um cadastro com este CPF/CNS. Faça a revisão antes de editar.');
      }
      if(porDocumento.length===1)existing=porDocumento[0];
    }

    if(!existing&&!dados.cpf&&!dados.cns){
      var possivel=moradoresAdminV1LocalizarPorIdentidade_(fonte,dados);
      if(possivel){
        throw new Error('Existe um possível cadastro com o mesmo nome, nascimento e endereço. Abra esse cadastro e revise antes de criar outro.');
      }
    }

    var ignorar=existing&&existing.origem?existing.origem:null;
    if(moradoresAdminV1LocalizarDuplicado_(fonte.ss,dados.cpf,dados.cns,ignorar)){
      throw new Error('Já existe outro cadastro com este CPF/CNS. Revise antes de salvar.');
    }

    var origem;
    var criado=false;
    var metaAnterior=null;
    var chaveAnterior='';
    var antes=null;

    if(existing){
      origem=existing.origem;
      antes=existing.morador;
      chaveAnterior=moradoresAdminV1ChaveRegistro_(existing.morador);
      metaAnterior=moradoresAdminV1EncontrarMeta_(
        fonte.ss,chaveAnterior,origem,moradoresAdminV1Texto_(body.moradorId),contexto
      );
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
      acao:criado?'CRIAR_MORADOR':'EDITAR_MORADOR',
      campos:criado?'NOVO_CADASTRO':moradoresAdminV1CamposAlterados_(antes,dados)
    },contexto);

    SpreadsheetApp.flush();
    return {
      ok:true,
      criado:criado,
      message:criado?'Morador cadastrado.':'Cadastro do morador atualizado.',
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
    nascimento:moradoresAdminV1DataBr_(body.nascimento),
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
    dataConsentimento:moradoresAdminV1Texto_(body.dataConsentimento),
    dataCadastroPortal:moradoresAdminV1Texto_(body.dataCadastroPortal),
    observacoes:moradoresAdminV1Texto_(body.observacoes).slice(0,1000)
  };
}

function moradoresAdminV1PreservarCamposSistema_(dados,anterior,novo,fonte){
  var agora=new Date();
  var out={};
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
  if(['ATIVO','FORA_DA_AREA','FALECIDO','TRANSFERIDO'].indexOf(situacao)===-1){
    throw new Error('Situação cadastral inválida.');
  }

  var origem={aba:moradoresAdminV1Texto_(body.origemAba),linha:Number(body.origemLinha||0)};
  if(!origem.aba||origem.linha<1)throw new Error('Origem do cadastro ausente.');

  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000)){
    throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  }

  try{
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);
    var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,origem.aba,origem.linha);
    if(!registro)throw new Error('O cadastro não foi localizado na planilha.');

    var antes=registro.morador.status||'ATIVO';
    registro.morador.status=situacao;
    registro.morador.ultimaAtualizacao=new Date();
    moradoresAdminV1SetCell_(fonte.sheet,origem.linha,fonte.map.status,situacao);
    moradoresAdminV1SetCell_(fonte.sheet,origem.linha,fonte.map.ultimaAtualizacao,new Date(),'dd/MM/yyyy');

    var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
    var anterior=moradoresAdminV1EncontrarMeta_(
      fonte.ss,chave,origem,moradoresAdminV1Texto_(body.moradorId),contexto
    );
    var meta=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:chave,
      chaveAnterior:chave,
      moradorId:moradoresAdminV1Texto_(body.moradorId)||(anterior&&anterior.moradorId)||'',
      origem:origem,
      dados:registro.morador,
      situacao:situacao,
      motivo:moradoresAdminV1Texto_(body.motivo),
      origemCadastro:(anterior&&anterior.origemCadastro)||'BASE_EXISTENTE'
    },contexto);

    moradoresAdminV1Auditar_(fonte.ss,{
      moradorId:meta.moradorId,
      acao:'ALTERAR_SITUACAO',
      campos:'STATUS:'+antes+'>'+situacao
    },contexto);

    SpreadsheetApp.flush();
    return {
      ok:true,
      message:'Situação cadastral atualizada.',
      morador:moradoresAdminV1ComMeta_(registro.morador,origem,meta,chave,contexto)
    };
  }finally{
    lock.releaseLock();
  }
}

function moradoresAdminV1ValidarDadosMorador_(dados){
  if(!dados.nome)throw new Error('Informe o nome do morador.');
  if(!dados.nascimento)throw new Error('Informe uma data de nascimento válida.');
  if(!dados.sexo)throw new Error('Informe o sexo do morador.');
  if(!dados.endereco)throw new Error('Informe o endereço do morador.');
  if(dados.cpf&&(!/^[0-9]{11}$/.test(dados.cpf)||!moradoresAdminV1CpfValido_(dados.cpf))){
    throw new Error('CPF inválido.');
  }
  if(dados.cns&&!/^[0-9]{15}$/.test(dados.cns)){
    throw new Error('O CNS deve conter 15 números.');
  }
}

function moradoresAdminV1LocalizarFonte_(contexto){
  var planilhaId=moradoresAdminV1ResolverPlanilhaId_(contexto);
  var ss=SpreadsheetApp.openById(planilhaId);
  var sheets=ss.getSheets();
  var candidatos=[];

  sheets.forEach(function(sheet){
    if([TACS_MORADORES_ADMIN_V1.META_SHEET,TACS_MORADORES_ADMIN_V1.AUDIT_SHEET].indexOf(sheet.getName())!==-1)return;
    var lastRow=sheet.getLastRow();
    var lastCol=sheet.getLastColumn();
    if(lastRow<2||lastCol<20)return;
    var scan=sheet.getRange(1,1,Math.min(lastRow,TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
    for(var i=0;i<scan.length;i++){
      var schema=moradoresAdminV1MapearSchemaReal_(scan[i]);
      if(schema.ok){
        candidatos.push({
          ss:ss,sheet:sheet,headerRow:i,map:schema.map,
          prioridade:moradoresAdminV1PrioridadeAba_(sheet.getName())
        });
        break;
      }
    }
  });

  if(!candidatos.length){
    throw new Error('Não foi localizada uma aba com o schema oficial de 20 colunas de moradores. Nenhuma coluna será presumida.');
  }

  candidatos.sort(function(a,b){return b.prioridade-a.prioridade;});
  if(candidatos.length>1&&candidatos[0].prioridade===candidatos[1].prioridade){
    throw new Error('Mais de uma aba possui o schema completo de moradores. Defina uma fonte única antes de continuar.');
  }
  return candidatos[0];
}

function moradoresAdminV1MapearSchemaReal_(headers){
  var porNome={};
  var duplicados=[];

  for(var i=0;i<headers.length;i++){
    var key=moradoresAdminV1NormalizarChave_(headers[i]);
    if(!key)continue;
    if(Object.prototype.hasOwnProperty.call(porNome,key)){
      duplicados.push(key);
    }else{
      porNome[key]=i;
    }
  }

  var spec={
    idPortal:'IDPORTAL', id:'ID', cpf:'CPF', cns:'CNS', nome:'NOME',
    nascimento:'DATANASCIMENTO', idade:'IDADE', sexo:'SEXO', endereco:'ENDERECO',
    celular:'CELULAR', telefoneContato:'TELEFONECONTATO', microarea:'MICROAREA',
    equipe:'EQUIPE', origem:'ORIGEM', ultimaAtualizacao:'ULTIMAATUALIZACAO',
    status:'STATUS', consentimentoWhatsapp:'CONSENTIMENTOWHATSAPP',
    dataConsentimento:'DATACONSENTIMENTO', dataCadastroPortal:'DATACADASTROPORTAL',
    observacoes:'OBSERVACOES'
  };

  var map={};
  var faltantes=[];
  Object.keys(spec).forEach(function(campo){
    var key=spec[campo];
    if(!Object.prototype.hasOwnProperty.call(porNome,key)){
      map[campo]=-1;
      faltantes.push(key);
    }else{
      map[campo]=porNome[key];
    }
  });

  return {
    ok:faltantes.length===0&&duplicados.length===0,
    map:map,
    faltantes:faltantes,
    duplicados:duplicados
  };
}

function moradoresAdminV1PrioridadeAba_(name){
  var key=moradoresAdminV1NormalizarChave_(name);
  if(key==='moradores')return 100;
  if(key.indexOf('morador')!==-1)return 50;
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
  if(row<=fonte.headerRow+1||row>fonte.sheet.getLastRow()){
    throw new Error('Linha de morador inválida.');
  }
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
  moradoresAdminV1SetCell_(sheet,row,map.ultimaAtualizacao,dados.ultimaAtualizacao,'dd/MM/yyyy');
  if(novo)moradoresAdminV1SetCell_(sheet,row,map.status,dados.status);
  if(novo)moradoresAdminV1SetCell_(sheet,row,map.consentimentoWhatsapp,dados.consentimentoWhatsapp);
  if(novo)moradoresAdminV1SetCell_(sheet,row,map.dataConsentimento,dados.dataConsentimento);
  if(novo)moradoresAdminV1SetCell_(sheet,row,map.dataCadastroPortal,dados.dataCadastroPortal,'dd/MM/yyyy HH:mm');
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
  if(!sheet||row<1||row>sheet.getLastRow()||[
    TACS_MORADORES_ADMIN_V1.META_SHEET,TACS_MORADORES_ADMIN_V1.AUDIT_SHEET
  ].indexOf(aba)!==-1)return null;

  var lastCol=sheet.getLastColumn();
  var scan=sheet.getRange(1,1,Math.min(sheet.getLastRow(),TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
  var headerRow=-1;
  var map=null;
  for(var i=0;i<scan.length;i++){
    var schema=moradoresAdminV1MapearSchemaReal_(scan[i]);
    if(schema.ok){headerRow=i;map=schema.map;break;}
  }
  if(headerRow<0||row<=headerRow+1)return null;

  var range=sheet.getRange(row,1,1,lastCol);
  var raw=range.getValues()[0];
  var display=range.getDisplayValues()[0];
  var morador=moradoresAdminV1MontarMorador_(display,raw,map);
  return morador.nome?{origem:{aba:aba,linha:row},morador:morador}:null;
}

function moradoresAdminV1LocalizarTodosPorDocumento_(ss,cpf,cns){
  if(!cpf&&!cns)return [];
  var out=[];
  ss.getSheets().forEach(function(sheet){
    if([TACS_MORADORES_ADMIN_V1.META_SHEET,TACS_MORADORES_ADMIN_V1.AUDIT_SHEET].indexOf(sheet.getName())!==-1)return;
    var lastRow=sheet.getLastRow();
    var lastCol=sheet.getLastColumn();
    if(lastRow<2||lastCol<20)return;
    var scan=sheet.getRange(1,1,Math.min(lastRow,TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
    var headerRow=-1;
    var map=null;
    for(var h=0;h<scan.length;h++){
      var schema=moradoresAdminV1MapearSchemaReal_(scan[h]);
      if(schema.ok){headerRow=h;map=schema.map;break;}
    }
    if(headerRow<0)return;
    var count=lastRow-(headerRow+1);
    if(count<=0)return;
    var range=sheet.getRange(headerRow+2,1,count,lastCol);
    var raw=range.getValues();
    var display=range.getDisplayValues();
    for(var i=0;i<display.length;i++){
      var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],map);
      if((cpf&&morador.cpf===cpf)||(cns&&morador.cns===cns)){
        out.push({origem:{aba:sheet.getName(),linha:headerRow+2+i},morador:morador});
      }
    }
  });
  return out;
}

function moradoresAdminV1LocalizarDuplicado_(ss,cpf,cns,ignore){
  if(!cpf&&!cns)return false;
  return moradoresAdminV1LocalizarTodosPorDocumento_(ss,cpf,cns).some(function(item){
    return !ignore||item.origem.aba!==ignore.aba||item.origem.linha!==ignore.linha;
  });
}

function moradoresAdminV1LocalizarPorIdentidade_(fonte,dados){
  var target=moradoresAdminV1ChaveIdentidade_(dados);
  if(!target)return null;
  var lastRow=fonte.sheet.getLastRow();
  var lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1)return null;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues();
  var display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(moradoresAdminV1ChaveIdentidade_(morador)===target){
      return {origem:{aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i},morador:morador};
    }
  }
  return null;
}

function moradoresAdminV1ProximoIdPortal_(fonte){
  var lastRow=fonte.sheet.getLastRow();
  if(lastRow<=fonte.headerRow+1)return 'TACS-000001';
  var values=fonte.sheet.getRange(
    fonte.headerRow+2,fonte.map.idPortal+1,lastRow-(fonte.headerRow+1),1
  ).getDisplayValues();
  var maior=0;
  values.forEach(function(row){
    var m=moradoresAdminV1Texto_(row[0]).match(/^TACS-(\d{1,12})$/i);
    if(m)maior=Math.max(maior,Number(m[1]));
  });
  return 'TACS-'+('000000'+(maior+1)).slice(-6);
}

function moradoresAdminV1MetaHeaders_(){
  return [
    'ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO',
    'DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','ESCOPO_A','ESCOPO_B',
    'ESCOPO_C','CRIADO_EM','ATUALIZADO_EM','OPERADOR_INTERNO','ORIGEM_CADASTRO'
  ];
}

function moradoresAdminV1AuditHeaders_(){
  return [
    'EVENTO_INTERNO','ID_REFERENCIA','TIPO_EVENTO','ESCOPO_A','ESCOPO_B',
    'ESCOPO_C','OPERADOR_INTERNO','CAMPOS_EVENTO','REGISTRADO_EM'
  ];
}

function moradoresAdminV1GarantirMeta_(ss){
  var headers=moradoresAdminV1MetaHeaders_();
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_MORADORES_ADMIN_V1.META_SHEET);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }else{
    var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if(headers.some(function(v,i){return String(atual[i]||'')!==v;})){
      throw new Error('A aba de metadados existe com estrutura diferente. Nenhuma alteração foi feita.');
    }
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
    if(headers.some(function(v,i){return String(atual[i]||'')!==v;})){
      throw new Error('A aba de auditoria existe com estrutura diferente. Nenhuma alteração foi feita.');
    }
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
    if(meta.chave)out.porChave[meta.chave]=meta;
    if(meta.aba&&meta.linha>0){
      out.porOrigem[moradoresAdminV1ChaveOrigem_({aba:meta.aba,linha:meta.linha})]=meta;
    }
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
  if(moradorId&&map.porId[moradorId])return map.porId[moradorId];
  if(chave&&map.porChave[chave])return map.porChave[chave];
  var origemKey=moradoresAdminV1ChaveOrigem_(origem);
  return origemKey&&map.porOrigem[origemKey]?map.porOrigem[origemKey]:null;
}

function moradoresAdminV1UpsertMeta_(ss,input,contexto){
  var sheet=moradoresAdminV1GarantirMeta_(ss);
  var map=moradoresAdminV1LerMetaMap_(ss,contexto);
  var existing=null;
  if(input.moradorId&&map.porId[input.moradorId])existing=map.porId[input.moradorId];
  else if(input.chaveAnterior&&map.porChave[input.chaveAnterior])existing=map.porChave[input.chaveAnterior];
  else if(input.chave&&map.porChave[input.chave])existing=map.porChave[input.chave];
  else{
    var origemKey=moradoresAdminV1ChaveOrigem_(input.origem);
    if(origemKey&&map.porOrigem[origemKey])existing=map.porOrigem[origemKey];
  }

  var agora=new Date();
  var moradorId=(existing&&existing.moradorId)||input.moradorId||(
    'MOR-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase()
  );
  var criadoEm=(existing&&existing.criadoEm)||agora;
  var values=[
    moradorId,input.chave,input.origem.aba,input.origem.linha,
    input.dados.cpf||'',input.dados.cns||'',input.situacao||'ATIVO',
    input.motivo||'',contexto.agenteId,contexto.areaId,contexto.unidadeId,
    criadoEm,agora,contexto.operadorId,input.origemCadastro||'BASE_EXISTENTE'
  ];
  var row=existing&&existing.sheetRow?existing.sheetRow:sheet.getLastRow()+1;
  sheet.getRange(row,1,1,15).setValues([values]);
  sheet.getRange(row,12,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return {
    moradorId:moradorId,chave:input.chave,aba:input.origem.aba,linha:input.origem.linha,
    situacao:input.situacao||'ATIVO',motivo:input.motivo||'',agenteId:contexto.agenteId,
    areaId:contexto.areaId,unidadeId:contexto.unidadeId,criadoEm:criadoEm,
    atualizadoEm:agora,operadorId:contexto.operadorId,
    origemCadastro:input.origemCadastro||'BASE_EXISTENTE'
  };
}

function moradoresAdminV1Auditar_(ss,input,contexto){
  var sheet=moradoresAdminV1GarantirAuditoria_(ss);
  var agora=new Date();
  sheet.appendRow([
    'EVT-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),
    input.moradorId,input.acao,contexto.agenteId,contexto.areaId,
    contexto.unidadeId,contexto.operadorId,
    moradoresAdminV1Texto_(input.campos).slice(0,600),agora
  ]);
  sheet.getRange(sheet.getLastRow(),9).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function moradoresAdminV1CamposAlterados_(antes,depois){
  if(!antes)return 'NOVO_CADASTRO';
  var campos=[];
  [
    'cpf','cns','nome','nascimento','idade','sexo','endereco','celular',
    'telefoneContato','microarea','equipe','observacoes'
  ].forEach(function(k){
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
  return [
    moradoresAdminV1NormalizarBusca_(morador.nome),
    moradoresAdminV1DataBr_(morador.nascimento),
    moradoresAdminV1NormalizarBusca_(morador.endereco)
  ].join('|');
}

function moradoresAdminV1ChaveOrigem_(origem){
  if(!origem||!origem.aba||!Number(origem.linha||0))return '';
  return moradoresAdminV1Texto_(origem.aba)+'#'+Number(origem.linha);
}

function moradoresAdminV1ComMeta_(morador,origem,meta,chave,contexto){
  return {
    moradorId:meta&&meta.moradorId||'',
    chave:chave,
    origemAba:origem.aba,
    origemLinha:origem.linha,
    idPortal:morador.idPortal,
    id:morador.id,
    cpf:morador.cpf,
    cns:morador.cns,
    nome:morador.nome,
    nascimento:morador.nascimento,
    idade:morador.idade,
    sexo:morador.sexo,
    endereco:morador.endereco,
    celular:morador.celular,
    telefoneContato:morador.telefoneContato,
    microarea:morador.microarea,
    equipe:morador.equipe,
    origem:morador.origem,
    ultimaAtualizacao:morador.ultimaAtualizacao,
    status:morador.status,
    consentimentoWhatsapp:morador.consentimentoWhatsapp,
    dataConsentimento:morador.dataConsentimento,
    dataCadastroPortal:morador.dataCadastroPortal,
    observacoes:morador.observacoes,
    agenteId:meta&&meta.agenteId||contexto.agenteId,
    areaId:meta&&meta.areaId||contexto.areaId,
    unidadeId:meta&&meta.unidadeId||contexto.unidadeId
  };
}

function moradoresAdminV1EscritaHabilitada_(){
  return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY);
}

function moradoresAdminV1SituacaoHabilitada_(){
  return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY);
}

function moradoresAdminV1FlagProperty_(nome){
  var valor=String(PropertiesService.getScriptProperties().getProperty(nome)||'').trim().toUpperCase();
  return ['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(valor)!==-1;
}

function moradoresAdminV1ExigirEscrita_(){
  if(!moradoresAdminV1EscritaHabilitada_()){
    throw new Error('A escrita de moradores ainda está bloqueada pela etapa de estabilização.');
  }
}

function moradoresAdminV1ExigirSituacao_(){
  moradoresAdminV1ExigirEscrita_();
  if(!moradoresAdminV1SituacaoHabilitada_()){
    throw new Error('A mudança de situação ainda está bloqueada até o filtro do Portal do Morador ser validado.');
  }
}

function moradoresAdminV1ValidarSessao_(p){
  if(typeof profissionaisDinamicosV1ValidarSessao_==='function'){
    return profissionaisDinamicosV1ValidarSessao_(p);
  }
  if(typeof tacsPushV1ValidarSessao_==='function'){
    return tacsPushV1ValidarSessao_(p);
  }
  throw new Error('Não foi possível validar a sessão administrativa. Entre novamente com o PIN.');
}

function moradoresAdminV1ValidarRequestId_(valor){
  var id=moradoresAdminV1Texto_(valor);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id)){
    throw new Error('Identificador da operação de moradores inválido.');
  }
  return id;
}

function moradoresAdminV1GuardarResultado_(requestId,resultado){
  try{
    CacheService.getScriptCache().put(
      TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestId,
      JSON.stringify(resultado),
      TACS_MORADORES_ADMIN_V1.RESULT_SECONDS
    );
  }catch(erro){}
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
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+
    JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function moradoresAdminV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados);
  var cb=moradoresAdminV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb)){
    return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function moradoresAdminV1ParsePayload_(text){
  try{return JSON.parse(String(text||'{}'));}
  catch(erro){throw new Error('Dados enviados ao servidor são inválidos.');}
}

function moradoresAdminV1Valor_(arr,index){
  return !arr||index<0||index>=arr.length?'':arr[index];
}

function moradoresAdminV1Texto_(valor){
  return String(valor==null?'':valor).replace(/\s+/g,' ').trim();
}

function moradoresAdminV1Digitos_(valor){
  return String(valor==null?'':valor).replace(/\D/g,'');
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
  if(Object.prototype.toString.call(valor)==='[object Date]'&&!isNaN(valor.getTime())){
    return Utilities.formatDate(valor,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy');
  }
  var texto=moradoresAdminV1Texto_(valor);
  var match=texto.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})$/);
  if(!match){
    var iso=texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(iso)match=[texto,iso[3],iso[2],iso[1]];
  }
  if(!match)return '';
  var dia=Number(match[1]);
  var mes=Number(match[2]);
  var ano=Number(match[3]);
  var data=new Date(ano,mes-1,dia,12,0,0);
  if(data.getFullYear()!==ano||data.getMonth()!==mes-1||data.getDate()!==dia)return '';
  return ('0'+dia).slice(-2)+'/'+('0'+mes).slice(-2)+'/'+ano;
}

function moradoresAdminV1DataObjeto_(br){
  var partes=moradoresAdminV1DataBr_(br).split('/');
  if(partes.length!==3)return '';
  return new Date(Number(partes[2]),Number(partes[1])-1,Number(partes[0]),12,0,0);
}

function moradoresAdminV1FormatarNascimento_(raw,display){
  if(Object.prototype.toString.call(raw)==='[object Date]'&&!isNaN(raw.getTime())){
    return Utilities.formatDate(raw,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy');
  }
  return moradoresAdminV1DataBr_(display||raw)||moradoresAdminV1Texto_(display||raw);
}

function moradoresAdminV1IdadeTexto_(nascimento,referencia){
  var dataNasc=moradoresAdminV1DataObjeto_(nascimento);
  if(Object.prototype.toString.call(dataNasc)!=='[object Date]'||isNaN(dataNasc.getTime()))return '';
  var hoje=referencia instanceof Date?referencia:new Date();
  var anos=hoje.getFullYear()-dataNasc.getFullYear();
  var meses=hoje.getMonth()-dataNasc.getMonth();
  if(hoje.getDate()<dataNasc.getDate())meses--;
  if(meses<0){anos--;meses+=12;}
  if(anos<0)return '';
  if(anos===0){
    if(meses===0){
      var dias=Math.max(0,Math.floor((hoje.getTime()-dataNasc.getTime())/86400000));
      return dias+' dia'+(dias===1?'':'s');
    }
    return meses+' '+(meses===1?'mês':'meses');
  }
  if(meses===0)return anos+' '+(anos===1?'ano':'anos');
  return anos+' '+(anos===1?'ano':'anos')+' e '+meses+' '+(meses===1?'mês':'meses');
}

function moradoresAdminV1Hash_(valor){
  var bytes=Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,String(valor),Utilities.Charset.UTF_8
  );
  return bytes.map(function(byte){
    var n=byte<0?byte+256:byte;
    return ('0'+n.toString(16)).slice(-2);
  }).join('').slice(0,24);
}

function moradoresAdminV1MensagemErro_(erro){
  return moradoresAdminV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500);
}

function moradoresAdminV1CpfValido_(cpf){
  var d=moradoresAdminV1Digitos_(cpf);
  if(!/^\d{11}$/.test(d)||/^(\d)\1{10}$/.test(d))return false;
  var soma=0;
  var i;
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

/** Diagnóstico seguro: somente leitura e sem criação de abas. */
function testarConfiguracaoMoradoresAdminPortalV1(){
  var contexto=moradoresAdminV1ResolverContexto_({perfil:'ADMIN_GERAL'});
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
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
    totalRegistros:Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1)),
    totalColunas:fonte.sheet.getLastColumn(),
    schemaValido:true,
    modeloCadastro:'CIDADAO_INDIVIDUAL',
    vinculoFamiliar:'CAMADA_SEPARADA_PLANEJADA',
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

/**
 * Só executar depois de diagnóstico e busca real aprovados.
 * Libera apenas NOVO/EDITAR; situação continua bloqueada.
 */
function ativarEscritaMoradoresAdminPortalV1(){
  var teste=testarConfiguracaoMoradoresAdminPortalV1();
  var contexto=moradoresAdminV1ResolverContexto_({perfil:'ADMIN_GERAL'});
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  moradoresAdminV1GarantirMeta_(fonte.ss);
  moradoresAdminV1GarantirAuditoria_(fonte.ss);
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'TRUE');
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY,'FALSE');
  return {
    ok:true,versao:teste.versao,
    message:'Escrita diária de moradores habilitada. Situação cadastral continua bloqueada.',
    situacaoContinuaBloqueada:true
  };
}

function desativarEscritaMoradoresAdminPortalV1(){
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'FALSE');
  return {ok:true,message:'Escrita de moradores bloqueada.'};
}
