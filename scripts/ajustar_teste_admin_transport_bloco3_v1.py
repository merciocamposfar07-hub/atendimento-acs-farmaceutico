from pathlib import Path
import json

# Executor auxiliar temporário do Bloco 3 — não entra na main.
# Reexecução técnica após correção do controle de escopo da homologação.
# Atualiza somente contratos que fixavam a antiga chave de cache por área.
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

# O gate percentual continua a última barreira, com performance imediatamente antes dele.
pkg_path=Path('package.json')
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
test=pkg.get('scripts',{}).get('test','')
local='node scripts/test_admin_local_first_v1.js'
performance='node scripts/test_performance_v101.js'
gate='node scripts/test_quality_gate_v101.js'
parts=[x.strip() for x in test.split('&&') if x.strip()]
parts=[x for x in parts if x!=local]
if performance not in parts or gate not in parts:
    raise SystemExit('SEQUENCIA_PERFORMANCE_QUALITY_GATE_NAO_ENCONTRADA')
if parts.index(gate) != len(parts)-1 or parts.index(performance) != len(parts)-2:
    raise SystemExit('SEQUENCIA_FINAL_PERFORMANCE_QUALITY_GATE_FOI_ALTERADA')
parts.insert(parts.index(performance),local)
pkg['scripts']['test']=' && '.join(parts)
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('CONTRATOS_BLOCO3_ATUALIZADOS_COM_SEQUENCIA_FINAL_PRESERVADA')
