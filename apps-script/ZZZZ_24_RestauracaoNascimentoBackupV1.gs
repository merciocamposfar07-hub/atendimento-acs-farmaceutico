/**
 * ZZZZ_24_RestauracaoNascimentoBackupV1.gs
 * Portal TACS — restauração segura do backup de DATA_NASCIMENTO.
 *
 * Escopo:
 * - somente JAPARANDUBA;
 * - somente DATA_NASCIMENTO;
 * - só restaura o backup criado por TACS_BACKUP_NASCIMENTO_V1;
 * - exige que a correção +1 dia já tenha sido aplicada;
 * - valida linha, ID Portal, data anterior, data corrigida e estado atual;
 * - bloqueia tudo se houver fórmula ou qualquer divergência;
 * - mantém a trava da correção original e grava trava própria de restauração;
 * - não altera nenhuma outra coluna.
 */
var TACS_RESTAURACAO_NASCIMENTO_V1 = Object.freeze({
  VERSAO: '1.0.0',
  AREA_ID: 'JAPARANDUBA',
  TIMEZONE: 'America/Recife',
  BACKUP_SHEET: 'TACS_BACKUP_NASCIMENTO_V1',
  APPLIED_PROPERTY: 'TACS_FIX_NASCIMENTO_JAPARANDUBA_PLUS1_V1_DONE',
  RESTORED_PROPERTY: 'TACS_FIX_NASCIMENTO_JAPARANDUBA_PLUS1_V1_RESTORED',
  CONFIRMATION: 'RESTAURAR_BACKUP_NASCIMENTO_JAPARANDUBA',
  MAX_SAMPLE: 8,
  HEADERS: Object.freeze(['ABA_FONTE','LINHA_FONTE','ID_PORTAL','DATA_ANTES','DATA_DEPOIS','REGISTRADO_EM'])
});

var restauracaoNascimentoV1DoPostAnterior_;
var restauracaoNascimentoV1PostAnterior_;

(function instalarRestauracaoNascimentoV1_(){
  if(typeof doPost==='function'){
    restauracaoNascimentoV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=restauracaoNascimentoV1TratarPost_(e);
      return resposta||restauracaoNascimentoV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    restauracaoNascimentoV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=restauracaoNascimentoV1TratarPost_(e);
      return resposta||restauracaoNascimentoV1PostAnterior_(e);
    };
  }
})();

function restauracaoNascimentoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=String(p.action||'').trim().toLowerCase();
  if(action!=='admin_nascimento_restaurar_preview'&&action!=='admin_nascimento_restaurar')return null;

  var resultado;
  try{
    if(typeof moradoresAdminV1ValidarSessao_!=='function'||typeof moradoresAdminV1ResolverContexto_!=='function'){
      throw new Error('O módulo de Moradores não está disponível.');
    }
    var sessao=moradoresAdminV1ValidarSessao_(p);
    var contexto=moradoresAdminV1ResolverContexto_(sessao,p.areaId||TACS_RESTAURACAO_NASCIMENTO_V1.AREA_ID);
    restauracaoNascimentoV1ValidarContexto_(contexto);

    if(action==='admin_nascimento_restaurar_preview'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=restauracaoNascimentoV1Preview_(contexto);
    }else{
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_EDITAR');
      resultado=restauracaoNascimentoV1Aplicar_(p,contexto);
    }
  }catch(erro){
    resultado={
      ok:false,
      message:typeof moradoresAdminV1MensagemErro_==='function'
        ?moradoresAdminV1MensagemErro_(erro)
        :String(erro&&erro.message||erro)
    };
  }

  var requestId=String(p.requestId||'').trim();
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)&&typeof moradoresAdminV1GuardarResultado_==='function'){
    moradoresAdminV1GuardarResultado_(requestId,resultado);
  }
  if(typeof moradoresAdminV1ResponderPost_==='function')return moradoresAdminV1ResponderPost_(requestId,resultado);
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

function restauracaoNascimentoV1ValidarContexto_(contexto){
  contexto=contexto&&typeof contexto==='object'?contexto:{};
  var area=String(contexto.areaId||'').trim().toUpperCase();
  var perfil=String(contexto.perfil||'').trim().toUpperCase();
  if(area!==TACS_RESTAURACAO_NASCIMENTO_V1.AREA_ID){
    throw new Error('A restauração foi autorizada somente para Sítio Japaranduba.');
  }
  if(perfil!=='ADMIN_GERAL'&&perfil!=='ADMIN_MUNICIPAL'){
    throw new Error('Somente a administração geral pode restaurar este backup.');
  }
}

function restauracaoNascimentoV1Civil_(valor){
  var texto=String(valor==null?'':valor).trim();
  var m=texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m)return null;
  var dia=Number(m[1]),mes=Number(m[2]),ano=Number(m[3]);
  if(ano<1800||ano>2200||mes<1||mes>12||dia<1||dia>31)return null;
  var stamp=Date.UTC(ano,mes-1,dia,12,0,0),data=new Date(stamp);
  if(data.getUTCFullYear()!==ano||data.getUTCMonth()!==mes-1||data.getUTCDate()!==dia)return null;
  return {ano:ano,mes:mes,dia:dia};
}

function restauracaoNascimentoV1Formatar_(civil){
  return String(civil.dia).padStart(2,'0')+'/'+String(civil.mes).padStart(2,'0')+'/'+String(civil.ano).padStart(4,'0');
}

function restauracaoNascimentoV1SomarUmDia_(civil){
  var stamp=Date.UTC(civil.ano,civil.mes-1,civil.dia,12,0,0)+86400000;
  var data=new Date(stamp);
  return {ano:data.getUTCFullYear(),mes:data.getUTCMonth()+1,dia:data.getUTCDate()};
}

function restauracaoNascimentoV1DataPlanilha_(civil){
  return Utilities.parseDate(
    restauracaoNascimentoV1Formatar_(civil)+' 12:00:00',
    TACS_RESTAURACAO_NASCIMENTO_V1.TIMEZONE,
    'dd/MM/yyyy HH:mm:ss'
  );
}

function restauracaoNascimentoV1Plano_(contexto){
  var props=PropertiesService.getScriptProperties();
  var aplicada=props.getProperty(TACS_RESTAURACAO_NASCIMENTO_V1.APPLIED_PROPERTY)||'';
  var restaurada=props.getProperty(TACS_RESTAURACAO_NASCIMENTO_V1.RESTORED_PROPERTY)||'';
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var backup=fonte.ss.getSheetByName(TACS_RESTAURACAO_NASCIMENTO_V1.BACKUP_SHEET);
  var plano={
    fonte:fonte,
    aplicada:Boolean(aplicada),
    restaurada:Boolean(restaurada),
    registroAplicacao:aplicada,
    registroRestauracao:restaurada,
    backupExiste:Boolean(backup),
    totalBackup:0,
    formulas:[],
    divergencias:[],
    restauracoes:[]
  };

  if(!plano.aplicada||plano.restaurada||!backup||backup.getLastRow()<2)return plano;

  var headers=backup.getRange(1,1,1,TACS_RESTAURACAO_NASCIMENTO_V1.HEADERS.length).getDisplayValues()[0];
  for(var h=0;h<TACS_RESTAURACAO_NASCIMENTO_V1.HEADERS.length;h++){
    if(String(headers[h]||'').trim()!==TACS_RESTAURACAO_NASCIMENTO_V1.HEADERS[h]){
      plano.divergencias.push({linha:1,motivo:'Cabeçalho do backup não corresponde ao formato esperado.'});
      return plano;
    }
  }

  var backupRows=backup.getRange(2,1,backup.getLastRow()-1,TACS_RESTAURACAO_NASCIMENTO_V1.HEADERS.length).getDisplayValues();
  plano.totalBackup=backupRows.length;

  var sheet=fonte.sheet;
  var inicio=fonte.headerRow+2;
  var quantidade=Math.max(0,sheet.getLastRow()-(fonte.headerRow+1));
  if(!quantidade){
    plano.divergencias.push({linha:0,motivo:'A fonte de moradores está vazia.'});
    return plano;
  }

  var nascimentoCol=fonte.map.nascimento;
  var idCol=fonte.map.idPortal;
  var range=sheet.getRange(inicio,1,quantidade,sheet.getLastColumn());
  var display=range.getDisplayValues();
  var formulas=sheet.getRange(inicio,nascimentoCol+1,quantidade,1).getFormulas();
  for(var f=0;f<formulas.length;f++){
    if(String(formulas[f][0]||'').trim())plano.formulas.push({linha:inicio+f});
  }
  if(plano.formulas.length)return plano;

  var vistas={};
  backupRows.forEach(function(row){
    var aba=String(row[0]||'').trim();
    var linha=Number(row[1]||0);
    var idPortal=String(row[2]||'').trim();
    var antes=String(row[3]||'').trim();
    var depois=String(row[4]||'').trim();
    var civilAntes=restauracaoNascimentoV1Civil_(antes);
    var civilDepois=restauracaoNascimentoV1Civil_(depois);
    var indice=linha-inicio;

    if(!linha||Math.floor(linha)!==linha||linha<inicio||linha>=inicio+quantidade){
      plano.divergencias.push({linha:linha||0,motivo:'Linha do backup não pertence mais à fonte atual.'});
      return;
    }
    if(vistas[linha]){
      plano.divergencias.push({linha:linha,motivo:'O backup contém a mesma linha mais de uma vez.'});
      return;
    }
    vistas[linha]=true;
    if(aba!==sheet.getName()){
      plano.divergencias.push({linha:linha,motivo:'A aba de origem do backup não corresponde à fonte atual.'});
      return;
    }
    if(!civilAntes||!civilDepois){
      plano.divergencias.push({linha:linha,motivo:'O backup contém data inválida.'});
      return;
    }
    var esperadoDepois=restauracaoNascimentoV1Formatar_(restauracaoNascimentoV1SomarUmDia_(civilAntes));
    if(esperadoDepois!==restauracaoNascimentoV1Formatar_(civilDepois)){
      plano.divergencias.push({linha:linha,motivo:'O par antes/depois do backup não corresponde a +1 dia.'});
      return;
    }

    var idAtual=String(display[indice][idCol]||'').trim();
    var dataAtual=String(display[indice][nascimentoCol]||'').trim();
    if(idPortal&&idAtual!==idPortal){
      plano.divergencias.push({linha:linha,motivo:'O ID Portal da linha mudou desde o backup.'});
      return;
    }
    if(dataAtual!==depois){
      plano.divergencias.push({linha:linha,motivo:'A data atual não é mais igual à data corrigida registrada no backup.',atual:dataAtual,esperada:depois});
      return;
    }

    plano.restauracoes.push({
      linha:linha,
      idPortal:idPortal,
      nome:String(display[indice][fonte.map.nome]||'').trim(),
      atual:dataAtual,
      restaurar:antes,
      civilAntes:civilAntes
    });
  });
  return plano;
}

function restauracaoNascimentoV1Preview_(contexto){
  var plano=restauracaoNascimentoV1Plano_(contexto);
  var pode=plano.aplicada&&!plano.restaurada&&plano.backupExiste&&plano.totalBackup>0&&plano.formulas.length===0&&plano.divergencias.length===0&&plano.restauracoes.length===plano.totalBackup;
  var mensagem='Prévia da restauração concluída. Nenhum dado foi alterado.';
  if(!plano.aplicada)mensagem='A correção de +1 dia ainda não está marcada como aplicada. Não há o que restaurar.';
  else if(plano.restaurada)mensagem='O backup já foi restaurado anteriormente. Nova restauração está bloqueada.';
  else if(!plano.backupExiste||!plano.totalBackup)mensagem='O backup técnico da correção não foi localizado.';
  else if(plano.formulas.length||plano.divergencias.length)mensagem='A restauração foi bloqueada porque a base atual não corresponde integralmente ao backup.';
  return {
    ok:true,
    versao:TACS_RESTAURACAO_NASCIMENTO_V1.VERSAO,
    areaId:contexto.areaId,
    correcaoAplicada:plano.aplicada,
    jaRestaurada:plano.restaurada,
    backupExiste:plano.backupExiste,
    totalBackup:plano.totalBackup,
    formulas:plano.formulas.length,
    divergencias:plano.divergencias.length,
    podeRestaurar:pode,
    amostra:plano.restauracoes.slice(0,TACS_RESTAURACAO_NASCIMENTO_V1.MAX_SAMPLE).map(function(item){
      return {linha:item.linha,idPortal:item.idPortal,nome:item.nome,atual:item.atual,restaurar:item.restaurar};
    }),
    problemas:plano.divergencias.slice(0,TACS_RESTAURACAO_NASCIMENTO_V1.MAX_SAMPLE),
    message:mensagem
  };
}

function restauracaoNascimentoV1Aplicar_(p,contexto){
  if(String(p.confirmacao||'').trim()!==TACS_RESTAURACAO_NASCIMENTO_V1.CONFIRMATION){
    throw new Error('A confirmação da restauração está ausente.');
  }
  var props=PropertiesService.getScriptProperties();
  var ja=props.getProperty(TACS_RESTAURACAO_NASCIMENTO_V1.RESTORED_PROPERTY);
  if(ja)return {ok:true,jaRestaurada:true,restauradas:0,message:'O backup já foi restaurado anteriormente. Nenhuma data foi alterada novamente.'};

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('A base de moradores está sendo atualizada. Tente novamente depois.');
  try{
    ja=props.getProperty(TACS_RESTAURACAO_NASCIMENTO_V1.RESTORED_PROPERTY);
    if(ja)return {ok:true,jaRestaurada:true,restauradas:0,message:'O backup já foi restaurado anteriormente. Nenhuma data foi alterada novamente.'};

    var plano=restauracaoNascimentoV1Plano_(contexto);
    if(!plano.aplicada)throw new Error('A correção original não está marcada como aplicada. Restauração bloqueada.');
    if(plano.restaurada)return {ok:true,jaRestaurada:true,restauradas:0,message:'O backup já está marcado como restaurado.'};
    if(!plano.backupExiste||!plano.totalBackup)throw new Error('O backup técnico não foi localizado. Nenhuma data foi alterada.');
    if(plano.formulas.length)throw new Error('Há fórmula na coluna DATA_NASCIMENTO. Nenhuma data foi restaurada.');
    if(plano.divergencias.length)throw new Error('Há '+plano.divergencias.length+' divergência(s) entre a base atual e o backup. Nenhuma data foi restaurada.');
    if(plano.restauracoes.length!==plano.totalBackup)throw new Error('O backup não pôde ser validado integralmente. Nenhuma data foi restaurada.');

    var fonte=plano.fonte;
    var inicio=fonte.headerRow+2;
    var quantidade=Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1));
    var nascimentoCol=fonte.map.nascimento+1;
    var coluna=fonte.sheet.getRange(inicio,nascimentoCol,quantidade,1);
    var atuais=coluna.getValues();
    var porLinha={};
    plano.restauracoes.forEach(function(item){porLinha[item.linha]=item.civilAntes;});
    var novos=[];
    for(var i=0;i<quantidade;i++){
      var linha=inicio+i;
      novos.push([porLinha[linha]?restauracaoNascimentoV1DataPlanilha_(porLinha[linha]):atuais[i][0]]);
    }

    coluna.setValues(novos);
    coluna.setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();

    var agora=new Date();
    moradoresAdminV1Auditar_(fonte.ss,{
      moradorId:'LOTE_JAPARANDUBA_NASCIMENTO_V1',
      acao:'RESTAURAR_DATA_NASCIMENTO_BACKUP_V1',
      campos:'RESTAURADAS:'+plano.restauracoes.length+'; BACKUP:'+TACS_RESTAURACAO_NASCIMENTO_V1.BACKUP_SHEET
    },contexto);
    if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);

    var registro={
      versao:TACS_RESTAURACAO_NASCIMENTO_V1.VERSAO,
      areaId:contexto.areaId,
      fonte:fonte.sheet.getName(),
      backup:TACS_RESTAURACAO_NASCIMENTO_V1.BACKUP_SHEET,
      restauradas:plano.restauracoes.length,
      restauradaEm:Utilities.formatDate(agora,TACS_RESTAURACAO_NASCIMENTO_V1.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ss")
    };
    props.setProperty(TACS_RESTAURACAO_NASCIMENTO_V1.RESTORED_PROPERTY,JSON.stringify(registro));

    return {
      ok:true,
      jaRestaurada:false,
      restauradas:plano.restauracoes.length,
      backup:TACS_RESTAURACAO_NASCIMENTO_V1.BACKUP_SHEET,
      areaId:contexto.areaId,
      message:'Backup restaurado: '+plano.restauracoes.length+' data(s) voltaram exatamente ao valor anterior. Nenhuma outra coluna foi alterada.'
    };
  }finally{
    lock.releaseLock();
  }
}
