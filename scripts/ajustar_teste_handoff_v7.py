from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

# Teste específico do modo TACS.
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace('dispositivo:deviceId\\(\\)','dispositivo:deviceId\\(false\\)')
t=t.replace('20260821-tacs-device-v6','20260821-tacs-device-v7')
t=t.replace('20260821-tacs-device-v5','20260821-tacs-device-v7')
t=t.replace("assert.match(familyClient,/tacsTeste=/);","assert.match(familyClient,/q\\.get\\('tacsTeste'\\)/);")
for check in ['dispositivo:deviceId\\(false\\)','20260821-tacs-device-v7',"q\\.get\\('tacsTeste'\\)"]:
    if check not in t: raise SystemExit('Teste TACS: contrato V7 ausente: '+check)
if '20260821-tacs-device-v6' in t or '20260821-tacs-device-v5' in t: raise SystemExit('Teste TACS: restou referência antiga de cache.')
p.write_text(t,encoding='utf-8')

# Suíte histórica de identificação familiar: o comportamento é o mesmo, só mudou o cache-buster.
p=ROOT/'scripts/test_identificacao_familiar_publica_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace("assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=20260820-v1/);","assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v7/);")
t=t.replace('portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v6','portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v7')
t=t.replace('portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v5','portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v7')
if 'portal-identificacao-familia-v1\\.js\\?v=20260821-tacs-device-v7' not in t: raise SystemExit('Teste identificação familiar: loader V7 ausente.')
p.write_text(t,encoding='utf-8')

# Gate geral: aceita a revisão pública atual V7 além da base histórica.
p=ROOT/'scripts/test_quality_gate_v101.js'
t=p.read_text(encoding='utf-8')
old="/portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3)/.test(index)"
new="/portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3|21-tacs-device-v7)/.test(index)"
if new not in t:
    if old not in t: raise SystemExit('Gate de qualidade: contrato do portal-auto-update não encontrado.')
    t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

print('Suíte específica e contratos históricos atualizados somente para os cache-busters da V7.')