from pathlib import Path

p = Path('scripts/test_territorio_dom.js')
s = p.read_text(encoding='utf-8')
old = """  window.document.getElementById('tacsCnsAccess').value = '123';
  window.document.getElementById('tacsPinAccess').value = '1234';
  window.document.getElementById('loginTacs').click();
  assert.match(window.document.getElementById('loginStatus').textContent, /15 números do CNS/);
  dom.window.close();
"""
new = """  assert.equal(window.document.getElementById('tacsCnsAccess'), null, 'O login TACS não deve mais exibir CNS profissional');
  assert.ok(window.document.getElementById('tacsPinAccess'), 'O login TACS deve manter o PIN individual');
  assert.ok(window.document.getElementById('loginTacs'), 'O botão de acesso TACS deve permanecer disponível');
  assert.match(source('teste-v1/painel-moradores-transport-v2.js'), /admin_territorio_login_pin/, 'O transporte deve usar a rota de login somente por PIN');
  dom.window.close();
"""
count_old = s.count(old)
count_new = s.count(new)
if count_old == 1:
    s = s.replace(old, new, 1)
elif count_old == 0 and count_new == 1:
    pass
else:
    raise SystemExit(f'Estado inesperado do teste PIN-only: legado={count_old}, atual={count_new}.')

for marker in [
    "getElementById('tacsCnsAccess'), null",
    "getElementById('tacsPinAccess')",
    "admin_territorio_login_pin"
]:
    if marker not in s:
        raise SystemExit('Gate PIN-only ausente: ' + marker)
p.write_text(s, encoding='utf-8')
print('Teste territorial PIN-only validado/atualizado com idempotência.')
