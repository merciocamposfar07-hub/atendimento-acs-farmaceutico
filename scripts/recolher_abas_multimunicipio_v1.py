from pathlib import Path

p=Path('painel-oficial-organizacoes-municipios.html')
s=p.read_text(encoding='utf-8')
original=s

old_css=".tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}.tab{min-width:0;min-height:52px;border:2px solid var(--border);border-radius:15px;background:#fff;color:var(--p);font-weight:900;padding:9px 8px;overflow-wrap:anywhere}.tab.active{background:var(--p);border-color:var(--p);color:#fff}"
new_css=".tabs{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(0,1fr) minmax(0,.82fr);gap:8px;margin-bottom:14px}.tab{min-width:0;min-height:52px;border:2px solid var(--border);border-radius:15px;background:#fff;color:var(--p);font-weight:900;padding:9px 5px;white-space:nowrap;overflow-wrap:normal;word-break:normal;font-size:clamp(.76rem,3.45vw,.94rem)}.tab.active{background:var(--p);border-color:var(--p);color:#fff}"
if old_css not in s:
    raise SystemExit('CSS original das abas não localizado.')
s=s.replace(old_css,new_css,1)

old_mobile="@media(max-width:430px){.tabs{gap:6px}.tab{font-size:.94rem}.signal{max-width:38%}}"
new_mobile="@media(max-width:430px){.tabs{gap:5px}.tab{font-size:clamp(.72rem,3.25vw,.86rem);padding-left:3px;padding-right:3px}.signal{max-width:38%}}"
if old_mobile not in s:
    raise SystemExit('Media query original não localizada.')
s=s.replace(old_mobile,new_mobile,1)

old_tabs='<div class="tabs"><button class="tab active" data-tab="org" type="button">Organizações</button><button class="tab" data-tab="mun" type="button">Municípios</button><button class="tab" data-tab="areas" type="button">Áreas</button></div>'
new_tabs='<div class="tabs" role="tablist" aria-label="Escolha o conteúdo"><button class="tab" data-tab="org" type="button" aria-expanded="false" aria-controls="viewOrg">Organizações</button><button class="tab" data-tab="mun" type="button" aria-expanded="false" aria-controls="viewMun">Municípios</button><button class="tab" data-tab="areas" type="button" aria-expanded="false" aria-controls="viewAreas">Áreas</button></div>'
if old_tabs not in s:
    raise SystemExit('Bloco original das abas não localizado.')
s=s.replace(old_tabs,new_tabs,1)

old_org='<div id="viewOrg"><div class="newbox">'
new_org='<div id="viewOrg" hidden><div class="newbox">'
if old_org not in s:
    raise SystemExit('viewOrg aberto por padrão não localizado.')
s=s.replace(old_org,new_org,1)

old_js="document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('active',x===b)});el('viewOrg').hidden=b.dataset.tab!=='org';el('viewMun').hidden=b.dataset.tab!=='mun';el('viewAreas').hidden=b.dataset.tab!=='areas'})});"
new_js="document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){var wasActive=b.classList.contains('active');document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');x.setAttribute('aria-expanded','false')});el('viewOrg').hidden=true;el('viewMun').hidden=true;el('viewAreas').hidden=true;if(wasActive)return;b.classList.add('active');b.setAttribute('aria-expanded','true');if(b.dataset.tab==='org')el('viewOrg').hidden=false;else if(b.dataset.tab==='mun')el('viewMun').hidden=false;else if(b.dataset.tab==='areas')el('viewAreas').hidden=false})});"
if old_js not in s:
    raise SystemExit('JS original das abas não localizado.')
s=s.replace(old_js,new_js,1)

marker='/* ABAS_RECOLHIDAS_MULTIMUNICIPIO_V1 */'
if marker not in s:
    s=s.replace('</style>\n<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->',marker+'\n</style>\n<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->',1)

checks=[
    'id="viewOrg" hidden',
    'aria-controls="viewOrg"',
    "var wasActive=b.classList.contains('active')",
    "el('viewOrg').hidden=true",
    'white-space:nowrap',
    'grid-template-columns:minmax(0,1.18fr) minmax(0,1fr) minmax(0,.82fr)',
    marker,
]
for item in checks:
    if item not in s:
        raise SystemExit('Gate ausente: '+item)
if 'class="tab active" data-tab="org"' in s:
    raise SystemExit('Organizações ainda abre ativa por padrão.')
if s==original:
    raise SystemExit('Nenhuma alteração produzida.')
p.write_text(s,encoding='utf-8')
print('ABAS_RECOLHIDAS_MULTIMUNICIPIO_V1_OK')
