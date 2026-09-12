from pathlib import Path

p = Path('scripts/test_territorio_dom.js')
s = p.read_text(encoding='utf-8')

old_resident = """  window.document.getElementById('tacsCnsAccess').value = '123';
  window.document.getElementById('tacsPinAccess').value = '1234';
  window.document.getElementById('loginTacs').click();
  assert.match(window.document.getElementById('loginStatus').textContent, /15 números do CNS/);
  dom.window.close();
"""
new_resident = """  assert.equal(window.document.getElementById('tacsCnsAccess'), null, 'O login TACS não deve mais exibir CNS profissional');
  assert.ok(window.document.getElementById('tacsPinAccess'), 'O login TACS deve manter o PIN individual');
  assert.ok(window.document.getElementById('loginTacs'), 'O botão de acesso TACS deve permanecer disponível');
  assert.match(source('teste-v1/painel-moradores-transport-v2.js'), /admin_territorio_login_pin/, 'O transporte deve usar a rota de login somente por PIN');
  dom.window.close();
"""

old_territory = """  window.document.getElementById('tacsCnsLogin').value = '123';
  window.document.getElementById('tacsPinLogin').value = '1234';
  window.document.getElementById('tacsLoginButton').click();
  assert.match(window.document.getElementById('loginStatus').textContent, /CNS profissional com 15 números/);
"""
new_territory = """  assert.equal(window.document.getElementById('loginPanel'),null,'Módulo territorial não deve ter segundo login.');
  assert.equal(window.document.getElementById('adminLoginButton'),null,'Login administrativo interno deve permanecer removido.');
  assert.equal(window.document.getElementById('tacsLoginButton'),null,'Login TACS interno deve permanecer removido.');
  assert.ok(window.document.getElementById('workAreaSelect'),'Área de trabalho deve existir.');
  assert.match(js, /TERRITORIO_HERDA_SESSAO_CENTRAL_V1/, 'O painel territorial deve herdar a sessão da Central.');
  assert.doesNotMatch(js, /post\\('admin_login'/, 'O painel territorial não pode refazer login administrativo.');
  assert.doesNotMatch(js, /post\\('admin_territorio_login_pin'/, 'O painel territorial não pode refazer login TACS.');
"""

def apply_idempotent(text, old, new, label):
    old_count = text.count(old)
    new_count = text.count(new)
    if old_count == 1:
        return text.replace(old, new, 1)
    if old_count == 0 and new_count == 1:
        return text
    raise SystemExit(f'Estado inesperado em {label}: legado={old_count}, atual={new_count}.')

s = apply_idempotent(s, old_resident, new_resident, 'teste de Moradores')
old_count = s.count(old_territory)
new_contract = "TERRITORIO_HERDA_SESSAO_CENTRAL_V1"
if old_count == 1:
    s = s.replace(old_territory, new_territory, 1)
elif old_count == 0 and new_contract in s and "getElementById('workAreaSelect')" in s:
    pass
else:
    raise SystemExit(f'Estado inesperado em teste TACS e áreas: legado={old_count}, contrato_novo={new_contract in s}.')

for marker in [
    "getElementById('tacsCnsAccess'), null",
    "getElementById('tacsPinAccess')",
    "getElementById('workAreaSelect')",
    "TERRITORIO_HERDA_SESSAO_CENTRAL_V1"
]:
    if marker not in s:
        raise SystemExit('Gate PIN-only ausente: ' + marker)

p.write_text(s, encoding='utf-8')
print('Moradores PIN-only e Gestão territorial sem segundo login validados/atualizados com idempotência.')
