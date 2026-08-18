from pathlib import Path

p = Path('painel-oficial-organizacoes-municipios.html')
s = p.read_text(encoding='utf-8')

old = ".tab{min-width:0;min-height:52px;border:2px solid var(--border);border-radius:15px;background:#fff;color:var(--p);font-weight:900;padding:9px 5px;white-space:nowrap;overflow-wrap:normal;word-break:normal;font-size:clamp(.76rem,3.45vw,.94rem)}.tab.active{background:var(--p);border-color:var(--p);color:#fff}"
new = ".tab{min-width:0;min-height:52px;border:2px solid var(--blue);border-radius:15px;background:linear-gradient(145deg,var(--p),var(--p2));color:#fff;font-weight:900;padding:9px 5px;white-space:nowrap;overflow-wrap:normal;word-break:normal;font-size:clamp(.76rem,3.45vw,.94rem);box-shadow:0 5px 12px rgba(7,58,85,.14)}.tab.active{background:linear-gradient(145deg,var(--p),var(--p2));border-color:#8edfff;color:#fff;box-shadow:0 0 0 2px rgba(105,199,231,.24),0 6px 14px rgba(7,58,85,.18)}"

if old not in s:
    raise SystemExit('CSS atual das abas não localizado; abortando sem alterar.')

s = s.replace(old, new, 1)

marker = '/* ABAS_RECOLHIDAS_MULTIMUNICIPIO_V1 */'
if marker not in s:
    raise SystemExit('Marcador das abas recolhidas não localizado.')
s = s.replace(marker, marker + '\n/* ABAS_PETROLEO_MULTIMUNICIPIO_V1 */', 1)

checks = [
    'background:linear-gradient(145deg,var(--p),var(--p2));color:#fff',
    'border-color:#8edfff',
    'ABAS_PETROLEO_MULTIMUNICIPIO_V1',
    'data-tab="org"',
    'data-tab="mun"',
    'data-tab="areas"',
]
for item in checks:
    if item not in s:
        raise SystemExit('Gate visual ausente: ' + item)

p.write_text(s, encoding='utf-8')
print('ABAS_PETROLEO_MULTIMUNICIPIO_V1_OK')
