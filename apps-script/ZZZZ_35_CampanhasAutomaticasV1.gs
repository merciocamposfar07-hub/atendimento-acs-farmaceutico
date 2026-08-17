/**
 * ZZZZ_35_CampanhasAutomaticasV1.gs
 * Portal TACS — calendário anual automático de campanhas V1.0.0
 *
 * Regras:
 * - cria, sem sobrescrever edições, as campanhas oficiais do ano por área;
 * - cada campanha possui início no dia 01 e validade no último dia do mês;
 * - a leitura pública decide a exibição pelo período, sem apagar o registro;
 * - disparo Push usa o módulo territorial já existente e é idempotente;
 * - remoção manual de uma campanha automática gera tombstone para não recriar;
 * - nenhum horário é imposto: o campo continua totalmente editável.
 */
var TACS_CAMPANHAS_AUTOMATICAS_V1=Object.freeze({
  VERSAO:'1.0.0',
  FUSO:'America/Recife',
  ORIGEM:'CALENDARIO_AUTOMATICO',
  AREA_PADRAO:'JAPARANDUBA',
  TOMB_PREFIX:'TACS_CAMP_AUTO_REMOVIDA_V1_',
  COLUNAS:['ANO','MES','VALIDADE','HORARIO','MUNICIPIO_ID','MUNICIPIO_NOME','UF','ORGANIZACAO_ID','ORGANIZACAO_NOME','SUBTITULO','CAMPANHA_CHAVE','COR_TEMA','COR_NOME','ORIGEM','NOTIFICADO_EM']
});

var campanhasAutomaticasV1DoGetAnterior_=typeof doGet==='function'?doGet:null;
doGet=function(e){
  var resposta=campanhasAutomaticasV1TratarGet_(e);
  if(resposta)return resposta;
  return campanhasAutomaticasV1DoGetAnterior_?campanhasAutomaticasV1DoGetAnterior_(e):null;
};

function campanhasAutomaticasV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=campanhasAutomaticasV1Texto_(p.action).toLowerCase();
  if(action==='campanhas_automaticas_status'){
    var agora=campanhasAutomaticasV1Agora_();
    return campanhasAutomaticasV1Responder_({ok:true,versao:TACS_CAMPANHAS_AUTOMATICAS_V1.VERSAO,templates:campanhasAutomaticasV1Catalogo_().length,ano:agora.ano,mes:agora.mes},p.callback);
  }
  if(action==='campanhas_automaticas_executar'){
    try{
      var offset=Math.max(0,parseInt(p.offset,10)||0);
      var limit=Math.min(50,Math.max(1,parseInt(p.limit,10)||25));
      return campanhasAutomaticasV1Responder_(campanhasAutomaticasV1Executar_(offset,limit),p.callback);
    }catch(erro){
      return campanhasAutomaticasV1Responder_({ok:false,message:campanhasAutomaticasV1Erro_(erro)},p.callback);
    }
  }
  return null;
}

function campanhasAutomaticasV1Catalogo_(){
  return [
    {mes:1,chave:'JAN_ROXO',titulo:'Janeiro Roxo',subtitulo:'Combate e prevenção da hanseníase',mensagem:'Informação, prevenção e combate à hanseníase.',tema:'roxo',corNome:'Roxo'},
    {mes:2,chave:'FEV_LARANJA',titulo:'Fevereiro Laranja',subtitulo:'Conscientização e combate à leucemia',mensagem:'Informação e conscientização sobre a leucemia.',tema:'laranja',corNome:'Laranja'},
    {mes:3,chave:'MAR_ROXO',titulo:'Março Roxo',subtitulo:'Conscientização sobre a epilepsia',mensagem:'Informação e conscientização sobre a epilepsia.',tema:'roxo',corNome:'Roxo'},
    {mes:3,chave:'MAR_AZUL_MARINHO',titulo:'Março Azul-Marinho',subtitulo:'Prevenção do câncer colorretal',mensagem:'Conscientização e prevenção do câncer colorretal.',tema:'azul-marinho',corNome:'Azul-marinho'},
    {mes:4,chave:'ABR_VERDE',titulo:'Abril Verde',subtitulo:'Segurança no trabalho',mensagem:'Conscientização e prevenção de acidentes e doenças relacionadas ao trabalho.',tema:'verde',corNome:'Verde'},
    {mes:4,chave:'ABR_AZUL',titulo:'Abril Azul',subtitulo:'Conscientização sobre o autismo',mensagem:'Informação, inclusão e conscientização sobre o autismo.',tema:'azul',corNome:'Azul'},
    {mes:5,chave:'MAI_AMARELO',titulo:'Maio Amarelo',subtitulo:'Prevenção e segurança no trânsito',mensagem:'Conscientização para um trânsito mais seguro.',tema:'amarelo',corNome:'Amarelo'},
    {mes:6,chave:'JUN_VERMELHO',titulo:'Junho Vermelho',subtitulo:'Incentivo à doação de sangue',mensagem:'Conscientização e incentivo à doação de sangue.',tema:'vermelho',corNome:'Vermelho'},
    {mes:7,chave:'JUL_AMARELO',titulo:'Julho Amarelo',subtitulo:'Combate às hepatites virais',mensagem:'Informação, prevenção e combate às hepatites virais.',tema:'amarelo',corNome:'Amarelo'},
    {mes:7,chave:'JUL_VERDE',titulo:'Julho Verde',subtitulo:'Prevenção do câncer de cabeça e pescoço',mensagem:'Conscientização e prevenção do câncer de cabeça e pescoço.',tema:'verde',corNome:'Verde'},
    {mes:8,chave:'AGO_LILAS',titulo:'Agosto Lilás',subtitulo:'Fim da violência contra a mulher',mensagem:'Conscientização, acolhimento e proteção às mulheres.',tema:'lilas',corNome:'Lilás'},
    {mes:8,chave:'AGO_DOURADO',titulo:'Agosto Dourado',subtitulo:'Incentivo ao aleitamento materno',mensagem:'Orientação, apoio e valorização da amamentação.',tema:'dourado',corNome:'Dourado'},
    {mes:9,chave:'SET_AMARELO',titulo:'Setembro Amarelo',subtitulo:'Prevenção ao suicídio',mensagem:'Conscientização, acolhimento e valorização da vida.',tema:'amarelo',corNome:'Amarelo'},
    {mes:9,chave:'SET_VERDE',titulo:'Setembro Verde',subtitulo:'Incentivo à doação de órgãos',mensagem:'Conscientização e incentivo à doação de órgãos.',tema:'verde',corNome:'Verde'},
    {mes:10,chave:'OUT_ROSA',titulo:'Outubro Rosa',subtitulo:'Prevenção e diagnóstico precoce do câncer de mama',mensagem:'Conscientização, prevenção e diagnóstico precoce do câncer de mama.',tema:'rosa',corNome:'Rosa'},
    {mes:11,chave:'NOV_AZUL',titulo:'Novembro Azul',subtitulo:'Saúde do homem e prevenção do câncer de próstata',mensagem:'Conscientização sobre a saúde do homem e prevenção do câncer de próstata.',tema:'azul',corNome:'Azul'},
    {mes:12,chave:'DEZ_VERMELHO',titulo:'Dezembro Vermelho',subtitulo:'Luta contra a AIDS e as ISTs',mensagem:'Informação, prevenção e conscientização sobre HIV, AIDS e outras ISTs.',tema:'vermelho',corNome:'Vermelho'},
    {mes:12,chave:'DEZ_LARANJA',titulo:'Dezembro Laranja',subtitulo:'Prevenção do câncer de pele',mensagem:'Conscientização e prevenção do câncer de pele.',tema:'laranja',corNome:'Laranja'}
  ];
}

function campanhasAutomaticasV1PlanejarAno_(areaId,ano){
  areaId=campanhasAutomaticasV1AreaId_(areaId)||TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO;
  ano=Number(ano);
  if(!ano||ano<2000||ano>2200)throw new Error('Ano inválido para o calendário de campanhas.');
  return campanhasAutomaticasV1Catalogo_().map(function(item){
    var mes=Number(item.mes),ultimo=new Date(Date.UTC(ano,mes,0)).getUTCDate();
    var mm=String(mes).padStart(2,'0');
    return {
      ID:'CAMP_AUTO_'+areaId+'_'+ano+'_'+mm+'_'+item.chave,
      AREA_ID:areaId,
      TITULO:item.titulo,
      SUBTITULO:item.subtitulo,
      MENSAGEM:item.mensagem,
      INICIO:ano+'-'+mm+'-01',
      DIAS:'Todos os dias',
      ATIVO:true,
      ANO:String(ano),
      MES:mm,
      VALIDADE:ano+'-'+mm+'-'+String(ultimo).padStart(2,'0'),
      HORARIO:'',
      CAMPANHA_CHAVE:item.chave,
      COR_TEMA:item.tema,
      COR_NOME:item.corNome,
      ORIGEM:TACS_CAMPANHAS_AUTOMATICAS_V1.ORIGEM,
      NOTIFICADO_EM:''
    };
  });
}

function campanhasAutomaticasV1GarantirAnoAtualArea_(areaId){
  var agora=campanhasAutomaticasV1Agora_();
  return campanhasAutomaticasV1GarantirAnoArea_(areaId,agora.ano);
}

function campanhasAutomaticasV1GarantirAnoArea_(areaId,ano){
  areaId=campanhasAutomaticasV1AreaId_(areaId)||TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO;
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('O calendário de campanhas está sendo atualizado. Tente novamente.');
  try{
    var ss=publicacoesTerritoriaisV1Planilha_();
    var tabela=publicacoesTerritoriaisV1Tabela_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS,'campanha',true);
    campanhasAutomaticasV1GarantirColunas_(tabela.sheet);
    tabela=publicacoesTerritoriaisV1Tabela_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS,'campanha',true);
    var existentes={};
    tabela.rows.forEach(function(row){
      var obj=publicacoesTerritoriaisV1Objeto_(tabela.headers,row.display);
      if(campanhasAutomaticasV1AreaId_(obj.AREA_ID||TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO)!==areaId)return;
      existentes[campanhasAutomaticasV1Texto_(obj.ID)]=true;
    });
    var municipal={};
    try{if(typeof campanhasPeriodoV1ContextoMunicipal_==='function')municipal=campanhasPeriodoV1ContextoMunicipal_(areaId)||{};}catch(erroMunicipal){}
    var criadas=0;
    campanhasAutomaticasV1PlanejarAno_(areaId,ano).forEach(function(registro){
      if(existentes[registro.ID]||campanhasAutomaticasV1FoiRemovida_(registro.ID))return;
      registro.MUNICIPIO_ID=campanhasAutomaticasV1Texto_(municipal.municipioId);
      registro.MUNICIPIO_NOME=campanhasAutomaticasV1Texto_(municipal.municipioNome);
      registro.UF=campanhasAutomaticasV1Texto_(municipal.uf).slice(0,2);
      registro.ORGANIZACAO_ID=campanhasAutomaticasV1Texto_(municipal.organizacaoId);
      registro.ORGANIZACAO_NOME=campanhasAutomaticasV1Texto_(municipal.organizacaoNome);
      var values=tabela.headers.map(function(h){return Object.prototype.hasOwnProperty.call(registro,h)?registro[h]:'';});
      tabela.sheet.getRange(tabela.sheet.getLastRow()+1,1,1,tabela.headers.length).setValues([values]);
      existentes[registro.ID]=true;criadas++;
    });
    if(criadas)SpreadsheetApp.flush();
    return {ok:true,areaId:areaId,ano:Number(ano),criadas:criadas};
  }finally{lock.releaseLock();}
}

function campanhasAutomaticasV1GarantirColunas_(sheet){
  var last=Math.max(1,sheet.getLastColumn());
  var headers=sheet.getRange(1,1,1,last).getDisplayValues()[0].map(function(v){return campanhasAutomaticasV1Normalizar_(v);});
  TACS_CAMPANHAS_AUTOMATICAS_V1.COLUNAS.forEach(function(col){
    if(headers.indexOf(col)!==-1)return;
    last++;sheet.getRange(1,last).setValue(col);headers.push(col);
  });
}

function campanhasAutomaticasV1RegistrarRemocao_(areaId,registro){
  var id=campanhasAutomaticasV1Texto_(registro&&registro.ID);
  var origem=campanhasAutomaticasV1Normalizar_(registro&&registro.ORIGEM);
  if(!/^CAMP_AUTO_/.test(id)&&origem!==TACS_CAMPANHAS_AUTOMATICAS_V1.ORIGEM)return false;
  PropertiesService.getScriptProperties().setProperty(TACS_CAMPANHAS_AUTOMATICAS_V1.TOMB_PREFIX+id,new Date().toISOString());
  return true;
}
function campanhasAutomaticasV1RegistrarRestauracao_(areaId,id){
  id=campanhasAutomaticasV1Texto_(id);
  if(!/^CAMP_AUTO_/.test(id))return false;
  PropertiesService.getScriptProperties().deleteProperty(TACS_CAMPANHAS_AUTOMATICAS_V1.TOMB_PREFIX+id);
  return true;
}
function campanhasAutomaticasV1FoiRemovida_(id){
  try{return Boolean(PropertiesService.getScriptProperties().getProperty(TACS_CAMPANHAS_AUTOMATICAS_V1.TOMB_PREFIX+id));}catch(erro){return false;}
}

function campanhasAutomaticasV1AtivasAgora_(areaId){
  var ss=publicacoesTerritoriaisV1Planilha_();
  var tabela=publicacoesTerritoriaisV1Tabela_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS,'campanha',false);
  if(!tabela)return [];
  var hoje=Utilities.formatDate(new Date(),TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'yyyy-MM-dd');
  return tabela.rows.map(function(r){return publicacoesTerritoriaisV1Objeto_(tabela.headers,r.display);}).filter(function(item){
    var area=campanhasAutomaticasV1AreaId_(item.AREA_ID)||TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO;
    if(area!==areaId)return false;
    if(campanhasAutomaticasV1Normalizar_(item.ORIGEM)!==TACS_CAMPANHAS_AUTOMATICAS_V1.ORIGEM)return false;
    if(!campanhasAutomaticasV1Booleano_(item.ATIVO))return false;
    var inicio=campanhasAutomaticasV1Data_(item.INICIO),validade=campanhasAutomaticasV1Data_(item.VALIDADE);
    return (!inicio||inicio<=hoje)&&(!validade||validade>=hoje);
  });
}

function campanhasAutomaticasV1NotificarArea_(areaId){
  if(typeof notificacoesAreaV1Enviar_!=='function')return {enviadas:0,pendentes:0,erros:1,detalhes:['Módulo de notificações indisponível.']};
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  if(!appId||!apiKey)return {enviadas:0,pendentes:0,erros:1,detalhes:['Credenciais Push não configuradas.']};
  var areaInfo=null;
  try{if(typeof tacsTerritorioV1EncontrarArea_==='function')areaInfo=tacsTerritorioV1EncontrarArea_(areaId);}catch(erroArea){}
  var contexto={areaId:areaId,areaNome:campanhasAutomaticasV1Texto_(areaInfo&&areaInfo.areaNome)||areaId};
  var acesso={perfil:'SISTEMA',operadorId:'SISTEMA_CAMPANHAS'};
  var hoje=Utilities.formatDate(new Date(),TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'yyyyMMdd');
  var resumo={enviadas:0,pendentes:0,erros:0,detalhes:[]};
  campanhasAutomaticasV1AtivasAgora_(areaId).forEach(function(item){
    var id=campanhasAutomaticasV1Texto_(item.ID);
    if(campanhasAutomaticasV1Texto_(item.NOTIFICADO_EM))return;
    try{
      var anterior=typeof notificacoesAreaV1UltimoEnvio_==='function'?notificacoesAreaV1UltimoEnvio_(areaId,'CAMPANHA',id):null;
      if(anterior&&anterior.onesignalId){campanhasAutomaticasV1MarcarNotificada_(areaId,id,'AUDITADO '+anterior.registradoEm);return;}
      var subtitulo=campanhasAutomaticasV1Texto_(item.SUBTITULO),mensagem=campanhasAutomaticasV1Texto_(item.MENSAGEM);
      var resultado=notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,{
        evento:('AUTO_'+id+'_'+hoje).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,160),
        tipo:'CAMPANHA',referencia:id,titulo:campanhasAutomaticasV1Texto_(item.TITULO).slice(0,120),
        mensagem:(subtitulo+(subtitulo&&mensagem?' — ':'')+mensagem).slice(0,1000),
        meta:'origem=CALENDARIO_AUTOMATICO;inicio='+campanhasAutomaticasV1Texto_(item.INICIO)+';validade='+campanhasAutomaticasV1Texto_(item.VALIDADE),
        quantidadeAreas:notificacoesAreaV1QuantidadeAreas_()
      });
      if(resultado&&resultado.ok===true&&resultado.push===true){
        campanhasAutomaticasV1MarcarNotificada_(areaId,id,Utilities.formatDate(new Date(),TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'dd/MM/yyyy HH:mm:ss'));
        resumo.enviadas++;
      }else{
        resumo.pendentes++;
        resumo.detalhes.push(id+': '+campanhasAutomaticasV1Texto_(resultado&&resultado.message||'aguardando novo envio'));
      }
    }catch(erro){resumo.erros++;resumo.detalhes.push(id+': '+campanhasAutomaticasV1Erro_(erro));}
  });
  return resumo;
}

function campanhasAutomaticasV1MarcarNotificada_(areaId,id,valor){
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return false;
  try{
    var ss=publicacoesTerritoriaisV1Planilha_(),tabela=publicacoesTerritoriaisV1Tabela_(ss,TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS,'campanha',false);
    if(!tabela)return false;
    var idx=tabela.headers.indexOf('NOTIFICADO_EM');if(idx<0)return false;
    var linha=publicacoesTerritoriaisV1Encontrar_(tabela,id,areaId);if(!linha)return false;
    tabela.sheet.getRange(linha.row,idx+1).setValue(valor||new Date());SpreadsheetApp.flush();return true;
  }finally{lock.releaseLock();}
}

function campanhasAutomaticasV1Executar_(offset,limit){
  var agora=campanhasAutomaticasV1Agora_(),areas=[];
  try{if(typeof tacsTerritorioV1LerAreas_==='function')areas=tacsTerritorioV1LerAreas_().filter(function(a){return a&&a.ativa!==false;});}catch(erroAreas){}
  if(!areas.length)areas=[{areaId:TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO,areaNome:'Sítio Japaranduba'}];
  var total=areas.length,lote=areas.slice(offset,offset+limit),resultados=[],erros=[];
  lote.forEach(function(area){
    var areaId=campanhasAutomaticasV1AreaId_(area&&area.areaId)||TACS_CAMPANHAS_AUTOMATICAS_V1.AREA_PADRAO;
    try{
      var seed=campanhasAutomaticasV1GarantirAnoArea_(areaId,agora.ano),push=campanhasAutomaticasV1NotificarArea_(areaId);
      resultados.push({areaId:areaId,criadas:seed.criadas,enviadas:push.enviadas,pendentes:push.pendentes,erros:push.erros});
      if(push.erros)erros.push(areaId+': '+push.detalhes.join(' | '));
    }catch(erro){erros.push(areaId+': '+campanhasAutomaticasV1Erro_(erro));}
  });
  var proximo=offset+lote.length<total?offset+lote.length:null;
  return {ok:erros.length===0,versao:TACS_CAMPANHAS_AUTOMATICAS_V1.VERSAO,ano:agora.ano,mes:agora.mes,totalAreas:total,offset:offset,processadas:lote.length,nextOffset:proximo,resultados:resultados,erros:erros};
}

function campanhasAutomaticasV1Agora_(){var agora=new Date();return{ano:Number(Utilities.formatDate(agora,TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'yyyy')),mes:Number(Utilities.formatDate(agora,TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'MM'))};}
function campanhasAutomaticasV1Data_(v){v=campanhasAutomaticasV1Texto_(v);var m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];var b=v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return b?b[3]+'-'+b[2]+'-'+b[1]:'';}
function campanhasAutomaticasV1Booleano_(v){return v===true||v===1||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(campanhasAutomaticasV1Normalizar_(v))!==-1;}
function campanhasAutomaticasV1AreaId_(v){v=campanhasAutomaticasV1Normalizar_(v);return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(v)?v.slice(0,64):'';}
function campanhasAutomaticasV1Texto_(v){return String(v==null?'':v).trim();}
function campanhasAutomaticasV1Normalizar_(v){var s=campanhasAutomaticasV1Texto_(v).toUpperCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s.replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function campanhasAutomaticasV1Erro_(e){return campanhasAutomaticasV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,700);}
function campanhasAutomaticasV1Responder_(dados,callback){var json=JSON.stringify(dados),cb=campanhasAutomaticasV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
