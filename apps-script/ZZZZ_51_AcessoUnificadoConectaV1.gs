/**
 * ZZZZ_51_AcessoUnificadoConectaV1.gs
 * Conecta Saúde Comunitária — entrada única Admin/TACS/Morador V1.
 *
 * Acrescenta o primeiro acesso do morador sem alterar as rotas já existentes:
 * CPF -> nascimento -> nome (somente quando necessário) -> PIN -> notificações.
 * Se o cadastro não puder ser conciliado, cria pendência e NÃO bloqueia o serviço.
 */
var TACS_CONECTA_ACESSO_V1 = Object.freeze({
  VERSAO:'1.0.4',
  ACCESS_SHEET:'TACS_CONECTA_ACESSO_MORADOR',
  PENDING_SHEET:'TACS_CONECTA_PENDENCIAS',
  TRUST_SHEET:'TACS_CONECTA_APARELHOS_CONFIAVEIS',
  TRUST_HEADERS:Object.freeze([
    'TRUST_ID','PERFIL','REFERENCIA_ID','DISPOSITIVO_HASH','CHAVE_HASH','ATIVO','CRIADO_EM','ATUALIZADO_EM'
  ]),
  ACCESS_HEADERS:Object.freeze([
    'ACCESS_ID','AREA_ID','MORADOR_CHAVE','CPF','NOME','DATA_NASCIMENTO',
    'PIN_SALT','PIN_HASH','QUICK_HASH','DISPOSITIVO_HASH','NOTIFICACOES_ATIVAS',
    'SUBSCRIPTION_ID','SILENCIOSO','PROVISORIO','PENDENCIA_ID','ATIVO',
    'CRIADO_EM','ATUALIZADO_EM'
  ]),
  PENDING_HEADERS:Object.freeze([
    'PENDENCIA_ID','AREA_ID','CPF','NOME','DATA_NASCIMENTO','DISPOSITIVO_HASH',
    'MOTIVO','STATUS','CRIADO_EM','ATUALIZADO_EM'
  ]),
  PEPPER_PROPERTY:'TACS_CONECTA_ACESSO_PEPPER_V1',
  RESULT_PREFIX:'tacs_conecta_result_',
  IDENTITY_PREFIX:'tacs_conecta_identidade_',
  RECOVERY_PREFIX:'tacs_conecta_recuperacao_',
  SESSION_PREFIX:'tacs_conecta_sessao_',
  TEST_SESSION_PREFIX:'tacs_conecta_teste_sessao_',
  TEST_ACCESS_PREFIX:'TACS_CONECTA_TEST_ACCESS_V1:',
  UBS_SESSION_PREFIX:'tacs_conecta_ubs_sessao_',
  RATE_PREFIX:'tacs_conecta_rate_',
  RESULT_SECONDS:300,
  IDENTITY_SECONDS:900,
  RECOVERY_SECONDS:600,
  SESSION_SECONDS:21600,
  RATE_SECONDS:900,
  RATE_MAX:20
});

var conectaAcessoV1DoGetAnterior_;
var conectaAcessoV1DoPostAnterior_;
var conectaAcessoV1GetAnterior_;
var conectaAcessoV1PostAnterior_;

(function instalarConectaAcessoV1_(){
  if(typeof doGet==='function'){
    conectaAcessoV1DoGetAnterior_=doGet;
    doGet=function(e){var r=conectaAcessoV1TratarGet_(e);return r||conectaAcessoV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    conectaAcessoV1DoPostAnterior_=doPost;
    doPost=function(e){var r=conectaAcessoV1TratarPost_(e);return r||conectaAcessoV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    conectaAcessoV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=conectaAcessoV1TratarGet_(e);return r||conectaAcessoV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    conectaAcessoV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=conectaAcessoV1TratarPost_(e);return r||conectaAcessoV1PostAnterior_(e);};
  }
})();

function conectaAcessoV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(conectaAcessoV1Texto_(p.action).toLowerCase()!=='conecta_result')return null;
  var id=conectaAcessoV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))return conectaAcessoV1ResponderJson_({ok:false,message:'Identificador inválido.'},p.callback);
  var r=conectaAcessoV1LerResultado_(id);
  return conectaAcessoV1ResponderJson_(r?{ok:true,pendente:false,requestId:id,result:r}:{ok:true,pendente:true,requestId:id},p.callback);
}

function conectaAcessoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=conectaAcessoV1Texto_(p.action).toLowerCase();
  var aceitas=[
    'conecta_morador_identificar','conecta_morador_confirmar','conecta_morador_criar_pin',
    'conecta_morador_login_pin','conecta_morador_sessao','conecta_morador_notificacao_confirmar',
    'conecta_morador_preferencia_notificacao','conecta_morador_membro_salvar_cpf','conecta_morador_encerrar',
    'conecta_pin_recuperar_iniciar','conecta_pin_recuperar_salvar','conecta_recuperacao_registrar_aparelho',
    'conecta_ubs_identificar_primeiro_acesso','conecta_ubs_login_pin','conecta_ubs_encerrar','conecta_morador_diagnostico_admin','conecta_pendencias_contagem'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var id=conectaAcessoV1Texto_(p.requestId),resultado;
  try{
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação inválido.');
    var modoTeste=conectaAcessoV1Bool_(p.modoTacsTeste);
    if(modoTeste){
      if(!/^conecta_morador_/.test(action))throw new Error('Esta ação não pertence ao espelho do Morador.');
      if(!conectaAcessoV1AparelhoTesteValido_(p))throw new Error('O modo TACS / teste não está autorizado neste aparelho.');
      conectaAcessoV1Limitar_(p.dispositivo||p.cpf||action);
      resultado=conectaAcessoV1TratarMoradorTeste_(action,p);
    }else{
      if(['conecta_morador_identificar','conecta_morador_confirmar','conecta_morador_login_pin','conecta_pin_recuperar_iniciar','conecta_ubs_identificar_primeiro_acesso','conecta_ubs_login_pin','conecta_morador_diagnostico_admin'].indexOf(action)!==-1)conectaAcessoV1Limitar_(p.dispositivo||p.cpf||p.documento||action);
      if(action==='conecta_morador_identificar')resultado=conectaAcessoV1Identificar_(p);
      else if(action==='conecta_morador_confirmar')resultado=conectaAcessoV1Confirmar_(p);
      else if(action==='conecta_morador_criar_pin')resultado=conectaAcessoV1CriarPin_(p);
      else if(action==='conecta_morador_login_pin')resultado=conectaAcessoV1LoginMorador_(p);
      else if(action==='conecta_morador_sessao')resultado=conectaAcessoV1SessaoMorador_(p);
      else if(action==='conecta_morador_notificacao_confirmar')resultado=conectaAcessoV1ConfirmarNotificacao_(p);
      else if(action==='conecta_morador_preferencia_notificacao')resultado=conectaAcessoV1PreferenciaNotificacao_(p);
      else if(action==='conecta_morador_membro_salvar_cpf')resultado=conectaAcessoV1SalvarCpfMembro_(p);
      else if(action==='conecta_morador_encerrar')resultado=conectaAcessoV1EncerrarMorador_(p);
      else if(action==='conecta_pin_recuperar_iniciar')resultado=conectaAcessoV1RecuperarIniciar_(p);
    else if(action==='conecta_pin_recuperar_salvar')resultado=conectaAcessoV1RecuperarSalvar_(p);
    else if(action==='conecta_recuperacao_registrar_aparelho')resultado=conectaAcessoV1RegistrarAparelhoConfiavel_(p);
    else if(action==='conecta_ubs_identificar_primeiro_acesso')resultado=conectaAcessoV1IdentificarUbsPrimeiroAcesso_(p);
    else if(action==='conecta_ubs_login_pin')resultado=conectaAcessoV1LoginUbs_(p);
    else if(action==='conecta_ubs_encerrar')resultado=conectaAcessoV1EncerrarUbs_(p);
      else if(action==='conecta_morador_diagnostico_admin')resultado=conectaAcessoV1DiagnosticoMoradorAdmin_(p);
      else resultado=conectaAcessoV1PendenciasContagem_(p);
    }
  }catch(erro){
    resultado={ok:false,message:conectaAcessoV1Erro_(erro)};
  }
  conectaAcessoV1GuardarResultado_(id,resultado);
  return conectaAcessoV1ResponderPost_(id,resultado);
}

/* FLUXO_MORADOR_EXPLICITO_MULTIPERFIL_2026_09_16_V1
   Um aparelho com perfil administrativo pode entrar no fluxo MORADOR quando a
   própria porta residencial sinaliza explicitamente essa intenção. Isso não concede
   privilégio administrativo ao Morador e não altera os demais perfis. */
/* ESPELHO_MORADOR_ADMIN_2026_09_18_V1
 * O Aparelho TACS / teste executa as mesmas ações do Morador, porém PIN, sessão,
 * preferências e complementos ficam em um cofre técnico isolado. Nenhum PIN de
 * teste é gravado no acesso real da família e nenhuma escrita cadastral é feita.
 */
function conectaAcessoV1AparelhoTesteValido_(p){
  var area=conectaAcessoV1Id_(p.areaId||p.area);
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  var chave=conectaAcessoV1Texto_(p.chaveTacsTeste);
  if(!area||!dispositivo||!chave||typeof aparelhoTacsTesteV1TokenValido_!=='function')return false;
  try{return aparelhoTacsTesteV1TokenValido_(dispositivo,area,chave)===true;}catch(e){return false;}
}

function conectaAcessoV1TratarMoradorTeste_(action,p){
  if(action==='conecta_morador_identificar')return conectaAcessoV1TesteIdentificar_(p);
  if(action==='conecta_morador_confirmar')return conectaAcessoV1TesteConfirmar_(p);
  if(action==='conecta_morador_criar_pin')return conectaAcessoV1TesteCriarPin_(p);
  if(action==='conecta_morador_login_pin')return conectaAcessoV1TesteLogin_(p);
  if(action==='conecta_morador_sessao')return conectaAcessoV1TesteSessao_(p);
  if(action==='conecta_morador_notificacao_confirmar')return conectaAcessoV1TesteNotificacao_(p);
  if(action==='conecta_morador_preferencia_notificacao')return conectaAcessoV1TestePreferencia_(p);
  if(action==='conecta_morador_membro_salvar_cpf')return conectaAcessoV1TesteMembroCpf_(p);
  if(action==='conecta_morador_encerrar')return conectaAcessoV1TesteEncerrar_(p);
  throw new Error('Ação do Morador não habilitada no espelho administrativo.');
}

function conectaAcessoV1TesteIdentificar_(p){
  var cpf=conectaAcessoV1Cpf_(p.cpf),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('Este aparelho ainda não foi identificado.');
  var achados=conectaAcessoV1BuscarCpf_(cpf);
  if(achados.length===1)return conectaAcessoV1IdentidadeResposta_(achados[0],cpf,false,'Cadastro localizado.');
  if(achados.length>1)return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:true,message:'Precisamos confirmar mais um dado para localizar seu cadastro com segurança.'};
  return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:false,message:'CPF ainda não localizado. Informe sua data de nascimento.'};
}

function conectaAcessoV1TesteConfirmar_(p){
  if(conectaAcessoV1Bool_(p.confirmarCpf)&&p.identidadeToken)return conectaAcessoV1TesteConfirmarCpfRevisado_(p);
  var cpf=conectaAcessoV1Cpf_(p.cpf),nascimento=conectaAcessoV1Nascimento_(p.nascimento),nome=conectaAcessoV1Texto_(p.nome),areaPreferida=conectaAcessoV1Id_(p.areaId);
  if(!nascimento)throw new Error('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
  var candidatos=conectaAcessoV1BuscarNascimento_(nascimento,areaPreferida);
  if(candidatos.length>1&&!nome)return {ok:true,encontrado:false,precisaNome:true,message:'Há mais de um cadastro com essa data. Informe seu nome completo.'};
  if(nome)candidatos=candidatos.filter(function(x){return conectaAcessoV1Nome_(x.morador.nome)===conectaAcessoV1Nome_(nome);});
  if(candidatos.length===1){
    var item=candidatos[0];
    if(item.morador.cpf&&item.morador.cpf!==cpf)return conectaAcessoV1TestePendenteResposta_(cpf,nascimento,nome||item.morador.nome,areaPreferida||item.area.areaId,'CPF_DIVERGENTE');
    if(!item.morador.cpf){
      var revisao=conectaAcessoV1IdentidadeResposta_(item,cpf,false,'Cadastro localizado. Confira o CPF e a data de nascimento antes de salvar.');
      revisao.revisarCpf=true;revisao.cpf=cpf;revisao.nascimento=nascimento;revisao.teste=true;
      return revisao;
    }
    var resposta=conectaAcessoV1IdentidadeResposta_(item,cpf,false,'Cadastro localizado.');
    resposta.teste=true;return resposta;
  }
  if(candidatos.length>1)return {ok:true,encontrado:false,precisaNome:true,message:'Ainda há mais de um cadastro possível. Confira o nome completo.'};
  if(!nome)return {ok:true,encontrado:false,precisaNome:true,message:'Não localizamos com segurança. Informe também seu nome completo.'};
  return conectaAcessoV1TestePendenteResposta_(cpf,nascimento,nome,areaPreferida,'CADASTRO_NAO_LOCALIZADO');
}

function conectaAcessoV1TestePendenteResposta_(cpf,nascimento,nome,areaPreferida,motivo){
  var areas=conectaAcessoV1Areas_(),area=null;
  if(areaPreferida)for(var i=0;i<areas.length;i++)if(areas[i].areaId===areaPreferida){area=areas[i];break;}
  if(!area&&areas.length===1)area=areas[0];
  if(!area)return {ok:true,encontrado:false,precisaArea:true,areas:areas.map(function(a){return {areaId:a.areaId,areaNome:a.areaNome||a.areaId};}),message:'Selecione sua comunidade/área para continuar. Seu atendimento não será bloqueado.'};
  var item={area:area,morador:{nome:nome,nascimento:nascimento,endereco:'',idPortal:'',id:'',cpf:cpf},chave:'TESTE:'+conectaAcessoV1Hash_(cpf+'|'+nome+'|'+nascimento).slice(0,24),pendenciaId:'TESTE'};
  var r=conectaAcessoV1IdentidadeResposta_(item,cpf,true,'Cadastro pendente de conferência. No modo teste nenhuma alteração foi gravada.');
  r.teste=true;r.motivo=motivo;return r;
}

function conectaAcessoV1TesteConfirmarCpfRevisado_(p){
  var identidade=conectaAcessoV1LerTokenCache_(p.identidadeToken,TACS_CONECTA_ACESSO_V1.IDENTITY_PREFIX,'ci1');
  if(identidade.provisorio)throw new Error('Este cadastro ainda precisa de conferência antes de vincular um CPF.');
  var cpf=conectaAcessoV1Cpf_(p.cpf||identidade.cpf),nascimento=conectaAcessoV1Nascimento_(p.nascimento||identidade.nascimento);
  if(cpf!==conectaAcessoV1Texto_(identidade.cpf)||nascimento!==conectaAcessoV1Texto_(identidade.nascimento))throw new Error('Os dados foram alterados. Toque em Corrigir e confira novamente.');
  var candidatos=conectaAcessoV1BuscarNascimento_(nascimento,conectaAcessoV1Id_(identidade.areaId));
  candidatos=candidatos.filter(function(x){
    if(identidade.moradorChave&&conectaAcessoV1Texto_(x.chave)===conectaAcessoV1Texto_(identidade.moradorChave))return true;
    if(identidade.idPortal&&conectaAcessoV1Texto_(x.morador.idPortal||x.morador.id)===conectaAcessoV1Texto_(identidade.idPortal))return true;
    return conectaAcessoV1Nome_(x.morador.nome)===conectaAcessoV1Nome_(identidade.nome);
  });
  if(candidatos.length!==1)throw new Error('Não foi possível confirmar com segurança este cadastro. Corrija os dados e tente novamente.');
  var item=candidatos[0],atual=conectaAcessoV1Texto_(item.morador.cpf).replace(/\D/g,'');
  if(atual&&atual!==cpf)throw new Error('Este cadastro já possui outro CPF. A alteração exige conferência do TACS.');
  item.morador.cpf=cpf;
  var r=conectaAcessoV1IdentidadeResposta_(item,cpf,false,'CPF conferido para esta simulação. Nenhum cadastro real foi alterado.');
  r.teste=true;return r;
}

function conectaAcessoV1TestePropKey_(quick){
  return TACS_CONECTA_ACESSO_V1.TEST_ACCESS_PREFIX+conectaAcessoV1Hash_(quick).slice(0,48);
}

function conectaAcessoV1TesteSalvar_(quick,registro){
  registro=registro||{};registro.atualizadoEm=Date.now();
  PropertiesService.getScriptProperties().setProperty(conectaAcessoV1TestePropKey_(quick),JSON.stringify(registro));
}

function conectaAcessoV1TesteLer_(quick){
  quick=conectaAcessoV1Texto_(quick);
  if(!/^cmtq1\./.test(quick))throw new Error('Este aparelho ainda não possui um acesso de teste reconhecido.');
  var props=PropertiesService.getScriptProperties(),key=conectaAcessoV1TestePropKey_(quick),raw=props.getProperty(key);
  if(!raw)throw new Error('Acesso de teste não localizado. Crie novamente o PIN fictício.');
  var r=JSON.parse(raw),idade=Date.now()-Number(r.atualizadoEm||0);
  if(!Number.isFinite(idade)||idade>30*24*60*60*1000){props.deleteProperty(key);throw new Error('O acesso de teste expirou. Crie novamente o PIN fictício.');}
  if(!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(r.quickHash),conectaAcessoV1Hash_(quick)))throw new Error('Acesso de teste inválido.');
  return {key:key,registro:r};
}

function conectaAcessoV1TesteVals_(r){
  return [
    r.accessId||'',r.areaId||'',r.moradorChave||'',r.cpf||'',r.nome||'',r.nascimento||'',
    r.pinSalt||'',r.pinHash||'',r.quickHash||'',r.dispositivoHash||'',Boolean(r.notificacoesAtivas),
    '',Boolean(r.silencioso),Boolean(r.provisorio),r.pendenciaId||'',true,r.criadoEm||'',r.atualizadoEm||''
  ];
}

function conectaAcessoV1TesteCriarSessao_(quick,registro,dispositivo){
  var token=conectaAcessoV1Token_('cmts1'),payload={token:token,accessKey:conectaAcessoV1TestePropKey_(quick),areaId:registro.areaId,dispositivoHash:conectaAcessoV1Hash_(dispositivo),criadoEm:Date.now()};
  CacheService.getScriptCache().put(TACS_CONECTA_ACESSO_V1.TEST_SESSION_PREFIX+conectaAcessoV1Hash_(token),JSON.stringify(payload),TACS_CONECTA_ACESSO_V1.SESSION_SECONDS);
  return payload;
}

function conectaAcessoV1TesteValidarSessao_(p){
  var token=conectaAcessoV1Texto_(p.token),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!/^cmts1\./.test(token)||!dispositivo)throw new Error('Sessão de morador de teste ausente.');
  var raw=CacheService.getScriptCache().get(TACS_CONECTA_ACESSO_V1.TEST_SESSION_PREFIX+conectaAcessoV1Hash_(token));
  if(!raw)throw new Error('Sua sessão de teste expirou. Entre novamente com o PIN fictício.');
  var s=JSON.parse(raw);
  if(s.dispositivoHash!==conectaAcessoV1Hash_(dispositivo))throw new Error('Esta sessão de teste pertence a outro aparelho.');
  return s;
}

function conectaAcessoV1TesteRegistroSessao_(p){
  var s=conectaAcessoV1TesteValidarSessao_(p),raw=PropertiesService.getScriptProperties().getProperty(s.accessKey);
  if(!raw)throw new Error('O acesso de teste não foi localizado.');
  return {sessao:s,registro:JSON.parse(raw)};
}

function conectaAcessoV1TesteCriarPin_(p){
  var identidade=conectaAcessoV1LerTokenCache_(p.identidadeToken,TACS_CONECTA_ACESSO_V1.IDENTITY_PREFIX,'ci1');
  var pin=conectaAcessoV1Pin_(p.pin,p.confirmacao),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('A identificação do aparelho está ausente.');
  var quick=conectaAcessoV1Token_('cmtq1'),salt=Utilities.getUuid().replace(/-/g,''),agora=Date.now();
  var registro={
    accessId:'CMTEST-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),
    areaId:conectaAcessoV1Id_(identidade.areaId),moradorChave:identidade.moradorChave||'',
    cpf:identidade.cpf||'',nome:identidade.nome||'',nascimento:identidade.nascimento||'',
    pinSalt:salt,pinHash:conectaAcessoV1Hash_(salt+'|'+pin),quickHash:conectaAcessoV1Hash_(quick),
    dispositivoHash:conectaAcessoV1Hash_(dispositivo),notificacoesAtivas:false,silencioso:false,
    provisorio:Boolean(identidade.provisorio),pendenciaId:identidade.pendenciaId||'',criadoEm:agora,atualizadoEm:agora
  };
  conectaAcessoV1TesteSalvar_(quick,registro);
  var session=conectaAcessoV1TesteCriarSessao_(quick,registro,dispositivo),nucleo=conectaAcessoV1NucleoFamiliar_(conectaAcessoV1TesteVals_(registro));
  return {ok:true,teste:true,token:session.token,quickKey:quick,perfil:'MORADOR',areaId:registro.areaId,areaNome:identidade.areaNome||registro.areaId,nome:registro.nome,cpf:registro.cpf,notificacoesAtivas:false,provisorio:registro.provisorio,pendenciaId:registro.pendenciaId,familiaId:nucleo.familiaId,familia:nucleo.membros,message:'PIN fictício criado somente para este teste administrativo.'};
}

function conectaAcessoV1TesteLogin_(p){
  var pin=conectaAcessoV1PinSomente_(p.pin),quick=conectaAcessoV1Texto_(p.quickKey),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  var achado=conectaAcessoV1TesteLer_(quick),r=achado.registro;
  if(!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(r.dispositivoHash),conectaAcessoV1Hash_(dispositivo)))throw new Error('Este acesso de teste pertence a outro aparelho.');
  if(!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(r.pinHash),conectaAcessoV1Hash_(r.pinSalt+'|'+pin)))throw new Error('PIN incorreto.');
  r.atualizadoEm=Date.now();PropertiesService.getScriptProperties().setProperty(achado.key,JSON.stringify(r));
  var session=conectaAcessoV1TesteCriarSessao_(quick,r,dispositivo),nucleo=conectaAcessoV1NucleoFamiliar_(conectaAcessoV1TesteVals_(r));
  return {ok:true,teste:true,token:session.token,perfil:'MORADOR',areaId:r.areaId,nome:r.nome,cpf:r.cpf,notificacoesAtivas:Boolean(r.notificacoesAtivas),silencioso:Boolean(r.silencioso),provisorio:Boolean(r.provisorio),pendenciaId:r.pendenciaId||'',familiaId:nucleo.familiaId,familia:nucleo.membros};
}

function conectaAcessoV1TesteSessao_(p){
  var x=conectaAcessoV1TesteRegistroSessao_(p),r=x.registro,nucleo=conectaAcessoV1NucleoFamiliar_(conectaAcessoV1TesteVals_(r)),endereco='';
  try{
    var achados=conectaAcessoV1BuscarCpf_(conectaAcessoV1Texto_(r.cpf));
    if(achados.length===1)endereco=conectaAcessoV1Texto_(achados[0].morador.endereco||'');
  }catch(e){}
  return {ok:true,teste:true,perfil:'MORADOR',areaId:r.areaId,cpf:r.cpf,nome:r.nome,nascimento:r.nascimento,endereco:endereco,notificacoesAtivas:Boolean(r.notificacoesAtivas),subscriptionId:'',silencioso:Boolean(r.silencioso),provisorio:Boolean(r.provisorio),pendenciaId:r.pendenciaId||'',familiaId:nucleo.familiaId,familia:nucleo.membros};
}

function conectaAcessoV1TesteNotificacao_(p){
  var x=conectaAcessoV1TesteRegistroSessao_(p),r=x.registro;
  r.notificacoesAtivas=true;r.atualizadoEm=Date.now();
  PropertiesService.getScriptProperties().setProperty(x.sessao.accessKey,JSON.stringify(r));
  return {ok:true,teste:true,notificacoesAtivas:true,message:'Etapa de notificações validada no modo teste. Nenhum aparelho real foi vinculado.'};
}

function conectaAcessoV1TestePreferencia_(p){
  var x=conectaAcessoV1TesteRegistroSessao_(p),r=x.registro;
  r.silencioso=conectaAcessoV1Bool_(p.silencioso);r.atualizadoEm=Date.now();
  PropertiesService.getScriptProperties().setProperty(x.sessao.accessKey,JSON.stringify(r));
  return {ok:true,teste:true,silencioso:r.silencioso,message:'Preferência simulada somente no modo teste.'};
}

function conectaAcessoV1TesteMembroCpf_(p){
  var x=conectaAcessoV1TesteRegistroSessao_(p),cpf=conectaAcessoV1Cpf_(p.cpf),tokenMembro=conectaAcessoV1Texto_(p.membroToken);
  if(!/^fm_[A-Za-z0-9_]{20,160}$/.test(tokenMembro))throw new Error('Seleção do integrante inválida ou expirada.');
  if(typeof TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1==='undefined')throw new Error('A seleção familiar ainda não está disponível.');
  var bruto=CacheService.getScriptCache().get(TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1.TOKEN_PREFIX+tokenMembro);
  if(!bruto)throw new Error('Esta seleção expirou. Abra novamente o vínculo familiar.');
  var dados=JSON.parse(bruto);
  if(conectaAcessoV1Id_(dados.areaId)!==conectaAcessoV1Id_(x.registro.areaId))throw new Error('O integrante selecionado não pertence à área deste acesso.');
  return {ok:true,teste:true,documentoAcesso:cpf,nome:conectaAcessoV1Texto_(dados.nome),nascimento:conectaAcessoV1Texto_(dados.nascimento),message:'CPF usado somente nesta simulação. Nenhum cadastro real foi alterado.'};
}

function conectaAcessoV1TesteEncerrar_(p){
  var s=conectaAcessoV1TesteValidarSessao_(p);
  try{CacheService.getScriptCache().remove(TACS_CONECTA_ACESSO_V1.TEST_SESSION_PREFIX+conectaAcessoV1Hash_(s.token));}catch(e){}
  return {ok:true,teste:true,message:'Sessão de teste encerrada.'};
}

function conectaAcessoV1Identificar_(p){
  var cpf=conectaAcessoV1Cpf_(p.cpf),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('Este aparelho ainda não foi identificado.');
  if(conectaAcessoV1AparelhoAdministrativo_(dispositivo)&&!conectaAcessoV1Bool_(p.fluxoMoradorExplicito))throw new Error('Aparelho administrativo: use o diagnóstico do Morador sem criar vínculo.');
  var achados=conectaAcessoV1BuscarCpf_(cpf);
  if(achados.length===1)return conectaAcessoV1IdentidadeResposta_(achados[0],cpf,false,'Cadastro localizado.');
  if(achados.length>1)return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:true,message:'Precisamos confirmar mais um dado para localizar seu cadastro com segurança.'};
  return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:false,message:'CPF ainda não localizado. Informe sua data de nascimento.'};
}

function conectaAcessoV1Confirmar_(p){
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(conectaAcessoV1AparelhoAdministrativo_(dispositivo)&&!conectaAcessoV1Bool_(p.fluxoMoradorExplicito))throw new Error('Aparelho administrativo: confirmação residencial bloqueada; use o diagnóstico sem vínculo.');
  if(conectaAcessoV1Bool_(p.confirmarCpf)&&p.identidadeToken)return conectaAcessoV1ConfirmarCpfRevisado_(p);
  var cpf=conectaAcessoV1Cpf_(p.cpf),nascimento=conectaAcessoV1Nascimento_(p.nascimento),nome=conectaAcessoV1Texto_(p.nome),areaPreferida=conectaAcessoV1Id_(p.areaId);
  if(!nascimento)throw new Error('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
  var candidatos=conectaAcessoV1BuscarNascimento_(nascimento,areaPreferida);
  if(candidatos.length>1&&!nome){
    return {ok:true,encontrado:false,precisaNome:true,message:'Há mais de um cadastro com essa data. Informe seu nome completo.'};
  }
  if(nome)candidatos=candidatos.filter(function(x){return conectaAcessoV1Nome_(x.morador.nome)===conectaAcessoV1Nome_(nome);});
  if(candidatos.length===1){
    var item=candidatos[0];
    if(item.morador.cpf&&item.morador.cpf!==cpf){
      return conectaAcessoV1CriarPendenteResposta_(p,cpf,nascimento,nome||item.morador.nome,areaPreferida||item.area.areaId,'CPF_DIVERGENTE');
    }
    if(!item.morador.cpf){
      var revisao=conectaAcessoV1IdentidadeResposta_(item,cpf,false,'Cadastro localizado. Confira o CPF e a data de nascimento antes de salvar.');
      revisao.revisarCpf=true;revisao.cpf=cpf;revisao.nascimento=nascimento;
      return revisao;
    }
    return conectaAcessoV1IdentidadeResposta_(item,cpf,false,'Cadastro localizado.');
  }
  if(candidatos.length>1){
    return {ok:true,encontrado:false,precisaNome:true,message:'Ainda há mais de um cadastro possível. Confira o nome completo.'};
  }
  if(!nome){
    return {ok:true,encontrado:false,precisaNome:true,message:'Não localizamos com segurança. Informe também seu nome completo.'};
  }
  return conectaAcessoV1CriarPendenteResposta_(p,cpf,nascimento,nome,areaPreferida,'CADASTRO_NAO_LOCALIZADO');
}

function conectaAcessoV1ConfirmarCpfRevisado_(p){
  var identidade=conectaAcessoV1LerTokenCache_(p.identidadeToken,TACS_CONECTA_ACESSO_V1.IDENTITY_PREFIX,'ci1');
  if(identidade.provisorio)throw new Error('Este cadastro ainda precisa de conferência antes de vincular um CPF.');
  var cpf=conectaAcessoV1Cpf_(p.cpf||identidade.cpf),nascimento=conectaAcessoV1Nascimento_(p.nascimento||identidade.nascimento);
  if(cpf!==conectaAcessoV1Texto_(identidade.cpf)||nascimento!==conectaAcessoV1Texto_(identidade.nascimento))throw new Error('Os dados foram alterados. Toque em Corrigir e confira novamente.');
  var candidatos=conectaAcessoV1BuscarNascimento_(nascimento,conectaAcessoV1Id_(identidade.areaId));
  candidatos=candidatos.filter(function(x){
    if(identidade.moradorChave&&conectaAcessoV1Texto_(x.chave)===conectaAcessoV1Texto_(identidade.moradorChave))return true;
    if(identidade.idPortal&&conectaAcessoV1Texto_(x.morador.idPortal||x.morador.id)===conectaAcessoV1Texto_(identidade.idPortal))return true;
    return conectaAcessoV1Nome_(x.morador.nome)===conectaAcessoV1Nome_(identidade.nome);
  });
  if(candidatos.length!==1)throw new Error('Não foi possível confirmar com segurança este cadastro. Corrija os dados e tente novamente.');
  var item=candidatos[0],atual=conectaAcessoV1Texto_(item.morador.cpf).replace(/\D/g,'');
  if(atual&&atual!==cpf)throw new Error('Este cadastro já possui outro CPF. A alteração exige conferência do TACS.');
  if(!atual)conectaAcessoV1SalvarCpf_(item,cpf);
  item.morador.cpf=cpf;
  return conectaAcessoV1IdentidadeResposta_(item,cpf,false,'CPF conferido e salvo no seu cadastro.');
}

function conectaAcessoV1IdentidadeResposta_(item,cpf,provisorio,mensagem){
  var payload={
    cpf:cpf,areaId:item.area.areaId,areaNome:item.area.areaNome||item.area.areaId,
    unidadeId:item.area.unidadeId||'',nome:item.morador.nome,nascimento:item.morador.nascimento,
    endereco:item.morador.endereco||'',moradorChave:item.chave||'',idPortal:item.morador.idPortal||item.morador.id||'',
    provisorio:Boolean(provisorio),pendenciaId:item.pendenciaId||''
  };
  var token=conectaAcessoV1TokenCache_('ci1',TACS_CONECTA_ACESSO_V1.IDENTITY_PREFIX,payload,TACS_CONECTA_ACESSO_V1.IDENTITY_SECONDS);
  return {ok:true,encontrado:!provisorio,provisorio:Boolean(provisorio),identidadeToken:token,areaId:payload.areaId,areaNome:payload.areaNome,nome:payload.nome,nascimento:payload.nascimento,pendenciaId:payload.pendenciaId,message:mensagem};
}

function conectaAcessoV1CriarPendenteResposta_(p,cpf,nascimento,nome,areaPreferida,motivo){
  var areas=conectaAcessoV1Areas_(),area=null;
  if(areaPreferida)for(var i=0;i<areas.length;i++)if(areas[i].areaId===areaPreferida){area=areas[i];break;}
  if(!area&&areas.length===1)area=areas[0];
  if(!area)return {ok:true,encontrado:false,precisaArea:true,areas:areas.map(function(a){return {areaId:a.areaId,areaNome:a.areaNome||a.areaId};}),message:'Selecione sua comunidade/área para continuar. Seu atendimento não será bloqueado.'};
  var pendencia=conectaAcessoV1CriarPendencia_(area.areaId,cpf,nome,nascimento,p.dispositivo,motivo);
  var item={area:area,morador:{nome:nome,nascimento:nascimento,endereco:'',idPortal:'',id:'',cpf:cpf},chave:'PENDENCIA:'+pendencia.id,pendenciaId:pendencia.id};
  return conectaAcessoV1IdentidadeResposta_(item,cpf,true,'Cadastro pendente de conferência. Você pode continuar normalmente com sua solicitação.');
}

function conectaAcessoV1CriarPin_(p){
  var identidade=conectaAcessoV1LerTokenCache_(p.identidadeToken,TACS_CONECTA_ACESSO_V1.IDENTITY_PREFIX,'ci1');
  var pin=conectaAcessoV1Pin_(p.pin,p.confirmacao),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('A identificação do aparelho está ausente.');
  if(conectaAcessoV1AparelhoAdministrativo_(dispositivo)&&!conectaAcessoV1Bool_(p.fluxoMoradorExplicito))throw new Error('Aparelho administrativo não pode criar PIN nem vínculo residencial.');
  var sheet=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Seu acesso está sendo salvo. Tente novamente em instantes.');
  try{
    var registro=conectaAcessoV1AcessoPorCpf_(sheet,identidade.cpf),salt=Utilities.getUuid().replace(/-/g,''),quick=conectaAcessoV1Token_('cmq1');
    var agora=new Date(),id=registro?registro.values[0]:'CMA-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase();
    var criado=registro?registro.values[16]:agora;
    var vals=[
      id,identidade.areaId,identidade.moradorChave||'',identidade.cpf,identidade.nome,identidade.nascimento,
      salt,conectaAcessoV1Hash_(salt+'|'+pin),conectaAcessoV1Hash_(quick),conectaAcessoV1Hash_(dispositivo),
      registro?conectaAcessoV1Bool_(registro.values[10]):false,
      registro?conectaAcessoV1Texto_(registro.values[11]).toLowerCase():'',
      registro?conectaAcessoV1Bool_(registro.values[12]):false,
      Boolean(identidade.provisorio),identidade.pendenciaId||'',true,criado,agora
    ];
    var linhaAcesso=registro?registro.row:sheet.getLastRow()+1;if(linhaAcesso>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),1);sheet.getRange(linhaAcesso,4).setNumberFormat('@');sheet.getRange(linhaAcesso,1,1,vals.length).setValues([vals]);
    var session=conectaAcessoV1CriarSessao_(vals,dispositivo),nucleo=conectaAcessoV1NucleoFamiliar_(vals);
    var responsavelCriacao=(nucleo.membros||[]).filter(function(m){return m&&m.responsavel;})[0]||{};return {ok:true,token:session.token,quickKey:quick,perfil:'MORADOR',areaId:identidade.areaId,areaNome:identidade.areaNome||identidade.areaId,nome:identidade.nome,cpf:identidade.cpf,nascimento:identidade.nascimento||responsavelCriacao.nascimento||'',endereco:identidade.endereco||responsavelCriacao.localidade||'',notificacoesAtivas:Boolean(vals[10]),provisorio:Boolean(vals[13]),pendenciaId:vals[14],familiaId:nucleo.familiaId,familia:nucleo.membros,message:'PIN criado e salvo.'};
  }finally{lock.releaseLock();}
}

function conectaAcessoV1LoginMorador_(p){
  var pin=conectaAcessoV1PinSomente_(p.pin),quick=conectaAcessoV1Texto_(p.quickKey),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!/^cmq1\./.test(quick)||!dispositivo)throw new Error('Este aparelho ainda não possui um acesso de morador reconhecido.');
  if(conectaAcessoV1AparelhoAdministrativo_(dispositivo)&&!conectaAcessoV1Bool_(p.fluxoMoradorExplicito))throw new Error('Aparelho administrativo não pode assumir sessão de Morador; use o diagnóstico sem vínculo.');
  var sheet=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),registro=conectaAcessoV1AcessoPorQuick_(sheet,quick);
  if(!registro||!conectaAcessoV1Bool_(registro.values[15]))throw new Error('Acesso não localizado ou inativo.');
  if(!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(registro.values[9]),conectaAcessoV1Hash_(dispositivo)))throw new Error('Este acesso rápido pertence a outro aparelho. Faça a identificação pelo CPF neste aparelho.');
  if(!conectaAcessoV1Seguro_(registro.values[7],conectaAcessoV1Hash_(registro.values[6]+'|'+pin)))throw new Error('PIN incorreto.');
  var session=conectaAcessoV1CriarSessao_(registro.values,dispositivo),nucleo=conectaAcessoV1NucleoFamiliar_(registro.values),responsavel=(nucleo.membros||[]).filter(function(m){return m&&m.responsavel;})[0]||{};
  return {ok:true,token:session.token,perfil:'MORADOR',areaId:registro.values[1],nome:registro.values[4],cpf:registro.values[3],nascimento:registro.values[5]||responsavel.nascimento||'',endereco:responsavel.localidade||'',notificacoesAtivas:conectaAcessoV1Bool_(registro.values[10]),silencioso:conectaAcessoV1Bool_(registro.values[12]),provisorio:conectaAcessoV1Bool_(registro.values[13]),pendenciaId:conectaAcessoV1Texto_(registro.values[14]),familiaId:nucleo.familiaId,familia:nucleo.membros};
}

function conectaAcessoV1SessaoMorador_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p);
  var sheet=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),registro=conectaAcessoV1AcessoPorId_(sheet,sessao.accessId);
  if(!registro)throw new Error('Acesso do morador não localizado.');
  var v=registro.values,nucleo=conectaAcessoV1NucleoFamiliar_(v),endereco='';
  try{
    var achados=conectaAcessoV1BuscarCpf_(conectaAcessoV1Texto_(v[3]));
    if(achados.length===1)endereco=conectaAcessoV1Texto_(achados[0].morador.endereco||'');
  }catch(e){}
  return {ok:true,perfil:'MORADOR',areaId:v[1],cpf:v[3],nome:v[4],nascimento:v[5],endereco:endereco,notificacoesAtivas:conectaAcessoV1Bool_(v[10]),subscriptionId:conectaAcessoV1Texto_(v[11]).toLowerCase(),silencioso:conectaAcessoV1Bool_(v[12]),provisorio:conectaAcessoV1Bool_(v[13]),pendenciaId:conectaAcessoV1Texto_(v[14]),familiaId:nucleo.familiaId,familia:nucleo.membros};
}

function conectaAcessoV1ConfirmarNotificacao_(p){
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(conectaAcessoV1AparelhoAdministrativo_(dispositivo))throw new Error('Aparelho administrativo não pode ser registrado para notificações de Morador.');
  var sessao=conectaAcessoV1ValidarSessao_(p),sub=conectaAcessoV1Texto_(p.subscriptionId).toLowerCase();
  if(!conectaAcessoV1Bool_(p.permission)||!conectaAcessoV1Bool_(p.optedIn)||!/^[0-9a-f-]{36}$/.test(sub))throw new Error('Ative as notificações neste aparelho para continuar.');
  if(!conectaAcessoV1SubscriptionAtiva_(sessao.areaId,sub))throw new Error('A ativação ainda não foi confirmada pelo serviço de notificações. Aguarde alguns segundos e tente continuar.');
  conectaAcessoV1AtualizarAcesso_(sessao.accessId,{10:true,11:sub});
  return {ok:true,notificacoesAtivas:true,message:'Notificações ativadas neste aparelho.'};
}

function conectaAcessoV1PreferenciaNotificacao_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p),silencioso=conectaAcessoV1Bool_(p.silencioso);
  conectaAcessoV1AtualizarAcesso_(sessao.accessId,{12:silencioso});
  return {ok:true,silencioso:silencioso,message:silencioso?'Preferência silenciosa registrada.':'Avisos sonoros reativados na preferência do Conecta.'};
}

function conectaAcessoV1SalvarCpfMembro_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p),cpf=conectaAcessoV1Cpf_(p.cpf),tokenMembro=conectaAcessoV1Texto_(p.membroToken);
  if(!/^fm_[A-Za-z0-9_]{20,160}$/.test(tokenMembro))throw new Error('Seleção do integrante inválida ou expirada.');
  if(typeof TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1==='undefined')throw new Error('A seleção familiar ainda não está disponível.');
  var bruto=CacheService.getScriptCache().get(TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1.TOKEN_PREFIX+tokenMembro);
  if(!bruto)throw new Error('Esta seleção expirou. Abra novamente o vínculo familiar.');
  var dados=JSON.parse(bruto),areaId=conectaAcessoV1Id_(sessao.areaId);
  if(conectaAcessoV1Id_(dados.areaId)!==areaId)throw new Error('O integrante selecionado não pertence à área deste acesso.');
  var titular=conectaAcessoV1BuscarCpf_(sessao.cpf);
  if(titular.length!==1)throw new Error('Não foi possível confirmar o responsável deste acesso.');
  var familiaTitular=typeof vinculoFamiliarNotifV1CodigoEndereco_==='function'?vinculoFamiliarNotifV1CodigoEndereco_(titular[0].morador.endereco):'';
  if(!familiaTitular||identificacaoFamiliarPublicaV1NormalizarFamilia_(dados.familiaId)!==identificacaoFamiliarPublicaV1NormalizarFamilia_(familiaTitular))throw new Error('O integrante não pertence ao vínculo familiar deste acesso.');
  var contexto={perfil:'PUBLICO',operadorId:'AUTO:FAMILIA_CONECTA',agenteId:titular[0].area.agenteId||'',areaId:areaId,areaNome:titular[0].area.areaNome||areaId,unidadeId:titular[0].area.unidadeId||'',planilhaId:titular[0].area.planilhaId,permissoes:[]};
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(conectaAcessoV1Texto_(dados.origemAba)!==fonte.sheet.getName()||Number(dados.origemLinha||0)<2)throw new Error('O cadastro selecionado não pertence à fonte territorial atual.');
  var reg=moradoresAdminV1LerPorOrigem_(fonte.ss,dados.origemAba,Number(dados.origemLinha||0));
  if(!reg||!reg.morador||!reg.morador.nome)throw new Error('O integrante selecionado não foi localizado.');
  if(identificacaoFamiliarPublicaV1CodigoMorador_(reg.morador)!==identificacaoFamiliarPublicaV1NormalizarFamilia_(familiaTitular))throw new Error('O vínculo familiar mudou. Abra novamente a família.');
  var atual=moradoresAdminV1Digitos_(reg.morador.cpf);
  if(atual&&atual!==cpf)throw new Error('Este integrante já possui outro CPF cadastrado. A alteração exige conferência do TACS.');
  if(!atual&&conectaAcessoV1BuscarCpf_(cpf).length)throw new Error('Este CPF já está associado a outro cadastro.');
  if(!atual){
    var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('O cadastro está sendo atualizado. Tente novamente.');
    try{
      moradoresAdminV1SetCell_(fonte.sheet,Number(dados.origemLinha),fonte.map.cpf,cpf,'@');
      moradoresAdminV1SetCell_(fonte.sheet,Number(dados.origemLinha),fonte.map.ultimaAtualizacao,new Date(),'dd/MM/yyyy HH:mm:ss');
      moradoresAdminV1Auditar_(fonte.ss,{moradorId:reg.morador.idPortal||reg.morador.id||moradoresAdminV1ChaveRegistro_(reg.morador),acao:'VINCULAR_CPF_MEMBRO_FAMILIA_CONECTA',campos:'CPF_PREENCHIDO_EM_CAMPO_VAZIO'},contexto);
      SpreadsheetApp.flush();if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);
    }finally{lock.releaseLock();}
  }
  return {ok:true,documentoAcesso:cpf,nome:reg.morador.nome,nascimento:reg.morador.nascimento||'',message:'CPF salvo no cadastro deste integrante.'};
}

function conectaAcessoV1EncerrarMorador_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p);
  try{CacheService.getScriptCache().remove(TACS_CONECTA_ACESSO_V1.SESSION_PREFIX+conectaAcessoV1Hash_(sessao.token));}catch(e){}
  return {ok:true,message:'Sessão encerrada.'};
}

function conectaAcessoV1RegistrarAparelhoConfiavel_(p){
  var perfil=conectaAcessoV1Texto_(p.perfil).toUpperCase(),dispositivo=conectaAcessoV1Texto_(p.dispositivo),referencia='';
  if(!dispositivo)throw new Error('A identificação do aparelho está ausente.');
  if(perfil==='TACS'){
    var acesso=tacsTerritorioV1ValidarSessaoToken_(p,false);
    if(!acesso||!acesso.tacsId)throw new Error('Sessão TACS inválida.');
    referencia=conectaAcessoV1Id_(acesso.tacsId);
  }else if(perfil==='ADMIN'||perfil==='ADMINISTRADOR'){
    if(typeof profissionaisDinamicosV1ValidarSessao_!=='function')throw new Error('A autenticação administrativa não está disponível.');
    var admin=profissionaisDinamicosV1ValidarSessao_(p);
    if(!admin||admin.ok!==true)throw new Error('Sessão administrativa inválida.');
    perfil='ADMIN';referencia='ADMIN_GERAL';
  }else throw new Error('Perfil inválido para registrar este aparelho.');
  var chave=conectaAcessoV1Token_('ctr1'),chaveHash=conectaAcessoV1Hash_(chave),dispositivoHash=conectaAcessoV1Hash_(dispositivo);
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS),last=sh.getLastRow(),row=0,agora=new Date();
  if(last>1){
    var rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS.length).getValues();
    for(var i=rows.length-1;i>=0;i--){
      if(conectaAcessoV1Texto_(rows[i][1])===perfil&&conectaAcessoV1Id_(rows[i][2])===referencia&&conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][3]),dispositivoHash)){row=i+2;break;}
    }
  }
  var vals=['TRUST-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),perfil,referencia,dispositivoHash,chaveHash,true,agora,agora];
  if(row){
    vals[0]=conectaAcessoV1Texto_(sh.getRange(row,1).getValue())||vals[0];
    vals[6]=sh.getRange(row,7).getValue()||agora;
    sh.getRange(row,1,1,vals.length).setValues([vals]);
  }else sh.appendRow(vals);
  return {ok:true,perfil:perfil,chaveConfianca:chave,message:'Aparelho reconhecido para recuperação segura de PIN.'};
}

function conectaAcessoV1ConfiancaValida_(perfil,referencia,dispositivo,chave){
  perfil=conectaAcessoV1Texto_(perfil).toUpperCase();referencia=conectaAcessoV1Id_(referencia);
  dispositivo=conectaAcessoV1Texto_(dispositivo);chave=conectaAcessoV1Texto_(chave);
  if(!dispositivo||!/^ctr1\./.test(chave))return false;
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS),last=sh.getLastRow();
  if(last<=1)return false;
  var dh=conectaAcessoV1Hash_(dispositivo),kh=conectaAcessoV1Hash_(chave),rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS.length).getValues();
  for(var i=rows.length-1;i>=0;i--){
    if(conectaAcessoV1Texto_(rows[i][1])!==perfil||conectaAcessoV1Id_(rows[i][2])!==referencia||!conectaAcessoV1Bool_(rows[i][5]))continue;
    if(conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][3]),dh)&&conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][4]),kh))return true;
  }
  return false;
}

function conectaAcessoV1RecuperarIniciar_(p){
  var perfil=conectaAcessoV1Texto_(p.perfil).toUpperCase(),cpf=conectaAcessoV1Cpf_(p.cpf),payload=null;
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo),chave=conectaAcessoV1Texto_(p.chaveConfianca||p.quickKey);
  if(!dispositivo)throw new Error('A identificação do aparelho está ausente.');
  if(perfil==='MORADOR'){
    var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),r=conectaAcessoV1AcessoPorCpf_(sh,cpf);
    if(!r)throw new Error('CPF não localizado em um acesso de morador.');
    if(!/^cmq1\./.test(chave)||!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(r.values[8]),conectaAcessoV1Hash_(chave))||!conectaAcessoV1Seguro_(conectaAcessoV1Texto_(r.values[9]),conectaAcessoV1Hash_(dispositivo))){
      throw new Error('Por segurança, recupere o PIN no aparelho já reconhecido por este morador.');
    }
    payload={perfil:'MORADOR',accessId:r.values[0],cpf:cpf,dispositivoHash:conectaAcessoV1Hash_(dispositivo)};
  }else if(perfil==='TACS'){
    var t=conectaAcessoV1TacsPorCpf_(cpf);
    if(!t||!t.ativo)throw new Error('CPF não localizado em um TACS ativo.');
    if(!conectaAcessoV1ConfiancaValida_('TACS',t.tacsId,dispositivo,chave))throw new Error('Por segurança, recupere o PIN em um aparelho já reconhecido para este TACS.');
    payload={perfil:'TACS',tacsId:t.tacsId,cpf:cpf,dispositivoHash:conectaAcessoV1Hash_(dispositivo)};
  }else if(perfil==='ADMIN'||perfil==='ADMINISTRADOR'){
    if(!conectaAcessoV1CpfAdministrador_(cpf))throw new Error('CPF não localizado entre os administradores cadastrados.');
    if(!conectaAcessoV1ConfiancaValida_('ADMIN','ADMIN_GERAL',dispositivo,chave))throw new Error('Por segurança, recupere o PIN em um aparelho já reconhecido para a administração.');
    payload={perfil:'ADMIN',cpf:cpf,dispositivoHash:conectaAcessoV1Hash_(dispositivo)};
  }else throw new Error('Selecione Administrador, TACS ou Morador.');
  var token=conectaAcessoV1TokenCache_('cr1',TACS_CONECTA_ACESSO_V1.RECOVERY_PREFIX,payload,TACS_CONECTA_ACESSO_V1.RECOVERY_SECONDS);
  return {ok:true,recuperacaoToken:token,perfil:payload.perfil,message:'CPF e aparelho confirmados. Crie um novo PIN.'};
}

function conectaAcessoV1RecuperarSalvar_(p){
  var rec=conectaAcessoV1LerTokenCache_(p.recuperacaoToken,TACS_CONECTA_ACESSO_V1.RECOVERY_PREFIX,'cr1');
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo||!rec.dispositivoHash||!conectaAcessoV1Seguro_(rec.dispositivoHash,conectaAcessoV1Hash_(dispositivo)))throw new Error('A recuperação precisa ser concluída no mesmo aparelho confirmado.');
  var pin=conectaAcessoV1Pin_(p.pin,p.confirmacao);
  if(rec.perfil==='MORADOR'){
    var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),r=conectaAcessoV1AcessoPorId_(sh,rec.accessId);
    if(!r)throw new Error('Acesso do morador não localizado.');
    var salt=Utilities.getUuid().replace(/-/g,'');sh.getRange(r.row,7,1,2).setValues([[salt,conectaAcessoV1Hash_(salt+'|'+pin)]]);sh.getRange(r.row,18).setValue(new Date());
  }else if(rec.perfil==='TACS'){
    conectaAcessoV1SalvarPinTacs_(rec.tacsId,pin);
  }else{
    conectaAcessoV1SalvarPinAdmin_(pin);
  }
  conectaAcessoV1ApagarTokenCache_(p.recuperacaoToken,TACS_CONECTA_ACESSO_V1.RECOVERY_PREFIX);
  return {ok:true,message:'Novo PIN salvo. Volte ao acesso e entre com os quatro números.'};
}

function conectaAcessoV1ContarPendenciasArea_(areaId){
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.PENDING_SHEET,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS),last=sh.getLastRow(),n=0,area=conectaAcessoV1Id_(areaId);
  if(last<=1)return 0;
  sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS.length).getDisplayValues().forEach(function(v){
    if(conectaAcessoV1Texto_(v[7]).toUpperCase()!=='PENDENTE')return;
    if(area&&conectaAcessoV1Id_(v[1])!==area)return;
    n++;
  });
  return n;
}

function conectaAcessoV1PendenciasContagem_(p){
  var areaId='';
  if(p.territorioToken){
    var a=tacsTerritorioV1ValidarSessaoToken_(p,false);areaId=a.areaId;
  }else{
    if(typeof profissionaisDinamicosV1ValidarSessao_!=='function')throw new Error('Validação administrativa indisponível.');
    profissionaisDinamicosV1ValidarSessao_(p);areaId=conectaAcessoV1Id_(p.areaId);
  }
  var n=conectaAcessoV1ContarPendenciasArea_(areaId);
  return {ok:true,pendencias:n,areaId:areaId};
}

function conectaAcessoV1SalvarCpf_(item,cpf){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  try{
    if(conectaAcessoV1BuscarCpf_(cpf).length)throw new Error('Este CPF já está associado a outro cadastro.');
    var fonte=item.fonte,morador=item.morador;
    moradoresAdminV1SetCell_(fonte.sheet,item.row,fonte.map.cpf,cpf,'@');
    moradoresAdminV1SetCell_(fonte.sheet,item.row,fonte.map.ultimaAtualizacao,new Date(),'dd/MM/yyyy HH:mm:ss');
    var contexto={perfil:'PUBLICO',operadorId:'AUTO:PRIMEIRO_ACESSO_CONECTA',agenteId:item.area.agenteId||'',areaId:item.area.areaId,areaNome:item.area.areaNome||item.area.areaId,unidadeId:item.area.unidadeId||'',planilhaId:item.area.planilhaId,permissoes:[]};
    moradoresAdminV1Auditar_(fonte.ss,{moradorId:morador.idPortal||morador.id||item.chave,acao:'VINCULAR_CPF_PRIMEIRO_ACESSO',campos:'CPF_PREENCHIDO_EM_CAMPO_VAZIO'},contexto);
    SpreadsheetApp.flush();
    if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);
  }finally{lock.releaseLock();}
}

function conectaAcessoV1BuscarCpf_(cpf){
  var out=[];conectaAcessoV1Areas_().forEach(function(area){conectaAcessoV1RegistrosArea_(area).forEach(function(x){if(x.morador.cpf===cpf)out.push(x);});});return out;
}
function conectaAcessoV1BuscarNascimento_(nascimento,areaPreferida){
  var out=[];conectaAcessoV1Areas_().forEach(function(area){if(areaPreferida&&area.areaId!==areaPreferida)return;conectaAcessoV1RegistrosArea_(area).forEach(function(x){if(x.morador.nascimento===nascimento)out.push(x);});});return out;
}
function conectaAcessoV1RegistrosArea_(area){
  var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId||'',areaId:area.areaId,areaNome:area.areaNome||area.areaId,unidadeId:area.unidadeId||'',planilhaId:area.planilhaId,permissoes:[]};
  var fonte=moradoresAdminV1LocalizarFonte_(contexto),last=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn(),out=[];
  if(last<=fonte.headerRow+1)return out;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,last-(fonte.headerRow+1),lastCol),raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var m=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map),status=conectaAcessoV1Texto_(m.status||'ATIVO').toUpperCase();
    if(!m.nome||['FORA_DA_AREA','TRANSFERIDO','FALECIDO','IMPORTACAO_DESFEITA','INATIVO'].indexOf(status)!==-1)continue;
    out.push({area:area,fonte:fonte,row:fonte.headerRow+2+i,morador:m,chave:moradoresAdminV1ChaveRegistro_(m)});
  }
  return out;
}
function conectaAcessoV1Areas_(){
  var lista=typeof moradoresAdminV1CatalogoAreas_==='function'?moradoresAdminV1CatalogoAreas_():(typeof tacsTerritorioV1LerAreas_==='function'?tacsTerritorioV1LerAreas_():[]);
  return (lista||[]).filter(function(a){return a&&a.ativa!==false&&a.publica!==false&&a.planilhaId;}).map(function(a){return {areaId:conectaAcessoV1Id_(a.areaId),areaNome:conectaAcessoV1Texto_(a.areaNome||a.areaId),unidadeId:conectaAcessoV1Texto_(a.unidadeId),planilhaId:conectaAcessoV1Texto_(a.planilhaId),agenteId:conectaAcessoV1Texto_(a.agenteId||a.tacsId)};});
}

function conectaAcessoV1CriarPendencia_(areaId,cpf,nome,nascimento,dispositivo,motivo){
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.PENDING_SHEET,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS),last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS.length).getDisplayValues():[];
  for(var i=rows.length-1;i>=0;i--)if(rows[i][2]===cpf&&conectaAcessoV1Texto_(rows[i][7]).toUpperCase()==='PENDENTE')return {id:rows[i][0],row:i+2};
  var id='CMP-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),agora=new Date();
  sh.appendRow([id,areaId,cpf,nome,nascimento,conectaAcessoV1Hash_(dispositivo),motivo,'PENDENTE',agora,agora]);
  return {id:id,row:sh.getLastRow()};
}

/* REENTRADA_PIN_EXPANDE_NUCLEO_FAMILIAR_2026_09_16_V1
 * Resolve o titular dentro da area gravada no acesso e usa MORADOR_CHAVE antes
 * do CPF. Assim, o PIN identifica a pessoa, mas a resposta sempre e montada a
 * partir do vinculo familiar territorial dessa pessoa, independentemente de
 * qual integrante criou o PIN.
 */
function conectaAcessoV1NucleoFamiliar_(v){
  var titularUnico={nome:v[4],cpf:v[3],documentoAcesso:v[3],tipoDocumento:'CPF',nascimento:v[5]||'',temDocumento:Boolean(v[3]),responsavel:true};
  if(conectaAcessoV1Bool_(v[13]))return {familiaId:'',membros:[titularUnico]};
  try{
    var areaId=conectaAcessoV1Id_(v[1]),cpf=conectaAcessoV1Texto_(v[3]),moradorChave=conectaAcessoV1Texto_(v[2]);
    var area=(conectaAcessoV1Areas_()||[]).filter(function(a){return conectaAcessoV1Id_(a.areaId)===areaId;})[0];
    if(!area)return {familiaId:'',membros:[titularUnico]};
    var registros=conectaAcessoV1RegistrosArea_(area),titular=null;
    if(moradorChave)titular=registros.filter(function(x){return conectaAcessoV1Texto_(x.chave)===moradorChave;})[0]||null;
    if(!titular){
      var peloCpf=registros.filter(function(x){return conectaAcessoV1Texto_(x.morador&&x.morador.cpf)===cpf;});
      if(peloCpf.length===1)titular=peloCpf[0];
    }
    if(!titular)return {familiaId:'',membros:[titularUnico]};
    titularUnico.nome=conectaAcessoV1Texto_(titular.morador.nome)||titularUnico.nome;
    titularUnico.nascimento=conectaAcessoV1Texto_(titular.morador.nascimento)||titularUnico.nascimento;
    titularUnico.localidade=conectaAcessoV1Texto_(titular.morador.endereco||titular.morador.localidade||'');
    titularUnico.documentoAcesso=conectaAcessoV1Texto_(titular.morador.cpf||v[3]);
    titularUnico.cpf=titularUnico.documentoAcesso;
    titularUnico.temDocumento=Boolean(titularUnico.documentoAcesso);
    var familia=typeof vinculoFamiliarNotifV1CodigoEndereco_==='function'?identificacaoFamiliarPublicaV1NormalizarFamilia_(vinculoFamiliarNotifV1CodigoEndereco_(titular.morador.endereco)):'';
    if(!familia)return {familiaId:'',membros:[titularUnico]};
    var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
    var membros=typeof selecaoMembroFamiliaPublicaV1CriarLista_==='function'?selecaoMembroFamiliaPublicaV1CriarLista_(familia,contexto):(typeof identificacaoFamiliarPublicaV1Membros_==='function'?identificacaoFamiliarPublicaV1Membros_(familia,contexto):[]);
    membros=(membros||[]).map(function(m){return {token:m.token||'',nome:m.nome||'',nascimento:m.nascimento||'',localidade:m.localidade||'',documentoAcesso:m.documentoAcesso||'',tipoDocumento:m.tipoDocumento||'',temDocumento:Boolean(m.temDocumento||m.documentoAcesso),identidadeToken:m.identidadeToken||'',acessoPreparado:Boolean(m.acessoPreparado),responsavel:conectaAcessoV1Nome_(m.nome)===conectaAcessoV1Nome_(v[4])};});
    return {familiaId:familia,membros:membros.length?membros:[titularUnico]};
  }catch(e){return {familiaId:'',membros:[titularUnico]};}
}

function conectaAcessoV1Familia_(v){
  return conectaAcessoV1NucleoFamiliar_(v).membros;
}

function conectaAcessoV1AparelhoAdministrativo_(dispositivo){
  dispositivo=conectaAcessoV1Texto_(dispositivo);
  if(!dispositivo)return false;
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS),last=sh.getLastRow();
  if(last<=1)return false;
  var dh=conectaAcessoV1Hash_(dispositivo),rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS.length).getValues();
  for(var i=rows.length-1;i>=0;i--){
    if(conectaAcessoV1Texto_(rows[i][1])!=='ADMIN'||!conectaAcessoV1Bool_(rows[i][5]))continue;
    if(conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][3]),dh))return true;
  }
  return false;
}

function conectaAcessoV1BuscarCns_(cns){
  var out=[],doc=conectaAcessoV1Texto_(cns).replace(/\D/g,'');
  conectaAcessoV1Areas_().forEach(function(area){
    conectaAcessoV1RegistrosArea_(area).forEach(function(x){
      if(conectaAcessoV1Texto_(x.morador.cns).replace(/\D/g,'')===doc)out.push(x);
    });
  });
  return out;
}

function conectaAcessoV1FiltrarAreaDiagnostico_(lista,areaId){
  areaId=conectaAcessoV1Id_(areaId);
  if(!areaId)return lista||[];
  return (lista||[]).filter(function(item){return conectaAcessoV1Id_(item&&item.area&&item.area.areaId)===areaId;});
}

function conectaAcessoV1NormalizarFamiliaDiagnostico_(valor){
  if(typeof buscaEnvioFamiliaV1NormalizarFamilia_==='function')return buscaEnvioFamiliaV1NormalizarFamilia_(valor);
  var s=conectaAcessoV1Texto_(valor).toUpperCase().replace(/\s+/g,''),m=s.match(/^(\d{1,4})([A-Z])?$/);
  if(!m)return'';
  var numero=m[1];if(numero.length<=3)numero=('000'+numero).slice(-3);
  return numero+(m[2]||'');
}

function conectaAcessoV1CodigoFamiliaItem_(item){
  if(!item||!item.morador||typeof vinculoFamiliarNotifV1CodigoEndereco_!=='function')return'';
  return conectaAcessoV1NormalizarFamiliaDiagnostico_(vinculoFamiliarNotifV1CodigoEndereco_(item.morador.endereco||''));
}

function conectaAcessoV1FamiliaDiagnostico_(item){
  if(!item||!item.area)return {familiaId:'',membros:[]};
  var familia=conectaAcessoV1CodigoFamiliaItem_(item);
  if(!familia){
    return {familiaId:'',membros:[{
      nome:conectaAcessoV1Texto_(item.morador&&item.morador.nome),
      nascimento:conectaAcessoV1Texto_(item.morador&&item.morador.nascimento),
      idPortal:conectaAcessoV1Texto_(item.morador&&item.morador.idPortal),
      selecionado:true
    }]};
  }
  /* CORRECAO_CIRURGICA_DIAGNOSTICO_MORADOR_TIMEOUT_V1:
     reaproveita os registros já lidos na mesma busca e evita reler a planilha
     apenas para montar a família do morador localizado. */
  var registros=Array.isArray(item._registrosArea)?item._registrosArea:conectaAcessoV1RegistrosFamiliaDiagnostico_(item.area,familia);
  var membros=registros.filter(function(x){
    return conectaAcessoV1CodigoFamiliaItem_(x)===familia;
  }).map(function(x){
    return {
      nome:conectaAcessoV1Texto_(x.morador.nome),
      nascimento:conectaAcessoV1Texto_(x.morador.nascimento),
      idPortal:conectaAcessoV1Texto_(x.morador.idPortal||x.morador.id),
      selecionado:conectaAcessoV1Texto_(x.chave)===conectaAcessoV1Texto_(item.chave)
    };
  });
  return {familiaId:familia,membros:membros};
}

function conectaAcessoV1RespostaDiagnosticoItem_(item,tipo){
  var m=item.morador||{},a=item.area||{},familia=conectaAcessoV1FamiliaDiagnostico_(item);
  return {
    ok:true,modo:'DIAGNOSTICO_ADMINISTRATIVO',coreMode:'DIAGNOSTICO_ADMINISTRATIVO',somenteLeitura:true,
    documentoTipo:tipo,nome:conectaAcessoV1Texto_(m.nome),nascimento:conectaAcessoV1Texto_(m.nascimento),
    areaId:conectaAcessoV1Id_(a.areaId),areaNome:conectaAcessoV1Texto_(a.areaNome||a.areaId),
    unidadeId:conectaAcessoV1Texto_(a.unidadeId),cadastroArea:familia.familiaId,familiaId:familia.familiaId,
    encontrado:true,familia:familia.membros,familiaTotal:familia.membros.length,consultaFamilia:false,
    vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false,
    message:'Diagnóstico administrativo concluído sem criar ou alterar vínculo residencial.'
  };
}

function conectaAcessoV1BuscarNomeNascimentoDiagnostico_(nome,nascimento,areaId){
  nome=conectaAcessoV1Nome_(nome);nascimento=conectaAcessoV1Nascimento_(nascimento);
  var out=[];
  conectaAcessoV1Areas_().forEach(function(area){
    if(areaId&&conectaAcessoV1Id_(area.areaId)!==conectaAcessoV1Id_(areaId))return;
    conectaAcessoV1RegistrosArea_(area).forEach(function(x){
      if(conectaAcessoV1Nome_(x.morador.nome)===nome&&conectaAcessoV1Texto_(x.morador.nascimento)===nascimento)out.push(x);
    });
  });
  return out;
}

function conectaAcessoV1RegistrosFamiliaDiagnostico_(area,familia){
  /* CORRECAO_CIRURGICA_BUSCA_MORADOR_CADASTRO_FAST_V2:
     bloco exclusivo da busca administrativa do Morador pelo número de cadastro na área.
     Em vez de carregar todas as linhas/colunas da planilha, localiza primeiro somente
     as linhas cujo endereço contém o cadastro familiar e monta apenas esses moradores.
     Não altera CPF, CNS, nome, nascimento, PIN, sessão, UBS, TACS ou demais painéis. */
  familia=conectaAcessoV1NormalizarFamiliaDiagnostico_(familia);
  var partes=familia.match(/^0*(\d{1,4})([A-Z])?$/);
  if(!partes)return [];
  var numero=partes[1].replace(/^0+/,'')||'0',sufixo=partes[2]||'';
  var contexto={
    perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId||'',
    areaId:area.areaId,areaNome:area.areaNome||area.areaId,
    unidadeId:area.unidadeId||'',planilhaId:area.planilhaId,permissoes:[]
  };
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(fonte.map.endereco==null||fonte.map.endereco<0)return [];
  var primeira=fonte.headerRow+2,ultima=fonte.sheet.getLastRow(),out=[];
  if(ultima<primeira)return out;
  var expressao=',\\s*0*'+numero+sufixo+'\\s*\\.';
  var achados=fonte.sheet
    .getRange(primeira,fonte.map.endereco+1,ultima-primeira+1,1)
    .createTextFinder(expressao)
    .useRegularExpression(true)
    .matchCase(false)
    .findAll()||[];
  var ultimaColuna=fonte.sheet.getLastColumn();
  achados.forEach(function(celula){
    var linha=celula.getRow(),faixa=fonte.sheet.getRange(linha,1,1,ultimaColuna);
    var raw=faixa.getValues()[0],display=faixa.getDisplayValues()[0];
    var morador=moradoresAdminV1MontarMorador_(display,raw,fonte.map);
    var status=conectaAcessoV1Texto_(morador.status||'ATIVO').toUpperCase();
    if(!morador.nome||['FORA_DA_AREA','TRANSFERIDO','FALECIDO','IMPORTACAO_DESFEITA','INATIVO'].indexOf(status)!==-1)return;
    var item={area:area,fonte:fonte,row:linha,morador:morador,chave:moradoresAdminV1ChaveRegistro_(morador)};
    if(conectaAcessoV1CodigoFamiliaItem_(item)===familia)out.push(item);
  });
  return out;
}

function conectaAcessoV1BuscarCadastroAreaDiagnostico_(cadastro,areaId,excluirAreaId){
  var valor=conectaAcessoV1Texto_(cadastro).toUpperCase(),familia=conectaAcessoV1NormalizarFamiliaDiagnostico_(valor),areas=conectaAcessoV1Areas_();
  if(areaId)areas=areas.filter(function(a){return conectaAcessoV1Id_(a.areaId)===conectaAcessoV1Id_(areaId);});
  else if(excluirAreaId)areas=areas.filter(function(a){return conectaAcessoV1Id_(a.areaId)!==conectaAcessoV1Id_(excluirAreaId);});
  var grupos=[];
  if(familia){
    areas.forEach(function(area){
      var membros=conectaAcessoV1RegistrosFamiliaDiagnostico_(area,familia);
      if(membros.length)grupos.push({area:area,membros:membros});
    });
    if(grupos.length>1)throw new Error('Este número de cadastro existe em mais de uma área. Selecione a área correta na Central e pesquise novamente.');
    if(grupos.length===1){
      var g=grupos[0];
      return {
        familia:true,
        resposta:{
          ok:true,modo:'DIAGNOSTICO_ADMINISTRATIVO',coreMode:'DIAGNOSTICO_ADMINISTRATIVO',somenteLeitura:true,
          documentoTipo:'CADASTRO_AREA',consultaFamilia:true,nome:'',nascimento:'',
          areaId:conectaAcessoV1Id_(g.area.areaId),areaNome:conectaAcessoV1Texto_(g.area.areaNome||g.area.areaId),
          unidadeId:conectaAcessoV1Texto_(g.area.unidadeId),cadastroArea:familia,familiaId:familia,
          familia:g.membros.map(function(x){return {nome:conectaAcessoV1Texto_(x.morador.nome),nascimento:conectaAcessoV1Texto_(x.morador.nascimento),idPortal:conectaAcessoV1Texto_(x.morador.idPortal||x.morador.id),selecionado:false};}),
          familiaTotal:g.membros.length,vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false,
          message:'Cadastro familiar localizado pelo vínculo interno da área.'
        }
      };
    }
    /* Um cadastro normalizável como família não cai no varrimento genérico por ID.
       Se não foi encontrado nesta área, o chamador preserva o fallback para as demais áreas. */
    return {familia:false,pessoas:[]};
  }
  var pessoais=[];
  areas.forEach(function(area){
    conectaAcessoV1RegistrosArea_(area).forEach(function(x){
      var idPortal=conectaAcessoV1Texto_(x.morador.idPortal).toUpperCase(),id=conectaAcessoV1Texto_(x.morador.id).toUpperCase();
      if(valor&&(valor===idPortal||valor===id))pessoais.push(x);
    });
  });
  return {familia:false,pessoas:pessoais};
}

function conectaAcessoV1FiltrosDiagnostico_(p){
  var cpf=moradoresAdminV1Digitos_(p.cpf||''),cns=moradoresAdminV1Digitos_(p.cns||'');
  var nome=conectaAcessoV1Texto_(p.nome),nascimentoBruto=conectaAcessoV1Texto_(p.nascimento);
  var cadastro=conectaAcessoV1Texto_(p.cadastroArea||p.cadastro||''),areaId=conectaAcessoV1Id_(p.areaId);
  var legado=moradoresAdminV1Digitos_(p.documento||'');
  if(!cpf&&!cns&&legado){if(/^\d{11}$/.test(legado))cpf=legado;else if(/^\d{15}$/.test(legado))cns=legado;}
  if(!cpf&&!cns&&!nome&&!nascimentoBruto&&!cadastro)throw new Error('Informe ao menos um dado para pesquisar o morador.');
  if(cpf)cpf=conectaAcessoV1Cpf_(cpf);
  if(cns&&!/^\d{15}$/.test(cns))throw new Error('Confira o Cartão SUS (CNS) informado.');
  var nascimento='';
  if(nascimentoBruto){
    nascimento=conectaAcessoV1Nascimento_(nascimentoBruto);
    if(!nascimento)throw new Error('Confira a data de nascimento informada.');
  }
  return {
    areaId:areaId,cpf:cpf,cns:cns,nome:nome,nomeNormalizado:nome?conectaAcessoV1Nome_(nome):'',
    nascimento:nascimento,cadastro:cadastro,cadastroNormalizado:conectaAcessoV1Texto_(cadastro).toUpperCase(),
    familiaNormalizada:cadastro?conectaAcessoV1NormalizarFamiliaDiagnostico_(cadastro):''
  };
}

function conectaAcessoV1ItemDiagnosticoLinha_(area,fonte,linha){
  linha=Number(linha);
  if(!fonte||!fonte.sheet||!linha||linha<=fonte.headerRow+1||linha>fonte.sheet.getLastRow())return null;
  var faixa=fonte.sheet.getRange(linha,1,1,fonte.sheet.getLastColumn());
  var raw=faixa.getValues()[0],display=faixa.getDisplayValues()[0];
  var m=moradoresAdminV1MontarMorador_(display,raw,fonte.map);
  var status=conectaAcessoV1Texto_(m.status||'ATIVO').toUpperCase();
  if(!m.nome||['FORA_DA_AREA','TRANSFERIDO','FALECIDO','IMPORTACAO_DESFEITA','INATIVO'].indexOf(status)!==-1)return null;
  return {area:area,fonte:fonte,row:linha,morador:m,chave:moradoresAdminV1ChaveRegistro_(m)};
}

function conectaAcessoV1LinhasDiagnosticoRapidas_(fonte,filtros){
  var primeira=fonte.headerRow+2,ultima=fonte.sheet.getLastRow(),campo='',termo='',regex=false;
  if(ultima<primeira)return [];
  function regexDocumento(valor){
    var d=moradoresAdminV1Digitos_(valor);
    if(!d)return'';
    return '^\\D*'+d.split('').join('\\D*')+'\\D*$';
  }
  if(filtros.cpf){campo='cpf';termo=regexDocumento(filtros.cpf);regex=true;}
  else if(filtros.cns){campo='cns';termo=regexDocumento(filtros.cns);regex=true;}
  else if(filtros.nascimento){campo='nascimento';termo=filtros.nascimento;}
  else if(filtros.nome){campo='nome';termo=filtros.nome;}
  else return [];
  var col=Number(fonte.map&&fonte.map[campo]);
  if(!isFinite(col)||col<0||!termo)return [];
  var finder=fonte.sheet.getRange(primeira,col+1,ultima-primeira+1,1).createTextFinder(termo).matchCase(false);
  if(regex)finder.useRegularExpression(true);
  var achados=[];
  try{achados=finder.findAll()||[];}catch(e){return [];}
  var vistas={},linhas=[];
  achados.forEach(function(celula){
    var linha=celula.getRow();
    if(vistas[linha])return;
    vistas[linha]=true;linhas.push(linha);
  });
  linhas.sort(function(a,b){return a-b;});
  return linhas;
}

function conectaAcessoV1ItemCombinaDiagnostico_(x,filtros){
  if(!x||!x.morador)return false;
  var m=x.morador||{};
  if(filtros.cpf&&moradoresAdminV1Digitos_(m.cpf)!==moradoresAdminV1Digitos_(filtros.cpf))return false;
  if(filtros.cns&&moradoresAdminV1Digitos_(m.cns)!==filtros.cns)return false;
  if(filtros.nomeNormalizado){
    var nomeMorador=conectaAcessoV1Nome_(m.nome);
    if(nomeMorador!==filtros.nomeNormalizado&&nomeMorador.indexOf(filtros.nomeNormalizado)===-1)return false;
  }
  if(filtros.nascimento&&conectaAcessoV1Texto_(m.nascimento)!==filtros.nascimento)return false;
  if(filtros.cadastro){
    var familia=conectaAcessoV1CodigoFamiliaItem_(x);
    var idPortal=conectaAcessoV1Texto_(m.idPortal).toUpperCase(),id=conectaAcessoV1Texto_(m.id).toUpperCase();
    var cadastroOk=(filtros.familiaNormalizada&&familia===filtros.familiaNormalizada)||
      filtros.cadastroNormalizado===idPortal||filtros.cadastroNormalizado===id;
    if(!cadastroOk)return false;
  }
  return true;
}

function conectaAcessoV1BuscarDiagnostico_(filtros,excluirAreaId){
  var areas=conectaAcessoV1Areas_(),out=[];
  if(filtros.areaId)areas=areas.filter(function(a){return conectaAcessoV1Id_(a.areaId)===filtros.areaId;});
  else if(excluirAreaId)areas=areas.filter(function(a){return conectaAcessoV1Id_(a.areaId)!==conectaAcessoV1Id_(excluirAreaId);});
  areas.forEach(function(area){
    /* BUSCA_MORADOR_DIAGNOSTICO_FAST_2026_09_21_V1:
       o diagnóstico administrativo é somente leitura. Primeiro localiza apenas
       as linhas candidatas na coluna mais seletiva (CPF, CNS, nascimento ou nome)
       e só então monta esses moradores. O varrimento completo fica como fallback
       de compatibilidade quando o TextFinder não consegue representar um dado legado. */
    if(filtros.cadastro&&filtros.familiaNormalizada){
      var familiares=conectaAcessoV1RegistrosFamiliaDiagnostico_(area,filtros.familiaNormalizada);
      familiares.forEach(function(x){if(conectaAcessoV1ItemCombinaDiagnostico_(x,filtros))out.push(x);});
      return;
    }
    var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId||'',areaId:area.areaId,areaNome:area.areaNome||area.areaId,unidadeId:area.unidadeId||'',planilhaId:area.planilhaId,permissoes:[]};
    var fonte=moradoresAdminV1LocalizarFonte_(contexto);
    var linhas=conectaAcessoV1LinhasDiagnosticoRapidas_(fonte,filtros);
    if(linhas.length){
      linhas.forEach(function(linha){
        var x=conectaAcessoV1ItemDiagnosticoLinha_(area,fonte,linha);
        if(x&&conectaAcessoV1ItemCombinaDiagnostico_(x,filtros))out.push(x);
      });
      return;
    }
    /* Fallback sem alterar a regra de busca anterior. */
    var registros=conectaAcessoV1RegistrosArea_(area);
    registros.forEach(function(x){
      if(conectaAcessoV1ItemCombinaDiagnostico_(x,filtros)){x._registrosArea=registros;out.push(x);}
    });
  });
  return out;
}

function conectaAcessoV1FamiliasDiagnosticoLista_(lista){
  var grupos={},ordem=[];
  (lista||[]).forEach(function(item){
    var familia=conectaAcessoV1FamiliaDiagnostico_(item),a=item.area||{},familiaId=familia.familiaId||'';
    var chave=conectaAcessoV1Id_(a.areaId)+'|'+(familiaId||conectaAcessoV1Texto_(item.chave));
    if(!grupos[chave]){
      grupos[chave]={
        familiaId:familiaId,areaId:conectaAcessoV1Id_(a.areaId),areaNome:conectaAcessoV1Texto_(a.areaNome||a.areaId),
        unidadeId:conectaAcessoV1Texto_(a.unidadeId),membros:familia.membros||[],selecionados:{}
      };
      ordem.push(chave);
    }
    var m=item.morador||{},id=conectaAcessoV1Texto_(m.idPortal||m.id);
    if(id)grupos[chave].selecionados[id]=true;
    grupos[chave].selecionados[conectaAcessoV1Nome_(m.nome)+'|'+conectaAcessoV1Texto_(m.nascimento)]=true;
  });
  return ordem.map(function(chave){
    var g=grupos[chave];
    g.membros=(g.membros||[]).map(function(m){
      var id=conectaAcessoV1Texto_(m.idPortal),ident=conectaAcessoV1Nome_(m.nome)+'|'+conectaAcessoV1Texto_(m.nascimento);
      return {nome:m.nome||'',nascimento:m.nascimento||'',idPortal:id,selecionado:Boolean(g.selecionados[id]||g.selecionados[ident])};
    });
    delete g.selecionados;
    return g;
  });
}

function conectaAcessoV1RespostaDiagnosticoLista_(lista,filtros){
  if(!lista.length){
    return {
      ok:true,encontrado:false,modo:'DIAGNOSTICO_ADMINISTRATIVO',coreMode:'DIAGNOSTICO_ADMINISTRATIVO',somenteLeitura:true,
      vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false,
      message:'Nenhum cadastro localizado com os dados informados.'
    };
  }
  if(lista.length===1)return conectaAcessoV1RespostaDiagnosticoItem_(lista[0],'BUSCA_COMBINADA');
  var familias=conectaAcessoV1FamiliasDiagnosticoLista_(lista),primeira=familias[0]||{},somenteCadastro=Boolean(filtros.cadastro&&!filtros.cpf&&!filtros.cns&&!filtros.nome&&!filtros.nascimento);
  return {
    ok:true,encontrado:true,modo:'DIAGNOSTICO_ADMINISTRATIVO',coreMode:'DIAGNOSTICO_ADMINISTRATIVO',somenteLeitura:true,
    documentoTipo:'BUSCA_COMBINADA',consultaMultipla:familias.length>1,consultaFamilia:somenteCadastro&&familias.length===1,
    nome:'',nascimento:'',areaId:primeira.areaId||'',areaNome:familias.length===1?(primeira.areaNome||primeira.areaId||''):'Mais de uma área',
    unidadeId:familias.length===1?(primeira.unidadeId||''):'',familias:familias,familiaTotal:familias.reduce(function(total,g){return total+(g.membros||[]).length;},0),
    vinculoAparelhoCriado:false,vinculoMoradorAlterado:false,notificacoesAlteradas:false,sessaoMoradorCriada:false,
    message:familias.length===1?'Cadastro e família localizados.':'Cadastros compatíveis e respectivas famílias localizados.'
  };
}

function conectaAcessoV1DiagnosticoMoradorAdmin_(p){
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo),chave=conectaAcessoV1Texto_(p.chaveConfianca);
  if(!dispositivo||!conectaAcessoV1ConfiancaValida_('ADMIN','ADMIN_GERAL',dispositivo,chave))throw new Error('Aparelho administrativo não reconhecido para diagnóstico.');
  var filtros=conectaAcessoV1FiltrosDiagnostico_(p),areaOriginal=filtros.areaId;
  /* HOTFIX_DIAGNOSTICO_AREA_RESILIENTE_V2:
     a área lembrada pela Central é apenas a primeira tentativa. Se esse contexto local
     estiver desatualizado e não houver resultado, repete a mesma busca em todas as áreas,
     evitando o falso "Nenhum cadastro localizado" sem alterar vínculos do Morador. */
  var somenteCadastro=Boolean(filtros.cadastro&&!filtros.cpf&&!filtros.cns&&!filtros.nome&&!filtros.nascimento);
  if(somenteCadastro){
    var porCadastro=conectaAcessoV1BuscarCadastroAreaDiagnostico_(filtros.cadastro,filtros.areaId);
    if(porCadastro&&porCadastro.resposta)return porCadastro.resposta;
    if(porCadastro&&porCadastro.pessoais&&porCadastro.pessoais.length){
      return conectaAcessoV1RespostaDiagnosticoLista_(porCadastro.pessoais,filtros);
    }
    if(areaOriginal){
      filtros.areaId='';
      porCadastro=conectaAcessoV1BuscarCadastroAreaDiagnostico_(filtros.cadastro,'',areaOriginal);
      if(porCadastro&&porCadastro.resposta)return porCadastro.resposta;
    }
    return conectaAcessoV1RespostaDiagnosticoLista_(porCadastro&&porCadastro.pessoais||[],filtros);
  }
  var lista=conectaAcessoV1BuscarDiagnostico_(filtros);
  if(!lista.length&&areaOriginal){
    /* Procura somente nas demais áreas: a área preferida já foi lida uma vez. */
    filtros.areaId='';
    lista=conectaAcessoV1BuscarDiagnostico_(filtros,areaOriginal);
  }
  return conectaAcessoV1RespostaDiagnosticoLista_(lista,filtros);
}

function conectaAcessoV1RegistrarUbsConfiavel_(ubs,dispositivo){
  var chave=conectaAcessoV1Token_('ctr1'),chaveHash=conectaAcessoV1Hash_(chave),dispositivoHash=conectaAcessoV1Hash_(dispositivo);
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS),last=sh.getLastRow(),row=0,agora=new Date(),referencia=conectaAcessoV1Id_(ubs.tacsId);
  if(last>1){
    var rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS.length).getValues();
    for(var i=rows.length-1;i>=0;i--){
      if(conectaAcessoV1Texto_(rows[i][1])==='UBS'&&conectaAcessoV1Id_(rows[i][2])===referencia&&conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][3]),dispositivoHash)){row=i+2;break;}
    }
  }
  var vals=['TRUST-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),'UBS',referencia,dispositivoHash,chaveHash,true,agora,agora];
  if(row){vals[0]=conectaAcessoV1Texto_(sh.getRange(row,1).getValue())||vals[0];vals[6]=sh.getRange(row,7).getValue()||agora;sh.getRange(row,1,1,vals.length).setValues([vals]);}
  else sh.appendRow(vals);
  return chave;
}

function conectaAcessoV1ReferenciaUbsConfiavel_(dispositivo,chave){
  if(!dispositivo||!/^ctr1\./.test(chave))return '';
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS),last=sh.getLastRow();
  if(last<=1)return '';
  var dh=conectaAcessoV1Hash_(dispositivo),kh=conectaAcessoV1Hash_(chave),rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS.length).getValues();
  for(var i=rows.length-1;i>=0;i--){
    if(conectaAcessoV1Texto_(rows[i][1])!=='UBS'||!conectaAcessoV1Bool_(rows[i][5]))continue;
    if(conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][3]),dh)&&conectaAcessoV1Seguro_(conectaAcessoV1Texto_(rows[i][4]),kh))return conectaAcessoV1Id_(rows[i][2]);
  }
  return '';
}

function conectaAcessoV1CriarSessaoUbs_(ubs,dispositivo){
  var token=conectaAcessoV1Token_('cus1'),payload={token:token,cadastroId:ubs.tacsId,dispositivoHash:conectaAcessoV1Hash_(dispositivo),criadoEm:Date.now()};
  CacheService.getScriptCache().put(TACS_CONECTA_ACESSO_V1.UBS_SESSION_PREFIX+conectaAcessoV1Hash_(token),JSON.stringify(payload),TACS_CONECTA_ACESSO_V1.SESSION_SECONDS);
  return payload;
}

function conectaAcessoV1RespostaUbs_(ubs,dispositivo,chave,mensagem){
  /* CORRECAO_CIRURGICA_UBS_LOGIN_ATIVO_V1:
     O login da UBS volta a concluir somente a autenticação e a criação da sessão.
     A leitura territorial completa permanece no carregamento dos painéis, como fallback já existente.
     Evita bloquear "Validando o PIN da UBS…" com leituras de áreas/publicação durante o login. */
  var sessao=conectaAcessoV1CriarSessaoUbs_(ubs,dispositivo);
  return {
    ok:true,token:sessao.token,perfil:conectaAcessoV1Texto_(ubs.perfil)||'UBS',cadastroId:ubs.tacsId,nome:ubs.nomeCompleto,funcaoUbs:ubs.funcaoUbs,
    unidadeId:ubs.unidadeId,permissoes:Array.isArray(ubs.permissoes)?ubs.permissoes.slice():[],
    areas:[],ubsAtual:null,
    chaveConfianca:chave||'',vinculoAparelhoCriado:true,message:mensagem||'Acesso UBS validado.'
  };
}

function conectaAcessoV1ValidarSessaoUbs_(p,silencioso){
  p=p&&typeof p==='object'?p:{};
  var explicito=conectaAcessoV1Texto_(p.ubsToken),token=explicito||conectaAcessoV1Texto_(p.token);
  if(token.indexOf('cus1.')!==0){
    if(silencioso&&!explicito)return null;
    if(!token)return silencioso?null:null;
    if(explicito)throw new Error('Sessão da UBS inválida.');
    return null;
  }
  var dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('Este aparelho ainda não foi identificado.');
  var raw='';
  try{raw=CacheService.getScriptCache().get(TACS_CONECTA_ACESSO_V1.UBS_SESSION_PREFIX+conectaAcessoV1Hash_(token))||'';}catch(erroCache){}
  if(!raw)throw new Error('A sessão da UBS expirou. Entre novamente com o PIN.');
  var sessao;
  try{sessao=JSON.parse(raw);}catch(erroJson){throw new Error('A sessão da UBS é inválida.');}
  if(!sessao||sessao.dispositivoHash!==conectaAcessoV1Hash_(dispositivo))throw new Error('A sessão da UBS pertence a outro aparelho.');
  if(typeof tacsTerritorioV1LerTacs_!=='function'||typeof tacsTerritorioV1PerfilTem_!=='function'||typeof tacsTerritorioV1LerAreas_!=='function')throw new Error('O contexto territorial da UBS não está disponível.');
  /* CORRECAO_CIRURGICA_UBS_CONTEXTO_SEM_RELEITURA_V1:
     a validação da sessão lê TACS e áreas uma única vez e entrega o mesmo snapshot
     para admin_territorio_dados reutilizar na mesma execução. Evita reler as mesmas
     planilhas 3x/2x antes de abrir os painéis da UBS. */
  var todosTacs=tacsTerritorioV1LerTacs_(),ubs=null;
  for(var ti=0;ti<todosTacs.length;ti++)if(conectaAcessoV1Id_(todosTacs[ti]&&todosTacs[ti].tacsId)===conectaAcessoV1Id_(sessao.cadastroId)){ubs=todosTacs[ti];break;}
  if(!ubs||ubs.ativo!==true||!tacsTerritorioV1PerfilTem_(ubs.perfil,'UBS'))throw new Error('O acesso desta UBS foi desativado ou alterado.');
  var unidadeId=conectaAcessoV1Id_(ubs.unidadeId);
  if(!unidadeId)throw new Error('A UBS não possui unidade de saúde vinculada.');
  var areas=tacsTerritorioV1LerAreas_().filter(function(area){return area&&area.ativa===true&&conectaAcessoV1Id_(area.unidadeId)===unidadeId;});
  if(!areas.length)throw new Error('A UBS não possui área ativa vinculada.');
  var pedida=conectaAcessoV1Id_(p.areaId||p.area),area=null;
  if(pedida){
    for(var i=0;i<areas.length;i++)if(conectaAcessoV1Id_(areas[i].areaId)===pedida){area=areas[i];break;}
    if(!area)throw new Error('Esta área não pertence à UBS autenticada.');
  }
  if(!area)area=areas[0];
  return {
    ok:true,perfil:'UBS',perfilCadastro:conectaAcessoV1Texto_(ubs.perfil)||'UBS',
    operadorId:'UBS:'+conectaAcessoV1Id_(ubs.tacsId),agenteId:conectaAcessoV1Id_(area.tacsId),
    tacsId:conectaAcessoV1Id_(ubs.tacsId),cadastroId:conectaAcessoV1Id_(ubs.tacsId),
    areaId:conectaAcessoV1Id_(area.areaId),areaNome:conectaAcessoV1Texto_(area.areaNome)||conectaAcessoV1Id_(area.areaId),
    unidadeId:unidadeId,planilhaId:conectaAcessoV1Texto_(area.planilhaId),
    permissoes:Array.isArray(ubs.permissoes)?ubs.permissoes.slice():[],ubsToken:token,
    contextoUbsInterno:{todosTacs:todosTacs,areasUbs:areas,ubsAtual:ubs}
  };
}

function conectaAcessoV1EncerrarUbs_(p){
  var token=conectaAcessoV1Texto_(p&&p.ubsToken||p&&p.token);
  if(token.indexOf('cus1.')===0){
    try{CacheService.getScriptCache().remove(TACS_CONECTA_ACESSO_V1.UBS_SESSION_PREFIX+conectaAcessoV1Hash_(token));}catch(erro){}
  }
  return {ok:true,message:'Sessão da UBS encerrada.'};
}

function conectaAcessoV1IdentificarUbsPrimeiroAcesso_(p){
  // Compatibilidade com versões antigas em cache: CPF deixa de identificar a UBS.
  // O cadastro institucional e o computador da unidade usam somente o PIN.
  return conectaAcessoV1LoginUbs_(p||{});
}

function conectaAcessoV1UbsPorPin_(pin){
  if(typeof tacsTerritorioV1LerTacs_!=='function'||typeof tacsTerritorioV1PerfilTem_!=='function')throw new Error('O cadastro de perfis da UBS não está disponível.');
  var lista=tacsTerritorioV1LerTacs_().filter(function(item){
    return item&&item.ativo===true&&tacsTerritorioV1PerfilTem_(item.perfil,'UBS')&&item.pinSalt&&item.pinHash&&
      tacsTerritorioV1CompararSeguro_(item.pinHash,tacsTerritorioV1HashPin_(pin,item.pinSalt));
  });
  if(lista.length!==1)throw new Error(lista.length>1?'Há mais de uma UBS com este PIN. O administrador precisa corrigir a duplicidade.':'PIN da UBS não localizado.');
  return lista[0];
}

function conectaAcessoV1LoginUbs_(p){
  var pin=conectaAcessoV1Texto_(p.pin).replace(/\D/g,''),dispositivo=conectaAcessoV1Texto_(p.dispositivo),chave=conectaAcessoV1Texto_(p.chaveConfianca);
  if(!dispositivo)throw new Error('Este aparelho ainda não foi identificado.');
  if(!/^\d{4,8}$/.test(pin))throw new Error('Informe o PIN de acesso com 4 a 8 números.');
  if(typeof tacsTerritorioV1PerfilTem_!=='function')throw new Error('O cadastro de perfis da UBS não está disponível.');

  /* UBS_LOGIN_LEITURA_UNICA: somente este login lê cada tabela em uma operação.
     Não reutiliza hash/PIN/permissões de cache: alterações e revogações são lidas agora. */
  var ss=tacsTerritorioV1Planilha_();
  function ler(nome,headers){
    var sheet=ss.getSheetByName(nome);
    if(!sheet)return [];
    var values=sheet.getDataRange().getValues(),head=values[0]||[];
    for(var h=0;h<headers.length;h++){
      if(conectaAcessoV1Chave_(head[h])!==conectaAcessoV1Chave_(headers[h]))
        throw new Error('A estrutura da aba '+nome+' não confere. Nenhuma gravação foi feita.');
    }
    return values.slice(1);
  }
  var referencia='',ubs=null,novaChave='';
  if(/^ctr1\./.test(chave)){
    var trust=ler(TACS_CONECTA_ACESSO_V1.TRUST_SHEET,TACS_CONECTA_ACESSO_V1.TRUST_HEADERS);
    var dh=conectaAcessoV1Hash_(dispositivo),kh=conectaAcessoV1Hash_(chave);
    for(var i=trust.length-1;i>=0;i--){
      var row=trust[i];
      if(conectaAcessoV1Texto_(row[1])==='UBS'&&conectaAcessoV1Bool_(row[5])&&
         conectaAcessoV1Seguro_(conectaAcessoV1Texto_(row[3]),dh)&&conectaAcessoV1Seguro_(conectaAcessoV1Texto_(row[4]),kh)){
        referencia=conectaAcessoV1Id_(row[2]);break;
      }
    }
  }
  var rows=ler(TACS_TERRITORIO_V1.TACS_SHEET,TACS_TERRITORIO_V1.TACS_HEADERS),map={};
  TACS_TERRITORIO_V1.TACS_HEADERS.forEach(function(h,i){map[h]=i});
  var tabela={map:map},lista=rows.map(function(v){
    return tacsTerritorioV1TacsDeLinha_(tabela,{values:v,display:v});
  }).filter(function(item){return !!item.tacsId}).slice(0,TACS_TERRITORIO_V1.MAX_TACS);
  function confere(item){
    return item&&item.ativo===true&&tacsTerritorioV1PerfilTem_(item.perfil,'UBS')&&item.pinSalt&&item.pinHash&&
      tacsTerritorioV1CompararSeguro_(item.pinHash,tacsTerritorioV1HashPin_(pin,item.pinSalt));
  }
  if(referencia){
    for(var j=0;j<lista.length;j++){
      if(conectaAcessoV1Id_(lista[j].tacsId)===referencia&&confere(lista[j])){ubs=lista[j];break;}
    }
  }
  if(!ubs){
    var matches=lista.filter(confere);
    if(matches.length!==1)throw new Error(matches.length>1?'Há mais de uma UBS com este PIN. O administrador precisa corrigir a duplicidade.':'PIN da UBS não localizado.');
    ubs=matches[0];
    novaChave=conectaAcessoV1RegistrarUbsConfiavel_(ubs,dispositivo);
  }
  if(!conectaAcessoV1Texto_(ubs.unidadeId))throw new Error('O cadastro UBS precisa de uma unidade de saúde válida.');
  return conectaAcessoV1RespostaUbs_(ubs,dispositivo,novaChave,novaChave?'UBS identificada pelo PIN. Este computador foi reconhecido para os próximos acessos.':'Acesso UBS validado neste computador.');
}

function conectaAcessoV1TacsPorCpf_(cpf){
  if(typeof tacsTerritorioV1LerTacs_!=='function')return null;
  var list=tacsTerritorioV1LerTacs_();for(var i=0;i<list.length;i++)if(conectaAcessoV1Texto_(list[i].cpf).replace(/\D/g,'')===cpf)return list[i];return null;
}
function conectaAcessoV1CpfAdministrador_(cpf){
  var t=conectaAcessoV1TacsPorCpf_(cpf);
  if(t&&(/^ADMIN/i.test(conectaAcessoV1Texto_(t.perfil))||conectaAcessoV1Id_(t.tacsId)==='AG001'))return true;
  try{
    var ss=tacsTerritorioV1Planilha_(),achou=false;
    ss.getSheets().forEach(function(sh){
      if(achou||!/(ADMIN|USUAR|OPERADOR|ACESSO)/i.test(sh.getName())||sh.getLastRow()<2)return;
      var cols=Math.min(sh.getLastColumn(),40),head=sh.getRange(1,1,1,cols).getDisplayValues()[0].map(conectaAcessoV1Chave_),cpfI=head.indexOf('CPF');
      if(cpfI<0)return;
      var perfilI=Math.max(head.indexOf('PERFIL'),head.indexOf('TIPO'),head.indexOf('PAPEL')),statusI=Math.max(head.indexOf('STATUS'),head.indexOf('ATIVO'));
      sh.getRange(2,1,sh.getLastRow()-1,cols).getDisplayValues().some(function(row){
        if(conectaAcessoV1Texto_(row[cpfI]).replace(/\D/g,'')!==cpf)return false;
        var perfil=perfilI>=0?conectaAcessoV1Texto_(row[perfilI]).toUpperCase():'ADMIN';
        var status=statusI>=0?conectaAcessoV1Texto_(row[statusI]).toUpperCase():'ATIVO';
        if(/ADMIN/.test(perfil)&&!/(INATIVO|FALSE|NAO|NÃO)/.test(status)){achou=true;return true;}return false;
      });
    });return achou;
  }catch(e){return false;}
}
function conectaAcessoV1SalvarPinTacs_(tacsId,pin){
  var tab=tacsTerritorioV1TabelaTacs_(true),t=tacsTerritorioV1EncontrarTacs_(tacsId);if(!t)throw new Error('TACS não localizado.');
  var row=0;
  for(var i=0;i<tab.rows.length;i++)if(conectaAcessoV1Id_(tab.rows[i].display[tab.map.TACS_ID])===conectaAcessoV1Id_(tacsId)){row=tab.rows[i].row;break;}
  if(!row)throw new Error('Linha do TACS não localizada.');
  var salt=Utilities.getUuid().replace(/-/g,'');
  tab.sheet.getRange(row,tab.map.PIN_SALT+1).setValue(salt);
  tab.sheet.getRange(row,tab.map.PIN_HASH+1).setValue(tacsTerritorioV1HashPin_(pin,salt));
  if(tab.map.ATUALIZADO_EM>=0)tab.sheet.getRange(row,tab.map.ATUALIZADO_EM+1).setValue(new Date());
}
function conectaAcessoV1SalvarPinAdmin_(pin){
  if(typeof ADMIN_TACS_V1==='undefined'||typeof adminTacsV1Hash_!=='function')throw new Error('A autenticação administrativa principal não está disponível.');
  var props=PropertiesService.getScriptProperties(),salt=props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT)||Utilities.getUuid();
  props.setProperty(ADMIN_TACS_V1.PROP_PIN_SALT,salt);props.setProperty(ADMIN_TACS_V1.PROP_PIN_HASH,adminTacsV1Hash_(salt+'|'+pin));
}

function conectaAcessoV1CriarSessao_(v,dispositivo){
  var token=conectaAcessoV1Token_('cms1'),payload={token:token,accessId:v[0],cpf:v[3],areaId:v[1],dispositivoHash:conectaAcessoV1Hash_(dispositivo),criadoEm:Date.now()};
  CacheService.getScriptCache().put(TACS_CONECTA_ACESSO_V1.SESSION_PREFIX+conectaAcessoV1Hash_(token),JSON.stringify(payload),TACS_CONECTA_ACESSO_V1.SESSION_SECONDS);
  return payload;
}
function conectaAcessoV1ValidarSessao_(p){
  var token=conectaAcessoV1Texto_(p.token),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!/^cms1\./.test(token)||!dispositivo)throw new Error('Sessão de morador ausente.');
  var raw=CacheService.getScriptCache().get(TACS_CONECTA_ACESSO_V1.SESSION_PREFIX+conectaAcessoV1Hash_(token));
  if(!raw)throw new Error('Sua sessão expirou. Entre novamente com seu PIN.');
  var s=JSON.parse(raw);if(s.dispositivoHash!==conectaAcessoV1Hash_(dispositivo))throw new Error('Esta sessão pertence a outro aparelho.');return s;
}

function conectaAcessoV1SubscriptionAtiva_(areaId,subscriptionId){
  if(typeof saudeNotificacoesV1GarantirSheet_!=='function'||typeof TACS_SAUDE_NOTIFICACOES_V1==='undefined')return false;
  var ss=tacsTerritorioV1Planilha_(),sh=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS),last=sh.getLastRow();
  if(last<=1)return false;
  var rows=sh.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues(),sub=conectaAcessoV1Texto_(subscriptionId).toLowerCase(),area=conectaAcessoV1Id_(areaId);
  for(var i=rows.length-1;i>=0;i--){
    if(conectaAcessoV1Texto_(rows[i][0]).toLowerCase()!==sub)continue;
    if(conectaAcessoV1Id_(rows[i][1])!==area)return false;
    return rows[i][7]==='SIM'&&rows[i][8]==='SIM'&&rows[i][9]==='SIM'&&rows[i][10]==='SIM';
  }
  return false;
}

function conectaAcessoV1AtualizarAcesso_(id,updates){
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),r=conectaAcessoV1AcessoPorId_(sh,id);if(!r)throw new Error('Acesso não localizado.');
  Object.keys(updates).forEach(function(k){sh.getRange(r.row,Number(k)+1).setValue(updates[k]);});sh.getRange(r.row,18).setValue(new Date());
}
function conectaAcessoV1AcessoPorCpf_(sh,cpf){return conectaAcessoV1AcessoBusca_(sh,function(v){var gravado=conectaAcessoV1Texto_(v[3]).replace(/\D/g,''),chave=conectaAcessoV1Texto_(v[2]).toUpperCase();return gravado===cpf||chave==='CPF:'+cpf;});}
function conectaAcessoV1AcessoPorId_(sh,id){return conectaAcessoV1AcessoBusca_(sh,function(v){return conectaAcessoV1Texto_(v[0])===id;});}
function conectaAcessoV1AcessoPorQuick_(sh,quick){var h=conectaAcessoV1Hash_(quick);return conectaAcessoV1AcessoBusca_(sh,function(v){return conectaAcessoV1Seguro_(v[8],h);});}
function conectaAcessoV1AcessoBusca_(sh,fn){
  var last=sh.getLastRow();if(last<=1)return null;var rows=sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS.length).getValues();
  for(var i=rows.length-1;i>=0;i--)if(fn(rows[i]))return {row:i+2,values:rows[i]};return null;
}
function conectaAcessoV1Sheet_(nome,headers){
  var ss=tacsTerritorioV1Planilha_(),sh=ss.getSheetByName(nome);
  if(!sh){sh=ss.insertSheet(nome);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
  else{
    var atual=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getDisplayValues()[0];
    for(var i=0;i<headers.length;i++)if(conectaAcessoV1Chave_(atual[i])!==conectaAcessoV1Chave_(headers[i]))throw new Error('A estrutura da aba '+nome+' não confere. Nenhuma gravação foi feita.');
  }
  return sh;
}

function conectaAcessoV1Pin_(pin,confirmacao){var a=conectaAcessoV1PinSomente_(pin),b=conectaAcessoV1PinSomente_(confirmacao);if(a!==b)throw new Error('Os dois PINs precisam ser iguais.');return a;}
function conectaAcessoV1PinSomente_(pin){var p=conectaAcessoV1Texto_(pin).replace(/\D/g,'');if(!/^\d{4}$/.test(p))throw new Error('O PIN deve ter exatamente 4 números.');return p;}
function conectaAcessoV1Cpf_(v){var d=conectaAcessoV1Texto_(v).replace(/\D/g,'');if(!/^\d{11}$/.test(d)||typeof moradoresAdminV1CpfValido_!=='function'||!moradoresAdminV1CpfValido_(d))throw new Error('Informe um CPF válido com 11 números.');return d;}
function conectaAcessoV1Nascimento_(v){return typeof moradoresAdminV1DataBr_==='function'?moradoresAdminV1DataBr_(v):'';}
function conectaAcessoV1Nome_(v){return typeof moradoresAdminV1NormalizarBusca_==='function'?moradoresAdminV1NormalizarBusca_(v):conectaAcessoV1Texto_(v).toLowerCase();}
function conectaAcessoV1Bool_(v){if(v===true||v===1)return true;return ['1','TRUE','SIM','ATIVO','ATIVA','YES'].indexOf(conectaAcessoV1Texto_(v).toUpperCase())!==-1;}
function conectaAcessoV1Texto_(v){return String(v==null?'':v).trim();}
function conectaAcessoV1Id_(v){var s=conectaAcessoV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9_-]/g,'').slice(0,64);}
function conectaAcessoV1Chave_(v){var s=conectaAcessoV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9]/g,'');}
function conectaAcessoV1Erro_(e){var m=conectaAcessoV1Texto_(e&&e.message?e.message:e);return m||'Não foi possível concluir a operação agora.';}
function conectaAcessoV1Pepper_(){var p=PropertiesService.getScriptProperties(),v=p.getProperty(TACS_CONECTA_ACESSO_V1.PEPPER_PROPERTY);if(!v){v=Utilities.getUuid()+Utilities.getUuid();p.setProperty(TACS_CONECTA_ACESSO_V1.PEPPER_PROPERTY,v);}return v;}
function conectaAcessoV1Hash_(v){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,conectaAcessoV1Pepper_()+'|'+conectaAcessoV1Texto_(v),Utilities.Charset.UTF_8);return bytes.map(function(b){var x=(b+256)%256;return ('0'+x.toString(16)).slice(-2);}).join('');}
function conectaAcessoV1Seguro_(a,b){a=conectaAcessoV1Texto_(a);b=conectaAcessoV1Texto_(b);if(a.length!==b.length)return false;var x=0;for(var i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
function conectaAcessoV1Token_(prefix){return prefix+'.'+Utilities.getUuid().replace(/-/g,'')+'.'+Utilities.getUuid().replace(/-/g,'');}
function conectaAcessoV1TokenCache_(prefix,keyPrefix,payload,ttl){var t=conectaAcessoV1Token_(prefix);CacheService.getScriptCache().put(keyPrefix+conectaAcessoV1Hash_(t),JSON.stringify(payload),ttl);return t;}
function conectaAcessoV1LerTokenCache_(token,keyPrefix,prefix){token=conectaAcessoV1Texto_(token);if(token.indexOf(prefix+'.')!==0)throw new Error('Confirmação expirada ou inválida.');var raw=CacheService.getScriptCache().get(keyPrefix+conectaAcessoV1Hash_(token));if(!raw)throw new Error('Esta confirmação expirou. Recomece a etapa.');return JSON.parse(raw);}
function conectaAcessoV1ApagarTokenCache_(token,keyPrefix){try{CacheService.getScriptCache().remove(keyPrefix+conectaAcessoV1Hash_(token));}catch(e){}}
function conectaAcessoV1Limitar_(key){var cache=CacheService.getScriptCache(),k=TACS_CONECTA_ACESSO_V1.RATE_PREFIX+conectaAcessoV1Hash_(key).slice(0,32),n=Number(cache.get(k)||0)+1;if(n>TACS_CONECTA_ACESSO_V1.RATE_MAX)throw new Error('Muitas tentativas seguidas. Aguarde alguns minutos.');cache.put(k,String(n),TACS_CONECTA_ACESSO_V1.RATE_SECONDS);}
function conectaAcessoV1GuardarResultado_(id,r){CacheService.getScriptCache().put(TACS_CONECTA_ACESSO_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_CONECTA_ACESSO_V1.RESULT_SECONDS);}
function conectaAcessoV1LerResultado_(id){var x=CacheService.getScriptCache().get(TACS_CONECTA_ACESSO_V1.RESULT_PREFIX+id);if(!x)return null;try{return JSON.parse(x);}catch(e){return null;}}
function conectaAcessoV1ResponderPost_(id,r){var html='<!doctype html><meta charset="utf-8"><script>try{parent.postMessage('+JSON.stringify(JSON.stringify({source:'conecta-acesso-v1',requestId:id,result:r}))+",'*')}catch(e){}<\/script>";return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function conectaAcessoV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=conectaAcessoV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
