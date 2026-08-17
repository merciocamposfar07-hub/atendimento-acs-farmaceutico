from pathlib import Path
p=Path('painel-oficial-agendas-vagas.html')
s=p.read_text()
old='agenda-whatsapp-card-v1.js?v=20260817-1'
new='agenda-whatsapp-card-v1.js?v=20260817-agenda-completa-v2'
if new in s:
    raise SystemExit(0)
if old not in s:
    raise SystemExit('Referência do card de agenda não encontrada')
p.write_text(s.replace(old,new,1))
