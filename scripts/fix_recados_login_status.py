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

old_exp="""  assert.deepEqual(actions, ['admin_dados'], `${config.file} fez consultas extras ao validar a sessão antiga.`);"""
new_exp="""  const expectedStoredSessionAction = config.file === 'teste-v1/painel-recados-campanhas-v1.html'
    ? 'admin_publicacoes_dados'
    : 'admin_dados';
  assert.deepEqual(actions, [expectedStoredSessionAction], `${config.file} fez consultas extras ao validar a sessão antiga.`);"""
if old_exp in s:
    s=s.replace(old_exp,new_exp,1)
elif new_exp not in s:
    raise SystemExit('Expectativa de sessão antiga não encontrada')

old_flow="""        } else if (payload.action === 'admin_dados') {
          dataReads += 1;
          result = {
            ok: true,
            recados: eventuallyVisible && dataReads >= 3 ? [savedNotice] : [],
            campanhas: []
          };
        } else if (payload.action === 'admin_moradores_areas') {
          result = {
            ok: true,
            areaId: 'JAPARANDUBA',
            areas: [{areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba'}]
          };
        } else if (payload.action === 'admin_portal_manutencao_status') {
          result = {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
        } else if (payload.action === 'admin_salvar_recado') {
          result = {ok: true};
"""
new_flow="""        } else if (payload.action === 'admin_publicacoes_dados') {
          dataReads += 1;
          result = {
            ok: true,
            recados: eventuallyVisible && dataReads >= 3 ? [savedNotice] : [],
            campanhas: [],
            areaId: 'JAPARANDUBA',
            areaNome: 'Sítio Japaranduba',
            areas: [{areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba'}],
            podeAdministrar: true,
            perfil: 'ADMIN_GERAL',
            manutencao: {ativa: false, areaId: 'JAPARANDUBA'}
          };
        } else if (payload.action === 'admin_publicacoes_salvar_recado') {
          result = {ok: true};
"""
if old_flow in s:
    s=s.replace(old_flow,new_flow,1)
elif new_flow not in s:
    raise SystemExit('Fluxo simulado do novo recado não encontrado')

s=s.replace(
"""    () => /Sessão validada e conteúdo carregado/.test(
      window.document.getElementById('loginStatus').textContent
    ),""",
"""    () => /Acesso de administrador validado/.test(
      window.document.getElementById('loginStatus').textContent
    ),""",
1
)
s=s.replace("item.action === 'admin_salvar_recado'", "item.action === 'admin_publicacoes_salvar_recado'")
s=s.replace("item.action === 'admin_dados'", "item.action === 'admin_publicacoes_dados'")
p.write_text(s,encoding='utf-8')

# Notificações: TACS sem permissão continua bloqueado; após concessão explícita
# pode enviar somente para a própria área. O servidor continua ignorando filtro livre.
p=Path('scripts/test_territorio_csv_notifications.js')
s=p.read_text(encoding='utf-8')
old_tail="""  const tacsDenied = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000007', eventoPublicacao: 'evento-tacs', token: '',
    territorioToken: territory.login.token, dispositivo: 'iphone-tacs'
  }));
  assert.equal(tacsDenied.ok, false);
  assert.match(tacsDenied.message, /administrador geral/);
  assert.equal(context.__fetched.length, 3);

  context.__setMaintenance(false);
  context.__setFetchResponse({recipients: 0});
  const zeroAudience = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000008', eventoPublicacao: 'evento-sem-destinatario'
  }));
  assert.equal(zeroAudience.ok, true);
  assert.equal(zeroAudience.push, false);
  assert.equal(zeroAudience.zeroAudience, true);
  assert.equal(zeroAudience.destinatarios, 0);
  assert.equal(context.__fetched.length, 4);

  context.__setFetchResponse({id: 'push-sem-contagem'});
  const acceptedWithoutCount = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000009', eventoPublicacao: 'evento-sem-contagem'
  }));
  assert.equal(acceptedWithoutCount.push, true);
  assert.equal(acceptedWithoutCount.onesignalId, 'push-sem-contagem');
  assert.equal(acceptedWithoutCount.destinatarios, null);
  assert.equal(context.__fetched.length, 5);
"""
new_tail="""  const tacsDenied = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000007', eventoPublicacao: 'evento-tacs-sem-permissao', token: '',
    territorioToken: territory.login.token, dispositivo: 'iphone-tacs'
  }));
  assert.equal(tacsDenied.ok, false);
  assert.match(tacsDenied.message, /não possui permissão/i);
  assert.equal(context.__fetched.length, 3);

  const updatedTacs = saveTacs(context, {
    tacsId: territory.tacsId,
    nomeCompleto: 'Ana Agente Corrigida',
    cnsProfissional: '123456789012346',
    matricula: 'M-02',
    telefone: '81988880000',
    email: 'ana.corrigida@example.org',
    areaId: territory.area.areaId,
    unidadeId: 'USF_LAGOA',
    microarea: '3',
    permissoes: [
      'MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO',
      'MORADORES_IMPORTAR_CSV','PUBLICACOES_GERENCIAR'
    ],
    ativo: true
  });
  assert.ok(Array.from(updatedTacs.tacs.permissoes).includes('PUBLICACOES_GERENCIAR'));
  const publishingLogin = context.tacsTerritorioV1LoginTacs_({
    cns: '123456789012346', pin: '4321', dispositivo: 'iphone-tacs-publicacoes'
  });

  context.__setMaintenance(false);
  const tacsAllowed = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000008', eventoPublicacao: 'evento-tacs-permitido', token: '',
    territorioToken: publishingLogin.token, dispositivo: 'iphone-tacs-publicacoes',
    areaId: territory.area.areaId
  }));
  assert.equal(tacsAllowed.ok, true);
  assert.equal(tacsAllowed.push, true);
  assert.equal(tacsAllowed.areaId, territory.area.areaId);
  assert.equal(context.__fetched.length, 4);
  const tacsSent = JSON.parse(context.__fetched[3].options.payload);
  assert.deepEqual(JSON.parse(JSON.stringify(tacsSent.filters)), [
    {field: 'tag', key: 'area_tacs', relation: '=', value: territory.area.areaId}
  ]);

  const crossAreaDenied = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000009', eventoPublicacao: 'evento-tacs-outra-area', token: '',
    territorioToken: publishingLogin.token, dispositivo: 'iphone-tacs-publicacoes',
    areaId: 'JAPARANDUBA'
  }));
  assert.equal(crossAreaDenied.ok, false);
  assert.match(crossAreaDenied.message, /troca de área bloqueada/i);
  assert.equal(context.__fetched.length, 4, 'A tentativa do TACS em outra área chegou ao OneSignal.');

  context.__setFetchResponse({recipients: 0});
  const zeroAudience = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000010', eventoPublicacao: 'evento-sem-destinatario'
  }));
  assert.equal(zeroAudience.ok, true);
  assert.equal(zeroAudience.push, false);
  assert.equal(zeroAudience.zeroAudience, true);
  assert.equal(zeroAudience.destinatarios, 0);
  assert.equal(context.__fetched.length, 5);

  context.__setFetchResponse({id: 'push-sem-contagem'});
  const acceptedWithoutCount = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000011', eventoPublicacao: 'evento-sem-contagem'
  }));
  assert.equal(acceptedWithoutCount.push, true);
  assert.equal(acceptedWithoutCount.onesignalId, 'push-sem-contagem');
  assert.equal(acceptedWithoutCount.destinatarios, null);
  assert.equal(context.__fetched.length, 6);
"""
if old_tail in s:
    s=s.replace(old_tail,new_tail,1)
elif new_tail not in s:
    raise SystemExit('Cenário de autorização de notificações não encontrado')
p.write_text(s,encoding='utf-8')
