/**
 * ZZZZ_51_AcessoUnicoConectaV1.gs
 * Conecta Saúde Comunitária — entrada única Administrador | TACS | Morador V1.0.0
 *
 * Camada aditiva. Não altera permissões, isolamento territorial, agendas,
 * distribuição de vagas nem as rotas canônicas já existentes.
 */
var TACS_ACESSO_UNICO_CONECTA_V1 = Object.freeze({
  VERSAO:'1.0.0',
  ACCESS_SHEET:'CONECTA_ACESSO_MORADOR',
  ACCESS_HEADERS:Object.freeze([
    'ACESSO_ID','AREA_ID','ORIGEM_ABA','ORIGEM_LINHA','DISPOSITIVO',
    'PIN_SALT','PIN_HASH','STATUS','NOTIFICACOES_ATIVAS','SUBSCRIPTION_ID',
    'CRIADO_EM','ATUALIZADO_EM','ULTIMO_ACESSO_EM','NOTIFICACOES_EM'
  ]),
  PENDING_SHEET:'CONECTA_PENDENCIAS_CADASTRO',
  PENDING_HEADERS:Object.freeze([
    'PENDENCIA_ID','AREA_ID','CPF','DATA_NASCIMENTO','NOME_INFORMADO',
    'DISPOSITIVO','STATUS','CRIADO_EM','RESOLVIDO_EM','DETALHE'
  ]),
  AUDIT_SHEET:'CONECTA_ACESSO_AUDITORIA',
  AUDIT_HEADERS:Object.freeze([
    'EVENTO_ID','TIPO','AREA_ID','REFERENCIA_ID','DISPOSITIVO_REF','DETALHE','REGISTRADO_EM'
  ]),
  RESULT_PREFIX:'conecta_acesso_result_',
  RESULT_SECONDS:300,
  CANDIDATE_PREFIX:'conecta_candidato_',
  CANDIDATE_SECONDS:900,
  SESSION_PREFIX:'conecta_morador_sessao_',
  SESSION_SECONDS:43200,
  RATE_PREFIX:'conecta_acesso_rate_',
  RATE_SECONDS:900,
  RATE_MAX:30,
  TOKEN_PREFIX:'conecta_morador_'
});

var acessoUnicoV1DoGetAnterior_;
var acessoUnicoV1DoPostAnterior_;
var acessoUnicoV1GetAnterior_;
var acessoUnicoV1PostAnterior_;

(function instalarAcessoUnicoConectaV1_(){
  if(typeof doGet==='function'){
    acessoUnicoV1DoGetAnterior_=doGet;
    doGet=function(e){
      var r=acessoUnicoV1TratarGet_(e);
      return r||acessoUnicoV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    acessoUnicoV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=acessoUnicoV1TratarPost_(e);
      return r||acessoUnicoV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    acessoUnicoV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var r=acessoUnicoV1TratarGet_(e);
      return r||acessoUnicoV1GetAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    acessoUnicoV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var r=acessoUnicoV1TratarPost_(e);
      return r||acessoUnicoV1PostAnterior_(e);
    };
  }
})();

function acessoUnicoV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=acessoUnicoV1Texto_(p.action).toLowerCase();
  if(action==='publico_acesso_morador_status'){
    try{return acessoUnicoV1ResponderJson_(acessoUnicoV1StatusDispositivo_(p),p.callback);}
    catch(erro){return acessoUnicoV1ResponderJson_({ok:false,message:acessoUnicoV1Erro_(erro)},p.callback);}
  }
  if(action!=='publico_acesso_result')return null;
  try{
    var id=acessoUnicoV1RequestId_(p.requestId);
    var result=acessoUnicoV1LerResultado_(id);
    return acessoUnicoV1ResponderJson_({ok:true,pendente:!result,requestId:id,result:result||null},p.callback);
  }catch(erroResultado){
    return acessoUnicoV1ResponderJson_({ok:false,message:acessoUnicoV1Erro_(erroResultado)},p.callback);
  }
}

function acessoUnicoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=acessoUnicoV1Texto_(p.action).toLowerCase();
  var aceitas=[
    'publico_acesso_morador_identificar',
    'publico_acesso_morador_nascimento',
    'publico_acesso_morador_nome',
    'publico_acesso_morador_ativar',
    'publico_acesso_morador_login',
    'publico_acesso_morador_notificacao',
    'publico_acesso_recuperar_pin',
    'admin_acesso_pendencias'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var result;
  try{
    if(action.indexOf('publico_')===0)acessoUnicoV1Limitar_(p.dispositivo||'');
    if(action==='publico_acesso_morador_identificar')result=acessoUnicoV1IdentificarCpf_(p);
    else if(action==='publico_acesso_morador_nascimento')result=acessoUnicoV1IdentificarNascimento_(p);
    else if(action==='publico_acesso_morador_nome')result=acessoUnicoV1IdentificarNome_(p);
    else if(action==='publico_acesso_morador_ativar')result=acessoUnicoV1AtivarMorador_(p);
    else if(action==='publico_acesso_morador_login')result=acessoUnicoV1LoginMorador_(p);
    else if(action==='publico_acesso_morador_notificacao')result=acessoUnicoV1ConfirmarNotificacao_(p);
    else if(action==='publico_acesso_recuperar_pin')result=acessoUnicoV1RecuperarPin_(p);
    else result=acessoUnicoV1PendenciasAdmin_(p);
  }catch(erro){
    result={ok:false,message:acessoUnicoV1Erro_(erro)};
  }
  var requestId=acessoUnicoV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))acessoUnicoV1GuardarResultado_(requestId,result);
  return acessoUnicoV1ResponderPost_(requestId,result);
}

function acessoUnicoV1Contexto_(areaSolicitada){
  var area=acessoUnicoV1Area_(areaSolicitada);
  if(typeof identificacaoFamiliarPublicaV1Contexto_==='function')return identificacaoFamiliarPublicaV1Contexto_(area);
  var areas=moradoresAdminV1AreasPublicas_(area);
  if(areas.length!==1)throw new Error('Área pública não autorizada.');
  var a=areas[0];
  return {perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:a.agenteId,areaId:a.areaId,areaNome:a.areaNome,unidadeId:a.unidadeId,planilhaId:a.planilhaId,permissoes:[]};
}

function acessoUnicoV1ListaMoradores_(contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var last=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn(),out=[];
  if(last<=fonte.headerRow+1)return {fonte:fonte,rows:out};
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,last-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues();
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    var chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||metaMap.porChave[chave]||null;
    if(typeof moradoresAdminV1EstaOculto_==='function'&&moradoresAdminV1EstaOculto_(morador,meta))continue;
    if(typeof moradoresAdminV1EstaOculto_!=='function'&&moradoresAdminV1SituacaoOculta_(morador.status))continue;
    out.push({fonte:fonte,morador:morador,origem:origem,meta:meta,chave:chave});
  }
  return {fonte:fonte,rows:out};
}

function acessoUnicoV1PorCpf_(contexto,cpf){
  var lista=acessoUnicoV1ListaMoradores_(contexto).rows.filter(function(x){return moradoresAdminV1Digitos_(x.morador.cpf)===cpf;});
  if(lista.length>1)throw new Error('O CPF aparece em mais de um cadastro da área e precisa de conferência administrativa.');
  return lista[0]||null;
}

function acessoUnicoV1PorNascimento_(contexto,cpf,nascimento,nome){
  var alvoData=moradoresAdminV1DataBr_(nascimento);
  if(!alvoData)throw new Error('Informe uma data de nascimento válida.');
  var alvoNome=nome?moradoresAdminV1NormalizarBusca_(nome):'';
  return acessoUnicoV1ListaMoradores_(contexto).rows.filter(function(x){
    var atualCpf=moradoresAdminV1Digitos_(x.morador.cpf);
    if(atualCpf&&atualCpf!==cpf)return false;
    if(moradoresAdminV1DataBr_(x.morador.nascimento)!==alvoData)return false;
    if(alvoNome&&moradoresAdminV1NormalizarBusca_(x.morador.nome)!==alvoNome)return false;
    return true;
  });
}

function acessoUnicoV1CriarCandidato_(contexto,registro,cpf,dispositivo){
  var token='cand_'+Utilities.getUuid().replace(/-/g,'')+'_'+Date.now().toString(36);
  CacheService.getScriptCache().put(
    TACS_ACESSO_UNICO_CONECTA_V1.CANDIDATE_PREFIX+token,
    JSON.stringify({
      areaId:contexto.areaId,origemAba:registro.origem.aba,origemLinha:registro.origem.linha,
      cpf:cpf,dispositivo:dispositivo
    }),
    TACS_ACESSO_UNICO_CONECTA_V1.CANDIDATE_SECONDS
  );
  return token;
}

function acessoUnicoV1LerCandidato_(token){
  token=acessoUnicoV1Texto_(token);
  if(!/^cand_[A-Za-z0-9_]{20,180}$/.test(token))throw new Error('A confirmação do cadastro é inválida ou expirou.');
  var raw=CacheService.getScriptCache().get(TACS_ACESSO_UNICO_CONECTA_V1.CANDIDATE_PREFIX+token);
  if(!raw)throw new Error('A confirmação do cadastro expirou. Recomece pelo CPF.');
  return JSON.parse(raw);
}

function acessoUnicoV1IdentificarCpf_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var cpf=acessoUnicoV1Cpf_(p.cpf||p.documento);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var acesso=acessoUnicoV1AcessoDoDispositivo_(contexto.areaId,dispositivo);
  if(acesso)return {ok:true,etapa:'PIN',configurado:true,notificacoesAtivas:acesso.notificacoesAtivas===true};
  var registro=acessoUnicoV1PorCpf_(contexto,cpf);
  if(!registro)return {ok:true,etapa:'NASCIMENTO',encontrado:false,message:'CPF ainda não localizado nesta área. Informe a data de nascimento para localizar o cadastro antigo.'};
  return {
    ok:true,etapa:'CONFIRMAR',encontrado:true,nome:registro.morador.nome,
    candidato:acessoUnicoV1CriarCandidato_(contexto,registro,cpf,dispositivo),
    message:'Cadastro localizado.'
  };
}

function acessoUnicoV1IdentificarNascimento_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var cpf=acessoUnicoV1Cpf_(p.cpf);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var nascimento=moradoresAdminV1DataBr_(p.nascimento||p.dataNascimento);
  if(!nascimento)throw new Error('Informe a data de nascimento no formato DD/MM/AAAA.');
  var encontrados=acessoUnicoV1PorNascimento_(contexto,cpf,nascimento,'');
  if(encontrados.length===1){
    return {
      ok:true,etapa:'CONFIRMAR',encontrado:true,nome:encontrados[0].morador.nome,
      candidato:acessoUnicoV1CriarCandidato_(contexto,encontrados[0],cpf,dispositivo),
      message:'Cadastro localizado pela data de nascimento.'
    };
  }
  if(encontrados.length>1)return {ok:true,etapa:'NOME',encontrado:false,multiplos:true,message:'Há mais de uma pessoa com essa data de nascimento. Informe o nome completo.'};
  return {
    ok:true,etapa:'CRIAR_PIN_PENDENTE',encontrado:false,
    message:'Não foi possível estabelecer uma correspondência segura. O acesso aos serviços continuará e a conferência cadastral ficará pendente para a administração.'
  };
}

function acessoUnicoV1IdentificarNome_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var cpf=acessoUnicoV1Cpf_(p.cpf);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var nascimento=moradoresAdminV1DataBr_(p.nascimento||p.dataNascimento);
  var nome=acessoUnicoV1Texto_(p.nome);
  if(nome.length<5)throw new Error('Informe o nome completo.');
  var encontrados=acessoUnicoV1PorNascimento_(contexto,cpf,nascimento,nome);
  if(encontrados.length===1){
    return {
      ok:true,etapa:'CONFIRMAR',encontrado:true,nome:encontrados[0].morador.nome,
      candidato:acessoUnicoV1CriarCandidato_(contexto,encontrados[0],cpf,dispositivo),
      message:'Cadastro localizado e pronto para confirmação.'
    };
  }
  return {
    ok:true,etapa:'CRIAR_PIN_PENDENTE',encontrado:false,
    message:'O cadastro não pôde ser confirmado automaticamente. Você poderá continuar usando os serviços; a regularização ficará registrada como pendência.'
  };
}

function acessoUnicoV1AtivarMorador_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var cpf=acessoUnicoV1Cpf_(p.cpf);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var pin=acessoUnicoV1NovoPin_(p.novoPin||p.pin,p.confirmacao||p.confirmarPin);
  var registro=null,pendenciaId='',mensagem='';
  var candidato=acessoUnicoV1Texto_(p.candidato);
  if(candidato){
    var dados=acessoUnicoV1LerCandidato_(candidato);
    if(dados.areaId!==contexto.areaId||dados.cpf!==cpf||dados.dispositivo!==dispositivo)throw new Error('A confirmação não corresponde a este aparelho/cadastro.');
    var fonte=moradoresAdminV1LocalizarFonte_(contexto);
    if(dados.origemAba!==fonte.sheet.getName()||Number(dados.origemLinha)<fonte.headerRow+2)throw new Error('O cadastro confirmado não pertence à fonte atual.');
    var lido=moradoresAdminV1LerPorOrigem_(fonte.ss,dados.origemAba,Number(dados.origemLinha));
    if(!lido||!lido.morador)throw new Error('Cadastro não localizado.');
    registro={fonte:fonte,morador:lido.morador,origem:lido.origem};
    var atualCpf=moradoresAdminV1Digitos_(registro.morador.cpf);
    if(atualCpf&&atualCpf!==cpf){
      pendenciaId=acessoUnicoV1CriarPendencia_(contexto,cpf,p.nascimento,p.nome,dispositivo,'CPF diferente do documento já registrado no cadastro localizado.');
      registro=null;
    }else{
      if(!atualCpf){
        if(acessoUnicoV1CpfUsadoEmOutraPessoa_(contexto,cpf,registro.origem))throw new Error('Este CPF já pertence a outro cadastro e não pode ser vinculado automaticamente.');
        registro.morador.cpf=cpf;
        registro.morador.ultimaAtualizacao=new Date();
        moradoresAdminV1EscreverLinha_(registro.fonte,registro.origem.linha,registro.morador);
        if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);
        try{moradoresAdminV1Auditar_(registro.fonte.ss,{moradorId:registro.morador.idPortal||registro.morador.id||'SEM_ID',acao:'CPF_VINCULADO_PRIMEIRO_ACESSO',campos:'cpf'},contexto);}catch(ignorarAuditoria){}
        SpreadsheetApp.flush();
        mensagem='Cadastro localizado. CPF vinculado e salvo.';
      }else mensagem='Cadastro localizado e confirmado.';
    }
    try{CacheService.getScriptCache().remove(TACS_ACESSO_UNICO_CONECTA_V1.CANDIDATE_PREFIX+candidato);}catch(e){}
  }else{
    pendenciaId=acessoUnicoV1CriarPendencia_(contexto,cpf,p.nascimento,p.nome,dispositivo,'Primeiro acesso sem correspondência cadastral segura.');
    mensagem='Acesso liberado. A conferência cadastral foi enviada para a administração.';
  }
  var acesso=acessoUnicoV1SalvarAcesso_(contexto,registro,dispositivo,pin,pendenciaId);
  var sessao=acessoUnicoV1CriarSessaoMorador_(acesso);
  var perfil=acessoUnicoV1PerfilAcesso_(contexto,acesso);
  acessoUnicoV1Auditar_(contexto,'ATIVAR_MORADOR',acesso.acessoId,dispositivo,pendenciaId?'PENDENTE':'CADASTRO_CONFIRMADO');
  return {
    ok:true,etapa:'NOTIFICACOES',token:sessao.token,expiraEm:sessao.expiraEm,
    areaId:contexto.areaId,areaNome:contexto.areaNome,pendenciaId:pendenciaId,
    notificacoesAtivas:acesso.notificacoesAtivas===true,message:mensagem,
    morador:perfil.morador,familiaId:perfil.familiaId,membros:perfil.membros
  };
}

function acessoUnicoV1LoginMorador_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var pin=acessoUnicoV1Pin_(p.pin);
  var lista=acessoUnicoV1Acessos_().filter(function(a){return a.areaId===contexto.areaId&&a.dispositivo===dispositivo&&a.status==='ATIVO';});
  lista.sort(function(a,b){return acessoUnicoV1DataMs_(b.atualizadoEm)-acessoUnicoV1DataMs_(a.atualizadoEm);});
  var acesso=null;
  for(var i=0;i<lista.length;i++){
    if(acessoUnicoV1CompararSeguro_(lista[i].pinHash,acessoUnicoV1HashPin_(pin,lista[i].pinSalt))){acesso=lista[i];break;}
  }
  if(!acesso)throw new Error('PIN incorreto ou este aparelho ainda não concluiu o primeiro acesso.');
  acessoUnicoV1AtualizarUltimoAcesso_(acesso);
  var sessao=acessoUnicoV1CriarSessaoMorador_(acesso);
  var perfil=acessoUnicoV1PerfilAcesso_(contexto,acesso);
  acessoUnicoV1Auditar_(contexto,'LOGIN_MORADOR',acesso.acessoId,dispositivo,'PIN');
  return {
    ok:true,token:sessao.token,expiraEm:sessao.expiraEm,areaId:contexto.areaId,areaNome:contexto.areaNome,
    notificacoesAtivas:acesso.notificacoesAtivas===true,subscriptionId:acesso.subscriptionId||'',
    morador:perfil.morador,familiaId:perfil.familiaId,membros:perfil.membros
  };
}

function acessoUnicoV1ConfirmarNotificacao_(p){
  var sessao=acessoUnicoV1ValidarSessaoMorador_(p);
  var sub=acessoUnicoV1Texto_(p.subscriptionId).toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sub))throw new Error('A inscrição de notificações ainda não está pronta.');
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_HEADERS,true);
  var row=acessoUnicoV1LinhaPor_(tabela,'ACESSO_ID',sessao.acessoId);
  if(!row)throw new Error('O acesso deste aparelho não foi localizado.');
  acessoUnicoV1Gravar_(tabela,row,{NOTIFICACOES_ATIVAS:true,SUBSCRIPTION_ID:sub,NOTIFICACOES_EM:new Date(),ATUALIZADO_EM:new Date()});
  SpreadsheetApp.flush();
  return {ok:true,notificacoesAtivas:true,message:'Notificações ativadas e confirmadas neste aparelho.'};
}

function acessoUnicoV1RecuperarPin_(p){
  var perfil=acessoUnicoV1Texto_(p.perfil).toUpperCase();
  var cpf=acessoUnicoV1Cpf_(p.cpf);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var novo=acessoUnicoV1NovoPin_(p.novoPin||p.pin,p.confirmacao||p.confirmarPin);
  if(perfil==='TACS')return acessoUnicoV1RecuperarPinTacs_(cpf,novo,dispositivo);
  if(perfil==='MORADOR')return acessoUnicoV1RecuperarPinMorador_(cpf,novo,dispositivo,p.areaId||p.area||'');
  if(perfil==='ADMIN'||perfil==='ADMINISTRADOR'||perfil==='ADMIN_GERAL')return acessoUnicoV1RecuperarPinAdmin_(cpf,novo,dispositivo);
  throw new Error('Perfil de recuperação inválido.');
}

function acessoUnicoV1RecuperarPinTacs_(cpf,novo,dispositivo){
  var tabela=tacsTerritorioV1TabelaTacs_(false);
  if(!tabela)throw new Error('Cadastro de TACS indisponível.');
  var row=acessoUnicoV1LinhaPorGenerica_(tabela,'CPF',cpf);
  if(!row)throw new Error('CPF não localizado no perfil TACS.');
  var tacs=tacsTerritorioV1TacsDeLinha_(tabela,row);
  if(!tacs.ativo)throw new Error('Este acesso TACS está inativo.');
  var salt=Utilities.getUuid().replace(/-/g,'');
  tacsTerritorioV1Gravar_(tabela,row,{PIN_SALT:salt,PIN_HASH:tacsTerritorioV1HashPin_(novo,salt),ATUALIZADO_EM:new Date(),OPERADOR_ATUALIZACAO:'RECUPERACAO_PIN'});
  SpreadsheetApp.flush();
  acessoUnicoV1Auditar_({areaId:tacs.areaId||'',areaNome:'',unidadeId:tacs.unidadeId||''},'RECUPERAR_PIN_TACS',tacs.tacsId,dispositivo,'CPF_CONFIRMADO');
  return {ok:true,message:'Novo PIN do TACS salvo. Entre novamente pelo PIN.'};
}

function acessoUnicoV1RecuperarPinAdmin_(cpf,novo,dispositivo){
  if(!acessoUnicoV1AdminCpfExiste_(cpf))throw new Error('CPF não localizado no perfil Administrador.');
  if(typeof ADMIN_TACS_V1==='undefined'||typeof adminTacsV1Hash_!=='function')throw new Error('A autenticação administrativa principal não está disponível.');
  var props=PropertiesService.getScriptProperties();
  var salt=props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT)||Utilities.getUuid()+Utilities.getUuid();
  props.setProperty(ADMIN_TACS_V1.PROP_PIN_SALT,salt);
  props.setProperty(ADMIN_TACS_V1.PROP_PIN_HASH,adminTacsV1Hash_(salt+'|'+novo));
  acessoUnicoV1Auditar_({areaId:'ADMIN',areaNome:'',unidadeId:''},'RECUPERAR_PIN_ADMIN','ADMIN_GERAL',dispositivo,'CPF_CONFIRMADO');
  return {ok:true,message:'Novo PIN administrativo salvo. Entre novamente pelo PIN.'};
}

function acessoUnicoV1RecuperarPinMorador_(cpf,novo,dispositivo,areaSolicitada){
  var contexto=acessoUnicoV1Contexto_(areaSolicitada);
  var registro=acessoUnicoV1PorCpf_(contexto,cpf);
  if(!registro)throw new Error('CPF não localizado no perfil Morador.');
  var acesso=acessoUnicoV1SalvarAcesso_(contexto,registro,dispositivo,novo,'');
  acessoUnicoV1Auditar_(contexto,'RECUPERAR_PIN_MORADOR',acesso.acessoId,dispositivo,'CPF_CONFIRMADO');
  return {ok:true,message:'Novo PIN do morador salvo. Entre novamente pelo PIN.',configurado:true};
}

function acessoUnicoV1AdminCpfExiste_(cpf){
  var ss=typeof adminTacsV1Planilha_==='function'?adminTacsV1Planilha_():tacsTerritorioV1Planilha_();
  var achou=false;
  ss.getSheets().forEach(function(sh){
    if(achou||sh.getLastRow()<2||sh.getLastColumn()<1)return;
    if(!/(ADMIN|USUAR|OPERADOR|ACESSO)/i.test(sh.getName()))return;
    var cols=Math.min(sh.getLastColumn(),50);
    var headers=sh.getRange(1,1,1,cols).getDisplayValues()[0].map(acessoUnicoV1Chave_);
    var cpfIdx=headers.indexOf('CPF');if(cpfIdx<0)return;
    var perfilIdx=acessoUnicoV1PrimeiroIndice_(headers,['PERFIL','TIPO','PAPEL','ROLE']);
    var statusIdx=acessoUnicoV1PrimeiroIndice_(headers,['ATIVO','STATUS','SITUACAO']);
    var rows=sh.getRange(2,1,Math.min(sh.getLastRow()-1,1000),cols).getDisplayValues();
    rows.forEach(function(row){
      if(achou||moradoresAdminV1Digitos_(row[cpfIdx])!==cpf)return;
      var perfil=perfilIdx>=0?acessoUnicoV1Texto_(row[perfilIdx]).toUpperCase():'ADMIN';
      if(perfilIdx>=0&&!/ADMIN/.test(perfil))return;
      var status=statusIdx>=0?acessoUnicoV1Texto_(row[statusIdx]).toUpperCase():'ATIVO';
      if(/INATIV|BLOQUEAD|FALSE|NÃO|NAO|^0$/.test(status))return;
      achou=true;
    });
  });
  return achou;
}

function acessoUnicoV1PendenciasAdmin_(p){
  if(typeof moradoresAdminV1ValidarSessao_!=='function')throw new Error('Validação administrativa indisponível.');
  var acesso=moradoresAdminV1ValidarSessao_(p);
  var area=acessoUnicoV1Area_(p.areaId||acesso.areaId);
  if(acesso.perfil!=='ADMIN_GERAL'&&acesso.perfil!=='ADMIN_MUNICIPAL'&&area!==acessoUnicoV1Area_(acesso.areaId))throw new Error('Seu acesso não permite consultar outra área.');
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.PENDING_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.PENDING_HEADERS,true);
  var items=[];
  tabela.rows.forEach(function(row){
    var x=acessoUnicoV1PendenciaDeLinha_(tabela,row);
    if(x.areaId===area&&x.status==='ABERTA')items.push(x);
  });
  items.sort(function(a,b){return acessoUnicoV1DataMs_(b.criadoEm)-acessoUnicoV1DataMs_(a.criadoEm);});
  return {ok:true,areaId:area,total:items.length,pendencias:items.slice(0,100)};
}

function acessoUnicoV1StatusDispositivo_(p){
  var contexto=acessoUnicoV1Contexto_(p.areaId||p.area||'');
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  var acesso=acessoUnicoV1AcessoDoDispositivo_(contexto.areaId,dispositivo);
  return {ok:true,configurado:Boolean(acesso),etapa:acesso?'PIN':'CPF',notificacoesAtivas:Boolean(acesso&&acesso.notificacoesAtivas)};
}

function acessoUnicoV1SalvarAcesso_(contexto,registro,dispositivo,pin,pendenciaId){
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_HEADERS,true);
  var origemAba=registro&&registro.origem?registro.origem.aba:'PENDENTE:'+pendenciaId;
  var origemLinha=registro&&registro.origem?Number(registro.origem.linha):0;
  var existente=null;
  for(var i=0;i<tabela.rows.length;i++){
    var a=acessoUnicoV1AcessoDeLinha_(tabela,tabela.rows[i]);
    if(a.areaId===contexto.areaId&&a.dispositivo===dispositivo&&a.status==='ATIVO'){existente=tabela.rows[i];break;}
  }
  var anterior=existente?acessoUnicoV1AcessoDeLinha_(tabela,existente):null;
  var salt=Utilities.getUuid().replace(/-/g,''),agora=new Date();
  var dados={
    ACESSO_ID:anterior&&anterior.acessoId||('ACC_'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase()),
    AREA_ID:contexto.areaId,ORIGEM_ABA:origemAba,ORIGEM_LINHA:origemLinha,DISPOSITIVO:dispositivo,
    PIN_SALT:salt,PIN_HASH:acessoUnicoV1HashPin_(pin,salt),STATUS:'ATIVO',
    NOTIFICACOES_ATIVAS:anterior&&anterior.notificacoesAtivas===true,
    SUBSCRIPTION_ID:anterior&&anterior.subscriptionId||'',
    CRIADO_EM:anterior&&anterior.criadoEm||agora,ATUALIZADO_EM:agora,
    ULTIMO_ACESSO_EM:agora,NOTIFICACOES_EM:anterior&&anterior.notificacoesEm||''
  };
  acessoUnicoV1Gravar_(tabela,existente,dados);
  SpreadsheetApp.flush();
  return acessoUnicoV1AcessoPorId_(dados.ACESSO_ID);
}

function acessoUnicoV1AcessoDoDispositivo_(areaId,dispositivo){
  var lista=acessoUnicoV1Acessos_().filter(function(a){return a.areaId===areaId&&a.dispositivo===dispositivo&&a.status==='ATIVO';});
  lista.sort(function(a,b){return acessoUnicoV1DataMs_(b.atualizadoEm)-acessoUnicoV1DataMs_(a.atualizadoEm);});
  return lista[0]||null;
}

function acessoUnicoV1AcessoPorId_(id){
  var lista=acessoUnicoV1Acessos_();
  for(var i=0;i<lista.length;i++)if(lista[i].acessoId===id)return lista[i];
  return null;
}

function acessoUnicoV1Acessos_(){
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_HEADERS,true);
  return tabela.rows.map(function(row){return acessoUnicoV1AcessoDeLinha_(tabela,row);});
}

function acessoUnicoV1AcessoDeLinha_(tabela,row){
  return {
    acessoId:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'ACESSO_ID')),
    areaId:acessoUnicoV1Area_(acessoUnicoV1Valor_(tabela,row,'AREA_ID')),
    origemAba:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'ORIGEM_ABA')),
    origemLinha:Number(acessoUnicoV1Valor_(tabela,row,'ORIGEM_LINHA')||0),
    dispositivo:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'DISPOSITIVO')),
    pinSalt:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'PIN_SALT')),
    pinHash:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'PIN_HASH')),
    status:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'STATUS')).toUpperCase()||'ATIVO',
    notificacoesAtivas:acessoUnicoV1Booleano_(acessoUnicoV1Valor_(tabela,row,'NOTIFICACOES_ATIVAS')),
    subscriptionId:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'SUBSCRIPTION_ID')).toLowerCase(),
    criadoEm:acessoUnicoV1Valor_(tabela,row,'CRIADO_EM'),
    atualizadoEm:acessoUnicoV1Valor_(tabela,row,'ATUALIZADO_EM'),
    ultimoAcessoEm:acessoUnicoV1Valor_(tabela,row,'ULTIMO_ACESSO_EM'),
    notificacoesEm:acessoUnicoV1Valor_(tabela,row,'NOTIFICACOES_EM')
  };
}

function acessoUnicoV1AtualizarUltimoAcesso_(acesso){
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.ACCESS_HEADERS,true);
  var row=acessoUnicoV1LinhaPor_(tabela,'ACESSO_ID',acesso.acessoId);
  if(row)acessoUnicoV1Gravar_(tabela,row,{ULTIMO_ACESSO_EM:new Date(),ATUALIZADO_EM:new Date()});
}

function acessoUnicoV1CriarSessaoMorador_(acesso){
  var token=TACS_ACESSO_UNICO_CONECTA_V1.TOKEN_PREFIX+Utilities.getUuid().replace(/-/g,'');
  var expira=Date.now()+TACS_ACESSO_UNICO_CONECTA_V1.SESSION_SECONDS*1000;
  CacheService.getScriptCache().put(
    TACS_ACESSO_UNICO_CONECTA_V1.SESSION_PREFIX+acessoUnicoV1Hash_(token),
    JSON.stringify({acessoId:acesso.acessoId,areaId:acesso.areaId,dispositivo:acesso.dispositivo,expiraEm:expira}),
    TACS_ACESSO_UNICO_CONECTA_V1.SESSION_SECONDS
  );
  return {token:token,expiraEm:expira};
}

function acessoUnicoV1ValidarSessaoMorador_(p){
  var token=acessoUnicoV1Texto_(p.moradorToken||p.token);
  var dispositivo=acessoUnicoV1Dispositivo_(p.dispositivo);
  if(token.indexOf(TACS_ACESSO_UNICO_CONECTA_V1.TOKEN_PREFIX)!==0)throw new Error('Sessão do morador ausente.');
  var raw=CacheService.getScriptCache().get(TACS_ACESSO_UNICO_CONECTA_V1.SESSION_PREFIX+acessoUnicoV1Hash_(token));
  if(!raw)throw new Error('A sessão do morador expirou. Entre novamente pelo PIN.');
  var s=JSON.parse(raw);
  if(s.dispositivo!==dispositivo)throw new Error('A sessão pertence a outro aparelho.');
  return s;
}

function acessoUnicoV1PerfilAcesso_(contexto,acesso){
  if(!acesso||!acesso.origemAba||acesso.origemAba.indexOf('PENDENTE:')===0||!acesso.origemLinha)return {morador:null,familiaId:'',membros:[]};
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(acesso.origemAba!==fonte.sheet.getName())return {morador:null,familiaId:'',membros:[]};
  var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,acesso.origemAba,acesso.origemLinha);
  if(!registro||!registro.morador)return {morador:null,familiaId:'',membros:[]};
  var m=registro.morador,familia='';
  try{if(typeof identificacaoFamiliarPublicaV1CodigoMorador_==='function')familia=identificacaoFamiliarPublicaV1CodigoMorador_(m)||'';}catch(e){}
  var membros=[];
  try{if(familia&&typeof selecaoMembroFamiliaPublicaV1CriarLista_==='function')membros=selecaoMembroFamiliaPublicaV1CriarLista_(familia,contexto)||[];}catch(e2){}
  return {
    morador:{nome:m.nome,nascimento:m.nascimento,endereco:m.endereco,localidade:m.endereco,cpf:moradoresAdminV1Digitos_(m.cpf),areaId:contexto.areaId,areaNome:contexto.areaNome},
    familiaId:familia,membros:membros
  };
}

function acessoUnicoV1CriarPendencia_(contexto,cpf,nascimento,nome,dispositivo,detalhe){
  var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.PENDING_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.PENDING_HEADERS,true);
  for(var i=tabela.rows.length-1;i>=0;i--){
    var p=acessoUnicoV1PendenciaDeLinha_(tabela,tabela.rows[i]);
    if(p.areaId===contexto.areaId&&p.cpf===cpf&&p.dispositivo===dispositivo&&p.status==='ABERTA')return p.pendenciaId;
  }
  var id='PEND_'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase(),agora=new Date();
  acessoUnicoV1Gravar_(tabela,null,{
    PENDENCIA_ID:id,AREA_ID:contexto.areaId,CPF:cpf,DATA_NASCIMENTO:moradoresAdminV1DataBr_(nascimento)||'',
    NOME_INFORMADO:acessoUnicoV1Texto_(nome).slice(0,160),DISPOSITIVO:dispositivo,STATUS:'ABERTA',
    CRIADO_EM:agora,RESOLVIDO_EM:'',DETALHE:acessoUnicoV1Texto_(detalhe).slice(0,500)
  });
  SpreadsheetApp.flush();
  acessoUnicoV1Auditar_(contexto,'PENDENCIA_CADASTRAL',id,dispositivo,detalhe);
  return id;
}

function acessoUnicoV1PendenciaDeLinha_(tabela,row){
  return {
    pendenciaId:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'PENDENCIA_ID')),
    areaId:acessoUnicoV1Area_(acessoUnicoV1Valor_(tabela,row,'AREA_ID')),
    cpf:moradoresAdminV1Digitos_(acessoUnicoV1Valor_(tabela,row,'CPF')),
    nascimento:moradoresAdminV1DataBr_(acessoUnicoV1Valor_(tabela,row,'DATA_NASCIMENTO'))||acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'DATA_NASCIMENTO')),
    nome:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'NOME_INFORMADO')),
    dispositivoRef:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'DISPOSITIVO')).slice(-10),
    status:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'STATUS')).toUpperCase()||'ABERTA',
    criadoEm:acessoUnicoV1Valor_(tabela,row,'CRIADO_EM'),
    detalhe:acessoUnicoV1Texto_(acessoUnicoV1Valor_(tabela,row,'DETALHE'))
  };
}

function acessoUnicoV1CpfUsadoEmOutraPessoa_(contexto,cpf,origemIgnorada){
  var rows=acessoUnicoV1ListaMoradores_(contexto).rows;
  for(var i=0;i<rows.length;i++){
    if(rows[i].origem.aba===origemIgnorada.aba&&rows[i].origem.linha===origemIgnorada.linha)continue;
    if(moradoresAdminV1Digitos_(rows[i].morador.cpf)===cpf)return true;
  }
  return false;
}

function acessoUnicoV1Tabela_(nome,headers,criar){
  var ss=tacsTerritorioV1Planilha_();
  var sh=ss.getSheetByName(nome);
  if(!sh&&!criar)return null;
  if(!sh)sh=ss.insertSheet(nome);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers.slice()]);sh.setFrozenRows(1);}
  var atual=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getDisplayValues()[0];
  for(var i=0;i<headers.length;i++){
    if(acessoUnicoV1Texto_(atual[i])===headers[i])continue;
    if(i>=sh.getLastColumn()&&!acessoUnicoV1Texto_(atual[i])){sh.getRange(1,i+1).setValue(headers[i]);continue;}
    throw new Error('A aba '+nome+' possui estrutura incompatível na coluna '+(i+1)+'.');
  }
  var values=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues():[];
  var display=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues():[];
  var map={};headers.forEach(function(h,j){map[h]=j;});
  return {sheet:sh,headers:headers.slice(),map:map,rows:values.map(function(v,j){return {row:j+2,values:v,display:display[j]};})};
}

function acessoUnicoV1LinhaPor_(tabela,campo,valor){
  var idx=tabela.map[campo],alvo=acessoUnicoV1Texto_(valor);
  for(var i=0;i<tabela.rows.length;i++)if(acessoUnicoV1Texto_(tabela.rows[i].display[idx])===alvo)return tabela.rows[i];
  return null;
}

function acessoUnicoV1LinhaPorGenerica_(tabela,campo,valor){
  var idx=tabela.map[campo],alvo=moradoresAdminV1Digitos_(valor);
  for(var i=0;i<tabela.rows.length;i++)if(moradoresAdminV1Digitos_(tabela.rows[i].display[idx])===alvo)return tabela.rows[i];
  return null;
}

function acessoUnicoV1Valor_(tabela,row,campo){
  var idx=tabela.map[campo];
  return row.values[idx]!==''&&row.values[idx]!=null?row.values[idx]:row.display[idx];
}

function acessoUnicoV1Gravar_(tabela,row,dados){
  var values=row?row.values.slice():new Array(tabela.headers.length).fill('');
  Object.keys(dados).forEach(function(k){if(Object.prototype.hasOwnProperty.call(tabela.map,k))values[tabela.map[k]]=dados[k];});
  var numero=row?row.row:tabela.sheet.getLastRow()+1;
  tabela.sheet.getRange(numero,1,1,tabela.headers.length).setValues([values]);
  ['CRIADO_EM','ATUALIZADO_EM','ULTIMO_ACESSO_EM','NOTIFICACOES_EM','RESOLVIDO_EM','REGISTRADO_EM'].forEach(function(k){
    if(Object.prototype.hasOwnProperty.call(tabela.map,k))tabela.sheet.getRange(numero,tabela.map[k]+1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  });
  return numero;
}

function acessoUnicoV1HashPin_(pin,salt){
  var props=PropertiesService.getScriptProperties();
  var pepper=acessoUnicoV1Texto_(props.getProperty('CONECTA_ACESSO_MORADOR_PEPPER'));
  if(!pepper){pepper=Utilities.getUuid()+Utilities.getUuid();props.setProperty('CONECTA_ACESSO_MORADOR_PEPPER',pepper);}
  return acessoUnicoV1Hash_(pepper+'|'+salt+'|'+pin);
}

function acessoUnicoV1Auditar_(contexto,tipo,ref,dispositivo,detalhe){
  try{
    var tabela=acessoUnicoV1Tabela_(TACS_ACESSO_UNICO_CONECTA_V1.AUDIT_SHEET,TACS_ACESSO_UNICO_CONECTA_V1.AUDIT_HEADERS,true);
    acessoUnicoV1Gravar_(tabela,null,{
      EVENTO_ID:'ACC_EVT_'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase(),
      TIPO:tipo,AREA_ID:acessoUnicoV1Area_(contexto&&contexto.areaId||'ADMIN'),REFERENCIA_ID:ref||'',
      DISPOSITIVO_REF:acessoUnicoV1Texto_(dispositivo).slice(-12),DETALHE:acessoUnicoV1Texto_(detalhe).slice(0,500),REGISTRADO_EM:new Date()
    });
  }catch(e){}
}

function acessoUnicoV1Limitar_(dispositivo){
  dispositivo=acessoUnicoV1Dispositivo_(dispositivo);
  var cache=CacheService.getScriptCache(),key=TACS_ACESSO_UNICO_CONECTA_V1.RATE_PREFIX+acessoUnicoV1Hash_(dispositivo).slice(0,24),n=Number(cache.get(key)||0)+1;
  if(n>TACS_ACESSO_UNICO_CONECTA_V1.RATE_MAX)throw new Error('Muitas tentativas de acesso. Aguarde alguns minutos.');
  cache.put(key,String(n),TACS_ACESSO_UNICO_CONECTA_V1.RATE_SECONDS);
}

function acessoUnicoV1GuardarResultado_(id,result){
  try{CacheService.getScriptCache().put(TACS_ACESSO_UNICO_CONECTA_V1.RESULT_PREFIX+id,JSON.stringify(result),TACS_ACESSO_UNICO_CONECTA_V1.RESULT_SECONDS);}catch(e){}
}
function acessoUnicoV1LerResultado_(id){
  try{var raw=CacheService.getScriptCache().get(TACS_ACESSO_UNICO_CONECTA_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(e){return null;}
}
function acessoUnicoV1ResponderPost_(id,result){
  var msg={source:'conecta-acesso-unico-v1',requestId:id,result:result};
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\\/script></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function acessoUnicoV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados),cb=acessoUnicoV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function acessoUnicoV1RequestId_(v){var s=acessoUnicoV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(s))throw new Error('Identificador de operação inválido.');return s;}
function acessoUnicoV1Cpf_(v){var d=moradoresAdminV1Digitos_(v);if(!/^[0-9]{11}$/.test(d)||!moradoresAdminV1CpfValido_(d))throw new Error('Informe um CPF válido com 11 números.');return d;}
function acessoUnicoV1Pin_(v){var d=moradoresAdminV1Digitos_(v);if(!/^[0-9]{4}$/.test(d))throw new Error('O PIN deve conter 4 números.');return d;}
function acessoUnicoV1NovoPin_(a,b){var x=acessoUnicoV1Pin_(a),y=acessoUnicoV1Pin_(b);if(x!==y)throw new Error('Os dois PINs precisam ser iguais.');return x;}
function acessoUnicoV1Dispositivo_(v){var s=acessoUnicoV1Texto_(v);if(!s||s.length<8||s.length>180)throw new Error('Identificação segura do aparelho ausente.');return s;}
function acessoUnicoV1Area_(v){return acessoUnicoV1Chave_(v||'JAPARANDUBA').slice(0,64)||'JAPARANDUBA';}
function acessoUnicoV1Chave_(v){var s=acessoUnicoV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');}
function acessoUnicoV1PrimeiroIndice_(arr,opcoes){for(var i=0;i<opcoes.length;i++){var x=arr.indexOf(opcoes[i]);if(x>=0)return x;}return-1;}
function acessoUnicoV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function acessoUnicoV1Booleano_(v){return v===true||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(acessoUnicoV1Texto_(v).toUpperCase())!==-1;}
function acessoUnicoV1Hash_(v){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8);return bytes.map(function(b){var n=b<0?b+256:b;return('0'+n.toString(16)).slice(-2);}).join('');}
function acessoUnicoV1CompararSeguro_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;var d=0;for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function acessoUnicoV1DataMs_(v){if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return v.getTime();var d=new Date(v);return isNaN(d.getTime())?0:d.getTime();}
function acessoUnicoV1Erro_(e){return acessoUnicoV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,700);}
