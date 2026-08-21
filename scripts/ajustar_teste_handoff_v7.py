from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
old="assert.match(familyClient,/dispositivo:deviceId\\(\\)/);"
new="assert.match(familyClient,/dispositivo:deviceId\\(false\\)/);"
if new not in t:
    if old not in t:
        raise SystemExit('Asserção antiga de deviceId não encontrada no teste TACS.')
    t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')
print('Contrato de teste V7 ajustado para deviceId(false).')