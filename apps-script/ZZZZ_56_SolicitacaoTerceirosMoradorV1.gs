/**
 * CSC — solicitação por morador para beneficiário de OUTRO núcleo familiar.
 * Módulo isolado: não modifica PIN, cadastro, família, agendas ou rotas existentes.
 * Implantar somente após homologação. Ativação específica por área JAPARANDUBA.
 */
var TACS_CSC_TERCEIROS_V1=Object.freeze({
  VERSAO:'1.0.0',
  AREA:'JAPARANDUBA',
  RESULT_PREFIX:'csc_terceiros_result_v1_',
  SELECT_PREFIX:'csc_terceiros_select_v1_',
  RESULT_TTL:300,
  SELECT_TTL:600
});
var cscTerceirosV1GetAnterior_,cscTerceirosV1PostAnterior_;
(function instalarCscTerceirosV1_(){
  if(typeof doGet==='function'){
    cscTerceirosV1GetAnterior_=doGet;
    doGet=function(e){return cscTerceirosV1Get_(e)||cscTerceirosV1GetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    cscTerceirosV1PostAnterior_=doPost;
    doPost=function(e){return cscTerceirosV1Post_(e)||cscTerceirosV1PostAnterior_(e);};
  }
})();
function cscTerceirosV1Texto_(v){return String(v==null?'':v).trim();}
function cscTerceirosV1Digitos_(v){return cscTerceirosV1Texto_(v).replace(/\D/g,'');}
function cscTerceirosV1Id_(v){var s=cscTerceirosV1Texto_(v);if(!/^[A-Za-z0-9_-]{24,160}$/.test(s))throw new Error('Identificador de requisição inválido.');return s;}
function cscTerceirosV1Cache_(){return CacheService.getScriptCache();}
function cscTerceirosV1Hash_(v){return conectaAcessoV1Hash_(v);}
function cscTerceirosV1Get_(e){
  var p=e&&e.parameter||{};
  if(cscTerceirosV1Texto_(p.action).toLowerCase()!=='csc_terceiros_result')return null;
  try{
    var id=cscTerceirosV1Id_(p.requestId),raw=cscTerceirosV1Cache_().get(TACS_CSC_TERCEIROS_V1.RESULT_PREFIX+cscTerceirosV1Hash_(id));
    return conectaAcessoV1ResponderJson_(raw?{ok:true,pendente:false,result:JSON.parse(raw)}:{ok:true,pendente:true},p.callback);
  }catch(e2){return conectaAcessoV1ResponderJson_({ok:false,message:'Consulta indisponível.'},p.callback);}
}
function cscTerceirosV1Post_(e){
  var p=e&&e.parameter||{},action=cscTerceirosV1Texto_(p.action).toLowerCase();
  if(['csc_terceiros_buscar','csc_terceiros_enviar','csc_terceiros_confirmar_cpf','csc_terceiros_membro'].indexOf(action)<0)return null;
  var id='',result;
  try{
    id=cscTerceirosV1Id_(p.requestId);
    if(cscTerceirosV1Texto_(p.modoTacsTeste).toUpperCase()==='SIM')throw new Error('Esta função não realiza solicitações reais no modo teste.');
    var actor=cscTerceirosV1Ator_(p);
    conectaAcessoV1Limitar_('terceiros|'+actor.session.accessId+'|'+action);
    result=action==='csc_terceiros_buscar'?cscTerceirosV1Buscar_(p,actor):action==='csc_terceiros_confirmar_cpf'?cscTerceirosV1ConfirmarCpf_(p,actor):action==='csc_terceiros_membro'?cscTerceirosV1EscolherMembro_(p,actor):cscTerceirosV1Enviar_(p,actor);
  }catch(err){result={ok:false,message:cscTerceirosV1Texto_(err&&err.message)||'Operação não concluída.'};}
  if(id)cscTerceirosV1Cache_().put(TACS_CSC_TERCEIROS_V1.RESULT_PREFIX+cscTerceirosV1Hash_(id),JSON.stringify(result),TACS_CSC_TERCEIROS_V1.RESULT_TTL);
  return conectaAcessoV1ResponderPost_(id,result);
}
function cscTerceirosV1Ator_(p){
  var session=conectaAcessoV1ValidarSessao_(p);
  var area=conectaAcessoV1Id_(session.areaId),pedida=conectaAcessoV1Id_(p.areaId||area);
  if(area!==TACS_CSC_TERCEIROS_V1.AREA||pedida!==area)throw new Error('Serviço exclusivo para moradores da zona rural de Japaranduba.');
  var sh=conectaAcessoV1Sheet_(TACS_CONECTA_ACESSO_V1.ACCESS_SHEET,TACS_CONECTA_ACESSO_V1.ACCESS_HEADERS);
  var registro=conectaAcessoV1AcessoPorId_(sh,session.accessId);
  if(!registro||!conectaAcessoV1Bool_(registro.values[15]))throw new Error('Acesso do morador não está ativo.');
  if(conectaAcessoV1Id_(registro.values[1])!==area||cscTerceirosV1Texto_(registro.values[3])!==cscTerceirosV1Texto_(session.cpf))throw new Error('Identidade do solicitante não confere.');
  var cfg=conectaAcessoV1Areas_().filter(function(a){return a.areaId===area;})[0];
  if(!cfg)throw new Error('Área territorial indisponível.');
  // Uma única leitura territorial por operação: mesmo snapshot para titular e beneficiário.
  var registros=conectaAcessoV1RegistrosArea_(cfg),chave=cscTerceirosV1Texto_(registro.values[2]),cpf=cscTerceirosV1Digitos_(registro.values[3]);
  var titular=chave?registros.filter(function(x){return cscTerceirosV1Texto_(x.chave)===chave;}):[];
  if(!titular.length)titular=registros.filter(function(x){return cscTerceirosV1Digitos_(x.morador.cpf)===cpf;});
  if(titular.length!==1)throw new Error('Não foi possível confirmar seu cadastro territorial. Procure o TACS.');
  var familyId=conectaAcessoV1CodigoFamiliaItem_(titular[0]);
  if(!familyId)throw new Error('Seu vínculo familiar precisa ser conferido pelo TACS.');
  return {session:session,registro:registro,area:cfg,familiaId:familyId,registros:registros};
}
function cscTerceirosV1Nascimento_(v){
  var s=cscTerceirosV1Texto_(v);
  if(!/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/.test(s))throw new Error('Confira a data de nascimento: DD/MM/AAAA.');
  return conectaAcessoV1Nascimento_(s);
}
function cscTerceirosV1Candidatos_(actor){
  return actor.registros||[];
}

/* Sem cache no celular: família e confirmação do CPF vinculadas à sessão do solicitante. */
function cscTerceirosV1Familia_(item,actor){
 var fid=conectaAcessoV1CodigoFamiliaItem_(item),members=actor.registros.filter(function(r){return conectaAcessoV1CodigoFamiliaItem_(r)===fid;});
 if(!fid||!members.length||members.length>40)throw new Error('Família não localizada com segurança.');
 return members.map(function(r){return {
   membroToken:conectaAcessoV1TokenCache_('ctm1',TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,
    {accessId:actor.session.accessId,areaId:actor.area.areaId,familiaId:fid,chave:r.chave},TACS_CSC_TERCEIROS_V1.SELECT_TTL),
   nome:r.morador.nome,nascimento:r.morador.nascimento,
   temDocumento:Boolean(cscTerceirosV1Digitos_(r.morador.cpf||r.morador.cns))
 };});
}
function cscTerceirosV1PrepararCpf_(item,cpf,actor){
 var token=conectaAcessoV1TokenCache_('ctp1',TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,{
   accessId:actor.session.accessId,areaId:actor.area.areaId,chave:item.chave,
   nome:item.morador.nome,nascimento:item.morador.nascimento,cpf:cpf,
   familiaId:conectaAcessoV1CodigoFamiliaItem_(item)
 },TACS_CSC_TERCEIROS_V1.SELECT_TTL);
 return {ok:true,confirmaCpf:true,confirmacaoToken:token,nome:item.morador.nome,nascimento:item.morador.nascimento,
 message:'Confira o nome antes de salvar este CPF no cadastro da pessoa.'};
}
function cscTerceirosV1SalvarCpf_(item,cpf,actor){
 if(!moradoresAdminV1CpfValido_(cpf))throw new Error('CPF inválido.');
 var lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw new Error('Cadastro ocupado. Tente novamente.');
 try{
  var current=cscTerceirosV1Digitos_(item.fonte.sheet.getRange(item.row,Number(item.fonte.map.cpf)+1).getDisplayValue());
  if(current&&current!==cpf)throw new Error('Cadastro já possui outro CPF. Procure o TACS.');
  if(current===cpf)return;
  if(conectaAcessoV1BuscarCpf_(cpf).length)throw new Error('CPF já vinculado a outro morador.');
  moradoresAdminV1SetCell_(item.fonte.sheet,item.row,item.fonte.map.cpf,cpf,'@');
  moradoresAdminV1SetCell_(item.fonte.sheet,item.row,item.fonte.map.ultimaAtualizacao,new Date(),'dd/MM/yyyy HH:mm:ss');
  var contexto={perfil:'PUBLICO',operadorId:'TERCEIROS:'+actor.session.accessId,agenteId:actor.area.agenteId||'',
    areaId:actor.area.areaId,areaNome:actor.area.areaNome||actor.area.areaId,unidadeId:actor.area.unidadeId||'',
    planilhaId:actor.area.planilhaId,permissoes:[]};
  moradoresAdminV1Auditar_(item.fonte.ss,{moradorId:item.morador.idPortal||item.morador.id||item.chave,
    acao:'VINCULAR_CPF_SOLICITACAO_TERCEIROS',campos:'CPF_PREENCHIDO_EM_CAMPO_VAZIO'},contexto);
  SpreadsheetApp.flush();
  if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);
 }finally{lock.releaseLock();}
}
function cscTerceirosV1ConfirmarCpf_(p,actor){
 if(cscTerceirosV1Texto_(p.confirmado)!=='SIM')throw new Error('Confirme o nome antes de salvar o CPF.');
 var v=conectaAcessoV1LerTokenCache_(p.confirmacaoToken,TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,'ctp1');
 if(v.accessId!==actor.session.accessId||v.areaId!==actor.area.areaId)throw new Error('Confirmação inválida.');
 var found=actor.registros.filter(function(r){return r.chave===v.chave&&r.morador.nome===v.nome&&r.morador.nascimento===v.nascimento;});
 if(found.length!==1||conectaAcessoV1CodigoFamiliaItem_(found[0])!==v.familiaId||v.familiaId===actor.familiaId)
   throw new Error('Cadastro familiar mudou. Procure o TACS.');
 var cpf=cscTerceirosV1Digitos_(found[0].morador.cpf);
 if(cpf&&cpf!==v.cpf)throw new Error('O cadastro possui CPF diferente. Procure o TACS.');
 if(!cpf)cscTerceirosV1SalvarCpf_(found[0],v.cpf,actor);
 found[0].morador.cpf=v.cpf;
 var out=cscTerceirosV1Selecionar_(found[0],v.cpf,actor);out.cpfSalvo=true;return out;
}
function cscTerceirosV1EscolherMembro_(p,actor){
 var v=conectaAcessoV1LerTokenCache_(p.membroToken,TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,'ctm1');
 if(v.accessId!==actor.session.accessId||v.areaId!==actor.area.areaId||v.familiaId===actor.familiaId)
  throw new Error('Escolha de integrante inválida.');
 var a=actor.registros.filter(function(r){return r.chave===v.chave&&conectaAcessoV1CodigoFamiliaItem_(r)===v.familiaId;});
 if(a.length!==1)throw new Error('Integrante não identificado.');
 var doc=cscTerceirosV1Digitos_(a[0].morador.cpf||a[0].morador.cns);
 if(!doc)throw new Error('Integrante sem CPF/CNS. O TACS precisa completar o cadastro.');
 return cscTerceirosV1Selecionar_(a[0],doc,actor);
}

function cscTerceirosV1Selecionar_(item,docInformado,actor){
  var morador=item.morador||{},familia=conectaAcessoV1CodigoFamiliaItem_(item);
  if(!familia)throw new Error('O cadastro familiar do beneficiário precisa de conferência pelo TACS.');
  if(familia===actor.familiaId)throw new Error('Essa pessoa já pertence à sua família. Selecione-a na lista familiar normal.');
  var oficial=cscTerceirosV1Digitos_(morador.cpf||morador.cns),informado=cscTerceirosV1Digitos_(docInformado);
  if(morador.cpf&&informado.length===11&&morador.cpf!==informado)throw new Error('CPF divergente do cadastro. Procure o TACS para conferência.');
  var proof=conectaAcessoV1TokenCache_('ctv1',TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,{
    accessId:actor.session.accessId,areaId:actor.area.areaId,
    chave:item.chave,nascimento:morador.nascimento,nome:morador.nome,
    documento:oficial||informado,familiaId:familia,
    informadoNaoCadastrado:!oficial&&!!informado
  },TACS_CSC_TERCEIROS_V1.SELECT_TTL);
  return {ok:true,encontrado:true,selecaoToken:proof,beneficiario:{
    nome:morador.nome,nascimento:morador.nascimento,
    localidade:morador.endereco||morador.localidade||'',
    familiaId:familia,documento:oficial||informado,
    documentoPendente:!oficial&&!!informado
  },familia:cscTerceirosV1Familia_(item,actor)};
}
function cscTerceirosV1Buscar_(p,actor){
  var doc=cscTerceirosV1Digitos_(p.documento);
  if(!(doc.length===11&&moradoresAdminV1CpfValido_(doc))&&doc.length!==15)throw new Error('Informe CPF válido ou Cartão SUS (CNS) com 15 dígitos.');
  var registros=cscTerceirosV1Candidatos_(actor);
  var achados=registros.filter(function(i){return cscTerceirosV1Digitos_(i.morador.cpf)===doc||cscTerceirosV1Digitos_(i.morador.cns)===doc;});
  if(achados.length>1)throw new Error('Há cadastros duplicados. Procure o TACS.');
  if(achados.length===1)return cscTerceirosV1Selecionar_(achados[0],doc,actor);
  if(!cscTerceirosV1Texto_(p.nascimento))return {ok:true,precisaNascimento:true,message:(doc.length===11?'CPF ainda não está na planilha.':'Cartão SUS não localizado.')+' Informe a data de nascimento.'};
  var nascimento=cscTerceirosV1Nascimento_(p.nascimento);
  var porData=registros.filter(function(i){return cscTerceirosV1Texto_(i.morador.nascimento)===nascimento;});
  var nome=cscTerceirosV1Texto_(p.nome);
  if(porData.length>1&&!nome)return {ok:true,precisaNome:true,message:'Há mais de uma pessoa com essa data. Informe o nome completo do beneficiário.'};
  if(nome){
    var norm=conectaAcessoV1Nome_(nome);
    porData=porData.filter(function(i){return conectaAcessoV1Nome_(i.morador.nome)===norm;});
  }
  if(porData.length!==1)return {ok:false,message:'Não foi possível identificar com segurança. Confira os dados ou procure o TACS.'};
  var existingDoc=cscTerceirosV1Digitos_(doc.length===11?porData[0].morador.cpf:porData[0].morador.cns);
  if(existingDoc&&existingDoc!==doc)throw new Error('O cadastro já possui outro documento do mesmo tipo. Procure o TACS, sem alterar o cadastro.');
  if(doc.length===11&&!cscTerceirosV1Digitos_(porData[0].morador.cpf))return cscTerceirosV1PrepararCpf_(porData[0],doc,actor);
  return cscTerceirosV1Selecionar_(porData[0],doc,actor);
}
function cscTerceirosV1Categoria_(v){
  var allowed=[
    'Implanon','Solicitar consulta Médica','Solicitar atendimento com a Enfermeira Chefe',
    'Solicitar atendimento com nutricionista','Solicitar atendimento odontológico (dentista)',
    'Implanon — informações ou solicitação do implante',
    'Solicitar renovação de receita médica','Solicitar marcação de exames — Ultrassom / Fisioterapeuta',
    'Solicitar visita domiciliar do TACS','Solicitar visita domiciliar com a Médica',
    'Vacinação ou campanha de saúde','Acompanhamento de saúde do Bolsa Família',
    'Cadastro ou atualização da família','Solicitar ficha de cadastro para Aposentadoria',
    'Encaminhamento ou orientação para outro serviço da rede pública',
    'Informações sobre dias, horários e funcionamento da Unidade de Saúde',
    'Outro assunto comunitário relacionado à Unidade de Saúde','Outro assunto comunitário relacionado à Unidade de Saúde Posto Matias'
  ];
  var s=cscTerceirosV1Texto_(v);if(allowed.indexOf(s)<0)throw new Error('Escolha um serviço disponível.');return s;
}
function cscTerceirosV1Duplicado_(code,m,actor,cat,p,docSelecionado,existing){
  var row=existing&&existing.data||[],expectedDoc=cscTerceirosV1Digitos_(m.cpf||m.cns)||docSelecionado;
  // O código só pode ser reutilizado no MESMO pedido para o MESMO beneficiário.
  if(!row.length||cscTerceirosV1Texto_(row[6])!==cscTerceirosV1Texto_(m.nome)||
     cscTerceirosV1Digitos_(row[7])!==expectedDoc||
     cscTerceirosV1Texto_(row[8])!==cscTerceirosV1Texto_(m.nascimento)||
     cscTerceirosV1Texto_(row[11])!==cat)
    throw new Error('Este código já pertence a outra solicitação. Encerre o pedido e inicie novo atendimento.');
  var cpf=cscTerceirosV1Digitos_(actor.registro.values[3]);
  return {
    ok:true,duplicada:true,codigoSolicitacao:code,
    beneficiario:{nome:m.nome,documento:cscTerceirosV1Digitos_(m.cpf||m.cns)||docSelecionado},
    solicitante:{nome:cscTerceirosV1Texto_(actor.registro.values[4]),cpfFinal:cpf.slice(-4)},
    categoria:cat,descricao:cscTerceirosV1Texto_(p.descricao).slice(0,900),
    reservaConfirmada:false,pushUbs:Boolean(row[24]),id:cscTerceirosV1Texto_(row[0]),
    message:'Solicitação já registrada na UBS, sem novo aviso automático.'
  };
}
function cscTerceirosV1Enviar_(p,actor){
  if(cscTerceirosV1Texto_(p.autorizado)!=='SIM')throw new Error('Confirme que a solicitação está sendo feita a pedido ou com o conhecimento da pessoa.');
  var selected=conectaAcessoV1LerTokenCache_(p.selecaoToken,TACS_CSC_TERCEIROS_V1.SELECT_PREFIX,'ctv1');
  if(selected.accessId!==actor.session.accessId||selected.areaId!==actor.area.areaId)throw new Error('Identificação expirada. Pesquise novamente.');
  var candidates=cscTerceirosV1Candidatos_(actor).filter(function(i){
    return i.chave===selected.chave&&i.morador.nome===selected.nome&&i.morador.nascimento===selected.nascimento;
  });
  if(candidates.length!==1)throw new Error('Dados cadastrais alterados. Faça a identificação novamente.');
  var item=candidates[0],m=item.morador,cat=cscTerceirosV1Categoria_(p.categoria);
  if(conectaAcessoV1CodigoFamiliaItem_(item)!==selected.familiaId||selected.familiaId===actor.familiaId)throw new Error('Vínculo familiar mudou. Confira novamente.');
  var provided=cscTerceirosV1Digitos_(p.documento);
  if(provided&&provided!==cscTerceirosV1Digitos_(m.cpf||m.cns))throw new Error('Beneficiário mudou. Selecione novamente.');
  var code=solicitacoesUbsV1Codigo_(p.codigoSolicitacao),sheet=solicitacoesUbsV1Sheet_(),existing=solicitacoesUbsV1LocalizarCodigo_(sheet,actor.area.areaId,code);
  if(existing)return cscTerceirosV1Duplicado_(code,m,actor,cat,p,selected.documento,existing);
  var detalhes=cscTerceirosV1Texto_(p.descricao).slice(0,900);
  var actorName=cscTerceirosV1Texto_(actor.registro.values[4]),actorCpf=cscTerceirosV1Digitos_(actor.registro.values[3]);
  var nota='PEDIDO POR OUTRO MORADOR | Solicitante: '+actorName+' (CPF final '+actorCpf.slice(-4)+', acesso '+actor.session.accessId+') | Autorização declarada: SIM';
  if(selected.informadoNaoCadastrado)nota+=' | CPF do beneficiário informado, ainda não cadastrado; conferir na UBS';
  var agenda=/consulta|nutricionista|odontol[oó]gico|enfermeira|marca[cç][aã]o de exames/i.test(cat);
  if(agenda)nota+=' | Pedido de agendamento: SEM RESERVA AUTOMÁTICA DE VAGA';
  var desc=(nota+(detalhes?' | Descrição: '+detalhes:'')).slice(0,1800);
  var now=new Date(),doc=cscTerceirosV1Digitos_(m.cpf||m.cns)||selected.documento;
  var agendaCard=solicitacoesUbsV1AgendaCard_(detalhes),date=solicitacoesUbsV1Data_(p.dataServico||agendaCard.data),
    type=cscTerceirosV1Texto_(p.tipoVaga||'').slice(0,70),expiry=solicitacoesUbsV1Hora_(p.horarioExpiracao||agendaCard.horaFinal);
  var row=[
    solicitacoesUbsV1Id_(),actor.area.areaId,actor.area.areaNome,actor.area.unidadeId||'',
    code,cscTerceirosV1Texto_(m.idPortal||m.id||item.chave),
    cscTerceirosV1Texto_(m.nome),doc,cscTerceirosV1Texto_(m.nascimento),
    cscTerceirosV1Texto_(m.endereco||m.localidade),selected.familiaId,cat,desc,
    type,date,expiry,solicitacoesUbsV1ExpiraEm_(date,expiry),'NOVA',Utilities.formatDate(now,TACS_SOLICITACOES_UBS_V1.FUSO,'dd/MM/yyyy HH:mm'),now,
    'PORTAL_CSC_TERCEIROS',cscTerceirosV1Texto_(p.tacsResponsavel).slice(0,150),
    cscTerceirosV1Texto_(p.unidadeNome||actor.area.unidadeId).slice(0,150),'','',''
  ];
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('A UBS está recebendo solicitações. Tente novamente.');
  var line=0;
  try{
    existing=solicitacoesUbsV1LocalizarCodigo_(sheet,actor.area.areaId,code);
    if(existing)return cscTerceirosV1Duplicado_(code,m,actor,cat,p,selected.documento,existing);
    line=sheet.getLastRow()+1;
    sheet.getRange(line,1,1,row.length).setValues([row]);
    sheet.getRange(line,8).setNumberFormat('@');
    sheet.getRange(line,19).setNumberFormat('@');
    sheet.getRange(line,20).setNumberFormat('dd/MM/yyyy HH:mm');
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
  var push;
  try{push=solicitacoesUbsV1EnviarPush_(identificacaoFamiliarPublicaV1Contexto_(actor.area.areaId),row[0]);}catch(e){push={push:false};}
  if(push&&push.push&&line>1)try{
    sheet.getRange(line,25).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(line,26).setValue(push.id||'').setNumberFormat('@');
  }catch(e){}
  return {ok:true,codigoSolicitacao:code,id:row[0],beneficiario:{nome:m.nome,documento:doc},
    solicitante:{nome:actorName,cpfFinal:actorCpf.slice(-4)},categoria:cat,descricao:detalhes,
    reservaConfirmada:false,pushUbs:Boolean(push&&push.push),pushDestinatarios:Number(push&&push.destinatarios||0),
    message:'Solicitação registrada na fila da UBS; a confirmação do Push é independente.'};
}
