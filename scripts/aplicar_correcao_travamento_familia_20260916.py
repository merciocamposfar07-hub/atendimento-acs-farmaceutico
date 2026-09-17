from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Âncora não encontrada: {label}')
    if text.count(old)!=1:
        raise SystemExit(f'Âncora não é única ({text.count(old)}): {label}')
    return text.replace(old,new,1)

# 1) Moradores: separar leituras de status/busca do transporte serial de gravações.
p=Path('teste-v1/painel-moradores-transport-v2.js')
s=read(p)
if 'LEITURAS_CONCORRENTES_MORADORES_2026_09_16_V1' not in s:
    anchor='\nfunction updateAreaHeading(areaName){\n'
    read_post=r'''
/* LEITURAS_CONCORRENTES_MORADORES_2026_09_16_V1
   Leituras de status e busca não usam a trava global `active` das gravações.
   Assim, a conferência da base pode continuar em segundo plano sem impedir a busca.
   Escritas/autenticação continuam no post() serial já existente. */
function readPost(action,payload,resultAction,cb){
  noteRequestAction(action);
  var rid=requestId(action),body=new URLSearchParams(),started=Date.now(),finished=false,wait=240;
  Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});
  body.set('action',action);body.set('requestId',rid);
  function finishRead(result){if(finished)return;finished=true;cb(result||{ok:false,message:'Resposta vazia do servidor.'})}
  function pollRead(){
    if(finished)return;
    jsonp(resultAction,{requestId:rid},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finishRead(r.result);return}
      if(Date.now()-started>=18000){finishRead({ok:false,temporario:true,message:'A leitura atual ainda não foi confirmada pelo servidor.'});return}
      wait=Math.min(850,wait+90);setTimeout(pollRead,wait);
    });
  }
  try{
    fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    setTimeout(pollRead,120);
  }catch(e){finishRead({ok:false,temporario:true,message:'Não foi possível iniciar a leitura agora.'})}
}
'''
    s=replace_once(s,anchor,'\n'+read_post+anchor,'inserir readPost')

    old="""  if(searchButton){
    searchButton.disabled=baseCheckPending;
    searchButton.textContent=baseCheckPending?'Conferindo base…':(PRONTUARIOS_VIEW?'Buscar na área selecionada':'Buscar na base real');
  }"""
    new="""  if(searchButton){
    /* A leitura de status pode continuar em segundo plano; busca é independente. */
    searchButton.disabled=false;
    searchButton.textContent=PRONTUARIOS_VIEW?'Buscar na área selecionada':'Buscar na base real';
  }"""
    s=replace_once(s,old,new,'não bloquear botão Buscar')

    s=replace_once(
        s,
        "coreRead('admin_moradores_status',leituraPayload,function(next){post('admin_moradores_status',leituraPayload,'admin_moradores_result',next)},function(r){",
        "coreRead('admin_moradores_status',leituraPayload,function(next){readPost('admin_moradores_status',leituraPayload,'admin_moradores_result',next)},function(r){",
        'status de moradores independente'
    )

    old_guard="""  if(baseCheckPending){
    setStatus('operationStatus','O painel já está aberto. Aguarde somente a conferência da base terminar.','warn');
    return;
  }
"""
    s=replace_once(s,old_guard,'','retirar bloqueio da busca durante status')

    count=s.count("post('admin_moradores_buscar'")
    if count<2:
        raise SystemExit(f'Esperadas pelo menos 2 buscas serializadas; encontradas {count}')
    s=s.replace("post('admin_moradores_buscar'","readPost('admin_moradores_buscar'")
    write(p,s)

# 2) Native Moradores: forçar carregamento da revisão corrigida do transporte.
p=Path('conecta-moradores-native-v1.js')
s=read(p)
s=re.sub(r"painel-moradores-transport-v2\.js\?v=[^'\"]+","painel-moradores-transport-v2.js?v=20260916-read-concorrente-v1",s)
write(p,s)

# 3) Família: acionamento resiliente no pointerup/touch, com click apenas como fallback deduplicado.
p=Path('portal-identificacao-familia-v1.js')
s=read(p)
if 'BUSCA_FAMILIAR_TOQUE_RESILIENTE_2026_09_16_V1' not in s:
    s=replace_once(s,"  var familyQueryPromises={};","  var familyQueryPromises={};\n  /* BUSCA_FAMILIAR_TOQUE_RESILIENTE_2026_09_16_V1 */\n  var familySearchPointer=null,lastFamilySearch={family:'',at:0};",'estado da busca familiar resiliente')
    s=s.replace('font-size:16px;cursor:pointer}', 'font-size:16px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(73,191,230,.22)}',1)
    s=s.replace('.tacs-family-member.tacs-family-pressed,.tacs-family-member:active{', '.tacs-family-action.tacs-family-pressed,.tacs-family-member.tacs-family-pressed,.tacs-family-member:active{',1)

    anchor="  function memberButton(target){return target&&target.closest?target.closest('[data-member-token]'):null}\n"
    helper=r'''  function familySearchButton(target){return target&&target.closest?target.closest('[data-family-search]'):null}
  function activateFamilySearchButton(button,e){
    if(!button)return false;
    var fam=normalizeFamily(button.getAttribute('data-family-search'));
    if(!fam)return false;
    if(e&&typeof e.preventDefault==='function')e.preventDefault();
    var now=Date.now();
    if(lastFamilySearch.family===fam&&now-lastFamilySearch.at<900)return true;
    lastFamilySearch={family:fam,at:now};
    button.classList.add('tacs-family-pressed');button.setAttribute('aria-busy','true');
    searchFamily(fam).finally(function(){button.classList.remove('tacs-family-pressed');button.removeAttribute('aria-busy')});
    return true;
  }
'''
    s=replace_once(s,anchor,helper+anchor,'helpers do toque familiar')

    member_pointer="  document.addEventListener('pointerdown',function(e){var b=memberButton(e.target);if(!b||b.disabled||e.button>0)return;memberPointer={id:e.pointerId,x:e.clientX,y:e.clientY,button:b};b.classList.add('tacs-family-pressed')},{passive:true});\n"
    family_pointer=r'''  document.addEventListener('pointerdown',function(e){var b=familySearchButton(e.target);if(!b||b.disabled||e.button>0)return;familySearchPointer={id:e.pointerId,x:e.clientX,y:e.clientY,button:b};b.classList.add('tacs-family-pressed')},{passive:true});
  document.addEventListener('pointermove',function(e){if(!familySearchPointer||familySearchPointer.id!==e.pointerId)return;if(Math.abs(e.clientX-familySearchPointer.x)>32||Math.abs(e.clientY-familySearchPointer.y)>32){if(familySearchPointer.button)familySearchPointer.button.classList.remove('tacs-family-pressed');familySearchPointer=null}},{passive:true});
  document.addEventListener('pointercancel',function(e){if(familySearchPointer&&familySearchPointer.id===e.pointerId){if(familySearchPointer.button)familySearchPointer.button.classList.remove('tacs-family-pressed');familySearchPointer=null}},{passive:true});
  document.addEventListener('pointerup',function(e){if(!familySearchPointer||familySearchPointer.id!==e.pointerId)return;var b=familySearchPointer.button,dx=Math.abs(e.clientX-familySearchPointer.x),dy=Math.abs(e.clientY-familySearchPointer.y);familySearchPointer=null;if(!b||dx>32||dy>32)return;activateFamilySearchButton(b,e)});
'''
    s=replace_once(s,member_pointer,family_pointer+member_pointer,'pointer da busca familiar')
    s=replace_once(s,"var f=t.getAttribute('data-family-search');if(f){searchFamily(f);return}","var f=t.getAttribute('data-family-search');if(f){activateFamilySearchButton(t,e);return}",'fallback click da família')
    write(p,s)

# 4) Cache-buster da Central.
p=Path('central-administrativa-tacs.html')
s=read(p)
s=re.sub(r'central-administrativa-tacs\.js\?v=[^"\']+','central-administrativa-tacs.js?v=20260916-resposta-imediata-v2',s)
write(p,s)

# 5) Restaurar explicitamente o módulo familiar no Portal publicado.
p=Path('index.html')
s=read(p)
family_src='/atendimento-acs-farmaceutico/portal-identificacao-familia-v1.js?v=20260916-toque-resiliente-v1'
if 'portal-identificacao-familia-v1.js' not in s:
    pattern=r'(<script\s+src="/atendimento-acs-farmaceutico/moradores-autofill\.js\?v=[^"]+"></script>)'
    if not re.search(pattern,s):
        raise SystemExit('Âncora moradores-autofill não encontrada no index.html')
    s=re.sub(pattern,r'\1\n<script src="'+family_src+r'"></script>',s,count=1)
else:
    s=re.sub(r'/atendimento-acs-farmaceutico/portal-identificacao-familia-v1\.js\?v=[^"]+',family_src,s)
write(p,s)

print('CORRECAO_TRAVAMENTO_FAMILIA_20260916_APLICADA')
