from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for rel in ['painel-oficial-agendas-vagas.html','teste-v1/painel-profissionais-servicos-v1.html']:
    p=ROOT/rel
    s=p.read_text(encoding='utf-8')
    marker='function sharedAdminReadKey()'
    if s.count(marker)!=1: raise SystemExit(f'shared key inesperada em {rel}')
    s=s.replace(marker,'var sharedAdminReadConsumido=false;\n'+marker,1)
    old='var compartilhado=lerSharedAdminDados();'
    new='var compartilhado=sharedAdminReadConsumido?null:lerSharedAdminDados();sharedAdminReadConsumido=true;'
    if s.count(old)!=1: raise SystemExit(f'consumo shared inesperado em {rel}: {s.count(old)}')
    s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')

t=ROOT/'scripts/test_admin_request_dedup_v1.js'
s=t.read_text(encoding='utf-8')
needle="  assert.match(source,/var compartilhado=lerSharedAdminDados\\(\\)/);"
repl="  assert.match(source,/var sharedAdminReadConsumido=false/);\n  assert.match(source,/sharedAdminReadConsumido\\?null:lerSharedAdminDados\\(\\)/);"
if needle not in s: raise SystemExit('marcador teste dedup ausente')
t.write_text(s.replace(needle,repl,1),encoding='utf-8')
print('BLOCO4_CONSUMO_INICIAL_OK')
