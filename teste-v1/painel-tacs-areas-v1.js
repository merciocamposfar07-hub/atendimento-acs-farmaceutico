(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var TACS_TOKEN_KEY='portalTacsTerritorioTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var token=sessionStorage.getItem(ADMIN_TOKEN_KEY)||'';
var territorioToken=sessionStorage.getItem(TACS_TOKEN_KEY)||'';
var device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territorioToken?'tacs':(token?'admin':'');
var active=null,data={tacs:[],areas:[],podeAdministrar:false,perfil:''};
var csvState={file:null,base64:'',name:'',headers:[],delimiter:'',headerRow:-1,encoding:'',mapping:{},preview:null};
var MAP_FIELDS=[
  ['idPortal','ID Portal'],['id','ID original'],['cpf','CPF'],['cns','CNS'],['nome','Nome completo'],
  ['nascimento','Data de nascimento'],['idade','Idade'],['sexo','Sexo'],['endereco','Endereço'],
  ['celular','Celular'],['telefoneContato','Telefone de contato'],['microarea','Microárea'],
  ['equipe','Equipe'],['origem','Origem'],['ultimaAtualizacao','Última atualização'],['status','Status'],
  ['consentimentoWhatsapp','Consentimento WhatsApp'],['dataConsentimento','Data do consentimento'],
  ['dataCadastroPortal','Data de cadastro no portal'],['observacoes','Observações']
];
var TACS_PERMISSIONS=[
  ['permRead','MORADORES_LER'],
  ['permEdit','MORADORES_EDITAR'],
  ['permStatus','MORADORES_SITUACAO'],
  ['permCsv','MORADORES_IMPORTAR_CSV'],
  ['permPublish','PUBLICACOES_GERENCIAR']
];
if(!device){device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,device);}
function el(id){return document.getElementById(id);}
function text(v){return String(v==null?'':v).trim();}
function digits(v){return String(v==null?'':v).replace(/\D/g,'');}
function birthText(v){var d=digits(v).slice(0,8);return d.slice(0,2)+(d.length>2?'/'+d.slice(2,4):'')+(d.length>4?'/'+d.slice(4,8):'');}
function validBirth(v){var m=text(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return false;var day=Number(m[1]),month=Number(m[2]),year=Number(m[3]),date=new Date(Date.UTC(year,month-1,day)),today=new Date(),todayUtc=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day&&date.getTime()<=todayUtc;}
function bool(v){return v===true||v===1||['true','1','sim','yes','ativo','ativa'].indexOf(text(v).toLowerCase())!==-1;}
function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
function status(msg,type){var node=el('operationStatus')||el('loginStatus');node.textContent=msg;node.className='status'+(type?' '+type:'');}
function loginStatus(msg,type){var node=el('loginStatus');node.textContent=msg;node.className='status'+(type?' '+type:'');}
function requestId(prefix){return String(prefix||'op').replace(/[^a-z0-9]/gi,'')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);}
function session(){var out={dispositivo:device};if(mode==='tacs'&&territorioToken)out.territorioToken=territorioToken;else if(token)out.token=token;return out;}
function payload(extra){var out=session();Object.keys(extra||{}).forEach(function(k){out[k]=extra[k];});return out;}

function jsonp(action,params,cb){
  var name='territorioCb'+Date.now()+Math.floor(Math.random()*100000),script=document.createElement('script'),done=false;
  var timer=setTimeout(function(){finish({ok:false,message:'O servidor demorou para confirmar a operação.'});},20000);
  function finish(r){if(done)return;done=true;clearTimeout(timer);try{delete window[name];}catch(ignore){}if(script.parentNode)script.remove();cb(r);}
  window[name]=finish;script.onerror=function(){finish({ok:false,message:'Falha ao consultar o servidor.'});};
  var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'v='+Date.now()];
  Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));});
  script.src=API+'?'+q.join('&');document.head.appendChild(script);
}

function finish(r){
  if(!active)return;clearTimeout(active.timeout);clearTimeout(active.pollTimer);
  var cb=active.cb,frame=active.frame,form=active.form;active=null;
  if(form&&form.parentNode)form.remove();if(frame&&frame.parentNode)setTimeout(function(){if(frame.parentNode)frame.remove();},200);
  cb(r||{ok:false,message:'Resposta vazia do servidor.'});
}

window.addEventListener('message',function(event){
  if(!active||event.source!==active.frame.contentWindow)return;var d=event.data;
  if(typeof d==='string'){try{d=JSON.parse(d);}catch(ignore){return;}}
  if(!d||typeof d!=='object')return;var rid=text(d.requestId||(d.result&&d.result.requestId));if(rid&&rid!==active.id)return;
  var result=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:d);
  finish(result);
});

function poll(){
  if(!active)return;var current=active;
  jsonp(current.resultAction,{requestId:current.id},function(r){
    if(!active||active.id!==current.id)return;
    if(r&&r.ok===true&&r.pendente===false){finish(r.result);return;}
    if(Date.now()>=current.limit){finish({ok:false,message:'A operação não foi reenviada porque sua confirmação ainda está pendente.'});return;}
    current.wait=Math.min(8000,current.wait+900);current.pollTimer=setTimeout(poll,current.wait);
  });
}

function post(action,fields,resultAction,cb){
  if(active){cb({ok:false,message:'Aguarde a operação anterior terminar.'});return;}
  var id=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form'),all={};
  Object.keys(fields||{}).forEach(function(k){all[k]=fields[k];});all.action=action;all.requestId=id;
  frame.name='territorioFrame'+Date.now();frame.className='bridge';frame.src='about:blank';frame.setAttribute('aria-hidden','true');
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frame.name;form.className='bridge';
  Object.keys(all).forEach(function(k){var input=document.createElement('input');input.type='hidden';input.name=k;input.value=String(all[k]==null?'':all[k]);form.appendChild(input);});
  active={id:id,frame:frame,form:form,resultAction:resultAction,cb:cb,wait:2200,limit:Date.now()+88000,pollTimer:null,timeout:setTimeout(function(){finish({ok:false,message:'O servidor não confirmou a operação dentro do prazo. Ela não foi reenviada.'});},90000)};
  document.body.appendChild(frame);document.body.appendChild(form);form.submit();active.pollTimer=setTimeout(poll,active.wait);
}

function territoryPost(action,extra,cb){post(action,payload(extra),'admin_territorio_result',cb);}
function csvPost(action,areaId,body,cb){post(action,payload({areaId:areaId,payload:JSON.stringify(body||{})}),'admin_csv_result',cb);}

function showLogin(which){
  var admin=which==='admin';el('adminLogin').classList.toggle('hidden',!admin);el('tacsLogin').classList.toggle('hidden',admin);
  el('loginAdminTab').classList.toggle('active',admin);el('loginTacsTab').classList.toggle('active',!admin);
}

function loadData(message,operationMessage){
  territoryPost('admin_territorio_dados',{},function(r){
    if(!r||r.ok!==true){clearSession();loginStatus(text(r&&r.message||'Sessão inválida ou expirada.'),'err');if(operationMessage)status('A alteração foi salva, mas não foi possível atualizar a tela. Reabra o painel.','err');return;}
    data={tacs:Array.isArray(r.tacs)?r.tacs:[],areas:Array.isArray(r.areas)?r.areas:[],podeAdministrar:r.podeAdministrar===true,perfil:text(r.perfil)};
    render();el('dashboard').classList.remove('hidden');el('logoutButton').disabled=false;loginStatus(message||'Sessão validada.','ok');if(operationMessage)status(operationMessage,'ok');
  });
}

function clearSession(){
  token='';territorioToken='';mode='';sessionStorage.removeItem(ADMIN_TOKEN_KEY);sessionStorage.removeItem(TACS_TOKEN_KEY);
  el('dashboard').classList.add('hidden');el('logoutButton').disabled=true;
}

function render(){
  el('tacsCount').textContent=String(data.tacs.length);el('areasCount').textContent=String(data.areas.length);
  el('activeAreasCount').textContent=String(data.areas.filter(function(a){return bool(a.ativa);}).length);
  el('profileLabel').textContent=data.podeAdministrar?'ADMIN':'TACS';
  el('tacsAdminActions').classList.toggle('hidden',!data.podeAdministrar);el('areasAdminActions').classList.toggle('hidden',!data.podeAdministrar);
  renderTacs();renderAreas();renderAreaOptions();renderCsvAreaOptions();
}

function renderTacs(){
  var list=el('tacsList');if(!data.tacs.length){list.innerHTML='<div class="card">Nenhum TACS cadastrado nesta visão.</div>';return;}
  list.innerHTML=data.tacs.map(function(t){return '<div class="card"><strong>'+esc(t.nomeCompleto||t.tacsId)+'</strong><div class="sub">CNS: '+esc(t.cnsProfissional||'não informado')+' • Área: '+esc(t.areaId||'não vinculada')+' • Unidade: '+esc(t.unidadeId||'não vinculada')+'</div><span class="pill '+(bool(t.ativo)?'':'off')+'">'+(bool(t.ativo)?'Ativo':'Inativo')+'</span>'+(data.podeAdministrar?'<div class="actions"><button class="btn editTacs" data-id="'+esc(t.tacsId)+'" type="button">Editar cadastro completo</button></div>':'')+'</div>';}).join('');
}

function renderAreas(){
  var list=el('areasList');if(!data.areas.length){list.innerHTML='<div class="card">Nenhuma área cadastrada.</div>';return;}
  list.innerHTML=data.areas.map(function(a){return '<div class="card"><strong>'+esc(a.areaNome||a.areaId)+'</strong><div class="sub">ID: '+esc(a.areaId)+' • TACS: '+esc(a.tacsId||'não definido')+' • Unidade: '+esc(a.unidadeNome||a.unidadeId||'não definida')+'</div><div class="sub">Fonte: '+esc(a.planilhaId||'não definida')+'</div><span class="pill '+(bool(a.ativa)?'':'off')+'">'+(bool(a.ativa)?'Ativa e isolada':'Inativa')+'</span>'+(data.podeAdministrar?'<div class="actions two"><button class="btn editArea" data-id="'+esc(a.areaId)+'" type="button">Editar área</button><button class="btn gray validateArea" data-id="'+esc(a.areaId)+'" type="button">Conferir 20/20</button></div>':'')+'</div>';}).join('');
}

function renderAreaOptions(){
  var select=el('areaTacsId');select.innerHTML='<option value="">Selecione</option>'+data.tacs.map(function(t){return '<option value="'+esc(t.tacsId)+'">'+esc(t.nomeCompleto||t.tacsId)+' — CNS '+esc(t.cnsProfissional||'ausente')+'</option>';}).join('');
}

function renderCsvAreaOptions(){
  var select=el('csvArea'),current=select.value;select.innerHTML=data.areas.filter(function(a){return bool(a.ativa);}).map(function(a){return '<option value="'+esc(a.areaId)+'">'+esc(a.areaNome||a.areaId)+'</option>';}).join('');
  if(current&&Array.prototype.some.call(select.options,function(o){return o.value===current;}))select.value=current;
  if(select.value)loadBatches();
}

function renderTacsUnitOptions(current){
  var select=el('tacsUnit'),seen={},units=[];data.areas.forEach(function(a){var id=text(a.unidadeId);if(!id||seen[id])return;seen[id]=true;units.push({id:id,name:text(a.unidadeNome)||id});});
  current=text(current);if(current&&!seen[current])units.push({id:current,name:current});
  select.innerHTML='<option value="">Selecione a unidade de saúde</option>'+units.map(function(unit){return '<option value="'+esc(unit.id)+'">'+esc(unit.name)+'</option>';}).join('');
  if(current)select.value=current;else if(units.length===1)select.value=units[0].id;
}

function openTacs(t){
  el('tacsForm').reset();el('tacsId').value=t&&t.tacsId||'';el('tacsName').value=t&&t.nomeCompleto||'';el('tacsCns').value=t&&t.cnsProfissional||'';
  el('tacsBirth').value=birthText(t&&t.dataNascimento||'');el('tacsCpf').value=t&&t.cpf||'';el('tacsRegistration').value=t&&t.matricula||'';el('tacsPhone').value=t&&t.telefone||'';el('tacsEmail').value=t&&t.email||'';
  el('tacsArea').value=t&&t.areaId||'';renderTacsUnitOptions(t&&t.unidadeId||'');el('tacsMicroarea').value=t&&t.microarea||'';el('tacsActive').checked=Boolean(t&&bool(t.ativo));
  el('tacsPin').required=!t;
  var selecionadas=t&&Array.isArray(t.permissoes)?t.permissoes:TACS_PERMISSIONS.map(function(item){return item[1];});
  TACS_PERMISSIONS.forEach(function(item){el(item[0]).checked=selecionadas.indexOf(item[1])!==-1;});
  el('tacsFormTitle').textContent=t?'Editar TACS':'Novo TACS';el('tacsForm').classList.remove('hidden');el('tacsForm').scrollIntoView({behavior:'smooth',block:'start'});
}

function saveTacs(event){
  event.preventDefault();var birth=birthText(el('tacsBirth').value),cns=digits(el('tacsCns').value),cpf=digits(el('tacsCpf').value),phone=digits(el('tacsPhone').value),pin=digits(el('tacsPin').value),isNew=!text(el('tacsId').value);
  if(!validBirth(birth)){status('Informe uma data de nascimento válida no formato DD/MM/AAAA.','err');el('tacsBirth').focus();return;}
  if(!/^\d{15}$/.test(cns)){status('Informe os 15 números do CNS (Cartão SUS).','err');el('tacsCns').focus();return;}
  if(!/^\d{11}$/.test(cpf)){status('Informe os 11 números do CPF.','err');el('tacsCpf').focus();return;}
  if(!/^\d{10,11}$/.test(phone)){status('Informe um celular com DDD.','err');el('tacsPhone').focus();return;}
  if(isNew&&!/^\d{4,8}$/.test(pin)){status('Defina um PIN de acesso com 4 a 8 números.','err');el('tacsPin').focus();return;}
  var body={tacsId:el('tacsId').value,nomeCompleto:el('tacsName').value,dataNascimento:birth,cnsProfissional:cns,cpf:cpf,matricula:el('tacsRegistration').value,telefone:phone,email:el('tacsEmail').value,areaId:el('tacsArea').value,unidadeId:el('tacsUnit').value,microarea:el('tacsMicroarea').value,pin:pin,permissoes:TACS_PERMISSIONS.filter(function(item){return el(item[0]).checked;}).map(function(item){return item[1];}),ativo:el('tacsActive').checked};
  if(!confirm('Salvar este cadastro completo do TACS? Todos os campos poderão ser corrigidos depois.'))return;
  status('Salvando e conferindo o cadastro do TACS…','warn');territoryPost('admin_territorio_salvar_tacs',{payload:JSON.stringify(body)},function(r){if(!r||r.ok!==true){status(text(r&&r.message||'Não foi possível salvar.'),'err');return;}el('tacsForm').classList.add('hidden');loadData('',text(r.message||'Cadastro do TACS salvo e conferido.'));});
}

function openArea(a){
  el('areaForm').reset();el('areaId').value=a&&a.areaId||'';el('areaName').value=a&&a.areaNome||'';el('areaUnitId').value=a&&a.unidadeId||'';el('areaUnitName').value=a&&a.unidadeNome||'';
  renderAreaOptions();el('areaTacsId').value=a&&a.tacsId||'';el('areaMicroarea').value=a&&a.microareaPadrao||'1';el('areaTeam').value=a&&a.equipe||'';el('areaSpreadsheet').value=a&&a.planilhaId||'';
  el('areaCreateSource').checked=false;el('areaDocumentLookup').checked=!a||a.consultaPorDocumento!==false;el('areaActive').checked=Boolean(a&&bool(a.ativa));el('areaFormTitle').textContent=a?'Editar área':'Nova área';el('areaForm').classList.remove('hidden');el('areaForm').scrollIntoView({behavior:'smooth',block:'start'});
}

function saveArea(event){
  event.preventDefault();var body={areaId:el('areaId').value,areaNome:el('areaName').value,unidadeId:el('areaUnitId').value,unidadeNome:el('areaUnitName').value,tacsId:el('areaTacsId').value,microareaPadrao:el('areaMicroarea').value,equipe:el('areaTeam').value,planilhaId:el('areaSpreadsheet').value,criarFonte:el('areaCreateSource').checked,consultaPorDocumento:el('areaDocumentLookup').checked,ativa:el('areaActive').checked};
  if(!confirm('Salvar e validar esta área? Uma área ativa precisa ter fonte 20/20 exclusiva.'))return;
  status('Validando TACS, CNS, unidade e fonte de moradores…','warn');territoryPost('admin_territorio_salvar_area',{payload:JSON.stringify(body)},function(r){if(!r||r.ok!==true){status(text(r&&r.message||'Não foi possível salvar a área.'),'err');return;}el('areaForm').classList.add('hidden');loadData('',text(r.message||'Área salva e validada.'));});
}

function validateArea(id){status('Conferindo área e schema 20/20…','warn');territoryPost('admin_territorio_validar_area',{areaId:id},function(r){status(text(r&&r.message||'Não foi possível validar a área.'),r&&r.ok===true?'ok':'err');});}

var CSV_HEADER_ALIASES={
  idPortal:['IDPORTAL'],id:['ID','IDCIDADAO','CODIGOCIDADAO','PRONTUARIO'],
  cpf:['CPF','CPFCNS','CNSCPF','CPFEOUCNS','DOCUMENTOCPFCNS','CPFCIDADAO','CPFDOCIDADAO'],
  cns:['CNS','CPFCNS','CNSCPF','CPFEOUCNS','DOCUMENTOCPFCNS','CNSCIDADAO','CNSDOCIDADAO','CARTAOSUS','CARTAONACIONALDESAUDE','CARTAONACIONALSUS'],
  nome:['NOME','NOMECOMPLETO','NOMECIDADAO','NOMEDOCIDADAO','CIDADAO'],
  nascimento:['DATANASCIMENTO','DATADENASCIMENTO','NASCIMENTO','DTNASCIMENTO'],
  idade:['IDADE'],sexo:['SEXO','SEXOBIOLOGICO'],
  endereco:['ENDERECO','ENDERECOCOMPLETO','ENDERECODODOMICILIO','LOCALIDADE','LOGRADOURO'],
  celular:['CELULAR','TELEFONECELULAR','TELEFONESCELULARES'],
  telefoneContato:['TELEFONECONTATO','TELEFONEDECONTATO','TELEFONESDECONTATO','TELEFONE','TELEFONES'],
  microarea:['MICROAREA','MICROAREARESPONSAVEL'],
  equipe:['EQUIPE','NOMEEQUIPE','NOMEDAEQUIPE','EQUIPEVINCULADA','EQUIPERESPONSAVEL'],
  origem:['ORIGEM'],ultimaAtualizacao:['ULTIMAATUALIZACAO','DATAULTIMAATUALIZACAO'],
  status:['STATUS','SITUACAO'],consentimentoWhatsapp:['CONSENTIMENTOWHATSAPP'],
  dataConsentimento:['DATACONSENTIMENTO'],dataCadastroPortal:['DATACADASTROPORTAL'],
  observacoes:['OBSERVACOES','OBSERVACAO']
};
var CSV_SYSTEM_FIELDS={idPortal:true,idade:true,origem:true,ultimaAtualizacao:true,status:true,dataCadastroPortal:true};
function normalizeKey(v){var out=text(v).toUpperCase();if(out.normalize)out=out.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return out.replace(/[^A-Z0-9]/g,'');}
function detectDelimiter(line){var best=';',count=-1;[',',';','\t','|'].forEach(function(sep){var quotes=false,total=0;for(var i=0;i<line.length;i++){if(line[i]==='"')quotes=!quotes;else if(!quotes&&line[i]===sep)total++;}if(total>count){count=total;best=sep;}});return best;}
function parseLine(line,delimiter){var out=[],value='',quotes=false;for(var i=0;i<line.length;i++){var c=line[i];if(c==='"'){if(quotes&&line[i+1]==='"'){value+='"';i++;}else quotes=!quotes;}else if(c===delimiter&&!quotes){out.push(value.trim());value='';}else value+=c;}out.push(value.trim());return out;}
function csvAliasMatches(key,alias){if(key===alias)return true;if(alias.length<10)return false;return key.indexOf(alias)===0||key.slice(-alias.length)===alias||key.indexOf(alias)!==-1;}
function csvHeaderIndex(field,headers){var normal=headers.map(normalizeKey),aliases=CSV_HEADER_ALIASES[field]||[],found=-1;aliases.some(function(alias){return normal.some(function(key,index){if(csvAliasMatches(key,alias)){found=index;return true;}return false;});});return found;}
function defaultIndex(field,headers){return CSV_SYSTEM_FIELDS[field]?-1:csvHeaderIndex(field,headers);}
function combinedDocumentColumn(field,index,headers){var key=index>=0?normalizeKey(headers[index]):'';return (field==='cpf'||field==='cns')&&key.indexOf('CPF')!==-1&&key.indexOf('CNS')!==-1;}
function csvHeaderScore(headers){var fields=['cpf','cns','nome','nascimento','sexo','endereco','celular','telefoneContato','microarea','equipe'],seen={},matches=0,score=0,required=0;fields.forEach(function(field){var index=csvHeaderIndex(field,headers);if(index<0||seen[index])return;seen[index]=true;matches++;score+=10;if(field==='nome'||field==='nascimento'||field==='sexo'){required++;score+=12;}if(field==='cpf'||field==='cns')score+=6;});return {matches:matches,score:score,required:required};}
function locateCsvHeader(textValue){
  var lines=String(textValue||'').split(/\r?\n/),best=null,limit=Math.min(lines.length,250);
  for(var row=0;row<limit;row++){
    if(!text(lines[row]))continue;
    [',',';','\t','|'].forEach(function(delimiter){
      var headers=parseLine(lines[row],delimiter);if(headers.length<3)return;
      var result=csvHeaderScore(headers);if(result.matches<2)return;
      var candidate={headers:headers,delimiter:delimiter,headerRow:row,matches:result.matches,score:result.score,required:result.required};
      if(!best||candidate.score>best.score||(candidate.score===best.score&&candidate.matches>best.matches)||(candidate.score===best.score&&candidate.matches===best.matches&&candidate.headers.length>best.headers.length))best=candidate;
    });
  }
  if(!best)throw new Error('Não foi possível localizar a linha com os nomes das colunas neste CSV do e-SUS.');
  return best;
}
function decodeCsvBuffer(buffer){
  var bytes=new Uint8Array(buffer),decoded='',encoding='UTF-8';
  if(bytes.length>=2&&bytes[0]===255&&bytes[1]===254){decoded=new TextDecoder('utf-16le').decode(buffer);encoding='UTF-16LE';}
  else if(bytes.length>=2&&bytes[0]===254&&bytes[1]===255){decoded=new TextDecoder('utf-16be').decode(buffer);encoding='UTF-16BE';}
  else{
    try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
    catch(error){decoded=new TextDecoder('windows-1252').decode(buffer);encoding='Windows-1252';}
    if(decoded.indexOf('\uFFFD')!==-1){decoded=new TextDecoder('windows-1252').decode(buffer);encoding='Windows-1252';}
  }
  return {text:decoded.replace(/^\uFEFF/,''),encoding:encoding};
}

function bytesToBase64(buffer){var bytes=new Uint8Array(buffer),binary='';for(var i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+32768,bytes.length)));return btoa(binary);}
function prepareFile(file){
  if(!file)return;if(file.size>2097152){status('O CSV deve ter no máximo 2 MB.','err');return;}var reader=new FileReader();
  reader.onload=function(){try{var buffer=reader.result,decoded=decodeCsvBuffer(buffer),located=locateCsvHeader(decoded.text);csvState.file=file;csvState.base64=bytesToBase64(buffer);csvState.name=file.name;csvState.encoding=decoded.encoding;csvState.delimiter=located.delimiter;csvState.headerRow=located.headerRow;csvState.headers=located.headers;csvState.preview=null;var mapped=renderMapping();el('mappingBox').classList.remove('hidden');el('csvPreview').classList.add('hidden');var documentNote=mapped.combinedDocument?' A coluna CPF/CNS será separada automaticamente pelo tamanho do documento.':'';status('Cabeçalho real do e-SUS reconhecido na linha '+(located.headerRow+1)+'. '+mapped.total+' campos preenchidos automaticamente.'+documentNote+' Confira e gere a prévia.','ok');}catch(error){csvState.file=null;csvState.base64='';csvState.headers=[];csvState.headerRow=-1;el('mappingBox').classList.add('hidden');el('csvPreview').classList.add('hidden');status(text(error&&error.message||'Não foi possível reconhecer este arquivo CSV.'),'err');}};
  reader.onerror=function(){status('Não foi possível ler o arquivo neste aparelho.','err');};reader.readAsArrayBuffer(file);
}

function renderMapping(){
  var box=el('mappingFields'),used={},total=0,combinedDocument=false;box.innerHTML=MAP_FIELDS.map(function(field){var selected=defaultIndex(field[0],csvState.headers),shared=combinedDocumentColumn(field[0],selected,csvState.headers);if(selected>=0&&used[selected]&&!shared)selected=-1;if(selected>=0){used[selected]=true;total++;if(shared)combinedDocument=true;}var required=['nome','nascimento','sexo'].indexOf(field[0])!==-1;return '<div class="maprow"><label for="map_'+esc(field[0])+'">'+esc(field[1])+(required?' *':'')+'</label><select class="field mappingSelect" id="map_'+esc(field[0])+'" data-field="'+esc(field[0])+'"><option value="">Não importar</option>'+csvState.headers.map(function(h,i){return '<option value="'+i+'" '+(i===selected?'selected':'')+'>'+esc(h||('Coluna '+(i+1)))+'</option>';}).join('')+'</select></div>';}).join('');return {total:total,combinedDocument:combinedDocument};
}

function collectMapping(){var out={};document.querySelectorAll('.mappingSelect').forEach(function(s){out[s.dataset.field]=s.value===''?-1:Number(s.value);});return out;}
function csvBody(){return {arquivo:csvState.name,csvBase64:csvState.base64,delimitador:csvState.delimiter,mapeamento:csvState.mapping,previewToken:csvState.preview&&csvState.preview.previewToken||''};}

function previewCsv(){
  var area=el('csvArea').value;if(!area||!csvState.base64){status('Escolha a área e o arquivo CSV.','err');return;}csvState.mapping=collectMapping();
  status('Validando o CSV sem gravar na planilha…','warn');csvPost('admin_csv_previa',area,csvBody(),function(r){if(!r||r.ok!==true){status(text(r&&r.message||'A prévia foi recusada.'),'err');return;}csvState.preview=r;renderPreview(r);status('Prévia concluída. Nenhuma linha foi gravada.','ok');});
}

function renderPreview(r){
  var s=r.resumo||{};el('csvSummary').innerHTML=[['Importáveis',s.importaveis||0],['Novos',(s.NOVO||0)+(s.NOVO_SEM_DOCUMENTO||0)],['Mesclar',s.MESCLAR||0],['Bloqueados',s.bloqueados||0]].map(function(x){return '<div class="number"><strong>'+esc(x[1])+'</strong><span>'+esc(x[0])+'</span></div>';}).join('');
  var rows=Array.isArray(r.linhas)?r.linhas:[];el('csvRows').innerHTML='<table><thead><tr><th>Linha</th><th>Nome</th><th>Documento</th><th>Nascimento</th><th>Resultado</th><th>Ação</th></tr></thead><tbody>'+rows.map(function(item){var d=item.dados||{},allowed=item.status==='NOVO'||item.status==='NOVO_SEM_DOCUMENTO'?'<option value="CRIAR" selected>Criar</option>':(item.status==='MESCLAR'?'<option value="MESCLAR" selected>Preencher vazios</option>':'');return '<tr><td>'+esc(item.linhaCsv)+'</td><td>'+esc(d.nome||'—')+'</td><td>'+esc(d.cpf||d.cns||'Sem documento')+'</td><td>'+esc(d.nascimento||'—')+'</td><td><strong>'+esc(item.status)+'</strong><div class="sub">'+esc((item.erros||[]).join(' '))+'</div></td><td><select class="field csvDecision" data-line="'+esc(item.linhaCsv)+'">'+allowed+'<option value="IGNORAR" '+(allowed?'':'selected')+'>Ignorar</option></select></td></tr>';}).join('')+'</tbody></table>';
  el('csvPreview').classList.remove('hidden');
}

function importCsv(){
  if(!csvState.preview)return;var area=el('csvArea').value,decisions={};document.querySelectorAll('.csvDecision').forEach(function(s){decisions[s.dataset.line]=s.value;});var body=csvBody();body.decisoes=decisions;
  var total=Number(csvState.preview.totalLinhas||0),mostradas=(csvState.preview.linhas||[]).length;
  var aviso='Confirmar a importação para esta área? O lote terá auditoria e opção segura de desfazer.';
  if(csvState.preview.limitado)aviso+=' A tabela mostra '+mostradas+' de '+total+' linhas; todos os demais registros válidos serão importados e conflitos continuarão ignorados.';
  if(!confirm(aviso))return;
  body.confirmarTodosImportaveis=csvState.preview.limitado===true;
  status('Importando e registrando a auditoria do lote…','warn');csvPost('admin_csv_importar',area,body,function(r){if(!r||r.ok!==true){status(text(r&&r.message||'A importação foi recusada.'),'err');return;}status(r.message,'ok');csvState.preview=null;el('csvPreview').classList.add('hidden');loadBatches();});
}

function loadBatches(){var area=el('csvArea').value;if(!area)return;csvPost('admin_csv_lotes',area,{},function(r){if(!r||r.ok!==true){el('batchList').innerHTML='<div class="card">Não foi possível carregar os lotes.</div>';return;}renderBatches(r.lotes||[]);});}
function renderBatches(lotes){el('batchList').innerHTML=lotes.length?lotes.map(function(l){return '<div class="card"><strong>'+esc(l.arquivo||l.loteId)+'</strong><div class="sub">'+esc(l.loteId)+' • '+esc(l.criadoEm||'')+'</div><div class="sub">Novos: '+esc(l.novos)+' • Mesclados: '+esc(l.mesclados)+' • Ignorados: '+esc(l.ignorados)+'</div><span class="pill '+(l.status==='CONFIRMADO'?'':'off')+'">'+esc(l.status)+'</span>'+(l.status==='CONFIRMADO'?'<div class="actions"><button class="btn red undoBatch" data-id="'+esc(l.loteId)+'" type="button">Desfazer este lote sem excluir linhas</button></div>':'')+'</div>';}).join(''):'<div class="card">Nenhuma importação registrada nesta área.</div>';}
function undoBatch(id){if(!confirm('Desfazer este lote? Linhas novas serão inativadas e campos mesclados serão restaurados.'))return;var area=el('csvArea').value;status('Conferindo se houve alterações posteriores ao lote…','warn');csvPost('admin_csv_desfazer',area,{loteId:id},function(r){status(text(r&&r.message||'Não foi possível desfazer.'),r&&r.ok===true?'ok':'err');if(r&&r.ok===true)loadBatches();});}

function switchSection(id){document.querySelectorAll('.section').forEach(function(s){s.classList.toggle('hidden',s.id!==id);});document.querySelectorAll('.sectionTab').forEach(function(b){b.classList.toggle('active',b.dataset.section===id);});if(id==='csvSection')loadBatches();}

el('loginAdminTab').addEventListener('click',function(){showLogin('admin');});el('loginTacsTab').addEventListener('click',function(){showLogin('tacs');});
el('adminLoginButton').addEventListener('click',function(){var pin=digits(el('adminPin').value);if(!/^\d{4,8}$/.test(pin)){loginStatus('Digite um PIN administrativo de 4 a 8 números.','err');return;}loginStatus('Validando o PIN…','warn');post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){el('adminPin').value='';if(!r||r.ok!==true||!r.token){loginStatus(text(r&&r.message||'Login recusado.'),'err');return;}clearSession();token=r.token;mode='admin';sessionStorage.setItem(ADMIN_TOKEN_KEY,token);loadData('Acesso de administrador validado.');});});
el('tacsLoginButton').addEventListener('click',function(){var cns=digits(el('tacsCnsLogin').value),pin=digits(el('tacsPinLogin').value);if(!/^\d{15}$/.test(cns)||!/^\d{4,8}$/.test(pin)){loginStatus('Informe CNS profissional com 15 números e PIN individual.','err');return;}loginStatus('Validando o acesso individual…','warn');post('admin_territorio_login_tacs',{cns:cns,pin:pin,dispositivo:device},'admin_territorio_result',function(r){el('tacsPinLogin').value='';if(!r||r.ok!==true||!r.token){loginStatus(text(r&&r.message||'Acesso recusado.'),'err');return;}clearSession();territorioToken=r.token;mode='tacs';sessionStorage.setItem(TACS_TOKEN_KEY,territorioToken);loadData('Acesso individual validado para '+text(r.areaNome||r.areaId)+'.');});});
el('logoutButton').addEventListener('click',function(){var action=mode==='tacs'?'admin_territorio_encerrar_sessao':'admin_logout',result=mode==='tacs'?'admin_territorio_result':'admin_result';post(action,session(),result,function(){clearSession();loginStatus('Sessão encerrada.','ok');});});
document.querySelectorAll('.sectionTab').forEach(function(b){b.addEventListener('click',function(){switchSection(b.dataset.section);});});
el('newTacsButton').addEventListener('click',function(){openTacs(null);});el('cancelTacsButton').addEventListener('click',function(){el('tacsForm').classList.add('hidden');});el('tacsForm').addEventListener('submit',saveTacs);
el('newAreaButton').addEventListener('click',function(){openArea(null);});el('cancelAreaButton').addEventListener('click',function(){el('areaForm').classList.add('hidden');});el('areaForm').addEventListener('submit',saveArea);
el('tacsList').addEventListener('click',function(e){var b=e.target.closest('.editTacs');if(b)openTacs(data.tacs.find(function(t){return t.tacsId===b.dataset.id;})||null);});
el('areasList').addEventListener('click',function(e){var edit=e.target.closest('.editArea'),validate=e.target.closest('.validateArea');if(edit)openArea(data.areas.find(function(a){return a.areaId===edit.dataset.id;})||null);if(validate)validateArea(validate.dataset.id);});
el('csvFile').addEventListener('change',function(){prepareFile(this.files&&this.files[0]);});el('previewCsvButton').addEventListener('click',previewCsv);el('importCsvButton').addEventListener('click',importCsv);el('csvArea').addEventListener('change',loadBatches);el('batchList').addEventListener('click',function(e){var b=e.target.closest('.undoBatch');if(b)undoBatch(b.dataset.id);});
el('tacsBirth').addEventListener('input',function(){this.value=birthText(this.value);});

if(mode)loadData('Conferindo a sessão existente…');else{showLogin('admin');loginStatus('Escolha o tipo de acesso.','ok');}
}());
