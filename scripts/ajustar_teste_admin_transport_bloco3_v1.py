from pathlib import Path

# Executor auxiliar temporário do Bloco 3 — não entra na main.
# Atualiza somente contratos de teste que fixavam a antiga chave de cache por área.
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

perf=Path('scripts/test_performance_v101.js')
ps=perf.read_text(encoding='utf-8')
old_perf="  assert.ok(agenda.includes(\"DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'+areaId\"));"
new_perf="""  assert.ok(agenda.includes('portalTacsAdminSnapshotV1:agendas:'), 'Snapshot de Agendas deve usar namespace local-first versionado');
  assert.ok(agenda.includes('function cacheIdentity()'), 'Snapshot de Agendas deve ser separado por identidade autenticada');
  assert.ok(agenda.includes('p&&p.tacsId') && agenda.includes('p&&p.areaId'), 'Snapshot TACS deve exigir TACS + área');
  assert.ok(!agenda.includes(\"DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'+areaId\"), 'Chave antiga somente por área não pode permanecer');"""
if old_perf in ps:
    perf.write_text(ps.replace(old_perf,new_perf,1),encoding='utf-8')
elif 'Snapshot de Agendas deve usar namespace local-first versionado' not in ps:
    raise SystemExit('PADRAO_ANTIGO_TEST_PERFORMANCE_NAO_ENCONTRADO')

# O Bloco 3 não tem autorização para mudar a mensagem de sessão existente.
prof=Path('teste-v1/painel-profissionais-servicos-v1.html')
prof_src=prof.read_text(encoding='utf-8')
nova="silencioso?'A sessão anterior não pôde ser validada; digite o PIN.'"
original="silencioso?'Conexão preparada. A sessão anterior não pôde ser reutilizada; digite o PIN.'"
if nova in prof_src:
    prof.write_text(prof_src.replace(nova,original,1),encoding='utf-8')
elif original not in prof_src:
    raise SystemExit('MENSAGEM_ORIGINAL_PROFISSIONAIS_NAO_ENCONTRADA')
print('CONTRATOS_BLOCO3_ATUALIZADOS_SEM_MUDANCA_PARALELA')
