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
function scheduleFromDescription(value){var raw=text(value),date='',expiry='',m=raw.match(/Data\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i);if(m)date=m[3]+'-'+m[2]+'-'+m[1];var times=[],re=/\b([01]\d|2[0-3]):([0-5]\d)\b/g,hit;while((hit=re.exec(raw)))times.push(hit[1]+':'+hit[2]);if(times.length)expiry=times[times.length-1];return{date:date,expiry:expiry}}
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
 var serviceDate=text(options.dataServico||(dsel&&dsel.date)||scheduled.date||''),slotType=text(options.tipoVaga||(dsel&&dsel.type)||''),expiry=text(options.horarioExpiracao||(dsel&&dsel.expiresAt)||scheduled.expiry||'');
 var territory=territoryIdentity(),key='portalSolicitacaoUbsEnviadaV1:'+areaId()+':'+code;
 try{if(localStorage.getItem(key)==='1')return true;localStorage.setItem(key,'1')}catch(e){}
 send({
   action:'publico_solicitacao_ubs_criar',requestId:rid(),areaId:areaId(),codigoSolicitacao:code,
   documento:doc,nome:name,nascimento:field('birth'),localidade:field('locality'),categoria:category,
   descricao:description,tipoVaga:slotType,dataServico:serviceDate,horarioExpiracao:expiry,tacsResponsavel:territory.tacsResponsavel,unidadeNome:territory.unidadeNome,origem:'PORTAL_CSC_WHATSAPP'
 });
 return true;
}
window.PortalSolicitacoesUbsV1=Object.freeze({registrar:registrar,areaId:areaId});
}());