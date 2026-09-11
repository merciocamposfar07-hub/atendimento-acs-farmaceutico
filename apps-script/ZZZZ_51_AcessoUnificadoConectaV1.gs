/**
 * ZZZZ_51_AcessoUnificadoConectaV1.gs
 * Conecta Saúde Comunitária — entrada única Admin/TACS/Morador V1.
 *
 * Acrescenta o primeiro acesso do morador sem alterar as rotas já existentes:
 * CPF -> nascimento -> nome (somente quando necessário) -> PIN -> notificações.
 * Se o cadastro não puder ser conciliado, cria pendência e NÃO bloqueia o serviço.
 */
var TACS_CONECTA_ACESSO_V1 = Object.freeze({
  VERSAO:'1.0.0',
  ACCESS_SHEET:'TACS_CONECTA_ACESSO_MORADOR',
  PENDING_SHEET:'TACS_CONECTA_PENDENCIAS',
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
    'conecta_morador_preferencia_notificacao','conecta_morador_encerrar',
    'conecta_pin_recuperar_iniciar','conecta_pin_recuperar_salvar',
    'conecta_pendencias_contagem'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var id=conectaAcessoV1Texto_(p.requestId),resultado;
  try{
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação inválido.');
    if(['conecta_morador_identificar','conecta_morador_confirmar','conecta_morador_login_pin','conecta_pin_recuperar_iniciar'].indexOf(action)!==-1)conectaAcessoV1Limitar_(p.dispositivo||p.cpf||action);
    if(action==='conecta_morador_identificar')resultado=conectaAcessoV1Identificar_(p);
    else if(action==='conecta_morador_confirmar')resultado=conectaAcessoV1Confirmar_(p);
    else if(action==='conecta_morador_criar_pin')resultado=conectaAcessoV1CriarPin_(p);
    else if(action==='conecta_morador_login_pin')resultado=conectaAcessoV1LoginMorador_(p);
    else if(action==='conecta_morador_sessao')resultado=conectaAcessoV1SessaoMorador_(p);
    else if(action==='conecta_morador_notificacao_confirmar')resultado=conectaAcessoV1ConfirmarNotificacao_(p);
    else if(action==='conecta_morador_preferencia_notificacao')resultado=conectaAcessoV1PreferenciaNotificacao_(p);
    else if(action==='conecta_morador_encerrar')resultado=conectaAcessoV1EncerrarMorador_(p);
    else if(action==='conecta_pin_recuperar_iniciar')resultado=conectaAcessoV1RecuperarIniciar_(p);
    else if(action==='conecta_pin_recuperar_salvar')resultado=conectaAcessoV1RecuperarSalvar_(p);
    else resultado=conectaAcessoV1PendenciasContagem_(p);
  }catch(erro){
    resultado={ok:false,message:conectaAcessoV1Erro_(erro)};
  }
  conectaAcessoV1GuardarResultado_(id,resultado);
  return conectaAcessoV1ResponderPost_(id,resultado);
}

function conectaAcessoV1Identificar_(p){
  var cpf=conectaAcessoV1Cpf_(p.cpf),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('Este aparelho ainda não foi identificado.');
  var achados=conectaAcessoV1BuscarCpf_(cpf);
  if(achados.length===1)return conectaAcessoV1IdentidadeResposta_(achados[0],cpf,false,'Cadastro localizado.');
  if(achados.length>1)return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:true,message:'Precisamos confirmar mais um dado para localizar seu cadastro com segurança.'};
  return {ok:true,encontrado:false,precisaNascimento:true,ambiguo:false,message:'CPF ainda não localizado. Informe sua data de nascimento.'};
}

function conectaAcessoV1Confirmar_(p){
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
    if(!item.morador.cpf)conectaAcessoV1SalvarCpf_(item,cpf);
    item.morador.cpf=cpf;
    return conectaAcessoV1IdentidadeResposta_(item,cpf,false,'Cadastro localizado. CPF vinculado e salvo.');
  }
  if(candidatos.length>1){
    return {ok:true,encontrado:false,precisaNome:true,message:'Ainda há mais de um cadastro possível. Confira o nome completo.'};
  }
  if(!nome){
    return {ok:true,encontrado:false,precisaNome:true,message:'Não localizamos com segurança. Informe também seu nome completo.'};
  }
  return conectaAcessoV1CriarPendenteResposta_(p,cpf,nascimento,nome,areaPreferida,'CADASTRO_NAO_LOCALIZADO');
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
    if(registro)sheet.getRange(registro.row,1,1,vals.length).setValues([vals]);else sheet.appendRow(vals);
    var session=conectaAcessoV1CriarSessao_(vals,dispositivo);
    return {ok:true,token:session.token,quickKey:quick,perfil:'MORADOR',areaId:identidade.areaId,areaNome:identidade.areaNome||identidade.areaId,nome:identidade.nome,cpf:identidade.cpf,notificacoesAtivas:Boolean(vals[10]),provisorio:Boolean(vals[13]),pendenciaId:vals[14],message:'PIN criado e salvo.'};
  }finally{lock.releaseLock();}
}

function conectaAcessoV1LoginMorador_(p){
  var pin=conectaAcessoV1PinSomente_(p.pin),quick=conectaAcessoV1Texto_(p.quickKey),dispositivo=conectaAcessoV1Texto_(p.dispositivo);
  if(!/^cmq1\./.test(quick)||!dispositivo)throw new Error('Este aparelho ainda não possui um acesso de morador reconhecido.');
  var sheet=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),registro=conectaAcessoV1AcessoPorQuick_(sheet,quick);
  if(!registro||!conectaAcessoV1Bool_(registro.values[15]))throw new Error('Acesso não localizado ou inativo.');
  if(!conectaAcessoV1Seguro_(registro.values[7],conectaAcessoV1Hash_(registro.values[6]+'|'+pin)))throw new Error('PIN incorreto.');
  var session=conectaAcessoV1CriarSessao_(registro.values,dispositivo);
  return {ok:true,token:session.token,perfil:'MORADOR',areaId:registro.values[1],nome:registro.values[4],cpf:registro.values[3],notificacoesAtivas:conectaAcessoV1Bool_(registro.values[10]),silencioso:conectaAcessoV1Bool_(registro.values[12]),provisorio:conectaAcessoV1Bool_(registro.values[13]),pendenciaId:conectaAcessoV1Texto_(registro.values[14])};
}

function conectaAcessoV1SessaoMorador_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p);
  var sheet=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),registro=conectaAcessoV1AcessoPorId_(sheet,sessao.accessId);
  if(!registro)throw new Error('Acesso do morador não localizado.');
  var v=registro.values,familia=conectaAcessoV1Familia_(v);
  return {ok:true,perfil:'MORADOR',areaId:v[1],cpf:v[3],nome:v[4],nascimento:v[5],notificacoesAtivas:conectaAcessoV1Bool_(v[10]),subscriptionId:conectaAcessoV1Texto_(v[11]).toLowerCase(),silencioso:conectaAcessoV1Bool_(v[12]),provisorio:conectaAcessoV1Bool_(v[13]),pendenciaId:conectaAcessoV1Texto_(v[14]),familia:familia};
}

function conectaAcessoV1ConfirmarNotificacao_(p){
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

function conectaAcessoV1EncerrarMorador_(p){
  var sessao=conectaAcessoV1ValidarSessao_(p);
  try{CacheService.getScriptCache().remove(TACS_CONECTA_ACESSO_V1.SESSION_PREFIX+conectaAcessoV1Hash_(sessao.token));}catch(e){}
  return {ok:true,message:'Sessão encerrada.'};
}

function conectaAcessoV1RecuperarIniciar_(p){
  var perfil=conectaAcessoV1Texto_(p.perfil).toUpperCase(),cpf=conectaAcessoV1Cpf_(p.cpf),payload=null;
  if(perfil==='MORADOR'){
    var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS),r=conectaAcessoV1AcessoPorCpf_(sh,cpf);
    if(!r)throw new Error('CPF não localizado em um acesso de morador.');
    payload={perfil:'MORADOR',accessId:r.values[0],cpf:cpf};
  }else if(perfil==='TACS'){
    var t=conectaAcessoV1TacsPorCpf_(cpf);
    if(!t||!t.ativo)throw new Error('CPF não localizado em um TACS ativo.');
    payload={perfil:'TACS',tacsId:t.tacsId,cpf:cpf};
  }else if(perfil==='ADMIN'||perfil==='ADMINISTRADOR'){
    if(!conectaAcessoV1CpfAdministrador_(cpf))throw new Error('CPF não localizado entre os administradores cadastrados.');
    payload={perfil:'ADMIN',cpf:cpf};
  }else throw new Error('Selecione Administrador, TACS ou Morador.');
  var token=conectaAcessoV1TokenCache_('cr1',TACS_CONECTA_ACESSO_V1.RECOVERY_PREFIX,payload,TACS_CONECTA_ACESSO_V1.RECOVERY_SECONDS);
  return {ok:true,recuperacaoToken:token,perfil:payload.perfil,message:'CPF confirmado. Crie um novo PIN.'};
}

function conectaAcessoV1RecuperarSalvar_(p){
  var rec=conectaAcessoV1LerTokenCache_(p.recuperacaoToken,TACS_CONECTA_ACESSO_V1.RECOVERY_PREFIX,'cr1');
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

function conectaAcessoV1PendenciasContagem_(p){
  var areaId='';
  if(p.territorioToken){
    var a=tacsTerritorioV1ValidarSessaoToken_(p,false);areaId=a.areaId;
  }else{
    if(typeof profissionaisDinamicosV1ValidarSessao_!=='function')throw new Error('Validação administrativa indisponível.');
    profissionaisDinamicosV1ValidarSessao_(p);areaId=conectaAcessoV1Id_(p.areaId);
  }
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.PENDING_SHEET,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS),last=sh.getLastRow(),n=0;
  if(last>1)sh.getRange(2,1,last-1,TACS_CONECTA_ACESSO_V1.PENDING_HEADERS.length).getDisplayValues().forEach(function(v){
    if(conectaAcessoV1Texto_(v[7]).toUpperCase()!=='PENDENTE')return;
    if(areaId&&conectaAcessoV1Id_(v[1])!==areaId)return;n++;
  });
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

function conectaAcessoV1Familia_(v){
  if(conectaAcessoV1Bool_(v[13]))return [{nome:v[4],cpf:v[3],responsavel:true}];
  try{
    var areaId=conectaAcessoV1Id_(v[1]),cpf=conectaAcessoV1Texto_(v[3]),achados=conectaAcessoV1BuscarCpf_(cpf);
    if(achados.length!==1)return [{nome:v[4],cpf:v[3],responsavel:true}];
    var familia=typeof vinculoFamiliarNotifV1CodigoEndereco_==='function'?vinculoFamiliarNotifV1CodigoEndereco_(achados[0].morador.endereco):'';
    if(!familia)return [{nome:v[4],cpf:v[3],responsavel:true}];
    var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:achados[0].area.agenteId,areaId:areaId,areaNome:achados[0].area.areaNome,unidadeId:achados[0].area.unidadeId,planilhaId:achados[0].area.planilhaId,permissoes:[]};
    var membros=typeof identificacaoFamiliarPublicaV1Membros_==='function'?identificacaoFamiliarPublicaV1Membros_(familia,contexto):[];
    return (membros||[]).map(function(m){return {idPortal:m.idPortal||m.id||'',nome:m.nome||'',nascimento:m.nascimento||'',responsavel:conectaAcessoV1Nome_(m.nome)===conectaAcessoV1Nome_(v[4])};});
  }catch(e){return [{nome:v[4],cpf:v[3],responsavel:true}];}
}

function conectaAcessoV1TacsPorCpf_(cpf){
  if(typeof tacsTerritorioV1LerTacs_!=='function')return null;
  var list=tacsTerritorioV1LerTacs_();for(var i=0;i<list.length;i++)if(conectaAcessoV1Texto_(list[i].cpf).replace(/\D/g,'')===cpf)return list[i];return null;
}
function conectaAcessoV1CpfAdministrador_(cpf){
  var t=conectaAcessoV1TacsPorCpf_(cpf);
  if(t&&/^ADMIN/i.test(conectaAcessoV1Texto_(t.perfil)))return true;
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
function conectaAcessoV1AcessoPorCpf_(sh,cpf){return conectaAcessoV1AcessoBusca_(sh,function(v){return conectaAcessoV1Texto_(v[3]).replace(/\D/g,'')===cpf;});}
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
