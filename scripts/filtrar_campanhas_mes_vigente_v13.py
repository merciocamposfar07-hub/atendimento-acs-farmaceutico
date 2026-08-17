from pathlib import Path

js=Path('recados-campanhas-whatsapp-mensal-v12.js')
s=js.read_text(encoding='utf-8')

if 'function currentMonthKey()' not in s:
    anchor="function monthLabel(key){var m=String(key).match(/^(\\d{4})-(\\d{2})$/),meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return m?meses[Number(m[2])-1]+' '+m[1]:key}\n"
    helper=anchor+"function currentMonthKey(){var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');return y+'-'+m}\n"
    if anchor not in s: raise SystemExit('anchor monthLabel não encontrado')
    s=s.replace(anchor,helper,1)

start=s.find('function render(){')
end=s.find('\nfunction schedule()',start)
if start<0 or end<0: raise SystemExit('função render mensal não encontrada')
repl="function render(){if(rendering)return;rendering=true;try{var lista=document.getElementById('listaCampanhas');if(!lista)return;cleanupIndividual();lista.querySelectorAll('.campanha-mensal-whatsapp-v12').forEach(function(e){e.remove()});var vigente=currentMonthKey(),cards=[];lista.querySelectorAll('.item[data-id]').forEach(function(card){var mostrar=isActive(card)&&monthKey(card)===vigente;card.hidden=!mostrar;if(mostrar)cards.push(card)});if(!cards.length)return;var label=monthLabel(vigente),box=document.createElement('div');box.className='campanha-mensal-whatsapp-v12';box.innerHTML='<button type=\"button\" class=\"botao campanha-mensal-botao\"><span aria-hidden=\"true\">◉</span> Postar campanhas de '+label+' no Status do WhatsApp</button><div class=\"campanha-mensal-status\" aria-live=\"polite\"></div>';lista.insertBefore(box,cards[0]);var b=box.querySelector('button'),st=box.querySelector('.campanha-mensal-status');b.addEventListener('click',function(){shareMonth(cards,label,b,st)})}finally{rendering=false}}"
s=s[:start]+repl+s[end:]
js.write_text(s,encoding='utf-8')

p=Path('painel-oficial-recados-campanhas.html')
h=p.read_text(encoding='utf-8')
h=h.replace('recados-campanhas-whatsapp-mensal-v12.js?v=20260817-recados-cards-mensais-v12','recados-campanhas-whatsapp-mensal-v12.js?v=20260817-campanha-vigente-v13')
p.write_text(h,encoding='utf-8')
