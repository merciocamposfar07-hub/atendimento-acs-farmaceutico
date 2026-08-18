from pathlib import Path
import re

html_path = Path('teste-v1/painel-tacs-areas-v1.html')
js_path = Path('teste-v1/painel-tacs-areas-v1.js')
wrapper_path = Path('painel-oficial-tacs-areas.html')

html = html_path.read_text(encoding='utf-8')
js = js_path.read_text(encoding='utf-8')
wrapper = wrapper_path.read_text(encoding='utf-8')

# 1) Login do TACS: somente PIN. CNS continua existindo no cadastro administrativo.
old_login = '''<div id="tacsLogin" class="hidden"><label for="tacsCnsLogin">CNS profissional</label><input id="tacsCnsLogin" class="field" inputmode="numeric" maxlength="18"><label for="tacsPinLogin">PIN individual</label><input id="tacsPinLogin" class="field" type="password" inputmode="numeric" maxlength="8" autocomplete="off"><div class="actions"><button id="tacsLoginButton" class="btn" type="button">Entrar na minha área</button></div></div>'''
new_login = '''<div id="tacsLogin" class="hidden"><label for="tacsPinLogin">PIN individual</label><input id="tacsPinLogin" class="field" type="password" inputmode="numeric" maxlength="8" autocomplete="off"><div class="actions"><button id="tacsLoginButton" class="btn" type="button">Entrar na minha área</button></div></div>'''
if old_login not in html:
    raise SystemExit('Bloco de login TACS com CNS não localizado no HTML.')
html = html.replace(old_login, new_login, 1)

# 2) Frontend: validar apenas PIN e usar a rota PIN-only já existente no backend.
pattern = re.compile(
    r"el\('tacsLoginButton'\)\.addEventListener\('click',function\(\)\{var cns=digits\(el\('tacsCnsLogin'\)\.value\),pin=digits\(el\('tacsPinLogin'\)\.value\);if\(!/\^\\d\{15\}\$/\.test\(cns\)\|\|!/\^\\d\{4,8\}\$/\.test\(pin\)\)\{loginStatus\('Informe CNS profissional com 15 números e PIN individual\.',\'err\'\);return;\}loginStatus\('Validando o acesso individual…',\'warn\'\);post\('admin_territorio_login_tacs',\{cns:cns,pin:pin,dispositivo:device\},'admin_territorio_result',function\(r\)\{el\('tacsPinLogin'\)\.value='';if\(!r\|\|r\.ok!==true\|\|!r\.token\)\{loginStatus\(text\(r&&r\.message\|\|'Acesso recusado\.'\),'err'\);return;\}clearSession\(\);territorioToken=r\.token;mode='tacs';sessionStorage\.setItem\(TACS_TOKEN_KEY,territorioToken\);loadData\('Acesso individual validado para '\+text\(r\.areaNome\|\|r\.areaId\)\+'\.'\);\}\);\}\);"
)
replacement = "el('tacsLoginButton').addEventListener('click',function(){var pin=digits(el('tacsPinLogin').value);if(!/^\\d{4,8}$/.test(pin)){loginStatus('Informe o PIN individual de 4 a 8 números.','err');return;}loginStatus('Validando o PIN individual…','warn');post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){el('tacsPinLogin').value='';if(!r||r.ok!==true||!r.token){loginStatus(text(r&&r.message||'Acesso recusado.'),'err');return;}clearSession();territorioToken=r.token;mode='tacs';sessionStorage.setItem(TACS_TOKEN_KEY,territorioToken);loadData('Acesso individual validado para '+text(r.areaNome||r.areaId)+'.');});});"
js, count = pattern.subn(lambda m: replacement, js, count=1)
if count != 1:
    raise SystemExit('Listener antigo CNS+PIN não localizado exatamente uma vez.')

# 3) Cache bust do JS interno e do HTML carregado pelo wrapper oficial.
html = re.sub(r'painel-tacs-areas-v1\.js\?v=[^"\']+', 'painel-tacs-areas-v1.js?v=20260818-pin-only-v1', html, count=1)
wrapper = re.sub(
    r"/atendimento-acs-farmaceutico/teste-v1/painel-tacs-areas-v1\.html\?v=[^'\"]+",
    '/atendimento-acs-farmaceutico/teste-v1/painel-tacs-areas-v1.html?v=20260818-pin-only-v1',
    wrapper,
    count=1
)

# Gates de escopo.
assert 'id="tacsCnsLogin"' not in html
assert 'CNS profissional</label><input id="tacsCnsLogin"' not in html
assert 'id="tacsPinLogin"' in html
assert 'id="adminPin"' in html
assert 'id="tacsCns"' in html, 'O CNS cadastral do TACS não pode ser removido.'
assert "admin_territorio_login_pin" in js
assert "admin_territorio_login_tacs',{cns:" not in js
assert "tacsCnsLogin" not in js
assert "admin_login" in js
assert '20260818-pin-only-v1' in html
assert '20260818-pin-only-v1' in wrapper

html_path.write_text(html, encoding='utf-8')
js_path.write_text(js, encoding='utf-8')
wrapper_path.write_text(wrapper, encoding='utf-8')
print('PIN_ONLY_TACS_AREAS_V1_OK')
