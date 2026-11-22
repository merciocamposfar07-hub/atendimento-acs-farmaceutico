/* CSC: módulo aditivo. Não modifica sessão, PIN, família, agenda nem formulário original. */
(function(){
'use strict';
if(window.CSC_TERCEIROS_ENABLED!==true)return;
if(window.CscSolicitacaoTerceirosV1)return;
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var AREA='JAPARANDUBA',WHATSAPP='5581989613130',chosen=null,busy=false,opened=false,pendingCode='';
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
 try{fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',cache:'no-store',keepalive:true,headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:p.toString()}).catch(function(){});}catch(e){}
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
 '<p class="csc-terceiros-help">Informe o CPF ou Cartão SUS de quem precisa do atendimento. Nenhum PIN será criado para essa pessoa.</p>'+
 '<label class="csc-terceiros-field">CPF ou Cartão SUS (CNS)<input id="cscTerceirosDoc" inputmode="numeric" autocomplete="off" maxlength="18" placeholder="CPF ou Cartão SUS"></label>'+
 '<div id="cscTerceirosBirthRow" hidden><label class="csc-terceiros-field">Data de nascimento (somente na primeira identificação)<input id="cscTerceirosBirth" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA"></label></div>'+
 '<div id="cscTerceirosNameRow" hidden><label class="csc-terceiros-field">Nome completo para confirmação<input id="cscTerceirosName" autocomplete="off" maxlength="120" placeholder="Nome completo"></label></div>'+
 '<label class="csc-terceiros-consent"><input id="cscTerceirosConsent" type="checkbox"><span>Confirmo que estou ajudando esta pessoa a solicitar o atendimento, a pedido ou com o conhecimento dela.</span></label>'+
 '<button id="cscTerceirosLookup" class="csc-terceiros-lookup" type="button">BUSCAR MORADOR E SUA FAMÍLIA</button>'+
 '<div id="cscTerceirosConfirm" class="csc-terceiros-person" hidden></div>'+
 '<div id="cscTerceirosFamily" class="csc-terceiros-person" hidden></div>'+
 '<div id="cscTerceirosPerson" class="csc-terceiros-person" hidden></div>'+
 '<div id="cscTerceirosLegacyHelp" class="csc-terceiros-person" hidden><strong>Agora escolha o serviço normalmente</strong><p>Utilize o quadro “Faça sua solicitação” logo abaixo. Os dias, horários e vagas são os mesmos do Portal CSC. Ao finalizar, o pedido será feito para a pessoa selecionada.</p></div>'+
 '<div id="cscTerceirosStatus" class="csc-terceiros-status" role="status" aria-live="polite"></div>'+
 '<p class="csc-terceiros-help">Use somente o botão “Enviar solicitação” do formulário oficial abaixo. O envio à UBS e o compartilhamento pelo WhatsApp começam no mesmo toque.</p>'+
 '<button id="cscTerceirosFinish" type="button" class="csc-terceiros-lookup" hidden>ENCERRAR PEDIDO PARA OUTRA PESSOA</button>'+
 '</div>';
}
var delegate=null,confirmToken='',familyList=[],originalFields=null,activeDoc='',cardDraft=null,cardTimer=null,cardSerial=0;
function closePending(){
 confirmToken='';familyList=[];delegate=null;activeDoc='';pendingCode='';cardDraft=null;cardSerial++;if(cardTimer){clearTimeout(cardTimer);cardTimer=null;}
 ['cscTerceirosConfirm','cscTerceirosFamily','cscTerceirosPerson','cscTerceirosLegacyHelp','cscTerceirosFinish'].forEach(function(id){var e=el(id);if(e)e.hidden=true;});

}
function setMainValue(id,value,fire){
 var e=el(id);if(!e)return;
 e.value=txt(value);
 if(fire){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
}
function saveOriginal(){
 if(originalFields)return;
 originalFields={};
 ['cpf','name','birth','locality','category','subject'].forEach(function(id){originalFields[id]=txt(el(id)&&el(id).value);});
}
function restoreOriginal(){
 if(!originalFields)return;
 var original=originalFields;originalFields=null;
 // Não gerar evento input no CPF de terceiro: o autofill legado faria cache em localStorage.
 setMainValue('cpf',original.cpf,false);
 ['name','birth','locality','category','subject'].forEach(function(id){setMainValue(id,original[id],true);});
}
function cancel(){
 if(busy)return;
 restoreOriginal();closePending();notice('');
 el('cscTerceirosDoc').value='';el('cscTerceirosBirth').value='';el('cscTerceirosName').value='';el('cscTerceirosConsent').checked=false;
 el('cscTerceirosBirthRow').hidden=true;el('cscTerceirosNameRow').hidden=true;
}
function toggle(){
 if(busy)return;
 opened=!opened;
 el('cscTerceirosFields').hidden=!opened;
 el('cscTerceirosToggle').setAttribute('aria-expanded',opened?'true':'false');
 el('cscTerceirosToggle').textContent=opened?'FECHAR SOLICITAÇÃO ▴':'SOLICITAR SERVIÇO PARA OUTRA PESSOA ▾';
 if(!opened)cancel();
}
function family(items,selectedName){
 familyList=Array.isArray(items)?items:[];var box=el('cscTerceirosFamily');
 box.innerHTML='<strong>Quem precisa do atendimento nesta família?</strong><p>Escolha uma pessoa da lista. Nenhum dado da família ficará salvo neste aparelho.</p>';
 familyList.forEach(function(member){
  var b=document.createElement('button');b.type='button';b.className='csc-terceiros-member';b.textContent=txt(member.nome)+(member.nascimento?' • '+member.nascimento:'');
  b.disabled=!member.temDocumento;b.title=member.temDocumento?'Toque para selecionar':'Cadastro sem CPF/CNS; procure o TACS';
  b.addEventListener('click',function(){selectMember(member.membroToken);});
  box.appendChild(b);
 });
 box.hidden=false;
}
function chosenPerson(result){
 var b=result.beneficiario;if(delegate&&(delegate.document!==digits(b.documento)||delegate.name!==b.nome))pendingCode='';delegate={
  token:result.selecaoToken,name:b.nome,birth:b.nascimento,locality:b.localidade,
  document:digits(b.documento),family:b.familiaId
 };
 saveOriginal();
 // Campos do formulário original são usados apenas nesta solicitação, sem consultar
 // o autofill por input do CPF (o autofill antigo persistiria dados de terceiros).
 setMainValue('cpf',delegate.document,false);
 setMainValue('name',delegate.name,true);
 setMainValue('birth',delegate.birth,true);
 setMainValue('locality',delegate.locality,true);
 setMainValue('category','',true);
 setMainValue('subject','',true);
 var out=el('cscTerceirosPerson');out.hidden=false;
 out.innerHTML='<strong>Selecionado: '+esc(b.nome)+'</strong>'+
  '<p>Nascimento: '+esc(b.nascimento)+' • Cadastro familiar: '+esc(b.familiaId)+'</p>'+
  '<p>O formulário de serviços abaixo já está preparado para esta pessoa.</p>';
 el('cscTerceirosLegacyHelp').hidden=false;el('cscTerceirosFinish').hidden=false;
 scheduleCardDraft();
 notice('Agora escolha o serviço, o dia e a vaga no formulário habitual logo abaixo.','ok');
 var native=document.querySelector('.form-panel');if(native)native.scrollIntoView({behavior:'smooth',block:'start'});
}
function populate(r,selectNow){
 confirmToken='';el('cscTerceirosConfirm').hidden=true;
 family(r.familia,r.beneficiario&&r.beneficiario.nome);
 el('cscTerceirosBirthRow').hidden=true;el('cscTerceirosNameRow').hidden=true;
 notice(r.cpfSalvo?'CPF gravado na planilha. Na próxima consulta será necessário somente o CPF.':'Família localizada. Escolha quem precisa do atendimento.','ok');
 if(selectNow&&r.selecaoToken&&r.beneficiario)chosenPerson(r);
}
function confirmCpf(){
 if(busy||!confirmToken)return;
 busy=true;var b=el('cscTerceirosConfirm').querySelector('button');if(b)b.disabled=true;
 notice('Salvando CPF confirmado na planilha territorial…','progress');
 action('csc_terceiros_confirmar_cpf',{confirmacaoToken:confirmToken,confirmado:'SIM'}).then(function(r){if(!document.hidden)populate(r,false);})
 .catch(function(e){notice(e.message,'err');if(b)b.disabled=false;})
 .finally(function(){busy=false});
}
function selectMember(token){
 if(busy)return;busy=true;notice('Preparando atendimento para este integrante…','progress');
 action('csc_terceiros_membro',{membroToken:token}).then(function(r){if(!document.hidden)populate(r,true);})
 .catch(function(e){notice(e.message,'err');}).finally(function(){busy=false;});
}
function invalidateSelection(){
 if(!delegate&&!confirmToken&&!familyList.length)return;
 restoreOriginal();closePending();
 notice('Os dados foram modificados. Busque novamente a família.','progress');
}
function find(){
 if(busy)return;
 if(!el('cscTerceirosConsent').checked){notice('Confirme que está ajudando esta pessoa a pedido ou com o conhecimento dela.','err');return;}
 var doc=digits(el('cscTerceirosDoc').value);
 if(doc.length!==11&&doc.length!==15){notice('Informe CPF com 11 dígitos ou Cartão SUS com 15 dígitos.','err');return;}
 restoreOriginal();closePending();
 busy=true;el('cscTerceirosLookup').disabled=true;
 notice('Consultando o cadastro territorial…','progress');
 action('csc_terceiros_buscar',{documento:doc,nascimento:el('cscTerceirosBirth').value,nome:el('cscTerceirosName').value}).then(function(r){
  if(document.hidden)return;
  if(r.precisaNascimento){el('cscTerceirosBirthRow').hidden=false;el('cscTerceirosBirth').focus();notice(r.message,'progress');return;}
  if(r.precisaNome){el('cscTerceirosBirthRow').hidden=false;el('cscTerceirosNameRow').hidden=false;el('cscTerceirosName').focus();notice(r.message,'progress');return;}
  if(r.confirmaCpf){
   confirmToken=r.confirmacaoToken;
   var c=el('cscTerceirosConfirm');c.innerHTML='<strong>Confira a pessoa identificada</strong><p>'+esc(r.nome)+' • '+esc(r.nascimento)+'</p>'+
    '<button type="button" class="csc-terceiros-lookup">CONFIRMAR IDENTIDADE E SALVAR CPF NA PLANILHA</button>';
   c.hidden=false;c.querySelector('button').addEventListener('click',confirmCpf);
   notice('Após confirmar, o CPF ficará salvo na planilha. Não será criado PIN nem cache no celular.','progress');return;
  }
  if(r.encontrado)populate(r,false);else notice(r.message||'Cadastro não localizado.','err');
 }).catch(function(e){notice(e.message,'err');})
 .finally(function(){busy=false;el('cscTerceirosLookup').disabled=false;});
}
function recifeTime(){
 try{return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'short'}).format(new Date());}
 catch(e){return new Date().toLocaleString('pt-BR');}
}
function originalData(){
 var identity=window.PortalTacsTerritoryIdentity||{};
 return {code:pendingCode||(pendingCode=newCode()),sentAt:recifeTime(),category:txt(el('category')&&el('category').value),
 name:txt(el('name')&&el('name').value),birth:txt(el('birth')&&el('birth').value),
 document:digits(el('cpf')&&el('cpf').value),locality:txt(el('locality')&&el('locality').value),
 description:txt(el('category')&&el('category').value)==='Implanon'?txt(el('implanonChoice')&&el('implanonChoice').value):txt(el('subject')&&el('subject').value),
 recipient:txt(el('category')&&el('category').value)==='Solicitar ficha de cadastro para Aposentadoria'?txt(el('retirementRecipientValue')&&el('retirementRecipientValue').value):'',
 areaId:AREA,areaName:txt(identity.areaNome)||'Sítio Japaranduba',unitName:txt(identity.unidadeNome)||'Unidade de Saúde Posto Matias',
 tacsName:txt(identity.tacsNome)||'Mércio José Campos dos Santos'};
}
function validateAgenda(cat){
 var med=/consulta M[eé]dica|atendimento com a M[eé]dica/i.test(cat),nut=/nutricionista/i.test(cat),dent=/odontol[oó]gico/i.test(cat);
 if(med&&(!window.PortalTacsAgendaMedicaV1||!window.PortalTacsAgendaMedicaV1.hasValidSelection()))throw Error('Selecione um dia disponível da médica no calendário habitual.');
 if(nut&&(!window.PortalTacsAgendaNutricionistaV1||!window.PortalTacsAgendaNutricionistaV1.hasValidSelection()))throw Error('Selecione um dia disponível da nutricionista no calendário habitual.');
 if(dent){
  var api=window.PortalTacsOdontologiaV98,slot=api&&api.selecao&&api.selecao();
  if(!slot||!slot.date||!slot.type)throw Error('Selecione uma vaga odontológica no calendário.');
 }
}
function scheduleDetails(data){
 var sel=window.PortalTacsOdontologiaV98&&window.PortalTacsOdontologiaV98.selecao();
 if(sel&&/odontol[oó]gico/i.test(data.category)){
  return {tipoVaga:txt(sel.type),dataServico:txt(sel.date),horarioExpiracao:txt(sel.expiresAt)};
 }
 var d=(data.description||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);
 return {tipoVaga:'',dataServico:d?d[3]+'-'+d[2]+'-'+d[1]:'',horarioExpiracao:''};
}
function cardDraftKey(d){
 return [d.code,d.category,d.description,d.name,d.birth,d.document,d.locality,d.areaName,d.unitName,d.tacsName].join('\\u001f');
}
function scheduleCardDraft(){
 if(!delegate)return;
 if(cardTimer)clearTimeout(cardTimer);
 var serial=++cardSerial;
 cardDraft=null;
 cardTimer=setTimeout(function(){
  cardTimer=null;
  var api=window.PortalCscSolicitacaoCardOficialV1,d=originalData();
  if(!api||typeof api.create!=='function'||!d.category||!d.name)return;
  var key=cardDraftKey(d);
  api.create(d).then(function(blob){
   if(serial===cardSerial&&delegate&&cardDraftKey(originalData())===key)cardDraft={blob:blob,data:d,key:key};
  }).catch(function(){});
 },180);
}
function sharePreparedCard(d){
 var api=window.PortalCscSolicitacaoCardOficialV1;
 if(!api||typeof api.share!=='function')return Promise.reject(new Error('Gerador do cartão oficial indisponível. Recarregue o portal.'));
 var draft=cardDraft;
 if(draft&&draft.key===cardDraftKey(d)&&draft.blob&&typeof File!=='undefined'){
  // O arquivo é montado antes do gesto; o iPhone recebe navigator.share imediatamente.
  var file=new File([draft.blob],'solicitacao-japaranduba-portal-csc.png',{type:'image/png'});
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{return Promise.resolve(navigator.share({title:'Solicitação do morador',text:'Solicitação do Portal CSC — '+d.areaName+' — TACS '+d.tacsName+'.',files:[file]}))}
   catch(error){return Promise.reject(error)}
  }
 }
 return api.share(d);
}
function nativeClick(event){
 var target=event.target&&event.target.closest&&event.target.closest('#sendPetroleumCard,#send');
 if(!target||!delegate)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(target.disabled||busy)return;
 if(!el('cscTerceirosConsent').checked){notice('Confirme a autorização para fazer a solicitação.','err');return;}
 var data=originalData();
 if(!data.category||data.document!==delegate.document||data.name!==delegate.name||data.birth!==delegate.birth){
  notice('Selecione o integrante e conclua o formulário habitual antes de enviar.','err');return;
 }
 try{validateAgenda(data.category)}catch(error){notice(error.message,'err');return;}
 if(!data.description&&data.category!=='Implanon')data.description=data.category;
 var api=window.PortalCscSolicitacaoCardOficialV1;
 if(!api||typeof api.share!=='function'){notice('Gerador do cartão indisponível. Recarregue o Portal CSC.','err');return;}
 var scheduled=scheduleDetails(data),code=data.code,shareStart;
 busy=true;target.disabled=true;
 // Abrir o compartilhamento no MESMO toque. O Apps Script grava em paralelo,
 // sem atrasar a abertura do WhatsApp. A entrega real depende do usuário confirmar.
 notice('Abrindo o cartão oficial. A solicitação também está sendo registrada na UBS…','progress');
 try{shareStart=shareCard(data)}catch(error){shareStart=Promise.reject(error)}
 var sent=action('csc_terceiros_enviar',{
  selecaoToken:delegate.token,codigoSolicitacao:code,categoria:data.category,descricao:data.description,documento:data.document,
  autorizado:'SIM',dataServico:scheduled.dataServico,tipoVaga:scheduled.tipoVaga,horarioExpiracao:scheduled.horarioExpiracao,
  tacsResponsavel:data.tacsName,unidadeNome:data.unitName
 });
 Promise.resolve(shareStart).then(function(){
  if(!document.hidden)notice('Cartão compartilhado ou preparado. Confira o envio ao TACS. A UBS será confirmada separadamente.','progress');
 }).catch(function(error){
  if(!document.hidden)notice(error&&error.name==='AbortError'?'Compartilhamento cancelado. A solicitação à UBS continua em processamento.':'Não foi possível compartilhar o cartão. '+(error.message||'Tente novamente pelo mesmo botão.'),'err');
 });
 sent.then(function(r){
  if(!document.hidden)notice(r.duplicada?'Solicitação já registrada na UBS; nenhum novo aviso foi disparado.':r.pushUbs===true?'Solicitação registrada na UBS. O serviço Push aceitou o aviso; confira a chegada no aparelho.':'Solicitação registrada na UBS, mas o aviso Push não foi confirmado. Confira a Central.',r.pushUbs===true?'ok':'progress');
 }).catch(function(error){
  if(!document.hidden)notice('Registro na UBS não confirmado: '+(error.message||'Confira a Central antes de tentar novamente.'),'err');
 }).finally(function(){
  busy=false;target.disabled=false;
  if(!document.hidden)scheduleCardDraft();
 });
}
function shareCard(data){
 var api=window.PortalCscSolicitacaoCardOficialV1;
 var annex=window.PortalCscAnexosV2,needPdf=Boolean(annex&&annex.required());
 if(!needPdf)return sharePreparedCard(data);
 if(!annex.snapshot()||typeof annex.prepareRequest!=='function')
  return Promise.reject(new Error('Prepare o documento anexado antes de enviar.'));
 // Documentos seguem a rotina pré-existente de PDF e são enviados à UBS.
 return api.create(data).then(function(blob){return annex.prepareRequest(blob,data,annex.snapshot());})
 .then(function(file){
  var ubs=window.PortalSolicitacoesUbsV1;
  if(!ubs||typeof ubs.registrarArquivo!=='function')throw Error('Envio do PDF à UBS indisponível.');
  return ubs.registrarArquivo(file,data).then(function(){return file;});
 })
 .then(function(file){
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))
   return navigator.share({title:'Solicitação CSC com documento',text:'Solicitação do Portal CSC — '+data.areaName+' — TACS '+data.tacsName+'.',files:[file]});
  var u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.click();
  setTimeout(function(){URL.revokeObjectURL(u)},120000);
 });
}
function mount(){
 if(area()!==AREA||el('cscTerceiros'))return;
 var ref=document.querySelector('.form-panel');if(!ref||!ref.parentNode)return;
 var root=document.createElement('section');root.id='cscTerceiros';root.hidden=true;
 root.setAttribute('aria-label','Solicitar serviço para outra pessoa');root.innerHTML=html();ref.parentNode.insertBefore(root,ref);
 el('cscTerceirosToggle').addEventListener('click',toggle);
 el('cscTerceirosLookup').addEventListener('click',find);
 document.addEventListener('input',function(e){if(delegate&&e.target&&['category','subject','name','birth','locality','implanonChoice'].indexOf(e.target.id)!==-1)scheduleCardDraft();});
 el('category').addEventListener('change',scheduleCardDraft);
 document.addEventListener('change',function(e){if(delegate&&e.target&&['category','subject','name','birth','locality','implanonChoice'].indexOf(e.target.id)!==-1)scheduleCardDraft();});
 el('cscTerceirosFinish').addEventListener('click',function(){cancel();opened=false;el('cscTerceirosFields').hidden=true;el('cscTerceirosToggle').setAttribute('aria-expanded','false');el('cscTerceirosToggle').textContent='SOLICITAR SERVIÇO PARA OUTRA PESSOA ▾';});
 el('cscTerceirosBirth').addEventListener('input',function(){if(delegate||confirmToken||familyList.length)invalidateSelection();var d=digits(this.value).slice(0,8);this.value=d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d;});
 el('cscTerceirosDoc').addEventListener('input',function(){invalidateSelection();var d=digits(this.value).slice(0,15);this.value=d.length>11?d.slice(0,3)+' '+d.slice(3,7)+' '+d.slice(7,11)+' '+d.slice(11):d.length>9?d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9):d;});
 el('cscTerceirosName').addEventListener('input',invalidateSelection);
 document.addEventListener('click',nativeClick,true);
 function show(){var a=creds();root.hidden=!(a.token.indexOf('cms1.')===0&&a.dispositivo);return !root.hidden;}
 // Sessão confirmada: aparecer imediatamente. O evento da sessão evita polling após PIN.
 document.addEventListener('tacs:morador',show);
 window.addEventListener('pageshow',show);
 window.addEventListener('focus',show);
 show();
 window.addEventListener('pagehide',function(){restoreOriginal();closePending();});
 document.addEventListener('visibilitychange',function(){if(document.hidden){restoreOriginal();closePending();}});
 window.CscSolicitacaoTerceirosV1=Object.freeze({version:'3.2.0',enabled:true,close:cancel,active:function(){return !!delegate;}});
}
if(document.querySelector('.form-panel'))mount();else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();