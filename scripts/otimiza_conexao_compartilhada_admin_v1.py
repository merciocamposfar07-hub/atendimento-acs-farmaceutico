from pathlib import Path

central_js = Path('central-administrativa-tacs.js')
central_html = Path('central-administrativa-tacs.html')
agendas_html = Path('painel-oficial-agendas-vagas.html')

js = central_js.read_text(encoding='utf-8')
html = central_html.read_text(encoding='utf-8')
ag = agendas_html.read_text(encoding='utf-8')

# 1) A Central passa a registrar qualquer resposta bem-sucedida do Apps Script
# no mesmo estado de aquecimento já consumido por admin-warmup.js.
needle = "var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1';"
replacement = needle + "\nvar SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';"
if needle not in js:
    raise SystemExit('Constantes da Central não encontradas; abortando.')
js = js.replace(needle, replacement, 1)

needle = "function requestId(prefix){return 'central_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}"
replacement = needle + "\nfunction marcarConexaoRecente(){try{localStorage.setItem(SHARED_WARM_KEY,String(Date.now()))}catch(e){}}"
if needle not in js:
    raise SystemExit('requestId da Central não encontrado; abortando.')
js = js.replace(needle, replacement, 1)

needle = "if(s.parentNode)s.remove();cb(r)"
replacement = "if(s.parentNode)s.remove();if(r&&r.ok===true)marcarConexaoRecente();cb(r)"
if needle not in js:
    raise SystemExit('Finalização JSONP da Central não encontrada; abortando.')
js = js.replace(needle, replacement, 1)

needle = "op.cb(result||{ok:false,message:'Resposta vazia.'})"
replacement = "var finalResult=result||{ok:false,message:'Resposta vazia.'};if(finalResult&&finalResult.ok===true)marcarConexaoRecente();op.cb(finalResult)"
if needle not in js:
    raise SystemExit('Finalização POST da Central não encontrada; abortando.')
js = js.replace(needle, replacement, 1)

central_js.write_text(js, encoding='utf-8')

# 2) Força a própria Central a carregar essa nova versão do JS.
old_src = '/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260818-admin-cache-bust-v1'
new_src = '/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260818-shared-warm-v1'
if old_src not in html:
    raise SystemExit('Versão atual do JS da Central não encontrada; abortando.')
html = html.replace(old_src, new_src, 1)
central_html.write_text(html, encoding='utf-8')

# 3) Apenas corrige a mensagem visual de Agendas: não houve perda de sessão.
old1 = 'Dados exibidos da última leitura. Reconectando ao servidor…'
old2 = 'Dados exibidos da última leitura. Reconectando ao servidor automaticamente…'
new = 'Dados exibidos da última leitura. Atualizando dados em segundo plano…'
if old1 not in ag:
    raise SystemExit('Mensagem inicial de reconexão em Agendas não encontrada; abortando.')
ag = ag.replace(old1, new, 1)
if old2 not in ag:
    raise SystemExit('Mensagem de nova tentativa em Agendas não encontrada; abortando.')
ag = ag.replace(old2, new, 1)
agendas_html.write_text(ag, encoding='utf-8')

print('OTIMIZACAO_CONEXAO_COMPARTILHADA_ADMIN_V1_OK')
