from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def sub_once(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: substituição esperada 1x, obtida {count}x')
    return out


FAST_HELPER = r'''function enviarPostRapidoV102(campos){
  if(typeof window.fetch!=='function'||typeof window.URLSearchParams!=='function')return false;
  try{
    var corpo=new URLSearchParams();
    Object.keys(campos||{}).forEach(function(k){corpo.append(k,String(campos[k]==null?'':campos[k]))});
    window.fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',cache:'no-store',credentials:'omit',body:corpo}).catch(function(){});
    return true;
  }catch(e){return false}
}
'''


def patch_standard(path, signature, sessao_marker, result_delay_call, dynamic_frame=False):
    text = read(path)
    if "mode:'no-cors'" in text:
        return

    if '},25000);' in text:
        text = text.replace('},25000);', '},5500);', 1)
    if '},7000);' in text:
        text = text.replace('},7000);', '},5500);', 1)
    text = text.replace(
        'Math.min(8000,ativa.proximaEspera+1000)',
        'Math.min(1600,Math.max(550,ativa.proximaEspera+150))'
    )
    text = text.replace(
        'Math.min(8000,Math.max(700,ativa.proximaEspera+150))',
        'Math.min(1600,Math.max(550,ativa.proximaEspera+150))'
    )

    if dynamic_frame:
        new = FAST_HELPER + r'''function post(action,payload,cb,resultAction){
  if(ativa){cb({ok:false,message:'Aguarde a operação anterior.'});return}
  var id=requestId(action),campos={};
  Object.keys(payload||{}).forEach(function(k){campos[k]=payload[k]});
  campos.action=action;campos.requestId=id;
  var acesso=/^(admin_login|admin_dados|admin_publicacoes_dados|admin_moradores_areas|admin_portal_manutencao_status|admin_territorio_login_tacs|admin_logout|admin_territorio_encerrar_sessao)$/.test(txt(action));
  var duracao=acesso?20000:55000;
  ativa={id:id,action:action,cb:cb,resultAction:resultAction||resultadoPadrao(action),frame:null,form:null,submitTimer:null,pollTimer:null,proximaEspera:350,limite:Date.now()+duracao,timeout:setTimeout(function(){finalizar({ok:false,temporario:true,message:acesso?'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.':'O servidor ainda está confirmando a alteração. Aguarde antes de tentar outra vez.'})},duracao+500)};
  entrar.disabled=true;if(entrarTacs)entrarTacs.disabled=true;sair.disabled=true;atualizarBloqueioMutacoes();
  if(enviarPostRapidoV102(campos)){agendarConsulta();return}
  var frame=document.createElement('iframe'),f=document.createElement('form'),frameName='ponteConteudoV102_'+Date.now()+'_'+Math.floor(Math.random()*1000);
  frame.name=frameName;frame.setAttribute('name',frameName);frame.className='ponte';frame.setAttribute('aria-hidden','true');frame.src='about:blank';
  f.method='POST';f.action=API+'?_='+Date.now();f.target=frameName;f.setAttribute('target',frameName);f.className='ponte';
  Object.keys(campos).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=txt(campos[k]);f.appendChild(i)});
  ativa.frame=frame;ativa.form=f;document.body.appendChild(frame);document.body.appendChild(f);
  try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
  agendarConsulta();
}
'''
    else:
        target = "'ponteAgendaV1'" if 'agendas' in path else "'pontePainelPSV1'"
        new = FAST_HELPER + r'''function post(action,payload,receber){
  if(ativa){receber({ok:false,message:'Aguarde a operação anterior terminar.'});return}
  var id=requestId(action),campos={};Object.keys(payload||{}).forEach(function(k){campos[k]=payload[k]});campos.action=action;campos.requestId=id;
  var acesso=action==='admin_login'||action==='admin_dados'||action==='admin_logout';
  var duracao=acesso?20000:55000;
  ativa={id:id,action:action,callback:receber,pollTimer:null,proximaEspera:350,falhas:0,limite:Date.now()+duracao,timeout:setTimeout(function(){finalizar({ok:false,temporario:true,message:acesso?'A conexão com o servidor não foi confirmada. Toque novamente em Entrar e carregar os dados.':'O servidor ainda está confirmando a alteração. Aguarde antes de tentar outra vez.'})},duracao+500)};
  entrar.disabled=true;sair.disabled=true;
  if(enviarPostRapidoV102(campos)){''' + result_delay_call + r''';return}
  var form=document.createElement('form');form.method='POST';form.action=API+'?_='+Date.now();form.target=''' + target + r''';form.className='ponte';Object.keys(campos).forEach(function(k){var input=document.createElement('input');input.type='hidden';input.name=k;input.value=txt(campos[k]);form.appendChild(input)});document.body.appendChild(form);
  try{form.submit()}catch(erro){if(form.parentNode)form.parentNode.removeChild(form);finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
  setTimeout(function(){if(form.parentNode)form.parentNode.removeChild(form)},4000);''' + result_delay_call + r'''
}
'''

    pattern = re.escape(signature) + r'.*?\n' + re.escape(sessao_marker)
    text = sub_once(text, pattern, new + sessao_marker, path + ' post')
    write(path, text)


patch_standard(
    'teste-v1/painel-profissionais-servicos-v1.html',
    'function post(action,payload,receber){',
    'function sessao(){',
    'agendarConsultaResultado()',
    False
)

patch_standard(
    'teste-v1/painel-recados-campanhas-v1.html',
    'function post(action,payload,cb,resultAction){',
    'function sessao(){',
    '',
    True
)

for path in ['painel-oficial-agendas-vagas.html', 'teste-v1/painel-agendas-v1.html']:
    patch_standard(
        path,
        'function post(action,payload,receber){',
        'function sessao(){',
        'agendarConsultaResultado(350)',
        False
    )

# Moradores: transporte externo próprio.
p = 'teste-v1/painel-moradores-transport-v2.js'
text = read(p)
if "mode:'no-cors'" not in text:
    text = text.replace('},18000);', '},5500);', 1)
    text = text.replace(
        'current.nextWait=Math.min(8000,current.nextWait+1000);',
        'current.nextWait=Math.min(1800,Math.max(550,current.nextWait+150));'
    )
    new = FAST_HELPER + r'''function post(action,payload,resultAction,cb){
  if(active){cb({ok:false,message:'Aguarde a operação anterior terminar.'});return}
  var rid=requestId(action),fields={};Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});fields.action=action;fields.requestId=rid;
  var escrita=/(?:salvar|situacao|consolid|ativar|remover|restaurar|criar)/i.test(action);
  var duration=escrita?55000:20000;
  active={id:rid,action:action,resultAction:resultAction,callback:cb,frame:null,form:null,submitTimer:null,pollTimer:null,nextWait:350,limit:Date.now()+duration,timeout:setTimeout(function(){finish({ok:false,message:escrita?'O servidor ainda está confirmando a alteração. Aguarde antes de tentar outra vez.':'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'})},duration+500)};
  var login=el('login'),loginTacs=el('loginTacs'),logout=el('logout');if(login)login.disabled=true;if(loginTacs)loginTacs.disabled=true;if(logout)logout.disabled=true;
  if(enviarPostRapidoV102(fields)){schedulePoll();return}
  var frame=document.createElement('iframe'),form=document.createElement('form'),frameName='mrV102Frame'+Date.now()+Math.floor(Math.random()*1000);
  frame.name=frameName;frame.setAttribute('name',frameName);frame.className='bridge';frame.setAttribute('aria-hidden','true');frame.src='about:blank';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.setAttribute('target',frameName);form.className='bridge';
  Object.keys(fields).forEach(function(k){var input=document.createElement('input');input.type='hidden';input.name=k;input.value=String(fields[k]==null?'':fields[k]);form.appendChild(input)});
  active.frame=frame;active.form=form;document.body.appendChild(frame);document.body.appendChild(form);
  try{form.submit()}catch(erro){finish({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
  schedulePoll();
}

'''
    text = sub_once(
        text,
        r'function post\(action,payload,resultAction,cb\)\{.*?\nfunction updateAreaHeading',
        new + 'function updateAreaHeading',
        p + ' post'
    )
    write(p, text)

# O warmup administrativo não deve carregar a UI/rotina do Portal TACS.
p = 'admin-warmup.js'
text = read(p)
if 'function garantirAutoAtualizacao' in text:
    text = sub_once(
        text,
        r'\n  function garantirAutoAtualizacao\(\)\{.*?\n  garantirAutoAtualizacao\(\);\n',
        '\n',
        p + ' auto-update'
    )
write(p, text)

# Wrappers de Profissionais e Recados: arquivo versionado cacheável e warmup sem duplicação.
for p in ['painel-oficial-profissionais-servicos.html', 'painel-oficial-recados-campanhas.html']:
    text = read(p)
    text = text.replace('admin-warmup.js?v=20260812-auto-v101', 'admin-warmup.js?v=20260813-admin-v102')
    text = text.replace("fetch(origem,{cache:'no-store'})", "fetch(origem,{cache:'default'})")
    text = text.replace(
        '<scr\' + \'ipt src="../admin-warmup.js?v=20260813-admin-v102"></scr\' + \'ipt>',
        ''
    )
    text = text.replace('20260808-profissionais-duplicidade-v1', '20260813-admin-v102')
    text = text.replace('20260812-validade-safari-v6', '20260813-admin-v102')
    if p.endswith('recados-campanhas.html'):
        text = text.replace(
            '  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n'
            '  <meta http-equiv="Pragma" content="no-cache">\n'
            '  <meta http-equiv="Expires" content="0">\n',
            ''
        )
    write(p, text)

# Moradores: retirar auto-update do Portal público e usar apenas warmup administrativo leve.
p = 'teste-v1/painel-moradores-v2.html'
text = read(p)
text = text.replace(
    '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n'
    '<meta http-equiv="Pragma" content="no-cache">\n'
    '<meta http-equiv="Expires" content="0">\n',
    ''
)
text = text.replace(
    '<script src="../portal-auto-update.js?v=20260812-v100"></script>',
    '<script src="../admin-warmup.js?v=20260813-admin-v102"></script>'
)
text = text.replace(
    'painel-moradores-transport-v2.js?v=20260811-v361-safari',
    'painel-moradores-transport-v2.js?v=20260813-admin-v102'
)
write(p, text)

# Teste existente: trocar expectativa da espera antiga pelo caminho rápido.
p = 'scripts/test_admin_transport.js'
text = read(p)
old = """  assert.match(base, /proximaEspera:2500/);\n  assert.match(base, /Math\\.min\\(8000,[^)]*\\+1000\\)/);\n  assert.match(base, /},25000\\)/);\n  if (config.file === 'teste-v1/painel-recados-campanhas-v1.html') {\n    assert.match(base, /ativa\\.limite=Date\\.now\\(\\)\\+74000/);\n  } else {\n    assert.match(base, /limite:Date\\.now\\(\\)\\+74000/);\n  }\n  assert.match(base, /},75000\\)/);\n"""
new = """  assert.match(base, /mode:'no-cors'/, `${config.file} não possui POST rápido sem iframe no caminho principal.`);\n  assert.match(base, /proximaEspera:350/, `${config.file} não inicia a confirmação rapidamente.`);\n  assert.match(base, /credentials:'omit'/, `${config.file} não preserva o POST administrativo sem credenciais Google.`);\n  assert.doesNotMatch(base, /proximaEspera:2500/);\n  assert.doesNotMatch(base, /74000|75000/);\n"""
if old not in text:
    raise SystemExit('bloco antigo de tempo do test_admin_transport não encontrado')
text = text.replace(old, new, 1)
text = text.replace('12-auto-v101)', '12-auto-v101|13-admin-v102)')
write(p, text)

# Teste dedicado aos quatro painéis.
fast_test = r'''\n'use strict';\nconst assert=require('node:assert/strict');\nconst fs=require('node:fs');\nconst path=require('node:path');\nconst ROOT=path.resolve(__dirname,'..');\nconst read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');\nconst transports=[\n  'teste-v1/painel-profissionais-servicos-v1.html',\n  'teste-v1/painel-recados-campanhas-v1.html',\n  'painel-oficial-agendas-vagas.html',\n  'teste-v1/painel-moradores-transport-v2.js'\n];\nfor(const file of transports){\n  const t=read(file);\n  assert.match(t,/mode:'no-cors'/,file+' sem transporte POST rápido');\n  assert.match(t,/(?:proximaEspera|nextWait):350/,file+' sem polling inicial curto');\n  assert.doesNotMatch(t,/74000|75000/,file+' ainda contém espera administrativa de 75 segundos');\n  assert.equal((t.match(/\\.submit\\(\\)/g)||[]).length,1,file+' deve manter apenas um envio fallback, sem reenvio automático');\n}\nconst moradores=read('teste-v1/painel-moradores-v2.html');\nassert.doesNotMatch(moradores,/portal-auto-update\\.js/,'Moradores não deve carregar a UI de atualização do Portal TACS');\nassert.match(moradores,/admin-warmup\\.js\\?v=20260813-admin-v102/);\nconst warm=read('admin-warmup.js');\nassert.doesNotMatch(warm,/portal-auto-update\\.js/,'Warmup administrativo não deve injetar a rotina do Portal TACS');\nfor(const file of ['painel-oficial-profissionais-servicos.html','painel-oficial-recados-campanhas.html']){\n  const t=read(file);\n  assert.match(t,/cache:'default'/,file+' deve permitir cache do HTML versionado');\n  assert.doesNotMatch(t,/cache:'no-store'/,file+' ainda força download integral a cada abertura');\n  assert.match(t,/admin-warmup\\.js\\?v=20260813-admin-v102/);\n}\nconsole.log('ADMIN_FAST_V102_TESTS_OK');\n'''
write('scripts/test_admin_fast_v102.js', fast_test.lstrip())

p = 'package.json'
text = read(p)
if 'test_admin_fast_v102.js' not in text:
    text = text.replace(
        'node scripts/test_admin_transport.js &&',
        'node scripts/test_admin_transport.js && node scripts/test_admin_fast_v102.js &&',
        1
    )
write(p, text)

p = 'scripts/test_quality_gate_v101.js'
text = read(p)
if 'test_admin_fast_v102.js' not in text:
    marker = "'test_admin_transport.js',"
    if marker not in text:
        raise SystemExit('quality gate sem test_admin_transport')
    text = text.replace(marker, marker + "'test_admin_fast_v102.js',", 1)
write(p, text)

print('APLICACAO_ADMIN_V102_OK')
