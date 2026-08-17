from pathlib import Path

js_path=Path('teste-v1/painel-moradores-transport-v2.js')
html_path=Path('teste-v1/painel-moradores-v2.html')
js=js_path.read_text()
html=html_path.read_text()

old="""    var option=document.createElement('div');
    option.style.border='2px solid #c4d4db';option.style.borderRadius='15px';option.style.padding='12px';option.style.background='#fff';
    var summary=document.createElement('div');summary.innerHTML=residentSummary(item);option.appendChild(summary);
"""
new="""    var option=document.createElement('div');
    option.style.border='2px solid #c4d4db';option.style.borderRadius='15px';option.style.padding='12px';option.style.background='#fff';option.style.color='#102d40';
    var summary=document.createElement('div');summary.className='duplicateResidentSummary';summary.innerHTML=residentSummary(item);
    var duplicateName=summary.querySelector('strong');if(duplicateName){duplicateName.style.setProperty('color','#102d40','important');duplicateName.style.setProperty('font-size','1.18rem','important');duplicateName.style.setProperty('margin-bottom','7px','important')}
    var duplicateMeta=summary.querySelector('.sub');if(duplicateMeta){duplicateMeta.style.setProperty('color','#29495b','important');duplicateMeta.style.setProperty('font-size','.96rem','important');duplicateMeta.style.setProperty('font-weight','800','important');duplicateMeta.style.setProperty('line-height','1.45','important')}
    option.appendChild(summary);
"""
if old not in js:
    if new not in js:
        raise SystemExit('Bloco de duplicidade esperado não encontrado')
else:
    js=js.replace(old,new,1)

old_ref='painel-moradores-transport-v2.js?v=20260813-admin-v103'
new_ref='painel-moradores-transport-v2.js?v=20260817-duplicidade-legivel-v1'
if old_ref in html:
    html=html.replace(old_ref,new_ref,1)
elif new_ref not in html:
    raise SystemExit('Referência do transport de moradores não encontrada')

js_path.write_text(js)
html_path.write_text(html)
