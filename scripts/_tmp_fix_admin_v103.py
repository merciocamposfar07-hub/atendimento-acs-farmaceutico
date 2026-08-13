from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, path):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{path}: esperado 1 ocorrência, encontrei {n}: {old[:100]}')
    return text.replace(old, new, 1)

def replace_all(text, old, new, path):
    n = text.count(old)
    if n < 1:
        raise SystemExit(f'{path}: padrão não encontrado: {old[:100]}')
    return text.replace(old, new)

def remove_fetch_helper(text, path):
    out, n = re.subn(
        r'\nfunction enviarPostRapidoV102\(campos\)\{.*?\n\}\nfunction post',
        '\nfunction post',
        text,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise SystemExit(f'{path}: helper enviarPostRapidoV102 não localizado exatamente uma vez')
    return out

# Profissionais e Serviços: volta ao POST por formulário/iframe persistente.
p = 'teste-v1/painel-profissionais-servicos-v1.html'
t = read(p)
t = replace_once(t, "},5500);function limpar()", "},12000);function limpar()", p)
t = remove_fetch_helper(t, p)
t = replace_once(t, "var duracao=acesso?20000:55000;", "var duracao=acesso?30000:60000;", p)
t = replace_once(t, "proximaEspera:350", "proximaEspera:450", p)
t = replace_once(t, "  if(enviarPostRapidoV102(campos)){agendarConsultaResultado();return}\n", "", p)
t = replace_once(t, "Math.min(1600,Math.max(550,ativa.proximaEspera+150))", "Math.min(1800,Math.max(600,ativa.proximaEspera+150))", p)
write(p, t)

# Agendas oficial e base de homologação: iframe persistente, sem fetch no-cors.
for p in ['painel-oficial-agendas-vagas.html', 'teste-v1/painel-agendas-v1.html']:
    t = read(p)
    t = replace_once(t, "},5500);function limpar()", "},12000);function limpar()", p)
    t = remove_fetch_helper(t, p)
    t = replace_once(t, "var duracao=acesso?20000:55000;", "var duracao=acesso?30000:60000;", p)
    t = replace_once(t, "proximaEspera:350", "proximaEspera:450", p)
    t = replace_once(t, "  if(enviarPostRapidoV102(campos)){agendarConsultaResultado(350);return}\n", "", p)
    t = replace_once(t, "agendarConsultaResultado(350)\n}", "agendarConsultaResultado(450)\n}", p)
    write(p, t)

# Recados e Campanhas: restaura registro seguro do iframe dinâmico no Safari.
p = 'teste-v1/painel-recados-campanhas-v1.html'
t = read(p)
t = replace_once(t, "},5500);function limpar()", "},12000);function limpar()", p)
t = remove_fetch_helper(t, p)
t = replace_once(t, "var duracao=acesso?20000:55000;", "var duracao=acesso?30000:60000;", p)
t = replace_once(t, "proximaEspera:350", "proximaEspera:450", p)
t = replace_once(t, "  if(enviarPostRapidoV102(campos)){agendarConsulta();return}\n", "", p)
old = """  var enviado=false;
  function enviarUmaVez(){
    if(enviado)return;
    enviado=true;
    try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'})}
  }
  if(window.requestAnimationFrame){window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)})}
  ativa.submitTimer=setTimeout(enviarUmaVez,180);
  agendarConsulta();
"""
new = """  var enviado=false;
  function enviarUmaVez(){
    if(enviado||!ativa||ativa.id!==id)return;
    enviado=true;
    clearTimeout(ativa.submitTimer);ativa.submitTimer=null;
    try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
    agendarConsulta();
  }
  function enviarDepoisDoRegistro(){
    if(typeof window.requestAnimationFrame==='function'){
      window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)});
      return;
    }
    setTimeout(enviarUmaVez,60);
  }
  frame.addEventListener('load',enviarDepoisDoRegistro,{once:true});
  enviarDepoisDoRegistro();
  ativa.submitTimer=setTimeout(enviarUmaVez,180);
"""
t = replace_once(t, old, new, p)
write(p, t)

# Moradores: mesma proteção de registro de iframe dinâmico no Safari.
p = 'teste-v1/painel-moradores-transport-v2.js'
t = read(p)
t = replace_once(t, "},5500);", "},12000);", p)
t = remove_fetch_helper(t, p)
t = replace_once(t, "var duration=escrita?55000:20000;", "var duration=escrita?60000:30000;", p)
t = replace_once(t, "nextWait:350", "nextWait:450", p)
t = replace_once(t, "  if(enviarPostRapidoV102(fields)){schedulePoll();return}\n", "", p)
old = """  var enviado=false;
  function enviarUmaVez(){
    if(enviado)return;
    enviado=true;
    try{form.submit()}catch(erro){finish({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'})}
  }
  if(window.requestAnimationFrame){window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)})}
  active.submitTimer=setTimeout(enviarUmaVez,180);
  schedulePoll();
"""
new = """  var enviado=false;
  function enviarUmaVez(){
    if(enviado||!active||active.id!==rid)return;
    enviado=true;
    clearTimeout(active.submitTimer);active.submitTimer=null;
    try{form.submit()}catch(erro){finish({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
    schedulePoll();
  }
  function enviarDepoisDoRegistro(){
    if(typeof window.requestAnimationFrame==='function'){
      window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)});
      return;
    }
    setTimeout(enviarUmaVez,60);
  }
  frame.addEventListener('load',enviarDepoisDoRegistro,{once:true});
  enviarDepoisDoRegistro();
  active.submitTimer=setTimeout(enviarUmaVez,180);
"""
t = replace_once(t, old, new, p)
write(p, t)

# Força os quatro painéis a baixar a revisão administrativa nova.
for p in [
    'painel-oficial-profissionais-servicos.html',
    'painel-oficial-recados-campanhas.html',
    'teste-v1/painel-moradores-v2.html',
]:
    t = read(p)
    t = replace_all(t, '20260813-admin-v102', '20260813-admin-v103', p)
    write(p, t)

p = 'painel-oficial-agendas-vagas.html'
t = read(p)
t = replace_once(t, 'admin-warmup.js?v=20260812-auto-v101', 'admin-warmup.js?v=20260813-admin-v103', p)
write(p, t)

# Substitui o teste v102 que exigia o transporte defeituoso por um teste v103 que o proíbe.
p = 'scripts/test_admin_fast_v102.js'
write(p, r'''\'use strict\';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const transports=[
  ['teste-v1/painel-profissionais-servicos-v1.html','proximaEspera:450',false],
  ['teste-v1/painel-recados-campanhas-v1.html','proximaEspera:450',true],
  ['painel-oficial-agendas-vagas.html','proximaEspera:450',false],
  ['teste-v1/painel-moradores-transport-v2.js','nextWait:450',true]
];
for(const [file,wait,dynamicFrame] of transports){
  const t=read(file);
  assert.doesNotMatch(t,/mode:'no-cors'/,file+' não pode usar fetch no-cors para autenticação');
  assert.doesNotMatch(t,/enviarPostRapidoV102/,file+' ainda contém o transporte v102 defeituoso');
  assert.ok(t.includes(wait),file+' sem polling inicial curto');
  assert.match(t,/12000/,file+' deve tolerar cold start do Apps Script');
  assert.doesNotMatch(t,/74000|75000/,file+' ainda contém espera administrativa de 75 segundos');
  assert.equal((t.match(/\.submit\(\)/g)||[]).length,1,file+' deve enviar cada operação apenas uma vez');
  assert.match(t,/\.method='POST'/,file+' deve manter POST por formulário compatível com Safari');
  if(dynamicFrame)assert.match(t,/addEventListener\('load',enviarDepoisDoRegistro,\{once:true\}\)/,file+' sem registro seguro do iframe dinâmico');
}
const moradores=read('teste-v1/painel-moradores-v2.html');
assert.doesNotMatch(moradores,/portal-auto-update\.js/,'Moradores não deve carregar UI do Portal TACS');
assert.match(moradores,/painel-moradores-transport-v2\.js\?v=20260813-admin-v103/);
const warm=read('admin-warmup.js');
assert.doesNotMatch(warm,/portal-auto-update\.js/,'Warmup administrativo não deve injetar atualização do Portal público');
for(const file of ['painel-oficial-profissionais-servicos.html','painel-oficial-recados-campanhas.html']){
  const t=read(file);
  assert.match(t,/cache:'default'/,file+' deve reutilizar HTML versionado');
  assert.doesNotMatch(t,/cache:'no-store'/,file+' não deve forçar download integral');
  assert.match(t,/20260813-admin-v103/);
}
assert.match(read('painel-oficial-agendas-vagas.html'),/admin-warmup\.js\?v=20260813-admin-v103/);
console.log('ADMIN_LOGIN_V103_TRANSPORT_TESTS_OK');
'''.replace("\\'use strict\\';", "'use strict';"))

# Atualiza asserts do teste DOM para exercitar exatamente o transporte Safari.
p = 'scripts/test_admin_transport.js'
t = read(p)
t = replace_once(
    t,
    "    assert.match(base, /mode:'no-cors'/);\n    assert.match(base, /if\\(enviarPostRapidoV102\\(campos\\)\\)\\{agendarConsulta\\(\\);return\\}/);",
    "    assert.doesNotMatch(base, /mode:'no-cors'/);\n    assert.doesNotMatch(base, /enviarPostRapidoV102/);\n    assert.match(base, /frame\\.addEventListener\\('load',enviarDepoisDoRegistro,\\{once:true\\}\\)/);",
    p,
)
old = """  assert.match(base, /mode:'no-cors'/, `${config.file} não possui POST rápido sem iframe no caminho principal.`);
  assert.match(base, /proximaEspera:350/, `${config.file} não inicia a confirmação rapidamente.`);
  assert.match(base, /credentials:'omit'/, `${config.file} não preserva o POST administrativo sem credenciais Google.`);
"""
new = """  assert.doesNotMatch(base, /mode:'no-cors'/, `${config.file} não pode usar fetch no-cors no caminho administrativo.`);
  assert.doesNotMatch(base, /enviarPostRapidoV102/, `${config.file} ainda contém o transporte v102 que falhou no Safari real.`);
  assert.match(base, /proximaEspera:450/, `${config.file} não inicia a confirmação rapidamente.`);
  assert.match(base, /form\.method='POST'|f\.method='POST'/, `${config.file} não preserva POST por formulário compatível com Safari.`);
"""
t = replace_once(t, old, new, p)
t = replace_once(
    t,
    "/admin-warmup\\.js\\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1|12-auto-v101|13-admin-v102)/",
    "/admin-warmup\\.js\\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1|12-auto-v101|13-admin-v103)/",
    p,
)
# Define fetch no teste para garantir que a página NÃO o use. O formulário deve continuar sendo acionado.
needle = "      window.PortalTacsAdminPreload = {ok: true};\n      window.HTMLFormElement.prototype.submit = function submit() {"
replacement = "      window.PortalTacsAdminPreload = {ok: true};\n      window.fetch = function(){ errors.push('O fluxo administrativo tentou usar fetch no-cors.'); return Promise.reject(new Error('fetch administrativo proibido neste teste')); };\n      window.HTMLFormElement.prototype.submit = function submit() {"
t = replace_once(t, needle, replacement, p)
write(p, t)

# Gate geral aponta para a nova revisão administrativa.
p = 'scripts/test_quality_gate_v101.js'
t = read(p)
old = "contem(agenda, 'admin-warmup.js?v=20260812-auto-v101') && contem(profissionais, 'admin-warmup.js?v=20260813-admin-v102') && contem(recados, 'admin-warmup.js?v=20260813-admin-v102')"
new = "contem(agenda, 'admin-warmup.js?v=20260813-admin-v103') && contem(profissionais, 'admin-warmup.js?v=20260813-admin-v103') && contem(recados, 'admin-warmup.js?v=20260813-admin-v103')"
t = replace_once(t, old, new, p)
write(p, t)

print('FIX_ADMIN_V103_APLICADO')
