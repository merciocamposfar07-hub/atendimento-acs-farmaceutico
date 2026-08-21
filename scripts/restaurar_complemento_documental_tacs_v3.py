from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'portal-identificacao-familia-v1.js'
text=P.read_text(encoding='utf-8')


def repl(old,new):
    global text
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'portal-identificacao-familia-v1.js: trecho não único para complemento: {old[:100]!r}')
    text=text.replace(old,new,1)

repl(
"  var oneSignal=null,FAMILY_BOX='portalFamilyLookupV1',STYLE_ID='portalFamilyLookupStyleV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';",
"  var oneSignal=null,pendingMissing='',pendingType='',currentResident=null,complementing=false;\n  var FAMILY_BOX='portalFamilyLookupV1',DOC_BOX='portalDocumentComplementV1',STYLE_ID='portalFamilyLookupStyleV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';"
)

repl(
"  function escapeHtml(v){return text(v).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot',\"'\":'&#39;'}[c]})}",
"  function formatDoc(v){var d=digits(v);if(d.length===11)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);if(d.length===15)return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,10)+'.'+d.slice(10);return d}\n  function docType(v){var d=digits(v);if(/^\\d{11}$/.test(d))return 'CPF';if(/^\\d{15}$/.test(d))return 'CNS';return ''}\n  function escapeHtml(v){return text(v).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot',\"'\":'&#39;'}[c]})}"
)

repl(
"  function box(){var b=document.getElementById(FAMILY_BOX);if(b)return b;var status=document.getElementById('cpfStatus'),label=status&&status.closest?status.closest('label'):null;if(!label||!label.parentNode)return null;b=document.createElement('div');b.id=FAMILY_BOX;b.hidden=true;b.setAttribute('role','status');label.parentNode.insertBefore(b,label.nextSibling);return b}\n  function setBox(html,cls){var b=box();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}\n  function hide(){var b=box();if(b){b.hidden=true;b.innerHTML='';b.className=''}}",
"  function makeBox(id){var b=document.getElementById(id);if(b)return b;var status=document.getElementById('cpfStatus'),label=status&&status.closest?status.closest('label'):null;if(!label||!label.parentNode)return null;b=document.createElement('div');b.id=id;b.hidden=true;b.setAttribute('role','status');label.parentNode.insertBefore(b,label.nextSibling);return b}\n  function box(){return makeBox(FAMILY_BOX)}\n  function docBox(){return makeBox(DOC_BOX)}\n  function setBox(html,cls){var b=box();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}\n  function setDocBox(html,cls){var b=docBox();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}\n  function hide(){var b=box();if(b){b.hidden=true;b.innerHTML='';b.className=''}}\n  function hideDoc(){var b=docBox();if(b){b.hidden=true;b.innerHTML='';b.className=''}}"
)

repl(
"  function ensureStyle(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+FAMILY_BOX+'{grid-column:1/-1;margin-top:10px;padding:15px;border:2px solid #69c7e7;border-radius:16px;background:#eaf7fc;color:#083550}#'+FAMILY_BOX+'[hidden]{display:none!important}.tacs-family-action,.tacs-family-member{width:100%;min-height:54px;border:2px solid #49bfe6;border-radius:14px;background:#074b68;color:#fff;padding:11px 14px;font-weight:900;font-size:16px;cursor:pointer}.tacs-family-member{margin-top:9px;text-align:left;background:#fff;color:#073a55}.tacs-family-member span{display:block;margin-top:3px;color:#4e6672;font-size:13px}.tacs-family-title{display:block;margin-bottom:8px;font-size:18px;font-weight:950}.tacs-family-help{margin:7px 0 0;font-weight:750}.tacs-family-confirm{display:grid;gap:9px;margin-top:10px}.tacs-family-confirm input{min-height:54px;width:100%;border:2px solid #8aa7b5;border-radius:14px;padding:11px 13px}.tacs-family-ok{border-color:#78cea0!important;background:#eaf8ef!important;color:#076b35!important}.tacs-family-warn{border-color:#e0ad4d!important;background:#fff5dd!important;color:#714300!important}';document.head.appendChild(s)}",
"  function ensureStyle(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+FAMILY_BOX+',#'+DOC_BOX+'{grid-column:1/-1;margin-top:10px;padding:15px;border:2px solid #69c7e7;border-radius:16px;background:#eaf7fc;color:#083550}#'+FAMILY_BOX+'[hidden],#'+DOC_BOX+'[hidden]{display:none!important}.tacs-family-action,.tacs-family-member,.tacs-doc-action{width:100%;min-height:54px;border:2px solid #49bfe6;border-radius:14px;background:#074b68;color:#fff;padding:11px 14px;font-weight:900;font-size:16px;cursor:pointer}.tacs-family-member{margin-top:9px;text-align:left;background:#fff;color:#073a55}.tacs-family-member span{display:block;margin-top:3px;color:#4e6672;font-size:13px}.tacs-family-title{display:block;margin-bottom:8px;font-size:18px;font-weight:950}.tacs-family-help{margin:7px 0 0;font-weight:750}.tacs-family-confirm{display:grid;gap:9px;margin-top:10px}.tacs-family-confirm input{min-height:54px;width:100%;border:2px solid #8aa7b5;border-radius:14px;padding:11px 13px}.tacs-family-ok{border-color:#78cea0!important;background:#eaf8ef!important;color:#076b35!important}.tacs-family-warn{border-color:#e0ad4d!important;background:#fff5dd!important;color:#714300!important}';document.head.appendChild(s)}"
)

repl(
"  function searchFamily(fam,confirmation){setBox('<strong class=\"tacs-family-title\">Procurando a família '+escapeHtml(fam)+'…</strong>','');",
"  function searchFamily(fam,confirmation){pendingMissing='';pendingType='';hideDoc();setBox('<strong class=\"tacs-family-title\">Procurando a família '+escapeHtml(fam)+'…</strong>','');"
)

repl(
"  function selectMember(token){setBox('<strong class=\"tacs-family-title\">Carregando o cadastro selecionado…</strong>','');",
"  function selectMember(token){pendingMissing='';pendingType='';hideDoc();setBox('<strong class=\"tacs-family-title\">Carregando o cadastro selecionado…</strong>','');"
)

anchor="  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');"
addition=r'''  function complementRequestId(){return 'doc_publico_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
  function pollComplement(id,started){return new Promise(function(resolve,reject){function again(){jsonp({action:'publico_documento_complementar_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)resolve(r.result);else reject(new Error(r.result.message||'Não foi possível atualizar o cadastro.'));return}if(Date.now()-started>25000){reject(new Error('A atualização demorou demais. Tente novamente.'));return}setTimeout(again,900)}).catch(function(){if(Date.now()-started>25000)reject(new Error('Não foi possível confirmar a atualização.'));else setTimeout(again,1200)})}again()})}
  function complementDocument(localizer,newDoc){if(complementing)return;complementing=true;var id=complementRequestId(),body=new URLSearchParams();body.set('action','publico_documento_complementar');body.set('requestId',id);body.set('areaId',areaId());body.set('documentoLocalizador',digits(localizer));body.set('documentoNovo',digits(newDoc));setDocBox('<strong class="tacs-family-title">Salvando o documento no cadastro…</strong>','');fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return pollComplement(id,Date.now())}).then(function(r){pendingMissing='';pendingType='';setDocBox('<strong class="tacs-family-title">✓ Cadastro atualizado</strong><p class="tacs-family-help">'+escapeHtml(r.message)+'</p>','tacs-family-ok')}).catch(function(e){setDocBox('<strong class="tacs-family-title">Não foi possível salvar automaticamente</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn')}).finally(function(){complementing=false})}
  function maybeOfferComplement(){var input=document.getElementById('cpf'),current=digits(input&&input.value),currentType=docType(current);if(!pendingMissing||!currentType||!currentResident||current===pendingMissing||currentType===pendingType){hideDoc();return}var label=pendingType==='CPF'?'CPF':'Cartão SUS (CNS)',nome=escapeHtml(currentResident.nome||currentResident.name||'este morador');setDocBox('<strong class="tacs-family-title">Quer facilitar seus próximos acessos?</strong><p>O cadastro de <strong>'+nome+'</strong> foi localizado pelo '+(currentType==='CPF'?'CPF':'Cartão SUS')+'. O '+label+' que você informou antes ainda não está no cadastro.</p><button type="button" class="tacs-doc-action" data-doc-save="1">Salvar '+label+' neste cadastro</button><p class="tacs-family-help">O Portal só preenche campo vazio. Documento existente nunca é substituído automaticamente.</p>','')}
  function observeStatus(){var status=document.getElementById('cpfStatus');if(!status||status.dataset.familyDocObserver==='1')return;status.dataset.familyDocObserver='1';var observer=new MutationObserver(function(){var t=text(status.textContent),input=document.getElementById('cpf'),d=digits(input&&input.value),type=docType(d);if(!type)return;if((type==='CPF'&&t.indexOf('CPF não localizado')!==-1)||(type==='CNS'&&(t.indexOf('Cartão SUS não localizado')!==-1||t.indexOf('CNS não localizado')!==-1))){pendingMissing=d;pendingType=type;hideDoc()}});observer.observe(status,{childList:true,subtree:true,characterData:true})}
'''
if addition not in text:
    if text.count(anchor)!=1:
        raise SystemExit('portal-identificacao-familia-v1.js: install não encontrado para complemento documental')
    text=text.replace(anchor,addition+anchor,1)

repl(
"  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();renderStart()}",
"  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();docBox();observeStatus();renderStart()}"
)

repl(
"  document.addEventListener('click',function(e){var t=e.target;if(!t||!t.getAttribute)return;var f=t.getAttribute('data-family-search');if(f){searchFamily(f,'');return}var c=t.getAttribute('data-family-confirm');if(c){var i=document.getElementById('tacsFamilyConfirmDoc');searchFamily(c,i&&i.value);return}var token=t.getAttribute('data-member-token');if(token)selectMember(token)});",
"  document.addEventListener('click',function(e){var t=e.target;if(!t||!t.getAttribute)return;var f=t.getAttribute('data-family-search');if(f){searchFamily(f,'');return}var c=t.getAttribute('data-family-confirm');if(c){var i=document.getElementById('tacsFamilyConfirmDoc');searchFamily(c,i&&i.value);return}var token=t.getAttribute('data-member-token');if(token){selectMember(token);return}if(t.getAttribute('data-doc-save')==='1'){var input=document.getElementById('cpf');complementDocument(digits(input&&input.value),pendingMissing)}});"
)

repl(
"  window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(o){oneSignal=o});",
"  document.addEventListener('tacs:morador',function(e){currentResident=e&&e.detail||null;setTimeout(maybeOfferComplement,50)});\n  window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(o){oneSignal=o});"
)

P.write_text(text,encoding='utf-8')

# Atualiza apenas contratos de cache-buster nos testes antigos; as garantias funcionais continuam iguais.
tp=ROOT/'scripts/test_identificacao_familiar_publica_v1.js'
t=tp.read_text(encoding='utf-8')
old="assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=20260820-v1/);"
new="assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=202608(?:20-v1|21-tacs-device-v3)/);"
if new not in t:
    if old not in t: raise SystemExit('teste identificação familiar: cache-buster antigo não encontrado')
    t=t.replace(old,new,1)
tp.write_text(t,encoding='utf-8')

print('Complemento documental público preservado na camada TACS V3.')