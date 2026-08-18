from pathlib import Path

js_path = Path('central-administrativa-tacs.js')
html_path = Path('central-administrativa-tacs.html')

js = js_path.read_text(encoding='utf-8')
old = "if(profileIcon){profileIcon.src=mode==='admin'?'/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icones-oficiais-v1':'/atendimento-acs-farmaceutico/icons/painel-tacs-areas-512.png?v=20260818-icones-oficiais-v1';}"
new = "if(profileIcon){profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';}"
if js.count(old) != 1:
    raise SystemExit(f'Esperado 1 bloco antigo do ícone por perfil; encontrado {js.count(old)}')
js = js.replace(old, new, 1)
js_path.write_text(js, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
old_version = 'central-administrativa-tacs.js?v=20260818-icones-oficiais-v1'
new_version = 'central-administrativa-tacs.js?v=20260818-icone-central-todos-v2'
if html.count(old_version) != 1:
    raise SystemExit(f'Esperado 1 versionamento antigo do JS; encontrado {html.count(old_version)}')
html = html.replace(old_version, new_version, 1)
html_path.write_text(html, encoding='utf-8')

print('ICONE_CENTRAL_TODOS_V2_OK')
