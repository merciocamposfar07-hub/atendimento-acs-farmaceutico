from pathlib import Path

# Executor auxiliar temporário do Bloco 3 — não entra na main.
p=Path('scripts/test_admin_transport.js')
s=p.read_text(encoding='utf-8')
old="    assert.match(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'\\+areaId/);"
new="""    assert.match(official, /portalTacsAdminSnapshotV1:agendas:/);
    assert.match(official, /function cacheIdentity\\(\\)/);
    assert.match(official, /p&&p\\.tacsId/);
    assert.match(official, /p&&p\\.areaId/);
    assert.doesNotMatch(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'\\+areaId/);"""
if old in s:
    p.write_text(s.replace(old,new,1),encoding='utf-8')
elif 'portalTacsAdminSnapshotV1:agendas:' not in s:
    raise SystemExit('PADRAO_ANTIGO_ADMIN_TRANSPORT_NAO_ENCONTRADO')

# O Bloco 3 não tem autorização para mudar a mensagem de sessão existente.
prof=Path('teste-v1/painel-profissionais-servicos-v1.html')
ps=prof.read_text(encoding='utf-8')
nova="silencioso?'A sessão anterior não pôde ser validada; digite o PIN.'"
original="silencioso?'Conexão preparada. A sessão anterior não pôde ser reutilizada; digite o PIN.'"
if nova in ps:
    prof.write_text(ps.replace(nova,original,1),encoding='utf-8')
elif original not in ps:
    raise SystemExit('MENSAGEM_ORIGINAL_PROFISSIONAIS_NAO_ENCONTRADA')
print('CONTRATOS_BLOCO3_ATUALIZADOS_SEM_MUDANCA_PARALELA')
