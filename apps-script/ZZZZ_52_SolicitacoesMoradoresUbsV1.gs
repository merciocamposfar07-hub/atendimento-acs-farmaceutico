/**
 * ZZZZ_52_SolicitacoesMoradoresUbsV1.gs
 * Conecta Saúde Comunitária — Solicitações dos moradores para a UBS V1.2.0
 *
 * Fluxo:
 * - o Portal CSC registra a solicitação no mesmo toque que abre o WhatsApp do TACS;
 * - a UBS lê uma fila territorial própria pela Central;
 * - consultas e vagas expiram exatamente na data/hora final do atendimento publicado;
 * - solicitações administrativas sem data de atendimento não recebem prazo arbitrário;
 * - expiração é recalculada em toda leitura/resumo e nunca apaga o histórico.
 */
var TACS_SOLICITACOES_UBS_V1=Object.freeze({
  VERSAO:'1.6.0',
  SHEET:'TACS_SOLICITACOES_MORADORES',
  HEADERS:Object.freeze([
    'ID','AREA_ID','AREA_NOME','UNIDADE_ID','CODIGO_SOLICITACAO','MORADOR_ID',
    'MORADOR_NOME','DOCUMENTO','NASCIMENTO','LOCALIDADE','FAMILIA_ID','CATEGORIA',
    'DESCRICAO','TIPO_VAGA','DATA_SERVICO','HORARIO_EXPIRACAO','EXPIRA_EM','STATUS',
    'CRIADO_EM','ATUALIZADO_EM','ORIGEM','TACS_RESPONSAVEL','UNIDADE_NOME',
    'VISTO_UBS_EM','PUSH_UBS_EM','PUSH_UBS_ID'
  ]),
  PUSH_SHEET:'TACS_SOLICITACOES_UBS_PUSH',
  PUSH_HEADERS:Object.freeze(['SUBSCRIPTION_ID','CADASTRO_ID','UNIDADE_ID','AREA_ID','ATIVO','CRIADO_EM','ATUALIZADO_EM']),
  ONESIGNAL_APP_ID:'e2294b98-c72b-4f8c-a055-de28979676dc',
  ONESIGNAL_ENDPOINT:'https://api.onesignal.com/notifications',
  STATUSES:Object.freeze(['NOVA','EM_ATENDIMENTO','CONCLUIDA','EXPIRADA']),
  RESULT_PREFIX:'tacs_solicitacoes_ubs_v1_',
  RESULT_SECONDS:300,
  FUSO:'America/Recife'
});

var solicitacoesUbsV1DoGetAnterior_;
var solicitacoesUbsV1DoPostAnterior_;

(function instalarSolicitacoesUbsV1_(){
  if(typeof doGet==='function'){
    solicitacoesUbsV1DoGetAnterior_=doGet;
    doGet=function(e){var r=solicitacoesUbsV1TratarGet_(e);return r||solicitacoesUbsV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    solicitacoesUbsV1DoPostAnterior_=doPost;
    doPost=function(e){var r=solicitacoesUbsV1TratarPost_(e);return r||solicitacoesUbsV1DoPostAnterior_(e);};
  }
})();

function solicitacoesUbsV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{},action=solicitacoesUbsV1Texto_(p.action).toLowerCase();
  if(action!=='admin_solicitacoes_ubs_result')return null;
  var requestId=solicitacoesUbsV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return solicitacoesUbsV1ResponderJson_({ok:false,message:'Identificador inválido.'},p.callback);
  var result=solicitacoesUbsV1LerResultado_(requestId);
  return solicitacoesUbsV1ResponderJson_(result?{ok:true,pendente:false,requestId:requestId,result:result}:{ok:true,pendente:true,requestId:requestId},p.callback);
}

function solicitacoesUbsV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=solicitacoesUbsV1Texto_(p.action).toLowerCase();
  var allowed=['publico_solicitacao_ubs_criar','admin_solicitacoes_ubs_listar','admin_solicitacoes_ubs_resumo','admin_solicitacoes_ubs_atualizar','admin_solicitacoes_ubs_vistas','admin_solicitacoes_ubs_push_registrar'];
  if(allowed.indexOf(action)===-1)return null;
  var requestId=solicitacoesUbsV1Texto_(p.requestId),result;
  try{
    requestId=solicitacoesUbsV1ValidarRequestId_(requestId);
    if(action==='publico_solicitacao_ubs_criar'){
      result=solicitacoesUbsV1CriarPublica_(p);
    }else{
      var ctx=solicitacoesUbsV1ContextoAdmin_(p);
      if(action==='admin_solicitacoes_ubs_listar')result=solicitacoesUbsV1Listar_(ctx);
      else if(action==='admin_solicitacoes_ubs_resumo')result=solicitacoesUbsV1Resumo_(ctx);
      else if(action==='admin_solicitacoes_ubs_vistas')result=solicitacoesUbsV1MarcarVistas_(ctx);
      else if(action==='admin_solicitacoes_ubs_push_registrar')result=solicitacoesUbsV1RegistrarPush_(p,ctx);
      else result=solicitacoesUbsV1Atualizar_(p,ctx);
    }
  }catch(err){result={ok:false,message:solicitacoesUbsV1Erro_(err)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))solicitacoesUbsV1GuardarResultado_(requestId,result);
  return solicitacoesUbsV1ResponderPost_(requestId,result);
}

function solicitacoesUbsV1Sheet_(){
  var ss=tacsTerritorioV1Planilha_(),headers=TACS_SOLICITACOES_UBS_V1.HEADERS,s=ss.getSheetByName(TACS_SOLICITACOES_UBS_V1.SHEET);
  if(!s){
    s=ss.insertSheet(TACS_SOLICITACOES_UBS_V1.SHEET);
    s.getRange(1,1,1,headers.length).setValues([headers.slice()]);
    s.setFrozenRows(1);
    s.getRange('A:Z').setWrap(true);
    return s;
  }
  if(s.getLastColumn()<headers.length)s.insertColumnsAfter(Math.max(1,s.getLastColumn()),headers.length-s.getLastColumn());
  var current=s.getRange(1,1,1,headers.length).getDisplayValues()[0],changed=false;
  for(var i=0;i<headers.length;i++){if(current[i]!==headers[i]){changed=true;break;}}
  if(changed)s.getRange(1,1,1,headers.length).setValues([headers.slice()]);
  return s;
}

function solicitacoesUbsV1PushSheet_(){
  var ss=tacsTerritorioV1Planilha_(),headers=TACS_SOLICITACOES_UBS_V1.PUSH_HEADERS,s=ss.getSheetByName(TACS_SOLICITACOES_UBS_V1.PUSH_SHEET);
  if(!s){
    s=ss.insertSheet(TACS_SOLICITACOES_UBS_V1.PUSH_SHEET);
    s.getRange(1,1,1,headers.length).setValues([headers.slice()]);
    s.setFrozenRows(1);s.getRange('A:G').setWrap(true);
    return s;
  }
  if(s.getLastColumn()<headers.length)s.insertColumnsAfter(Math.max(1,s.getLastColumn()),headers.length-s.getLastColumn());
  var current=s.getRange(1,1,1,headers.length).getDisplayValues()[0],changed=false;
  for(var i=0;i<headers.length;i++){if(current[i]!==headers[i]){changed=true;break;}}
  if(changed)s.getRange(1,1,1,headers.length).setValues([headers.slice()]);
  return s;
}
function solicitacoesUbsV1Subscription_(v){
  var s=solicitacoesUbsV1Texto_(v).toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s))throw new Error('Inscrição Push da UBS inválida.');
  return s;
}
function solicitacoesUbsV1RegistrarPush_(p,ctx){
  if(!ctx||!ctx.acesso||solicitacoesUbsV1Texto_(ctx.acesso.perfil).toUpperCase()!=='UBS')throw new Error('Somente uma sessão autenticada da UBS pode registrar este aparelho para avisos.');
  var sub=solicitacoesUbsV1Subscription_(p.subscriptionId),areaId=moradoresAdminV1NormalizarAreaId_(ctx.contexto.areaId);
  var unidadeId=solicitacoesUbsV1Texto_(ctx.contexto.unidadeId||ctx.acesso.unidadeId),cadastroId=solicitacoesUbsV1Texto_(ctx.acesso.cadastroId||ctx.acesso.operadorId||ctx.acesso.tacsId);
  if(!areaId||!unidadeId)throw new Error('A UBS ou a área da sessão não pôde ser identificada.');
  var s=solicitacoesUbsV1PushSheet_(),last=s.getLastRow(),rows=last>1?s.getRange(2,1,last-1,TACS_SOLICITACOES_UBS_V1.PUSH_HEADERS.length).getDisplayValues():[],row=-1,agora=new Date();
  for(var i=rows.length-1;i>=0;i--)if(solicitacoesUbsV1Texto_(rows[i][0]).toLowerCase()===sub&&moradoresAdminV1NormalizarAreaId_(rows[i][3])===areaId){row=i+2;break}
  if(row<2){
    row=s.getLastRow()+1;
    s.getRange(row,1,1,TACS_SOLICITACOES_UBS_V1.PUSH_HEADERS.length).setValues([[sub,cadastroId,unidadeId,areaId,'SIM',agora,agora]]);
  }else{
    var criado=s.getRange(row,6).getValue()||agora;
    s.getRange(row,1,1,TACS_SOLICITACOES_UBS_V1.PUSH_HEADERS.length).setValues([[sub,cadastroId,unidadeId,areaId,'SIM',criado,agora]]);
  }
  s.getRange(row,1).setNumberFormat('@');s.getRange(row,6,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  SpreadsheetApp.flush();
  return {ok:true,registrada:true,areaId:areaId,unidadeId:unidadeId,message:'Este aparelho da UBS está apto a receber novas solicitações mesmo com a Central fechada.'};
}
function solicitacoesUbsV1PushAlvos_(contexto){
  var s=solicitacoesUbsV1PushSheet_(),last=s.getLastRow(),out=[],seen={};
  if(last<=1)return out;
  var rows=s.getRange(2,1,last-1,TACS_SOLICITACOES_UBS_V1.PUSH_HEADERS.length).getDisplayValues(),area=moradoresAdminV1NormalizarAreaId_(contexto.areaId),unidade=solicitacoesUbsV1Texto_(contexto.unidadeId);
  rows.forEach(function(r){
    var sub=solicitacoesUbsV1Texto_(r[0]).toLowerCase(),rowArea=moradoresAdminV1NormalizarAreaId_(r[3]),rowUnidade=solicitacoesUbsV1Texto_(r[2]),ativo=solicitacoesUbsV1Texto_(r[4]).toUpperCase();
    if(ativo!=='SIM'||rowArea!==area||!sub||seen[sub])return;
    if(unidade&&rowUnidade&&rowUnidade!==unidade)return;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sub))return;
    seen[sub]=true;out.push(sub);
  });
  return out;
}
function solicitacoesUbsV1OneSignalKey_(){
  var props=PropertiesService.getScriptProperties(),keys=['TACS_ONESIGNAL_API_KEY','ONESIGNAL_APP_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_API_KEY'];
  for(var i=0;i<keys.length;i++){var v=solicitacoesUbsV1Texto_(props.getProperty(keys[i]));if(v)return v}
  return '';
}
function solicitacoesUbsV1EnviarPush_(contexto,solicitacaoId){
  try{
    var alvos=solicitacoesUbsV1PushAlvos_(contexto),apiKey=solicitacoesUbsV1OneSignalKey_();
    if(!alvos.length||!apiKey)return {ok:true,push:false,destinatarios:alvos.length};
    var url='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/central-administrativa-tacs.html?acesso=ubs&abrir=solicitacoes';
    var payload={
      app_id:TACS_SOLICITACOES_UBS_V1.ONESIGNAL_APP_ID,target_channel:'push',
      headings:{pt:'Nova solicitação de morador',en:'Nova solicitação de morador'},
      contents:{pt:'Há uma nova solicitação para a UBS. Abra Solicitações dos moradores para consultar.',en:'Há uma nova solicitação para a UBS. Abra Solicitações dos moradores para consultar.'},
      include_subscription_ids:alvos,url:url,
      data:{tipo:'SOLICITACAO_UBS',areaId:contexto.areaId,solicitacaoId:solicitacaoId}
    };
    var resp=UrlFetchApp.fetch(TACS_SOLICITACOES_UBS_V1.ONESIGNAL_ENDPOINT,{method:'post',contentType:'application/json',payload:JSON.stringify(payload),headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true});
    var code=Number(resp.getResponseCode()),body={};try{body=JSON.parse(resp.getContentText()||'{}')}catch(e){}
    var destinatarios=(body.recipients===null||typeof body.recipients==='undefined'||body.recipients==='')?null:Number(body.recipients);
    if(code<200||code>=300||!body.id||destinatarios===0)return {ok:false,push:false,destinatarios:destinatarios||0};
    return {ok:true,push:true,id:String(body.id),destinatarios:destinatarios==null?alvos.length:destinatarios};
  }catch(e){return {ok:false,push:false,message:solicitacoesUbsV1Erro_(e)}}
}

function solicitacoesUbsV1ContextoAdmin_(p){
  if(typeof tacsTerritorioV1ValidarAcesso_!=='function'||typeof moradoresAdminV1ResolverContexto_!=='function')throw new Error('A camada territorial ainda não está disponível.');
  var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
  if(acesso&&acesso.perfil==='TACS')throw new Error('Este painel é exclusivo da UBS e da administração.');
  if(acesso&&acesso.perfil==='UBS')return {acesso:acesso,contexto:moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||acesso.areaId||'')};
  tacsTerritorioV1ExigirAdmin_(acesso);
  return {acesso:acesso,contexto:moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||acesso.areaId||'')};
}

function solicitacoesUbsV1Documento_(v){
  var d=String(v==null?'':v).replace(/\D/g,'');
  if(!/^(?:\d{11}|\d{15})$/.test(d))throw new Error('Identificação do morador inválida.');
  return d;
}
function solicitacoesUbsV1Codigo_(v){
  var s=solicitacoesUbsV1Texto_(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,80);
  if(s.length<6)throw new Error('Código da solicitação inválido.');
  return s;
}
function solicitacoesUbsV1Data_(v){
  var s=solicitacoesUbsV1Texto_(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return '';
  var d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
  return d.getUTCFullYear()===Number(m[1])&&d.getUTCMonth()===Number(m[2])-1&&d.getUTCDate()===Number(m[3])?s:'';
}
function solicitacoesUbsV1Hora_(v){
  var m=solicitacoesUbsV1Texto_(v).match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return m?m[1]+':'+m[2]:'';
}
function solicitacoesUbsV1ExpiraEm_(dataServico,hora){
  if(!dataServico)return null;
  var h=hora||'00:00';
  try{return Utilities.parseDate(dataServico+' '+h,TACS_SOLICITACOES_UBS_V1.FUSO,'yyyy-MM-dd HH:mm');}catch(e){return null;}
}
function solicitacoesUbsV1AgendaCard_(descricao){
  var raw=solicitacoesUbsV1Texto_(descricao),data='',horaFinal='',m=raw.match(/(?:Data\s*:\s*)?(\d{2})\/(\d{2})\/(\d{4})/i);
  if(m)data=m[3]+'-'+m[2]+'-'+m[1];
  var re=/\b([01]?\d|2[0-3]):([0-5]\d)\b/g,hit,times=[];
  while((hit=re.exec(raw))){var h=String(Number(hit[1]));if(h.length<2)h='0'+h;times.push(h+':'+hit[2]);}
  if(times.length)horaFinal=times[times.length-1];
  return {data:data,horaFinal:horaFinal};
}
function solicitacoesUbsV1DataValor_(v){
  if(v&&Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,TACS_SOLICITACOES_UBS_V1.FUSO,'yyyy-MM-dd');
  return solicitacoesUbsV1Data_(v);
}
function solicitacoesUbsV1Civil_(descricao,dataValor,horaValor){
  var card=solicitacoesUbsV1AgendaCard_(descricao),data=solicitacoesUbsV1Data_(card.data)||solicitacoesUbsV1DataValor_(dataValor),hora=solicitacoesUbsV1Hora_(card.horaFinal)||solicitacoesUbsV1Hora_(horaValor);
  if(data&&!hora)hora='00:00';
  return {data:data,hora:hora};
}
function solicitacoesUbsV1CivilChave_(data,hora){
  if(!data||!hora)return '';
  return String(data).replace(/-/g,'')+String(hora).replace(':','');
}
function solicitacoesUbsV1AgoraCivilChave_(){
  return Utilities.formatDate(new Date(),TACS_SOLICITACOES_UBS_V1.FUSO,'yyyyMMddHHmm');
}
function solicitacoesUbsV1CivilTexto_(data,hora){
  var m=String(data||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m&&hora?m[3]+'/'+m[2]+'/'+m[1]+' '+hora:'';
}
function solicitacoesUbsV1CivilIso_(data,hora){
  return data&&hora?data+'T'+hora+':00-03:00':'';
}
function solicitacoesUbsV1DataHoraCivil_(v){
  var s=solicitacoesUbsV1Texto_(v),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,T]+(\d{1,2}):(\d{2})/);
  if(!m)return '';
  var d=('0'+Number(m[1])).slice(-2),mo=('0'+Number(m[2])).slice(-2),h=('0'+Number(m[4])).slice(-2);
  if(Number(m[1])<1||Number(m[1])>31||Number(m[2])<1||Number(m[2])>12||Number(m[4])>23||Number(m[5])>59)return '';
  return d+'/'+mo+'/'+m[3]+' '+h+':'+m[5];
}
function solicitacoesUbsV1NascimentoCivil_(v){
  if(!v)return '';
  try{if(typeof moradoresAdminV1DataBr_==='function'){var oficial=moradoresAdminV1DataBr_(v);if(oficial)return oficial}}catch(e){}
  var s=solicitacoesUbsV1Texto_(v),m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m)return ('0'+Number(m[1])).slice(-2)+'/'+('0'+Number(m[2])).slice(-2)+'/'+m[3];
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|$)/);
  if(m)return ('0'+Number(m[3])).slice(-2)+'/'+('0'+Number(m[2])).slice(-2)+'/'+m[1];
  try{var d=Object.prototype.toString.call(v)==='[object Date]'?v:new Date(s);if(d&&!isNaN(d.getTime()))return Utilities.formatDate(d,TACS_SOLICITACOES_UBS_V1.FUSO,'dd/MM/yyyy')}catch(e){}
  return s;
}
function solicitacoesUbsV1NascimentoOficial_(achado){
  var morador=achado&&achado.morador||{},valor='';
  try{
    if(achado&&achado.fonte&&achado.origem&&achado.fonte.map&&Number(achado.fonte.map.nascimento)>=0){
      /* DATA_CIVIL_SEM_FUSO_V1: usa primeiro o texto exibido na célula oficial.
         Nascimento não é instante UTC e jamais pode perder/ganhar um dia por conversão. */
      valor=achado.fonte.sheet.getRange(Number(achado.origem.linha),Number(achado.fonte.map.nascimento)+1).getDisplayValue();
    }
  }catch(e){}
  return solicitacoesUbsV1NascimentoCivil_(valor||morador.nascimento);
}
function solicitacoesUbsV1DocumentoOficial_(achado,documento){
  var morador=achado&&achado.morador||{},informado=String(documento==null?'':documento).replace(/\D/g,''),cpf=String(morador.cpf||'').replace(/\D/g,''),cns=String(morador.cns||'').replace(/\D/g,'');
  if(informado.length===15&&cns===informado)return cns;
  if(informado.length===11&&cpf===informado)return cpf;
  if(informado.length===10&&cpf.length===11&&cpf.charAt(0)==='0'&&cpf.slice(1)===informado)return cpf;
  return informado;
}
function solicitacoesUbsV1CatalogoOficial_(contexto){
  var key='sol_ubs_catalogo_oficial_v1_'+moradoresAdminV1NormalizarAreaId_(contexto&&contexto.areaId),cache=CacheService.getScriptCache(),salvo=null;
  try{salvo=cache.get(key)}catch(e){}
  if(salvo){try{return JSON.parse(salvo)}catch(e){}}
  var out={};
  try{
    var fonte=moradoresAdminV1LocalizarFonte_(contexto),lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
    if(lastRow>fonte.headerRow+1){
      var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol),raw=range.getValues(),display=range.getDisplayValues();
      for(var i=0;i<display.length;i++){
        var m=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
        if(!m||!m.nome)continue;
        var nasc=solicitacoesUbsV1NascimentoCivil_(m.nascimento),cpf=String(m.cpf||'').replace(/\D/g,''),cns=String(m.cns||'').replace(/\D/g,'');
        var item={nascimento:nasc,cpf:cpf,cns:cns};
        if(cpf){out[cpf]=item;if(cpf.length===11&&cpf.charAt(0)==='0')out[cpf.slice(1)]=item}
        if(cns)out[cns]=item;
      }
    }
  }catch(e){}
  try{cache.put(key,JSON.stringify(out),300)}catch(e){}
  return out;
}
function solicitacoesUbsV1DocumentoExibicao_(v){
  var d=String(v==null?'':v).replace(/\D/g,'');
  if(d.length===11)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
  if(d.length===15)return d.slice(0,3)+' '+d.slice(3,7)+' '+d.slice(7,11)+' '+d.slice(11);
  return d;
}
function solicitacoesUbsV1Id_(){
  return 'SOL-'+Utilities.formatDate(new Date(),TACS_SOLICITACOES_UBS_V1.FUSO,'yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
}
function solicitacoesUbsV1Familia_(morador){
  try{return typeof vinculoFamiliarNotifV1CodigoEndereco_==='function'?solicitacoesUbsV1Texto_(vinculoFamiliarNotifV1CodigoEndereco_(morador&&morador.endereco||'')):'';}catch(e){return'';}
}
function solicitacoesUbsV1LocalizarCodigo_(sheet,areaId,codigo){
  if(sheet.getLastRow()<=1)return null;
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_SOLICITACOES_UBS_V1.HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--)if(moradoresAdminV1NormalizarAreaId_(rows[i][1])===areaId&&solicitacoesUbsV1Texto_(rows[i][4]).toUpperCase()===codigo)return {row:i+2,data:rows[i]};
  return null;
}

function solicitacoesUbsV1CriarPublica_(p){
  if(typeof identificacaoFamiliarPublicaV1Contexto_!=='function'||typeof identificacaoFamiliarPublicaV1LocalizarUnico_!=='function')throw new Error('A identificação do morador ainda não está disponível.');
  var contexto=identificacaoFamiliarPublicaV1Contexto_(p.areaId||p.area||''),doc=solicitacoesUbsV1Documento_(p.documento),codigo=solicitacoesUbsV1Codigo_(p.codigoSolicitacao||p.codigo);
  var achado=identificacaoFamiliarPublicaV1LocalizarUnico_(doc,contexto);
  if(!achado||!achado.morador)throw new Error('Cadastro ativo do morador não encontrado.');
  var sheet=solicitacoesUbsV1Sheet_(),existing=solicitacoesUbsV1LocalizarCodigo_(sheet,contexto.areaId,codigo);
  if(existing)return {ok:true,duplicada:true,id:existing.data[0],codigoSolicitacao:codigo,status:existing.data[17],message:'Solicitação já registrada para a UBS.'};
  doc=solicitacoesUbsV1DocumentoOficial_(achado,doc);
  var morador=achado.morador,categoria=solicitacoesUbsV1Texto_(p.categoria).slice(0,220);
  if(!categoria)throw new Error('Serviço solicitado não informado.');
  var descricao=solicitacoesUbsV1Texto_(p.descricao||p.mensagem||categoria).slice(0,1800);
  var tipoVaga=solicitacoesUbsV1Texto_(p.tipoVaga).toUpperCase().replace(/[^A-Z_]/g,'').slice(0,40);
  var civil=solicitacoesUbsV1Civil_(descricao,p.dataServico,p.horarioExpiracao),dataServico=civil.data,horaExp=civil.hora,agora=new Date(),expira=solicitacoesUbsV1ExpiraEm_(dataServico,horaExp);
  var status=solicitacoesUbsV1CivilChave_(dataServico,horaExp)&&solicitacoesUbsV1CivilChave_(dataServico,horaExp)<=solicitacoesUbsV1AgoraCivilChave_()?'EXPIRADA':'NOVA';
  var moradorId=solicitacoesUbsV1Texto_((achado.meta&&achado.meta.moradorId)||morador.idPortal||morador.id||achado.chave);
  var nascimentoOficial=solicitacoesUbsV1NascimentoOficial_(achado);
  var enviadoEm=solicitacoesUbsV1DataHoraCivil_(p.enviadoEm)||Utilities.formatDate(agora,TACS_SOLICITACOES_UBS_V1.FUSO,'dd/MM/yyyy HH:mm');
  var row=[
    solicitacoesUbsV1Id_(),contexto.areaId,contexto.areaNome,contexto.unidadeId||'',codigo,moradorId,
    solicitacoesUbsV1Texto_(morador.nome),doc,nascimentoOficial,
    solicitacoesUbsV1Texto_(morador.endereco||p.localidade),solicitacoesUbsV1Familia_(morador),
    categoria,descricao,tipoVaga,dataServico,horaExp,expira||'',status,enviadoEm,agora,
    solicitacoesUbsV1Texto_(p.origem||'PORTAL_CSC_WHATSAPP').slice(0,80),
    solicitacoesUbsV1Texto_(p.tacsResponsavel).slice(0,180),solicitacoesUbsV1Texto_(p.unidadeNome||contexto.unidadeId).slice(0,180),
    '','',''
  ];
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('A fila da UBS está recebendo outra solicitação. Tente novamente.');
  var novaLinha=0;
  try{
    existing=solicitacoesUbsV1LocalizarCodigo_(sheet,contexto.areaId,codigo);
    if(existing)return {ok:true,duplicada:true,id:existing.data[0],codigoSolicitacao:codigo,status:existing.data[17],message:'Solicitação já registrada para a UBS.'};
    novaLinha=sheet.getLastRow()+1;
    sheet.getRange(novaLinha,1,1,row.length).setValues([row]);
    sheet.getRange(novaLinha,8).setNumberFormat('@');
    sheet.getRange(novaLinha,17).setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange(novaLinha,19).setNumberFormat('@');
    sheet.getRange(novaLinha,20).setNumberFormat('dd/MM/yyyy HH:mm');
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
  var push=solicitacoesUbsV1EnviarPush_(contexto,row[0]);
  if(push&&push.push===true&&novaLinha>1){
    try{sheet.getRange(novaLinha,25).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');sheet.getRange(novaLinha,26).setValue(push.id||'').setNumberFormat('@');SpreadsheetApp.flush()}catch(e){}
  }
  return {ok:true,id:row[0],codigoSolicitacao:codigo,status:status,expiraEm:solicitacoesUbsV1CivilTexto_(dataServico,horaExp),pushUbs:Boolean(push&&push.push),message:status==='EXPIRADA'?'Solicitação registrada como expirada.':'Solicitação registrada e encaminhada à fila da UBS.'};
}

function solicitacoesUbsV1Expirar_(sheet){
  if(!sheet||sheet.getLastRow()<=1)return 0;
  var n=sheet.getLastRow()-1,range=sheet.getRange(2,18,n,3),values=range.getValues(),nowCivil=solicitacoesUbsV1AgoraCivilChave_(),changed=0;
  var agendaRange=sheet.getRange(2,13,n,5),agendaValues=agendaRange.getValues(),agendaChanged=false;
  for(var i=0;i<n;i++){
    var st=solicitacoesUbsV1Texto_(values[i][0]).toUpperCase(),civil=solicitacoesUbsV1Civil_(agendaValues[i][0],agendaValues[i][2],agendaValues[i][3]);
    var data=civil.data,hora=civil.hora,exp=solicitacoesUbsV1ExpiraEm_(data,hora),expKey=solicitacoesUbsV1CivilChave_(data,hora);
    /* EXPIRACAO_CIVIL_CARD_V6:
       data e horário escritos no card são a fonte de verdade. A comparação ocorre
       em horário civil de America/Recife, sem conversão UTC. 08:00–11:30 => 11:30. */
    if(data&&hora){
      var atualData=solicitacoesUbsV1DataValor_(agendaValues[i][2]),atualHora=solicitacoesUbsV1Hora_(agendaValues[i][3]),atualExp=agendaValues[i][4];
      var expMudou=!(atualExp&&Object.prototype.toString.call(atualExp)==='[object Date]'&&!isNaN(atualExp.getTime())&&exp&&atualExp.getTime()===exp.getTime());
      if(atualData!==data||atualHora!==hora||expMudou){agendaValues[i][2]=data;agendaValues[i][3]=hora;agendaValues[i][4]=exp||'';agendaChanged=true;}
    }
    if((st==='NOVA'||st==='EM_ATENDIMENTO')&&expKey&&expKey<=nowCivil){
      values[i][0]='EXPIRADA';values[i][2]=new Date();changed++;
    }
  }
  if(agendaChanged)agendaRange.setValues(agendaValues);
  if(changed)range.setValues(values);
  return changed;
}
function solicitacoesUbsV1Rows_(sheet){return sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,TACS_SOLICITACOES_UBS_V1.HEADERS.length).getValues():[]}
function solicitacoesUbsV1StatusTexto_(s){return {NOVA:'Nova',EM_ATENDIMENTO:'Em atendimento',CONCLUIDA:'Concluída',EXPIRADA:'Solicitação Expirada!'}[s]||s}
function solicitacoesUbsV1FormatDate_(v){if(!v)return'';var civil=solicitacoesUbsV1DataHoraCivil_(v);if(civil)return civil;try{return Utilities.formatDate(new Date(v),TACS_SOLICITACOES_UBS_V1.FUSO,'dd/MM/yyyy HH:mm');}catch(e){return solicitacoesUbsV1Texto_(v);}}
function solicitacoesUbsV1Iso_(v){if(!v)return'';try{return Utilities.formatDate(new Date(v),TACS_SOLICITACOES_UBS_V1.FUSO,"yyyy-MM-dd'T'HH:mm:ss");}catch(e){return'';}}
function solicitacoesUbsV1MaskDoc_(v){var d=String(v==null?'':v).replace(/\D/g,'');return d.length>=4?'••••'+d.slice(-4):''}
function solicitacoesUbsV1Item_(r){
  var st=solicitacoesUbsV1Texto_(r[17]).toUpperCase(),descricao=solicitacoesUbsV1Texto_(r[12]),civil=solicitacoesUbsV1Civil_(descricao,r[14],r[15]);
  var expiraTexto=solicitacoesUbsV1CivilTexto_(civil.data,civil.hora),expiraIso=solicitacoesUbsV1CivilIso_(civil.data,civil.hora);
  return {
    id:solicitacoesUbsV1Texto_(r[0]),areaNome:solicitacoesUbsV1Texto_(r[2]),unidadeId:solicitacoesUbsV1Texto_(r[3]),codigoSolicitacao:solicitacoesUbsV1Texto_(r[4]),moradorId:solicitacoesUbsV1Texto_(r[5]),
    morador:solicitacoesUbsV1Texto_(r[6]),documento:solicitacoesUbsV1Texto_(r[7]),documentoFormatado:solicitacoesUbsV1DocumentoExibicao_(r[7]),nascimento:solicitacoesUbsV1NascimentoCivil_(r[8]),
    localidade:solicitacoesUbsV1Texto_(r[9]),familiaId:solicitacoesUbsV1Texto_(r[10]),categoria:solicitacoesUbsV1Texto_(r[11]),
    descricao:descricao,tipoVaga:solicitacoesUbsV1Texto_(r[13]),dataServico:civil.data,
    horarioExpiracao:civil.hora,expiraEm:expiraIso,expiraEmTexto:expiraTexto,
    status:st,statusTexto:solicitacoesUbsV1StatusTexto_(st),criadoEm:solicitacoesUbsV1FormatDate_(r[18]),atualizadoEm:solicitacoesUbsV1FormatDate_(r[19]),
    tacsResponsavel:solicitacoesUbsV1Texto_(r[21]),unidadeNome:solicitacoesUbsV1Texto_(r[22]),
    vistoUbsEm:solicitacoesUbsV1FormatDate_(r[23]),pushUbsEm:solicitacoesUbsV1FormatDate_(r[24]),pushUbsId:solicitacoesUbsV1Texto_(r[25])
  };
}
function solicitacoesUbsV1DadosArea_(contexto){
  var sheet=solicitacoesUbsV1Sheet_();solicitacoesUbsV1Expirar_(sheet);
  var rows=solicitacoesUbsV1Rows_(sheet),catalogo=solicitacoesUbsV1CatalogoOficial_(contexto),items=[],counts={NOVA:0,EM_ATENDIMENTO:0,CONCLUIDA:0,EXPIRADA:0},latest=null,latestUnread=null,unread=0,patches=[];
  for(var i=rows.length-1;i>=0;i--){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==contexto.areaId)continue;
    var docRaw=String(rows[i][7]==null?'':rows[i][7]).replace(/\D/g,''),oficial=catalogo[docRaw]||null;
    if(oficial){
      var docOficial=docRaw;
      if(docRaw.length===10&&oficial.cpf&&oficial.cpf.length===11&&oficial.cpf.charAt(0)==='0'&&oficial.cpf.slice(1)===docRaw)docOficial=oficial.cpf;
      else if(docRaw.length===11&&oficial.cpf)docOficial=oficial.cpf;
      else if(docRaw.length===15&&oficial.cns)docOficial=oficial.cns;
      var nascAtual=solicitacoesUbsV1NascimentoCivil_(rows[i][8]),nascOficial=solicitacoesUbsV1NascimentoCivil_(oficial.nascimento);
      if((docOficial&&docOficial!==docRaw)||(nascOficial&&nascOficial!==nascAtual)){
        if(docOficial)rows[i][7]=docOficial;
        if(nascOficial)rows[i][8]=nascOficial;
        patches.push({row:i+2,documento:docOficial||docRaw,nascimento:nascOficial||nascAtual});
      }
    }
    var item=solicitacoesUbsV1Item_(rows[i]);
    if(Object.prototype.hasOwnProperty.call(counts,item.status))counts[item.status]++;
    if(item.status==='NOVA'&&!item.vistoUbsEm){unread++;if(!latestUnread)latestUnread=item}
    if(!latest)latest=item;
    if(items.length<160)items.push(item);
  }
  patches.forEach(function(p){try{sheet.getRange(p.row,8,1,2).setValues([[p.documento,p.nascimento]]);sheet.getRange(p.row,8,1,2).setNumberFormats([['@','@']])}catch(e){}});
  if(patches.length)try{SpreadsheetApp.flush()}catch(e){}
  return {sheet:sheet,items:items,counts:counts,latest:latest,latestUnread:latestUnread,unread:unread};
}
function solicitacoesUbsV1Listar_(ctx){
  var d=solicitacoesUbsV1DadosArea_(ctx.contexto);
  return {ok:true,versao:TACS_SOLICITACOES_UBS_V1.VERSAO,areaId:ctx.contexto.areaId,areaNome:ctx.contexto.areaNome,unidadeId:ctx.contexto.unidadeId||'',contagens:d.counts,total:d.items.length,naoVistas:d.unread,solicitacoes:d.items,latestKey:d.latest?d.latest.id:'',latest:d.latest,latestNaoVistaKey:d.latestUnread?d.latestUnread.id:'',latestNaoVista:d.latestUnread,podeAtualizar:true};
}
function solicitacoesUbsV1Resumo_(ctx){
  var d=solicitacoesUbsV1DadosArea_(ctx.contexto);
  return {ok:true,areaId:ctx.contexto.areaId,areaNome:ctx.contexto.areaNome,contagens:d.counts,total:d.counts.NOVA+d.counts.EM_ATENDIMENTO+d.counts.CONCLUIDA+d.counts.EXPIRADA,pendentes:d.counts.NOVA+d.counts.EM_ATENDIMENTO,naoVistas:d.unread,latestKey:d.latest?d.latest.id:'',latest:d.latest,latestNaoVistaKey:d.latestUnread?d.latestUnread.id:'',latestNaoVista:d.latestUnread};
}
function solicitacoesUbsV1MarcarVistas_(ctx){
  var sheet=solicitacoesUbsV1Sheet_();solicitacoesUbsV1Expirar_(sheet);
  var rows=solicitacoesUbsV1Rows_(sheet),agora=new Date(),vistas=0;
  for(var i=0;i<rows.length;i++){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==ctx.contexto.areaId)continue;
    var st=solicitacoesUbsV1Texto_(rows[i][17]).toUpperCase(),visto=rows[i][23];
    if(st!=='NOVA'||visto)continue;
    sheet.getRange(i+2,24).setValue(agora).setNumberFormat('dd/MM/yyyy HH:mm:ss');vistas++;
  }
  if(vistas)SpreadsheetApp.flush();
  return {ok:true,vistas:vistas,naoVistas:0,message:'Solicitações visualizadas pela UBS.'};
}
function solicitacoesUbsV1Atualizar_(p,ctx){
  var id=solicitacoesUbsV1Texto_(p.id).toUpperCase(),novo=solicitacoesUbsV1Texto_(p.status).toUpperCase();
  if(!/^SOL-[A-Z0-9-]{8,80}$/.test(id))throw new Error('Solicitação inválida.');
  if(['EM_ATENDIMENTO','CONCLUIDA'].indexOf(novo)===-1)throw new Error('Situação inválida.');
  var sheet=solicitacoesUbsV1Sheet_();solicitacoesUbsV1Expirar_(sheet);
  var rows=solicitacoesUbsV1Rows_(sheet),row=-1,current='';
  for(var i=rows.length-1;i>=0;i--)if(solicitacoesUbsV1Texto_(rows[i][0]).toUpperCase()===id&&moradoresAdminV1NormalizarAreaId_(rows[i][1])===ctx.contexto.areaId){row=i+2;current=solicitacoesUbsV1Texto_(rows[i][17]).toUpperCase();break}
  if(row<2)throw new Error('Solicitação não encontrada nesta área.');
  if(current==='EXPIRADA')throw new Error('Solicitação Expirada! Não é possível reabrir uma solicitação vencida.');
  if(current==='CONCLUIDA'&&novo!=='CONCLUIDA')throw new Error('A solicitação já foi concluída.');
  sheet.getRange(row,18).setValue(novo);sheet.getRange(row,20).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');SpreadsheetApp.flush();
  return {ok:true,id:id,status:novo,statusTexto:solicitacoesUbsV1StatusTexto_(novo),message:novo==='CONCLUIDA'?'Solicitação concluída.':'Solicitação marcada como em atendimento.'};
}
function solicitacoesUbsV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_SOLICITACOES_UBS_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_SOLICITACOES_UBS_V1.RESULT_SECONDS);}catch(e){}}
function solicitacoesUbsV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_SOLICITACOES_UBS_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function solicitacoesUbsV1ResponderJson_(obj,callback){var json=JSON.stringify(obj),cb=solicitacoesUbsV1Texto_(callback);if(cb&&/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function solicitacoesUbsV1ResponderPost_(requestId,result){var payload={source:'solicitacoes-ubs-v1',requestId:requestId,result:result},json=JSON.stringify(payload).replace(/</g,'\\u003c');var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var p='+json+';try{parent.postMessage(p,"*");}catch(e){}}());<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function solicitacoesUbsV1ValidarRequestId_(v){v=solicitacoesUbsV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da requisição inválido.');return v}
function solicitacoesUbsV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function solicitacoesUbsV1Erro_(e){return solicitacoesUbsV1Texto_(e&&e.message?e.message:e||'Não foi possível processar a solicitação.').slice(0,500)}
