#!/usr/bin/env python3
from pathlib import Path

# Mantém a mensagem inicial compatível com o acesso administrativo já existente.
p=Path('teste-v1/painel-recados-campanhas-v1.html')
s=p.read_text(encoding='utf-8')
old="Entre como administrador ou TACS da área. A conexão já está sendo preparada em segundo plano."
new="Digite o PIN administrativo ou entre como TACS da área. A conexão já está sendo preparada em segundo plano."
if old not in s and new not in s:
    raise SystemExit('Mensagem inicial do painel não encontrada')
if old in s:
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# O painel de recados deixa de usar a leitura global antiga e passa a carregar
# conteúdo, área e manutenção em uma única resposta territorial.
p=Path('scripts/test_admin_transport.js')
s=p.read_text(encoding='utf-8')
old_case="""  {
    file: 'teste-v1/painel-recados-campanhas-v1.html',
    frame: 'ponteConteudoV1',
    actions: [
      'admin_login',
      'admin_dados',
      'admin_moradores_areas',
      'admin_portal_manutencao_status'
    ],
    success: /Sessão validada e conteúdo carregado/,
    official: 'painel-oficial-recados-campanhas.html'
  }"""
new_case="""  {
    file: 'teste-v1/painel-recados-campanhas-v1.html',
    frame: 'ponteConteudoV1',
    actions: ['admin_login', 'admin_publicacoes_dados'],
    success: /Acesso de administrador validado/,
    official: 'painel-oficial-recados-campanhas.html'
  }"""
if old_case in s:
    s=s.replace(old_case,new_case,1)
elif new_case not in s:
    raise SystemExit('Caso de transporte dos recados não encontrado')

needle="""  if (action === 'admin_portal_manutencao_status') {
    return {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
  }
"""
insert="""  if (action === 'admin_publicacoes_dados') {
    return {
      ok: true,
      recados: [],
      campanhas: [],
      areaId: 'JAPARANDUBA',
      areaNome: 'Sítio Japaranduba',
      areas: [{areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba'}],
      podeAdministrar: true,
      perfil: 'ADMIN_GERAL',
      manutencao: {ativa: false, areaId: 'JAPARANDUBA'}
    };
  }
"""
if insert not in s:
    if needle not in s:
        raise SystemExit('Ponto da resposta territorial não encontrado')
    s=s.replace(needle,insert+needle,1)

old_poll="""          node.src.includes('action=admin_result')
"""
new_poll="""          (node.src.includes('action=admin_result') ||
            node.src.includes('action=admin_publicacoes_result'))
"""
if old_poll in s:
    s=s.replace(old_poll,new_poll,1)
elif new_poll not in s:
    raise SystemExit('Detector de polling administrativo não encontrado')

p.write_text(s,encoding='utf-8')
