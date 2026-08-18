from pathlib import Path

js = Path('portal-ajustes-finais.js')
idx = Path('index.html')

s = js.read_text(encoding='utf-8')
old = "card.innerHTML = 'Enviar solicitação em card azul-petróleo<small>Card profissional com identificação da área e do TACS responsável.</small>';"
new = "card.innerHTML = 'Enviar solicitação<small>Card profissional com identificação da área e do TACS responsável.</small>';"
if s.count(old) != 1:
    raise SystemExit(f'Texto esperado encontrado {s.count(old)} vez(es); abortando.')
s = s.replace(old, new, 1)
if 'Enviar solicitação em card azul-petróleo' in s:
    raise SystemExit('Texto antigo ainda presente no módulo.')
js.write_text(s, encoding='utf-8')

h = idx.read_text(encoding='utf-8')
oldv = 'portal-ajustes-finais.js?v=20260818-aposentadoria-destino-v5'
newv = 'portal-ajustes-finais.js?v=20260818-botao-envio-v6'
if oldv not in h:
    raise SystemExit('Versão atual de portal-ajustes-finais.js não localizada no index.')
h = h.replace(oldv, newv, 1)
idx.write_text(h, encoding='utf-8')

print('BOTAO_ENVIO_TEXTO_V1_OK')
