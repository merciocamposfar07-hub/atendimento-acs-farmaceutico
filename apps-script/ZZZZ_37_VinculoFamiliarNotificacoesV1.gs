/**
 * ZZZZ_37_VinculoFamiliarNotificacoesV1.gs
 * Portal TACS — vínculo familiar de aparelhos de notificação V1.0.1
 *
 * Escopo estrito:
 * - não altera envio Push, OneSignal, webhooks ou feedback;
 * - não altera o schema A:T de MORADORES;
 * - mantém a inscrição Push vinculada à família mesmo quando o aparelho é usado
 *   para solicitar serviço para outro morador da mesma área;
 * - usa o código familiar existente no ENDERECO (ex.: "Sítio Japaranduba, 002. ...");
 * - beneficiário de outra família da mesma área não troca o vínculo do aparelho;
 * - correção do código familiar no ENDERECO atualiza o vínculo somente pela mesma
 *   pessoa de referência que originou o vínculo técnico;
 * - isolamento territorial continua a cargo da validação pública já existente.
 */
var TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1 = Object.freeze({
  VERSAO:'1.0.1',
  SHEET:'TACS_NOTIFICACOES_FAMILIAS',
  HEADERS:Object.freeze([
    'SUBSCRIPTION_ID','AREA_ID','FAMILIA_ID','ID_PORTAL_REFERENCIA','NOME_REFERENCIA',
    'ORIGEM_VINCULO','VINCULADO_EM','ATUALIZADO_EM'
  ])
});

var vinculoFamiliarNotifV1CheckinAnterior_ = typeof saudeNotificacoesV1CheckinPublico_==='function'
  ?saudeNotificacoesV1CheckinPublico_:null;
var vinculoFamiliarNotifV1SaudeAdminAnterior_ = typeof saudeNotificacoesV1SaudeAdmin_==='function'
  ?saudeNotificacoesV1SaudeAdmin_:null;

(function instalarVinculoFamiliarNotificacoesV1_(){
  if(vinculoFamiliarNotifV1CheckinAnterior_){
    saudeNotificacoesV1CheckinPublico_=function(p){return vinculoFamiliarNotifV1Checkin_(p);};
  }
  if(vinculoFamiliarNotifV1SaudeAdminAnterior_){
    saudeNotificacoesV1SaudeAdmin_=function(contexto,acesso){return vinculoFamiliarNotifV1SaudeAdmin_(contexto,acesso);};
  }
})();

function vinculoFamiliarNotifV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var subscriptionId=vinculoFamiliarNotifV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
  var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||'JAPARANDUBA');
  var documento=p.documento||p.cpf||p.cns||'';
  var vinculo=vinculoFamiliarNotifV1Ler_(subscriptionId,areaId);
  var morador=vinculoFamiliarNotifV1ResolverMoradorDocumento_(documento,areaId);

  if(!vinculo){
    var legado=vinculoFamiliarNotifV1ResolverLegado_(subscriptionId,areaId);
    if(legado&&legado.familiaId){
      vinculo=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,legado,'MIGRADO_ID_PORTAL');
    }
  }

  if(vinculo){
    vinculo=vinculoFamiliarNotifV1ReconciliarReferencia_(vinculo,areaId);
  }

  var decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);
  if(decisao.acao==='VINCULAR'){
    vinculo=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,morador,'DOCUMENTO_VALIDADO');
    decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);
  }

  var parametros=vinculo?Object.assign({},p):p;
  if(vinculo){
    delete parametros.documento;
    delete parametros.cpf;
    delete parametros.cns;
  }

  var resultado=vinculoFamiliarNotifV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};
  resultado.vinculadoFamilia=Boolean(vinculo&&vinculo.familiaId);
  resultado.familiaId=vinculo&&vinculo.familiaId?vinculo.familiaId:'';
  resultado.familiaDiferente=decisao.acao==='OUTRA_FAMILIA';
  resultado.familiaBeneficiario=morador&&morador.familiaId?morador.familiaId:'';
  if(resultado.familiaDiferente){
    resultado.message='Esta pessoa pertence a outro cadastro familiar desta mesma área. A solicitação pode continuar normalmente.';
  }
  return resultado;
}

function vinculoFamiliarNotifV1Decidir_(vinculo,morador){
  var atual=vinculo&&vinculo.familiaId?vinculo.familiaId:'';
  var beneficiario=morador&&morador.familiaId?morador.familiaId:'';
  if(!beneficiario)return {acao:'NADA',familiaId:atual,familiaBeneficiario:''};
  if(!atual)return {acao:'VINCULAR',familiaId:'',familiaBeneficiario:beneficiario};
  if(atual===beneficiario)return {acao:'MESMA_FAMILIA',familiaId:atual,familiaBeneficiario:beneficiario};
  return {acao:'OUTRA_FAMILIA',familiaId:atual,familiaBeneficiario:beneficiario};
}

function vinculoFamiliarNotifV1CodigoEndereco_(endereco){
  var texto=vinculoFamiliarNotifV1Texto_(endereco).toUpperCase();
  if(!texto)return '';
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  var match=texto.match(/,\s*([0-9]{1,4}[A-Z]?)\s*\.\s*(?:ZONA\s+RURAL\b|ZONA\b|RURAL\b)/);
  if(!match)match=texto.match(/,\s*([0-9]{1,4}[A-Z]?)\s*\./);
  return match?vinculoFamiliarNotifV1Texto_(match[1]).toUpperCase():'';
}

function vinculoFamiliarNotifV1ResolverMoradorDocumento_(documento,areaId){
  var doc=moradoresAdminV1Digitos_(documento);
  var cpf=/^[0-9]{11}$/.test(doc)&&moradoresAdminV1CpfValido_(doc)?doc:'';
  var cns=/^[0-9]{15}$/.test(doc)?doc:'';
  if(!cpf&&!cns)return null;
  var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
  if(!area||area.publica===false)return null;
  var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var encontrados=[];
  moradoresAdminV1LocalizarTodosPorDocumento_(fonte,cpf,cns).forEach(function(registro){
    var origemKey=moradoresAdminV1ChaveOrigem_(registro.origem);
    var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
    var meta=metaMap.porOrigem[origemKey]||metaMap.porChave[chave]||null;
    var situacao=moradoresAdminV1Texto_((meta&&meta.situacao)||registro.morador.status||'ATIVO').toUpperCase();
    if(situacao==='ATIVO')encontrados.push(registro.morador);
  });
  if(encontrados.length!==1)return null;
  return vinculoFamiliarNotifV1Morador_(encontrados[0]);
}

function vinculoFamiliarNotifV1ResolverLegado_(subscriptionId,areaId){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId))return null;
  var ss=tacsTerritorioV1Planilha_();
  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=registry.getLastRow(),idPortal='';
  if(last>1){
    var rows=registry.getRange(2,1,last-1,3).getDisplayValues();
    for(var i=0;i<rows.length;i++){
      if(vinculoFamiliarNotifV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;
      if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
      idPortal=vinculoFamiliarNotifV1Texto_(rows[i][2]);break;
    }
  }
  if(!idPortal)return null;
  return vinculoFamiliarNotifV1ResolverMoradorId_(idPortal,areaId);
}

function vinculoFamiliarNotifV1ResolverMoradorId_(idPortal,areaId){
  var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
  if(!area||area.publica===false)return null;
  var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
  var mapa=saudeNotificacoesV1MapaMoradores_(contexto);
  var morador=mapa&&mapa[idPortal]?mapa[idPortal]:null;
  return morador?vinculoFamiliarNotifV1Morador_(morador):null;
}

function vinculoFamiliarNotifV1Morador_(morador){
  morador=morador&&typeof morador==='object'?morador:{};
  var familiaId=vinculoFamiliarNotifV1CodigoEndereco_(morador.endereco||morador.localidade||'');
  if(!familiaId)return null;
  return {
    familiaId:familiaId,
    idPortal:vinculoFamiliarNotifV1Texto_(morador.idPortal||morador.id),
    nome:vinculoFamiliarNotifV1Texto_(morador.nome),
    endereco:vinculoFamiliarNotifV1Texto_(morador.endereco||morador.localidade||'')
  };
}

function vinculoFamiliarNotifV1ReconciliarReferencia_(vinculo,areaId){
  if(!vinculo||!vinculo.idPortal||!vinculo.familiaId)return vinculo;
  var atual=vinculoFamiliarNotifV1ResolverMoradorId_(vinculo.idPortal,areaId);
  if(!atual||!atual.familiaId||atual.idPortal!==vinculo.idPortal)return vinculo;
  if(atual.familiaId===vinculo.familiaId&&(!atual.nome||atual.nome===vinculo.nome))return vinculo;
  return vinculoFamiliarNotifV1AtualizarReferencia_(vinculo,atual)||vinculo;
}

function vinculoFamiliarNotifV1AtualizarReferencia_(vinculo,morador){
  if(!vinculo||!morador||!vinculo.subscriptionId||!vinculo.areaId)return vinculo;
  if(!vinculo.idPortal||!morador.idPortal||vinculo.idPortal!==morador.idPortal)return vinculo;
  if(!morador.familiaId)return vinculo;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return vinculo;
  try{
    var last=sheet.getLastRow();if(last<=1)return vinculo;
    var rows=sheet.getRange(2,1,last-1,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS.length).getDisplayValues();
    for(var i=rows.length-1;i>=0;i--){
      var existente=vinculoFamiliarNotifV1Linha_(rows[i]);
      if(existente.subscriptionId!==vinculo.subscriptionId||existente.areaId!==vinculo.areaId)continue;
      if(!existente.idPortal||existente.idPortal!==vinculo.idPortal||existente.idPortal!==morador.idPortal)return existente;
      var agora=saudeNotificacoesV1Data_(new Date());
      var values=[
        existente.subscriptionId,existente.areaId,morador.familiaId,existente.idPortal,
        morador.nome||existente.nome||'','CADASTRO_REFERENCIA_ATUALIZADO',
        existente.vinculadoEm||agora,agora
      ];
      sheet.getRange(i+2,1,1,values.length).setValues([values]);
      return vinculoFamiliarNotifV1Linha_(values);
    }
    return vinculo;
  }finally{lock.releaseLock();}
}

function vinculoFamiliarNotifV1ReconciliarArea_(contexto){
  if(!contexto||!contexto.areaId)return 0;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS);
  var last=sheet.getLastRow();if(last<=1)return 0;
  var moradores=saudeNotificacoesV1MapaMoradores_(contexto)||{};
  var rows=sheet.getRange(2,1,last-1,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS.length).getDisplayValues();
  var lock=LockService.getScriptLock(),alterados=0;
  if(!lock.tryLock(10000))return 0;
  try{
    for(var i=0;i<rows.length;i++){
      var vinculo=vinculoFamiliarNotifV1Linha_(rows[i]);
      if(vinculo.areaId!==contexto.areaId||!vinculo.idPortal)continue;
      var bruto=moradores[vinculo.idPortal]||null;
      var atual=bruto?vinculoFamiliarNotifV1Morador_(bruto):null;
      if(!atual||!atual.familiaId||atual.idPortal!==vinculo.idPortal)continue;
      if(atual.familiaId===vinculo.familiaId&&(!atual.nome||atual.nome===vinculo.nome))continue;
      var agora=saudeNotificacoesV1Data_(new Date());
      var values=[
        vinculo.subscriptionId,vinculo.areaId,atual.familiaId,vinculo.idPortal,
        atual.nome||vinculo.nome||'','CADASTRO_REFERENCIA_ATUALIZADO',
        vinculo.vinculadoEm||agora,agora
      ];
      sheet.getRange(i+2,1,1,values.length).setValues([values]);
      rows[i]=values;alterados++;
    }
  }finally{lock.releaseLock();}
  return alterados;
}

function vinculoFamiliarNotifV1Ler_(subscriptionId,areaId){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId))return null;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS);
  var last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(vinculoFamiliarNotifV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
    return vinculoFamiliarNotifV1Linha_(rows[i]);
  }
  return null;
}

function vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,morador,origem){
  if(!morador||!morador.familiaId)return null;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O vínculo familiar deste aparelho está sendo atualizado. Tente novamente.');
  try{
    var last=sheet.getLastRow(),linha=0,existente=null;
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(vinculoFamiliarNotifV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;
        if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
        linha=i+2;existente=vinculoFamiliarNotifV1Linha_(rows[i]);break;
      }
    }
    if(existente&&existente.familiaId&&existente.familiaId!==morador.familiaId)return existente;
    var agora=saudeNotificacoesV1Data_(new Date());
    var vinculadoEm=existente&&existente.vinculadoEm?existente.vinculadoEm:agora;
    var values=[subscriptionId,areaId,morador.familiaId,morador.idPortal||'',morador.nome||'',origem||'DOCUMENTO_VALIDADO',vinculadoEm,agora];
    if(linha)sheet.getRange(linha,1,1,values.length).setValues([values]);
    else sheet.appendRow(values);
    return vinculoFamiliarNotifV1Linha_(values);
  }finally{lock.releaseLock();}
}

function vinculoFamiliarNotifV1Linha_(row){
  return {
    subscriptionId:vinculoFamiliarNotifV1Texto_(row[0]).toLowerCase(),
    areaId:moradoresAdminV1NormalizarAreaId_(row[1]),
    familiaId:vinculoFamiliarNotifV1Texto_(row[2]).toUpperCase(),
    idPortal:vinculoFamiliarNotifV1Texto_(row[3]),
    nome:vinculoFamiliarNotifV1Texto_(row[4]),
    origem:vinculoFamiliarNotifV1Texto_(row[5]),
    vinculadoEm:vinculoFamiliarNotifV1Texto_(row[6]),
    atualizadoEm:vinculoFamiliarNotifV1Texto_(row[7])
  };
}

function vinculoFamiliarNotifV1MapaArea_(areaId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS);
  var mapa={},ambiguos={},last=sheet.getLastRow();if(last<=1)return mapa;
  var rows=sheet.getRange(2,1,last-1,TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.HEADERS.length).getDisplayValues();
  rows.forEach(function(row){
    var vinculo=vinculoFamiliarNotifV1Linha_(row);
    if(vinculo.areaId!==areaId||!vinculo.subscriptionId||!vinculo.familiaId)return;
    var ref=vinculo.subscriptionId.slice(-8);
    if(mapa[ref]&&mapa[ref].subscriptionId!==vinculo.subscriptionId){ambiguos[ref]=true;return;}
    mapa[ref]=vinculo;
  });
  Object.keys(ambiguos).forEach(function(ref){delete mapa[ref];});
  return mapa;
}

function vinculoFamiliarNotifV1SaudeAdmin_(contexto,acesso){
  var resultado=vinculoFamiliarNotifV1SaudeAdminAnterior_(contexto,acesso);
  if(!resultado||!Array.isArray(resultado.aparelhos))return resultado;
  vinculoFamiliarNotifV1ReconciliarArea_(contexto);
  var mapa=vinculoFamiliarNotifV1MapaArea_(contexto.areaId);
  resultado.aparelhos.forEach(function(aparelho){
    var ref=vinculoFamiliarNotifV1Texto_(aparelho.subscriptionRef).toLowerCase();
    var vinculo=mapa[ref]||null;
    if(!vinculo)return;
    aparelho.vinculadoFamilia=true;
    aparelho.familiaId=vinculo.familiaId;
    aparelho.nomeReferencia=vinculo.nome||'';
    aparelho.nome='Família '+vinculo.familiaId+(vinculo.nome?' — '+vinculo.nome:'');
  });
  resultado.vinculoFamiliar=true;
  resultado.vinculoFamiliarVersao=TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.VERSAO;
  return resultado;
}

function vinculoFamiliarNotifV1Texto_(valor){return String(valor==null?'':valor).trim();}
