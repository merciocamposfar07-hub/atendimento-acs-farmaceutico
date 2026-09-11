/**
 * Portal TACS — Estabilização do ciclo de reparos V9
 *
 * Objetivos:
 * - impedir que um reparo fique indefinidamente em "detectado" ou "iniciado";
 * - distinguir aparelho aguardando abertura do Portal de reparo realmente travado;
 * - manter a categoria REPARO até existir conclusão comprovada;
 * - enriquecer tanto a leitura rápida quanto a conferência remota da Saúde.
 */
var TACS_ESTABILIZACAO_REPAROS_V9=Object.freeze({
  VERSAO:'1.0.0',
  TRAVADO_MINUTOS:3
});

var reparosV9SaudeRapidaAnterior_=typeof notificacoesV8SaudeRapida_==='function'?notificacoesV8SaudeRapida_:null;
var reparosV9SaudeRemotaAnterior_=typeof notificacoesV8SaudeRemota_==='function'?notificacoesV8SaudeRemota_:null;

(function instalarEstabilizacaoReparosV9_(){
  if(reparosV9SaudeRapidaAnterior_){
    notificacoesV8SaudeRapida_=function(contexto,acesso){
      return reparosV9EnriquecerSaude_(reparosV9SaudeRapidaAnterior_(contexto,acesso),contexto);
    };
  }
  if(reparosV9SaudeRemotaAnterior_){
    notificacoesV8SaudeRemota_=function(contexto,acesso){
      return reparosV9EnriquecerSaude_(reparosV9SaudeRemotaAnterior_(contexto,acesso),contexto);
    };
  }
})();

function reparosV9Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}

function reparosV9DataMs_(v){
  var s=reparosV9Texto_(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if(!m)return 0;
  var d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]),0);
  var ms=d.getTime();return isFinite(ms)?ms:0;
}

function reparosV9IdadeMinutos_(v,agora){
  var ms=reparosV9DataMs_(v),now=(agora instanceof Date?agora:new Date()).getTime();
  if(!ms||!isFinite(now)||now<ms)return 0;
  return Math.floor((now-ms)/60000);
}

/** Função pura: usada também pela simulação automatizada. */
function reparosV9ClassificarCiclo_(aparelho,ciclo,agora){
  aparelho=aparelho&&typeof aparelho==='object'?aparelho:{};
  ciclo=ciclo&&typeof ciclo==='object'?ciclo:{};
  if(ciclo.concluidoEm){
    return {fase:'CONCLUIDO',travado:false,precisaMorador:false,reexecutavel:false,
      titulo:'Reparo concluído',mensagem:'O ciclo de reparo possui conclusão registrada.'};
  }
  if(ciclo.acaoMoradorEm||ciclo.autoFalhouEm){
    return {fase:'ACAO_MORADOR',travado:false,precisaMorador:true,reexecutavel:false,
      titulo:'Ação do morador necessária',mensagem:'A tentativa automática não conseguiu concluir. O morador deve abrir o Portal e tocar em “Reparar agora”.'};
  }
  if(ciclo.autoIniciadoEm){
    var idadeAuto=reparosV9IdadeMinutos_(ciclo.autoIniciadoEm,agora);
    if(idadeAuto>=TACS_ESTABILIZACAO_REPAROS_V9.TRAVADO_MINUTOS){
      return {fase:'TRAVADO_AUTO',travado:true,precisaMorador:false,reexecutavel:true,
        titulo:'Reparo travado • retomada automática',mensagem:'A renovação automática foi iniciada, mas não registrou conclusão. Na próxima abertura/atualização do Portal o aparelho fará uma nova tentativa controlada; se não concluir, o botão “Reparar agora” ficará disponível.'};
    }
    return {fase:'AUTO_EM_ANDAMENTO',travado:false,precisaMorador:false,reexecutavel:false,
      titulo:'Reparando automaticamente',mensagem:'A renovação automática foi iniciada e ainda está dentro da janela normal de execução.'};
  }
  if(ciclo.detectadoEm){
    var idadeDet=reparosV9IdadeMinutos_(ciclo.detectadoEm,agora);
    if(idadeDet>=TACS_ESTABILIZACAO_REPAROS_V9.TRAVADO_MINUTOS){
      return {fase:'TRAVADO_DETECTADO',travado:true,precisaMorador:false,reexecutavel:true,
        titulo:'Reparo travado • retomada automática',mensagem:'O aparelho detectou o reparo, mas o ciclo não avançou. Na próxima abertura/atualização do Portal a tentativa automática será retomada; se não concluir, o morador receberá a opção “Reparar agora”.'};
    }
    return {fase:'DETECTADO_RECENTE',travado:false,precisaMorador:false,reexecutavel:false,
      titulo:'Reparo detectado no aparelho',mensagem:'O aparelho acabou de detectar o reparo. Aguarde a tentativa automática.'};
  }
  return {fase:'AGUARDANDO_PORTAL',travado:false,precisaMorador:true,reexecutavel:false,
    titulo:'Aguardando morador abrir o Portal',mensagem:'Este reparo ainda não chegou ao aparelho. O servidor não consegue executar a permissão do navegador remotamente; assim que o aparelho abrir o Portal TACS, o reparo será iniciado automaticamente.'};
}

function reparosV9Feedback_(ciclo){
  return {
    reparoRef:reparosV9Texto_(ciclo.reparoId).slice(-8),
    solicitadoEm:ciclo.solicitadoEm||'',detectadoEm:ciclo.detectadoEm||'',autoIniciadoEm:ciclo.autoIniciadoEm||'',
    autoFalhouEm:ciclo.autoFalhouEm||'',acaoMoradorEm:ciclo.acaoMoradorEm||'',manualIniciadoEm:ciclo.manualIniciadoEm||'',
    concluidoEm:ciclo.concluidoEm||'',modoConclusao:ciclo.modoConclusao||'',
    confirmacaoStatus:'SEM_CONFIRMACAO_ENVIADA',confirmacaoTexto:'Nenhuma confirmação adicional foi necessária para esta leitura.',confirmacaoRef:''
  };
}

function reparosV9EnriquecerSaude_(resultado,contexto){
  if(!resultado||resultado.ok!==true||!Array.isArray(resultado.aparelhos))return resultado;
  if(typeof reparoAutoFeedbackV1MapaArea_!=='function')return resultado;
  var mapa=reparoAutoFeedbackV1MapaArea_(contexto&&contexto.areaId||resultado.areaId||'JAPARANDUBA');
  var agora=new Date();
  resultado.aparelhos.forEach(function(aparelho){
    var ref=reparosV9Texto_(aparelho&&aparelho.subscriptionRef).toLowerCase().replace(/^…/,'').replace(/^\.\.\./,'');
    if(!/^[0-9a-f]{8}$/.test(ref))return;
    var ciclo=mapa&&mapa.porRef?mapa.porRef[ref]:null;
    if(!ciclo||ciclo.ambiguo)return;
    if(!aparelho.reparoFeedback)aparelho.reparoFeedback=reparosV9Feedback_(ciclo);
    var classificacao=reparosV9ClassificarCiclo_(aparelho,ciclo,agora);
    aparelho.reparoEstadoV9=classificacao.fase;
    aparelho.reparoTravado=classificacao.travado;
    aparelho.reparoReexecutavel=classificacao.reexecutavel;
    aparelho.reparoPrecisaMorador=classificacao.precisaMorador;
    if(classificacao.fase==='CONCLUIDO')return;
    if(aparelho.status==='REPARO'||ciclo.solicitadoEm){
      aparelho.status='REPARO';
      aparelho.statusTexto=classificacao.titulo;
      aparelho.motivo=classificacao.mensagem;
    }
  });
  if(typeof notificacoesV8Recontar_==='function')resultado.contagens=notificacoesV8Recontar_(resultado.aparelhos);
  resultado.versaoEstabilizacaoReparos=TACS_ESTABILIZACAO_REPAROS_V9.VERSAO;
  return resultado;
}
