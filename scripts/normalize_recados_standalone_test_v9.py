from pathlib import Path

root=Path(__file__).resolve().parents[1]
p=root/'painel-oficial-recados-campanhas.html'
s=p.read_text(encoding='utf-8')
marker='<link rel="manifest" href="/atendimento-acs-farmaceutico/manifest-recados.webmanifest">'
if marker not in s:
    raise SystemExit('Manifest de Recados não encontrado.')
extras=[
    '<link rel="preconnect" href="https://script.google.com">',
    '<link rel="preconnect" href="https://script.googleusercontent.com">',
    '<script src="/atendimento-acs-farmaceutico/admin-warmup.js?v=20260813-admin-v103"></script>',
]
add=''.join('\n'+x for x in extras if x not in s)
if add:
    s=s.replace(marker,marker+add,1)
    p.write_text(s,encoding='utf-8')

t=root/'scripts/test_admin_transport.js'
q=t.read_text(encoding='utf-8')
old="""  if (config.official === 'painel-oficial-agendas-vagas.html') {
    assert.doesNotMatch(official, /fetch\\([^)]*teste-v1\\/painel-agendas-v1\\.html/);
    assert.match(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'\\+areaId/);
  } else {
    assert.match(official, /painel\\.then\\(function\\(html\\)/);
    assert.match(official, /window\\.PortalTacsAdminPreload=/);
  }
"""
new="""  if (config.official === 'painel-oficial-agendas-vagas.html') {
    assert.doesNotMatch(official, /fetch\\([^)]*teste-v1\\/painel-agendas-v1\\.html/);
    assert.match(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'\\+areaId/);
  } else if (config.official === 'painel-oficial-recados-campanhas.html') {
    // Recados e campanhas é standalone e não depende mais do carregador HTML legado.
    assert.match(official, /admin_publicacoes_dados/);
    assert.match(official, /ponteConteudoV102_/);
    assert.doesNotMatch(official, /document\\.write/);
  } else {
    assert.match(official, /painel\\.then\\(function\\(html\\)/);
    assert.match(official, /window\\.PortalTacsAdminPreload=/);
  }
"""
if new not in q:
    if old not in q:
        raise SystemExit('Contrato antigo do painel não localizado no teste.')
    q=q.replace(old,new,1)
    t.write_text(q,encoding='utf-8')
print('NORMALIZE_RECADOS_STANDALONE_TEST_V9_OK')
