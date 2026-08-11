/**
 * ZZZZ_17_TacsAreasAdminV1.gs
 * Portal TACS — cadastro territorial e acesso individual V1.0.0
 *
 * Mantém TACS e áreas em tabelas próprias, sem misturar esses dados à base de
 * moradores. Todos os campos cadastrais humanos podem ser corrigidos depois
 * de salvos. Somente os IDs técnicos permanecem estáveis para não quebrar
 * auditoria, sessões e referências.
 *
 * Regras:
 * - nenhuma exclusão física;
 * - CNS profissional não pode ficar repetido;
 * - uma área ativa exige TACS ativo, CNS, unidade e fonte A:T válida;
 * - cada área ativa usa uma planilha de moradores exclusiva;
 * - o TACS autenticado acessa apenas a própria área;
 * - o administrador geral pode cadastrar, editar, ativar e inativar;
 * - o PIN individual nunca é devolvido e é salvo somente como hash com salt.
 */
var TACS_TERRITORIO_V1 = Object.freeze({
  VERSAO:'1.0.0',
  TACS_SHEET:'TACS_PROFISSIONAIS_AREA',
  AREAS_SHEET:'TACS_AREAS',
  AUDIT_SHEET:'TACS_AUDIT_TERRITORIO',
  TIMEZONE:'America/Recife',
  AREAS_PROPERTY:'PORTAL_TACS_MORADORES_AREAS_JSON',
  PEPPER_PROPERTY:'PORTAL_TACS_TERRITORIO_PEPPER',
  RESULT_PREFIX:'tacs_territorio_v1_result_',
  RESULT_SECONDS:300,
  SESSION_PREFIX:'tacs_territorio_v1_sessao_',
  SESSION_SECONDS:21600,
  LOGIN_ATTEMPT_PREFIX:'tacs_territorio_v1_login_',
  LOGIN_MAX_FAILURES:5,
  LOGIN_BLOCK_SECONDS:900,
  TOKEN_PREFIX:'tacs_area_',
  MAX_TACS:500,
  MAX_AREAS:500,
  DEFAULT_PERMISSIONS:Object.freeze([
    'MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV'
  ]),
  TACS_HEADERS:Object.freeze([
    'TACS_ID','NOME_COMPLETO','CNS_PROFISSIONAL','CPF','MATRICULA','TELEFONE','EMAIL',
    'AREA_ID','UNIDADE_ID','MICROAREA','PERFIL','PERMISSOES','ATIVO','PIN_SALT',
    'PIN_HASH','CRIADO_EM','ATUALIZADO_EM','OPERADOR_ATUALIZACAO'
  ]),
  AREA_HEADERS:Object.freeze([
    'AREA_ID','AREA_NOME','UNIDADE_ID','UNIDADE_NOME','TACS_ID','PLANILHA_MORADORES_ID',
    'MICROAREA_PADRAO','EQUIPE','TAG_NOTIFICACAO','ATIVA','CONSULTA_POR_DOCUMENTO',
    'CRIADO_EM','ATUALIZADO_EM','OPERADOR_ATUALIZACAO'
  ]),
  AUDIT_HEADERS:Object.freeze([
    'EVENTO_ID','TIPO_EVENTO','REFERENCIA_ID','AREA_ID','OPERADOR_ID','ANTES_JSON',
    'DEPOIS_JSON','REGISTRADO_EM'
  ]),
  RESIDENT_HEADERS:Object.freeze([
    'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO',
    'CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO',
    'STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL',
    'OBSERVACOES'
  ])
});

var tacsTerritorioV1DoGetAnterior_;
var tacsTerritorioV1DoPostAnterior_;
var tacsTerritorioV1GetAnterior_;
var tacsTerritorioV1PostAnterior_;

(function instalarTacsTerritorioV1_(){
  if(typeof doGet==='function'){
    tacsTerritorioV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=tacsTerritorioV1TratarGet_(e);
      return resposta||tacsTerritorioV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    tacsTerritorioV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=tacsTerritorioV1TratarPost_(e);
      return resposta||tacsTerritorioV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    tacsTerritorioV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=tacsTerritorioV1TratarGet_(e);
      return resposta||tacsTerritorioV1GetAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    tacsTerritorioV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=tacsTerritorioV1TratarPost_(e);
      return resposta||tacsTerritorioV1PostAnterior_(e);
    };
  }
})();

function tacsTerritorioV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(tacsTerritorioV1Texto_(p.action).toLowerCase()!=='admin_territorio_result')return null;
  try{
    var requestId=tacsTerritorioV1ValidarRequestId_(p.requestId);
    var resultado=tacsTerritorioV1LerResultado_(requestId);
    return tacsTerritorioV1ResponderJson_({
      ok:true,pendente:!resultado,requestId:requestId,result:resultado||null
    },p.callback);
  }catch(erro){
    return tacsTerritorioV1ResponderJson_({ok:false,message:tacsTerritorioV1Erro_(erro)},p.callback);
  }
}

function tacsTerritorioV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=tacsTerritorioV1Texto_(p.action).toLowerCase();
  var aceitas=[
    'admin_territorio_login_tacs','admin_territorio_dados','admin_territorio_salvar_tacs',
    'admin_territorio_salvar_area','admin_territorio_validar_area',
    'admin_territorio_encerrar_sessao'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var resultado;
  try{
    if(action==='admin_territorio_login_tacs'){
      resultado=tacsTerritorioV1LoginTacs_(p);
    }else if(action==='admin_territorio_encerrar_sessao'){
      resultado=tacsTerritorioV1EncerrarSessao_(p);
    }else{
      var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
      if(action==='admin_territorio_dados')resultado=tacsTerritorioV1Dados_(acesso);
      else if(action==='admin_territorio_salvar_tacs'){
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1SalvarTacs_(p,acesso);
      }else if(action==='admin_territorio_salvar_area'){
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1SalvarArea_(p,acesso);
      }else{
        tacsTerritorioV1ExigirAdmin_(acesso);
        resultado=tacsTerritorioV1ValidarArea_(p,acesso);
      }
    }
  }catch(erro){
    resultado={ok:false,message:tacsTerritorioV1Erro_(erro)};
  }
  var requestId=tacsTerritorioV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))tacsTerritorioV1GuardarResultado_(requestId,resultado);
  return tacsTerritorioV1ResponderPost_(requestId,resultado);
}

function tacsTerritorioV1LoginTacs_(p){
  var cns=tacsTerritorioV1Digitos_(p.cns||p.cnsProfissional);
  var pin=tacsTerritorioV1Texto_(p.pin);
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  if(!/^[0-9]{15}$/.test(cns))throw new Error('Informe os 15 números do CNS profissional.');
  if(!/^[0-9]{4,8}$/.test(pin))throw new Error('Informe o PIN individual de 4 a 8 números.');
  if(!dispositivo)throw new Error('Identificação do aparelho ausente.');
  tacsTerritorioV1VerificarTentativasLogin_(cns);
  var tacs=tacsTerritorioV1EncontrarTacsPorCns_(cns);
  if(!tacs||!tacs.ativo){
    tacsTerritorioV1RegistrarFalhaLogin_(cns);
    throw new Error('CNS profissional ou PIN incorreto, ou acesso inativo.');
  }
  if(!tacs.pinSalt||!tacs.pinHash)throw new Error('O PIN individual deste TACS ainda não foi configurado pelo administrador.');
  if(!tacsTerritorioV1CompararSeguro_(tacs.pinHash,tacsTerritorioV1HashPin_(pin,tacs.pinSalt))){
    tacsTerritorioV1RegistrarFalhaLogin_(cns);
    throw new Error('CNS profissional ou PIN incorreto.');
  }
  tacsTerritorioV1LimparFalhasLogin_(cns);
  var area=tacsTerritorioV1EncontrarArea_(tacs.areaId);
  if(!area||!area.ativa||area.tacsId!==tacs.tacsId){
    throw new Error('Este TACS ainda não possui uma área ativa e validada.');
  }
  var token=TACS_TERRITORIO_V1.TOKEN_PREFIX+Utilities.getUuid().replace(/-/g,'');
  var sessao={
    tacsId:tacs.tacsId,cns:tacs.cnsProfissional,dispositivo:dispositivo,
    areaId:area.areaId,unidadeId:area.unidadeId,criadoEm:new Date().toISOString()
  };
  CacheService.getScriptCache().put(
    TACS_TERRITORIO_V1.SESSION_PREFIX+tacsTerritorioV1Hash_(token),
    JSON.stringify(sessao),TACS_TERRITORIO_V1.SESSION_SECONDS
  );
  return {
    ok:true,token:token,perfil:'TACS',tacsId:tacs.tacsId,nome:tacs.nomeCompleto,
    areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,
    expiraEm:Date.now()+TACS_TERRITORIO_V1.SESSION_SECONDS*1000
  };
}

/**
 * Retorna null silenciosamente quando a requisição não usa token territorial.
 * Se o token territorial estiver presente e for inválido, sempre bloqueia.
 */
function tacsTerritorioV1ValidarSessaoToken_(p,silencioso){
  p=p&&typeof p==='object'?p:{};
  var token=tacsTerritorioV1Texto_(p.territorioToken||p.token);
  if(token.indexOf(TACS_TERRITORIO_V1.TOKEN_PREFIX)!==0)return silencioso?null:null;
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  var raw='';
  try{
    raw=CacheService.getScriptCache().get(
      TACS_TERRITORIO_V1.SESSION_PREFIX+tacsTerritorioV1Hash_(token)
    )||'';
  }catch(erroCache){}
  if(!raw)throw new Error('A sessão individual expirou. Entre novamente com CNS e PIN.');
  var sessao;
  try{sessao=JSON.parse(raw);}catch(erroJson){throw new Error('A sessão individual é inválida.');}
  if(!dispositivo||sessao.dispositivo!==dispositivo)throw new Error('A sessão pertence a outro aparelho.');
  var tacs=tacsTerritorioV1EncontrarTacs_(sessao.tacsId);
  var area=tacs&&tacsTerritorioV1EncontrarArea_(tacs.areaId);
  if(!tacs||!tacs.ativo||!area||!area.ativa||area.tacsId!==tacs.tacsId){
    throw new Error('O acesso deste TACS foi desativado ou perdeu o vínculo com a área.');
  }
  return {
    ok:true,perfil:'TACS',operadorId:'TACS:'+tacs.tacsId,agenteId:tacs.tacsId,
    tacsId:tacs.tacsId,areaId:area.areaId,areaNome:area.areaNome,
    unidadeId:area.unidadeId,planilhaId:area.planilhaId,
    permissoes:tacs.permissoes.slice(),territorioToken:token
  };
}

function tacsTerritorioV1ValidarAcesso_(p,exigirAdmin){
  var individual=tacsTerritorioV1ValidarSessaoToken_(p,true);
  if(individual){
    if(exigirAdmin)throw new Error('Esta operação exige acesso de administrador geral.');
    return individual;
  }
  if(typeof profissionaisDinamicosV1ValidarSessao_!=='function'){
    throw new Error('A validação administrativa principal não está disponível.');
  }
  var base=profissionaisDinamicosV1ValidarSessao_(p);
  if(!base||base.ok!==true)throw new Error('Sessão administrativa inválida ou expirada.');
  return {
    ok:true,perfil:'ADMIN_GERAL',operadorId:tacsTerritorioV1Texto_(base.operadorId||'ADMIN_GERAL'),
    agenteId:tacsTerritorioV1Texto_(base.agenteId||'AG001'),
    areaId:tacsTerritorioV1Texto_(base.areaId||'JAPARANDUBA'),
    unidadeId:tacsTerritorioV1Texto_(base.unidadeId||'POSTO_MATIAS'),
    permissoes:['*'],base:base
  };
}

function tacsTerritorioV1ExigirAdmin_(acesso){
  if(!acesso||['ADMIN_GERAL','ADMIN_MUNICIPAL'].indexOf(acesso.perfil)===-1){
    throw new Error('Esta operação exige acesso de administrador geral.');
  }
}

function tacsTerritorioV1EncerrarSessao_(p){
  var token=tacsTerritorioV1Texto_(p.territorioToken||p.token);
  if(token.indexOf(TACS_TERRITORIO_V1.TOKEN_PREFIX)===0){
    try{CacheService.getScriptCache().remove(TACS_TERRITORIO_V1.SESSION_PREFIX+tacsTerritorioV1Hash_(token));}catch(erro){}
  }
  return {ok:true,message:'Sessão individual encerrada.'};
}

function tacsTerritorioV1Dados_(acesso){
  var admin=['ADMIN_GERAL','ADMIN_MUNICIPAL'].indexOf(acesso.perfil)!==-1;
  var tacs=tacsTerritorioV1LerTacs_();
  var areas=tacsTerritorioV1LerAreas_();
  if(!admin){
    tacs=tacs.filter(function(item){return item.tacsId===acesso.tacsId;});
    areas=areas.filter(function(item){return item.areaId===acesso.areaId;});
  }
  return {
    ok:true,versao:TACS_TERRITORIO_V1.VERSAO,perfil:acesso.perfil,
    podeAdministrar:admin,tacs:tacs.map(tacsTerritorioV1PublicarTacs_),
    areas:areas,isolamento:'UMA_PLANILHA_DE_MORADORES_POR_AREA',
    idsTecnicosImutaveis:true,camposCadastraisReeditaveis:true
  };
}

function tacsTerritorioV1SalvarTacs_(p,acesso){
  var body=tacsTerritorioV1Payload_(p.payload);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outro cadastro territorial está sendo atualizado. Tente novamente.');
  try{
    var tabela=tacsTerritorioV1TabelaTacs_(true);
    var id=tacsTerritorioV1Id_(body.tacsId);
    var existente=id?tacsTerritorioV1LinhaPor_(tabela,'TACS_ID',id):null;
    if(id&&!existente)throw new Error('O TACS informado não foi encontrado. Atualize o painel.');
    if(!id)id='TACS_'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
    var nome=tacsTerritorioV1Texto_(body.nomeCompleto||body.nome);
    var cns=tacsTerritorioV1Digitos_(body.cnsProfissional||body.cns);
    var cpf=tacsTerritorioV1Digitos_(body.cpf);
    var email=tacsTerritorioV1Texto_(body.email).toLowerCase();
    var ativo=tacsTerritorioV1Booleano_(body.ativo);
    var pin=tacsTerritorioV1Texto_(body.pin);
    if(!nome)throw new Error('Informe o nome completo do TACS.');
    if(!/^[0-9]{15}$/.test(cns)||/^(\d)\1{14}$/.test(cns))throw new Error('O CNS profissional deve conter 15 números válidos.');
    if(cpf&&(!/^[0-9]{11}$/.test(cpf)||(typeof moradoresAdminV1CpfValido_==='function'&&!moradoresAdminV1CpfValido_(cpf))))throw new Error('CPF do TACS inválido.');
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('E-mail do TACS inválido.');
    if(pin&&!/^[0-9]{4,8}$/.test(pin))throw new Error('O PIN individual deve conter de 4 a 8 números.');
    if(!existente&&ativo&&!pin)throw new Error('Defina um PIN individual para ativar o acesso do novo TACS.');
    var repetido=tacsTerritorioV1LinhaPor_(tabela,'CNS_PROFISSIONAL',cns);
    if(repetido&&repetido.row!==(existente&&existente.row))throw new Error('Este CNS profissional já pertence a outro TACS.');
    var agora=new Date();
    var anterior=existente?tacsTerritorioV1TacsDeLinha_(tabela,existente):null;
    var salt=anterior&&anterior.pinSalt||'';
    var hash=anterior&&anterior.pinHash||'';
    if(pin){salt=Utilities.getUuid().replace(/-/g,'');hash=tacsTerritorioV1HashPin_(pin,salt);}
    if(ativo&&(!salt||!hash))throw new Error('O TACS só pode ficar ativo depois que o PIN individual for definido.');
    var dados={
      TACS_ID:id,NOME_COMPLETO:nome,CNS_PROFISSIONAL:cns,CPF:cpf,
      MATRICULA:tacsTerritorioV1Texto_(body.matricula),
      TELEFONE:tacsTerritorioV1Digitos_(body.telefone),EMAIL:email,
      AREA_ID:tacsTerritorioV1Id_(body.areaId),UNIDADE_ID:tacsTerritorioV1Id_(body.unidadeId),
      MICROAREA:tacsTerritorioV1Texto_(body.microarea),PERFIL:'TACS',
      PERMISSOES:(Object.prototype.hasOwnProperty.call(body,'permissoes')
        ?tacsTerritorioV1Permissoes_(body.permissoes)
        :(anterior&&anterior.permissoes||TACS_TERRITORIO_V1.DEFAULT_PERMISSIONS.slice())).join(','),
      ATIVO:ativo,
      PIN_SALT:salt,PIN_HASH:hash,CRIADO_EM:anterior&&anterior.criadoEm||agora,
      ATUALIZADO_EM:agora,OPERADOR_ATUALIZACAO:acesso.operadorId
    };
    tacsTerritorioV1Gravar_(tabela,existente,dados);
    var depois=tacsTerritorioV1EncontrarTacs_(id);
    tacsTerritorioV1Auditar_('SALVAR_TACS',id,depois&&depois.areaId||'',acesso,anterior,depois);
    SpreadsheetApp.flush();
    return {ok:true,message:existente?'Cadastro do TACS atualizado.':'TACS cadastrado.',tacs:tacsTerritorioV1PublicarTacs_(depois)};
  }finally{lock.releaseLock();}
}

function tacsTerritorioV1SalvarArea_(p,acesso){
  var body=tacsTerritorioV1Payload_(p.payload);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Outra área está sendo atualizada. Tente novamente.');
  try{
    var tabela=tacsTerritorioV1TabelaAreas_(true);
    var id=tacsTerritorioV1Id_(body.areaId);
    var existente=id?tacsTerritorioV1LinhaPor_(tabela,'AREA_ID',id):null;
    if(id&&!existente){
      var areaPadrao=typeof moradoresAdminV1AreaPadrao_==='function'
        ?moradoresAdminV1AreaPadrao_()
        :null;
      if(!areaPadrao||tacsTerritorioV1Id_(areaPadrao.areaId)!==id){
        throw new Error('A área informada não foi encontrada. Atualize o painel.');
      }
    }
    var nome=tacsTerritorioV1Texto_(body.areaNome||body.nome);
    if(!id)id=tacsTerritorioV1Id_(nome);
    if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(id))throw new Error('Informe um nome que permita gerar um ID de área válido.');
    if(!existente&&tacsTerritorioV1LinhaPor_(tabela,'AREA_ID',id))throw new Error('Já existe uma área com esse identificador.');
    var unidadeId=tacsTerritorioV1Id_(body.unidadeId);
    var unidadeNome=tacsTerritorioV1Texto_(body.unidadeNome);
    var tacsId=tacsTerritorioV1Id_(body.tacsId);
    var planilhaEntrada=tacsTerritorioV1Texto_(body.planilhaId||body.planilhaMoradoresId);
    var planilhaId=planilhaEntrada?tacsTerritorioV1ExtrairPlanilhaId_(planilhaEntrada):'';
    var criarFonte=tacsTerritorioV1Booleano_(body.criarFonte);
    if(criarFonte&&planilhaId)throw new Error('Escolha entre informar uma planilha existente ou criar uma nova fonte.');
    var ativa=tacsTerritorioV1Booleano_(body.ativa);
    if(!nome||!unidadeId||!unidadeNome||!tacsId||(!planilhaId&&!criarFonte)){
      throw new Error('Nome da área, unidade, TACS responsável e planilha de moradores são obrigatórios.');
    }
    var tacs=tacsTerritorioV1EncontrarTacs_(tacsId);
    if(!tacs)throw new Error('O TACS responsável não foi encontrado. Cadastre-o primeiro.');
    if(ativa&&!tacs.ativo)throw new Error('Ative o cadastro do TACS antes de ativar a área.');
    if(ativa&&!/^[0-9]{15}$/.test(tacs.cnsProfissional))throw new Error('O TACS responsável precisa ter CNS profissional válido.');
    var areas=tacsTerritorioV1LerAreas_();
    areas.forEach(function(area){
      if(planilhaId&&area.areaId!==id&&area.planilhaId===planilhaId){
        throw new Error('A planilha de moradores já está vinculada à área '+area.areaNome+'.');
      }
      if(area.areaId!==id&&area.tacsId===tacsId){
        throw new Error('O TACS selecionado já está vinculado à área '+area.areaNome+'. Reatribua essa área antes de continuar.');
      }
    });
    if(criarFonte){
      var criada=SpreadsheetApp.create('MORADORES - '+nome);
      var aba=criada.getSheets()[0];
      aba.setName('MORADORES');
      aba.getRange(1,1,1,TACS_TERRITORIO_V1.RESIDENT_HEADERS.length).setValues([TACS_TERRITORIO_V1.RESIDENT_HEADERS.slice()]);
      aba.setFrozenRows(1);
      planilhaId=criada.getId();
    }
    if(ativa)tacsTerritorioV1ConferirFonte_(planilhaId);
    var agora=new Date();
    var anterior=existente?tacsTerritorioV1AreaDeLinha_(tabela,existente):null;
    var dados={
      AREA_ID:id,AREA_NOME:nome,UNIDADE_ID:unidadeId,UNIDADE_NOME:unidadeNome,
      TACS_ID:tacsId,PLANILHA_MORADORES_ID:planilhaId,
      MICROAREA_PADRAO:tacsTerritorioV1Texto_(body.microareaPadrao||body.microarea)||'1',
      EQUIPE:tacsTerritorioV1Texto_(body.equipe),TAG_NOTIFICACAO:'area_tacs='+id,
      ATIVA:ativa,
      CONSULTA_POR_DOCUMENTO:Object.prototype.hasOwnProperty.call(body,'consultaPorDocumento')
        ?tacsTerritorioV1Booleano_(body.consultaPorDocumento)
        :true,
      CRIADO_EM:anterior&&anterior.criadoEm||agora,ATUALIZADO_EM:agora,
      OPERADOR_ATUALIZACAO:acesso.operadorId
    };
    tacsTerritorioV1Gravar_(tabela,existente,dados);
    if(anterior&&anterior.tacsId&&anterior.tacsId!==tacsId){
      tacsTerritorioV1DesvincularTacs_(anterior.tacsId,id,acesso);
    }
    tacsTerritorioV1AtualizarVinculoTacs_(tacsId,id,unidadeId,acesso);
    tacsTerritorioV1SincronizarCatalogo_();
    var depois=tacsTerritorioV1EncontrarArea_(id);
    tacsTerritorioV1Auditar_('SALVAR_AREA',id,id,acesso,anterior,depois);
    SpreadsheetApp.flush();
    return {ok:true,message:existente?'Área atualizada e validada.':'Área cadastrada e validada.',area:depois};
  }finally{lock.releaseLock();}
}

function tacsTerritorioV1ValidarArea_(p,acesso){
  var id=tacsTerritorioV1Id_(p.areaId||tacsTerritorioV1Payload_(p.payload).areaId);
  var area=tacsTerritorioV1EncontrarArea_(id);
  if(!area)throw new Error('Área não encontrada.');
  var tacs=tacsTerritorioV1EncontrarTacs_(area.tacsId);
  if(!tacs||!tacs.ativo||!/^[0-9]{15}$/.test(tacs.cnsProfissional))throw new Error('O TACS responsável está ausente, inativo ou sem CNS válido.');
  if(tacs.areaId!==area.areaId)throw new Error('O vínculo territorial do TACS não corresponde a esta área. Edite e salve a área novamente.');
  var fonte=tacsTerritorioV1ConferirFonte_(area.planilhaId);
  return {ok:true,message:'Área, TACS, CNS, unidade e fonte A:T conferidos.',area:area,fonte:fonte};
}

function tacsTerritorioV1AtualizarVinculoTacs_(tacsId,areaId,unidadeId,acesso){
  var tabela=tacsTerritorioV1TabelaTacs_(true);
  var linha=tacsTerritorioV1LinhaPor_(tabela,'TACS_ID',tacsId);
  if(!linha)return;
  var anterior=tacsTerritorioV1TacsDeLinha_(tabela,linha);
  var dados={AREA_ID:areaId,UNIDADE_ID:unidadeId,ATUALIZADO_EM:new Date(),OPERADOR_ATUALIZACAO:acesso.operadorId};
  tacsTerritorioV1Gravar_(tabela,linha,dados,true);
  var depois=tacsTerritorioV1EncontrarTacs_(tacsId);
  tacsTerritorioV1Auditar_('VINCULAR_TACS_AREA',tacsId,areaId,acesso,anterior,depois);
}

function tacsTerritorioV1DesvincularTacs_(tacsId,areaId,acesso){
  var tabela=tacsTerritorioV1TabelaTacs_(true);
  var linha=tacsTerritorioV1LinhaPor_(tabela,'TACS_ID',tacsId);
  if(!linha)return;
  var anterior=tacsTerritorioV1TacsDeLinha_(tabela,linha);
  if(anterior.areaId!==areaId)return;
  tacsTerritorioV1Gravar_(tabela,linha,{
    AREA_ID:'',UNIDADE_ID:'',ATUALIZADO_EM:new Date(),
    OPERADOR_ATUALIZACAO:acesso.operadorId
  },true);
  var depois=tacsTerritorioV1EncontrarTacs_(tacsId);
  tacsTerritorioV1Auditar_('DESVINCULAR_TACS_AREA',tacsId,areaId,acesso,anterior,depois);
}

function tacsTerritorioV1SincronizarCatalogo_(){
  var areas=tacsTerritorioV1LerAreas_();
  var catalogo=areas.map(function(area){
    return {
      areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,
      agenteId:area.tacsId,planilhaId:area.planilhaId,ativa:area.ativa===true,
      publica:area.consultaPorDocumento!==false
    };
  });
  PropertiesService.getScriptProperties().setProperty(
    TACS_TERRITORIO_V1.AREAS_PROPERTY,JSON.stringify(catalogo)
  );
  return catalogo;
}

function tacsAreasV1ResolverFonteMoradores_(contexto){
  var area=tacsTerritorioV1EncontrarArea_(contexto&&contexto.areaId);
  return area&&area.ativa?area.planilhaId:'';
}

function tacsTerritorioV1ConferirFonte_(planilhaId){
  var ss;
  try{ss=SpreadsheetApp.openById(planilhaId);}catch(erro){throw new Error('Não foi possível abrir a planilha de moradores informada.');}
  var candidatas=[];
  ss.getSheets().forEach(function(sheet){
    if(sheet.getLastColumn()<20||sheet.getLastRow()<1)return;
    var linhas=Math.min(sheet.getLastRow(),12);
    var scan=sheet.getRange(1,1,linhas,sheet.getLastColumn()).getDisplayValues();
    for(var i=0;i<scan.length;i++){
      var normal=scan[i].map(tacsTerritorioV1Chave_);
      var ok=TACS_TERRITORIO_V1.RESIDENT_HEADERS.every(function(header){
        var chave=tacsTerritorioV1Chave_(header);
        return normal.indexOf(chave)!==-1&&normal.indexOf(chave)===normal.lastIndexOf(chave);
      });
      if(ok){candidatas.push({aba:sheet.getName(),linhaCabecalho:i+1,totalColunas:sheet.getLastColumn()});break;}
    }
  });
  if(candidatas.length!==1)throw new Error(candidatas.length?'Mais de uma aba possui o schema A:T. Defina uma fonte única.':'A planilha não possui uma aba com as 20 colunas oficiais A:T.');
  return {planilhaId:planilhaId,aba:candidatas[0].aba,linhaCabecalho:candidatas[0].linhaCabecalho,totalColunas:candidatas[0].totalColunas,schema:'20/20'};
}

function tacsTerritorioV1LerTacs_(){
  var tabela=tacsTerritorioV1TabelaTacs_(false);
  if(!tabela)return [];
  return tabela.rows.map(function(row){return tacsTerritorioV1TacsDeLinha_(tabela,row);}).filter(function(item){return !!item.tacsId;}).slice(0,TACS_TERRITORIO_V1.MAX_TACS);
}

function tacsTerritorioV1LerAreas_(){
  var tabela=tacsTerritorioV1TabelaAreas_(false);
  var areas=tabela?tabela.rows.map(function(row){return tacsTerritorioV1AreaDeLinha_(tabela,row);}).filter(function(item){return !!item.areaId;}):[];
  if(typeof moradoresAdminV1AreaPadrao_==='function'){
    var atual=moradoresAdminV1AreaPadrao_();
    var possuiPadrao=areas.some(function(area){return area.areaId===tacsTerritorioV1Id_(atual.areaId);});
    if(!possuiPadrao){
      areas.push({
        areaId:atual.areaId,areaNome:atual.areaNome,unidadeId:atual.unidadeId,
        unidadeNome:atual.unidadeId,tacsId:atual.agenteId,planilhaId:atual.planilhaId,
        microareaPadrao:'1',equipe:'USF MATIAS CDS',tagNotificacao:'area_tacs='+atual.areaId,
        ativa:true,consultaPorDocumento:true,origemConfiguracao:'CONFIGURACAO_ATUAL'
      });
    }
  }
  return areas.slice(0,TACS_TERRITORIO_V1.MAX_AREAS);
}

function tacsTerritorioV1EncontrarTacs_(id){
  id=tacsTerritorioV1Id_(id);
  var lista=tacsTerritorioV1LerTacs_();
  for(var i=0;i<lista.length;i++)if(lista[i].tacsId===id)return lista[i];
  return null;
}

function tacsTerritorioV1EncontrarTacsPorCns_(cns){
  cns=tacsTerritorioV1Digitos_(cns);
  var lista=tacsTerritorioV1LerTacs_();
  for(var i=0;i<lista.length;i++)if(lista[i].cnsProfissional===cns)return lista[i];
  return null;
}

function tacsTerritorioV1EncontrarArea_(id){
  id=tacsTerritorioV1Id_(id);
  var lista=tacsTerritorioV1LerAreas_();
  for(var i=0;i<lista.length;i++)if(lista[i].areaId===id)return lista[i];
  return null;
}

function tacsTerritorioV1PublicarTacs_(item){
  if(!item)return null;
  return {
    tacsId:item.tacsId,nomeCompleto:item.nomeCompleto,cnsProfissional:item.cnsProfissional,
    cpf:item.cpf,matricula:item.matricula,telefone:item.telefone,email:item.email,
    areaId:item.areaId,unidadeId:item.unidadeId,microarea:item.microarea,
    perfil:item.perfil,permissoes:item.permissoes.slice(),ativo:item.ativo,
    pinConfigurado:Boolean(item.pinHash),criadoEm:item.criadoEm,atualizadoEm:item.atualizadoEm
  };
}

function tacsTerritorioV1TacsDeLinha_(tabela,row){
  return {
    tacsId:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'TACS_ID')),
    nomeCompleto:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'NOME_COMPLETO')),
    cnsProfissional:tacsTerritorioV1Digitos_(tacsTerritorioV1Valor_(tabela,row,'CNS_PROFISSIONAL')),
    cpf:tacsTerritorioV1Digitos_(tacsTerritorioV1Valor_(tabela,row,'CPF')),
    matricula:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'MATRICULA')),
    telefone:tacsTerritorioV1Digitos_(tacsTerritorioV1Valor_(tabela,row,'TELEFONE')),
    email:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'EMAIL')),
    areaId:tacsTerritorioV1Id_(tacsTerritorioV1Valor_(tabela,row,'AREA_ID')),
    unidadeId:tacsTerritorioV1Id_(tacsTerritorioV1Valor_(tabela,row,'UNIDADE_ID')),
    microarea:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'MICROAREA')),
    perfil:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'PERFIL'))||'TACS',
    permissoes:tacsTerritorioV1Permissoes_(tacsTerritorioV1Valor_(tabela,row,'PERMISSOES')),
    ativo:tacsTerritorioV1Booleano_(tacsTerritorioV1Valor_(tabela,row,'ATIVO')),
    pinSalt:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'PIN_SALT')),
    pinHash:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'PIN_HASH')),
    criadoEm:tacsTerritorioV1Valor_(tabela,row,'CRIADO_EM'),
    atualizadoEm:tacsTerritorioV1Valor_(tabela,row,'ATUALIZADO_EM')
  };
}

function tacsTerritorioV1AreaDeLinha_(tabela,row){
  return {
    areaId:tacsTerritorioV1Id_(tacsTerritorioV1Valor_(tabela,row,'AREA_ID')),
    areaNome:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'AREA_NOME')),
    unidadeId:tacsTerritorioV1Id_(tacsTerritorioV1Valor_(tabela,row,'UNIDADE_ID')),
    unidadeNome:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'UNIDADE_NOME')),
    tacsId:tacsTerritorioV1Id_(tacsTerritorioV1Valor_(tabela,row,'TACS_ID')),
    planilhaId:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'PLANILHA_MORADORES_ID')),
    microareaPadrao:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'MICROAREA_PADRAO')),
    equipe:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'EQUIPE')),
    tagNotificacao:tacsTerritorioV1Texto_(tacsTerritorioV1Valor_(tabela,row,'TAG_NOTIFICACAO')),
    ativa:tacsTerritorioV1Booleano_(tacsTerritorioV1Valor_(tabela,row,'ATIVA')),
    consultaPorDocumento:tacsTerritorioV1Booleano_(tacsTerritorioV1Valor_(tabela,row,'CONSULTA_POR_DOCUMENTO')),
    criadoEm:tacsTerritorioV1Valor_(tabela,row,'CRIADO_EM'),
    atualizadoEm:tacsTerritorioV1Valor_(tabela,row,'ATUALIZADO_EM')
  };
}

function tacsTerritorioV1TabelaTacs_(criar){return tacsTerritorioV1Tabela_(TACS_TERRITORIO_V1.TACS_SHEET,TACS_TERRITORIO_V1.TACS_HEADERS,criar);}
function tacsTerritorioV1TabelaAreas_(criar){return tacsTerritorioV1Tabela_(TACS_TERRITORIO_V1.AREAS_SHEET,TACS_TERRITORIO_V1.AREA_HEADERS,criar);}

function tacsTerritorioV1Tabela_(nome,headers,criar){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(nome);
  if(!sheet&&!criar)return null;
  if(!sheet)sheet=ss.insertSheet(nome);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers.slice()]);
    sheet.setFrozenRows(1);
  }
  var atuais=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),headers.length)).getDisplayValues()[0];
  for(var h=0;h<headers.length;h++)if(tacsTerritorioV1Texto_(atuais[h])!==headers[h])throw new Error('A aba '+nome+' existe com estrutura diferente na coluna '+(h+1)+'.');
  var values=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues():[];
  var display=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getDisplayValues():[];
  var map={};headers.forEach(function(header,index){map[header]=index;});
  return {sheet:sheet,headers:headers.slice(),map:map,rows:values.map(function(value,index){return {row:index+2,values:value,display:display[index]};})};
}

function tacsTerritorioV1LinhaPor_(tabela,campo,valor){
  var index=tabela.map[campo];
  var alvo=campo.indexOf('_ID')!==-1?tacsTerritorioV1Id_(valor):tacsTerritorioV1Texto_(valor);
  for(var i=0;i<tabela.rows.length;i++){
    var atual=campo.indexOf('_ID')!==-1?tacsTerritorioV1Id_(tabela.rows[i].display[index]):tacsTerritorioV1Texto_(tabela.rows[i].display[index]);
    if(atual===alvo)return tabela.rows[i];
  }
  return null;
}

function tacsTerritorioV1Valor_(tabela,row,campo){
  var index=tabela.map[campo];
  return row.values[index]!==''&&row.values[index]!=null?row.values[index]:row.display[index];
}

function tacsTerritorioV1Gravar_(tabela,row,dados,parcial){
  var values=row?row.values.slice():new Array(tabela.headers.length).fill('');
  Object.keys(dados).forEach(function(campo){
    if(Object.prototype.hasOwnProperty.call(tabela.map,campo))values[tabela.map[campo]]=dados[campo];
  });
  var numero=row?row.row:tabela.sheet.getLastRow()+1;
  tabela.sheet.getRange(numero,1,1,tabela.headers.length).setValues([values]);
  var criado=tabela.map.CRIADO_EM;
  var atualizado=tabela.map.ATUALIZADO_EM;
  if(criado!=null)tabela.sheet.getRange(numero,criado+1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  if(atualizado!=null)tabela.sheet.getRange(numero,atualizado+1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return numero;
}

function tacsTerritorioV1Auditar_(tipo,referenciaId,areaId,acesso,antes,depois){
  var tabela=tacsTerritorioV1Tabela_(TACS_TERRITORIO_V1.AUDIT_SHEET,TACS_TERRITORIO_V1.AUDIT_HEADERS,true);
  var limpar=function(item){
    if(!item)return null;
    var out={};Object.keys(item).forEach(function(k){if(['pinSalt','pinHash'].indexOf(k)===-1)out[k]=item[k];});return out;
  };
  var agora=new Date();
  tacsTerritorioV1Gravar_(tabela,null,{
    EVENTO_ID:'TER-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),
    TIPO_EVENTO:tipo,REFERENCIA_ID:referenciaId,AREA_ID:areaId||'',
    OPERADOR_ID:acesso&&acesso.operadorId||'ADMIN_GERAL',
    ANTES_JSON:JSON.stringify(limpar(antes)).slice(0,45000),
    DEPOIS_JSON:JSON.stringify(limpar(depois)).slice(0,45000),REGISTRADO_EM:agora
  });
  tabela.sheet.getRange(tabela.sheet.getLastRow(),8).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function tacsTerritorioV1Planilha_(){
  if(typeof profissionaisDinamicosV1Planilha_==='function')return profissionaisDinamicosV1Planilha_();
  if(typeof getPlanilha==='function')return getPlanilha();
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error('A planilha administrativa do Portal TACS não está disponível.');
  return ss;
}

function tacsTerritorioV1HashPin_(pin,salt){
  var props=PropertiesService.getScriptProperties();
  var pepper=tacsTerritorioV1Texto_(props.getProperty(TACS_TERRITORIO_V1.PEPPER_PROPERTY));
  if(!pepper){pepper=Utilities.getUuid()+Utilities.getUuid();props.setProperty(TACS_TERRITORIO_V1.PEPPER_PROPERTY,pepper);}
  return tacsTerritorioV1Hash_(pepper+'|'+salt+'|'+pin);
}

function tacsTerritorioV1ChaveTentativasLogin_(cns){
  return TACS_TERRITORIO_V1.LOGIN_ATTEMPT_PREFIX+tacsTerritorioV1Hash_(cns);
}

function tacsTerritorioV1VerificarTentativasLogin_(cns){
  var raw='';
  try{raw=CacheService.getScriptCache().get(tacsTerritorioV1ChaveTentativasLogin_(cns))||'';}catch(erroCache){}
  if(!raw)return true;
  var estado={};
  try{estado=JSON.parse(raw);}catch(erroJson){return true;}
  if(Number(estado.bloqueadoAte||0)>Date.now()){
    throw new Error('Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.');
  }
  return true;
}

function tacsTerritorioV1RegistrarFalhaLogin_(cns){
  var cache=CacheService.getScriptCache();
  var chave=tacsTerritorioV1ChaveTentativasLogin_(cns);
  var estado={falhas:0,bloqueadoAte:0};
  try{
    var raw=cache.get(chave);
    if(raw)estado=JSON.parse(raw);
  }catch(erroLeitura){estado={falhas:0,bloqueadoAte:0};}
  estado.falhas=Number(estado.falhas||0)+1;
  if(estado.falhas>=TACS_TERRITORIO_V1.LOGIN_MAX_FAILURES){
    estado.bloqueadoAte=Date.now()+TACS_TERRITORIO_V1.LOGIN_BLOCK_SECONDS*1000;
  }
  cache.put(chave,JSON.stringify(estado),TACS_TERRITORIO_V1.LOGIN_BLOCK_SECONDS);
}

function tacsTerritorioV1LimparFalhasLogin_(cns){
  try{CacheService.getScriptCache().remove(tacsTerritorioV1ChaveTentativasLogin_(cns));}catch(erro){}
}

function tacsTerritorioV1Hash_(valor){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(valor),Utilities.Charset.UTF_8);
  return bytes.map(function(byte){var n=byte<0?byte+256:byte;return ('0'+n.toString(16)).slice(-2);}).join('');
}

function tacsTerritorioV1CompararSeguro_(a,b){
  a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;
  var diff=0;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}

function tacsTerritorioV1Permissoes_(valor){
  var lista=Array.isArray(valor)?valor:String(valor||'').split(/[;,]/);
  var permitidas=['MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV'];
  var out=[];
  lista.forEach(function(item){var p=tacsTerritorioV1Texto_(item).toUpperCase();if(permitidas.indexOf(p)!==-1&&out.indexOf(p)===-1)out.push(p);});
  return out;
}

function tacsTerritorioV1ExtrairPlanilhaId_(valor){
  var texto=tacsTerritorioV1Texto_(valor);
  var match=texto.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,200})/);
  var id=match?match[1]:texto;
  if(!/^[A-Za-z0-9_-]{20,200}$/.test(id))throw new Error('Informe o link ou ID válido da planilha de moradores.');
  return id;
}

function tacsTerritorioV1Id_(valor){
  var texto=tacsTerritorioV1Texto_(valor).toUpperCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}

function tacsTerritorioV1Chave_(valor){return tacsTerritorioV1Id_(valor).replace(/_/g,'');}
function tacsTerritorioV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function tacsTerritorioV1Digitos_(valor){return String(valor==null?'':valor).replace(/\D/g,'');}
function tacsTerritorioV1Booleano_(valor){return valor===true||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(tacsTerritorioV1Texto_(valor).toUpperCase())!==-1;}

function tacsTerritorioV1Payload_(texto){
  if(texto&&typeof texto==='object')return texto;
  try{return JSON.parse(String(texto||'{}'));}catch(erro){throw new Error('Os dados territoriais enviados são inválidos.');}
}

function tacsTerritorioV1ValidarRequestId_(valor){
  var id=tacsTerritorioV1Texto_(valor);if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação territorial inválido.');return id;
}

function tacsTerritorioV1GuardarResultado_(id,resultado){try{CacheService.getScriptCache().put(TACS_TERRITORIO_V1.RESULT_PREFIX+id,JSON.stringify(resultado),TACS_TERRITORIO_V1.RESULT_SECONDS);}catch(erro){}}
function tacsTerritorioV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_TERRITORIO_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(erro){return null;}}

function tacsTerritorioV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-territorio-tacs-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>'+
    'parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function tacsTerritorioV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados),cb=tacsTerritorioV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function tacsTerritorioV1Erro_(erro){return tacsTerritorioV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,700);}
