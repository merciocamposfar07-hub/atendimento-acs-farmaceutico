/* CSC: módulo aditivo. Não modifica sessão, PIN, família, agenda nem formulário original. */
(function(){
'use strict';
if(window.CSC_TERCEIROS_ENABLED!==true)return;
if(window.CscSolicitacaoTerceirosV1)return;
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var AREA='JAPARANDUBA',WHATSAPP='5581989613130',chosen=null,busy=false,opened=false,watch=null,pendingCode='';
var SERVICES=[
'Solicitar consulta Médica','Solicitar atendimento com a Enfermeira Chefe',
'Solicitar atendimento com nutricionista','Solicitar atendimento odontológico (dentista)',
'Implanon — informações ou solicitação do implante','Solicitar renovação de receita médica',
'Solicitar marcação de exames — Ultrassom / Fisioterapeuta','Solicitar visita domiciliar do TACS',
'Solicitar visita domiciliar com a Médica','Vacinação ou campanha de saúde',
'Acompanhamento de saúde do Bolsa Família','Cadastro ou atualização da família',
'Solicitar ficha de cadastro para Aposentadoria',
'Encaminhamento ou orientação para outro serviço da rede pública',
'Informações sobre dias, horários e funcionamento da Unidade de Saúde',
'Outro assunto comunitário relacionado à Unidade de Saúde'
];
function el(id){return document.getElementById(id);}
function txt(v){return String(v==null?'':v).trim();}
function digits(v){return txt(v).replace(/\D/g,'');}
function esc(v){return txt(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function creds(){try{return {token:txt(sessionStorage.getItem('portalConectaMoradorTokenV1')),dispositivo:txt(localStorage.getItem('portalTacsDispositivoV1'))};}catch(e){return {token:'',dispositivo:''};}}
function area(){try{var p=new URLSearchParams(location.search);return txt(p.get('area')||p.get('areaId')||window.TACS_AREA_ID||AREA).toUpperCase().replace(/[^A-Z0-9_-]/g,'');}catch(e){return AREA;}}
function randId(){var a=new Uint8Array(20);crypto.getRandomValues(a);return 'csc_terceiros_'+Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');}
function newCode(){var a=new Uint8Array(6);crypto.getRandomValues(a);return 'CSC-T-'+Date.now().toString(36).toUpperCase()+'-'+Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('').toUpperCase();}
function notice(m,type){var n=el('cscTerceirosStatus');if(n){n.textContent=m||'';n.className='csc-terceiros-status'+(type?' '+type:'');}}
function readResult(id){
 return new Promise(function(resolve,reject){
  var cb='__cscTerceiros_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script'),done=false;
  var timer=setTimeout(function(){end(null,new Error('Tempo de consulta excedido.'));},8500);
  function end(d,e){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(x){window[cb]=undefined;}if(s.parentNode)s.remove();e?reject(e):resolve(d);}
  window[cb]=function(r){end(r,null);};s.onerror=function(){end(null,new Error('Falha ao consultar resultado.'));};s.async=true;
  s.src=API+'?action=csc_terceiros_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
  document.head.appendChild(s);
 });
}
function action(name,data){
 var a=creds();
 if(!a.token||!a.dispositivo)return Promise.reject(new Error('Entre no Portal do Morador com seu PIN antes de utilizar esta opção.'));
 var id=randId(),p=new URLSearchParams();
 p.set('action',name);p.set('requestId',id);p.set('token',a.token);p.set('dispositivo',a.dispositivo);p.set('areaId',AREA);
 Object.keys(data||{}).forEach(function(k){p.set(k,data[k]==null?'':String(data[k]));});
 try{fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:p.toString()}).catch(function(){});}catch(e){}
 return new Promise(function(resolve,reject){
  var start=Date.now();
  function poll(){
   if(Date.now()-start>55000){reject(new Error('A UBS não confirmou a operação. Consulte o TACS antes de repetir.'));return;}
   readResult(id).then(function(r){
    if(r&&r.ok&&r.pendente===false&&r.result){r.result.ok?resolve(r.result):reject(new Error(r.result.message||'Operação não concluída.'));return;}
    if(r&&r.ok===false){reject(new Error(r.message||'Consulta não autorizada.'));return;}
    setTimeout(poll,850);
   }).catch(function(){setTimeout(poll,1100);});
  }
  setTimeout(poll,450);
 });
}
function html(){
 return '<h2>Precisa pedir atendimento para outra pessoa?</h2>'+
 '<p>Use esta opção para pedir atendimento para seu <strong>pai, mãe, irmão, vizinho ou outra pessoa</strong> que não aparece na sua lista de família.</p>'+
 '<p>Mesmo que essa pessoa more em outra casa ou tenha outro cadastro de família.</p>'+
 '<p class="csc-terceiros-area">EXCLUSIVO PARA MORADORES DA ZONA RURAL DE JAPARANDUBA.</p>'+
 '<button id="cscTerceirosToggle" class="csc-terceiros-main" type="button" aria-expanded="false" aria-controls="cscTerceirosFields">SOLICITAR SERVIÇO PARA OUTRA PESSOA ▾</button>'+
 '<div id="cscTerceirosFields" class="csc-terceiros-fields" hidden>'+
 '<p class="csc-terceiros-help">Informe o CPF ou o Cartão SUS da pessoa. Você continua usando o seu próprio acesso.</p>'+
 '<label class="csc-terceiros-field">CPF ou Cartão SUS (CNS)<input id="cscTerceirosDoc" inputmode="numeric" autocomplete="off" maxlength="15" placeholder="CPF ou Cartão SUS"></label>'+
 '<div id="cscTerceirosBirthRow" hidden><label class="csc-terceiros-field">Data de nascimento do beneficiário<input id="cscTerceirosBirth" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA"></label></div>'+
 '<div id="cscTerceirosNameRow" hidden><label class="csc-terceiros-field">Nome completo do beneficiário<input id="cscTerceirosName" autocomplete="off" maxlength="120" placeholder="Nome para confirmar o cadastro"></label></div>'+
 '<button id="cscTerceirosLookup" class="csc-terceiros-lookup" type="button">LOCALIZAR MORADOR</button>'+
 '<div id="cscTerceirosPerson" class="csc-terceiros-person" hidden></div>'+
 '<div id="cscTerceirosService" hidden>'+
 '<label class="csc-terceiros-field">Qual serviço a pessoa precisa?<select id="cscTerceirosCategory"><option value="">Escolha o serviço</option></select></label>'+
 '<p id="cscTerceirosScheduleHelp" class="csc-terceiros-help" hidden>Este pedido não reserva vaga automaticamente. A UBS deverá confirmar a data e a disponibilidade do atendimento.</p>'+
 '<label class="csc-terceiros-field">Descrição do pedido<textarea id="cscTerceirosDescription" maxlength="900" placeholder="Informe o que a pessoa está precisando"></textarea></label>'+
 '<label class="csc-terceiros-consent"><input id="cscTerceirosConsent" type="checkbox"><span>Confirmo que estou fazendo este pedido a pedido ou com o conhecimento da pessoa que precisa do atendimento.</span></label>'+
 '<button id="cscTerceirosSubmit" class="csc-terceiros-submit" type="button">REGISTRAR SOLICITAÇÃO NA UBS</button></div>'+
 '<div id="cscTerceirosStatus" class="csc-terceiros-status" role="status" aria-live="polite"></div>'+
 '<a id="cscTerceirosWhatsapp" class="csc-terceiros-whatsapp" hidden rel="noopener noreferrer" target="_blank">ENVIAR AO TACS PELO WHATSAPP</a></div>';
}
function clear(){
 chosen=null;pendingCode='';
 ['cscTerceirosDoc','cscTerceirosBirth','cscTerceirosName','cscTerceirosDescription'].forEach(function(id){el(id).value='';});
 ['cscTerceirosBirthRow','cscTerceirosNameRow','cscTerceirosPerson','cscTerceirosService','cscTerceirosWhatsapp'].forEach(function(id){el(id).hidden=true;});
 el('cscTerceirosPerson').textContent='';el('cscTerceirosWhatsapp').removeAttribute('href');
 el('cscTerceirosCategory').value='';el('cscTerceirosConsent').checked=false;
 el('cscTerceirosLookup').disabled=false;el('cscTerceirosSubmit').disabled=false;notice('');
}
function toggle(){
 if(busy)return;opened=!opened;el('cscTerceirosFields').hidden=!opened;
 el('cscTerceirosToggle').setAttribute('aria-expanded',opened?'true':'false');
 el('cscTerceirosToggle').textContent=opened?'FECHAR SOLICITAÇÃO ▴':'SOLICITAR SERVIÇO PARA OUTRA PESSOA ▾';
 if(!opened)clear();
}
function age(d){var p=String(d||'').split('/');if(p.length!==3)return '';var y=+p[2],m=+p[1],day=+p[0],now=new Date(),years=now.getFullYear()-y;if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<day))years--;return years>=0&&years<130?String(years):'';}
function populate(r){
 var b=r.beneficiario;chosen=r.selecaoToken;pendingCode='';
 var box=el('cscTerceirosPerson');box.hidden=false;
 box.innerHTML='<strong>'+esc(b.nome)+'</strong><p>Data de nascimento: '+esc(b.nascimento)+'</p><p>Localidade: '+esc(b.localidade)+'</p><p>Cadastro familiar: '+esc(b.familiaId)+'</p>'+
 '<p>Idade: '+esc(age(b.nascimento)?age(b.nascimento)+' anos':'não informada')+'</p><p>Documento: '+esc(b.documento||'não informado')+(b.documentoPendente?' (pendente de conferência na UBS)':'')+'</p>';
 el('cscTerceirosService').hidden=false;notice('Morador identificado. Confira os dados antes de solicitar. Não será criado PIN.','ok');
}
function find(){
 if(busy)return;
 var doc=digits(el('cscTerceirosDoc').value);
 if(doc.length!==11&&doc.length!==15){notice('Informe CPF com 11 dígitos ou Cartão SUS com 15 dígitos.','err');return;}
 busy=true;chosen=null;pendingCode='';
 el('cscTerceirosLookup').disabled=true;el('cscTerceirosPerson').hidden=true;
 el('cscTerceirosService').hidden=true;el('cscTerceirosWhatsapp').hidden=true;
 notice('Aguarde… localizando o morador.','progress');
 action('csc_terceiros_buscar',{documento:doc,nascimento:el('cscTerceirosBirth').value,nome:el('cscTerceirosName').value}).then(function(r){
  if(r.precisaNascimento){el('cscTerceirosBirthRow').hidden=false;el('cscTerceirosBirth').focus();notice(r.message,'progress');return;}
  if(r.precisaNome){el('cscTerceirosBirthRow').hidden=false;el('cscTerceirosNameRow').hidden=false;el('cscTerceirosName').focus();notice(r.message,'progress');return;}
  if(r.encontrado)populate(r);else notice(r.message||'Morador não localizado.','err');
 }).catch(function(e){notice(e.message,'err');}).finally(function(){busy=false;el('cscTerceirosLookup').disabled=false;});
}
function schedule(v){return /consulta|nutricionista|odontol[oó]gico|enfermeira|marca[cç][aã]o de exames/i.test(v);}
function send(){
 if(busy||!chosen)return;
 var cat=el('cscTerceirosCategory').value,description=txt(el('cscTerceirosDescription').value);
 if(!cat){notice('Selecione o serviço necessário.','err');return;}
 if(!description){notice('Descreva o que a pessoa precisa.','err');return;}
 if(!el('cscTerceirosConsent').checked){notice('Confirme que o pedido é feito com conhecimento ou autorização da pessoa.','err');return;}
 busy=true;el('cscTerceirosSubmit').disabled=true;notice('Aguarde… registrando a solicitação na UBS.','progress');
 pendingCode=pendingCode||newCode();
 action('csc_terceiros_enviar',{
  selecaoToken:chosen,codigoSolicitacao:pendingCode,categoria:cat,descricao:description,autorizado:'SIM',
  tacsResponsavel:'Mércio José Campos dos Santos',unidadeNome:'Unidade de Saúde Posto Matias'
 }).then(function(r){
  var message='*PORTAL CSC - PEDIDO PARA OUTRO MORADOR*\nCódigo: '+r.codigoSolicitacao+
   '\nBeneficiário: '+r.beneficiario.nome+'\nDocumento: '+r.beneficiario.documento+
   '\nSolicitante: '+r.solicitante.nome+' (CPF final '+r.solicitante.cpfFinal+')'+
   '\nServiço: '+r.categoria+'\nDescrição: '+r.descricao+
   '\nRegistro da UBS: confirmado.'+(r.reservaConfirmada?'':'\nNão há reserva automática de vaga neste pedido.');
  var a=el('cscTerceirosWhatsapp');a.href='https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(message);a.hidden=false;
  el('cscTerceirosService').hidden=true;el('cscTerceirosLookup').disabled=true;
  notice('Solicitação registrada na UBS. Agora toque no botão verde para enviar ao TACS pelo WhatsApp. Código: '+r.codigoSolicitacao,'ok');
 }).catch(function(e){notice(e.message,'err');el('cscTerceirosSubmit').disabled=false;}).finally(function(){busy=false;});
}
function mount(){
 if(area()!==AREA||el('cscTerceiros'))return;
 var ref=document.querySelector('.form-panel');if(!ref||!ref.parentNode)return;
 var root=document.createElement('section');root.id='cscTerceiros';root.hidden=true;
 root.setAttribute('aria-label','Solicitar serviço para outra pessoa');
 root.innerHTML=html();ref.parentNode.insertBefore(root,ref);
 SERVICES.forEach(function(s){var op=document.createElement('option');op.value=s;op.textContent=s;el('cscTerceirosCategory').appendChild(op);});
 el('cscTerceirosToggle').addEventListener('click',toggle);
 el('cscTerceirosLookup').addEventListener('click',find);
 el('cscTerceirosSubmit').addEventListener('click',send);
 el('cscTerceirosCategory').addEventListener('change',function(){el('cscTerceirosScheduleHelp').hidden=!schedule(this.value);});
 el('cscTerceirosBirth').addEventListener('input',function(){var d=digits(this.value).slice(0,8);this.value=d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d;});
 el('cscTerceirosDoc').addEventListener('input',function(){var d=digits(this.value).slice(0,15);this.value=d.length>11?d:d.length>9?d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9):d;});
 function show(){var a=creds();root.hidden=!(a.token.indexOf('cms1.')===0&&a.dispositivo);return !root.hidden;}
 if(!show())watch=setInterval(function(){if(show()){clearInterval(watch);watch=null;}},900);
 window.addEventListener('pageshow',show);
 window.CscSolicitacaoTerceirosV1=Object.freeze({version:'1.0.0',enabled:true,close:function(){if(opened&&!busy)toggle();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();