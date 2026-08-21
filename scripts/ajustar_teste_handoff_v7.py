from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
# V7 mudou deliberadamente o deviceId para não criar identidade durante consulta comum
# e mudou o cache-buster. Remova contratos estáticos das versões anteriores.
t=t.replace('dispositivo:deviceId\\(\\)','dispositivo:deviceId\\(false\\)')
t=t.replace('20260821-tacs-device-v6','20260821-tacs-device-v7')
t=t.replace('20260821-tacs-device-v5','20260821-tacs-device-v7')
# O fragmento é lido por URLSearchParams.get('tacsTeste'), não por atribuição textual.
t=t.replace("assert.match(familyClient,/tacsTeste=/);","assert.match(familyClient,/q\\.get\\('tacsTeste'\\)/);")
checks=[
 'dispositivo:deviceId\\(false\\)',
 '20260821-tacs-device-v7',
 "q\\.get\\('tacsTeste'\\)"
]
for check in checks:
    if check not in t:
        raise SystemExit('Teste TACS: contrato V7 ausente: '+check)
if '20260821-tacs-device-v6' in t or '20260821-tacs-device-v5' in t:
    raise SystemExit('Teste TACS: restou referência antiga de cache.')
p.write_text(t,encoding='utf-8')
print('Contratos do teste TACS normalizados para V7, incluindo fragmento de handoff.')