from pathlib import Path
import json


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'{label}: trecho não encontrado em {path}')
    p.write_text(text.replace(old, new, 1))


# 1) Portal do Morador: a vaga é reservada no clique, mas o envio ao WhatsApp/card
# não pode ficar bloqueado esperando a resposta do Apps Script.
dental_path = Path('portal-odontologia-segunda-sexta.js')
dental = dental_path.read_text()

dental = dental.replace(
    "  var shouldDisable = !formReady() || !selection.confirmed;",
    "  var shouldDisable = !formReady();",
    1,
)

old_select = """    // A redução precisa sobreviver ao compartilhamento/retorno do Safari.\n    saveSlotsCache();\n    var category = el('category');\n"""
new_select = """    // A redução visual acontece no clique e a mesma reserva é enviada imediatamente\n    // por transporte durável. Todos os canais usam o MESMO requestId, então o backend\n    // idempotente nunca desconta a vaga duas vezes.\n    saveSlotsCache();\n    queueDurableReservation(item);\n    var category = el('category');\n"""
if new_select not in dental:
    if old_select not in dental:
        raise SystemExit('selectDental: ponto de persistência não encontrado')
    dental = dental.replace(old_select, new_select, 1)

old_pagehide = """    window.addEventListener('pagehide', function () {\n      // Não iniciar nova reserva ao sair da página; evita concorrência de transportes.\n    });\n"""
new_pagehide = """    window.addEventListener('pagehide', function () {\n      // Se o Safari sair para o WhatsApp/compartilhamento antes da confirmação visual,\n      // reenfileira a MESMA reserva. O requestId idempotente impede abatimento duplo.\n      if (selection && !selection.confirmed) queueDurableReservation(selection);\n    });\n"""
if new_pagehide not in dental:
    if old_pagehide not in dental:
        raise SystemExit('pagehide: trecho não encontrado')
    dental = dental.replace(old_pagehide, new_pagehide, 1)

dental = dental.replace(
    "      return Boolean(selection && selection.confirmed && formReady());",
    "      return Boolean(selection && formReady());",
    2,
)

if "var shouldDisable = !formReady();" not in dental:
    raise SystemExit('Gate de envio não foi liberado')
if "saveSlotsCache();\n    queueDurableReservation(item);" not in dental:
    raise SystemExit('Reserva durável não foi ligada ao clique')

dental_path.write_text(dental)

# 2) Painel administrativo: as vagas odontológicas vêm da mesma PAINEL_PROFISSIONAIS.
# Enquanto o painel estiver aberto, reler somente a agenda odontológica a cada 5 s e
# refletir qualquer abatimento feito pelo morador. Não sobrescrever edição não salva.
admin_path = Path('painel-oficial-agendas-vagas.html')
admin = admin_path.read_text()

admin = admin.replace(
    "var dadosConfirmados=false;",
    "var dadosConfirmados=false,edicaoPendente=false,dentalSyncInFlight=false;",
    1,
)

old_apply = "function aplicarDados(r,confirmado){dadosConfirmados=confirmado!==false;dados.profissionais=Array.isArray(r.profissionais)?r.profissionais:[];dados.agendas=Array.isArray(r.agendas)?r.agendas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=tacsMode;preencherFiltros();render();bloquearEdicaoNaoConfirmada()}"
new_apply = "function aplicarDados(r,confirmado){dadosConfirmados=confirmado!==false;edicaoPendente=false;dados.profissionais=Array.isArray(r.profissionais)?r.profissionais:[];dados.agendas=Array.isArray(r.agendas)?r.agendas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=tacsMode;preencherFiltros();render();bloquearEdicaoNaoConfirmada()}"
if new_apply not in admin:
    if old_apply not in admin:
        raise SystemExit('Admin aplicarDados não encontrado')
    admin = admin.replace(old_apply, new_apply, 1)

marker = "function carregarDados(mensagem,depois,silencioso){post('admin_dados',sessao(),function(r){"
sync_fn = r"""function sincronizarVagasOdontologia(){
  if(document.hidden||dentalSyncInFlight||ativa||edicaoPendente||!dadosConfirmados||(!token&&!territorioToken))return;
  dentalSyncInFlight=true;
  jsonp('agenda',{areaId:areaId},function(r){
    dentalSyncInFlight=false;
    if(!r||r.ok!==true||!Array.isArray(r.dias))return;
    var mudou=false;
    r.dias.forEach(function(dia){
      var registro=dados.agendas.find(function(a){return normalId(a.MODULO)==='ODONTOLOGIA'&&normalDia(a.DIA)===normalDia(dia.dia)});
      if(!registro)return;
      var comuns=Number(Object.prototype.hasOwnProperty.call(dia,'vagasComunsConfiguradas')?dia.vagasComunsConfiguradas:dia.vagasComuns);
      var emergenciais=Number(Object.prototype.hasOwnProperty.call(dia,'vagasEmergenciaisConfiguradas')?dia.vagasEmergenciaisConfiguradas:dia.vagasEmergenciais);
      if(Number.isFinite(comuns)&&num(registro.VAGAS_COMUNS)!==comuns){registro.VAGAS_COMUNS=comuns;mudou=true}
      if(Number.isFinite(emergenciais)&&num(registro.VAGAS_EMERGENCIAIS)!==emergenciais){registro.VAGAS_EMERGENCIAIS=emergenciais;mudou=true}
    });
    if(mudou){
      salvarSnapshot({profissionais:dados.profissionais,agendas:dados.agendas});
      render();
      status('statusOperacao','Vagas odontológicas sincronizadas automaticamente com a planilha.','ok');
    }
  });
}
"""
if 'function sincronizarVagasOdontologia(){' not in admin:
    if marker not in admin:
        raise SystemExit('Admin: ponto de inserção da sincronização não encontrado')
    admin = admin.replace(marker, sync_fn + marker, 1)

old_listeners = """document.getElementById('listaAgendas').addEventListener('click',function(e){var b=e.target.closest('.salvarAgenda');if(b)salvarAgenda(b.closest('details'))});\ndocument.getElementById('filtroProf').addEventListener('change',render);document.getElementById('filtroDia').addEventListener('change',render);desfazer.addEventListener('click',restaurar);\n"""
new_listeners = """document.getElementById('listaAgendas').addEventListener('click',function(e){var b=e.target.closest('.salvarAgenda');if(b)salvarAgenda(b.closest('details'))});\n['input','change'].forEach(function(tipo){document.getElementById('listaAgendas').addEventListener(tipo,function(e){var alvo=e.target;if(alvo&&alvo.matches&&alvo.matches('input,select,textarea')&&!alvo.readOnly)edicaoPendente=true})});\ndocument.getElementById('filtroProf').addEventListener('change',render);document.getElementById('filtroDia').addEventListener('change',render);desfazer.addEventListener('click',restaurar);\n"""
if new_listeners not in admin:
    if old_listeners not in admin:
        raise SystemExit('Admin: listeners não encontrados')
    admin = admin.replace(old_listeners, new_listeners, 1)

old_start = """iniciarPainel();\n}());\n"""
new_start = """setInterval(sincronizarVagasOdontologia,5000);\ndocument.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(sincronizarVagasOdontologia,250)});\niniciarPainel();\n}());\n"""
if new_start not in admin:
    if old_start not in admin:
        raise SystemExit('Admin: final do script não encontrado')
    admin = admin.replace(old_start, new_start, 1)

admin_path.write_text(admin)

# 3) Cache-buster do portal.
index_path = Path('index.html')
index = index_path.read_text()
index = index.replace(
    'portal-odontologia-segunda-sexta.js?v=20260817-dental-reserva-jsonp-v107',
    'portal-odontologia-segunda-sexta.js?v=20260817-dental-sync-admin-v108',
    1,
)
index_path.write_text(index)

# 4) Teste de contrato: WhatsApp liberado sem esperar confirmação, reserva durável no
# clique, backend desconta a mesma linha que o painel administrativo lê, e painel relê.
Path('scripts/test_dental_confirmation_gate_v103.js').write_text(r"""'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js');
const config=read('agenda-config.js');
const index=read('index.html');
const backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs');
const territorial=read('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const card=read('portal-ajustes-finais.js');
const admin=read('painel-oficial-agendas-vagas.html');

// Reserva real começa no clique e possui redundância idempotente para Safari.
assert.match(dental,/function reserveViaJsonp\(item\)/);
assert.match(dental,/function queueDurableReservation\(item\)/);
assert.match(dental,/action=reservar_get&areaId=/);
assert.match(dental,/saveSlotsCache\(\);\s*queueDurableReservation\(item\);/);
assert.match(dental,/pagehide[\s\S]*queueDurableReservation\(selection\)/);

// Envio não volta a ser refém da latência do Apps Script.
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/var shouldDisable = !formReady\(\) \|\| !selection\.confirmed/);
assert.match(dental,/Boolean\(selection && formReady\(\)\)/);
assert.match(card,/return Boolean\(api\.formularioValido\(\)\)/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);

// O abatimento e o painel administrativo usam a MESMA fonte PAINEL_PROFISSIONAIS.
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/setValue\(restantes\)/);
assert.match(backend,/SpreadsheetApp\.flush\(\)/);
assert.match(territorial,/ABA_AGENDAS:'PAINEL_PROFISSIONAIS'/);
assert.match(territorial,/agendasProfissionaisTerritoriaisV1Dados_/);
assert.match(admin,/function sincronizarVagasOdontologia\(\)/);
assert.match(admin,/jsonp\('agenda',\{areaId:areaId\}/);
assert.match(admin,/setInterval\(sincronizarVagasOdontologia,5000\)/);
assert.match(admin,/edicaoPendente/);

assert.match(config,/DENTAL_AGENDA_API_URL/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-sync-admin-v108/);
console.log('DENTAL_SYNC_ADMIN_V108_OK');
""")

# 5) Ajusta o teste DOM para reproduzir o defeito real: o morador consegue enviar
# enquanto a confirmação ainda está em trânsito; depois a releitura continua em 0.
test_path = Path('scripts/test_dom_flows.js')
t = test_path.read_text()
start = t.index('async function testNonBlockingDentalCard() {')
end = t.index('\nasync function testRegularDental(harness) {', start)
new_test = r'''async function testNonBlockingDentalCard() {
  const harness = new Harness();
  harness.reservationMessageDelay = 1500;
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico de emergência (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)'),
      'A vaga emergencial única não apareceu para o teste não bloqueante'
    );
    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)');
    slot.click();

    await waitFor(
      () => harness.records.durableGetReservations.length >= 1,
      'A reserva durável GET não foi enfileirada no clique da vaga'
    );
    const durableGet = harness.records.durableGetReservations[0];
    assert.equal(durableGet.action, 'reservar_get');
    assert.equal(durableGet.type, 'emergencial');
    assert.equal(durableGet.date, '2099-08-03');
    assert.equal(durableGet.keepalive, true);
    assert.match(durableGet.requestId, /^MATIAS-/);

    const cacheKey = window.PortalTacsOdontologiaV98.cacheKey;
    const cached = JSON.parse(window.localStorage.getItem(cacheKey));
    const monday = cached.data.dias.find(item => item.data === '2099-08-03');
    assert.equal(monday.vagasEmergenciais, 0, 'A última vaga emergencial precisa virar 0 no cache já no clique');
    const renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));
    assert.match(renderedMonday.textContent, /Sem vaga de emergência/, 'A tela deve mostrar 0 imediatamente após o clique');

    await fillPatient(window, 'Paciente Teste Não Bloqueante', 'Solicitação odontológica simulada.');
    const card = window.document.querySelector('#sendPetroleumCard');
    assert.ok(card, 'Botão visível do card não encontrado');
    await waitFor(() => !card.disabled, 'O botão de envio permaneceu bloqueado esperando a planilha', 800);

    const pending = window.PortalTacsOdontologiaV98.selecao();
    assert.ok(pending && pending.confirmed === false, 'O teste precisa enviar enquanto a confirmação ainda está em trânsito');
    const reservationsBeforeSend = harness.records.dentalReservations.length;
    const started = Date.now();
    card.click();
    await waitFor(
      () => harness.records.shares.length === 1,
      'O compartilhamento/WhatsApp não abriu durante a sincronização da vaga',
      1000
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1000, `O envio ficou bloqueado ${elapsed} ms esperando a agenda`);
    assert.equal(window.PortalTacsOdontologiaV98.selecao().confirmed, false, 'O envio só ocorreu depois da confirmação; regressão do WhatsApp');
    assert.equal(harness.records.dentalReservations.length, reservationsBeforeSend, 'Enviar não pode criar outra reserva');
    assert.equal(harness.records.alerts.length, 0, 'O envio não pode mostrar alerta de confirmação da vaga');

    await waitFor(
      () => {
        const current = window.PortalTacsOdontologiaV98.selecao();
        return current && current.confirmed === true;
      },
      'A confirmação em segundo plano não concluiu',
      3000
    );
    assert.equal(harness.dental.find(item => item.data === '2099-08-03').vagasEmergenciais, 0, 'O servidor simulado deve permanecer em 0');

    await window.PortalTacsOdontologiaV98.atualizar();
    await waitFor(
      () => {
        const cardMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(cardNode => /Segunda-feira/.test(cardNode.textContent));
        return cardMonday && /Sem vaga de emergência/.test(cardMonday.textContent);
      },
      'Após releitura/atualização, a vaga reservada reapareceu como disponível',
      2000
    );
  } finally {
    window.close();
  }
}
'''
t = t[:start] + new_test + t[end:]
test_path.write_text(t)

Path('portal-version.json').write_text(json.dumps({
    'version': 'dental-sync-admin-v108',
    'releasedAt': '2026-08-17T16:35:00Z',
    'scope': 'Reserva odontológica no clique, envio sem bloqueio e sincronização automática das vagas no painel administrativo'
}, ensure_ascii=False, indent=2) + '\n')
