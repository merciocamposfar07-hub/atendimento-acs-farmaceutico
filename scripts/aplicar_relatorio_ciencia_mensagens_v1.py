from pathlib import Path

ROOT = Path('.')

def write(path, content):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')


def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Marcador não encontrado em {path}: {old[:100]}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

backend = r'''/**
 * Portal TACS — comprovação de ciência e relatório de mensagens V1.0.0
 *
 * Escopo isolado:
 * - somente MENSAGEM_INDIVIDUAL e MENSAGEM_FAMILIA;
 * - preserva recados/campanhas e o emissor geral;
 * - abertura não é tratada como ciência;
 * - ciência exige ação explícita "Li e estou ciente";
 * - cria relatório administrativo persistente por morador ou família.
 */
var TACS_COMPROVACAO_MENSAGENS_V1 = Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_comprovacao_mensagens_v1_result_',
  RESULT_SECONDS:300,
  CIENCIA_PAGE:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/confirmar-ciencia.html',
  TIPOS:Object.freeze(['MENSAGEM_INDIVIDUAL','MENSAGEM_FAMILIA']),
  MAX_EVENTOS:12
});

var comprovacaoMensagensV1DoGetAnterior_;
var comprovacaoMensagensV1DoPostAnterior_;
var comprovacaoMensagensV1PayloadAnterior_;

(function instalarComprovacaoMensagensV1_(){
  if(typeof notificacoesAreaV1PayloadIndividual_==='function'){
    comprovacaoMensagensV1PayloadAnterior_=notificacoesAreaV1PayloadIndividual_;
    notificacoesAreaV1PayloadIndividual_=function(appId,contexto,input,item){
      var tipo=comprovacaoMensagensV1Texto_(input&&input.tipo).toUpperCase();
      if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)===-1){
        return comprovacaoMensagensV1PayloadAnterior_(appId,contexto,input,item);
      }
      return comprovacaoMensagensV1Payload_(appId,contexto,input,item);
    };
  }
  if(typeof doGet==='function'){
    comprovacaoMensagensV1DoGetAnterior_=doGet;
    doGet=function(e){var r=comprovacaoMensagensV1TratarGet_(e);return r||comprovacaoMensagensV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    comprovacaoMensagensV1DoPostAnterior_=doPost;
    doPost=function(e){var r=comprovacaoMensagensV1TratarPost_(e);return r||comprovacaoMensagensV1DoPostAnterior_(e);};
  }
})();

function comprovacaoMensagensV1Payload_(appId,contexto,input,item){
  var pagina=TACS_COMPROVACAO_MENSAGENS_V1.CIENCIA_PAGE+'?t='+encodeURIComponent(item.token);
  var mensagem=comprovacaoMensagensV1Texto_(input.mensagem).slice(0,820)+'\n\nAbra o aviso e confirme: Li e estou ciente.';
  return {
    app_id:appId,
    target_channel:'push',
    headings:{pt:input.titulo,en:input.titulo},
    contents:{pt:mensagem,en:mensagem},
    include_subscription_ids:[item.alvo.subscriptionId],
    url:pagina,
    web_buttons:[{
      id:TACS_NOTIFICACOES_AREA_V1.CONFIRM_ACTION,
      text:'Li e estou ciente',
      url:'_osp=do_not_open'
    }],
    data:{
      areaId:contexto.areaId,
      tipo:input.tipo,
      referenciaId:input.referencia,
      evento:input.evento,
      confirmacaoToken:item.token,
      comprovacao:'CIENCIA_EXPLICITA_V1'
    }
  };
}

function comprovacaoMensagensV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=comprovacaoMensagensV1Texto_(p.action).toLowerCase();
  if(['admin_mensagem_comprovante_result','publico_mensagem_comprovante_result'].indexOf(action)===-1)return null;
  var requestId=comprovacaoMensagensV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return comprovacaoMensagensV1ResponderJson_({ok:false,message:'Identificador de consulta inválido.'},p.callback);
  var resultado=comprovacaoMensagensV1LerResultado_(requestId);
  return comprovacaoMensagensV1ResponderJson_(resultado?{ok:true,pendente:false,requestId:requestId,result:resultado}:{ok:true,pendente:true,requestId:requestId},p.callback);
}

function comprovacaoMensagensV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=comprovacaoMensagensV1Texto_(p.action).toLowerCase();
  if(['publico_mensagem_aberta_token','publico_mensagem_ciente_token','admin_mensagem_relatorio'].indexOf(action)===-1)return null;
  var requestId=comprovacaoMensagensV1Texto_(p.requestId),resultado;
  try{
    requestId=comprovacaoMensagensV1ValidarRequestId_(requestId);
    if(action==='publico_mensagem_aberta_token')resultado=comprovacaoMensagensV1RegistrarAberturaToken_(p);
    else if(action==='publico_mensagem_ciente_token')resultado=comprovacaoMensagensV1RegistrarCienciaToken_(p);
    else{
      if(typeof mensagemIndividualV1Contexto_!=='function')throw new Error('A camada administrativa de mensagens ainda não está disponível.');
      var sessao=mensagemIndividualV1Contexto_(p,false);
      resultado=comprovacaoMensagensV1Relatorio_(p,sessao.contexto);
    }
  }catch(erro){resultado={ok:false,message:comprovacaoMensagensV1Erro_(erro)};}
  comprovacaoMensagensV1GuardarResultado_(requestId,resultado);
  return comprovacaoMensagensV1ResponderPost_(requestId,resultado);
}

function comprovacaoMensagensV1ComprovanteToken_(token){
  token=comprovacaoMensagensV1Texto_(token).toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(token))throw new Error('O comprovante desta mensagem é inválido.');
  if(typeof notificacoesAreaV1HashToken_!=='function')throw new Error('O serviço de comprovantes ainda não está disponível.');
  var hash=notificacoesAreaV1HashToken_(token),ss=tacsTerritorioV1Planilha_();
  var sheet=notificacoesAreaV1GarantirComprovantes_(ss);
  if(sheet.getLastRow()<=1)throw new Error('O comprovante desta mensagem não foi localizado.');
  var values=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getValues();
  for(var i=values.length-1;i>=0;i--){
    var row=values[i];
    if(comprovacaoMensagensV1Texto_(row[7]).toLowerCase()!==hash)continue;
    var tipo=comprovacaoMensagensV1Texto_(row[2]).toUpperCase();
    if(TACS_COMPROVACAO_MENSAGENS_V1.TIPOS.indexOf(tipo)===-1)throw new Error('Este comprovante não pertence a uma mensagem individual ou familiar.');
    return {
      row:row,
      token:token,
      eventoId:comprovacaoMensagensV1Texto_(row[0]),
      areaId:comprovacaoMensagensV1Texto_(row[1]).toUpperCase(),
      tipo:tipo,
      referenciaId:comprovacaoMensagensV1Texto_(row[3]),
      onesignalId:comprovacaoMensagensV1Texto_(row[4]),
      subscriptionId:comprovacaoMensagensV1Texto_(row[5]).toLowerCase()
    };
  }
  throw new Error('O comprovante desta mensagem não foi localizado.');
}

function comprovacaoMensagensV1RegistrarAberturaToken_(p){
  var c=comprovacaoMensagensV1ComprovanteToken_(p.token||p.confirmacaoToken);
  var auditoria={eventoId:c.eventoId,areaId:c.areaId,tipo:c.tipo,referenciaId:c.referenciaId,onesignalId:c.onesignalId};
  var r=notificacoesAreaV1RegistrarAbertura_(c.areaId,auditoria,c.subscriptionId);
  return {ok:true,aberta:Boolean(r&&r.registrada),duplicada:Boolean(r&&r.duplicada),eventoId:c.eventoId,tipo:c.tipo};
}

function comprovacaoMensagensV1RegistrarCienciaToken_(p){
  var c=comprovacaoMensagensV1ComprovanteToken_(p.token||p.confirmacaoToken);
  var r=notificacoesAreaV1RegistrarComprovacao_(c.token,'','CONFIRMADO','BOTAO_CIENCIA_MENSAGEM');
  return {ok:true,ciente:true,duplicada:Boolean(r&&r.duplicada),eventoId:c.eventoId,tipo:c.tipo,confirmadoEm:r&&r.confirmadoEm?r.confirmadoEm:''};
}

function comprovacaoMensagensV1Relatorio_(p,contexto){
  var escopo=comprovacaoMensagensV1Texto_(p.escopo).toUpperCase(),tipo,referencia,destino;
  if(escopo==='INDIVIDUAL'){
    var morador=mensagemIndividualV1ResolverMorador_(p,contexto);
    tipo='MENSAGEM_INDIVIDUAL';referencia=morador.referencia;
    destino={escopo:'INDIVIDUAL',nome:morador.item.nome,familiaId:morador.familiaId,referencia:referencia};
  }else if(escopo==='FAMILIA'){
    if(typeof buscaEnvioFamiliaV1NormalizarFamilia_!=='function'||typeof buscaEnvioFamiliaV1BuscarExata_!=='function')throw new Error('A busca familiar ainda não está disponível.');
    var familia=buscaEnvioFamiliaV1NormalizarFamilia_(p.familiaId||p.familia||'');
    if(!familia)throw new Error('Número do cadastro familiar inválido.');
    var membros=buscaEnvioFamiliaV1BuscarExata_(familia,contexto).resultados||[];
    if(!membros.length)throw new Error('Nenhum morador desta família foi localizado na área atual.');
    tipo='MENSAGEM_FAMILIA';referencia='FAMILIA_'+familia;
    destino={escopo:'FAMILIA',familiaId:familia,moradores:membros.length,referencia:referencia};
  }else throw new Error('Informe se o relatório é individual ou familiar.');
  return comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino);
}

function comprovacaoMensagensV1MontarRelatorio_(contexto,tipo,referencia,destino){
  var ss=tacsTerritorioV1Planilha_();
  var audit=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  var rec=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  var open=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  var eventos=[];
  if(audit&&audit.getLastRow()>1){
    var ar=audit.getRange(2,1,audit.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues();
    for(var i=ar.length-1;i>=0&&eventos.length<TACS_COMPROVACAO_MENSAGENS_V1.MAX_EVENTOS;i--){
      var row=ar[i];
      if(comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId)continue;
      if(comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo)continue;
      if(comprovacaoMensagensV1Texto_(row[3])!==referencia)continue;
      eventos.push({eventoId:comprovacaoMensagensV1Texto_(row[0]),titulo:comprovacaoMensagensV1Texto_(row[4]),registradoEm:comprovacaoMensagensV1Texto_(row[9])});
    }
  }
  if(!eventos.length)return {ok:true,encontrado:false,destino:destino,historico:[],message:'Ainda não existe mensagem enviada para este destino.'};

  var recRows=rec&&rec.getLastRow()>1?rec.getRange(2,1,rec.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues():[];
  var openRows=open&&open.getLastRow()>1?open.getRange(2,1,open.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues():[];
  var abertura={};
  openRows.forEach(function(row){
    if(comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId||comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo||comprovacaoMensagensV1Texto_(row[3])!==referencia)return;
    var key=comprovacaoMensagensV1Texto_(row[0])+'|'+comprovacaoMensagensV1Texto_(row[5]).toLowerCase();
    if(!abertura[key])abertura[key]=comprovacaoMensagensV1Texto_(row[7]);
  });

  eventos.forEach(function(ev){
    var vistos={},aparelhos=[],cont={destinados:0,encaminhados:0,exibidos:0,abertos:0,cientes:0,falhas:0};
    recRows.forEach(function(row){
      if(comprovacaoMensagensV1Texto_(row[0])!==ev.eventoId||comprovacaoMensagensV1Texto_(row[1]).toUpperCase()!==contexto.areaId||comprovacaoMensagensV1Texto_(row[2]).toUpperCase()!==tipo||comprovacaoMensagensV1Texto_(row[3])!==referencia)return;
      var sub=comprovacaoMensagensV1Texto_(row[5]).toLowerCase();if(!sub||vistos[sub])return;vistos[sub]=true;
      var estado=comprovacaoMensagensV1Texto_(row[11]).toUpperCase(),enc=comprovacaoMensagensV1Texto_(row[13]),exib=comprovacaoMensagensV1Texto_(row[14]),cie=comprovacaoMensagensV1Texto_(row[15]);
      var abr=abertura[ev.eventoId+'|'+sub]||'';
      cont.destinados++;if(enc)cont.encaminhados++;if(exib)cont.exibidos++;if(abr)cont.abertos++;if(cie)cont.cientes++;if(estado==='FALHA_ENVIO')cont.falhas++;
      aparelhos.push({
        referenciaTecnica:sub.slice(-8),tipoAparelho:comprovacaoMensagensV1Texto_(row[8])||'Aparelho',
        navegador:comprovacaoMensagensV1Texto_(row[9]),sistema:comprovacaoMensagensV1Texto_(row[10]),estado:estado,
        encaminhadoEm:enc,exibidoEm:exib,abertoEm:abr,cienteEm:cie,
        origem:comprovacaoMensagensV1Texto_(row[16]),detalhe:comprovacaoMensagensV1Texto_(row[17])
      });
    });
    var estadoGeral='AGUARDANDO';
    if(cont.destinados&&cont.cientes===cont.destinados)estadoGeral='CIENCIA_TOTAL';
    else if(cont.cientes)estadoGeral='CIENCIA_PARCIAL';
    else if(cont.abertos)estadoGeral='ABERTA';
    else if(cont.exibidos)estadoGeral='EXIBIDA';
    else if(cont.encaminhados)estadoGeral='ENCAMINHADA';
    else if(cont.falhas)estadoGeral='FALHA';
    ev.estado=estadoGeral;ev.resumo=cont;ev.aparelhos=aparelhos;
  });
  return {
    ok:true,encontrado:true,destino:destino,historico:eventos,
    message:'Abertura e ciência são estados distintos. “Ciente” só aparece após confirmação explícita no aparelho.',
    observacao:destino.escopo==='INDIVIDUAL'
      ?'Em aparelho familiar compartilhado, a confirmação comprova ciência naquele aparelho para a mensagem destinada ao morador; não identifica biologicamente quem tocou.'
      :'O relatório familiar comprova o que ocorreu em cada aparelho vinculado à família, não uma confirmação individual de cada morador.'
  };
}

function comprovacaoMensagensV1ValidarRequestId_(v){var s=comprovacaoMensagensV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(s))throw new Error('Identificador da operação inválido.');return s;}
function comprovacaoMensagensV1GuardarResultado_(id,r){try{if(/^[A-Za-z0-9_-]{8,160}$/.test(id))CacheService.getScriptCache().put(TACS_COMPROVACAO_MENSAGENS_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_COMPROVACAO_MENSAGENS_V1.RESULT_SECONDS);}catch(e){}}
function comprovacaoMensagensV1LerResultado_(id){try{var s=CacheService.getScriptCache().get(TACS_COMPROVACAO_MENSAGENS_V1.RESULT_PREFIX+id);return s?JSON.parse(s):null;}catch(e){return null;}}
function comprovacaoMensagensV1ResponderPost_(requestId,resultado){var msg={source:'comprovacao-mensagens-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function comprovacaoMensagensV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=comprovacaoMensagensV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function comprovacaoMensagensV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function comprovacaoMensagensV1Erro_(e){return comprovacaoMensagensV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,500);}
'''

confirm_page = r'''<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#073f57">
  <title>Confirmar ciência — Portal TACS</title>
  <style>
    :root{color-scheme:light;--petroleo:#073f57;--petroleo2:#0b5878;--borda:#62cae6;--fundo:#e8f5f9;--verde:#12874a;--texto:#0a2e40}
    *{box-sizing:border-box}html,body{min-height:100%;margin:0}
    body{display:grid;place-items:center;padding:22px;background:var(--fundo);color:var(--texto);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
    main{width:min(100%,560px);padding:28px;border:3px solid var(--borda);border-radius:28px;background:#fff;box-shadow:0 18px 45px rgba(5,57,79,.16);text-align:center}
    .icone{display:grid;place-items:center;width:72px;height:72px;margin:0 auto 18px;border-radius:50%;background:var(--petroleo);color:#fff;font-size:34px;font-weight:900}
    h1{margin:0 0 12px;font-size:clamp(29px,8vw,42px);line-height:1.08;color:var(--petroleo)}
    p{margin:0;color:#526d7b;font-size:18px;line-height:1.5}
    #estado{margin-top:20px;padding:16px;border:2px solid #b6d3dd;border-radius:18px;background:#f5fafc;color:var(--petroleo);font-size:17px;font-weight:800;line-height:1.4}
    #estado.ok{border-color:#82d5a5;background:#eaf8ef;color:#08723d}#estado.erro{border-color:#e3a4a4;background:#fff1f1;color:#922d2d}
    #confirmar{width:100%;min-height:66px;margin-top:20px;border:3px solid var(--borda);border-radius:20px;background:linear-gradient(145deg,var(--petroleo),var(--petroleo2));color:#fff;font-size:20px;font-weight:900;padding:14px 18px}
    #confirmar:disabled{opacity:.55}a{display:inline-block;margin-top:18px;padding:14px 20px;border-radius:16px;background:#edf6f9;color:var(--petroleo);font-size:17px;font-weight:900;text-decoration:none}[hidden]{display:none!important}
  </style>
</head>
<body>
  <main>
    <div class="icone" aria-hidden="true">🔔</div>
    <h1>Você abriu o aviso</h1>
    <p>Leia o conteúdo da notificação. Quando estiver ciente do recado, confirme abaixo.</p>
    <div id="estado" role="status" aria-live="polite">Registrando a abertura deste aviso…</div>
    <button id="confirmar" type="button">✅ Li e estou ciente</button>
    <a id="portal" href="./">Abrir Portal TACS</a>
  </main>
  <script>
  (function(){
    'use strict';
    var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
    var token=String(new URLSearchParams(location.search).get('t')||'').trim().toLowerCase();
    var estado=document.getElementById('estado'),botao=document.getElementById('confirmar');
    try{history.replaceState(null,'',location.pathname)}catch(e){}
    function mostrar(msg,tipo){estado.textContent=msg;estado.className=tipo||''}
    function rid(prefix){return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
    function executar(action,cb){
      var requestId=rid(action),body=new URLSearchParams(),inicio=Date.now();
      body.set('action',action);body.set('requestId',requestId);body.set('token',token);
      fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString()}).catch(function(){}).then(function(){setTimeout(consultar,550)});
      function consultar(){
        var nome='__tacsCiencia_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),feito=false,t=setTimeout(function(){fim(null)},4200);
        function fim(data){if(feito)return;feito=true;clearTimeout(t);try{delete window[nome]}catch(e){window[nome]=undefined}if(s.parentNode)s.remove();if(data&&data.ok===true&&data.pendente===false&&data.result){cb(data.result);return}if(Date.now()-inicio>35000){cb({ok:false,message:'A confirmação demorou mais que o esperado.'});return}setTimeout(consultar,800)}
        window[nome]=fim;s.onerror=function(){fim(null)};s.src=API+'?action=publico_mensagem_comprovante_result&requestId='+encodeURIComponent(requestId)+'&callback='+encodeURIComponent(nome)+'&_='+Date.now();document.head.appendChild(s)
      }
    }
    if(!/^[0-9a-f]{64}$/.test(token)){mostrar('Este comprovante é inválido ou está incompleto.','erro');botao.disabled=true;return}
    executar('publico_mensagem_aberta_token',function(r){if(r&&r.ok===true)mostrar('Aviso aberto. Para registrar ciência, toque em “Li e estou ciente”.','');else mostrar((r&&r.message)||'A abertura não pôde ser registrada, mas você ainda pode confirmar sua ciência.','erro')});
    botao.addEventListener('click',function(){
      botao.disabled=true;mostrar('Registrando sua ciência…','');
      executar('publico_mensagem_ciente_token',function(r){
        if(r&&r.ok===true&&r.ciente===true){mostrar('✅ Ciência registrada. O TACS poderá verificar que este aviso foi confirmado.','ok');botao.textContent='✅ Ciência confirmada';return}
        botao.disabled=false;mostrar((r&&r.message)||'Não foi possível registrar sua ciência. Tente novamente.','erro')
      })
    });
  }());
  </script>
</body>
</html>
'''

report_js = r'''(function(){
'use strict';
if(window.PortalTacsRelatorioMensagensV1)return;
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1';
var ativa=null,contador=0,pendingReport=false,syncTimer=null;
function txt(v){return String(v==null?'':v).trim()}
function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function areaId(){var s=document.getElementById('areaSelect');if(s&&s.value)return txt(s.value);try{return txt(new URLSearchParams(location.search).get('area')||new URLSearchParams(location.search).get('areaId')||'JAPARANDUBA')}catch(e){return'JAPARANDUBA'}}
function sessao(extra){var token='',territorio='',dispositivo='';try{token=sessionStorage.getItem(TOKEN_KEY)||'';territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';dispositivo=localStorage.getItem(DEVICE_KEY)||''}catch(e){}var out={areaId:areaId(),dispositivo:dispositivo};if(territorio)out.territorioToken=territorio;else out.token=token;Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});return out}
function rid(){return'relmsg_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(params,cb){contador++;var nome='__relmsg_'+Date.now()+'_'+contador,s=document.createElement('script'),feito=false,t=setTimeout(function(){fim(null)},4500);function fim(d){if(feito)return;feito=true;clearTimeout(t);try{delete window[nome]}catch(e){window[nome]=undefined}if(s.parentNode)s.remove();cb(d)}window[nome]=fim;s.onerror=function(){fim(null)};var q=['action=admin_mensagem_comprovante_result','callback='+encodeURIComponent(nome),'_='+Date.now()];Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});s.src=API+'?'+q.join('&');document.head.appendChild(s)}
function finalizar(r){if(!ativa)return;var a=ativa;ativa=null;clearTimeout(a.timeout);clearTimeout(a.poll);if(a.form&&a.form.parentNode)a.form.remove();if(a.frame&&a.frame.parentNode)setTimeout(function(){if(a.frame.parentNode)a.frame.remove()},120);a.cb(r||{ok:false,message:'Resposta vazia.'})}
function consultar(){if(!ativa)return;var a=ativa;jsonp({requestId:a.id},function(r){if(!ativa||ativa.id!==a.id)return;if(r&&r.ok===true&&r.pendente===false){finalizar(r.result);return}a.poll=setTimeout(consultar,800)})}
window.addEventListener('message',function(event){if(!ativa||!ativa.frame||event.source!==ativa.frame.contentWindow)return;var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}if(!d||typeof d!=='object')return;var id=txt(d.requestId||(d.result&&d.result.requestId));if(id&&id!==ativa.id)return;var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:null;if(r)finalizar(r)});
function post(payload,cb){if(ativa){cb({ok:false,message:'Aguarde a consulta anterior terminar.'});return}var id=rid(),frame=document.createElement('iframe'),form=document.createElement('form'),nome='relMsgFrame'+Date.now(),fields=sessao(payload);fields.action='admin_mensagem_relatorio';fields.requestId=id;frame.name=nome;frame.src='about:blank';frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01';form.method='POST';form.action=API+'?_='+Date.now();form.target=nome;form.style.display='none';Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});ativa={id:id,frame:frame,form:form,cb:cb,poll:null,timeout:setTimeout(function(){finalizar({ok:false,message:'O servidor demorou para montar o relatório.'})},45000)};document.body.appendChild(frame);document.body.appendChild(form);var enviado=false;function enviar(){if(enviado||!ativa||ativa.id!==id)return;enviado=true;try{form.submit()}catch(e){finalizar({ok:false,message:'Não foi possível iniciar a consulta.'});return}ativa.poll=setTimeout(consultar,550)}frame.addEventListener('load',enviar,{once:true});setTimeout(enviar,120)}
function instalarModal(){if(document.getElementById('relMsgV1'))return;var st=document.createElement('style');st.id='relMsgV1Style';st.textContent='.msg-rel-overlay{position:fixed;inset:0;z-index:50030;display:grid;place-items:center;padding:14px;background:rgba(4,29,43,.74);overflow:auto}.msg-rel-box{width:min(100%,680px);max-height:94vh;overflow:auto;border:3px solid #69c7e7;border-radius:26px;padding:18px;background:linear-gradient(160deg,#073a55,#0b5878);color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35)}.msg-rel-head{display:flex;justify-content:space-between;gap:12px}.msg-rel-head h2{margin:0;font-size:1.65rem}.msg-rel-close{width:48px;height:48px;border:0;border-radius:14px;background:#fff;color:#073a55;font-size:24px;font-weight:900}.msg-rel-status,.msg-rel-event{margin-top:13px;padding:14px;border:2px solid #a8c3ce;border-radius:18px;background:#fff;color:#102d40}.msg-rel-status.err{border-color:#d88a8a;background:#fff0f0;color:#a52d2d}.msg-rel-event h3{margin:0;color:#073a55}.msg-rel-badge{display:inline-block;margin-top:7px;padding:5px 9px;border-radius:999px;background:#e8f7ee;color:#08723a;font-weight:900}.msg-rel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.msg-rel-grid div{padding:9px;border-radius:12px;background:#edf6f9;font-weight:800}.msg-rel-device{margin-top:9px;padding:10px;border:2px solid #d5e2e7;border-radius:13px;background:#f8fbfc}.msg-rel-device strong{display:block}.msg-rel-device small{display:block;margin-top:3px;color:#536b78}.msg-rel-note{margin-top:12px;color:#d8eef7;font-size:.9rem;font-weight:750}.msg-rel-hide{display:none!important}.msg-rel-button{display:block!important;width:100%!important;min-height:54px!important;margin-top:10px!important;padding:11px 14px!important;border:3px solid #ffd36a!important;border-radius:18px!important;background:#fff8df!important;color:#073a55!important;text-align:center!important;font-weight:900!important;font-size:1rem!important}.msg-rel-family{border-color:#ffd36a!important;background:#fff8df!important;color:#073a55!important}@media(max-width:520px){.msg-rel-grid{grid-template-columns:1fr}}';document.head.appendChild(st);var o=document.createElement('div');o.id='relMsgV1';o.className='msg-rel-overlay msg-rel-hide';o.innerHTML='<section class="msg-rel-box" role="dialog" aria-modal="true"><div class="msg-rel-head"><div><h2>📋 Relatório de entrega</h2><div id="relMsgDestino" class="msg-rel-note"></div></div><button id="relMsgClose" class="msg-rel-close" type="button">×</button></div><div id="relMsgStatus" class="msg-rel-status">Carregando…</div><div id="relMsgLista"></div><div id="relMsgObs" class="msg-rel-note"></div></section>';document.body.appendChild(o);document.getElementById('relMsgClose').addEventListener('click',fechar);o.addEventListener('click',function(e){if(e.target===o)fechar()})}
function fechar(){var o=document.getElementById('relMsgV1');if(o)o.classList.add('msg-rel-hide')}
function labelEstado(e){return{CIENCIA_TOTAL:'✅ Todos os aparelhos confirmaram ciência',CIENCIA_PARCIAL:'✅ Ciência confirmada em parte dos aparelhos',ABERTA:'👆 Mensagem aberta',EXIBIDA:'🔔 Mensagem exibida',ENCAMINHADA:'📤 Mensagem encaminhada',FALHA:'❌ Falha de envio',AGUARDANDO:'⏳ Aguardando retorno'}[e]||e}
function render(r){var status=document.getElementById('relMsgStatus'),lista=document.getElementById('relMsgLista'),obs=document.getElementById('relMsgObs');lista.innerHTML='';if(!r||r.ok!==true){status.className='msg-rel-status err';status.textContent=txt(r&&r.message)||'Não foi possível montar o relatório.';obs.textContent='';return}var d=r.destino||{};document.getElementById('relMsgDestino').textContent=d.escopo==='FAMILIA'?'Família '+d.familiaId:(d.nome||'Morador')+' • Família '+(d.familiaId||'—');if(!r.encontrado){status.className='msg-rel-status';status.textContent=r.message||'Ainda não existe envio registrado.';obs.textContent='';return}status.className='msg-rel-status';status.textContent='Histórico persistente de entrega, abertura e ciência.';(r.historico||[]).forEach(function(ev){var c=ev.resumo||{},card=document.createElement('article');card.className='msg-rel-event';var devices=(ev.aparelhos||[]).map(function(a){var linhas=[];if(a.encaminhadoEm)linhas.push('📤 Encaminhada: '+a.encaminhadoEm);if(a.exibidoEm)linhas.push('🔔 Exibida: '+a.exibidoEm);if(a.abertoEm)linhas.push('👆 Aberta: '+a.abertoEm);if(a.cienteEm)linhas.push('✅ Li e estou ciente: '+a.cienteEm);if(a.estado==='FALHA_ENVIO')linhas.push('❌ Falha de envio');return '<div class="msg-rel-device"><strong>'+esc(a.tipoAparelho||'Aparelho')+' • final '+esc(a.referenciaTecnica||'')+'</strong><small>'+esc([a.navegador,a.sistema].filter(Boolean).join(' • '))+'</small><small>'+linhas.map(esc).join('<br>')+'</small></div>'}).join('');card.innerHTML='<h3>'+esc(ev.titulo||'Mensagem do Portal TACS')+'</h3><small>'+esc(ev.registradoEm||'')+'</small><div class="msg-rel-badge">'+esc(labelEstado(ev.estado))+'</div><div class="msg-rel-grid"><div>📤 '+Number(c.encaminhados||0)+' encaminhada(s)</div><div>🔔 '+Number(c.exibidos||0)+' exibida(s)</div><div>👆 '+Number(c.abertos||0)+' aberta(s)</div><div>✅ '+Number(c.cientes||0)+' ciente(s)</div></div>'+devices;lista.appendChild(card)});obs.textContent=r.observacao||r.message||''}
function itemFormulario(){var origem=document.getElementById('originSheet'),linha=document.getElementById('originRow'),nome=document.getElementById('name');var origemAba=txt(origem&&origem.value),origemLinha=Number(linha&&linha.value||0),nomeCompleto=txt(nome&&nome.value);if(!origemAba||origemLinha<2||!nomeCompleto)return null;return{moradorId:txt(document.getElementById('residentId')&&document.getElementById('residentId').value),origemAba:origemAba,origemLinha:origemLinha,nome:nomeCompleto}}
function abrirIndividual(item){instalarModal();document.getElementById('relMsgV1').classList.remove('msg-rel-hide');document.getElementById('relMsgStatus').textContent='Carregando relatório deste morador…';document.getElementById('relMsgLista').innerHTML='';post({escopo:'INDIVIDUAL',origemAba:item.origemAba,origemLinha:item.origemLinha,moradorId:item.moradorId||''},render)}
function abrirFamilia(familia){instalarModal();document.getElementById('relMsgV1').classList.remove('msg-rel-hide');document.getElementById('relMsgStatus').textContent='Carregando relatório da família '+familia+'…';document.getElementById('relMsgLista').innerHTML='';post({escopo:'FAMILIA',familiaId:familia},render)}
function results(){return document.getElementById('results')}function cards(){var r=results();return r?Array.prototype.slice.call(r.querySelectorAll('.card')):[]}
function originalCardButton(card){if(!card||!card.children)return null;for(var i=0;i<card.children.length;i++){var n=card.children[i];if(n.tagName==='BUTTON'&&!n.classList.contains('msg-ind-card-button')&&!n.classList.contains('msg-rel-button'))return n}return null}
function tryPending(){if(!pendingReport)return;var item=itemFormulario();if(!item)return;pendingReport=false;abrirIndividual(item)}
function ensureCards(){cards().forEach(function(card){if(card.querySelector('.msg-rel-button'))return;var b=document.createElement('button');b.type='button';b.className='msg-rel-button';b.textContent='📋 Relatório de entrega';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var original=originalCardButton(card);if(!original)return;pendingReport=true;original.click();[80,220,500,1000,1800].forEach(function(ms){setTimeout(tryPending,ms)})});card.appendChild(b)})}
function ensureFamily(){var box=document.getElementById('msgFamiliaAcaoBuscaV1');if(!box||box.querySelector('.msg-rel-family'))return;var b=document.createElement('button');b.type='button';b.className='msg-rel-button msg-rel-family';b.textContent='📋 Relatório da família';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var q=txt(document.getElementById('query')&&document.getElementById('query').value).toUpperCase().replace(/\s+/g,'');if(/^\d{3}[A-Z]?$/.test(q))abrirFamilia(q)});box.appendChild(b)}
function ensureForm(){var box=document.getElementById('msgIndividualFormActionV1');if(!box||box.querySelector('.msg-rel-button')){tryPending();return}var b=document.createElement('button');b.type='button';b.className='msg-rel-button';b.textContent='📋 Relatório de entrega deste morador';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var item=itemFormulario();if(item)abrirIndividual(item)});box.appendChild(b);tryPending()}
function sync(){syncTimer=null;ensureCards();ensureFamily();ensureForm()}
function schedule(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,55)}
function instalar(){instalarModal();var r=results(),f=document.getElementById('formArea');if(!r||!f)return;new MutationObserver(schedule).observe(r,{childList:true,subtree:true});new MutationObserver(schedule).observe(f,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});schedule()}
window.PortalTacsRelatorioMensagensV1={abrirIndividual:abrirIndividual,abrirFamilia:abrirFamilia};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
})();
'''

test_js = r'''const fs=require('fs');const vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8')}function ok(v,m){if(!v)throw new Error(m)}
const backend=read('apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs');const report=read('teste-v1/mensagem-relatorio-entrega-v1.js');const page=read('confirmar-ciencia.html');const panel=read('teste-v1/painel-moradores-v2.html');const build=read('scripts/build_apps_script_release.js');
new vm.Script(backend,{filename:'ZZZZ_42_ComprovacaoMensagensV1.gs'});new vm.Script(report,{filename:'mensagem-relatorio-entrega-v1.js'});
ok(backend.includes('TACS_COMPROVACAO_MENSAGENS_V1'),'marker ausente');
ok(backend.includes("['MENSAGEM_INDIVIDUAL','MENSAGEM_FAMILIA']"),'tipos de mensagem não isolados');
ok(backend.includes("text:'Li e estou ciente'"),'botão explícito de ciência ausente');
ok(backend.includes('confirmar-ciencia.html'),'página de ciência não usada no payload');
ok(backend.includes('publico_mensagem_aberta_token'),'abertura por token ausente');
ok(backend.includes('publico_mensagem_ciente_token'),'ciência por token ausente');
ok(backend.includes('admin_mensagem_relatorio'),'relatório administrativo ausente');
ok(backend.includes("estadoGeral='CIENCIA_TOTAL'"),'estado de ciência total ausente');
ok(page.includes('✅ Li e estou ciente'),'página não exige ciência explícita');
ok(page.includes("executar('publico_mensagem_aberta_token'"),'página não registra abertura');
ok(page.includes("botao.addEventListener('click'"),'ciência não depende de clique explícito');
ok(page.includes("executar('publico_mensagem_ciente_token'"),'clique não registra ciência');
ok(report.includes('📋 Relatório de entrega'),'botão individual de relatório ausente');
ok(report.includes('📋 Relatório da família'),'botão familiar de relatório ausente');
ok(report.includes("escopo:'INDIVIDUAL'"),'consulta individual ausente');
ok(report.includes("escopo:'FAMILIA'"),'consulta familiar ausente');
ok(panel.includes('mensagem-relatorio-entrega-v1.js?v=20260820-ciencia-v1'),'painel não carrega relatório');
ok(build.includes("apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs"),'build não inclui ZZZZ_42');
console.log('Comprovação de ciência e relatório de mensagens V1: contrato aprovado.');
'''

write('apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs', backend)
write('confirmar-ciencia.html', confirm_page)
write('teste-v1/mensagem-relatorio-entrega-v1.js', report_js)
write('scripts/test_comprovacao_ciencia_mensagens_v1.js', test_js)

replace_once(
    'teste-v1/painel-moradores-v2.html',
    '<script src="mensagem-individual-morador-integracao-v1.js?v=20260820-pos-render-v3"></script>',
    '<script src="mensagem-individual-morador-integracao-v1.js?v=20260820-pos-render-v3"></script>\n<script src="mensagem-relatorio-entrega-v1.js?v=20260820-ciencia-v1"></script>'
)
replace_once(
    'scripts/build_apps_script_release.js',
    "  {\n    source: 'apps-script/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs',\n    marker: 'TACS_BUSCA_ENVIO_FAMILIA_V1'\n  }\n];",
    "  {\n    source: 'apps-script/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs',\n    marker: 'TACS_BUSCA_ENVIO_FAMILIA_V1'\n  },\n  {\n    source: 'apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs',\n    marker: 'TACS_COMPROVACAO_MENSAGENS_V1'\n  }\n];"
)
replace_once(
    'package.json',
    'node scripts/test_mensagem_individual_morador_v1.js && node scripts/test_central_admin_territorial.js',
    'node scripts/test_mensagem_individual_morador_v1.js && node scripts/test_comprovacao_ciencia_mensagens_v1.js && node scripts/test_central_admin_territorial.js'
)
print('RELATORIO_CIENCIA_MENSAGENS_V1_APLICADO')
