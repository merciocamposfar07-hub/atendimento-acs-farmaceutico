from pathlib import Path
import re

ROOT=Path('.')
backend_path=ROOT/'apps-script/ZZZZ_22_SaudeNotificacoesV1.gs'
panel_path=ROOT/'teste-v1/painel-recados-campanhas-v1.html'
test_path=ROOT/'scripts/test_notification_health_registry.js'

backend=backend_path.read_text(encoding='utf-8')
if "VERSAO:'1.0.0'" not in backend:
    raise SystemExit('Versão base inesperada do módulo de saúde.')
backend=backend.replace("VERSAO:'1.0.0'","VERSAO:'1.0.1'",1)

start=backend.index('function saudeNotificacoesV1SaudeAdmin_(')
end=backend.index('function saudeNotificacoesV1SolicitarReparoArea_',start)
new_admin=r'''function saudeNotificacoesV1SaudeAdmin_(contexto,acesso){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var reparo=saudeNotificacoesV1UltimoReparoArea_(contexto.areaId);
  var moradores=saudeNotificacoesV1MapaMoradores_(contexto);
  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  var registros=saudeNotificacoesV1RegistrosArea_(sheet,contexto.areaId),porSubscription={};
  registros.forEach(function(reg){porSubscription[String(reg.subscriptionId||'').toLowerCase()]=reg;});
  var quantidadeAreas=(typeof notificacoesAreaV1QuantidadeAreas_==='function')?notificacoesAreaV1QuantidadeAreas_():1;
  var audiencia=[],oneSignalConsultado=false,erroOneSignal='';
  if(apiKey){
    try{
      audiencia=saudeNotificacoesV1ExportarAudienciaOneSignal_(appId,apiKey,contexto.areaId,quantidadeAreas);
      oneSignalConsultado=true;
    }catch(erroExport){erroOneSignal=saudeNotificacoesV1Erro_(erroExport);}
  }else{
    erroOneSignal='A chave privada do OneSignal não está configurada para consultar a audiência.';
  }

  var contagens={ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0};
  var aparelhos=[],vistos={};
  function contar(status){
    contagens.total++;
    if(status==='ATIVO')contagens.ativos++;
    else if(status==='INATIVO')contagens.inativos++;
    else if(status==='REPARO')contagens.reparo++;
    else contagens.semConfirmacao++;
  }
  audiencia.forEach(function(remoto){
    var id=String(remoto.subscriptionId||'').toLowerCase();if(!id)return;
    vistos[id]=true;
    var reg=porSubscription[id]||null;
    var morador=reg&&moradores[reg.idPortal]?moradores[reg.idPortal]:null;
    var pending=Boolean(reparo&&reparo.reparoId&&(!reg||reparo.reparoId!==reg.reparoAplicado));
    var status=pending?'REPARO':(remoto.ativo?'ATIVO':'INATIVO');
    contar(status);
    var vinculado=Boolean(reg&&morador);
    var nome=vinculado?(moradoresAdminV1Texto_(morador.nome)||'Morador identificado'):(remoto.ativo?'Aparelho ativo ainda não identificado':'Aparelho ainda não identificado');
    var telefone=vinculado?moradoresAdminV1Texto_(morador.celular||morador.telefoneContato):'';
    var motivo='';
    if(pending)motivo='Existe uma atualização de avisos pendente para este aparelho.';
    else if(remoto.ativo)motivo=vinculado?'Inscrição ativa no OneSignal e vinculada ao cadastro do morador.':'Inscrição ativa no OneSignal. O aparelho ainda não foi associado ao cadastro de um morador.';
    else motivo=vinculado?'O OneSignal informa que esta inscrição não está apta a receber Push.':'Inscrição encontrada no OneSignal, mas atualmente inativa.';
    aparelhos.push({
      nome:nome,telefone:telefone,dispositivo:remoto.dispositivo,navegador:remoto.navegador,sistema:remoto.sistema,
      status:status,statusTexto:status==='ATIVO'?'Ativo':status==='INATIVO'?'Inativo':status==='REPARO'?'Reparo solicitado':'Sem confirmação',
      motivo:motivo,ultimoCheckin:remoto.ultimaAtividade||'',subscriptionRef:id.slice(-8),reparoPendente:pending,vinculado:vinculado
    });
  });

  // Mantém registros locais que, por qualquer razão, não vieram na exportação.
  // Isso evita esconder um vínculo já conhecido caso a audiência remota esteja
  // temporariamente incompleta; eles nunca são promovidos a "Apto" sem prova.
  registros.forEach(function(reg){
    var id=String(reg.subscriptionId||'').toLowerCase();if(!id||vistos[id])return;
    var morador=moradores[reg.idPortal]||{nome:'Morador não localizado',celular:'',telefoneContato:''};
    var pending=Boolean(reparo&&reparo.reparoId&&reparo.reparoId!==reg.reparoAplicado);
    var remoto=null,onesignalId=reg.onesignalId;
    if(apiKey&&!oneSignalConsultado){
      try{
        if(!onesignalId)onesignalId=saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,reg.subscriptionId);
        if(onesignalId)remoto=saudeNotificacoesV1EncontrarSubscription_(saudeNotificacoesV1ViewUser_(appId,apiKey,onesignalId),reg.subscriptionId);
      }catch(erroRemoto){remoto=null;}
    }
    var classificacao=saudeNotificacoesV1Classificar_(reg,remoto,pending);
    if(oneSignalConsultado&&!remoto&&!pending)classificacao={status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'O vínculo local existe, mas esta Subscription ID não apareceu na audiência exportada pelo OneSignal.'};
    contar(classificacao.status);
    aparelhos.push({
      nome:moradoresAdminV1Texto_(morador.nome)||'Morador não localizado',telefone:moradoresAdminV1Texto_(morador.celular||morador.telefoneContato),
      dispositivo:reg.tipoAparelho||'Aparelho',navegador:reg.navegador||'',sistema:reg.sistema||'',
      status:classificacao.status,statusTexto:classificacao.texto,motivo:classificacao.motivo,
      ultimoCheckin:reg.ultimoCheckin,subscriptionRef:id.slice(-8),reparoPendente:pending,vinculado:true
    });
  });

  aparelhos.sort(function(a,b){return String(b.ultimoCheckin||'').localeCompare(String(a.ultimoCheckin||''));});
  var limitado=aparelhos.length>TACS_SAUDE_NOTIFICACOES_V1.MAX_DEVICES;
  if(limitado)aparelhos=aparelhos.slice(0,TACS_SAUDE_NOTIFICACOES_V1.MAX_DEVICES);
  return {
    ok:true,versao:TACS_SAUDE_NOTIFICACOES_V1.VERSAO,areaId:contexto.areaId,areaNome:contexto.areaNome,
    contagens:contagens,aparelhos:aparelhos,oneSignalConsultado:oneSignalConsultado,oneSignalErro:erroOneSignal,
    audienciaOneSignal:audiencia.length,reparoArea:reparo||null,limitado:limitado,
    observacao:'Aptos e inativos são calculados a partir da audiência real do OneSignal. O estado técnico não comprova a entrega física de cada notificação.'
  };
}

'''
backend=backend[:start]+new_admin+backend[end:]

insert=backend.index('function saudeNotificacoesV1IdentidadePorSubscription_')
helpers=r'''function saudeNotificacoesV1RegistrosArea_(sheet,areaId){
  var registros=[],last=sheet.getLastRow();
  if(last>1){
    sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==areaId)return;
      registros.push(saudeNotificacoesV1RegistroDaLinha_(row));
    });
  }
  return registros;
}

function saudeNotificacoesV1ExportarAudienciaOneSignal_(appId,apiKey,areaId,quantidadeAreas){
  var endpoint=TACS_SAUDE_NOTIFICACOES_V1.ONESIGNAL_BASE+'/players/csv_export?app_id='+encodeURIComponent(appId);
  var resposta=UrlFetchApp.fetch(endpoint,{
    method:'post',contentType:'application/json',
    payload:JSON.stringify({extra_fields:['onesignal_id','notification_types']}),
    headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
  });
  var code=Number(resposta.getResponseCode()),data={};
  try{data=JSON.parse(resposta.getContentText()||'{}');}catch(erroJson){}
  if(code<200||code>=300||!data.csv_file_url)throw new Error('O OneSignal não liberou a exportação das inscrições (HTTP '+code+').');
  var csv='';
  for(var tentativa=0;tentativa<7;tentativa++){
    var arquivo=UrlFetchApp.fetch(String(data.csv_file_url),{method:'get',muteHttpExceptions:true});
    var arquivoCode=Number(arquivo.getResponseCode());
    if(arquivoCode===200){
      var blob=arquivo.getBlob();
      try{csv=Utilities.ungzip(blob).getDataAsString('UTF-8');}catch(erroGzip){csv=blob.getDataAsString('UTF-8');}
      if(csv)break;
    }else if(arquivoCode!==404){
      throw new Error('A exportação das inscrições do OneSignal não pôde ser baixada (HTTP '+arquivoCode+').');
    }
    if(tentativa<6)Utilities.sleep(700);
  }
  if(!csv)throw new Error('A audiência do OneSignal ainda não ficou pronta para consulta. Tente Atualizar situação novamente.');
  var rows=Utilities.parseCsv(csv);if(!rows.length)return [];
  var header={},cab=rows[0];
  for(var h=0;h<cab.length;h++)header[String(cab[h]||'').replace(/^\uFEFF/,'').trim().toLowerCase()]=h;
  function campo(row,nome){var idx=header[nome];return typeof idx==='number'?String(row[idx]==null?'':row[idx]).trim():'';}
  var saida=[];
  for(var i=1;i<rows.length;i++){
    var row=rows[i],subscriptionId=campo(row,'id').toLowerCase();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId))continue;
    var deviceType=Number(campo(row,'device_type'));
    if([0,1,2,5,7,17].indexOf(deviceType)===-1)continue;
    var tags={};try{tags=JSON.parse(campo(row,'tags')||'{}')||{};}catch(erroTags){tags={};}
    if(!saudeNotificacoesV1PertenceAreaExport_(tags,areaId,quantidadeAreas))continue;
    var invalid=campo(row,'invalid_identifier'),nt=campo(row,'notification_types');
    saida.push({
      subscriptionId:subscriptionId,ativo:saudeNotificacoesV1AssinaturaAtivaExport_(invalid,nt),
      dispositivo:saudeNotificacoesV1DispositivoExport_(deviceType),
      navegador:deviceType===5?'Chrome/Web':(deviceType===7||deviceType===17)?'Safari/Web':'Push',
      sistema:campo(row,'device_os')||'',ultimaAtividade:saudeNotificacoesV1DataUnix_(campo(row,'last_active')),
      onesignalId:campo(row,'onesignal_id')
    });
  }
  return saida;
}

function saudeNotificacoesV1PertenceAreaExport_(tags,areaId,quantidadeAreas){
  tags=tags&&typeof tags==='object'?tags:{};
  var area=moradoresAdminV1NormalizarAreaId_(areaId||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_AREA_ID);
  var tag=saudeNotificacoesV1Texto_(tags.area_tacs).toUpperCase();
  if(tag)return tag===area;
  return area===TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_AREA_ID&&Number(quantidadeAreas||1)<=1;
}

function saudeNotificacoesV1AssinaturaAtivaExport_(invalidIdentifier,notificationTypes){
  var invalid=saudeNotificacoesV1Texto_(invalidIdentifier).toLowerCase();
  if(['t','true','1','sim','yes'].indexOf(invalid)!==-1)return false;
  var nt=Number(notificationTypes);return Number.isFinite(nt)&&nt>0;
}

function saudeNotificacoesV1DispositivoExport_(tipo){
  tipo=Number(tipo);
  if(tipo===0)return 'iPhone/iPad';
  if(tipo===1)return 'Android';
  if(tipo===2)return 'FireOS';
  if(tipo===5)return 'Android/Chrome ou navegador Chromium';
  if(tipo===7||tipo===17)return 'iPhone/iPad — Safari';
  return 'Aparelho Push';
}

function saudeNotificacoesV1DataUnix_(valor){
  var n=Number(valor);if(!Number.isFinite(n)||n<=0)return '';
  return saudeNotificacoesV1Data_(new Date(n*1000));
}

'''
backend=backend[:insert]+helpers+backend[insert:]
backend_path.write_text(backend,encoding='utf-8')

panel=panel_path.read_text(encoding='utf-8')
panel=panel.replace('Mostra os aparelhos que já se identificaram no Portal e o estado técnico da inscrição Push.','Mostra as inscrições Push encontradas no OneSignal e, quando identificado, o morador vinculado.',1)
old="if(!aparelhos.length){lista.innerHTML='<div class=\"saude-vazio\">Nenhum aparelho foi associado a um morador nesta versão ainda. O morador precisa abrir o Portal TACS, identificar-se e manter os avisos configurados ao menos uma vez.</div>';status('saudeNotificacoesStatus','Nenhum aparelho identificado nesta área ainda.','aviso');return}"
new="if(!aparelhos.length){if(r&&r.oneSignalConsultado!==true){document.getElementById('saudeAtivos').textContent='—';document.getElementById('saudeInativos').textContent='—';document.getElementById('saudeReparo').textContent='—';document.getElementById('saudeSemConfirmacao').textContent='—';lista.innerHTML='<div class=\"saude-vazio\">Não foi possível consultar a audiência do OneSignal agora. Estes campos não representam zero aparelhos.</div>';status('saudeNotificacoesStatus',txt(r&&r.oneSignalErro)||'Não foi possível consultar o OneSignal agora.','erro');return}lista.innerHTML='<div class=\"saude-vazio\">Nenhuma inscrição Push desta área foi encontrada no OneSignal.</div>';status('saudeNotificacoesStatus','A consulta ao OneSignal foi concluída e não encontrou inscrições desta área.','aviso');return}"
if old not in panel: raise SystemExit('Trecho vazio do painel não encontrado.')
panel=panel.replace(old,new,1)
panel=panel.replace("var msg=r.oneSignalConsultado===true?'Situação atualizada com a consulta técnica ao OneSignal.':'Aparelhos listados pelo Portal, mas o OneSignal não pôde ser consultado agora.';","var msg=r.oneSignalConsultado===true?'Situação atualizada com a audiência real do OneSignal.':'Existem vínculos locais, mas a audiência completa do OneSignal não pôde ser consultada agora.';",1)
panel_path.write_text(panel,encoding='utf-8')

test=test_path.read_text(encoding='utf-8')
marker="assert(backend.includes(\"/subscriptions/'+encodeURIComponent(subscriptionId)+'/user/identity\"));assert(backend.includes(\"/users/by/onesignal_id/\"));"
extra=marker+"\nassert(backend.includes(\"/players/csv_export?app_id=\"));assert(backend.includes(\"invalid_identifier\"));assert(backend.includes(\"tags.area_tacs\"));assert(backend.includes(\"VERSAO:'1.0.1'\"));"
if marker not in test: raise SystemExit('Marcador do teste backend não encontrado.')
test=test.replace(marker,extra,1)
marker2="x=context.saudeNotificacoesV1Classificar_({permission:false,optedIn:false,tokenAtivo:false,areaConfirmada:false,ultimoCheckin:'2026-08-13 08:00:00'}, null, false);assert.equal(x.status,'REPARO');"
extra2=marker2+"\nassert.equal(context.saudeNotificacoesV1AssinaturaAtivaExport_('f','1'),true);assert.equal(context.saudeNotificacoesV1AssinaturaAtivaExport_('t','1'),false);assert.equal(context.saudeNotificacoesV1AssinaturaAtivaExport_('f','-2'),false);\nassert.equal(context.saudeNotificacoesV1PertenceAreaExport_({area_tacs:'JAPARANDUBA'},'JAPARANDUBA',2),true);assert.equal(context.saudeNotificacoesV1PertenceAreaExport_({area_tacs:'MUNTUNS'},'JAPARANDUBA',1),false);assert.equal(context.saudeNotificacoesV1PertenceAreaExport_({},'JAPARANDUBA',1),true);assert.equal(context.saudeNotificacoesV1PertenceAreaExport_({},'JAPARANDUBA',2),false);\nassert(panel.includes('audiência real do OneSignal'));assert(panel.includes('não representam zero aparelhos'));"
if marker2 not in test: raise SystemExit('Marcador do teste de classificação não encontrado.')
test=test.replace(marker2,extra2,1)
test_path.write_text(test,encoding='utf-8')

print('PATCH_SAUDE_NOTIFICACOES_AUDIENCIA_V107_OK')
