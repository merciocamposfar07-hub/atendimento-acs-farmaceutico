from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1))


# 1) A vaga continua sendo reservada ao tocar na opção, mas o envio não espera
# a confirmação assíncrona da planilha. Isso restaura o comportamento esperado:
# toque em enviar -> abre imediatamente o fluxo de compartilhamento/WhatsApp.
replace_once(
    'portal-odontologia-segunda-sexta.js',
    """  var pending = !selection.confirmed;
  var shouldDisable = !formReady() || pending;
  if (send.hidden) send.hidden = false;
  if (send.disabled !== shouldDisable) send.disabled = shouldDisable;
  if (send.dataset) {
    if (pending) send.dataset.dentalReservationPending = '1';
    else delete send.dataset.dentalReservationPending;
  }
""",
    """  var shouldDisable = !formReady();
  if (send.hidden) send.hidden = false;
  if (send.disabled !== shouldDisable) send.disabled = shouldDisable;
  if (send.dataset) delete send.dataset.dentalReservationPending;
"""
)

replace_once(
    'portal-odontologia-segunda-sexta.js',
    """        if (!selection.confirmed || !formReady()) { refreshSend(); return; }
        openWhatsApp();
""",
    """        if (!formReady()) { refreshSend(); return; }
        openWhatsApp();
"""
)

replace_once(
    'portal-odontologia-segunda-sexta.js',
    """    prontoParaEnvio: function () {
      return Boolean(selection && selection.confirmed && formReady());
    },
""",
    """    prontoParaEnvio: function () {
      return Boolean(selection && formReady());
    },
"""
)

replace_once(
    'portal-odontologia-segunda-sexta.js',
    """    if (selection.slowSync) return 'A vaga foi selecionada, mas a planilha ainda não confirmou a reserva. Aguarde a confirmação antes de enviar pelo WhatsApp.';
    return 'Vaga selecionada. Confirmando a redução da vaga na planilha...';
""",
    """    if (selection.slowSync) return 'Vaga selecionada. A agenda ainda está sincronizando em segundo plano; o envio continua disponível.';
    return 'Vaga selecionada. Atualizando a quantidade na agenda em segundo plano...';
"""
)

# 2) O card usa o mesmo código criado no clique da vaga, mesmo antes da resposta
# do servidor, e nunca fica parado esperando a confirmação para abrir o compartilhamento.
replace_once(
    'portal-ajustes-finais.js',
    """      code: (function () { var dental = currentDentalSelection(); return dental && dental.confirmed && dental.requestId ? dental.requestId : makeCode(identity); }()),
""",
    """      code: (function () { var dental = currentDentalSelection(); return dental && dental.requestId ? dental.requestId : makeCode(identity); }()),
"""
)

replace_once(
    'portal-ajustes-finais.js',
    """    var current = currentDentalSelection();
    if (current) {
      if (current.confirmed) {
        reservedSelection = dental.key;
        return Promise.resolve();
      }
      return waitForCurrentDentalReservation(current.requestId);
    }
""",
    """    var current = currentDentalSelection();
    if (current) {
      // A rotina odontológica principal já iniciou a reserva no clique da vaga.
      // Não duplicar a reserva e, principalmente, não bloquear o envio esperando a resposta.
      reservedSelection = dental.key;
      return Promise.resolve(current);
    }
"""
)

replace_once(
    'portal-ajustes-finais.js',
    """      card.innerHTML = busy
        ? 'Preparando card…<small>Confirmando os dados e a disponibilidade.</small>'
        : card.dataset.originalHtml || card.innerHTML;
""",
    """      card.innerHTML = busy
        ? 'Preparando card…<small>Abrindo as opções de envio.</small>'
        : card.dataset.originalHtml || card.innerHTML;
"""
)

old_send_card = """  function sendCard() {
    if (!formIsReady()) return;
    setButtonsBusy(true);
    ensureTerritory()
      .then(function (identity) {
        return reserveDentalIfNeeded().then(function () {
          var data = requestData(identity);
          return createPetroleumCard(data).then(function (blob) {
            var fileName = 'solicitacao-' + normalizeArea(identity.areaId).toLowerCase() + '-portal-tacs.png';
            var file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
              return navigator.share({
                title: 'Solicitação do morador',
                text: 'Solicitação do Portal TACS • ' + identity.areaName + ' • TACS ' + identity.tacsName + '.',
                files: [file]
              });
            }
            var url = URL.createObjectURL(blob);
            var opened = window.open(url, '_blank');
            if (!opened) window.location.href = url;
            setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
          });
        });
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        alert(error.message || 'Não foi possível gerar o card.');
      })
      .finally(function () { setButtonsBusy(false); });
  }
"""
new_send_card = """  function sendCard() {
    if (!formIsReady()) return;
    setButtonsBusy(true);
    ensureTerritory()
      .then(function (identity) {
        // A sincronização da vaga é independente do compartilhamento. Em navegadores
        // antigos/fallback, inicia a reserva aqui, mas nunca espera por ela para enviar.
        reserveDentalIfNeeded().catch(function (error) {
          var status = el('dentalStatus');
          if (status && error && error.message) {
            status.textContent = 'Solicitação liberada para envio. A agenda continuará tentando sincronizar em segundo plano.';
            status.className = 'dental-status';
          }
        });
        var data = requestData(identity);
        return createPetroleumCard(data).then(function (blob) {
          var fileName = 'solicitacao-' + normalizeArea(identity.areaId).toLowerCase() + '-portal-tacs.png';
          var file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            return navigator.share({
              title: 'Solicitação do morador',
              text: 'Solicitação do Portal TACS • ' + identity.areaName + ' • TACS ' + identity.tacsName + '.',
              files: [file]
            });
          }
          var url = URL.createObjectURL(blob);
          var opened = window.open(url, '_blank');
          if (!opened) window.location.href = url;
          setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
        });
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        alert(error.message || 'Não foi possível gerar o card.');
      })
      .finally(function () { setButtonsBusy(false); });
  }
"""
replace_once('portal-ajustes-finais.js', old_send_card, new_send_card)

# 3) Remover a trava auxiliar que reintroduzia o bloqueio pelo atributo pending.
replace_once(
    'agenda-config.js',
    """        if (send.dataset && send.dataset.dentalReservationPending === '1') {
          send.disabled = true;
          return;
        }
""",
    """        if (send.dataset) delete send.dataset.dentalReservationPending;
"""
)

# 4) Fallback legado: inicia a reserva e abre o WhatsApp sem esperar o postMessage.
index = Path('index.html')
index_text = index.read_text()
old_handle = """function handleSend(){if(!portalDisponivel()){showToast('O Portal TACS está em manutenção ou ainda está verificando a disponibilidade.');updateForm();return}var category=el('category').value;if(category!==IMPLANON&&isClinicalSubject(requestText())){updateForm();return}if(!requestCode)requestCode=makeRequestCode();if(!dentalType(category)){sendMessage();return}var button=el('send'),original=button.innerHTML;reservationPending=true;button.disabled=true;button.textContent='Reservando a vaga...';reserveSlot().then(function(result){var type=dentalType(category);if(result&&result.alreadyReserved&&(result.date!==selectedDentalSlot.data||result.type!==type))throw new Error('Este formulário já reservou outra data. Reabra o portal e faça uma nova solicitação.');if(result&&Number.isFinite(Number(result.remaining))){if(type==='emergencial')selectedDentalSlot.vagasEmergenciais=Number(result.remaining);else selectedDentalSlot.vagasComuns=Number(result.remaining)}selectedDentalSlot.reserved=Boolean(result&&!result.skipped);reservationPending=false;button.innerHTML=original;sendMessage()}).catch(function(error){reservationPending=false;button.innerHTML=original;el('dentalStatus').textContent=error&&error.message?error.message:'Não foi possível reservar a vaga. Tente novamente.';el('dentalStatus').className='dental-status error';showToast(el('dentalStatus').textContent);loadDental()})}"""
new_handle = """function handleSend(){if(!portalDisponivel()){showToast('O Portal TACS está em manutenção ou ainda está verificando a disponibilidade.');updateForm();return}var category=el('category').value;if(category!==IMPLANON&&isClinicalSubject(requestText())){updateForm();return}if(!requestCode)requestCode=makeRequestCode();if(!dentalType(category)){sendMessage();return}reserveSlot().then(function(result){var type=dentalType(category);if(result&&Number.isFinite(Number(result.remaining))){if(type==='emergencial')selectedDentalSlot.vagasEmergenciais=Number(result.remaining);else selectedDentalSlot.vagasComuns=Number(result.remaining)}selectedDentalSlot.reserved=Boolean(result&&!result.skipped)}).catch(function(){loadDental()});sendMessage()}"""
if old_handle not in index_text:
    raise SystemExit('handleSend legado atual não encontrado em index.html')
index_text = index_text.replace(old_handle, new_handle, 1)
index_text = index_text.replace('portal-ajustes-finais.js?v=20260817-dental-card-bridge-v3', 'portal-ajustes-finais.js?v=20260817-dental-card-bridge-v4', 1)
index_text = index_text.replace('portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v3', 'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v4', 1)
index.write_text(index_text)

# 5) Gate de código agora exige explicitamente comportamento não bloqueante.
Path('scripts/test_dental_confirmation_gate_v103.js').write_text(r"""'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js'),config=read('agenda-config.js'),index=read('index.html'),backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),card=read('portal-ajustes-finais.js');

// Reserva continua começando no clique da vaga e abatendo visualmente de imediato.
assert.match(dental,/optimisticRemaining: Math\.max\(0, Number\(available\) - 1\)/);
assert.match(dental,/persistInBackground\(item\);/);
assert.match(dental,/add\('action', 'reservar'\)/);

// Envio não pode depender da confirmação assíncrona da planilha.
assert.doesNotMatch(dental,/var pending = !selection\.confirmed/);
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/dentalReservationPending = '1'/);
assert.match(dental,/if \(!formReady\(\)\) \{ refreshSend\(\); return; \}[\s\S]*openWhatsApp\(\);/);
assert.doesNotMatch(dental,/if \(!selection\.confirmed \|\| !formReady\(\)\)/);
assert.match(dental,/prontoParaEnvio: function \(\) \{[\s\S]*selection && formReady\(\)/);
assert.match(dental,/formularioValido: function \(\)/);
assert.doesNotMatch(config,/dentalReservationPending === '1'/);

// O card usa o mesmo requestId ainda pendente e abre o compartilhamento sem await da reserva.
assert.match(card,/dental && dental\.requestId \? dental\.requestId : makeCode/);
assert.match(card,/var current = currentDentalSelection\(\);[\s\S]*reservedSelection = dental\.key;[\s\S]*return Promise\.resolve\(current\);/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);
assert.doesNotMatch(card,/return reserveDentalIfNeeded\(\)\.then/);
assert.doesNotMatch(card,/Confirmando os dados e a disponibilidade/);
assert.match(card,/Abrindo as opções de envio/);

// O fallback legado também dispara a reserva sem bloquear a abertura do WhatsApp.
assert.match(index,/reserveSlot\(\)\.then\([\s\S]*\.catch\(function\(\)\{loadDental\(\)\}\);sendMessage\(\)\}/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-whatsapp-bridge-v4/);
assert.match(index,/portal-ajustes-finais\.js\?v=20260817-dental-card-bridge-v4/);

// Backend e recuperação permanecem disponíveis para sincronização em segundo plano.
assert.match(dental,/function fetchReservationStatus\(item\)/);
assert.match(dental,/action=reserva_status/);
assert.match(backend,/reserva_status/);
assert.match(backend,/function correcaoDataOdontologiaV1StatusReserva_/);
assert.match(backend,/VERSAO:'2\.1\.0'/);
console.log('DENTAL_NONBLOCKING_SEND_GATE_V104_OK');
""")

# 6) Simulação DOM real: resposta da planilha propositalmente atrasada por 5 s.
# O compartilhamento do card deve abrir antes dessa confirmação e sem reserva duplicada.
p = Path('scripts/test_dom_flows.js')
t = p.read_text()
t = t.replace(
"""      whatsAppMessages: []
    };
    this.errors = [];
""",
"""      whatsAppMessages: [],
      shares: [],
      alerts: []
    };
    this.errors = [];
    this.reservationMessageDelay = 120;
""", 1)
t = t.replace(
"""        },
        120
      );
""",
"""        },
        this.reservationMessageDelay
      );
""", 1)
t = t.replace(
"""        window.open = function () {
          return {};
        };
        window.HTMLElement.prototype.scrollIntoView = function () {};
""",
"""        window.open = function () {
          return {};
        };
        window.alert = message => { harness.records.alerts.push(String(message || '')); };
        window.navigator.canShare = function () { return true; };
        window.navigator.share = function (payload) {
          harness.records.shares.push(payload);
          return Promise.resolve();
        };
        if (window.HTMLCanvasElement) {
          window.HTMLCanvasElement.prototype.getContext = function () {
            return {
              createLinearGradient: function () { return { addColorStop: function () {} }; },
              fillRect: function () {}, fillText: function () {}, beginPath: function () {},
              moveTo: function () {}, arcTo: function () {}, closePath: function () {}, fill: function () {},
              measureText: function (value) { return { width: String(value || '').length * 18 }; },
              fillStyle: '', font: ''
            };
          };
          window.HTMLCanvasElement.prototype.toBlob = function (callback) {
            callback(new window.Blob(['portal-tacs-card'], {type: 'image/png'}));
          };
        }
        window.HTMLElement.prototype.scrollIntoView = function () {};
""", 1)

insert_marker = "\nasync function testRegularDental(harness) {"
nonblocking_test = r'''
async function testNonBlockingDentalCard() {
  const harness = new Harness();
  harness.reservationMessageDelay = 5000;
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.common:not(:disabled)'),
      'A vaga odontológica não apareceu para o teste não bloqueante'
    );
    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.common:not(:disabled)');
    slot.click();
    await waitFor(
      () => harness.records.dentalReservations.length === 1,
      'A reserva em segundo plano não foi iniciada no clique da vaga'
    );
    await fillPatient(window, 'Paciente Teste Não Bloqueante', 'Solicitação odontológica simulada.');
    const card = window.document.querySelector('#sendPetroleumCard');
    assert.ok(card, 'Botão visível do card não encontrado');
    await waitFor(() => !card.disabled, 'O botão do card permaneceu bloqueado aguardando a planilha');

    const beforeSelection = window.PortalTacsOdontologiaV98.selecao();
    assert.ok(beforeSelection, 'Seleção odontológica não disponível');
    assert.equal(beforeSelection.confirmed, false, 'O teste precisa clicar enquanto a confirmação ainda está atrasada');
    const reservationsBeforeSend = harness.records.dentalReservations.length;
    const started = Date.now();
    card.click();
    await waitFor(
      () => harness.records.shares.length === 1,
      'O compartilhamento não abriu enquanto a confirmação da vaga estava atrasada',
      1400
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 1400, `O envio ficou bloqueado por ${elapsed} ms esperando a vaga`);
    assert.equal(
      harness.records.dentalReservations.length,
      reservationsBeforeSend,
      'O clique em enviar não pode criar uma segunda reserva'
    );
    assert.equal(harness.records.alerts.length, 0, 'O envio não pode exibir alerta de demora da confirmação');
    assert.ok(harness.records.shares[0].files && harness.records.shares[0].files.length === 1, 'O card não foi entregue ao compartilhamento nativo');
  } finally {
    window.close();
  }
}
'''
if insert_marker not in t:
    raise SystemExit('Marcador para inserir teste DOM não encontrado')
t = t.replace(insert_marker, '\n' + nonblocking_test + insert_marker, 1)
t = t.replace(
"""async function main() {
  const harness = new Harness();
""",
"""async function main() {
  await testNonBlockingDentalCard();
  const harness = new Harness();
""", 1)
p.write_text(t)

# 7) Nova versão pública para invalidar cache do Safari.
Path('portal-version.json').write_text(json.dumps({
    'version': 'dental-nonblocking-v104',
    'releasedAt': '2026-08-17T15:03:00Z',
    'scope': 'Envio odontológico imediato; reserva e sincronização de vagas em segundo plano; simulação de confirmação atrasada'
}, ensure_ascii=False, indent=2) + '\n')
