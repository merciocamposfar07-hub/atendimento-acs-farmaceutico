/** Anexos privados da UBS. Reutiliza a planilha e as permissões existentes.
 * Conteúdo separado da lista: somente carregado após autenticação e abertura. */
var CSC_ANEXOS_UBS_V1={META:'CSC_UBS_ANEXOS',PARTS:'CSC_UBS_ANEXOS_CONTEUDO',CHUNK:40000,MAX_BYTES:8*1024*1024};
var cscAnexosUbsPostAnterior_,cscAnexosUbsListaAnterior_,cscAnexosUbsGetAnterior_;
(function(){
 if(typeof doGet==='function'){cscAnexosUbsGetAnterior_=doGet;doGet=function(e){var p=e&&e.parameter||{};if(p.action==='admin_solicitacao_ubs_pdf'&&p.ticket)return cscAnexosUbsAbrirTicket_(p);if(p.action==='csc_ubs_anexos_status')return solicitacoesUbsV1ResponderJson_({ok:true,versao:'1.0.2',reciboAntesPush:true,ticketPrivado:true,visualizadorPaginas:true,pdfPrivado:true,maxBytes:CSC_ANEXOS_UBS_V1.MAX_BYTES},p.callback);return cscAnexosUbsGetAnterior_(e)}}
 if(typeof doPost==='function'){cscAnexosUbsPostAnterior_=doPost;doPost=function(e){var p=e&&e.parameter||{};if(p.action==='admin_solicitacao_ubs_pdf_preparar')return cscAnexosUbsPrepararPost_(p);if(p.action==='publico_solicitacao_ubs_anexo')return cscAnexosUbsPost_(p);if(p.action==='admin_solicitacao_ubs_pdf')return cscAnexosUbsAbrir_(p);return cscAnexosUbsPostAnterior_(e)}}
 if(typeof solicitacoesUbsV1Listar_==='function'){cscAnexosUbsListaAnterior_=solicitacoesUbsV1Listar_;solicitacoesUbsV1Listar_=function(ctx){var r=cscAnexosUbsListaAnterior_(ctx),map=cscAnexosUbsMapa_(ctx.contexto.areaId);(r.solicitacoes||[]).forEach(function(item){var m=map[item.codigoSolicitacao];if(m)item.anexo={disponivel:m[9]==='RECEBIDO',nome:m[4],bytes:Number(m[5])||0,status:m[9]}});return r}}
})();
function cscAnexosUbsSheet_(name,create){
 var ss=tacsTerritorioV1Planilha_(),s=ss.getSheetByName(name);if(!s&&create){s=ss.insertSheet(name);var headers=name===CSC_ANEXOS_UBS_V1.META?['CHAVE','AREA','CODIGO','DOCUMENTO','NOME','BYTES','CHAVE_HASH','PRIMEIRA_LINHA','PARTES','STATUS','HASH','CRIADO_EM']:['CHAVE','PDF_BASE64'];s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1)}return s;
}
function cscAnexosUbsRows_(){var s=cscAnexosUbsSheet_(CSC_ANEXOS_UBS_V1.META,false);return s&&s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,12).getValues():[]}
function cscAnexosUbsMapa_(area){var out={};cscAnexosUbsRows_().forEach(function(r){if(String(r[1])===String(area))out[String(r[2])]=r});return out}
function cscAnexosUbsFind_(key){var rows=cscAnexosUbsRows_();for(var i=rows.length-1;i>=0;i--)if(String(rows[i][0])===key)return {row:i+2,data:rows[i]};return null}
function cscAnexosUbsPost_(p){
 var id=String(p.requestId||''),result;
 try{id=solicitacoesUbsV1ValidarRequestId_(id);result=cscAnexosUbsSalvar_(p)}catch(e){var message=solicitacoesUbsV1Erro_(e);result={ok:false,message:message,temporario:/Aguarde|outra solicitação|Lock|temporar|Internal error|Service unavailable/i.test(message)}}
 if(/^[A-Za-z0-9_-]{8,160}$/.test(id))solicitacoesUbsV1GuardarResultado_(id,result);
 return solicitacoesUbsV1ResponderPost_(id,result);
}
function cscAnexosUbsSalvar_(p){
 var contexto=identificacaoFamiliarPublicaV1Contexto_(p.areaId||''),area=contexto.areaId,code=solicitacoesUbsV1Codigo_(p.codigoSolicitacao),doc=solicitacoesUbsV1Documento_(p.documento),key=area+'|'+code,secret=String(p.anexoChave||''),encoded=String(p.pdfBase64||'');
 if(!/^[a-f0-9]{64}$/.test(secret))throw new Error('Identificação do envio do documento inválida.');
 if(!encoded||encoded.length>Math.ceil(CSC_ANEXOS_UBS_V1.MAX_BYTES/3)*4||!/^JVBERi0[A-Za-z0-9+/=\r\n]*$/.test(encoded))throw new Error('Envie um PDF válido de até 8 MB.');
 var bytes=Utilities.base64Decode(encoded);if(bytes.length>CSC_ANEXOS_UBS_V1.MAX_BYTES)throw new Error('O PDF excede 8 MB.');
 var hash=conectaAcessoV1Hash_(encoded),secretHash=conectaAcessoV1Hash_(secret),meta=cscAnexosUbsSheet_(CSC_ANEXOS_UBS_V1.META,true),lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw new Error('Aguarde a operação de envio em andamento.');
 try{
  var found=cscAnexosUbsFind_(key);
  if(found){
   if(String(found.data[3])!==doc||!conectaAcessoV1Seguro_(String(found.data[6]),secretHash))throw new Error('Este documento pertence a outro envio. Faça uma nova solicitação.');
   if(found.data[9]==='RECEBIDO'){if(String(found.data[10])!==hash)throw new Error('O documento desta solicitação já foi recebido.');return {ok:true,anexoRecebido:true,codigoSolicitacao:code,duplicada:true}}
  }else{
   var existing=solicitacoesUbsV1LocalizarCodigo_(solicitacoesUbsV1Sheet_(),area,code);
   if(existing)throw new Error('Esta solicitação já existe sem vínculo de anexo. Envie uma nova solicitação com o documento.');
   var resident=identificacaoFamiliarPublicaV1LocalizarUnico_(doc,contexto);if(!resident||!resident.morador)throw new Error('Cadastro do morador não localizado.');
   meta.appendRow([key,area,code,doc,'Solicitacao-'+code+'.pdf',bytes.length,secretHash,'','','EM_ENVIO',hash,new Date()]);
  }
 }finally{lock.releaseLock()}
 var receipt=null;
 function salvarConteudo(){
  if(!lock.tryLock(10000))throw new Error('Aguarde a operação de envio em andamento.');
  try{
   var entry=cscAnexosUbsFind_(key);
   if(!entry)throw new Error('Vínculo do documento não localizado.');
   if(entry.data[9]!=='RECEBIDO'){
    var chunks=[];for(var i=0;i<encoded.length;i+=CSC_ANEXOS_UBS_V1.CHUNK)chunks.push([key,encoded.slice(i,i+CSC_ANEXOS_UBS_V1.CHUNK)]);
    var storage=cscAnexosUbsSheet_(CSC_ANEXOS_UBS_V1.PARTS,true),start=storage.getLastRow()+1,needed=start+chunks.length-1;
    if(needed>storage.getMaxRows())storage.insertRowsAfter(storage.getMaxRows(),needed-storage.getMaxRows());
    var range=storage.getRange(start,1,chunks.length,2);range.setNumberFormat('@');range.setValues(chunks);
    var values=entry.data;values[7]=start;values[8]=chunks.length;values[9]='RECEBIDO';values[10]=hash;
    meta.getRange(entry.row,1,1,12).setValues([values]);SpreadsheetApp.flush();
   }
  }finally{lock.releaseLock()}
  receipt={ok:true,anexoRecebido:true,codigoSolicitacao:code,message:'Solicitação e PDF recebidos pela UBS.'};
  // Recibo somente depois de ambas as gravações, sem aguardar o serviço de notificação.
  if(/^[A-Za-z0-9_-]{8,160}$/.test(String(p.requestId||'')))solicitacoesUbsV1GuardarResultado_(p.requestId,receipt);
 }
 solicitacoesUbsV1CriarPublica_(p,salvarConteudo);
 if(!receipt)salvarConteudo();
 return receipt;
}

function cscAnexosUbsLerPrivado_(p){
 var ctx=solicitacoesUbsV1ContextoAdmin_(p);return cscAnexosUbsConteudo_(ctx.contexto.areaId,solicitacoesUbsV1Codigo_(p.codigoSolicitacao));
}
function cscAnexosUbsConteudo_(area,code){
 var entry=cscAnexosUbsFind_(area+'|'+code);
 if(!entry||entry.data[9]!=='RECEBIDO')throw new Error('Documento ainda não disponível nesta área.');
 var m=entry.data,s=cscAnexosUbsSheet_(CSC_ANEXOS_UBS_V1.PARTS,false);if(!s)throw new Error('Documento indisponível.');
 var range=s.getRange(Number(m[7]),1,Number(m[8]),2),rows=range.getValues();
 if(rows.some(function(r){return String(r[0])!==String(m[0])}))throw new Error('Vínculo do documento inválido.');
 var encoded=rows.map(function(r){return String(r[1])}).join('');
 if(!conectaAcessoV1Seguro_(conectaAcessoV1Hash_(encoded),String(m[10]))){
  // Recupera texto legado interpretado pela planilha como fórmula, mantendo a conferência do hash.
  var formulas=range.getFormulas();encoded=rows.map(function(r,i){var formula=String(formulas[i][1]||'');return formula.indexOf('=+')===0?formula.slice(1):String(r[1])}).join('');
  if(!conectaAcessoV1Seguro_(conectaAcessoV1Hash_(encoded),String(m[10])))throw new Error('O PDF armazenado não passou na verificação de integridade. O arquivo original precisa ser reenviado.');
 }
 return {nome:String(m[4]),base64:encoded};
}
function cscAnexosUbsAbrir_(p){
 try{
  return cscAnexosUbsRender_(cscAnexosUbsLerPrivado_(p),p.viewerNonce);
 }catch(e){return cscAnexosUbsErroHtml_(e,p.viewerNonce)}
}
function cscAnexosUbsRender_(pdf,viewerNonce){
  var nonce=/^[a-zA-Z0-9_:-]{1,120}$/.test(String(viewerNonce||''))?String(viewerNonce):'';
  var payload=JSON.stringify({nome:pdf.nome,base64:pdf.base64,viewerNonce:nonce}).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Documento da solicitação - UBS</title><style>body{margin:0;background:#062c46;color:white;font:17px Arial;overflow-x:hidden}main{max-width:1000px;margin:auto;padding:12px}nav{display:flex;gap:8px;flex-wrap:wrap}button,a{padding:12px;border-radius:10px;color:#fff;background:#12435b;border:1px solid #62c8e8;font:inherit}button[aria-pressed="true"]{background:#176b4b}a{display:inline-block;color:#70e39f;margin:12px 0}#download,#showDocument,#showCard{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;min-height:96px;padding:22px 20px;font-size:clamp(26px,4vw,36px);font-weight:800;line-height:1.3;text-align:center;border-radius:16px}[hidden]{display:none!important}</style><main><p id="status" role="status">AGUARDE… carregando todas as páginas do documento.</p><a id="download">Baixar PDF completo</a><nav><button id="showDocument" type="button" aria-pressed="true">Ver receita / requisição</button><button id="showCard" type="button" aria-pressed="false">Ver card da solicitação</button></nav><div id="pages"></div></main><script>window.CSC_UBS_PDF='+payload+';<\/script><script type="module" src="https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/ubs-pdf-viewer-v2.js?v=20261019-ubs-inline-perf-v1"><\/script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function cscAnexosUbsErroHtml_(e,viewerNonce){
 var nonce=/^[a-zA-Z0-9_:-]{1,120}$/.test(String(viewerNonce||''))?String(viewerNonce):'';
 var message=String(e&&e.message||'Não foi possível abrir o PDF.').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
 return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><h2>Não foi possível abrir o PDF</h2><p>'+message+'</p><p>Volte à Central para tentar novamente.</p><script>try{parent.postMessage({type:"CSC_UBS_PDF_ERROR",nonce:'+JSON.stringify(nonce)+'},"*")}catch(e){}<\/script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function cscAnexosUbsPrepararPost_(p){
 var id=String(p.requestId||''),result;
 try{
  id=solicitacoesUbsV1ValidarRequestId_(id);
  var ctx=solicitacoesUbsV1ContextoAdmin_(p),code=solicitacoesUbsV1Codigo_(p.codigoSolicitacao),entry=cscAnexosUbsFind_(ctx.contexto.areaId+'|'+code);
  if(!entry||entry.data[9]!=='RECEBIDO')throw new Error('O documento ainda está em envio. Aguarde a confirmação e tente novamente.');
  var ticket=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  CacheService.getScriptCache().put('csc_ubs_pdf_ticket_v1_'+ticket,JSON.stringify({area:ctx.contexto.areaId,code:code}),120);
  result={ok:true,ticket:ticket};
 }catch(e){result={ok:false,message:solicitacoesUbsV1Erro_(e)}}
 if(/^[A-Za-z0-9_-]{8,160}$/.test(id))solicitacoesUbsV1GuardarResultado_(id,result);
 return solicitacoesUbsV1ResponderPost_(id,result);
}
function cscAnexosUbsAbrirTicket_(p){
 try{
  var ticket=String(p.ticket||'');if(!/^[a-f0-9]{64}$/i.test(ticket))throw new Error('Autorização do PDF inválida.');
  var cache=CacheService.getScriptCache(),key='csc_ubs_pdf_ticket_v1_'+ticket,raw='',lock=LockService.getScriptLock();
  if(!lock.tryLock(3000))throw new Error('Aguarde a abertura do PDF em andamento.');
  try{raw=cache.get(key);if(raw)cache.remove(key)}finally{lock.releaseLock()}
  if(!raw)throw new Error('A autorização para abrir este PDF expirou. Abra-o novamente pela Central.');
  var grant=JSON.parse(raw);
  return cscAnexosUbsRender_(cscAnexosUbsConteudo_(grant.area,grant.code));
 }catch(e){return cscAnexosUbsErroHtml_(e)}
}
