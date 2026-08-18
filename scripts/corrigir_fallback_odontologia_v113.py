from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = "setTimeout(function(){if(!window.PortalTacsOdontologiaV98)loadDental()},3000);"
new = "setTimeout(function(){if(!window.__PORTAL_TACS_ODONTOLOGIA_V98__)loadDental()},3000);"

if s.count(old) != 1:
    raise SystemExit(f'Fallback odontológico esperado uma vez; encontrado {s.count(old)}.')

s = s.replace(old, new, 1)

if s.count(new) != 1:
    raise SystemExit('A nova trava do fallback não foi aplicada exatamente uma vez.')
if 'portal-odontologia-segunda-sexta.js?v=20260818-expiracao-horario-v112' not in s:
    raise SystemExit('O módulo odontológico atual não foi preservado.')

p.write_text(s, encoding='utf-8')
print('Fallback antigo agora só entra quando o módulo odontológico externo realmente não carregar.')
