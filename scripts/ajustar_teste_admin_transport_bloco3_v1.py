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
if old not in s:
    if 'portalTacsAdminSnapshotV1:agendas:' in s:
        print('CONTRATO_ADMIN_TRANSPORT_BLOCO3_JA_ATUALIZADO')
        raise SystemExit(0)
    raise SystemExit('PADRAO_ANTIGO_ADMIN_TRANSPORT_NAO_ENCONTRADO')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('CONTRATO_ADMIN_TRANSPORT_BLOCO3_ATUALIZADO')
