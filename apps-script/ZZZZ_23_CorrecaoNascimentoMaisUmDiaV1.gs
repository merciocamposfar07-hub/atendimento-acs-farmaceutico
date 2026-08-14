/**
 * ZZZZ_23_CorrecaoNascimentoMaisUmDiaV1.gs
 * Portal TACS — correção única de DATA_NASCIMENTO em Japaranduba.
 *
 * Escopo deliberadamente restrito:
 * - somente a área JAPARANDUBA;
 * - somente a coluna DATA_NASCIMENTO;
 * - soma exatamente 1 dia civil, sem conversão por UTC/fuso no valor exibido;
 * - cria backup antes de escrever;
 * - bloqueia execução se houver data inválida, fórmula na coluna ou backup pendente;
 * - grava uma trava permanente após sucesso para impedir execução dupla;
 * - não altera IDADE nem qualquer outra coluna;
 * - não altera agendas, odontologia, profissionais, recados, campanhas ou push.
 */
var TACS_CORRECAO_NASCIMENTO_V1 = Object.freeze({
  VERSAO: '1.0.0',
  AREA_ID: 'JAPARANDUBA',
  TIMEZONE: 'America/Recife',
  DONE_PROPERTY: 'TACS_FIX_NASCIMENTO_JAPARANDUBA_PLUS1_V1_DONE',
  BACKUP_SHEET: 'TACS_BACKUP_NASCIMENTO_V1',
  CONFIRMATION: 'CORRIGIR_UM_DIA_JAPARANDUBA',
  MAX_SAMPLE: 8
});

var correcaoNascimentoV1DoPostAnterior_;
var correcaoNascimentoV1PostAnterior_;

(function instalarCorrecaoNascimentoV1_(){
  if(typeof doPost==='function'){
    correcaoNascimentoV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=correcaoNascimentoV1TratarPost_(e);
      return resposta||correcaoNascimentoV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    correcaoNascimentoV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=correcaoNascimentoV1TratarPost_(e);
      return resposta||correcaoNascimentoV1PostAnterior_(e);
    };
  }
})();

function correcaoNascimentoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=String(p.action||'').trim().toLowerCase();
  if(action!=='admin_nascimento_preview'&&action!=='admin_nascimento_corrigir')return null;

  var resultado;
  try{
    if(typeof moradoresAdminV1ValidarSessao_!=='function'||typeof moradoresAdminV1ResolverContexto_!=='function'){
      throw new Error('O módulo de Moradores não está disponível.');
    }
    var sessao=moradoresAdminV1ValidarSessao_(p);
    var contexto=moradoresAdminV1ResolverContexto_(sessao,p.areaId||TACS_CORRECAO_NASCIMENTO_V1.AREA_ID);
    correcaoNascimentoV1ValidarContexto_(contexto);

    if(action==='admin_nascimento_preview'){
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_LER');
      resultado=correcaoNascimentoV1Preview_(contexto);
    }else{
      moradoresAdminV1ExigirPermissao_(contexto,'MORADORES_EDITAR');
      resultado=correcaoNascimentoV1Aplicar_(p,contexto);
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

function correcaoNascimentoV1ValidarContexto_(contexto){
  contexto=contexto&&typeof contexto==='object'?contexto:{};
  var area=String(contexto.areaId||'').trim().toUpperCase();
  var perfil=String(contexto.perfil||'').trim().toUpperCase();
  if(area!==TACS_CORRECAO_NASCIMENTO_V1.AREA_ID){
    throw new Error('Esta correção foi autorizada somente para Sítio Japaranduba.');
  }
  if(perfil!=='ADMIN_GERAL'&&perfil!=='ADMIN_MUNICIPAL'){
    throw new Error('Somente a administração geral pode executar esta correção em lote.');
  }
}

function correcaoNascimentoV1Civil_(valor){
  var texto=String(valor==null?'':valor).trim();
  var m=texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  var dia,mes,ano;
  if(m){
    dia=Number(m[1]);mes=Number(m[2]);ano=Number(m[3]);
  }else{
    m=texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!m)return null;
    ano=Number(m[1]);mes=Number(m[2]);dia=Number(m[3]);
  }
  if(ano<1800||ano>2200||mes<1||mes>12||dia<1||dia>31)return null;
  var stamp=Date.UTC(ano,mes-1,dia,12,0,0);
  var data=new Date(stamp);
  if(data.getUTCFullYear()!==ano||data.getUTCMonth()!==mes-1||data.getUTCDate()!==dia)return null;
  return {ano:ano,mes:mes,dia:dia};
}

function correcaoNascimentoV1SomarUmDia_(civil){
  var stamp=Date.UTC(civil.ano,civil.mes-1,civil.dia,12,0,0)+86400000;
  var data=new Date(stamp);
  return {ano:data.getUTCFullYear(),mes:data.getUTCMonth()+1,dia:data.getUTCDate()};
}

function correcaoNascimentoV1Formatar_(civil){
  return String(civil.dia).padStart(2,'0')+'/'+String(civil.mes).padStart(2,'0')+'/'+String(civil.ano).padStart(4,'0');
}

function correcaoNascimentoV1DataPlanilha_(civil){
  var texto=correcaoNascimentoV1Formatar_(civil)+' 12:00:00';
  return Utilities.parseDate(texto,TACS_CORRECAO_NASCIMENTO_V1.TIMEZONE,'dd/MM/yyyy HH:mm:ss');
}

function correcaoNascimentoV1Plano_(contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var sheet=fonte.sheet;
  var inicio=fonte.headerRow+2;
  var quantidade=Math.max(0,sheet.getLastRow()-(fonte.headerRow+1));
  var concluida=PropertiesService.getScriptProperties().getProperty(TACS_CORRECAO_NASCIMENTO_V1.DONE_PROPERTY)||'';
  var plano={
    fonte:fonte,
    inicio:inicio,
    quantidade:quantidade,
    validas:0,
    vazias:0,
    invalidas:[],
    formulas:[],
    alteracoes:[],
    jaAplicada:Boolean(concluida),
    registroAplicacao:concluida
  };
  if(!quantidade)return plano;

  var lastCol=sheet.getLastColumn();
  var range=sheet.getRange(inicio,1,quantidade,lastCol);
  var display=range.getDisplayValues();
  var nascimentoCol=fonte.map.nascimento;
  var idCol=fonte.map.idPortal;
  var nomeCol=fonte.map.nome;
  var formulas=sheet.getRange(inicio,nascimentoCol+1,quantidade,1).getFormulas();

  for(var i=0;i<quantidade;i++){
    var linha=inicio+i;
    var exibida=String(display[i][nascimentoCol]||'').trim();
    var formula=String(formulas[i][0]||'').trim();
    if(formula){
      plano.formulas.push({linha:linha});
      continue;
    }
    if(!exibida){
      plano.vazias++;
      continue;
    }
    var civil=correcaoNascimentoV1Civil_(exibida);
    if(!civil){
      plano.invalidas.push({linha:linha,valor:exibida});
      continue;
    }
    var corrigida=correcaoNascimentoV1SomarUmDia_(civil);
    plano.validas++;
    plano.alteracoes.push({
      linha:linha,
      idPortal:String(display[i][idCol]||'').trim(),
      nome:String(display[i][nomeCol]||'').trim(),
      antes:correcaoNascimentoV1Formatar_(civil),
      depois:correcaoNascimentoV1Formatar_(corrigida),
      civilDepois:corrigida
    });
  }
  return plano;
}

function correcaoNascimentoV1Preview_(contexto){
  var plano=correcaoNascimentoV1Plano_(contexto);
  return {
    ok:true,
    versao:TACS_CORRECAO_NASCIMENTO_V1.VERSAO,
    areaId:contexto.areaId,
    totalLinhas:plano.quantidade,
    datasValidas:plano.validas,
    datasVazias:plano.vazias,
    datasInvalidas:plano.invalidas.length,
    formulas:plano.formulas.length,
    jaAplicada:plano.jaAplicada,
    podeAplicar:!plano.jaAplicada&&plano.validas>0&&plano.invalidas.length===0&&plano.formulas.length===0,
    amostra:plano.alteracoes.slice(0,TACS_CORRECAO_NASCIMENTO_V1.MAX_SAMPLE).map(function(item){
      return {linha:item.linha,idPortal:item.idPortal,nome:item.nome,antes:item.antes,depois:item.depois};
    }),
    invalidas:plano.invalidas.slice(0,TACS_CORRECAO_NASCIMENTO_V1.MAX_SAMPLE),
    message:plano.jaAplicada
      ?'A correção de +1 dia já foi aplicada e está bloqueada contra nova execução.'
      :'Prévia concluída. Nenhum dado foi alterado.'
  };
}

function correcaoNascimentoV1GarantirBackup_(fonte,alteracoes){
  var ss=fonte.ss;
  var sheet=ss.getSheetByName(TACS_CORRECAO_NASCIMENTO_V1.BACKUP_SHEET);
  if(sheet&&sheet.getLastRow()>1){
    throw new Error('Existe um backup anterior sem marca de conclusão. A correção foi bloqueada para impedir soma dupla.');
  }
  if(!sheet)sheet=ss.insertSheet(TACS_CORRECAO_NASCIMENTO_V1.BACKUP_SHEET);
  var headers=['ABA_FONTE','LINHA_FONTE','ID_PORTAL','DATA_ANTES','DATA_DEPOIS','REGISTRADO_EM'];
  if(sheet.getLastRow()===0)sheet.getRange(1,1,1,headers.length).setValues([headers]);
  var agora=new Date();
  var linhas=alteracoes.map(function(item){
    return [fonte.sheet.getName(),item.linha,item.idPortal,item.antes,item.depois,agora];
  });
  if(linhas.length){
    sheet.getRange(2,1,linhas.length,headers.length).setValues(linhas);
    sheet.getRange(2,6,linhas.length,1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  sheet.setFrozenRows(1);
  return sheet.getName();
}

function correcaoNascimentoV1Aplicar_(p,contexto){
  if(String(p.confirmacao||'').trim()!==TACS_CORRECAO_NASCIMENTO_V1.CONFIRMATION){
    throw new Error('A confirmação da correção em lote está ausente.');
  }
  var props=PropertiesService.getScriptProperties();
  var ja=props.getProperty(TACS_CORRECAO_NASCIMENTO_V1.DONE_PROPERTY);
  if(ja){
    return {ok:true,jaAplicada:true,alteradas:0,message:'A correção já foi aplicada anteriormente. Nenhuma data foi alterada novamente.'};
  }

  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('A base de moradores está sendo atualizada. Tente novamente depois.');
  try{
    ja=props.getProperty(TACS_CORRECAO_NASCIMENTO_V1.DONE_PROPERTY);
    if(ja){
      return {ok:true,jaAplicada:true,alteradas:0,message:'A correção já foi aplicada anteriormente. Nenhuma data foi alterada novamente.'};
    }

    var plano=correcaoNascimentoV1Plano_(contexto);
    if(plano.jaAplicada)return {ok:true,jaAplicada:true,alteradas:0,message:'A correção já está marcada como concluída.'};
    if(plano.formulas.length){
      throw new Error('Há fórmula na coluna DATA_NASCIMENTO. Nenhuma data foi alterada.');
    }
    if(plano.invalidas.length){
      throw new Error('Há '+plano.invalidas.length+' data(s) de nascimento inválida(s). Nenhuma data foi alterada.');
    }
    if(!plano.alteracoes.length)throw new Error('Não há datas válidas para corrigir.');

    var backup=correcaoNascimentoV1GarantirBackup_(plano.fonte,plano.alteracoes);
    var nascimentoCol=plano.fonte.map.nascimento+1;
    var coluna=plano.fonte.sheet.getRange(plano.inicio,nascimentoCol,plano.quantidade,1);
    var display=coluna.getDisplayValues();
    var novos=[];
    var porLinha={};
    plano.alteracoes.forEach(function(item){porLinha[item.linha]=item.civilDepois;});

    for(var i=0;i<plano.quantidade;i++){
      var linha=plano.inicio+i;
      var exibida=String(display[i][0]||'').trim();
      if(!exibida){novos.push(['']);continue;}
      var civilDepois=porLinha[linha];
      if(!civilDepois)throw new Error('A prévia mudou durante a correção. Operação interrompida.');
      novos.push([correcaoNascimentoV1DataPlanilha_(civilDepois)]);
    }

    coluna.setValues(novos);
    coluna.setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();

    var agora=new Date();
    moradoresAdminV1Auditar_(plano.fonte.ss,{
      moradorId:'LOTE_JAPARANDUBA_NASCIMENTO_V1',
      acao:'CORRIGIR_DATA_NASCIMENTO_MAIS_UM_DIA',
      campos:'ALTERADAS:'+plano.alteracoes.length+'; VAZIAS:'+plano.vazias+'; BACKUP:'+backup
    },contexto);
    if(typeof moradoresAdminV1InvalidarResumo_==='function')moradoresAdminV1InvalidarResumo_(contexto);

    var registro={
      versao:TACS_CORRECAO_NASCIMENTO_V1.VERSAO,
      areaId:contexto.areaId,
      fonte:plano.fonte.sheet.getName(),
      backup:backup,
      alteradas:plano.alteracoes.length,
      vazias:plano.vazias,
      concluidaEm:Utilities.formatDate(agora,TACS_CORRECAO_NASCIMENTO_V1.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ss")
    };
    props.setProperty(TACS_CORRECAO_NASCIMENTO_V1.DONE_PROPERTY,JSON.stringify(registro));

    return {
      ok:true,
      jaAplicada:false,
      alteradas:plano.alteracoes.length,
      vazias:plano.vazias,
      backup:backup,
      areaId:contexto.areaId,
      message:'Correção concluída: '+plano.alteracoes.length+' data(s) de nascimento receberam +1 dia. Nenhuma outra coluna foi alterada.'
    };
  }finally{
    lock.releaseLock();
  }
}
