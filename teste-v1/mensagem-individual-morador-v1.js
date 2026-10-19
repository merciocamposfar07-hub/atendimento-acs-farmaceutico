(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',UBS_TOKEN_KEY='portalConectaUbsTokenV1',DEVICE_KEY='portalTacsDispositivoV1';
var selecionado=null,ultimoEnvio=null,ativa=null,contador=0,timers=[],statusAutoAtivo=false,statusAutoGeracao=0,statusConsultaEmCurso=false,statusAssinatura='',historicoDados=[],historicoCarregando=false;

function txt(v){return String(v==null?'':v).trim()}
function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function familiaEndereco(v){var m=txt(v).toUpperCase().match(/(?:,|\b)(\d{1,4}[A-Z]?)(?=\s*[,.\-]|\s+ZONA\b|\s*$)/);if(!m)return'';var p=m[1].match(/^(\d+)([A-Z]?)$/);return p?(('000'+p[1]).slice(-Math.max(3,p[1].length))+p[2]):m[1]}
function areaId(){var s=document.getElementById('areaSelect');if(s&&s.value)return txt(s.value);try{return txt(new URLSearchParams(location.search).get('area')||new URLSearchParams(location.search).get('areaId')||'JAPARANDUBA')}catch(e){return'JAPARANDUBA'}}
function sessao(extra){
 var core=window.ConectaModuleCoreV1,oficial=null;
 if(core&&typeof core.session==='function'){
   try{oficial=core.session(extra||{})}catch(ignore){}
   if(oficial&&oficial.dispositivo&&(oficial.token||oficial.territorioToken||oficial.ubsToken))return oficial;
 }
 var token='',territorio='',ubs='';
 try{
   token=sessionStorage.getItem(TOKEN_KEY)||'';
   territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
   ubs=sessionStorage.getItem(UBS_TOKEN_KEY)||'';
 }catch(e){}
 var out={dispositivo:(function(){try{return localStorage.getItem(DEVICE_KEY)||''}catch(e){return''}})(),areaId:areaId()};
 if(territorio)out.territorioToken=territorio;
 else if(token)out.token=token;
 else if(ubs)out.ubsToken=ubs;
 Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});
 return out;
}
function rid(prefix){return 'msgv1_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}

function jsonp(action,params,cb){contador++;var nome='__msgind_'+Date.now()+'_'+contador,s=document.createElement('script'),fim=false,t=setTimeout(function(){finish({ok:false,temporario:true,message:'Consulta temporariamente indisponível.'})},12000);function finish(r){if(fim)return;fim=true;clearTimeout(t);try{delete window[nome]}catch(e){window[nome]=undefined}if(s.parentNode)s.remove();cb(r)}window[nome]=finish;s.onerror=function(){finish({ok:false,temporario:true,message:'Falha de rede ao consultar o servidor.'})};var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(nome),'_='+Date.now()];Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});s.src=API+'?'+q.join('&');document.head.appendChild(s)}
function assinaturaMensagem(action,payload){
 var source=JSON.stringify([action,payload.areaId,payload.moradorId,payload.origemAba,payload.origemLinha,payload.tipo,payload.data,payload.hora,payload.mensagem]);
 var h=2166136261;for(var i=0;i<source.length;i++){h^=source.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0).toString(16);
}
function protocoloMensagem(action,payload){
 if(action!=='admin_mensagem_individual_enviar')return rid(action.replace(/^admin_mensagem_individual_/,''));
 var key='csc_individual_operacao_v1',hash=assinaturaMensagem(action,payload),now=Date.now(),old=null;
 try{old=JSON.parse(sessionStorage.getItem(key)||'null')}catch(e){}
 if(old&&old.sig===hash&&old.id&&now-Number(old.at||0)<600000)return old.id;
 var id=rid('enviar');
 try{sessionStorage.setItem(key,JSON.stringify({id:id,sig:hash,at:now}))}catch(e){}
 return id;
}
function finalizar(r){
 if(!ativa)return;
 var op=ativa;ativa=null;clearTimeout(op.timeout);clearTimeout(op.poll);
 if(op.form&&op.form.parentNode)op.form.remove();
 if(op.frame&&op.frame.parentNode)setTimeout(function(){if(op.frame.parentNode)op.frame.remove()},150);
 if(op.action==='admin_mensagem_individual_enviar'&&r&&r.ok===true&&r.enviado===true){
  try{sessionStorage.removeItem('csc_individual_operacao_v1')}catch(e){}
 }
 op.cb(r||{ok:false,message:'A operação ainda não foi confirmada.'});
}
function consultar(){
 if(!ativa)return;
 var op=ativa;
 jsonp(op.action==='admin_mensagem_relatorio'?'admin_mensagem_comprovante_result':'admin_mensagem_individual_result',{requestId:op.id},function(r){
  if(!ativa||ativa.id!==op.id)return;
  if(r&&r.ok===true&&r.pendente===false&&r.result){
   if(r.result.pendente===true){op.poll=setTimeout(consultar,1400);return}
   finalizar(r.result);return;
  }
  op.poll=setTimeout(consultar,1400);
 });
}
window.addEventListener('message',function(event){
 if(!ativa||!ativa.frame||event.source!==ativa.frame.contentWindow)return;
 var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
 if(!d||typeof d!=='object')return;
 var id=txt(d.requestId||(d.result&&d.result.requestId));
 if(id&&id!==ativa.id)return;
 var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null);
 if(r&&r.pendente===true){ativa.poll=setTimeout(consultar,1400);return}
 if(r)finalizar(r);
});
function post(action,payload,cb){
 if(ativa){cb({ok:false,message:'O envio anterior está em andamento. Nenhuma segunda mensagem foi criada.'});return}
 var id=protocoloMensagem(action,payload),frame=document.createElement('iframe'),form=document.createElement('form'),
 frameName='msgIndividualFrame'+Date.now()+Math.floor(Math.random()*1000),fields={};
 Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
 fields.action=action;fields.requestId=id;
 frame.name=frameName;frame.src='about:blank';
 frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01';
 form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.style.display='none';
 Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
 ativa={id:id,action:action,frame:frame,form:form,cb:cb,poll:null,
 timeout:setTimeout(function(){
   if(!ativa||ativa.id!==id)return;
   finalizar({ok:false,pendente:true,eventoId:id,message:'A confirmação ainda não chegou. O protocolo foi preservado; ao tentar novamente não será criada uma segunda mensagem.'});
 },125000)};
 document.body.appendChild(frame);document.body.appendChild(form);
 var enviado=false;
 function enviar(){
  if(enviado||!ativa||ativa.id!==id)return;
  enviado=true;
  try{form.submit()}catch(e){finalizar({ok:false,pendente:true,message:'A conexão ainda não foi confirmada. O protocolo foi preservado.'});return}
  ativa.poll=setTimeout(consultar,550);
 }
 frame.addEventListener('load',enviar,{once:true});setTimeout(enviar,120);
}
function instalar(){if(document.getElementById('msgIndividualMoradorV1'))return;var style=document.createElement('style');style.id='msgIndividualMoradorV1Style';style.textContent='\
.msg-ind-overlay{position:fixed;inset:0;z-index:50000;display:grid;place-items:center;padding:14px;background:rgba(4,29,43,.72);overflow:auto}\
.msg-ind-box{width:min(100%,620px);max-height:94vh;overflow:auto;background:linear-gradient(145deg,#153b58,#102d46);border:0;border-radius:26px;padding:18px;color:#f7fcff;box-shadow:none}\
.msg-ind-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.msg-ind-head h2{margin:0;color:#fff;font-size:1.75rem}.msg-ind-close{width:48px;height:48px;border:0;border-radius:14px;background:#135272;color:#fff;font-size:24px;font-weight:900;box-shadow:none}\
.msg-ind-person{margin:14px 0;padding:14px;border:0;border-radius:18px;background:linear-gradient(145deg,#153b58,#102d46);color:#f7fcff;box-shadow:none}.msg-ind-person strong{display:block;font-size:1.12rem}.msg-ind-person span{display:block;margin-top:4px;color:#d8eef7;font-weight:750}\
.msg-ind-box label{display:block;margin:12px 0 6px;font-weight:900;color:#fff}.msg-ind-field{width:100%;min-height:62px;border:1px solid #2b5a76;border-radius:18px;padding:12px 13px;background:#071827;color:#f7fcff;font:inherit;box-sizing:border-box}.msg-ind-box textarea.msg-ind-field{min-height:110px;resize:vertical}\
.msg-ind-preview{margin-top:14px;padding:14px;border:0;border-radius:18px;background:linear-gradient(145deg,#153b58,#102d46);color:#f7fcff;line-height:1.45;box-shadow:none}.msg-ind-preview strong{display:block;margin-bottom:8px;color:#fff}.msg-ind-preview-edit{width:100%;min-height:128px;border:0;outline:0;resize:vertical;background:#071827;color:#f7fcff;font:inherit;line-height:1.45;box-sizing:border-box}.msg-ind-preview small{display:block;margin-top:8px;color:#adc4d2;font-weight:750}.msg-ind-preview-legacy{display:none!important}\
.msg-ind-actions{display:grid;gap:10px;margin-top:15px}.msg-ind-send,.msg-ind-refresh{min-height:58px;border:0;border-radius:18px;background:#135272;color:#fff;font-weight:900;font-size:1.05rem;box-shadow:none}.msg-ind-send:disabled,.msg-ind-refresh:disabled{opacity:.5}\
.msg-ind-status{margin-top:14px;padding:13px 14px;border:0;border-radius:16px;background:#102d46;color:#f7fcff;font-weight:850;box-shadow:none}.msg-ind-status.ok{border:0;background:#102d46;color:#c7f7d6}.msg-ind-status.warn{border:0;background:#102d46;color:#f5e1b7}.msg-ind-status.err{border:0;background:#102d46;color:#ffd0d5}\
.msg-ind-track{display:grid;gap:8px;margin-top:14px}.msg-ind-step{display:grid;grid-template-columns:34px 1fr;gap:9px;align-items:center;padding:11px;border:0;border-radius:15px;background:#102d46;color:#f7fcff}.msg-ind-step.on{border:0;background:#153b58}.msg-ind-step b{display:block}.msg-ind-step small{display:block;color:#adc4d2;margin-top:2px}.msg-ind-step .msg-ind-icon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#29465a;color:#bfd0d9;font-size:24px}.msg-ind-step.on .msg-ind-icon{background:#15563b;color:#a6efc3}\
.msg-ind-recibo{padding:14px;margin-top:14px;background:#0b344b;border:1px solid #83efa9;border-radius:15px;color:#fff;white-space:pre-wrap;overflow-wrap:anywhere}.msg-ind-recibo b{display:block;color:#83efa9;margin-bottom:8px}.msg-ind-recibo button{display:block;margin-top:10px;width:100%;min-height:46px;background:#176a48;border:0;border-radius:12px;color:white;font-weight:900;font:inherit}\
.msg-ind-note{margin-top:12px;color:#d8eef7;font-size:.9rem;font-weight:700}.msg-ind-hide{display:none!important}#msgIndLivre{display:none!important}\
.msg-ind-card-button{width:100%;min-height:52px;margin-top:10px;border:0;border-radius:16px;background:#135272;color:#fff;font-weight:900;font-size:1rem;box-shadow:none}\
@media(min-width:560px){.msg-ind-actions.two{grid-template-columns:1fr 1fr}}';document.head.appendChild(style);
var overlay=document.createElement('div');overlay.id='msgIndividualMoradorV1';overlay.className='msg-ind-overlay msg-ind-hide';overlay.innerHTML=''
+'<section class="msg-ind-box" role="dialog" aria-modal="true" aria-labelledby="msgIndTitulo">'
+'<div class="msg-ind-head"><div><h2 id="msgIndTitulo">Enviar mensagem</h2><div class="msg-ind-note">Mensagem individual para o cadastro selecionado.</div></div><button id="msgIndFechar" class="msg-ind-close" type="button" aria-label="Fechar">×</button></div>'
+'<div id="msgIndPessoa" class="msg-ind-person"></div>'
+'<label for="msgIndTipo">O que deseja avisar?</label><select id="msgIndTipo" class="msg-ind-field"><option value="CONFIRMAR_ATENDIMENTO">Confirmar atendimento</option><option value="ALTERAR_DATA">Alterar data</option><option value="LEMBRETE">Lembrete</option><option value="CANCELAMENTO">Cancelamento</option><option value="OUTRA_MENSAGEM">Outra mensagem</option></select>'
+'<div id="msgIndDadosAtendimento"><label for="msgIndServico">Serviço</label><input id="msgIndServico" class="msg-ind-field" type="text" maxlength="120" placeholder="Ex.: Atendimento médico"><label for="msgIndData">Data</label><input id="msgIndData" class="msg-ind-field" type="text" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="DD/MM/AAAA"><label for="msgIndHora">Horário</label><input id="msgIndHora" class="msg-ind-field" type="text" maxlength="22" autocomplete="off" placeholder="Ex.: 08:00 às 11:00 hs"></div>'
+'<div id="msgIndLivre" class="msg-ind-hide"><label for="msgIndMensagem">Mensagem</label><textarea id="msgIndMensagem" class="msg-ind-field" maxlength="700" placeholder="Digite uma mensagem curta e objetiva."></textarea><div class="msg-ind-note">Não coloque diagnóstico, CPF, CNS ou outra informação clínica sensível na notificação.</div></div>'
+'<div id="msgIndPreview" class="msg-ind-preview"><strong>Prévia / mensagem a enviar</strong><textarea id="msgIndPreviewTexto" class="msg-ind-preview-edit" maxlength="700" aria-label="Prévia editável da mensagem"></textarea><small>Este é exatamente o texto que será enviado.</small><span class="msg-ind-preview-legacy"></span></div>'
+'<div class="msg-ind-actions"><button id="msgIndEnviar" class="msg-ind-send" type="button">🔔 Enviar para este morador</button></div>'
+'<section class="msg-ind-recibo" id="msgIndHistorico"><button id="msgIndHistoricoBotao" type="button">📂 Ver mensagens anteriores e comprovantes</button><div id="msgIndHistoricoLista" class="msg-ind-hide" aria-live="polite"></div></section>'+'<div id="msgIndStatus" class="msg-ind-status" aria-live="polite">Confira a mensagem antes de enviar.</div>'+'<div id="msgIndRecibo" class="msg-ind-recibo msg-ind-hide" role="status" aria-live="polite"><b>Cópia do envio para o operador</b><div id="msgIndReciboTexto"></div><button id="msgIndCopiar" type="button">Copiar comprovante de encaminhamento</button></div>'
+'<div id="msgIndTrack" class="msg-ind-track msg-ind-hide">'
+'<div id="msgStepEnc" class="msg-ind-step"><span class="msg-ind-icon" aria-hidden="true">◯</span><div><b>Encaminhada</b><small>O serviço Push aceitou o encaminhamento.</small></div></div>'
+'<div id="msgStepExib" class="msg-ind-step"><span class="msg-ind-icon" aria-hidden="true">◯</span><div><b>Exibida no aparelho</b><small>O aparelho confirmou a exibição técnica.</small></div></div>'
+'<div id="msgStepAberta" class="msg-ind-step"><span class="msg-ind-icon" aria-hidden="true">◯</span><div><b>Aberta</b><small>O morador abriu a notificação.</small></div></div>'
+'<div id="msgStepConf" class="msg-ind-step"><span class="msg-ind-icon" aria-hidden="true">◯</span><div><b>Recebimento confirmado</b><small>O morador confirmou expressamente.</small></div></div>'
+'<button id="msgIndAtualizar" class="msg-ind-refresh" type="button">↻ Atualizar confirmação</button></div>'
+'</section>';document.body.appendChild(overlay);
['msgIndTipo','msgIndServico','msgIndData','msgIndHora'].forEach(function(id){var n=document.getElementById(id);if(n){n.addEventListener('input',atualizarFormulario);n.addEventListener('change',atualizarFormulario)}});document.getElementById('msgIndPreviewTexto').addEventListener('input',function(){document.getElementById('msgIndMensagem').value=this.value});
document.getElementById('msgIndFechar').addEventListener('click',fechar);document.getElementById('msgIndEnviar').addEventListener('click',enviar);document.getElementById('msgIndAtualizar').addEventListener('click',atualizarStatus);document.getElementById('msgIndHistoricoBotao').addEventListener('click',abrirHistorico);document.getElementById('msgIndHistoricoLista').addEventListener('click',baixarHistorico);document.getElementById('msgIndCopiar').addEventListener('click',function(){var text=document.getElementById('msgIndReciboTexto').textContent;if(!text)return;try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).catch(function(){})}catch(e){}});overlay.addEventListener('click',function(e){if(e.target===overlay)fechar()});
}

function setStatus(msg,tipo){var n=document.getElementById('msgIndStatus');if(!n)return;n.textContent=msg;n.className='msg-ind-status'+(tipo?' '+tipo:'')}
function limparTimers(){
 statusAutoAtivo=false;
 statusAutoGeracao++;
 timers.forEach(clearTimeout);timers=[];
}
function painelMensagemAberto(){
 var painel=document.getElementById('msgIndividualMoradorV1');
 return Boolean(painel&&!painel.classList.contains('msg-ind-hide')&&ultimoEnvio&&selecionado);
}
function planejarStatus(ms){
 if(!statusAutoAtivo||!painelMensagemAberto())return;
 var geracao=statusAutoGeracao;
 var id=setTimeout(function(){
   timers=timers.filter(function(x){return x!==id});
   if(geracao!==statusAutoGeracao||!painelMensagemAberto())return;
   if(document.hidden){planejarStatus(6000);return}
   atualizarStatus(true);
 },ms);
 timers.push(id);
}
function retomarStatus(){
 if(!statusAutoAtivo||!painelMensagemAberto()||document.hidden)return;
 timers.forEach(clearTimeout);timers=[];
 if(!statusConsultaEmCurso)planejarStatus(150);
}
document.addEventListener('visibilitychange',function(){if(!document.hidden)retomarStatus()});
window.addEventListener('focus',retomarStatus);
function fechar(){limparTimers();var n=document.getElementById('msgIndividualMoradorV1');if(n)n.classList.add('msg-ind-hide')}
function mascararData(v){var d=txt(v).replace(/\D/g,'').slice(0,8);if(d.length>4)return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);if(d.length>2)return d.slice(0,2)+'/'+d.slice(2);return d}
function dataVisual(v){var d=txt(v);var iso=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(iso)return iso[3]+'/'+iso[2]+'/'+iso[1];return d}
function horarioVisual(v){var h=txt(v).replace(/\s+/g,' '),m=h.match(/^([01]\d|2[0-3]):([0-5]\d)\s*(?:a|as|às|-)\s*([01]\d|2[0-3]):([0-5]\d)\s*(?:h|hs)?$/i);if(m)return'das '+m[1]+':'+m[2]+' às '+m[3]+':'+m[4]+' hs';if(/^([01]\d|2[0-3]):[0-5]\d$/.test(h))return'às '+h;return h}
function horarioValido(v){var h=txt(v);return !h||/^([01]\d|2[0-3]):[0-5]\d$/.test(h)||/^([01]\d|2[0-3]):[0-5]\d\s*(?:a|as|às|-)\s*([01]\d|2[0-3]):[0-5]\d\s*(?:h|hs)?$/i.test(h)}
function preview(){var tipo=txt(document.getElementById('msgIndTipo').value),servico=txt(document.getElementById('msgIndServico').value),data=dataVisual(document.getElementById('msgIndData').value),hora=horarioVisual(document.getElementById('msgIndHora').value),nome=txt(selecionado&&selecionado.nome).split(' ')[0]||'Morador';if(tipo==='OUTRA_MENSAGEM')return'';if(!servico||!data)return'Informe o serviço e a data para montar a mensagem.';var quando=data+(hora?', '+hora:'');if(tipo==='CONFIRMAR_ATENDIMENTO')return nome+', seu atendimento de '+servico+' está confirmado para '+quando+'.';if(tipo==='ALTERAR_DATA')return nome+', a nova data do seu atendimento de '+servico+' é '+quando+'.';if(tipo==='LEMBRETE')return nome+', lembramos que seu atendimento de '+servico+' será em '+quando+'.';return nome+', seu atendimento de '+servico+', previsto para '+quando+', foi cancelado. Aguarde nova orientação do TACS.'}
function atualizarFormulario(event){var tipo=document.getElementById('msgIndTipo').value,livre=tipo==='OUTRA_MENSAGEM',dados=document.getElementById('msgIndDadosAtendimento'),campo=document.getElementById('msgIndPreviewTexto');if(event&&event.target&&event.target.id==='msgIndData'){var mascarada=mascararData(event.target.value);if(event.target.value!==mascarada)event.target.value=mascarada}dados.classList.toggle('msg-ind-hide',livre);document.getElementById('msgIndLivre').classList.add('msg-ind-hide');if(livre){campo.placeholder='Digite aqui a mensagem que será enviada.';if(event&&event.target&&event.target.id==='msgIndTipo')campo.value=''}else{campo.placeholder='A mensagem será montada automaticamente.';campo.value=preview()}document.getElementById('msgIndMensagem').value=campo.value}
function resetTrack(){statusAssinatura='';['msgStepEnc','msgStepExib','msgStepAberta','msgStepConf'].forEach(function(id){marcar(id,false,'')});document.getElementById('msgIndTrack').classList.add('msg-ind-hide')}
/* Hora do encaminhamento: instante imutável embutido no ID deste envio.
   Usa o fuso da área (Recife) sem alterar comprovantes nem horários de leitura. */
function horarioEnvioRecifePeloEvento(evento){
  var match=txt(evento).match(/^msgv1_enviar_(\d{13})_[a-z0-9]+$/i);
  if(!match)return '';
  var data=new Date(Number(match[1]));
  if(!Number.isFinite(data.getTime()))return '';
  try{
    var partes=new Intl.DateTimeFormat('pt-BR',{
      timeZone:'America/Recife',hourCycle:'h23',
      day:'2-digit',month:'2-digit',year:'numeric',
      hour:'2-digit',minute:'2-digit',second:'2-digit'
    }).formatToParts(data),campos={};
    partes.forEach(function(parte){campos[parte.type]=parte.value});
    return campos.day+'/'+campos.month+'/'+campos.year+' '+campos.hour+':'+campos.minute+':'+campos.second;
  }catch(e){return ''}
}
function marcar(id,ativo,quando){
 var n=document.getElementById(id);if(!n)return;
 n.classList.toggle('on',Boolean(ativo));
 var simbolo=n.querySelector('.msg-ind-icon');
 if(simbolo)simbolo.textContent=ativo?({msgStepEnc:'📤',msgStepExib:'🔔',msgStepAberta:'👆',msgStepConf:'✅'}[id]||'✓'):'◯';
 var small=n.querySelector('small');
 if(id==='msgStepEnc'&&ativo){
   var horario=horarioEnvioRecifePeloEvento(ultimoEnvio&&ultimoEnvio.eventoId);
   if(horario)quando=horario;
 }
 if(ativo&&quando)small.textContent='Confirmado em '+quando;
 else if(ativo)small.textContent={
   msgStepEnc:'O serviço Push aceitou o encaminhamento.',
   msgStepExib:'O aparelho confirmou a exibição técnica.',
   msgStepAberta:'A notificação foi aberta.',
   msgStepConf:'O morador confirmou expressamente.'
 }[id];
 else small.textContent={
   msgStepEnc:'Aguardando encaminhamento.',
   msgStepExib:'Aguardando registro de exibição no aparelho.',
   msgStepAberta:'Aguardando abertura pelo morador.',
   msgStepConf:'Aguardando o morador tocar em “Li e estou ciente”.'
 }[id];
}
function comprovanteOperador(info){
 var recibo=document.getElementById('msgIndRecibo'),campo=document.getElementById('msgIndReciboTexto');
 if(!recibo||!campo)return;
 if(!info||!info.eventoId){recibo.classList.add('msg-ind-hide');campo.textContent='';return}
 campo.textContent='Protocolo: '+txt(info.eventoId)+'\nDestinatário: '+txt(info.destinatario)+'\nData/hora (Brasília): '+txt(info.encaminhadoEm)+
 '\nMensagem encaminhada:\n'+txt(info.mensagem)+'\nSituação: aceita pelo serviço Push. A entrega e leitura dependem da confirmação do aparelho.';
 recibo.classList.remove('msg-ind-hide');
 /* Aviso local apenas se a permissão de notificações já tiver sido concedida;
    nunca registra outro aparelho como destinatário nem solicita nova permissão. */
 try{
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  var title='CSC — Cópia de mensagem individual encaminhada';
  var body='Protocolo '+txt(info.eventoId)+' aceito pelo serviço Push. Consulte o comprovante no painel.';
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration){
   navigator.serviceWorker.getRegistration('/atendimento-acs-farmaceutico/push/').then(function(reg){
     if(reg&&typeof reg.showNotification==='function')return reg.showNotification(title,{body:body,tag:'csc-msgind-'+txt(info.eventoId),renotify:false});
   }).catch(function(){});
  }else{new Notification(title,{body:body,tag:'csc-msgind-'+txt(info.eventoId)})}
 }catch(e){}
}
function renderStatus(r){
 if(!r||r.ok!==true||!ultimoEnvio||txt(r.eventoId)!==txt(ultimoEnvio.eventoId))return;
 var h=r.horarios||{},assinatura=JSON.stringify([r.eventoId,r.encaminhadas,r.exibidas,r.abertas,r.confirmadas,h.encaminhada,h.exibida,h.aberta,h.confirmada]);
 if(statusAssinatura===assinatura)return;
 statusAssinatura=assinatura;
 document.getElementById('msgIndTrack').classList.remove('msg-ind-hide');
 marcar('msgStepEnc',Number(r.encaminhadas)>0,h.encaminhada);
 marcar('msgStepExib',Number(r.exibidas)>0,h.exibida);
 marcar('msgStepAberta',Number(r.abertas)>0,h.aberta);
 marcar('msgStepConf',Number(r.confirmadas)>0,h.confirmada);
 if(Number(r.confirmadas)>0)setStatus('✅ '+txt(r.morador&&r.morador.nome||selecionado&&selecionado.nome)+' confirmou o recebimento.','ok');
 else if(Number(r.abertas)>0)setStatus('Notificação aberta. Aguardando confirmação expressa do morador.','warn');
 else if(Number(r.exibidas)>0)setStatus('Notificação exibida no aparelho. Aguardando abertura pelo morador.','warn');
 else if(Number(r.encaminhadas)>0)setStatus('Encaminhada ao Push. Aguardando confirmação no aparelho.','warn');
}
function atualizarStatus(automatica){
 if(!ultimoEnvio||!selecionado||!painelMensagemAberto())return;
 if(statusConsultaEmCurso||ativa){if(automatica&&statusAutoAtivo)planejarStatus(1800);return}
 var evento=ultimoEnvio.eventoId,geracao=statusAutoGeracao,b=document.getElementById('msgIndAtualizar');
 statusConsultaEmCurso=true;b.disabled=true;
 post('admin_mensagem_individual_status',sessao({
   eventoId:evento,origemAba:selecionado.origemAba,origemLinha:selecionado.origemLinha,moradorId:selecionado.moradorId||''
 }),function(r){
   statusConsultaEmCurso=false;b.disabled=false;
   if(geracao!==statusAutoGeracao||!painelMensagemAberto()||ultimoEnvio.eventoId!==evento)return;
   if(!r||r.ok!==true){
     if(!automatica)setStatus(txt(r&&r.message)||'Não foi possível consultar a confirmação.','err');
     if(statusAutoAtivo)planejarStatus(8000);return;
   }
   renderStatus(r);
   if(Number(r.confirmadas)>0){statusAutoAtivo=false;timers.forEach(clearTimeout);timers=[];return}
   if(statusAutoAtivo)planejarStatus(Number(r.abertas)>0?4000:5500);
 });
}
function agendarAtualizacoes(){
 limparTimers();statusAutoAtivo=true;
 if(painelMensagemAberto())planejarStatus(2200);
}

function abrirHistorico(){
 if(historicoCarregando||!selecionado)return;
 var box=document.getElementById('msgIndHistoricoLista'),pessoa=selecionado;
 box.classList.remove('msg-ind-hide');
 box.textContent='Aguarde… recuperando mensagens e comprovantes anteriores.';
 historicoCarregando=true;
 post('admin_mensagem_relatorio',sessao({escopo:'INDIVIDUAL',origemAba:pessoa.origemAba,origemLinha:pessoa.origemLinha,moradorId:pessoa.moradorId||''}),function(r){
   historicoCarregando=false;
   if(selecionado!==pessoa)return;
   if(!r||r.ok!==true){box.textContent='Falha ao consultar o histórico. Toque novamente para tentar.';return}
   historicoDados=Array.isArray(r.historico)?r.historico:[];
   box.replaceChildren();
   if(!historicoDados.length){box.textContent='Nenhuma mensagem anterior encontrada para este cadastro.';return}
   historicoDados.forEach(function(item,idx){
     var card=document.createElement('article'),title=document.createElement('strong'),when=document.createElement('p'),msg=document.createElement('p'),button=document.createElement('button');
     card.style.cssText='padding:12px;margin-top:12px;border:1px solid #42778a;border-radius:12px;white-space:pre-wrap';
     title.textContent=txt(item.titulo)||'Mensagem individual';
     when.textContent='Registro: '+txt(item.registradoEm)+' — '+txt(item.estado);
     msg.textContent=txt(item.mensagem);
     button.type='button';button.dataset.historicoIndice=String(idx);button.textContent='Baixar comprovante e etapas';
     card.appendChild(title);card.appendChild(when);card.appendChild(msg);card.appendChild(button);box.appendChild(card);
   });
 });
}
function baixarHistorico(e){
 var btn=e.target&&e.target.closest&&e.target.closest('[data-historico-indice]');
 if(!btn)return;
 var item=historicoDados[Number(btn.dataset.historicoIndice)];
 if(!item)return;
 var linhas=['PORTAL CSC — COMPROVANTE TÉCNICO DE MENSAGEM INDIVIDUAL','Protocolo: '+txt(item.eventoId),'Mensagem registrada em: '+txt(item.registradoEm),'Estado: '+txt(item.estado),'Título: '+txt(item.titulo),'Mensagem: '+txt(item.mensagem)];
 (item.aparelhos||[]).forEach(function(a,i){
   linhas.push('Aparelho '+(i+1)+' / referência técnica '+txt(a.referenciaTecnica));
   linhas.push('Encaminhada: '+(txt(a.encaminhadoEm)||'Sem confirmação'));
   linhas.push('Exibida: '+(txt(a.exibidoEm)||'Sem confirmação'));
   linhas.push('Aberta: '+(txt(a.abertoEm)||'Sem confirmação'));
   linhas.push('Ciência: '+(txt(a.cienteEm)||'Sem confirmação'));
 });
 linhas.push('Aceite de encaminhamento, exibição, abertura e ciência são estados distintos.');
 var blob=new Blob([linhas.join('\n')],{type:'text/plain;charset=utf-8'});
 var uri=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=uri;anchor.download='CSC-'+txt(item.eventoId).replace(/[^a-zA-Z0-9_-]/g,'')+'.txt';
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 setTimeout(function(){URL.revokeObjectURL(uri)},5000);
}
function enviar(){if(!selecionado)return;var tipo=document.getElementById('msgIndTipo').value,servico=txt(document.getElementById('msgIndServico').value),data=txt(document.getElementById('msgIndData').value),hora=txt(document.getElementById('msgIndHora').value),mensagem=txt(document.getElementById('msgIndPreviewTexto').value);document.getElementById('msgIndMensagem').value=mensagem;if(tipo!=='OUTRA_MENSAGEM'&&(!servico||!data)){setStatus('Informe o serviço e a data.','err');return}if(data&&!/^(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/.test(data)){setStatus('Informe a data no formato DD/MM/AAAA.','err');return}if(!horarioValido(hora)){setStatus('Informe um horário como 08:00 ou 08:00 às 11:00 hs.','err');return}if(mensagem.length<3||/^Informe o serviço/.test(mensagem)){setStatus('Confira a mensagem que será enviada.','err');return}var b=document.getElementById('msgIndEnviar');b.disabled=true;setStatus('Enviando somente para o cadastro familiar deste morador…','warn');post('admin_mensagem_individual_enviar',sessao({origemAba:selecionado.origemAba,origemLinha:selecionado.origemLinha,moradorId:selecionado.moradorId||'',tipo:tipo,servico:servico,data:data,hora:hora,mensagem:mensagem}),function(r){b.disabled=false;if(!r||r.ok!==true){setStatus(txt(r&&r.message)||'O envio foi recusado pelo servidor.','err');return}if(r.enviado!==true){ultimoEnvio=null;comprovanteOperador(null);resetTrack();setStatus(txt(r.message)||'Nenhum aparelho apto foi encontrado para este morador.','warn');return}ultimoEnvio={eventoId:r.eventoId};comprovanteOperador(r.comprovante||null);document.getElementById('msgIndTrack').classList.remove('msg-ind-hide');marcar('msgStepEnc',Number(r.encaminhadas)>0,'');setStatus('📤 Mensagem encaminhada para '+Number(r.encaminhadas||0)+' aparelho(s). Acompanhando a confirmação…','ok');agendarAtualizacoes()})}

function abrir(item){instalar();selecionado=item||null;ultimoEnvio=null;historicoDados=[];historicoCarregando=false;var caixaHistorico=document.getElementById('msgIndHistoricoLista');if(caixaHistorico){caixaHistorico.replaceChildren();caixaHistorico.classList.add('msg-ind-hide')}limparTimers();resetTrack();comprovanteOperador(null);if(!selecionado)return;var familia=txt(item.familiaId)||familiaEndereco(item.endereco);document.getElementById('msgIndPessoa').innerHTML='<strong>'+esc(item.nome||'Morador')+'</strong><span>Cadastro familiar '+esc(familia||'não identificado')+'</span>';document.getElementById('msgIndTipo').value='CONFIRMAR_ATENDIMENTO';document.getElementById('msgIndServico').value='';document.getElementById('msgIndData').value='';document.getElementById('msgIndHora').value='';document.getElementById('msgIndMensagem').value='';document.getElementById('msgIndPreviewTexto').value='';document.getElementById('msgIndividualMoradorV1').classList.remove('msg-ind-hide');setStatus('Confira a mensagem antes de enviar.','');atualizarFormulario();setTimeout(function(){document.getElementById('msgIndServico').focus()},50)}
window.PortalTacsMensagemIndividual={abrir:abrir};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar);else instalar();
})();
