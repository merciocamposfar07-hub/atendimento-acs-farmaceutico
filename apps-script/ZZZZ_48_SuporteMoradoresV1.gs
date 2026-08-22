/**
 * ZZZZ_48_SuporteMoradoresV1.gs
 * Portal TACS — Suporte aos moradores V1.1.0
 *
 * Camada aditiva sobre os vínculos de aparelhos já existentes.
 * - diagnóstico administrativo consulta os aparelhos sem apagar, recriar ou reassociar vínculos;
 * - chamados do morador são gravados em aba própria, sem escrever no cadastro técnico do Push;
 * - resposta do suporte fica disponível no Portal por protocolo + token secreto;
 * - quando permitido, uma resposta administrativa pode também gerar aviso Push individual,
 *   mas a resposta interna continua válida mesmo se o Push estiver indisponível.
 */
var TACS_SUPORTE_MORADORES_V1 = Object.freeze({
  VERSAO:'1.1.0',
  RESULT_PREFIX:'tacs_suporte_moradores_v1_',
  RESULT_SECONDS:300,
  MAX_DEVICES:80,
  REMOTE_BUDGET_MS:14000,
  TICKET_SHEET:'TACS_SUPORTE_CHAMADOS',
  TICKET_HEADERS:Object.freeze(['PROTOCOLO','AREA_ID','AREA_NOME','MORADOR_ID','MORADOR_NOME','FAMILIA_ID','ORIGEM_ABA','ORIGEM_LINHA','CATEGORIA','MENSAGEM','DIAGNOSTICO_JSON','DISPOSITIVO_REF','STATUS','RESPOSTA','CRIADO_EM','ATUALIZADO_EM','RESPONDIDO_EM','TOKEN_HASH','PUSH_RESPOSTA','PUSH_DETALHE']),
  TICKET_STATUSES:Object.freeze(['NOVO','EM_ANALISE','RESPONDIDO','RESOLVIDO']),
  RATE_SECONDS:600,
  RATE_MAX:3
});

var suporteMoradoresV1DoGetAnterior_;
var suporteMoradoresV1DoPostAnterior_;
var suporteMoradoresV1GetAnterior_;
var suporteMoradoresV1PostAnterior_;

(function instalarSuporteMoradoresV1_(){
  if(typeof doGet==='function'){
    suporteMoradoresV1DoGetAnterior_=doGet;
    doGet=function(e){var r=suporteMoradoresV1TratarGet_(e);return r||suporteMoradoresV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    suporteMoradoresV1DoPostAnterior_=doPost;
    doPost=function(e){var r=suporteMoradoresV1TratarPost_(e);return r||suporteMoradoresV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    suporteMoradoresV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=suporteMoradoresV1TratarGet_(e);return r||suporteMoradoresV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    suporteMoradoresV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=suporteMoradoresV1TratarPost_(e);return r||suporteMoradoresV1PostAnterior_(e);};
  }
})();

function suporteMoradoresV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=suporteMoradoresV1Texto_(p.action).toLowerCase();
  if(action==='admin_suporte_moradores_result'||action==='publico_suporte_chamado_result'){
    var requestId=suporteMoradoresV1Texto_(p.requestId);
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return suporteMoradoresV1ResponderJson_({ok:false,message:'Identificador inválido.'},p.callback);
    var resultado=suporteMoradoresV1LerResultado_(requestId);
    return suporteMoradoresV1ResponderJson_(resultado?{ok:true,pendente:false,requestId:requestId,result:resultado}:{ok:true,pendente:true,requestId:requestId},p.callback);
  }
  if(action==='publico_suporte_chamado_status'){
    var statusResultado;
    try{statusResultado=suporteMoradoresV1StatusPublico_(p);}catch(erroStatus){statusResultado={ok:false,message:suporteMoradoresV1Erro_(erroStatus)};}
    return suporteMoradoresV1ResponderJson_(statusResultado,p.callback);
  }
  return null;
}

function suporteMoradoresV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=suporteMoradoresV1Texto_(p.action).toLowerCase();
  var permitidas=['admin_suporte_moradores_diagnostico','publico_suporte_chamado_criar','admin_suporte_chamados_listar','admin_suporte_chamado_atualizar'];
  if(permitidas.indexOf(action)===-1)return null;
  var requestId=suporteMoradoresV1Texto_(p.requestId),resultado;
  try{
    requestId=suporteMoradoresV1ValidarRequestId_(requestId);
    if(action==='publico_suporte_chamado_criar')resultado=suporteMoradoresV1CriarChamadoPublico_(p);
    else{
      var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
      suporteMoradoresV1ExigirAcesso_(acesso);
      var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
      if(action==='admin_suporte_moradores_diagnostico')resultado=suporteMoradoresV1Diagnostico_(contexto,acesso);
      else if(action==='admin_suporte_chamados_listar')resultado=suporteMoradoresV1ListarChamados_(p,contexto,acesso);
      else resultado=suporteMoradoresV1AtualizarChamado_(p,contexto,acesso,requestId);
    }
  }catch(erro){
    resultado={ok:false,message:suporteMoradoresV1Erro_(erro)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))suporteMoradoresV1GuardarResultado_(requestId,resultado);
  return suporteMoradoresV1ResponderPost_(requestId,resultado);
}

function suporteMoradoresV1ExigirAcesso_(acesso){
  if(acesso&&acesso.perfil==='TACS'){
    var permissoes=Array.isArray(acesso.permissoes)?acesso.permissoes:[];
    if(permissoes.indexOf('MORADORES_LER')===-1&&permissoes.indexOf('PUBLICACOES_GERENCIAR')===-1){
      throw new Error('Seu cadastro não possui permissão para acessar o suporte aos moradores.');
    }
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);
  return true;
}

function suporteMoradoresV1PodeReparar_(acesso){
  if(!acesso)return false;
  if(acesso.perfil!=='TACS')return true;
  var permissoes=Array.isArray(acesso.permissoes)?acesso.permissoes:[];
  return permissoes.indexOf('PUBLICACOES_GERENCIAR')!==-1;
}

function suporteMoradoresV1Diagnostico_(contexto,acesso){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET);
  var moradores=saudeNotificacoesV1MapaMoradores_(contexto);
  var registros=[],vistos={};

  if(sheet&&sheet.getLastRow()>1){
    var linhas=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues();
    linhas.forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==contexto.areaId)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row);
      var id=suporteMoradoresV1Texto_(reg.subscriptionId).toLowerCase();
      if(!id||vistos[id])return;
      vistos[id]=true;
      registros.push(reg);
    });
  }

  registros.sort(function(a,b){
    return suporteMoradoresV1Texto_(b.ultimoCheckin).localeCompare(suporteMoradoresV1Texto_(a.ultimoCheckin));
  });
  var limitado=registros.length>TACS_SUPORTE_MORADORES_V1.MAX_DEVICES;
  if(limitado)registros=registros.slice(0,TACS_SUPORTE_MORADORES_V1.MAX_DEVICES);

  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  var inicio=Date.now(),consultasRemotas=0,falhasRemotas=0,orcamentoEsgotado=false;
  var contagens={ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0};

  var aparelhos=registros.map(function(reg){
    var subscriptionId=suporteMoradoresV1Texto_(reg.subscriptionId).toLowerCase();
    var morador=reg.idPortal?moradores[reg.idPortal]:null;
    var pendencia=saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,subscriptionId,reg.reparoAplicado);
    var pendente=Boolean(pendencia&&pendencia.reparoId);
    var classificacao=saudeNotificacoesV1Classificar_(reg,null,pendente);
    var remotoEstado='NAO_CONSULTADO';

    if(apiKey&&!pendente&&Date.now()-inicio<TACS_SUPORTE_MORADORES_V1.REMOTE_BUDGET_MS){
      try{
        var onesignalId=suporteMoradoresV1Texto_(reg.onesignalId);
        if(!onesignalId)onesignalId=saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId);
        if(onesignalId){
          var usuario=saudeNotificacoesV1ViewUser_(appId,apiKey,onesignalId);
          var remoto=saudeNotificacoesV1EncontrarSubscription_(usuario,subscriptionId);
          consultasRemotas++;
          if(remoto){
            classificacao=saudeNotificacoesV1Classificar_(reg,remoto,false);
            remotoEstado='CONFIRMADO';
          }else{
            remotoEstado='NAO_ENCONTRADO';
            classificacao={status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'O vínculo local foi preservado, mas a inscrição não pôde ser confirmada no OneSignal nesta consulta.'};
          }
        }else{
          remotoEstado='IDENTIDADE_NAO_CONFIRMADA';
        }
      }catch(erroRemoto){
        falhasRemotas++;
        remotoEstado='INDISPONIVEL';
        if(classificacao.status==='SEM_CONFIRMACAO'){
          classificacao={status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'O registro local permanece preservado; a conferência direta com o OneSignal ficou indisponível nesta consulta.'};
        }
      }
    }else if(apiKey&&!pendente){
      orcamentoEsgotado=true;
      remotoEstado='ADIADO';
    }else if(!apiKey){
      remotoEstado='SEM_CREDENCIAL';
    }

    suporteMoradoresV1Somar_(contagens,classificacao.status);
    return {
      nome:morador&&moradoresAdminV1Texto_(morador.nome)?moradoresAdminV1Texto_(morador.nome):'Aparelho ainda não identificado',
      telefone:morador?moradoresAdminV1Texto_(morador.celular||morador.telefoneContato):'',
      dispositivo:reg.tipoAparelho||'Aparelho',
      navegador:reg.navegador||'',
      sistema:reg.sistema||'',
      status:classificacao.status,
      statusTexto:classificacao.texto,
      motivo:classificacao.motivo,
      ultimoCheckin:reg.ultimoCheckin||'',
      subscriptionRef:subscriptionId.slice(-8),
      reparoPendente:pendente,
      vinculadoMorador:Boolean(morador),
      consultaRemota:remotoEstado
    };
  });

  contagens.total=aparelhos.length;
  aparelhos.sort(function(a,b){
    var peso={REPARO:0,INATIVO:1,SEM_CONFIRMACAO:2,ATIVO:3};
    var pa=Object.prototype.hasOwnProperty.call(peso,a.status)?peso[a.status]:9;
    var pb=Object.prototype.hasOwnProperty.call(peso,b.status)?peso[b.status]:9;
    if(pa!==pb)return pa-pb;
    return String(a.nome).localeCompare(String(b.nome),'pt-BR');
  });

  return {
    ok:true,
    versao:TACS_SUPORTE_MORADORES_V1.VERSAO,
    areaId:contexto.areaId,
    areaNome:contexto.areaNome,
    contagens:contagens,
    aparelhos:aparelhos,
    limitado:limitado,
    podeReparar:suporteMoradoresV1PodeReparar_(acesso),
    somenteLeitura:true,
    vinculosPreservados:true,
    fonte:'REGISTRO_LOCAL_ONESIGNAL_DIRETO',
    consultasRemotas:consultasRemotas,
    falhasRemotas:falhasRemotas,
    consultasAdiadas:orcamentoEsgotado,
    observacao:'O diagnóstico não apaga, recria nem troca inscrições. Falha temporária de consulta remota não remove o aparelho nem desfaz seu vínculo local.'
  };
}

function suporteMoradoresV1Somar_(contagens,status){
  if(status==='ATIVO')contagens.ativos++;
  else if(status==='INATIVO')contagens.inativos++;
  else if(status==='REPARO')contagens.reparo++;
  else contagens.semConfirmacao++;
}

function suporteMoradoresV1TicketSheet_(){
  var ss=tacsTerritorioV1Planilha_(),sheet=ss.getSheetByName(TACS_SUPORTE_MORADORES_V1.TICKET_SHEET),headers=TACS_SUPORTE_MORADORES_V1.TICKET_HEADERS;
  if(!sheet){sheet=ss.insertSheet(TACS_SUPORTE_MORADORES_V1.TICKET_SHEET);sheet.getRange(1,1,1,headers.length).setValues([headers.slice()]);sheet.setFrozenRows(1);return sheet;}
  if(sheet.getLastColumn()<headers.length)sheet.insertColumnsAfter(Math.max(1,sheet.getLastColumn()),headers.length-sheet.getLastColumn());
  var atuais=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  var mudou=false;for(var i=0;i<headers.length;i++){if(atuais[i]!==headers[i]){mudou=true;break;}}
  if(mudou)sheet.getRange(1,1,1,headers.length).setValues([headers.slice()]);
  return sheet;
}

function suporteMoradoresV1Hash_(v){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,suporteMoradoresV1Texto_(v),Utilities.Charset.UTF_8);
  return bytes.map(function(b){var n=b<0?b+256:b;return ('0'+n.toString(16)).slice(-2);}).join('');
}

function suporteMoradoresV1ContextoPublico_(areaId){
  if(typeof identificacaoFamiliarPublicaV1Contexto_==='function')return identificacaoFamiliarPublicaV1Contexto_(areaId);
  throw new Error('A identificação territorial pública ainda não está disponível.');
}

function suporteMoradoresV1LocalizarPublico_(documento,contexto){
  var doc=moradoresAdminV1Digitos_(documento);
  if(!/^(?:\d{11}|\d{15})$/.test(doc))throw new Error('Identifique seu cadastro no Portal antes de enviar o suporte.');
  if(typeof identificacaoFamiliarPublicaV1LocalizarUnico_!=='function')throw new Error('A validação do cadastro ainda não está disponível.');
  return identificacaoFamiliarPublicaV1LocalizarUnico_(doc,contexto);
}

function suporteMoradoresV1RateLimit_(areaId,documento){
  var cache=CacheService.getScriptCache(),key='tacs_sup_rate_'+suporteMoradoresV1Hash_(areaId+'|'+documento).slice(0,24),n=Number(cache.get(key)||0);
  if(n>=TACS_SUPORTE_MORADORES_V1.RATE_MAX)throw new Error('Muitos pedidos foram enviados em pouco tempo. Aguarde alguns minutos antes de tentar novamente.');
  cache.put(key,String(n+1),TACS_SUPORTE_MORADORES_V1.RATE_SECONDS);
}

function suporteMoradoresV1Categoria_(v){
  var c=suporteMoradoresV1Texto_(v).toUpperCase(),validas=['NOTIFICACOES','VAGA','DADOS','ACESSO','DESEMPENHO','OUTRO'];
  if(validas.indexOf(c)===-1)throw new Error('Selecione o tipo do problema.');
  return c;
}

function suporteMoradoresV1Mensagem_(v){
  var m=suporteMoradoresV1Texto_(v).replace(/\u0000/g,'').slice(0,1200);
  if(m.length<5)throw new Error('Explique brevemente o que aconteceu.');
  return m;
}

function suporteMoradoresV1Protocolo_(){
  var tz='America/Recife',dia=Utilities.formatDate(new Date(),tz,'yyyyMMdd'),id=Utilities.getUuid().replace(/-/g,'').slice(0,7).toUpperCase();
  return 'SUP-'+dia+'-'+id;
}

function suporteMoradoresV1CriarChamadoPublico_(p){
  var contexto=suporteMoradoresV1ContextoPublico_(p.areaId||p.area||''),doc=moradoresAdminV1Digitos_(p.documento||''),achado=suporteMoradoresV1LocalizarPublico_(doc,contexto);
  suporteMoradoresV1RateLimit_(contexto.areaId,doc);
  var categoria=suporteMoradoresV1Categoria_(p.categoria),mensagem=suporteMoradoresV1Mensagem_(p.mensagem),diag=suporteMoradoresV1Texto_(p.diagnostico).slice(0,2400),dispositivo=suporteMoradoresV1Texto_(p.dispositivo).slice(-10);
  var morador=achado.morador||{},familia='';
  try{familia=typeof vinculoFamiliarNotifV1CodigoEndereco_==='function'?suporteMoradoresV1Texto_(vinculoFamiliarNotifV1CodigoEndereco_(morador.endereco||'')):'';}catch(e){}
  var moradorId=suporteMoradoresV1Texto_((achado.meta&&achado.meta.moradorId)||morador.idPortal||morador.id||achado.chave),protocolo=suporteMoradoresV1Protocolo_(),token=Utilities.getUuid()+Utilities.getUuid().replace(/-/g,''),agora=new Date();
  var sheet=suporteMoradoresV1TicketSheet_(),row=[protocolo,contexto.areaId,contexto.areaNome,moradorId,suporteMoradoresV1Texto_(morador.nome),familia,suporteMoradoresV1Texto_(achado.origem&&achado.origem.aba),Number(achado.origem&&achado.origem.linha||0),categoria,mensagem,diag,dispositivo,'NOVO','',agora,agora,'',suporteMoradoresV1Hash_(token),'NAO_ENVIADO',''];
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('O suporte está recebendo outro pedido. Tente novamente em instantes.');
  try{sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setValues([row]);SpreadsheetApp.flush();}finally{lock.releaseLock();}
  return {ok:true,protocolo:protocolo,token:token,status:'NOVO',statusTexto:'Novo',message:'Pedido de suporte registrado.'};
}

function suporteMoradoresV1TicketRows_(sheet){
  if(!sheet||sheet.getLastRow()<=1)return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,TACS_SUPORTE_MORADORES_V1.TICKET_HEADERS.length).getValues();
}

function suporteMoradoresV1StatusTexto_(s){
  return {NOVO:'Novo',EM_ANALISE:'Em análise',RESPONDIDO:'Respondido',RESOLVIDO:'Resolvido'}[s]||s;
}

function suporteMoradoresV1FormatDate_(v){
  if(!v)return '';
  try{return Utilities.formatDate(new Date(v),'America/Recife','dd/MM/yyyy HH:mm');}catch(e){return suporteMoradoresV1Texto_(v);}
}

function suporteMoradoresV1StatusPublico_(p){
  var protocolo=suporteMoradoresV1Texto_(p.protocolo).toUpperCase(),token=suporteMoradoresV1Texto_(p.token);
  if(!/^SUP-\d{8}-[A-Z0-9]{7}$/.test(protocolo)||token.length<20)throw new Error('Identificação do pedido inválida.');
  var sheet=suporteMoradoresV1TicketSheet_(),rows=suporteMoradoresV1TicketRows_(sheet),hash=suporteMoradoresV1Hash_(token);
  for(var i=rows.length-1;i>=0;i--){var r=rows[i];if(suporteMoradoresV1Texto_(r[0]).toUpperCase()!==protocolo)continue;if(suporteMoradoresV1Texto_(r[17])!==hash)throw new Error('Este pedido não pertence a este aparelho.');var st=suporteMoradoresV1Texto_(r[12]).toUpperCase();return {ok:true,protocolo:protocolo,status:st,statusTexto:suporteMoradoresV1StatusTexto_(st),resposta:suporteMoradoresV1Texto_(r[13]),atualizadoEm:suporteMoradoresV1FormatDate_(r[15]),respondidoEm:suporteMoradoresV1FormatDate_(r[16])};}
  throw new Error('Pedido de suporte não encontrado.');
}

function suporteMoradoresV1ListarChamados_(p,contexto,acesso){
  var sheet=suporteMoradoresV1TicketSheet_(),rows=suporteMoradoresV1TicketRows_(sheet),statusFiltro=suporteMoradoresV1Texto_(p.status).toUpperCase(),busca=suporteMoradoresV1Texto_(p.busca).toLowerCase(),counts={NOVO:0,EM_ANALISE:0,RESPONDIDO:0,RESOLVIDO:0},tickets=[];
  for(var i=rows.length-1;i>=0;i--){var r=rows[i],area=moradoresAdminV1NormalizarAreaId_(r[1]);if(area!==contexto.areaId)continue;var st=suporteMoradoresV1Texto_(r[12]).toUpperCase();if(Object.prototype.hasOwnProperty.call(counts,st))counts[st]++;var item={protocolo:suporteMoradoresV1Texto_(r[0]),moradorId:suporteMoradoresV1Texto_(r[3]),morador:suporteMoradoresV1Texto_(r[4]),familiaId:suporteMoradoresV1Texto_(r[5]),categoria:suporteMoradoresV1Texto_(r[8]),mensagem:suporteMoradoresV1Texto_(r[9]),diagnostico:suporteMoradoresV1Texto_(r[10]),dispositivoRef:suporteMoradoresV1Texto_(r[11]),status:st,statusTexto:suporteMoradoresV1StatusTexto_(st),resposta:suporteMoradoresV1Texto_(r[13]),criadoEm:suporteMoradoresV1FormatDate_(r[14]),atualizadoEm:suporteMoradoresV1FormatDate_(r[15]),respondidoEm:suporteMoradoresV1FormatDate_(r[16]),pushResposta:suporteMoradoresV1Texto_(r[18]),pushDetalhe:suporteMoradoresV1Texto_(r[19])};if(statusFiltro&&st!==statusFiltro)continue;if(busca&&[item.protocolo,item.morador,item.familiaId,item.categoria,item.mensagem].join(' ').toLowerCase().indexOf(busca)===-1)continue;tickets.push(item);if(tickets.length>=120)break;}
  return {ok:true,areaId:contexto.areaId,areaNome:contexto.areaNome,contagens:counts,tickets:tickets,total:tickets.length,podeResponder:true,vinculosPreservados:true};
}

function suporteMoradoresV1LocalizarTicketRow_(sheet,protocolo,areaId){
  var rows=suporteMoradoresV1TicketRows_(sheet);for(var i=rows.length-1;i>=0;i--){if(suporteMoradoresV1Texto_(rows[i][0]).toUpperCase()===protocolo&&moradoresAdminV1NormalizarAreaId_(rows[i][1])===areaId)return {row:i+2,data:rows[i]};}return null;
}

function suporteMoradoresV1TentarPushResposta_(ticket,resposta,contexto,acesso,requestId){
  if(!resposta)return {estado:'NAO_ENVIADO',detalhe:'Resposta interna salva sem aviso Push.'};
  try{
    if(typeof notificacoesAreaV1ExigirPublicacao_==='function')notificacoesAreaV1ExigirPublicacao_(acesso);
    if(typeof mensagemIndividualV1Enviar_!=='function')return {estado:'INDISPONIVEL',detalhe:'Envio individual não disponível.'};
    var result=mensagemIndividualV1Enviar_({tipo:'OUTRA_MENSAGEM',mensagem:'Resposta do suporte '+ticket[0]+': '+resposta,origemAba:ticket[6],origemLinha:ticket[7],moradorId:ticket[3]},contexto,acesso,'suporte_'+requestId);
    if(result&&result.enviado===true)return {estado:'ENVIADO',detalhe:'Aviso Push individual encaminhado.'};
    return {estado:'NAO_ENVIADO',detalhe:suporteMoradoresV1Texto_(result&&result.message)||'Nenhum aparelho apto para aviso Push.'};
  }catch(e){return {estado:'NAO_ENVIADO',detalhe:suporteMoradoresV1Erro_(e).slice(0,240)};}
}

function suporteMoradoresV1AtualizarChamado_(p,contexto,acesso,requestId){
  var protocolo=suporteMoradoresV1Texto_(p.protocolo).toUpperCase(),status=suporteMoradoresV1Texto_(p.status).toUpperCase(),resposta=suporteMoradoresV1Texto_(p.resposta).slice(0,1600);
  if(!/^SUP-\d{8}-[A-Z0-9]{7}$/.test(protocolo))throw new Error('Protocolo inválido.');
  if(TACS_SUPORTE_MORADORES_V1.TICKET_STATUSES.indexOf(status)===-1)throw new Error('Situação do chamado inválida.');
  if((status==='RESPONDIDO'||status==='RESOLVIDO')&&resposta.length<3)throw new Error('Digite a resposta ao morador antes de concluir.');
  var sheet=suporteMoradoresV1TicketSheet_(),found=suporteMoradoresV1LocalizarTicketRow_(sheet,protocolo,contexto.areaId);if(!found)throw new Error('Chamado não encontrado nesta área.');
  var agora=new Date(),push={estado:suporteMoradoresV1Texto_(found.data[18])||'NAO_ENVIADO',detalhe:suporteMoradoresV1Texto_(found.data[19])};
  if(resposta&&resposta!==suporteMoradoresV1Texto_(found.data[13]))push=suporteMoradoresV1TentarPushResposta_(found.data,resposta,contexto,acesso,requestId);
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Este chamado está sendo atualizado. Tente novamente.');
  try{sheet.getRange(found.row,13,1,8).setValues([[status,resposta,found.data[14]||agora,agora,(resposta?agora:found.data[16]),found.data[17],push.estado,push.detalhe]]);SpreadsheetApp.flush();}finally{lock.releaseLock();}
  return {ok:true,protocolo:protocolo,status:status,statusTexto:suporteMoradoresV1StatusTexto_(status),resposta:resposta,pushResposta:push.estado,pushDetalhe:push.detalhe,message:'Chamado atualizado.'};
}

function suporteMoradoresV1GuardarResultado_(requestId,result){
  CacheService.getScriptCache().put(TACS_SUPORTE_MORADORES_V1.RESULT_PREFIX+requestId,JSON.stringify(result),TACS_SUPORTE_MORADORES_V1.RESULT_SECONDS);
}

function suporteMoradoresV1LerResultado_(requestId){
  var raw=CacheService.getScriptCache().get(TACS_SUPORTE_MORADORES_V1.RESULT_PREFIX+requestId);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}

function suporteMoradoresV1ResponderJson_(obj,callback){
  var json=JSON.stringify(obj);
  if(callback&&/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(callback)){
    return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function suporteMoradoresV1ResponderPost_(requestId,result){
  var payload={source:'suporte-moradores-v1',requestId:requestId,result:result};
  var json=JSON.stringify(payload).replace(/</g,'\\u003c');
  var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var p='+json+';try{parent.postMessage(p,"*");}catch(e){}}());<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function suporteMoradoresV1ValidarRequestId_(v){
  v=suporteMoradoresV1Texto_(v);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da requisição inválido.');
  return v;
}
function suporteMoradoresV1Texto_(v){return String(v==null?'':v).trim();}
function suporteMoradoresV1Erro_(e){return e&&e.message?String(e.message):'Não foi possível consultar o suporte aos moradores.';}
