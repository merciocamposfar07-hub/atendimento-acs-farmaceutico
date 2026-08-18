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
new_territory = """  assert.equal(window.document.getElementById('tacsCnsLogin'), null, 'O painel TACS e áreas não deve pedir CNS para login');
  assert.ok(window.document.getElementById('tacsPinLogin'), 'O painel TACS e áreas deve manter o PIN individual');
  assert.ok(window.document.getElementById('tacsLoginButton'), 'O botão de login TACS deve permanecer disponível');
  assert.match(js, /admin_territorio_login_pin/, 'O painel TACS e áreas deve usar a rota de login somente por PIN');
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
s = apply_idempotent(s, old_territory, new_territory, 'teste TACS e áreas')

for marker in [
    "getElementById('tacsCnsAccess'), null",
    "getElementById('tacsCnsLogin'), null",
    "getElementById('tacsPinAccess')",
    "getElementById('tacsPinLogin')",
    "admin_territorio_login_pin"
]:
    if marker not in s:
        raise SystemExit('Gate PIN-only ausente: ' + marker)

p.write_text(s, encoding='utf-8')
print('Dois testes territoriais PIN-only validados/atualizados com idempotência.')
