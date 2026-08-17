from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,s): (ROOT/rel).write_text(s,encoding='utf-8')
def sub_once(s, pattern, repl, label, flags=0):
    out,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: esperado 1 ajuste, encontrado {n}')
    return out

# 1) Backend: admin_territorio_login_pin passa a aceitar PIN sem CNS/quickKey.
rel='apps-script/ZZZZ_31_LoginRapidoTacsV1.gs'
s=read(rel)
s=s.replace("VERSAO:'1.1.0'","VERSAO:'1.2.0'",1)
s=s.replace(' * - o CNS continua obrigatório no cadastro do TACS e no primeiro acesso de cada aparelho;\n * - depois do primeiro acesso válido, o aparelho recebe uma chave rápida assinada e vinculada\n *   ao TACS + identificador local do aparelho;\n * - acessos seguintes usam somente PIN + chave rápida do aparelho;\n * - a chave rápida não substitui o PIN e não concede acesso se o TACS/área estiver inativo;\n * - trocar de aparelho ou apagar os dados locais exige CNS + PIN uma vez novamente;\n',
''' * - o CNS continua obrigatório somente no cadastro administrativo do TACS;\n * - o login operacional do TACS usa somente o PIN individual;\n * - sem chave rápida, o servidor identifica o único TACS ativo cujo hash corresponde ao PIN;\n * - se o mesmo PIN estiver configurado para mais de um TACS, o acesso é bloqueado até o administrador corrigir;\n * - a chave rápida antiga continua aceita apenas como otimização/compatibilidade;\n * - o PIN nunca é devolvido nem persistido pelo servidor;\n''',1)
pattern=r"function tacsLoginRapidoV1EntrarPorPin_\(p\)\{[\s\S]*?\n\}\n\nfunction tacsLoginRapidoV1CriarChave_"
replacement=r'''function tacsLoginRapidoV1EntrarPorPin_(p){
  var pin=tacsTerritorioV1Texto_(p.pin);
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  var chave=tacsTerritorioV1Texto_(p.quickKey||p.chaveRapida);
  if(!/^[0-9]{4,8}$/.test(pin))throw new Error('Informe o PIN individual de 4 a 8 números.');
  if(!dispositivo)throw new Error('Identificação do aparelho ausente.');

  var tentativa='PIN_ONLY:'+tacsTerritorioV1Hash_(dispositivo).slice(0,32);
  tacsTerritorioV1VerificarTentativasLogin_(tentativa);

  var tacs=null;
  var tacsId=chave?tacsLoginRapidoV1ValidarChave_(chave,dispositivo):'';
  if(tacsId){
    var lembrado=tacsTerritorioV1EncontrarTacs_(tacsId);
    if(lembrado&&lembrado.ativo&&lembrado.pinSalt&&lembrado.pinHash&&
       tacsTerritorioV1CompararSeguro_(lembrado.pinHash,tacsTerritorioV1HashPin_(pin,lembrado.pinSalt))){
      tacs=lembrado;
    }
  }else{
    var correspondentes=tacsTerritorioV1LerTacs_().filter(function(item){
      return item&&item.ativo===true&&item.pinSalt&&item.pinHash&&
        tacsTerritorioV1CompararSeguro_(item.pinHash,tacsTerritorioV1HashPin_(pin,item.pinSalt));
    });
    if(correspondentes.length>1){
      tacsTerritorioV1RegistrarFalhaLogin_(tentativa);
      throw new Error('Este PIN está associado a mais de um TACS. O administrador deve definir PINs individuais diferentes.');
    }
    tacs=correspondentes[0]||null;
  }

  if(!tacs||!tacs.ativo){
    tacsTerritorioV1RegistrarFalhaLogin_(tentativa);
    throw new Error('PIN incorreto ou acesso do TACS inativo.');
  }
  tacsTerritorioV1LimparFalhasLogin_(tentativa);

  var area=tacsTerritorioV1EncontrarArea_(tacs.areaId);
  if(!area||!area.ativa||area.tacsId!==tacs.tacsId){
    throw new Error('Este TACS ainda não possui uma área ativa e validada.');
  }

  var token=TACS_TERRITORIO_V1.TOKEN_PREFIX+Utilities.getUuid().replace(/-/g,'');
  var sessao={
    tacsId:tacs.tacsId,cns:tacs.cnsProfissional,dispositivo:dispositivo,
    areaId:area.areaId,unidadeId:area.unidadeId,criadoEm:new Date().toISOString()
  };
  CacheService.getScriptCache().put(
    TACS_TERRITORIO_V1.SESSION_PREFIX+tacsTerritorioV1Hash_(token),
    JSON.stringify(sessao),TACS_TERRITORIO_V1.SESSION_SECONDS
  );
  return{
    ok:true,token:token,perfil:'TACS',tacsId:tacs.tacsId,nome:tacs.nomeCompleto,
    areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,
    expiraEm:Date.now()+TACS_TERRITORIO_V1.SESSION_SECONDS*1000,
    quickKey:tacsLoginRapidoV1CriarChave_(tacs.tacsId,dispositivo),
    acessoRapido:true,loginSomentePin:true
  };
}

function tacsLoginRapidoV1CriarChave_'''
s=sub_once(s,pattern,replacement,'backend PIN-only')
write(rel,s)

# 2) Central: retirar CNS do formulário e usar login_pin.
rel='central-administrativa-tacs.html'; s=read(rel)
s=sub_once(s,r'<div id="tacsLogin" hidden><label for="tacsCns">CNS profissional</label><input id="tacsCns" class="field" inputmode="numeric" maxlength="18" autocomplete="off"><label for="tacsPin">PIN individual</label>',
           '<div id="tacsLogin" hidden><label for="tacsPin">PIN individual</label>','central HTML sem CNS')
s=s.replace('central-administrativa-tacs.js?v=20260817-recados-cards-mensais-v12','central-administrativa-tacs.js?v=20260817-tacs-pin-only-v1',1)
s=s.replace('central-tacs-login-rapido-v1.js?v=20260816-pin-rapido-v3-admin-oculto','central-tacs-login-rapido-v1.js?v=20260817-pin-only-v1',1)
write(rel,s)

rel='central-administrativa-tacs.js'; s=read(rel)
s=sub_once(s,r"el\('loginTacs'\)\.addEventListener\('click',function\(\)\{var cns=digits\(el\('tacsCns'\)\.value\),pin=digits\(el\('tacsPin'\)\.value\);if\(!/\^\\d\{15\}\$/\.test\(cns\)\|\|!/\^\\d\{4,8\}\$/\.test\(pin\)\)\{setStatus\('Informe o CNS profissional com 15 números e o PIN individual\.','err'\);return\}setStatus\('Validando CNS e PIN…','warn'\);post\('admin_territorio_login_tacs',\{cns:cns,pin:pin,dispositivo:device\},'admin_territorio_result',function\(r\)\{",
           "el('loginTacs').addEventListener('click',function(){var pin=digits(el('tacsPin').value);if(!/^\\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}setStatus('Validando seu PIN…','warn');post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){",
           'central JS PIN-only')
write(rel,s)

# 3) Complemento da Central: nenhum primeiro acesso pede CNS.
rel='central-tacs-login-rapido-v1.js'; s=read(rel)
s=s.replace("if(!loginBtn||!cnsInput||!pinInput||!tacsLogin)return;","if(!loginBtn||!pinInput||!tacsLogin)return;",1)
# Render: sempre esconder o CNS se algum legado ainda estiver no DOM.
s=s.replace("  }else{\n    if(cnsLabel)cnsLabel.hidden=false;\n    cnsInput.hidden=false;\n    remembered.hidden=true;\n    remembered.innerHTML='';\n  }",
'''  }else{\n    if(cnsLabel)cnsLabel.hidden=true;\n    if(cnsInput)cnsInput.hidden=true;\n    remembered.hidden=true;\n    remembered.innerHTML='';\n  }''',1)
s=s.replace("      cnsInput.value='';\n      renderLogin();\n      setStatus('Identifique este aparelho com o CNS profissional e o PIN. Depois, os próximos acessos serão somente com o PIN.','');",
"      if(cnsInput)cnsInput.value='';\n      renderLogin();\n      setStatus('Digite somente o seu PIN individual.','');",1)
old=r'''  var action,payload;
  if(profile){
    action='admin_territorio_login_pin';
    payload={quickKey:profile.quickKey,pin:pin,dispositivo:device};
    setStatus('Validando seu PIN…','warn');
  }else{
    var cns=digits(cnsInput.value);
    if(!/^\d{15}$/.test(cns)){setStatus('No primeiro acesso deste aparelho, informe os 15 números do CNS profissional.','err');return}
    action='admin_territorio_login_tacs';
    payload={cns:cns,pin:pin,dispositivo:device};
    setStatus('Identificando este aparelho e validando o acesso…','warn');
  }
'''
new=r'''  var action='admin_territorio_login_pin';
  var payload=profile?{quickKey:profile.quickKey,pin:pin,dispositivo:device}:{pin:pin,dispositivo:device};
  setStatus('Validando seu PIN…','warn');
'''
if old not in s: raise SystemExit('quick frontend: bloco antigo não localizado')
s=s.replace(old,new,1)
s=s.replace("  else setStatus('No primeiro acesso deste aparelho, use CNS + PIN. Depois, somente o PIN será necessário.','');",
            "  else setStatus('Digite somente o seu PIN individual.','');",1)
write(rel,s)

# 4) Recados/campanhas: retirar campo CNS e autenticar só por PIN.
rel='painel-oficial-recados-campanhas.html'; s=read(rel)
s=sub_once(s,r'<div id="tacsLogin" class="oculto"><label for="tacsCnsPublicacoes">CNS profissional</label><input id="tacsCnsPublicacoes" class="campo" inputmode="numeric" maxlength="18"><label for="tacsPinPublicacoes">PIN individual</label>',
           '<div id="tacsLogin" class="oculto"><label for="tacsPinPublicacoes">PIN individual</label>','recados HTML sem CNS')
s=s.replace('O TACS acessa e publica somente na área vinculada ao próprio CNS.','O TACS acessa e publica somente na área vinculada ao seu PIN individual.',1)
s=sub_once(s,r"entrarTacs\.addEventListener\('click',function\(\)\{if\(!testesOk\)return;var cns=document\.getElementById\('tacsCnsPublicacoes'\)\.value\.replace\(/\\D/g,''\),pin=document\.getElementById\('tacsPinPublicacoes'\)\.value\.replace\(/\\D/g,''\);if\(!/\^\\d\{15\}\$/\.test\(cns\)\|\|!/\^\\d\{4,8\}\$/\.test\(pin\)\)\{status\('loginStatus','Informe o CNS profissional com 15 números e o PIN individual\.','erro'\);return\}status\('loginStatus','Validando CNS e PIN…','aviso'\);post\('admin_territorio_login_tacs',\{cns:cns,pin:pin,dispositivo:dispositivo\},function\(r\)\{",
           "entrarTacs.addEventListener('click',function(){if(!testesOk)return;var pin=document.getElementById('tacsPinPublicacoes').value.replace(/\\D/g,'');if(!/^\\d{4,8}$/.test(pin)){status('loginStatus','Informe o PIN individual de 4 a 8 números.','erro');return}status('loginStatus','Validando seu PIN…','aviso');post('admin_territorio_login_pin',{pin:pin,dispositivo:dispositivo},function(r){",
           'recados JS PIN-only')
write(rel,s)

# 5) Moradores: retirar CNS do formulário e do fluxo de login.
rel='teste-v1/painel-moradores-v2.html'; s=read(rel)
s=sub_once(s,r'<div class="area-control"><strong>Acesso individual do TACS</strong><label for="tacsCnsAccess">CNS profissional</label><input id="tacsCnsAccess" class="field" inputmode="numeric" maxlength="18"><label for="tacsPinAccess">PIN individual</label>',
           '<div class="area-control"><strong>Acesso individual do TACS</strong><label for="tacsPinAccess">PIN individual</label>','moradores HTML sem CNS')
s=s.replace('Acesso restrito à área vinculada ao seu CNS profissional.','Acesso restrito à área vinculada ao seu PIN individual.',1)
s=s.replace('painel-moradores-transport-v2.js?v=20260817-duplicidade-legivel-v1','painel-moradores-transport-v2.js?v=20260817-pin-only-v1',1)
write(rel,s)

rel='teste-v1/painel-moradores-transport-v2.js'; s=read(rel)
s=s.replace("function loginWithTacs(cns,pin){\n  setStatus('loginStatus','Validando CNS profissional e PIN individual…','warn');\n  post('admin_territorio_login_tacs',{cns:cns,pin:pin,dispositivo:device},'admin_territorio_result',function(r){",
            "function loginWithTacs(pin){\n  setStatus('loginStatus','Validando seu PIN individual…','warn');\n  post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){",1)
# Handler: remove leitura/validação do CNS e chama loginWithTacs(pin).
s=sub_once(s,r"  var cns=digits\(el\('tacsCnsAccess'\)&&el\('tacsCnsAccess'\)\.value\);\n  var pin=digits\(el\('tacsPinAccess'\)&&el\('tacsPinAccess'\)\.value\);\n[\s\S]*?  loginWithTacs\(cns,pin\);",
           "  var pin=digits(el('tacsPinAccess')&&el('tacsPinAccess').value);\n  if(!/^\\d{4,8}$/.test(pin)){\n    setStatus('loginStatus','Digite o PIN individual numérico de 4 a 8 dígitos.','err');\n    return;\n  }\n  loginWithTacs(pin);",
           'moradores handler PIN-only')
write(rel,s)

# 6) Atualiza gate para o contrato novo: nenhuma tela operacional exige CNS.
rel='scripts/test_multiagent_quick_login.js'; s=read(rel)
start=s.index("assert.match(quickBackend,/admin_territorio_login_pin/")
end=s.index("assert.match(build,/ZZZZ_31_LoginRapidoTacsV1\\.gs/);")
new_tests=r'''assert.match(quickBackend,/admin_territorio_login_pin/,'Backend deve oferecer entrada do TACS por PIN.');
assert.match(quickBackend,/tacsTerritorioV1LerTacs_\(\)\.filter/,
  'Sem CNS, o servidor deve localizar o único TACS ativo correspondente ao PIN.');
assert.match(quickBackend,/correspondentes\.length>1/,
  'PIN duplicado entre TACS deve bloquear o acesso em vez de escolher uma área por engano.');
assert.match(quickBackend,/tacs\.pinHash,tacsTerritorioV1HashPin_\(pin,tacs\.pinSalt\)/,
  'O PIN deve ser validado apenas contra o hash armazenado no servidor.');
assert.match(quickBackend,/!area\|\|!area\.ativa\|\|area\.tacsId!==tacs\.tacsId/,
  'O login por PIN não pode ignorar o vínculo territorial.');

assert.match(quickFrontend,/action='admin_territorio_login_pin'/);
assert.match(quickFrontend,/\{pin:pin,dispositivo:device\}/,
  'A Central deve conseguir entrar enviando somente PIN + aparelho.');
assert.doesNotMatch(centralHtml,/id="tacsCns"|for="tacsCns"/,
  'A Central não deve exibir campo de CNS para o TACS.');
assert.doesNotMatch(centralJs,/Informe o CNS profissional com 15 números|Validando CNS e PIN/,
  'O fluxo principal da Central não deve exigir CNS.');
const recados=read('painel-oficial-recados-campanhas.html');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const moradoresJs=read('teste-v1/painel-moradores-transport-v2.js');
assert.doesNotMatch(recados,/tacsCnsPublicacoes|CNS profissional com 15 números/,
  'Recados e campanhas não deve pedir CNS ao TACS.');
assert.doesNotMatch(moradoresHtml,/tacsCnsAccess/,
  'Moradores não deve exibir CNS no acesso individual do TACS.');
assert.match(moradoresJs,/admin_territorio_login_pin/,
  'Moradores deve autenticar o TACS pelo endpoint de PIN.');
assert.doesNotMatch(moradoresJs,/Digite os 15 números do CNS profissional/,
  'Moradores não deve validar CNS profissional no login.');
'''
s=s[:start]+new_tests+s[end:]
s=s.replace("console.log('Gate multiagente: autonomia territorial + primeiro acesso CNS/PIN + acessos seguintes somente por PIN validados.');",
            "console.log('Gate multiagente: autonomia territorial + acesso operacional do TACS somente por PIN validados.');",1)
write(rel,s)

print('Correção PIN-only preparada com sucesso.')
