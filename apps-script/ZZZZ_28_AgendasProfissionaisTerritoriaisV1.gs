/**
 * ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs
 * Portal TACS — agendas, profissionais, serviços e reservas por área V1.0.0
 *
 * Registros legados sem AREA_ID pertencem exclusivamente a JAPARANDUBA.
 * Um TACS autenticado nunca escolhe a área: o servidor usa a área vinculada
 * ao CNS/PIN da sessão. O administrador geral pode selecionar uma área ativa.
 */
var TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1=Object.freeze({
  VERSAO:'1.0.0',
  AREA_PADRAO:'JAPARANDUBA',
  ABA_PROFISSIONAIS:'PROFISSIONAIS',
  ABA_SERVICOS:'SERVICOS',
  ABA_AGENDAS:'PAINEL_PROFISSIONAIS',
  ABA_RESERVAS:'RESERVAS_ODONTOLOGIA',
  PERMISSAO_AGENDAS:'AGENDAS_GERENCIAR',
  PERMISSAO_PROFISSIONAIS:'PROFISSIONAIS_GERENCIAR',
  RESULT_PREFIX:'tacs_agendas_profissionais_area_v1_result_',
  RESULT_SECONDS:300,
  DIAS:Object.freeze(['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira']),
  PROF_HEADERS:Object.freeze(['ID','NOME','TITULO_PUBLICO','ICONE','ORDEM','ATIVO']),
  SERV_HEADERS:Object.freeze(['ID','PROFISSIONAL_ID','NOME','DESCRICAO_AUTOMATICA','ORDEM','ATIVO','PERMITE_VAGA_COMUM','PERMITE_EMERGENCIA']),
  AGENDA_HEADERS:Object.freeze(['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA']),
  RESERVA_HEADERS:Object.freeze(['CODIGO_SOLICITACAO','REGISTRADA_EM','DATA_CONSULTA','TIPO_VAGA','SITUACAO','VAGAS_RESTANTES'])
});

var agendasProfissionaisTerritoriaisV1DoGetAnterior_;
var agendasProfissionaisTerritoriaisV1DoPostAnterior_;
(function instalarAgendasProfissionaisTerritoriaisV1_(){
  if(typeof doGet==='function'){
    agendasProfissionaisTerritoriaisV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=agendasProfissionaisTerritoriaisV1TratarGet_(e);
      return resposta||agendasProfissionaisTerritoriaisV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    agendasProfissionaisTerritoriaisV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=agendasProfissionaisTerritoriaisV1TratarPost_(e);
      return resposta||agendasProfissionaisTerritoriaisV1DoPostAnterior_(e);
    };
  }
})();

function agendasProfissionaisTerritoriaisV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=agendasProfissionaisTerritoriaisV1Texto_(p.action).toLowerCase();
  if(action==='agendas_profissionais_territoriais_status'){
    return agendasProfissionaisTerritoriaisV1ResponderJson_({
      ok:true,versao:TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.VERSAO,
      isolamento:'AREA_ID',reservasIsoladas:true
    },p.callback);
  }
  if(action==='agenda'){
    try{
      var areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
      return agendasProfissionaisTerritoriaisV1ResponderJson_(
        agendasProfissionaisTerritoriaisV1AgendaOdontologica_(areaId),p.callback
      );
    }catch(erroAgenda){
      return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:agendasProfissionaisTerritoriaisV1Erro_(erroAgenda)},p.callback);
    }
  }
  if(action!=='admin_result')return null;
  try{
    var requestId=agendasProfissionaisTerritoriaisV1RequestId_(p.requestId);
    var resultado=agendasProfissionaisTerritoriaisV1LerResultado_(requestId);
    if(!resultado)return null;
    return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:true,pendente:false,requestId:requestId,result:resultado},p.callback);
  }catch(erroResultado){
    return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:agendasProfissionaisTerritoriaisV1Erro_(erroResultado)},p.callback);
  }
}

function agendasProfissionaisTerritoriaisV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=agendasProfissionaisTerritoriaisV1Texto_(p.action).toLowerCase();
  if(action==='reservar'||action==='reservar_odontologia'){
    var reserva;
    try{reserva=agendasProfissionaisTerritoriaisV1Reservar_(p);}
    catch(erroReserva){reserva={ok:false,message:agendasProfissionaisTerritoriaisV1Erro_(erroReserva)};}
    return agendasProfissionaisTerritoriaisV1ResponderReserva_(p.nonce,reserva);
  }
  var aceitas=['admin_dados','admin_criar_profissional','admin_salvar_profissional','admin_salvar_servico','admin_salvar_agenda'];
  if(aceitas.indexOf(action)===-1)return null;
  if(action==='admin_dados'&&['agendas','profissionais'].indexOf(agendasProfissionaisTerritoriaisV1Texto_(p.escopo).toLowerCase())===-1)return null;
  var requestId=agendasProfissionaisTerritoriaisV1Texto_(p.requestId),resultado;
  try{
    requestId=agendasProfissionaisTerritoriaisV1RequestId_(requestId);
    var acesso=agendasProfissionaisTerritoriaisV1Contexto_(p,action);
    if(action==='admin_dados')resultado=agendasProfissionaisTerritoriaisV1Dados_(acesso);
    else if(action==='admin_criar_profissional')resultado=agendasProfissionaisTerritoriaisV1CriarProfissional_(acesso,p);
    else if(action==='admin_salvar_profissional')resultado=agendasProfissionaisTerritoriaisV1SalvarProfissional_(acesso,p);
    else if(action==='admin_salvar_servico')resultado=agendasProfissionaisTerritoriaisV1SalvarServico_(acesso,p);
    else resultado=agendasProfissionaisTerritoriaisV1SalvarAgenda_(acesso,p);
  }catch(erro){resultado={ok:false,message:agendasProfissionaisTerritoriaisV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))agendasProfissionaisTerritoriaisV1GuardarResultado_(requestId,resultado);
  return agendasProfissionaisTerritoriaisV1ResponderPost_(requestId,resultado);
}

function agendasProfissionaisTerritoriaisV1Contexto_(p,action){
  var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
  var areaId;
  if(acesso.perfil==='TACS'){
    areaId=agendasProfissionaisTerritoriaisV1AreaId_(acesso.areaId);
    var escopo=agendasProfissionaisTerritoriaisV1Texto_(p.escopo).toLowerCase();
    var permissao=action==='admin_salvar_agenda'||(action==='admin_dados'&&escopo==='agendas')
      ?TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PERMISSAO_AGENDAS
      :TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PERMISSAO_PROFISSIONAIS;
    if(action==='admin_dados'&&!escopo){
      var alguma=(acesso.permissoes||[]).indexOf(TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PERMISSAO_AGENDAS)!==-1||
        (acesso.permissoes||[]).indexOf(TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PERMISSAO_PROFISSIONAIS)!==-1;
      if(!alguma)throw new Error('Seu cadastro não possui permissão para administrar agendas ou profissionais.');
    }else if((acesso.permissoes||[]).indexOf(permissao)===-1){
      throw new Error(permissao===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PERMISSAO_AGENDAS
        ?'Seu cadastro não possui permissão para administrar agendas e vagas.'
        :'Seu cadastro não possui permissão para administrar profissionais e serviços.');
    }
  }else{
    tacsTerritorioV1ExigirAdmin_(acesso);
    areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area||acesso.areaId)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
  }
  if(!areaId)throw new Error('A área da operação não foi identificada.');
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(areaId);
    if(area&&area.ativa===false)throw new Error('A área selecionada está inativa.');
    if(areaId!==TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO&&!area)throw new Error('A área selecionada não foi encontrada.');
  }
  return {areaId:areaId,perfil:acesso.perfil,operadorId:acesso.operadorId||('TACS:'+acesso.tacsId),acesso:acesso};
}

function agendasProfissionaisTerritoriaisV1Dados_(contexto){
  agendasProfissionaisTerritoriaisV1InicializarArea_(contexto.areaId);
  var ss=agendasProfissionaisTerritoriaisV1Planilha_();
  var prof=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
  var serv=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_SERVICOS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.SERV_HEADERS,true);
  var agenda=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true);
  return {
    ok:true,versao:TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.VERSAO,
    perfil:contexto.perfil,areaId:contexto.areaId,isolamento:'AREA_ID',
    profissionais:agendasProfissionaisTerritoriaisV1ObjetosArea_(prof,contexto.areaId),
    servicos:agendasProfissionaisTerritoriaisV1ObjetosArea_(serv,contexto.areaId),
    agendas:agendasProfissionaisTerritoriaisV1ObjetosArea_(agenda,contexto.areaId)
  };
}

function agendasProfissionaisTerritoriaisV1InicializarArea_(areaId){
  if(areaId===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO)return;
  var ss=agendasProfissionaisTerritoriaisV1Planilha_();
  var prof=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
  if(agendasProfissionaisTerritoriaisV1LinhasArea_(prof,areaId).length)return;
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('A configuração inicial da área está em andamento. Tente novamente.');
  try{
    prof=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
    if(agendasProfissionaisTerritoriaisV1LinhasArea_(prof,areaId).length)return;
    var serv=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_SERVICOS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.SERV_HEADERS,true);
    var agenda=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true);
    var fontesProf=agendasProfissionaisTerritoriaisV1LinhasArea_(prof,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO);
    var fontesServ=agendasProfissionaisTerritoriaisV1LinhasArea_(serv,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO);
    var agora=new Date();
    fontesProf.forEach(function(linha){
      var item=agendasProfissionaisTerritoriaisV1Objeto_(prof.headers,linha.values);
      item.AREA_ID=areaId;item.ATUALIZADO_EM=agora;
      agendasProfissionaisTerritoriaisV1Adicionar_(prof,item);
    });
    fontesServ.forEach(function(linha){
      var item=agendasProfissionaisTerritoriaisV1Objeto_(serv.headers,linha.values);
      item.AREA_ID=areaId;item.ATUALIZADO_EM=agora;
      agendasProfissionaisTerritoriaisV1Adicionar_(serv,item);
    });
    fontesProf.forEach(function(linha){
      var profissional=agendasProfissionaisTerritoriaisV1Objeto_(prof.headers,linha.values);
      var id=agendasProfissionaisTerritoriaisV1Texto_(profissional.ID);
      var mensagem='Atendimento '+agendasProfissionaisTerritoriaisV1Texto_(profissional.TITULO_PUBLICO||profissional.NOME||id);
      for(var i=0;i<TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.DIAS.length;i++){
        agendasProfissionaisTerritoriaisV1Adicionar_(agenda,{
          MODULO:id,ORDEM:i+1,DIA:TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.DIAS[i],
          ATIVO:false,DATA:'',HORARIO:'',SITUACAO:'NAO_CONFIGURADO',MENSAGEM:mensagem,
          ENCERRA_12H:false,VAGAS_COMUNS:0,VAGAS_EMERGENCIAIS:0,DIA_EXTRA:false,
          AREA_ID:areaId,ATUALIZADO_EM:agora
        });
      }
    });
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1SalvarProfissional_(contexto,p){
  var lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Outra gravação está em andamento. Tente novamente.');
  try{
    var tabela=agendasProfissionaisTerritoriaisV1Tabela_(agendasProfissionaisTerritoriaisV1Planilha_(),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
    var linha=agendasProfissionaisTerritoriaisV1Encontrar_(tabela,'ID',p.id,contexto.areaId);
    if(!linha)throw new Error('Profissional não encontrado nesta área.');
    var nome=agendasProfissionaisTerritoriaisV1Texto_(p.nome),titulo=agendasProfissionaisTerritoriaisV1Texto_(p.tituloPublico);
    if(!nome||!titulo)throw new Error('Nome e título público são obrigatórios.');
    agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,{NOME:nome,TITULO_PUBLICO:titulo,ICONE:agendasProfissionaisTerritoriaisV1Texto_(p.icone)||'👤',ORDEM:agendasProfissionaisTerritoriaisV1Positivo_(p.ordem,1),ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),AREA_ID:contexto.areaId,ATUALIZADO_EM:new Date()});
    SpreadsheetApp.flush();return{ok:true,id:agendasProfissionaisTerritoriaisV1Texto_(p.id),areaId:contexto.areaId,message:'Profissional salvo somente nesta área.'};
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1SalvarServico_(contexto,p){
  var lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Outra gravação está em andamento. Tente novamente.');
  try{
    var ss=agendasProfissionaisTerritoriaisV1Planilha_();
    var tabela=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_SERVICOS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.SERV_HEADERS,true);
    var linha=agendasProfissionaisTerritoriaisV1Encontrar_(tabela,'ID',p.id,contexto.areaId);
    if(!linha)throw new Error('Serviço não encontrado nesta área.');
    var prof=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
    if(!agendasProfissionaisTerritoriaisV1Encontrar_(prof,'ID',p.profissionalId,contexto.areaId))throw new Error('O profissional associado não pertence a esta área.');
    var nome=agendasProfissionaisTerritoriaisV1Texto_(p.nome),descricao=agendasProfissionaisTerritoriaisV1Texto_(p.descricaoAutomatica);
    if(!nome||!descricao)throw new Error('Nome e descrição automática são obrigatórios.');
    agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,{PROFISSIONAL_ID:agendasProfissionaisTerritoriaisV1Texto_(p.profissionalId),NOME:nome,DESCRICAO_AUTOMATICA:descricao,ORDEM:agendasProfissionaisTerritoriaisV1Positivo_(p.ordem,1),ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),PERMITE_VAGA_COMUM:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteVagaComum),PERMITE_EMERGENCIA:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteEmergencia),AREA_ID:contexto.areaId,ATUALIZADO_EM:new Date()});
    SpreadsheetApp.flush();return{ok:true,id:agendasProfissionaisTerritoriaisV1Texto_(p.id),areaId:contexto.areaId,message:'Serviço salvo somente nesta área.'};
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1SalvarAgenda_(contexto,p){
  var lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Outra agenda está sendo atualizada. Tente novamente.');
  try{
    var tabela=agendasProfissionaisTerritoriaisV1Tabela_(agendasProfissionaisTerritoriaisV1Planilha_(),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true);
    var linha=agendasProfissionaisTerritoriaisV1EncontrarAgenda_(tabela,p.modulo,p.dia,contexto.areaId);
    if(!linha)throw new Error('Agenda não encontrada nesta área.');
    agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,{DATA:agendasProfissionaisTerritoriaisV1DataOpcional_(p.data),HORARIO:agendasProfissionaisTerritoriaisV1Texto_(p.horario),SITUACAO:agendasProfissionaisTerritoriaisV1Texto_(p.situacao),MENSAGEM:agendasProfissionaisTerritoriaisV1Texto_(p.mensagem),ENCERRA_HORARIO:agendasProfissionaisTerritoriaisV1HoraOpcional_(p.encerraHorario),ENCERRA_12H:agendasProfissionaisTerritoriaisV1HoraOpcional_(p.encerraHorario)==='12:00',VAGAS_COMUNS:agendasProfissionaisTerritoriaisV1NaoNegativo_(p.vagasComuns),VAGAS_EMERGENCIAIS:agendasProfissionaisTerritoriaisV1NaoNegativo_(p.vagasEmergenciais),DIA_EXTRA:agendasProfissionaisTerritoriaisV1Booleano_(p.diaExtra),ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),AREA_ID:contexto.areaId,ATUALIZADO_EM:new Date()});
    SpreadsheetApp.flush();return{ok:true,modulo:agendasProfissionaisTerritoriaisV1Texto_(p.modulo),dia:agendasProfissionaisTerritoriaisV1Texto_(p.dia),areaId:contexto.areaId,message:'Agenda salva somente nesta área.'};
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1CriarProfissional_(contexto,p){
  var nome=agendasProfissionaisTerritoriaisV1Texto_(p.nome),titulo=agendasProfissionaisTerritoriaisV1Texto_(p.tituloPublico),servicoNome=agendasProfissionaisTerritoriaisV1Texto_(p.servicoNome),descricao=agendasProfissionaisTerritoriaisV1Texto_(p.descricaoAutomatica),id=agendasProfissionaisTerritoriaisV1Id_(p.id||nome||titulo);
  if(!nome||!titulo||!servicoNome||!descricao||id.length<3)throw new Error('Nome, título público, serviço e descrição automática são obrigatórios.');
  var lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Outra gravação está em andamento. Tente novamente.');
  try{
    var ss=agendasProfissionaisTerritoriaisV1Planilha_(),agora=new Date();
    var prof=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,true);
    var serv=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_SERVICOS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.SERV_HEADERS,true);
    var agenda=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true);
    var existente=agendasProfissionaisTerritoriaisV1Encontrar_(prof,'ID',id,contexto.areaId),jaExistia=!!existente;
    if(!existente)agendasProfissionaisTerritoriaisV1Adicionar_(prof,{ID:id,NOME:nome,TITULO_PUBLICO:titulo,ICONE:agendasProfissionaisTerritoriaisV1Texto_(p.icone)||'👤',ORDEM:agendasProfissionaisTerritoriaisV1Positivo_(p.ordem,agendasProfissionaisTerritoriaisV1LinhasArea_(prof,contexto.areaId).length+1),ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),AREA_ID:contexto.areaId,ATUALIZADO_EM:agora});
    var servicoId='ATENDIMENTO_'+id;
    if(!agendasProfissionaisTerritoriaisV1Encontrar_(serv,'ID',servicoId,contexto.areaId))agendasProfissionaisTerritoriaisV1Adicionar_(serv,{ID:servicoId,PROFISSIONAL_ID:id,NOME:servicoNome,DESCRICAO_AUTOMATICA:descricao,ORDEM:1,ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),PERMITE_VAGA_COMUM:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteVagaComum),PERMITE_EMERGENCIA:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteEmergencia),AREA_ID:contexto.areaId,ATUALIZADO_EM:agora});
    var criadas=0;
    for(var i=0;i<TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.DIAS.length;i++)if(!agendasProfissionaisTerritoriaisV1EncontrarAgenda_(agenda,id,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.DIAS[i],contexto.areaId)){agendasProfissionaisTerritoriaisV1Adicionar_(agenda,{MODULO:id,ORDEM:i+1,DIA:TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.DIAS[i],ATIVO:false,DATA:'',HORARIO:'',SITUACAO:'NAO_CONFIGURADO',MENSAGEM:descricao,ENCERRA_12H:false,VAGAS_COMUNS:0,VAGAS_EMERGENCIAIS:0,DIA_EXTRA:false,AREA_ID:contexto.areaId,ATUALIZADO_EM:agora});criadas++;}
    SpreadsheetApp.flush();return{ok:true,id:id,areaId:contexto.areaId,jaExistia:jaExistia,agendasCriadas:criadas,message:jaExistia?'Cadastro desta área reconhecido e conferido.':'Profissional, serviço e agenda criados somente nesta área.'};
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1AgendaOdontologica_(areaId){
  var tabela=agendasProfissionaisTerritoriaisV1Tabela_(agendasProfissionaisTerritoriaisV1Planilha_(),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,false);
  var dias=[];
  if(tabela)agendasProfissionaisTerritoriaisV1LinhasArea_(tabela,areaId).forEach(function(linha){
    var item=agendasProfissionaisTerritoriaisV1Objeto_(tabela.headers,linha.values);
    if(agendasProfissionaisTerritoriaisV1Modulo_(item.MODULO)!=='odontologia'||!agendasProfissionaisTerritoriaisV1Booleano_(item.ATIVO))return;
    var data=agendasProfissionaisTerritoriaisV1Data_(item.DATA);if(!data)return;
    dias.push({id:'DENTISTA-'+areaId+'-'+linha.row+'-'+data,dia:agendasProfissionaisTerritoriaisV1Texto_(item.DIA),data:data,vagasComuns:agendasProfissionaisTerritoriaisV1NaoNegativo_(item.VAGAS_COMUNS),vagasEmergenciais:agendasProfissionaisTerritoriaisV1NaoNegativo_(item.VAGAS_EMERGENCIAIS),diaExtra:agendasProfissionaisTerritoriaisV1Booleano_(item.DIA_EXTRA)});
  });
  dias.sort(function(a,b){return a.data.localeCompare(b.data);});
  return{ok:true,versao:TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.VERSAO,areaId:areaId,isolamento:'AREA_ID',atualizadoEm:Utilities.formatDate(new Date(),'America/Recife','dd/MM/yyyy HH:mm'),dias:dias};
}

function agendasProfissionaisTerritoriaisV1Reservar_(p){
  var areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
  var requestId=agendasProfissionaisTerritoriaisV1Texto_(p.requestId),data=agendasProfissionaisTerritoriaisV1Data_(p.date),tipo=agendasProfissionaisTerritoriaisV1Texto_(p.type).toLowerCase();
  if(!/^[A-Z0-9-]{8,60}$/.test(requestId))return{ok:false,code:'INVALID_REQUEST',message:'Código da solicitação inválido.'};
  if(!data)return{ok:false,code:'INVALID_DATE',message:'Data da consulta inválida.'};
  var hoje=Utilities.formatDate(new Date(),'America/Recife','yyyy-MM-dd');if(data<hoje)return{ok:false,code:'PAST_DATE',message:'Essa data já passou.'};
  if(tipo!=='comum'&&tipo!=='emergencial')return{ok:false,code:'INVALID_TYPE',message:'Tipo de vaga inválido.'};
  var lock=LockService.getScriptLock();if(!lock.tryLock(15000))return{ok:false,code:'BUSY',message:'A agenda está sendo atualizada. Tente novamente.'};
  try{
    var ss=agendasProfissionaisTerritoriaisV1Planilha_();
    var reservas=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);
    var existente=agendasProfissionaisTerritoriaisV1Encontrar_(reservas,'CODIGO_SOLICITACAO',requestId,areaId);
    if(existente){var antigo=agendasProfissionaisTerritoriaisV1Objeto_(reservas.headers,existente.values);return{ok:true,alreadyReserved:true,requestId:requestId,areaId:areaId,date:agendasProfissionaisTerritoriaisV1Data_(antigo.DATA_CONSULTA),type:agendasProfissionaisTerritoriaisV1Texto_(antigo.TIPO_VAGA),remaining:agendasProfissionaisTerritoriaisV1NaoNegativo_(antigo.VAGAS_RESTANTES),message:'Esta solicitação já possui uma vaga reservada nesta área.'};}
    var agenda=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true),alvo=null;
    agendasProfissionaisTerritoriaisV1LinhasArea_(agenda,areaId).some(function(linha){var item=agendasProfissionaisTerritoriaisV1Objeto_(agenda.headers,linha.values);if(agendasProfissionaisTerritoriaisV1Modulo_(item.MODULO)==='odontologia'&&agendasProfissionaisTerritoriaisV1Data_(item.DATA)===data&&agendasProfissionaisTerritoriaisV1Booleano_(item.ATIVO)){alvo=linha;return true;}return false;});
    if(!alvo)return{ok:false,code:'DATE_NOT_FOUND',message:'Essa data não está mais disponível na agenda desta área.'};
    var campo=tipo==='comum'?'VAGAS_COMUNS':'VAGAS_EMERGENCIAIS',indice=agendasProfissionaisTerritoriaisV1Indice_(agenda,campo),disponiveis=Number(alvo.values[indice]);
    if(!Number.isInteger(disponiveis)||disponiveis<=0)return{ok:false,code:'NO_SLOTS',message:tipo==='emergencial'?'A vaga emergencial desse dia acabou.':'As vagas comuns desse dia acabaram.'};
    var restantes=disponiveis-1;agenda.sheet.getRange(alvo.row,indice+1).setValue(restantes);
    var idxAtualizado=agendasProfissionaisTerritoriaisV1Indice_(agenda,'ATUALIZADO_EM',false);if(idxAtualizado>=0)agenda.sheet.getRange(alvo.row,idxAtualizado+1).setValue(new Date());
    agendasProfissionaisTerritoriaisV1Adicionar_(reservas,{CODIGO_SOLICITACAO:requestId,REGISTRADA_EM:new Date(),DATA_CONSULTA:data,TIPO_VAGA:tipo,SITUACAO:'Reservada pelo portal',VAGAS_RESTANTES:restantes,AREA_ID:areaId,ATUALIZADO_EM:new Date()});
    SpreadsheetApp.flush();return{ok:true,alreadyReserved:false,requestId:requestId,areaId:areaId,date:data,type:tipo,remaining:restantes,message:'Vaga reservada e confirmada somente na agenda desta área.'};
  }finally{lock.releaseLock();}
}

function agendasProfissionaisTerritoriaisV1Tabela_(ss,nome,obrigatorios,criar){
  var sheet=ss.getSheetByName(nome);
  if(!sheet&&!criar)return null;
  if(!sheet){sheet=ss.insertSheet(nome);sheet.getRange(1,1,1,obrigatorios.length+2).setValues([obrigatorios.slice().concat(['AREA_ID','ATUALIZADO_EM'])]);sheet.setFrozenRows(1);}
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,obrigatorios.length+2).setValues([obrigatorios.slice().concat(['AREA_ID','ATUALIZADO_EM'])]);sheet.setFrozenRows(1);}
  var colunas=Math.max(1,sheet.getLastColumn()),headers=sheet.getRange(1,1,1,colunas).getDisplayValues()[0].map(agendasProfissionaisTerritoriaisV1Normalizar_);
  obrigatorios.forEach(function(h){if(headers.indexOf(h)===-1)throw new Error('A aba '+nome+' não possui a coluna obrigatória '+h+'.');});
  ['AREA_ID','ATUALIZADO_EM'].forEach(function(h){if(headers.indexOf(h)===-1){sheet.getRange(1,colunas+1).setValue(h);headers.push(h);colunas++;}});
  if(nome===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS&&headers.indexOf('ENCERRA_HORARIO')===-1){sheet.getRange(1,colunas+1).setValue('ENCERRA_HORARIO');headers.push('ENCERRA_HORARIO');colunas++;}
  var valores=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,colunas).getValues():[];
  return{sheet:sheet,headers:headers,colunas:colunas,rows:valores.map(function(v,i){return{row:i+2,values:v};})};
}
function agendasProfissionaisTerritoriaisV1LinhasArea_(tabela,areaId){return tabela.rows.filter(function(linha){return agendasProfissionaisTerritoriaisV1AreaRegistro_(tabela,linha)===areaId;});}
function agendasProfissionaisTerritoriaisV1ObjetosArea_(tabela,areaId){return agendasProfissionaisTerritoriaisV1LinhasArea_(tabela,areaId).map(function(linha){var item=agendasProfissionaisTerritoriaisV1Objeto_(tabela.headers,linha.values);item.AREA_ID=areaId;return item;});}
function agendasProfissionaisTerritoriaisV1AreaRegistro_(tabela,linha){var idx=agendasProfissionaisTerritoriaisV1Indice_(tabela,'AREA_ID',false);return agendasProfissionaisTerritoriaisV1AreaId_(idx>=0?linha.values[idx]:'')||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;}
function agendasProfissionaisTerritoriaisV1Encontrar_(tabela,campo,valor,areaId){var idx=agendasProfissionaisTerritoriaisV1Indice_(tabela,campo),chave=agendasProfissionaisTerritoriaisV1Id_(valor);for(var i=0;i<tabela.rows.length;i++)if(agendasProfissionaisTerritoriaisV1AreaRegistro_(tabela,tabela.rows[i])===areaId&&agendasProfissionaisTerritoriaisV1Id_(tabela.rows[i].values[idx])===chave)return tabela.rows[i];return null;}
function agendasProfissionaisTerritoriaisV1EncontrarAgenda_(tabela,modulo,dia,areaId){var idxM=agendasProfissionaisTerritoriaisV1Indice_(tabela,'MODULO'),idxD=agendasProfissionaisTerritoriaisV1Indice_(tabela,'DIA'),m=agendasProfissionaisTerritoriaisV1Modulo_(modulo),d=agendasProfissionaisTerritoriaisV1Normalizar_(dia);for(var i=0;i<tabela.rows.length;i++){var linha=tabela.rows[i];if(agendasProfissionaisTerritoriaisV1AreaRegistro_(tabela,linha)===areaId&&agendasProfissionaisTerritoriaisV1Modulo_(linha.values[idxM])===m&&agendasProfissionaisTerritoriaisV1Normalizar_(linha.values[idxD])===d)return linha;}return null;}
function agendasProfissionaisTerritoriaisV1Adicionar_(tabela,campos){var valores=tabela.headers.map(function(h){return Object.prototype.hasOwnProperty.call(campos,h)?campos[h]:'';});tabela.sheet.appendRow(valores);tabela.rows.push({row:tabela.sheet.getLastRow(),values:valores});}
function agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,campos){var valores=linha.values.slice();Object.keys(campos).forEach(function(h){var idx=agendasProfissionaisTerritoriaisV1Indice_(tabela,h,false);if(idx>=0)valores[idx]=campos[h];});tabela.sheet.getRange(linha.row,1,1,tabela.colunas).setValues([valores]);linha.values=valores;}
function agendasProfissionaisTerritoriaisV1Indice_(tabela,campo,obrigatorio){var idx=tabela.headers.indexOf(agendasProfissionaisTerritoriaisV1Normalizar_(campo));if(idx<0&&obrigatorio!==false)throw new Error('A coluna '+campo+' não foi encontrada na aba '+tabela.sheet.getName()+'.');return idx;}
function agendasProfissionaisTerritoriaisV1Objeto_(headers,values){var out={};headers.forEach(function(h,i){if(h)out[h]=values[i]==null?'':values[i];});return out;}
function agendasProfissionaisTerritoriaisV1Planilha_(){if(typeof tacsTerritorioV1Planilha_==='function')return tacsTerritorioV1Planilha_();if(typeof profissionaisDinamicosV1Planilha_==='function')return profissionaisDinamicosV1Planilha_();if(typeof getPlanilha==='function')return getPlanilha();var ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('A planilha administrativa não está disponível.');return ss;}
function agendasProfissionaisTerritoriaisV1Modulo_(v){var n=agendasProfissionaisTerritoriaisV1Normalizar_(v).toLowerCase();if(n.indexOf('odont')!==-1||n.indexOf('dentist')!==-1)return'odontologia';if(n.indexOf('medic')!==-1)return'medica';if(n.indexOf('enferm')!==-1)return'enfermeira';if(n.indexOf('nutric')!==-1)return'nutricionista';return n;}
function agendasProfissionaisTerritoriaisV1HoraOpcional_(v){v=agendasProfissionaisTerritoriaisV1Texto_(v);if(!v)return'';var m=v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);if(!m)throw new Error('Horário de encerramento inválido.');return m[1]+':'+m[2];}
function agendasProfissionaisTerritoriaisV1DataOpcional_(v){v=agendasProfissionaisTerritoriaisV1Texto_(v);if(!v)return'';var d=agendasProfissionaisTerritoriaisV1Data_(v);if(!d)throw new Error('Data inválida.');return d;}
function agendasProfissionaisTerritoriaisV1Data_(v){if(!v)return'';if(Object.prototype.toString.call(v)==='[object Date]'){if(isNaN(v.getTime()))return'';return String(v.getUTCFullYear()).padStart(4,'0')+'-'+String(v.getUTCMonth()+1).padStart(2,'0')+'-'+String(v.getUTCDate()).padStart(2,'0');}var s=agendasProfissionaisTerritoriaisV1Texto_(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?m[3]+'-'+m[2]+'-'+m[1]:'';}
function agendasProfissionaisTerritoriaisV1NaoNegativo_(v){var n=Number(v);if(!Number.isInteger(n)||n<0)throw new Error('As vagas devem ser números inteiros iguais ou maiores que zero.');return n;}
function agendasProfissionaisTerritoriaisV1Positivo_(v,p){var n=Number(v);return Number.isInteger(n)&&n>0?n:Math.max(1,Number(p)||1);}
function agendasProfissionaisTerritoriaisV1Booleano_(v){return v===true||v===1||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(agendasProfissionaisTerritoriaisV1Normalizar_(v))!==-1;}
function agendasProfissionaisTerritoriaisV1AreaId_(v){v=agendasProfissionaisTerritoriaisV1Normalizar_(v);return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(v)?v.slice(0,64):'';}
function agendasProfissionaisTerritoriaisV1Id_(v){return agendasProfissionaisTerritoriaisV1Normalizar_(v).slice(0,80);}
function agendasProfissionaisTerritoriaisV1Texto_(v){return String(v==null?'':v).trim();}
function agendasProfissionaisTerritoriaisV1Normalizar_(v){var s=agendasProfissionaisTerritoriaisV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function agendasProfissionaisTerritoriaisV1RequestId_(v){v=agendasProfissionaisTerritoriaisV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da operação inválido.');return v;}
function agendasProfissionaisTerritoriaisV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESULT_SECONDS);}catch(e){}}
function agendasProfissionaisTerritoriaisV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function agendasProfissionaisTerritoriaisV1ResponderPost_(id,r){var m={source:'admin-agendas-profissionais-territoriais-v1',requestId:id,result:r};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(m).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function agendasProfissionaisTerritoriaisV1ResponderReserva_(nonce,r){var m={source:'agenda-odontologica-tacs',nonce:agendasProfissionaisTerritoriaisV1Texto_(nonce),result:r};Object.keys(r||{}).forEach(function(k){if(m[k]===undefined)m[k]=r[k];});var html='<!doctype html><meta charset="utf-8"><script>parent.postMessage('+JSON.stringify(m).replace(/</g,'\\u003c')+',"*");<\/script>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function agendasProfissionaisTerritoriaisV1ResponderJson_(r,cb){var json=JSON.stringify(r),c=agendasProfissionaisTerritoriaisV1Texto_(cb);if(c&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(c))return ContentService.createTextOutput(c+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function agendasProfissionaisTerritoriaisV1Erro_(e){return agendasProfissionaisTerritoriaisV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,700);}
