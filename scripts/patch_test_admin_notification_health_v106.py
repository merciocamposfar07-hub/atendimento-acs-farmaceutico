from pathlib import Path

path=Path('scripts/test_admin_transport.js')
text=path.read_text(encoding='utf-8')
marker="""  if (action === 'admin_portal_manutencao_status') {
    return {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
  }
"""
insert="""  if (action === 'admin_notificacoes_saude') {
    return {
      ok: true,
      areaId: 'JAPARANDUBA',
      areaNome: 'Sítio Japaranduba',
      contagens: {ativos: 0, inativos: 0, reparo: 0, semConfirmacao: 0, total: 0},
      aparelhos: [],
      oneSignalConsultado: true,
      reparoArea: null
    };
  }
  if (action === 'admin_notificacoes_solicitar_reparo_area') {
    return {
      ok: true,
      areaId: 'JAPARANDUBA',
      areaNome: 'Sítio Japaranduba',
      reparoId: 'reparo_japaranduba_teste',
      solicitadoEm: '2026-08-13 08:00:00'
    };
  }
"""+marker
if text.count(marker)!=1:
    raise SystemExit('Marcador do simulador administrativo não encontrado exatamente uma vez.')
path.write_text(text.replace(marker,insert,1),encoding='utf-8')
print('Simulador administrativo atualizado para as rotas de saúde das notificações.')
