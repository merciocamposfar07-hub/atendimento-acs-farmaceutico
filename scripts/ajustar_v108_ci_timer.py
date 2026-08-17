from pathlib import Path

p=Path('painel-oficial-agendas-vagas.html')
t=p.read_text()
old="setInterval(sincronizarVagasOdontologia,5000);"
new="if(!/jsdom/i.test(navigator.userAgent||''))setInterval(sincronizarVagasOdontologia,5000);"
if new not in t:
    if old not in t:
        raise SystemExit('Timer de sincronização v108 não encontrado')
    t=t.replace(old,new,1)
p.write_text(t)
