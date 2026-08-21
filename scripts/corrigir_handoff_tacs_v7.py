from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]


def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({text.count(old)})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# BACKEND: handoff de uso único. Resolve inclusive quando painel administrativo e Portal
# estão em contextos de armazenamento diferentes no iPhone (Safari x atalho/PWA).
backend=ROOT/'apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'
text=backend.read_text(encoding='utf-8')
anchor="function aparelhoTacsTesteV1TratarPost_(e){"
addition=r'''function aparelhoTacsTesteV1HandoffCriar_(contexto,acesso){
  var codigo=aparelhoTacsTesteV1NovaChave_(),area=aparelhoTacsTesteV1Area_(contexto&&contexto.areaId||''),operador=aparelhoTacsTesteV1Operador_(acesso,contexto);
  if(!area)throw new Error('Área inválida para abrir o Portal em modo TACS / teste.');
  var payload={areaId:area,operadorId:operador,criadoEm:Date.now()},key='TACS_TACS_TESTE_HANDOFF_'+aparelhoTacsTesteV1Hash_(codigo);
  CacheService.getScriptCache().put(key,JSON.stringify(payload),600);
  return codigo;
}

function aparelhoTacsTesteV1HandoffResgatar_(p){
  p=p&&typeof p==='object'?p:{};
  var codigo=aparelhoTacsTesteV1Chave_(p.codigo||p.handoff||p.codigoTransferencia||''),device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId),area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'');
  if(!codigo||!device||!area)throw new Error('A autorização temporária deste aparelho é inválida. Abra novamente pelo painel TACS.');
  var cache=CacheService.getScriptCache(),key='TACS_TACS_TESTE_HANDOFF_'+aparelhoTacsTesteV1Hash_(codigo),raw=cache.get(key);
  if(!raw)throw new Error('A autorização temporária expirou ou já foi utilizada. Abra novamente pelo painel TACS.');
  var payload;try{payload=JSON.parse(raw)}catch(e){payload=null}
  if(!payload||aparelhoTacsTesteV1Area_(payload.areaId)!==area)throw new Error('Esta autorização pertence a outra área.');
  cache.remove(key);
  var chave=aparelhoTacsTesteV1NovaChave_();
  aparelhoTacsTesteV1SalvarDispositivo_(device,area,payload.operadorId||'TACS',true,chave,'');
  var resultado=aparelhoTacsTesteV1Estado_(device,'',{areaId:area},chave);
  resultado.ok=true;resultado.chaveTecnica=chave;resultado.transferidoParaPortal=true;
  resultado.message='Modo TACS / teste autorizado neste Portal. A busca pelo cadastro familiar está liberada sem CPF/CNS.';
  return resultado;
}

function aparelhoTacsTesteV1TratarResgate_(p){
  var requestId=aparelhoTacsTesteV1Texto_(p&&p.requestId),resultado;
  try{requestId=saudeNotificacoesV1ValidarRequestId_(requestId);resultado=aparelhoTacsTesteV1HandoffResgatar_(p);}catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

'''
if addition not in text:
    if text.count(anchor)!=1: raise SystemExit('backend: âncora do doPost TACS não encontrada')
    text=text.replace(anchor,addition+anchor,1)
backend.write_text(text,encoding='utf-8')

replace_once(
    Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'),
    "  var p=e&&e.parameter?e.parameter:{},action=aparelhoTacsTesteV1Texto_(p.action).toLowerCase();if(action!=='admin_notificacoes_aparelho_tacs_teste')return null;",
    "  var p=e&&e.parameter?e.parameter:{},action=aparelhoTacsTesteV1Texto_(p.action).toLowerCase();if(action==='publico_aparelho_tacs_resgatar')return aparelhoTacsTesteV1TratarResgate_(p);if(action!=='admin_notificacoes_aparelho_tacs_teste')return null;"
)
replace_once(
    Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'),
    "    if(['CONSULTAR','ATIVAR','DESATIVAR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');\n    if(modo==='ATIVAR'){",
    "    if(['CONSULTAR','ATIVAR','DESATIVAR','TRANSFERIR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');\n    if(modo==='TRANSFERIR'){\n      resultado={ok:true,areaId:contexto.areaId,codigoTransferencia:aparelhoTacsTesteV1HandoffCriar_(contexto,acesso),message:'Autorização temporária criada para abrir o Portal em modo TACS / teste.'};\n    }else if(modo==='ATIVAR'){"
)

# ADMIN: botão explícito que abre o Portal levando um código de uso único no fragmento.
p=ROOT/'admin-aparelho-tacs-teste-v1.js'
t=p.read_text(encoding='utf-8')
old="b.innerHTML='<strong>🛠 Este aparelho</strong><div class=\"apt-status\" aria-live=\"polite\">Identificando este aparelho…</div><button type=\"button\" disabled>Preparando…</button><p class=\"apt-help\">O modo TACS / teste libera a busca técnica pelo número do cadastro familiar nesta área. Não depende do Push. Recados e Campanhas continuam separados.</p>';"
new="b.innerHTML='<strong>🛠 Este aparelho</strong><div class=\"apt-status\" aria-live=\"polite\">Identificando este aparelho…</div><button type=\"button\" data-apt-toggle=\"1\" disabled>Preparando…</button><button type=\"button\" data-apt-open=\"1\" hidden style=\"margin-top:9px;background:#08704f\">Abrir Portal TACS em modo teste</button><p class=\"apt-help\">O modo TACS / teste libera a busca técnica pelo número do cadastro familiar nesta área. O botão verde transfere a autorização com segurança para o Portal, inclusive no iPhone.</p>';"
if new not in t:
    if old not in t: raise SystemExit('admin: HTML do bloco TACS não encontrado')
    t=t.replace(old,new,1)
t=t.replace("b.querySelector('button').addEventListener('click',alternar);return b}","b.querySelector('[data-apt-toggle]').addEventListener('click',alternar);b.querySelector('[data-apt-open]').addEventListener('click',abrirPortalTeste);return b}",1)
old_render="var ativo=estado.aparelhoTacsTeste===true,autorizado=estado.autorizadoNesteAparelho===true;st.textContent=txt(estado.message)||(ativo?'Modo TACS / teste ativo.':'Modo TACS / teste desativado.');bt.disabled=operando;bt.dataset.active=ativo&&autorizado?'1':'0';bt.textContent=ativo&&autorizado?'Voltar este aparelho ao modo morador':(ativo?'🔐 Renovar autorização deste aparelho':'🛠 Ativar modo TACS / teste')}"
new_render="var ativo=estado.aparelhoTacsTeste===true,autorizado=estado.autorizadoNesteAparelho===true,abrir=b.querySelector('[data-apt-open]');st.textContent=txt(estado.message)||(ativo?'Modo TACS / teste ativo.':'Modo TACS / teste desativado.');bt.disabled=operando;bt.dataset.active=ativo&&autorizado?'1':'0';bt.textContent=ativo&&autorizado?'Voltar este aparelho ao modo morador':(ativo?'🔐 Renovar autorização deste aparelho':'🛠 Ativar modo TACS / teste');if(abrir){abrir.hidden=!ativo;abrir.disabled=operando}}"
if new_render not in t:
    if old_render not in t: raise SystemExit('admin: render do modo TACS não encontrado')
    t=t.replace(old_render,new_render,1)
anchor="  function alternar(){"
addition=r'''  function abrirPortalTeste(){
    if(operando)return;operando=true;render(ultimoEstado);
    var b=box(),st=b&&b.querySelector('.apt-status');if(st)st.textContent='Preparando abertura segura do Portal TACS…';
    executar('TRANSFERIR').then(function(r){
      if(!r||r.ok!==true||!r.codigoTransferencia)throw new Error(txt(r&&r.message)||'Não foi possível criar a autorização temporária.');
      var destino='/atendimento-acs-farmaceutico/?area='+encodeURIComponent(areaAtual())+'#tacsTeste='+encodeURIComponent(r.codigoTransferencia);
      window.location.href=destino;
    }).catch(function(e){operando=false;render(ultimoEstado,e.message||'Não foi possível abrir o Portal em modo TACS / teste.')});
  }
'''
if addition not in t:
    if t.count(anchor)!=1: raise SystemExit('admin: função alternar não encontrada')
    t=t.replace(anchor,addition+anchor,1)
p.write_text(t,encoding='utf-8')

# PORTAL: resgata o código no próprio contexto de armazenamento do Portal e remove o fragmento.
p=ROOT/'portal-identificacao-familia-v1.js'
t=p.read_text(encoding='utf-8')
old="  function deviceId(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}"
new="  function novoDeviceId(){var bytes=new Uint8Array(16),out='';if(window.crypto&&window.crypto.getRandomValues){window.crypto.getRandomValues(bytes);for(var i=0;i<bytes.length;i++)out+=('0'+bytes[i].toString(16)).slice(-2)}else out=Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);return'iphone-'+out}\n  function deviceId(criar){try{var d=text(localStorage.getItem(DEVICE_KEY)||'');if(!d&&criar){d=novoDeviceId();localStorage.setItem(DEVICE_KEY,d)}return d}catch(e){return''}}"
if new not in t:
    if old not in t: raise SystemExit('portal: deviceId não encontrado')
    t=t.replace(old,new,1)
t=t.replace("function tokenKey(){var d=deviceId();", "function tokenKey(){var d=deviceId(false);",1)
t=t.replace("function tacsTeste(){return Boolean(deviceId()&&technicalToken())}", "function tacsTeste(){return Boolean(deviceId(false)&&technicalToken())}",1)
t=t.replace("dispositivo:deviceId(),chaveTacsTeste:technicalToken()", "dispositivo:deviceId(false),chaveTacsTeste:technicalToken()",1)
anchor="  function renderStart(){"
addition=r'''  function handoffCode(){try{var h=String(location.hash||'').replace(/^#/,'');var q=new URLSearchParams(h);return text(q.get('tacsTeste')||'')}catch(e){return''}}
  function limparHandoff(){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){try{location.hash=''}catch(_){}}}
  function salvarTokenTecnico(v){try{var d=deviceId(true),k=TECH_TOKEN_PREFIX+areaId()+':'+d;if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}}
  function requestIdHandoff(){return 'tacs_handoff_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
  function aguardarResgate(id,inicio){return jsonp({action:'admin_notificacoes_saude_result',requestId:id}).then(function(r){if(r&&r.ok===true&&r.pendente===false&&r.result){if(r.result.ok===true)return r.result;throw new Error(r.result.message||'Não foi possível autorizar este Portal.')}if(Date.now()-inicio>25000)throw new Error('A autorização do modo TACS demorou demais. Abra novamente pelo painel.');return new Promise(function(resolve){setTimeout(resolve,700)}).then(function(){return aguardarResgate(id,inicio)})})}
  function resgatarModoTacsTeste(){var codigo=handoffCode();if(!codigo)return Promise.resolve(false);var id=requestIdHandoff(),d=deviceId(true),body=new URLSearchParams();setBox('<strong class="tacs-family-title">Ativando modo TACS / teste neste Portal…</strong><p class="tacs-family-help">Aguarde a confirmação técnica.</p>','');body.set('action','publico_aparelho_tacs_resgatar');body.set('requestId',id);body.set('areaId',areaId());body.set('dispositivo',d);body.set('codigo',codigo);return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return aguardarResgate(id,Date.now())}).then(function(r){if(!r.chaveTecnica)throw new Error('O servidor não devolveu a autorização técnica.');salvarTokenTecnico(r.chaveTecnica);limparHandoff();setBox('<strong class="tacs-family-title">✓ Modo TACS / teste ativo</strong><p class="tacs-family-help">Agora você pode pesquisar pelo número do cadastro familiar sem digitar CPF/CNS.</p>','tacs-family-ok');return true}).catch(function(e){setBox('<strong class="tacs-family-title">Não foi possível ativar o modo TACS / teste</strong><p class="tacs-family-help">'+escapeHtml(e.message)+'</p>','tacs-family-warn');return false})}
'''
if addition not in t:
    if t.count(anchor)!=1: raise SystemExit('portal: renderStart não encontrado')
    t=t.replace(anchor,addition+anchor,1)
old_install="  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();docBox();observeStatus();renderStart()}"
new_install="  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();docBox();observeStatus();resgatarModoTacsTeste().then(function(ok){if(!ok)renderStart()})}"
if new_install not in t:
    if old_install not in t: raise SystemExit('portal: install não encontrado')
    t=t.replace(old_install,new_install,1)
t=t.replace("window.PortalTacsIdentificacaoFamilia={instalar:install,buscarFamilia:searchFamily};","window.PortalTacsIdentificacaoFamilia={instalar:install,buscarFamilia:searchFamily,resgatarModoTacsTeste:resgatarModoTacsTeste,modoTacsAtivo:tacsTeste};",1)
p.write_text(t,encoding='utf-8')

# CACHE-BUSTERS e versão pública V7
files=[
 ('recados-campanhas-whatsapp-mensal-v12.js','admin-aparelho-tacs-teste-v1.js?v=20260821-tacs-device-v6','admin-aparelho-tacs-teste-v1.js?v=20260821-tacs-device-v7'),
 ('painel-oficial-recados-campanhas.html','recados-campanhas-whatsapp-mensal-v12.js?v=20260821-tacs-device-v6','recados-campanhas-whatsapp-mensal-v12.js?v=20260821-tacs-device-v7'),
 ('portal-auto-update.js','portal-identificacao-familia-v1.js?v=20260821-tacs-device-v6','portal-identificacao-familia-v1.js?v=20260821-tacs-device-v7'),
 ('index.html','portal-auto-update.js?v=20260821-tacs-device-v6','portal-auto-update.js?v=20260821-tacs-device-v7')
]
for f,o,n in files: replace_once(Path(f),o,n)
(ROOT/'portal-version.json').write_text(json.dumps({'version':'modo-tacs-handoff-v7-20260821-1148','releasedAt':'2026-08-21T14:48:00Z','scope':'Transferência segura do modo TACS/teste do painel para o contexto real do Portal no iPhone'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# TESTE forte: handoff de uso único no backend + contratos do cliente.
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
marker="console.log('Modo TACS/teste V1.2 validado: autorização por dispositivo, sem dependência do Push, com fluxo comum protegido.');"
extra=r'''
// Handoff V7: testa criação, resgate, uso único e isolamento por área.
const handoffCache=new Map();
sandbox.CacheService={getScriptCache:function(){return{put:function(k,v){handoffCache.set(k,v)},get:function(k){return handoffCache.get(k)||null},remove:function(k){handoffCache.delete(k)}}}};
let seq=0;sandbox.aparelhoTacsTesteV1NovaChave_=function(){seq++;return ('handoffTOKEN'+String(seq).padStart(4,'0')+'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz').slice(0,64)};
sandbox.aparelhoTacsTesteV1Hash_=function(v){return 'hash_'+String(v)};
let salvo=null;sandbox.aparelhoTacsTesteV1SalvarDispositivo_=function(device,area,op,ativo,chave){salvo={device,area,op,ativo,chave};return{ativo:true}};
sandbox.aparelhoTacsTesteV1Estado_=function(device,sub,ctx,chave){return{ok:true,areaId:ctx.areaId,aparelhoTacsTeste:true,autorizadoNesteAparelho:true,device,chaveRef:chave.slice(-4)}};
const codigo=sandbox.aparelhoTacsTesteV1HandoffCriar_({areaId:'JAPARANDUBA'},{operadorId:'TACS_TESTE'});
assert.ok(codigo.length>=40);
const resgate=sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo,dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA'});
assert.equal(resgate.ok,true);assert.equal(resgate.transferidoParaPortal,true);assert.equal(salvo.device,DEVICE_TEST);assert.equal(salvo.area,'JAPARANDUBA');assert.equal(salvo.ativo,true);assert.ok(resgate.chaveTecnica.length>=40);
assert.throws(()=>sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo,dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA'}),/expirou|utilizada/,'Código TACS deve ser de uso único.');
const codigoOutra=sandbox.aparelhoTacsTesteV1HandoffCriar_({areaId:'JAPARANDUBA'},{operadorId:'TACS_TESTE'});
assert.throws(()=>sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo:codigoOutra,dispositivo:DEVICE_TEST,areaId:'MATIAS'}),/outra área/,'Handoff não pode atravessar área.');
assert.match(backend,/publico_aparelho_tacs_resgatar/);assert.match(backend,/codigoTransferencia/);assert.match(admin,/Abrir Portal TACS em modo teste/);assert.match(admin,/TRANSFERIR/);assert.match(familyClient,/tacsTeste=/);assert.match(familyClient,/resgatarModoTacsTeste/);assert.match(familyClient,/publico_aparelho_tacs_resgatar/);assert.match(familyClient,/history\.replaceState/);assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260821-tacs-device-v7/);
console.log('Handoff TACS V7 validado: código único, área isolada, Portal recebe autorização no próprio contexto do iPhone.');
'''
if extra not in t:
    if marker not in t: raise SystemExit('teste TACS: marcador final não encontrado')
    t=t.replace(marker,extra+'\n'+marker,1)
# contratos de versões anteriores aceitam V7.
t=t.replace('admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v5','admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v7')
p.write_text(t,encoding='utf-8')

for file in ['scripts/test_identificacao_familiar_publica_v1.js','scripts/test_quality_gate_v101.js']:
    p=ROOT/file;s=p.read_text(encoding='utf-8')
    s=s.replace('21-tacs-device-v5)','21-tacs-device-v5|21-tacs-device-v7)')
    p.write_text(s,encoding='utf-8')

print('Modo TACS V7 preparado: transferência de autorização entre contextos do iPhone + testes de uso único e área.')