/**
 * ZZZZ_20_PublicacoesTerritoriaisV1.gs
 * Portal TACS — recados e campanhas isolados por área V1.0.0
 *
 * Não substitui as rotas legadas globais. O painel multiárea usa ações próprias,
 * com autenticação territorial e AREA_ID gravado em cada publicação nova/edita.
 * Registros legados sem AREA_ID permanecem pertencendo a JAPARANDUBA.
 */
var TACS_PUBLICACOES_TERRITORIAIS_V1=Object.freeze({
  VERSAO:'1.0.0',
  AREA_PADRAO:'JAPARANDUBA',
  ABA_RECADOS:'RECADOS_PORTAL',
  ABA_CAMPANHAS:'CAMPANHAS_PORTAL',
  AUDIT_SHEET:'TACS_AUDIT_PUBLICACOES',
  PERMISSAO:'PUBLICACOES_GERENCIAR',
  RESULT_PREFIX:'tacs_publicacoes_v1_result_',
  RESULT_SECONDS:300
});

var publicacoesTerritoriaisV1DoGetAnterior_;
var publicacoesTerritoriaisV1DoPostAnterior_;
(function instalarPublicacoesTerritoriaisV1_(){
  if(typeof doGet==='function'){
    publicacoesTerritoriaisV1DoGetAnterior_=doGet;
    doGet=function(e){var r=publicacoesTerritoriaisV1TratarGet_(e);return r||publicacoesTerritoriaisV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    publicacoesTerritoriaisV1DoPostAnterior_=doPost;
    doPost=function(e){var r=publicacoesTerritoriaisV1TratarPost_(e);return r||publicacoesTerritoriaisV1DoPostAnterior_(e);};
  }
})();

function publicacoesTerritoriaisV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=publicacoesTerritoriaisV1Texto_(p.action).toLowerCase();
  if(action==='publicacoes_territoriais_status'){
    return publicacoesTerritoriaisV1ResponderJson_({ok:true,versao:TACS_PUBLICACOES_TERRITORIAIS_V1.VERSAO,isolamento:'AREA_ID'},p.callback);
  }
  if(action!=='admin_publicacoes_result')return null;
  try{
    var id=publicacoesTerritoriaisV1RequestId_(p.requestId);
    var resultado=publicacoesTerritoriaisV1LerResultado_(id);
    return publicacoesTerritoriaisV1ResponderJson_({ok:true,pendente:!resultado,requestId:id,result:resultado||null},p.callback);
  }catch(erro){
    return publicacoesTerritoriaisV1ResponderJson_({ok:false,message:publicacoesTerritoriaisV1Erro_(erro)},p.callback);
  }
}

function publicacoesTerritoriaisV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=publicacoesTerritoriaisV1Texto_(p.action).toLowerCase();
  var aceitas=['admin_publicacoes_dados','admin_publicacoes_salvar_recado','admin_publicacoes_salvar_campanha','admin_publicacoes_remover_recado','admin_publicacoes_remover_campanha'];
  if(aceitas.indexOf(action)===-1)return null;
  var requestId=publicacoesTerritoriaisV1Texto_(p.requestId),resultado;
  try{
    requestId=publicacoesTerritoriaisV1RequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    publicacoesTerritoriaisV1ExigirPermissao_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    if(action==='admin_publicacoes_dados')resultado=publicacoesTerritoriaisV1Dados_(contexto,acesso);
    else if(action==='admin_publicacoes_salvar_recado')resultado=publicacoesTerritoriaisV1Salvar_(contexto,acesso,'recado',p);
    else if(action==='admin_publicacoes_salvar_campanha')resultado=publicacoesTerritoriaisV1Salvar_(contexto,acesso,'campanha',p);
    else if(action==='admin_publicacoes_remover_recado')resultado=publicacoesTerritoriaisV1Remover_(contexto,acesso,'recado',p.id);
    else resultado=publicacoesTerritoriaisV1Remover_(contexto,acesso,'campanha',p.id);
  }catch(erro){resultado={ok:false,message:publicacoesTerritoriaisV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))publicacoesTerritoriaisV1GuardarResultado_(requestId,resultado);
  return publicacoesTerritoriaisV1ResponderPost_(requestId,resultado);
}

function publicacoesTerritoriaisV1ExigirPermissao_(acesso){
  if(!acesso)throw new Error('Acesso inválido.');
  if(acesso.perfil==='TACS'){
    if((acesso.permissoes||[]).indexOf(TACS_PUBLICACOES_TERRITORIAIS_V1.PERMISSAO)===-1){
      throw new Error('Seu cadastro não possui permissão para publicar recados e campanhas.');
    }
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);
  return true;
}

function publicacoesTerritoriaisV1Dados_(contexto,acesso){
  var ss=publicacoesTerritoriaisV1Planilha_();
  var recados=publicacoesTerritoriaisV1Ler_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_RECADOS,contexto.areaId);
  var campanhas=publicacoesTerritoriaisV1Ler_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS,contexto.areaId);
  var admin=acesso.perfil!=='TACS';
  var areas=[];
  if(admin){
    if(typeof tacsTerritorioV1LerAreas_==='function')areas=tacsTerritorioV1LerAreas_().filter(function(a){return a&&a.ativa===true;}).map(function(a){return{areaId:a.areaId,areaNome:a.areaNome||a.areaId};});
    if(!areas.length)areas=[{areaId:contexto.areaId,areaNome:contexto.areaNome||contexto.areaId}];
  }else{
    areas=[{areaId:contexto.areaId,areaNome:contexto.areaNome||contexto.areaId}];
  }
  var manutencao={ativa:false};
  if(typeof portalManutencaoV1StatusPublico_==='function')manutencao=portalManutencaoV1StatusPublico_(contexto.areaId);
  return {ok:true,versao:TACS_PUBLICACOES_TERRITORIAIS_V1.VERSAO,perfil:acesso.perfil,podeAdministrar:admin,areaId:contexto.areaId,areaNome:contexto.areaNome||contexto.areaId,areas:areas,recados:recados,campanhas:campanhas,manutencao:manutencao};
}

function publicacoesTerritoriaisV1Salvar_(contexto,acesso,tipo,p){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outra publicação está sendo atualizada. Tente novamente.');
  try{
    var ss=publicacoesTerritoriaisV1Planilha_();
    var nomeAba=tipo==='recado'?TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_RECADOS:TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS;
    var tabela=publicacoesTerritoriaisV1Tabela_(ss,nomeAba,tipo,true);
    var id=publicacoesTerritoriaisV1Id_(p.id);
    var linha=id?publicacoesTerritoriaisV1Encontrar_(tabela,id,contexto.areaId):null;
    if(id&&!linha)throw new Error('A publicação informada não foi encontrada nesta área. Atualize o painel.');
    if(!id)id=(tipo==='recado'?'RECADO_':'CAMPANHA_')+contexto.areaId+'_'+Date.now();
    var anterior=linha?publicacoesTerritoriaisV1Objeto_(tabela.headers,linha.values):null;
    var titulo=publicacoesTerritoriaisV1Texto_(p.titulo).slice(0,220);
    var mensagem=publicacoesTerritoriaisV1Texto_(p.mensagem).slice(0,5000);
    if(!titulo||!mensagem)throw new Error('Título e mensagem são obrigatórios.');
    var registro={ID:id,AREA_ID:contexto.areaId,TITULO:titulo,MENSAGEM:mensagem,ATIVO:publicacoesTerritoriaisV1Booleano_(p.ativo)};
    if(tipo==='recado'){
      registro.PRIORIDADE=publicacoesTerritoriaisV1Prioridade_(p.prioridade);
      registro.VALIDADE=publicacoesTerritoriaisV1Data_(p.validade);
    }else{
      registro.INICIO=publicacoesTerritoriaisV1Data_(p.inicio);
      registro.DIAS=publicacoesTerritoriaisV1Texto_(p.dias).slice(0,300);
    }
    var values=tabela.headers.map(function(h){if(Object.prototype.hasOwnProperty.call(registro,h))return registro[h];if(anterior&&Object.prototype.hasOwnProperty.call(anterior,h))return anterior[h];return '';});
    var row=linha?linha.row:tabela.sheet.getLastRow()+1;
    tabela.sheet.getRange(row,1,1,tabela.headers.length).setValues([values]);
    SpreadsheetApp.flush();
    var depois=publicacoesTerritoriaisV1Objeto_(tabela.headers,values);
    publicacoesTerritoriaisV1Auditar_(ss,'SALVAR_'+tipo.toUpperCase(),contexto,acesso,anterior,depois);
    return {ok:true,id:id,areaId:contexto.areaId,criado:!linha,message:tipo==='recado'?'Recado salvo na área.':'Campanha salva na área.'};
  }finally{lock.releaseLock();}
}

function publicacoesTerritoriaisV1Remover_(contexto,acesso,tipo,id){
  id=publicacoesTerritoriaisV1Id_(id);
  if(!id)throw new Error('Identificador da publicação ausente.');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outra publicação está sendo atualizada. Tente novamente.');
  try{
    var ss=publicacoesTerritoriaisV1Planilha_();
    var nomeAba=tipo==='recado'?TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_RECADOS:TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS;
    var tabela=publicacoesTerritoriaisV1Tabela_(ss,nomeAba,tipo,false);
    if(!tabela)throw new Error('A publicação não foi encontrada nesta área.');
    var linha=publicacoesTerritoriaisV1Encontrar_(tabela,id,contexto.areaId);
    if(!linha)throw new Error('A publicação não foi encontrada nesta área.');
    var anterior=publicacoesTerritoriaisV1Objeto_(tabela.headers,linha.values);
    tabela.sheet.deleteRow(linha.row);
    SpreadsheetApp.flush();
    publicacoesTerritoriaisV1Auditar_(ss,'REMOVER_'+tipo.toUpperCase(),contexto,acesso,anterior,null);
    return {ok:true,id:id,areaId:contexto.areaId,message:tipo==='recado'?'Recado removido da área.':'Campanha removida da área.'};
  }finally{lock.releaseLock();}
}

function publicacoesTerritoriaisV1Ler_(ss,nomeAba,areaId){
  var tabela=publicacoesTerritoriaisV1Tabela_(ss,nomeAba,nomeAba===TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_RECADOS?'recado':'campanha',false);
  if(!tabela)return [];
  return tabela.rows.map(function(r){return publicacoesTerritoriaisV1Objeto_(tabela.headers,r.values);}).filter(function(item){return publicacoesTerritoriaisV1AreaRegistro_(item)===areaId;});
}

function publicacoesTerritoriaisV1Tabela_(ss,nomeAba,tipo,criar){
  var sheet=ss.getSheetByName(nomeAba);
  if(!sheet&&!criar)return null;
  var base=tipo==='recado'?['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO']:['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO'];
  if(!sheet){sheet=ss.insertSheet(nomeAba);sheet.getRange(1,1,1,base.length+1).setValues([base.concat(['AREA_ID'])]);sheet.setFrozenRows(1);}
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,base.length+1).setValues([base.concat(['AREA_ID'])]);sheet.setFrozenRows(1);}
  var lastCol=Math.max(1,sheet.getLastColumn());
  var headers=sheet.getRange(1,1,1,lastCol).getDisplayValues()[0].map(publicacoesTerritoriaisV1Normalizar_);
  base.forEach(function(h){if(headers.indexOf(h)===-1)throw new Error('A aba '+nomeAba+' não possui a coluna obrigatória '+h+'.');});
  if(headers.indexOf('AREA_ID')===-1){sheet.getRange(1,lastCol+1).setValue('AREA_ID');headers.push('AREA_ID');lastCol++;}
  var raw=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,lastCol).getValues():[];
  var display=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,lastCol).getDisplayValues():[];
  return {sheet:sheet,headers:headers,rows:raw.map(function(values,i){return{row:i+2,values:values,display:display[i]};})};
}

function publicacoesTerritoriaisV1Encontrar_(tabela,id,areaId){
  for(var i=0;i<tabela.rows.length;i++){
    var obj=publicacoesTerritoriaisV1Objeto_(tabela.headers,tabela.rows[i].display);
    if(publicacoesTerritoriaisV1Id_(obj.ID)===id&&publicacoesTerritoriaisV1AreaRegistro_(obj)===areaId)return tabela.rows[i];
  }
  return null;
}
function publicacoesTerritoriaisV1AreaRegistro_(obj){return publicacoesTerritoriaisV1AreaId_(obj&&obj.AREA_ID)||TACS_PUBLICACOES_TERRITORIAIS_V1.AREA_PADRAO;}
function publicacoesTerritoriaisV1Objeto_(headers,values){var out={};headers.forEach(function(h,i){if(h)out[h]=values[i]==null?'':values[i];});return out;}

function publicacoesTerritoriaisV1Auditar_(ss,tipo,contexto,acesso,antes,depois){
  var headers=['EVENTO_ID','TIPO','AREA_ID','REFERENCIA_ID','OPERADOR_ID','ANTES_JSON','DEPOIS_JSON','REGISTRADO_EM'];
  var sheet=ss.getSheetByName(TACS_PUBLICACOES_TERRITORIAIS_V1.AUDIT_SHEET);
  if(!sheet){sheet=ss.insertSheet(TACS_PUBLICACOES_TERRITORIAIS_V1.AUDIT_SHEET);sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);}
  var current=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  for(var i=0;i<headers.length;i++)if(publicacoesTerritoriaisV1Texto_(current[i])!==headers[i])throw new Error('A auditoria de publicações existe com estrutura diferente.');
  var referencia=publicacoesTerritoriaisV1Texto_((depois&&depois.ID)||(antes&&antes.ID));
  sheet.appendRow(['PUB-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),tipo,contexto.areaId,referencia,acesso.operadorId||('TACS:'+publicacoesTerritoriaisV1Texto_(acesso.tacsId)),JSON.stringify(antes||{}).slice(0,45000),JSON.stringify(depois||{}).slice(0,45000),new Date()]);
  sheet.getRange(sheet.getLastRow(),8).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function publicacoesTerritoriaisV1Planilha_(){if(typeof tacsTerritorioV1Planilha_==='function')return tacsTerritorioV1Planilha_();if(typeof adminTacsV1Planilha_==='function')return adminTacsV1Planilha_();if(typeof getPlanilha==='function')return getPlanilha();var ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('A planilha administrativa não está disponível.');return ss;}
function publicacoesTerritoriaisV1Prioridade_(v){v=publicacoesTerritoriaisV1Normalizar_(v);return ['INFORMATIVO','IMPORTANTE','URGENTE'].indexOf(v)!==-1?v:'INFORMATIVO';}
function publicacoesTerritoriaisV1Data_(v){v=publicacoesTerritoriaisV1Texto_(v);if(!v)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;throw new Error('Data inválida.');}
function publicacoesTerritoriaisV1Booleano_(v){return v===true||v===1||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(publicacoesTerritoriaisV1Normalizar_(v))!==-1;}
function publicacoesTerritoriaisV1AreaId_(v){v=publicacoesTerritoriaisV1Normalizar_(v);return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(v)?v.slice(0,64):'';}
function publicacoesTerritoriaisV1Id_(v){return publicacoesTerritoriaisV1Texto_(v).replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,180);}
function publicacoesTerritoriaisV1Texto_(v){return String(v==null?'':v).trim();}
function publicacoesTerritoriaisV1Normalizar_(v){var s=publicacoesTerritoriaisV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function publicacoesTerritoriaisV1RequestId_(v){v=publicacoesTerritoriaisV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da operação inválido.');return v;}
function publicacoesTerritoriaisV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_PUBLICACOES_TERRITORIAIS_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_PUBLICACOES_TERRITORIAIS_V1.RESULT_SECONDS);}catch(e){}}
function publicacoesTerritoriaisV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_PUBLICACOES_TERRITORIAIS_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function publicacoesTerritoriaisV1ResponderPost_(id,r){var m={source:'admin-publicacoes-territoriais-v1',requestId:id,result:r};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(m).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function publicacoesTerritoriaisV1ResponderJson_(r,cb){var json=JSON.stringify(r),c=publicacoesTerritoriaisV1Texto_(cb);if(c&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(c))return ContentService.createTextOutput(c+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function publicacoesTerritoriaisV1Erro_(e){return publicacoesTerritoriaisV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,700);}
