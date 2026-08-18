from pathlib import Path

js_path = Path('central-administrativa-tacs.js')
html_path = Path('central-administrativa-tacs.html')

js = js_path.read_text(encoding='utf-8')
old_open = "function openModule(name,title){var url=moduleUrl(name);if(!url)return;if(name==='portal'){window.open(url,'_blank','noopener');return}el('viewerTitle').textContent=title||'Painel';el('viewerFrame').src=url;el('viewer').hidden=false;document.body.classList.add('viewer-open')}"
new_open = "function openModule(name,title){var url=moduleUrl(name);if(!url)return;if(name==='portal'){window.open(url,'_blank','noopener');return}var sep=url.indexOf('?')===-1?'?':'&';url=url+sep+'_cb='+Date.now();el('viewerTitle').textContent=title||'Painel';el('viewerFrame').src=url;el('viewer').hidden=false;document.body.classList.add('viewer-open')}"
if old_open not in js:
    raise SystemExit('Trecho openModule esperado não encontrado; abortando sem alterar.')
js = js.replace(old_open, new_open, 1)
js_path.write_text(js, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
old_src = '/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260817-recados-cards-mensais-v12'
new_src = '/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260818-admin-cache-bust-v1'
if old_src not in html:
    raise SystemExit('Versão esperada do JS da Central não encontrada; abortando sem alterar.')
html = html.replace(old_src, new_src, 1)
html_path.write_text(html, encoding='utf-8')

print('AJUSTE_CACHE_CENTRAL_ADMIN_V1_OK')
