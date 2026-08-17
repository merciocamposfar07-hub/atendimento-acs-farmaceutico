/*
 * ZZZZ_36_CorrecaoDataOdontologiaV1.gs
 * Portal TACS — restauração da agenda odontológica completa V2.0.0
 *
 * Escopo fechado:
 * - action=agenda devolve SEMPRE segunda a sexta, inclusive dias inativos;
 * - preserva a data civil exatamente como aparece na planilha;
 * - aplica a hora configurável ENCERRA_HORARIO como expiração real das vagas;
 * - reserva usa a mesma data civil e bloqueia agenda expirada/cancelada;
 * - não altera moradores, profissionais, campanhas, recados ou outros módulos.
 */
var TACS_CORRECAO_DATA_ODONTOLOGIA_V1=Object.freeze({
  VERSAO:'2.0.0',
  TZ:'America/Recife',
  DIAS:Object.freeze(['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira'])
});

var correcaoDataOdontologiaV1DoGetAnterior_;
var correcaoDataOdontologiaV1DoPostAnterior_;
(function instalarCorrecaoDataOdontologiaV1_(){
  if(typeof doGet==='function'){
    correcaoDataOdontologiaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var p=e&&e.parameter?e.parameter:{},action=correcaoDataOdontologiaV1Texto_(p.action).toLowerCase();
      if(action==='agenda'){
        try{
          var areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
          return agendasProfissionaisTerritoriaisV1ResponderJson_(correcaoDataOdontologiaV1AgendaCompleta_(areaId),p.callback);
        }catch(erroAgenda){
          return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:correcaoDataOdontologiaV1Erro_(erroAgenda)},p.callback);
        }
      }
      return correcaoDataOdontologiaV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    correcaoDataOdontologiaV1DoPostAnterior_=doPost;
    doPost=function(e){
      var p=e&&e.parameter?e.parameter:{},action=correcaoDataOdontologiaV1Texto_(p.action).toLowerCase();
      if(action==='reservar'||action==='reservar_odontologia'){
        var resultado;
        try{resultado=correcaoDataOdontologiaV1Reservar_(p);}
        catch(erroReserva){resultado={ok:false,message:correcaoDataOdontologiaV1Erro_(erroReserva)};}
        return agendasProfissionaisTerritoriaisV1ResponderReserva_(p.nonce,resultado);
      }
      return correcaoDataOdontologiaV1DoPostAnterior_(e);
    };
  }
})();

function correcaoDataOdontologiaV1AgendaCompleta_(areaId){
  var tabela=agendasProfissionaisTerritoriaisV1Tabela_(
    agendasProfissionaisTerritoriaisV1Planilha_(),
    TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,
    TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,
    false
  );
  var porDia={};
  if(tabela){
    agendasProfissionaisTerritoriaisV1LinhasArea_(tabela,areaId).forEach(function(linha){
      var item=agendasProfissionaisTerritoriaisV1Objeto_(tabela.headers,linha.values);
      if(agendasProfissionaisTerritoriaisV1Modulo_(item.MODULO)!=='odontologia')return;
      var dia=correcaoDataOdontologiaV1Texto_(item.DIA);
      if(TACS_CORRECAO_DATA_ODONTOLOGIA_V1.DIAS.indexOf(dia)===-1)return;
      var data=correcaoDataOdontologiaV1DataLinha_(tabela,linha,item);
      var ativo=agendasProfissionaisTerritoriaisV1Booleano_(item.ATIVO);
      var situacao=correcaoDataOdontologiaV1Texto_(item.SITUACAO);
      var expiraAs=correcaoDataOdontologiaV1HoraLinha_(tabela,linha,item);
      var expirada=correcaoDataOdontologiaV1Expirada_(tabela,linha,item);
      var situacaoAberta=correcaoDataOdontologiaV1SituacaoAberta_(situacao);
      var comuns=agendasProfissionaisTerritoriaisV1NaoNegativo_(item.VAGAS_COMUNS);
      var emergenciais=agendasProfissionaisTerritoriaisV1NaoNegativo_(item.VAGAS_EMERGENCIAIS);
      var aberta=ativo&&situacaoAberta&&!expirada&&!!data;
      porDia[dia]={
        id:'DENTISTA-'+areaId+'-'+linha.row+'-'+(data||dia),
        dia:dia,
        data:data,
        horario:correcaoDataOdontologiaV1Texto_(item.HORARIO),
        situacao:situacao,
        ativo:ativo,
        expiraAs:expiraAs,
        encerrada:!aberta,
        vagasComuns:aberta?comuns:0,
        vagasEmergenciais:aberta?emergenciais:0,
        vagasComunsConfiguradas:comuns,
        vagasEmergenciaisConfiguradas:emergenciais,
        diaExtra:agendasProfissionaisTerritoriaisV1Booleano_(item.DIA_EXTRA)
      };
    });
  }
  var dias=TACS_CORRECAO_DATA_ODONTOLOGIA_V1.DIAS.map(function(dia){
    return porDia[dia]||{
      id:'DENTISTA-'+areaId+'-'+dia,
      dia:dia,data:'',horario:'',situacao:'NAO_CONFIGURADO',ativo:false,
      expiraAs:'',encerrada:true,vagasComuns:0,vagasEmergenciais:0,
      vagasComunsConfiguradas:0,vagasEmergenciaisConfiguradas:0,diaExtra:false
    };
  });
  return{
    ok:true,
    versao:TACS_CORRECAO_DATA_ODONTOLOGIA_V1.VERSAO,
    areaId:areaId,
    isolamento:'AREA_ID',
    atualizadoEm:Utilities.formatDate(new Date(),TACS_CORRECAO_DATA_ODONTOLOGIA_V1.TZ,'dd/MM/yyyy HH:mm'),
    dias:dias
  };
}

function correcaoDataOdontologiaV1Reservar_(p){
  var areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
  var requestId=correcaoDataOdontologiaV1Texto_(p.requestId);
  var data=correcaoDataOdontologiaV1DataCivil_(p.date);
  var tipo=correcaoDataOdontologiaV1Texto_(p.type).toLowerCase();
  if(!/^[A-Z0-9-]{8,60}$/.test(requestId))return{ok:false,code:'INVALID_REQUEST',message:'Código da solicitação inválido.'};
  if(!data)return{ok:false,code:'INVALID_DATE',message:'Data da consulta inválida.'};
  var hoje=Utilities.formatDate(new Date(),TACS_CORRECAO_DATA_ODONTOLOGIA_V1.TZ,'yyyy-MM-dd');
  if(data<hoje)return{ok:false,code:'PAST_DATE',message:'Essa data já passou.'};
  if(tipo!=='comum'&&tipo!=='emergencial')return{ok:false,code:'INVALID_TYPE',message:'Tipo de vaga inválido.'};

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))return{ok:false,code:'BUSY',message:'A agenda está sendo atualizada. Tente novamente.'};
  try{
    var ss=agendasProfissionaisTerritoriaisV1Planilha_();
    var reservas=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);
    var existente=agendasProfissionaisTerritoriaisV1Encontrar_(reservas,'CODIGO_SOLICITACAO',requestId,areaId);
    if(existente){
      var antigo=agendasProfissionaisTerritoriaisV1Objeto_(reservas.headers,existente.values);
      return{ok:true,alreadyReserved:true,requestId:requestId,areaId:areaId,date:correcaoDataOdontologiaV1DataCivil_(antigo.DATA_CONSULTA)||agendasProfissionaisTerritoriaisV1Data_(antigo.DATA_CONSULTA),type:correcaoDataOdontologiaV1Texto_(antigo.TIPO_VAGA),remaining:agendasProfissionaisTerritoriaisV1NaoNegativo_(antigo.VAGAS_RESTANTES),message:'Esta solicitação já possui uma vaga reservada nesta área.'};
    }

    var agenda=agendasProfissionaisTerritoriaisV1Tabela_(ss,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,true),alvo=null,alvoItem=null;
    agendasProfissionaisTerritoriaisV1LinhasArea_(agenda,areaId).some(function(linha){
      var item=agendasProfissionaisTerritoriaisV1Objeto_(agenda.headers,linha.values);
      if(agendasProfissionaisTerritoriaisV1Modulo_(item.MODULO)==='odontologia'&&correcaoDataOdontologiaV1DataLinha_(agenda,linha,item)===data&&agendasProfissionaisTerritoriaisV1Booleano_(item.ATIVO)){
        alvo=linha;alvoItem=item;return true;
      }
      return false;
    });
    if(!alvo)return{ok:false,code:'DATE_NOT_FOUND',message:'Essa data não está mais disponível na agenda desta área.'};
    if(!correcaoDataOdontologiaV1SituacaoAberta_(alvoItem.SITUACAO))return{ok:false,code:'CLOSED',message:'Essa agenda está sem atendimento.'};
    if(correcaoDataOdontologiaV1Expirada_(agenda,alvo,alvoItem))return{ok:false,code:'EXPIRED',message:'O horário de solicitação dessa agenda já encerrou.'};

    var campo=tipo==='comum'?'VAGAS_COMUNS':'VAGAS_EMERGENCIAIS';
    var indice=agendasProfissionaisTerritoriaisV1Indice_(agenda,campo);
    var disponiveis=Number(alvo.values[indice]);
    if(!Number.isInteger(disponiveis)||disponiveis<=0)return{ok:false,code:'NO_SLOTS',message:tipo==='emergencial'?'A vaga emergencial desse dia acabou.':'As vagas comuns desse dia acabaram.'};
    var restantes=disponiveis-1;
    agenda.sheet.getRange(alvo.row,indice+1).setValue(restantes);
    var idxAtualizado=agendasProfissionaisTerritoriaisV1Indice_(agenda,'ATUALIZADO_EM',false);
    if(idxAtualizado>=0)agenda.sheet.getRange(alvo.row,idxAtualizado+1).setValue(new Date());
    agendasProfissionaisTerritoriaisV1Adicionar_(reservas,{CODIGO_SOLICITACAO:requestId,REGISTRADA_EM:new Date(),DATA_CONSULTA:data,TIPO_VAGA:tipo,SITUACAO:'Reservada pelo portal',VAGAS_RESTANTES:restantes,AREA_ID:areaId,ATUALIZADO_EM:new Date()});
    SpreadsheetApp.flush();
    return{ok:true,alreadyReserved:false,requestId:requestId,areaId:areaId,date:data,type:tipo,remaining:restantes,message:'Vaga reservada e confirmada somente na agenda desta área.'};
  }finally{lock.releaseLock();}
}

function correcaoDataOdontologiaV1DataLinha_(tabela,linha,item){
  var idx=agendasProfissionaisTerritoriaisV1Indice_(tabela,'DATA',false),exibida='';
  if(idx>=0){try{exibida=correcaoDataOdontologiaV1Texto_(tabela.sheet.getRange(linha.row,idx+1).getDisplayValues()[0][0]);}catch(ignore){}}
  var civil=correcaoDataOdontologiaV1DataCivil_(exibida);
  if(civil)return civil;
  if(item&&Object.prototype.toString.call(item.DATA)!=='[object Date]')return correcaoDataOdontologiaV1DataCivil_(item.DATA);
  return item?agendasProfissionaisTerritoriaisV1Data_(item.DATA):'';
}

function correcaoDataOdontologiaV1HoraLinha_(tabela,linha,item){
  var idx=agendasProfissionaisTerritoriaisV1Indice_(tabela,'ENCERRA_HORARIO',false),exibida='';
  if(idx>=0){try{exibida=correcaoDataOdontologiaV1Texto_(tabela.sheet.getRange(linha.row,idx+1).getDisplayValues()[0][0]);}catch(ignore){}}
  var m=exibida.match(/(?:^|\s)([01]\d|2[0-3]):([0-5]\d)(?:\s|$)/);if(m)return m[1]+':'+m[2];
  var bruto=correcaoDataOdontologiaV1Texto_(item&&item.ENCERRA_HORARIO),b=bruto.match(/^([01]\d|2[0-3]):([0-5]\d)$/);if(b)return b[1]+':'+b[2];
  return agendasProfissionaisTerritoriaisV1Booleano_(item&&item.ENCERRA_12H)?'12:00':'';
}

function correcaoDataOdontologiaV1Expirada_(tabela,linha,item){
  var data=correcaoDataOdontologiaV1DataLinha_(tabela,linha,item);if(!data)return false;
  var hoje=Utilities.formatDate(new Date(),TACS_CORRECAO_DATA_ODONTOLOGIA_V1.TZ,'yyyy-MM-dd');
  if(data<hoje)return true;if(data>hoje)return false;
  var hora=correcaoDataOdontologiaV1HoraLinha_(tabela,linha,item);if(!hora)return false;
  return Utilities.formatDate(new Date(),TACS_CORRECAO_DATA_ODONTOLOGIA_V1.TZ,'HH:mm')>=hora;
}
function correcaoDataOdontologiaV1SituacaoAberta_(valor){var s=agendasProfissionaisTerritoriaisV1Normalizar_(valor);return['CANCELADO','CANCELADA','FERIADO','SEM ATENDIMENTO','NAO_CONFIGURADO'].indexOf(s)===-1;}
function correcaoDataOdontologiaV1DataCivil_(valor){var s=correcaoDataOdontologiaV1Texto_(valor),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?m[3]+'-'+m[2]+'-'+m[1]:'';}
function correcaoDataOdontologiaV1Texto_(valor){return String(valor==null?'':valor).trim();}
function correcaoDataOdontologiaV1Erro_(erro){return erro&&erro.message?erro.message:String(erro);}
