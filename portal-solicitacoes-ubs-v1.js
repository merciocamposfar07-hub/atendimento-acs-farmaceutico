(function(){
'use strict';
if(window.PortalSolicitacoesUbsV1)return;
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function areaId(){var a='';try{a=text(new URLSearchParams(location.search).get('area')||new URLSearchParams(location.search).get('areaId'))}catch(e){}if(!a)a=text(window.TACS_AREA_ID||'');return a.toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA'}
function el(id){return document.getElementById(id)}
function testMode(){try{var d=text(localStorage.getItem('portalTacsDispositivoV1')),k=d?text(localStorage.getItem('portalTacsAparelhoTesteTokenV3:'+areaId()+':'+d)):'';return Boolean(d&&k)}catch(e){return false}}
function rid(){return 'solubs_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)}
function field(id){var n=el(id);return n?text(n.value):''}
function territoryIdentity(){var i=window.PortalTacsTerritoryIdentity||{};return{tacsResponsavel:text(i.tacsNome||''),unidadeNome:text(i.unidadeNome||'')}}
function dentalSelection(){try{var api=window.PortalTacsOdontologiaV98;return api&&typeof api.selecao==='function'?api.selecao():null}catch(e){return null}}
function scheduleFromDescription(value){var raw=text(value),date='',expiry='',m=raw.match(/(?:Data\s*:\s*)?(\d{2})\/(\d{2})\/(\d{4})/i);if(m)date=m[3]+'-'+m[2]+'-'+m[1];var times=[],re=/\b([01]?\d|2[0-3]):([0-5]\d)\b/g,hit;while((hit=re.exec(raw))){var h=String(Number(hit[1]));if(h.length<2)h='0'+h;times.push(h+':'+hit[2])}if(times.length)expiry=times[times.length-1];return{date:date,expiry:expiry}}
function recifeCivilNow(){try{var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),v={};parts.forEach(function(p){v[p.type]=p.value});return v.day+'/'+v.month+'/'+v.year+' '+v.hour+':'+v.minute}catch(e){var d=new Date();return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}}
function send(payload){
 var body=new URLSearchParams();Object.keys(payload).forEach(function(k){if(payload[k]!=null)body.set(k,String(payload[k]))});
 var ok=false;
 try{if(navigator.sendBeacon)ok=navigator.sendBeacon(API,body)}catch(e){}
 if(!ok)try{fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store',keepalive:true}).catch(function(){})}catch(e){}
}
function registrar(options){
 options=options||{};if(testMode())return false;
 var code=text(options.codigoSolicitacao),doc=digits(field('cpf')),name=field('name'),category=text(options.categoria||field('category'));
 if(!code||!(/^(?:\d{11}|\d{15})$/.test(doc))||name.length<2||!category)return false;
 var dsel=dentalSelection(),description=text(options.descricao||(category==='Implanon'?field('implanonChoice'):field('subject'))||category),scheduled=scheduleFromDescription(description);
 /* EXPIRACAO_PELO_CARD_V5: quando a própria solicitação informa data/horário, o card é a fonte de verdade. O último horário descrito é o fim do atendimento e, portanto, a expiração. */
 var serviceDate=text(scheduled.date||options.dataServico||(dsel&&dsel.date)||''),slotType=text(options.tipoVaga||(dsel&&dsel.type)||''),expiry=text(scheduled.expiry||options.horarioExpiracao||(dsel&&dsel.expiresAt)||'');if(serviceDate&&!expiry)expiry='00:00';
 var territory=territoryIdentity(),key='portalSolicitacaoUbsEnviadaV1:'+areaId()+':'+code;
 try{if(localStorage.getItem(key)==='1')return true;localStorage.setItem(key,'1')}catch(e){}
 send({
   action:'publico_solicitacao_ubs_criar',requestId:rid(),areaId:areaId(),codigoSolicitacao:code,
   documento:doc,nome:name,nascimento:field('birth'),localidade:field('locality'),categoria:category,enviadoEm:recifeCivilNow(),
   descricao:description,tipoVaga:slotType,dataServico:serviceDate,horarioExpiracao:expiry,tacsResponsavel:territory.tacsResponsavel,unidadeNome:territory.unidadeNome,origem:'PORTAL_CSC_WHATSAPP'
 });
 return true;
}
function registrarArquivo(file,data,preparedBase64){
 if(testMode())return Promise.resolve({ok:true,teste:true,anexoRecebido:true});
 if(!file||file.type!=='application/pdf')return Promise.reject(new Error('Documento PDF não preparado.'));
 if(file.size>8*1024*1024)return Promise.reject(new Error('O PDF para a UBS deve ter até 8 MB. Escolha uma foto ou um PDF menor.'));
 var code=text(data&&data.code),doc=digits(data&&data.document||field('cpf')),key='cscUbsAnexoChaveV1:'+areaId()+':'+code,secret='';
 try{secret=sessionStorage.getItem(key)||''}catch(e){}
 if(!secret){var random=new Uint8Array(32);crypto.getRandomValues(random);secret=Array.prototype.map.call(random,function(v){return ('0'+v.toString(16)).slice(-2)}).join('');try{sessionStorage.setItem(key,secret)}catch(e){}}
 var status=document.getElementById('cscUbsAnexoStatusV1');if(!status){status=document.createElement('p');status.id='cscUbsAnexoStatusV1';status.setAttribute('role','status');status.style.cssText='padding:16px;border:2px solid #62c8e8;border-radius:14px;color:#fff;background:#062c46';var sendButton=el('sendPetroleumCard')||el('send');sendButton.insertAdjacentElement('afterend',status)}
 var started=Date.now(),clock=setInterval(function(){status.textContent='AGUARDE… enviando o documento à UBS. '+Math.floor((Date.now()-started)/1000)+' s'},1000);status.textContent='AGUARDE… enviando o documento à UBS.';
 function upload(encoded){
  var identity=territoryIdentity(),schedule=scheduleFromDescription(text(data.description||field('subject'))),id=rid(),lastSent=0,done=false;
  var payload={action:'publico_solicitacao_ubs_anexo',requestId:id,areaId:areaId(),codigoSolicitacao:code,documento:doc,nome:text(data.name),nascimento:text(data.birth),localidade:text(data.locality),categoria:text(data.category||field('category')),descricao:text(data.description),enviadoEm:recifeCivilNow(),dataServico:schedule.date,horarioExpiracao:schedule.expiry,tacsResponsavel:text(data.tacsName||identity.tacsResponsavel),unidadeNome:text(data.unitName||identity.unidadeNome),origem:'PORTAL_CSC_WHATSAPP',anexoChave:secret,pdfBase64:encoded};
  function submit(){lastSent=Date.now();var body=new URLSearchParams();Object.keys(payload).forEach(function(k){body.set(k,String(payload[k]||''))});return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){})}
  function result(){return new Promise(function(resolve,reject){var cb='__ubsPdf_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'),timer=setTimeout(function(){finish(null,new Error('Consulta temporariamente indisponível.'))},8000),settled=false;function finish(value,error){if(settled)return;settled=true;clearTimeout(timer);delete window[cb];script.remove();error?reject(error):resolve(value)}window[cb]=function(r){finish(r)};script.onerror=function(){finish(null,new Error('Conexão temporariamente indisponível.'))};script.src=API+'?action=admin_solicitacoes_ubs_result&requestId='+encodeURIComponent(payload.requestId)+'&callback='+cb+'&_='+Date.now();document.head.appendChild(script)})}
  function pause(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
  function poll(){if(done)return;if(Date.now()-started>90000){var timeout=new Error('A confirmação demorou. Toque em Enviar solicitação para consultar e tentar novamente sem duplicar.');timeout.definitivo=true;return Promise.reject(timeout)}return result().then(function(r){if(r&&r.pendente===false&&r.result){if(r.result.ok&&r.result.anexoRecebido){done=true;try{localStorage.setItem('portalSolicitacaoUbsEnviadaV1:'+areaId()+':'+code,'1')}catch(e){};return r.result}if(!r.result.temporario){var error=new Error(r.result.message||'A UBS não confirmou o documento.');error.definitivo=true;throw error}payload.requestId=rid();submit()}if(Date.now()-lastSent>45000)submit();return pause(700).then(poll)}).catch(function(error){if(error.definitivo)throw error;if(Date.now()-lastSent>15000)submit();return pause(2000).then(poll)})}
  submit();return poll();
 }
 var transfer;
 try{transfer=preparedBase64?upload(preparedBase64):new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result).split(',')[1])};reader.onerror=function(){reject(new Error('Não foi possível ler o PDF para enviar à UBS.'))};reader.readAsDataURL(file)}).then(upload)}catch(error){transfer=Promise.reject(error)}
 return transfer.then(function(result){status.textContent='✓ Documento recebido e vinculado à solicitação na UBS.';return result}).catch(function(error){status.textContent='O documento ainda não foi confirmado pela UBS. '+error.message+' O PDF continua selecionado para tentar novamente.';throw error}).finally(function(){clearInterval(clock)});
}
window.PortalSolicitacoesUbsV1=Object.freeze({registrar:registrar,registrarArquivo:registrarArquivo,areaId:areaId});
}());
