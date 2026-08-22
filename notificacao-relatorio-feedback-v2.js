(function(){
  'use strict';
  try{
    if(typeof document==='undefined'||typeof location==='undefined')return;
    if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
    if(window.PortalTacsOneSignalHealthRecoveryV1||document.querySelector('script[src*="recados-campanhas-health-recovery-v1.js"]'))return;
    var h=document.createElement('script');
    h.src='/atendimento-acs-farmaceutico/recados-campanhas-health-recovery-v1.js?v=20260822-health-autorecovery-v1';
    h.async=true;
    document.head.appendChild(h);
  }catch(e){}
}());

(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsRelatorioFeedbackV2)return;
  window.PortalTacsRelatorioFeedbackV2={version:'2.0.0'};

  var TOKEN_KEY='portalTacsAdminTokenV1';
  var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
  var DEVICE_KEY='portalTacsDispositivoV1';

  function txt(v){return String(v==null?'':v).trim()}
  function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function sessao(){
    var seletor=document.getElementById('areaEnvio');
    var area=(txt(seletor&&seletor.value)||new URLSearchParams(location.search).get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
    var s={dispositivo:localStorage.getItem(DEVICE_KEY)||'',areaId:area};
    var territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
    var token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(territorio)s.territorioToken=territorio;else if(token)s.token=token;
    return s;
  }
  function numero(v){return v===null||typeof v==='undefined'||v===''?'—':String(v)}
  function nome(x){return txt(x&&x.nome)||('Aparelho …'+txt(x&&x.referenciaTecnica))}
  function ambiente(x){return [txt(x&&x.tipoAparelho),txt(x&&x.navegador),txt(x&&x.sistema)].filter(Boolean).join(' / ')}
  function estado(x){return txt(x&&x.estado).toUpperCase()}
  function confirmado(x){return Boolean(txt(x&&x.confirmadoEm))||estado(x)==='CONFIRMADO'}
  function exibido(x){return Boolean(txt(x&&x.exibidoEm))||estado(x)==='EXIBIDO_TECNICO'}
  function falhou(x){return estado(x)==='FALHA_ENVIO'}
  function encaminhado(x){return !falhou(x)&&Boolean(txt(x&&x.encaminhadoEm)||['ENCAMINHADO','EXIBIDO_TECNICO','CONFIRMADO'].indexOf(estado(x))!==-1)}
  function iosSafari(x){
    var conjunto=[txt(x&&x.tipoAparelho),txt(x&&x.navegador),txt(x&&x.sistema)].join(' ').toLowerCase();
    var ios=/iphone|ipad|ios|ipados/.test(conjunto);
    var safari=/safari/.test(conjunto);
    return ios&&safari;
  }
  function pendente(x){return !confirmado(x)&&!exibido(x)&&!falhou(x)}

  function instalarEstilo(){
    if(document.getElementById('relatorioFeedbackV2Style'))return;
    var s=document.createElement('style');s.id='relatorioFeedbackV2Style';
    s.textContent='\
.notificacao-entrega-resultado.feedback-v2{padding:14px!important}\
.feedback-v2-titulo{font-size:1.05rem;font-weight:950;margin-bottom:4px}\
.feedback-v2-sub{font-size:.82rem;line-height:1.45;color:#526d7b;margin-bottom:11px}\
.feedback-v2-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}\
.feedback-v2-num{padding:10px;border:1px solid #c6d8df;border-radius:12px;background:#fff}\
.feedback-v2-num strong{display:block;font-size:1.3rem;color:#073a55}\
.feedback-v2-num span{display:block;font-size:.77rem;font-weight:850;color:#526d7b;line-height:1.25}\
.feedback-v2-num.ok{border-color:#8ec9a4;background:#f1fbf5}\
.feedback-v2-num.aviso{border-color:#e1b562;background:#fff9e8}\
.feedback-v2-num.erro{border-color:#d99b9b;background:#fff4f4}\
.feedback-v2-bloco{margin-top:11px;padding:10px 11px;border-radius:12px;border:1px solid #cad9df;background:#fff}\
.feedback-v2-bloco strong{display:block;margin-bottom:4px}\
.feedback-v2-lista{margin:6px 0 0;padding-left:20px}\
.feedback-v2-lista li{margin:4px 0;line-height:1.35}\
.feedback-v2-nota{margin-top:11px;padding:10px 11px;border-radius:12px;background:#eaf4f8;color:#294b5d;font-size:.82rem;line-height:1.45;font-weight:750}\
.feedback-v2-nota.ios{background:#fff5dc;color:#6d5100;border:1px solid #e6bd58}\
body.tema-petroleo .feedback-v2-sub,body.tema-petroleo .feedback-v2-num span{color:#d8edf5}\
body.tema-petroleo .feedback-v2-num,body.tema-petroleo .feedback-v2-bloco{background:#073a55;border-color:#0b5878;color:#fff}\
body.tema-petroleo .feedback-v2-num strong{color:#9de8ff}\
body.tema-petroleo .feedback-v2-nota{background:#0b5878;color:#fff}\
body.tema-petroleo .feedback-v2-nota.ios{background:#6a5200;color:#fff3b5;border-color:#a8861c}\
@media(max-width:520px){.feedback-v2-grid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(s);
  }

  function itemLinha(x,frase,data){
    var a=ambiente(x);return '<li>'+esc(nome(x))+' — '+esc(frase)+(data?' '+esc(data):'')+(a?' <span class="feedback-v2-ambiente">('+esc(a)+')</span>':'')+'</li>';
  }

  function render(resultado,r){
    instalarEstilo();
    r.hidden=false;r.classList.add('feedback-v2');
    if(!resultado||resultado.ok!==true){
      r.innerHTML='<div class="feedback-v2-titulo">Não foi possível consultar.</div><div class="feedback-v2-sub">'+esc(resultado&&resultado.message||'Resultado indisponível.')+'</div>';return;
    }
    if(resultado.encontrada!==true){
      r.innerHTML='<div class="feedback-v2-titulo">Nenhum envio Push encontrado.</div><div class="feedback-v2-sub">'+esc(resultado.message||'Esta publicação ainda não possui notificação auditada.')+'</div>';return;
    }
    var c=resultado.comprovacao||{},envio=resultado.envio||{},lista=Array.isArray(c.aparelhos)?c.aparelhos:[];
    if(c.disponivel!==true){
      r.innerHTML='<div class="feedback-v2-titulo">Sem comprovante individual.</div><div class="feedback-v2-sub">'+esc(resultado.message||'Este envio é anterior ao sistema de comprovação individual por aparelho.')+'</div>';return;
    }

    var encaminhados=lista.filter(encaminhado);
    var confirmados=lista.filter(confirmado);
    var exibidosTecnicos=lista.filter(exibido);
    var exibidosSemConfirmacao=lista.filter(function(x){return exibido(x)&&!confirmado(x)});
    var falhas=lista.filter(falhou);
    var pendentes=lista.filter(pendente);
    var limitadosIos=pendentes.filter(iosSafari);
    var pendentesNormais=pendentes.filter(function(x){return !iosSafari(x)});
    var comprovados=lista.filter(function(x){return confirmado(x)||exibido(x)});

    var html='<div class="feedback-v2-titulo">Resultado desta notificação</div>'+
      '<div class="feedback-v2-sub">Leitura administrativa mais detalhada do mesmo registro de Push e feedback. Nenhum estado de entrega é alterado por este relatório.</div>'+
      '<div class="feedback-v2-grid">'+
      '<div class="feedback-v2-num"><strong>'+esc(numero(c.destinados))+'</strong><span>Aparelhos destinados</span></div>'+
      '<div class="feedback-v2-num"><strong>'+esc(numero(encaminhados.length))+'</strong><span>Encaminhados ao serviço Push</span></div>'+
      '<div class="feedback-v2-num ok"><strong>'+esc(numero(comprovados.length))+'</strong><span>Recebimento comprovado</span></div>'+
      '<div class="feedback-v2-num ok"><strong>'+esc(numero(exibidosTecnicos.length))+'</strong><span>Exibição técnica comprovada</span></div>'+
      '<div class="feedback-v2-num ok"><strong>'+esc(numero(confirmados.length))+'</strong><span>Confirmação expressa do morador</span></div>'+
      '<div class="feedback-v2-num aviso"><strong>'+esc(numero(limitadosIos.length))+'</strong><span>iPhone/Safari sem retorno automático</span></div>'+
      '<div class="feedback-v2-num aviso"><strong>'+esc(numero(pendentesNormais.length))+'</strong><span>Aguardando comprovação técnica</span></div>'+
      '<div class="feedback-v2-num erro"><strong>'+esc(numero(falhas.length))+'</strong><span>Falhas reais de envio</span></div></div>';

    html+='<div class="feedback-v2-sub">Envio …'+esc(txt(envio.onesignalId).slice(-8))+(envio.registradoEm?' • '+esc(envio.registradoEm):'')+'</div>';

    if(confirmados.length){
      html+='<div class="feedback-v2-bloco"><strong>✅ Morador confirmou expressamente</strong><ul class="feedback-v2-lista">'+confirmados.map(function(x){return itemLinha(x,'confirmou em',txt(x.confirmadoEm))}).join('')+'</ul></div>';
    }
    if(exibidosSemConfirmacao.length){
      html+='<div class="feedback-v2-bloco"><strong>✅ Navegador comprovou a exibição</strong><ul class="feedback-v2-lista">'+exibidosSemConfirmacao.map(function(x){return itemLinha(x,'exibiu o aviso em',txt(x.exibidoEm))}).join('')+'</ul></div>';
    }
    if(limitadosIos.length){
      html+='<div class="feedback-v2-nota ios"><strong>⚠️ iPhone/Safari:</strong> estes aparelhos foram encaminhados ao Push, mas não devolveram comprovação automática de exibição. Isso é mostrado separadamente para não parecer uma falha de entrega.<ul class="feedback-v2-lista">'+limitadosIos.map(function(x){return itemLinha(x,'sem retorno automático registrado','')}).join('')+'</ul></div>';
    }
    if(pendentesNormais.length){
      html+='<div class="feedback-v2-bloco"><strong>⏳ Aguardando comprovação</strong><ul class="feedback-v2-lista">'+pendentesNormais.map(function(x){return itemLinha(x,'encaminhado, ainda sem comprovação registrada','')}).join('')+'</ul></div>';
    }
    if(falhas.length){
      html+='<div class="feedback-v2-bloco"><strong>❌ Falha real de envio</strong><ul class="feedback-v2-lista">'+falhas.map(function(x){var detalhe=txt(x.detalhe);return itemLinha(x,detalhe||'o serviço Push recusou este aparelho','')}).join('')+'</ul></div>';
    }
    html+='<div class="feedback-v2-nota"><strong>Como interpretar:</strong> “Encaminhado” significa que o serviço Push aceitou o envio. “Comprovado” exige exibição técnica ou confirmação expressa. Ausência de comprovação não é tratada como prova de que a notificação não chegou.</div>';
    r.innerHTML=html;
  }

  function consultar(botao){
    var api=window.PortalTacsRecadosCampanhasV12;
    var id=txt(botao&&botao.dataset&&botao.dataset.id),tipo=txt(botao&&botao.dataset&&botao.dataset.tipo);
    var wrap=botao&&botao.closest('.notificacao-entrega'),r=wrap&&wrap.querySelector('.notificacao-entrega-resultado');
    if(!api||typeof api.post!=='function'||!id||!r)return false;
    var original=botao.textContent;botao.disabled=true;botao.textContent='Consultando relatório…';r.hidden=false;r.classList.add('feedback-v2');r.textContent='Consultando os registros desta notificação…';
    var payload=sessao();payload.id=id;payload.tipo=tipo;
    api.post('admin_notificacao_resultado',payload,function(res){botao.disabled=false;botao.textContent=original;render(res,r)},'admin_result');
    return true;
  }

  document.addEventListener('click',function(event){
    var alvo=event&&event.target&&event.target.closest?event.target.closest('.notificacao-entrega-botao'):null;
    if(!alvo)return;
    if(!window.PortalTacsRecadosCampanhasV12)return;
    event.preventDefault();event.stopImmediatePropagation();
    consultar(alvo);
  },true);
}());
