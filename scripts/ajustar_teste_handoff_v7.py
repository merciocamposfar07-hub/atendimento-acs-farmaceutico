from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
repls=[
("assert.match(familyClient,/dispositivo:deviceId\\(\\)/);","assert.match(familyClient,/dispositivo:deviceId\\(false\\)/);"),
("assert.match(loader,/admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v6/);","assert.match(loader,/admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v7/);")
]
for old,new in repls:
    if new in t:
        continue
    if old not in t:
        raise SystemExit('Asserção antiga esperada não encontrada no teste TACS: '+old)
    t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')
print('Contratos de teste V7 ajustados para deviceId(false) e cache-buster V7.')