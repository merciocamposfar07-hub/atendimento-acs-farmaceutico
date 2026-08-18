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
if s.count(old) != 1:
    raise SystemExit(f'Bloco legado CNS+PIN encontrado {s.count(old)} vez(es), esperado 1.')
s = s.replace(old, new, 1)
for marker in [
    "getElementById('tacsCnsAccess'), null",
    "getElementById('tacsPinAccess')",
    "admin_territorio_login_pin"
]:
    if marker not in s:
        raise SystemExit('Gate PIN-only ausente: ' + marker)
p.write_text(s, encoding='utf-8')
print('Teste territorial atualizado para login TACS somente por PIN.')
