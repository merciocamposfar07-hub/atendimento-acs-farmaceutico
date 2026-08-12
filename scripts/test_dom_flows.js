'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, ResourceLoader, VirtualConsole} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const PORTAL_ORIGIN = 'http://portal.test';
const MAIN_ID = 'AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw';
const DENTAL_ID = 'AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw';
const OLD_NOTICE_ID = 'AKfycbwfcTFh7DR3eQa7pA1AQ_f1_aOEe_1W0uc_Z3og9mDYXBhjCH0ixLjZsQrT4SHNyQ5_GA';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, message, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await wait(20);
  }
  throw new Error(message);
}

function dispatch(window, element, type) {
  element.dispatchEvent(new window.Event(type, {bubbles: true}));
}

function setField(window, selector, value, type = 'input') {
  const field = window.document.querySelector(selector);
  assert.ok(field, `Campo não encontrado: ${selector}`);
  field.value = value;
  dispatch(window, field, type);
  return field;
}

class Harness {
  constructor() {
    this.main = {
      ok: true,
      atualizadoEm: '30/07/2026 22:08',
      modules: {medica: [], nutricionista: [], enfermeira: [], odontologia: []},
      recados: [],
      campanhas: []
    };
    this.nurse = [
      {day: 'Segunda-feira', service: 'Visita', icon: '🏠', available: true},
      {day: 'Terça-feira', service: 'Pré-natal', icon: '🤰', available: true},
      {day: 'Quarta-feira', service: 'Folga', icon: '❌', available: false},
      {day: 'Quinta-feira', service: 'Puericultura', icon: '👶', available: true},
      {day: 'Sexta-feira', service: 'Preventivo', icon: '🌸', available: true}
    ];
    this.dental = [
      {id: 'seg', data: '2099-08-03', dia: 'Segunda-feira', vagasComuns: 2, vagasEmergenciais: 1},
      {id: 'ter', data: '2099-08-04', dia: 'Terça-feira', vagasComuns: 0, vagasEmergenciais: 2},
      {id: 'qui', data: '2099-08-06', dia: 'Quinta-feira', vagasComuns: 1, vagasEmergenciais: 0},
      {id: 'sex', data: '2099-08-07', dia: 'Sexta-feira', vagasComuns: 5, vagasEmergenciais: 5}
    ];
    this.records = {
      dentalReservations: [],
      dentalAdminPosts: [],
      mainPosts: [],
      oldNoticeRequests: [],
      whatsAppMessages: []
    };
    this.errors = [];
  }

  apiResponse(url) {
    const parsed = new URL(url);
    if (parsed.href.includes(OLD_NOTICE_ID)) {
      this.records.oldNoticeRequests.push(parsed.href);
      return null;
    }
    const callback = parsed.searchParams.get('callback');
    const action = parsed.searchParams.get('action');
    assert.match(callback || '', /^[A-Za-z_$][A-Za-z0-9_$]*$/, 'Callback JSONP inválido');
    let payload;
    if (parsed.pathname.includes(MAIN_ID) && action === 'painel_publico') {
      payload = clone(this.main);
    } else if (parsed.pathname.includes(MAIN_ID) && action === 'agenda_enfermeira') {
      payload = {ok: true, dias: clone(this.nurse)};
    } else if (parsed.pathname.includes(DENTAL_ID) && action === 'agenda') {
      payload = {ok: true, dias: clone(this.dental)};
    } else {
      payload = {ok: false, message: `Ação de leitura não prevista: ${action}`};
    }
    return `${callback}(${JSON.stringify(payload)});`;
  }

  formFields(form) {
    return Object.fromEntries(
      Array.from(form.querySelectorAll('[name]')).map(field => [field.name, field.value])
    );
  }

  targetFrame(window, form) {
    return Array.from(window.document.querySelectorAll('iframe')).find(
      frame => frame.name === form.target
    );
  }

  message(window, frame, data, delay = 0) {
    setTimeout(() => {
      window.dispatchEvent(
        new window.MessageEvent('message', {
          data,
          source: frame.contentWindow
        })
      );
    }, delay);
  }

  submit(window, form) {
    const fields = this.formFields(form);
    const frame = this.targetFrame(window, form);
    assert.ok(frame, `Iframe de confirmação não encontrado: ${form.target}`);
    const actionUrl = new URL(form.action);
    const isMain = actionUrl.pathname.includes(MAIN_ID);
    const isDental = actionUrl.pathname.includes(DENTAL_ID);

    if (isDental && fields.action === 'reservar') {
      this.records.dentalReservations.push(clone(fields));
      const slot = this.dental.find(item => item.data === fields.date);
      assert.ok(slot, `Data odontológica não encontrada: ${fields.date}`);
      const key = fields.type === 'emergencial' ? 'vagasEmergenciais' : 'vagasComuns';
      assert.ok(slot[key] > 0, 'Tentativa de reservar vaga indisponível');
      slot[key] -= 1;
      this.message(
        window,
        frame,
        {
          ok: true,
          source: 'agenda-odontologica-tacs',
          nonce: fields.nonce,
          remaining: slot[key],
          date: fields.date,
          type: fields.type
        },
        120
      );
      return;
    }

    if (isDental && fields.action === 'salvar_agenda') {
      this.records.dentalAdminPosts.push(clone(fields));
      const payload = JSON.parse(fields.payload);
      this.dental = payload.dias.map((item, index) => ({
        id: `admin-${index}`,
        data: item.data,
        dia: item.dia,
        vagasComuns: Number(item.vagasComuns),
        vagasEmergenciais: Number(item.vagasEmergenciais)
      }));
      this.message(window, frame, {
        source: 'agenda-odontologica-tacs',
        nonce: fields.nonce,
        result: {ok: true, nonce: fields.nonce}
      });
      return;
    }

    if (isMain) {
      this.records.mainPosts.push(clone(fields));
      if (fields.action === 'salvar_recado') {
        this.main.recados = [JSON.parse(fields.payload)];
      } else if (fields.action === 'cancelar_recados') {
        this.main.recados = [];
      } else if (fields.action === 'salvar_modulo') {
        const payload = JSON.parse(fields.payload);
        assert.ok(
          payload.module === 'medica' || payload.module === 'nutricionista',
          `Módulo principal inesperado: ${payload.module}`
        );
        this.main.modules[payload.module] = clone(payload.days);
      } else if (fields.action === 'salvar_agenda_enfermeira') {
        const payload = JSON.parse(fields.payload);
        this.nurse = clone(payload.dias);
      } else if (fields.action === 'salvar_campanha') {
        this.main.campanhas = [JSON.parse(fields.payload)];
      } else if (fields.action === 'cancelar_campanhas') {
        this.main.campanhas = [];
      } else {
        throw new Error(`Ação principal não prevista no teste: ${fields.action}`);
      }
      const legacyResponse = fields.action === 'salvar_recado';
      this.message(
        window,
        frame,
        legacyResponse
          ? {source: 'portal-tacs', result: {ok: true}}
          : {
              source: 'painel-tacs-integral',
              nonce: fields.nonce,
              result: {ok: true, nonce: fields.nonce}
            }
      );
      return;
    }

    throw new Error(`Destino de formulário não previsto: ${form.action}`);
  }

  loader() {
    const harness = this;
    return new (class extends ResourceLoader {
      fetch(url, options) {
        const parsed = new URL(url);
        if (parsed.hostname === 'script.google.com') {
          const source = harness.apiResponse(url);
          return source == null ? null : Promise.resolve(Buffer.from(source));
        }
        if (parsed.origin === PORTAL_ORIGIN) {
          if (options.element && options.element.tagName === 'IFRAME') {
            return Promise.resolve(Buffer.from('<!doctype html><title>Espelho simulado</title>'));
          }
          const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '') || 'index.html';
          const file = path.resolve(ROOT, relative);
          if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
          try {
            let source = fs.readFileSync(file);
            if (relative === 'portal-odontologia-segunda-sexta.js') {
              const original =
                "window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);";
              const replacement =
                "if (typeof window.__TEST_WHATSAPP__ === 'function') window.__TEST_WHATSAPP__(message); else window.location.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);";
              const text = source.toString('utf8');
              assert.ok(text.includes(original), 'O teste não encontrou o envio odontológico ao WhatsApp');
              source = Buffer.from(text.replace(original, replacement));
            }
            return Promise.resolve(source);
          } catch (error) {
            return null;
          }
        }
        return null;
      }
    })();
  }

  html(name) {
    let source = fs.readFileSync(path.join(ROOT, name), 'utf8');
    if (name === 'index.html') {
      const original =
        "function openWhatsApp(message){window.location.href='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(message)}";
      const replacement =
        "function openWhatsApp(message){if(typeof window.__TEST_WHATSAPP__==='function'){window.__TEST_WHATSAPP__(message);return}window.location.href='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(message)}";
      assert.ok(source.includes(original), 'O teste não encontrou a função oficial de abertura do WhatsApp');
      source = source.replace(original, replacement);
    }
    return source;
  }

  async dom(name) {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => {
      this.errors.push(error.message);
    });
    const harness = this;
    const dom = new JSDOM(this.html(name), {
      url: `${PORTAL_ORIGIN}/${name}`,
      runScripts: 'dangerously',
      resources: this.loader(),
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        window.scrollTo = function () {};
        window.open = function () {
          return {};
        };
        window.HTMLElement.prototype.scrollIntoView = function () {};
        window.__TEST_WHATSAPP__ = message => {
          harness.records.whatsAppMessages.push(message);
        };
        window.HTMLFormElement.prototype.submit = function () {
          harness.submit(window, this);
        };
      }
    });
    if (dom.window.document.readyState !== 'complete') {
      await new Promise(resolve => dom.window.addEventListener('load', resolve, {once: true}));
    }
    return dom;
  }
}

async function fillPatient(window, name, subject) {
  setField(window, '#cpf', '52998224725');
  setField(window, '#birth', '28121984');
  setField(window, '#name', name);
  setField(window, '#locality', 'Sítio Japaranduba');
  setField(window, '#subject', subject);
}

async function testRegularDental(harness) {
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelectorAll('#dentalSlots .sheet-dental-choice.common').length === 4,
      'As vagas odontológicas comuns não foram carregadas'
    );

    const cards = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card'));
    const slots = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-choice.common'));
    assert.equal(slots.length, 4);
    assert.match(cards[0].textContent, /Segunda-feira[\s\S]*2 vagas comuns disponíveis/);
    assert.equal(slots[0].disabled, false);
    assert.match(cards[1].textContent, /Terça-feira[\s\S]*Sem vaga comum/);
    assert.equal(slots[1].disabled, true);
    assert.match(cards[2].textContent, /Quinta-feira[\s\S]*1 vaga comum disponível/);
    assert.match(cards[3].textContent, /Sexta-feira[\s\S]*5 vagas comuns disponíveis/);

    const reservationsBeforeClick = harness.records.dentalReservations.length;
    slots[0].click();
    await waitFor(
      () => harness.records.dentalReservations.length === reservationsBeforeClick + 1,
      'A vaga comum não foi reservada no clique'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.action, 'reservar');
    assert.equal(reservation.date, '2099-08-03');
    assert.equal(reservation.type, 'comum');
    assert.match(reservation.requestId, /^MATIAS-/);
    assert.equal(harness.dental[0].vagasComuns, 1, 'A vaga comum não foi abatida no clique');
    await fillPatient(
      window,
      'Maria Teste da Silva',
      'Quero marcar uma consulta odontológica comum.'
    );
    const send = window.document.querySelector('#send');
    await waitFor(() => !send.disabled, 'O botão de envio comum não foi habilitado');

    const before = harness.records.whatsAppMessages.length;
    const reservationsBeforeSend = harness.records.dentalReservations.length;
    send.click();
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a vaga comum já reservada'
    );
    assert.equal(
      harness.records.dentalReservations.length,
      reservationsBeforeSend,
      'O envio pelo WhatsApp não pode descontar outra vaga comum'
    );
    const message = harness.records.whatsAppMessages.at(-1);
    assert.match(message, /Maria Teste da Silva/);
    assert.match(message, /Tipo de vaga odontológica: comum/);
    assert.match(message, /Dia escolhido: Segunda-feira — 03\/08\/2099/);
  } finally {
    window.close();
  }
}

async function testEmergencyDental(harness) {
  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento odontológico de emergência (dentista)';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelectorAll('#dentalSlots .sheet-dental-choice.emergency').length === 4,
      'As vagas odontológicas emergenciais não foram carregadas'
    );

    const cards = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card'));
    const slots = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-choice.emergency'));
    assert.match(cards[0].textContent, /Segunda-feira[\s\S]*1 vaga de emergência disponível/);
    assert.match(cards[1].textContent, /Terça-feira[\s\S]*2 vagas de emergência disponíveis/);
    assert.equal(slots[1].disabled, false);
    assert.match(cards[2].textContent, /Quinta-feira[\s\S]*Sem vaga de emergência/);
    assert.equal(slots[2].disabled, true);
    assert.match(cards[3].textContent, /Sexta-feira[\s\S]*5 vagas de emergência disponíveis/);

    const emergencyReservationsBeforeClick = harness.records.dentalReservations.length;
    slots[1].click();
    await waitFor(
      () => harness.records.dentalReservations.length === emergencyReservationsBeforeClick + 1,
      'A vaga emergencial não foi reservada no clique'
    );
    const reservation = harness.records.dentalReservations.at(-1);
    assert.equal(reservation.date, '2099-08-04');
    assert.equal(reservation.type, 'emergencial');
    assert.equal(harness.dental[1].vagasEmergenciais, 1, 'A vaga emergencial não foi abatida no clique');
    await fillPatient(
      window,
      'Joana Teste da Silva',
      'Dor de dente; desejo solicitar vaga emergencial.'
    );
    const send = window.document.querySelector('#send');
    await waitFor(() => !send.disabled, 'O botão de envio emergencial não foi habilitado');

    const before = harness.records.whatsAppMessages.length;
    const emergencyReservationsBeforeSend = harness.records.dentalReservations.length;
    send.click();
    await waitFor(
      () => harness.records.whatsAppMessages.length === before + 1,
      'O WhatsApp não abriu após a vaga emergencial já reservada'
    );
    assert.equal(
      harness.records.dentalReservations.length,
      emergencyReservationsBeforeSend,
      'O envio pelo WhatsApp não pode descontar outra vaga emergencial'
    );
    const message = harness.records.whatsAppMessages.at(-1);
    assert.match(message, /Joana Teste da Silva/);
    assert.match(message, /Tipo de vaga odontológica: emergencial/);
    assert.match(message, /Dia escolhido: Terça-feira — 04\/08\/2099/);
  } finally {
    window.close();
  }
}

async function testAdmin(harness) {
  const dom = await harness.dom('admin.html');
  const {window} = dom;
  try {
    await waitFor(
      () => window.document.querySelector('#refreshAll').textContent === '✓ Dados conferidos',
      'A conferência inicial do painel não terminou'
    );
    await waitFor(
      () => window.document.querySelectorAll('#odontologiaWeek .day-card').length === 3,
      'O painel odontológico não carregou segunda, terça e quinta'
    );
    assert.ok(
      window.document.querySelector('[data-tab="recados"]').classList.contains('active'),
      'A aba inicial Recados não ficou ativa'
    );
    assert.equal(window.document.querySelector('[data-section="recados"]').hidden, false);

    setField(window, '#recadoTitle', 'Recado de teste');
    setField(window, '#recadoMessage', 'Publicação simulada e conferida.');
    window.document.querySelector('#publishRecado').click();
    await waitFor(
      () => window.document.querySelector('#recadoStatus').classList.contains('success'),
      'O recado não foi relido e confirmado'
    );
    assert.equal(
      window.document.querySelector('#recadoStatus').textContent,
      'Recado publicado, relido e confirmado.'
    );
    assert.equal(harness.records.mainPosts.at(-1).action, 'salvar_recado');
    assert.equal(harness.main.recados.length, 1);

    window.document.querySelector('[data-tab="medica"]').click();
    assert.ok(
      window.document.querySelector('[data-tab="medica"]').classList.contains('active'),
      'A aba Médica não ficou ativa'
    );
    assert.equal(window.document.querySelector('[data-section="medica"]').hidden, false);
    assert.equal(window.document.querySelector('[data-section="recados"]').hidden, true);
    const medicalCard = window.document.querySelector('#medicaWeek .day-card[data-index="0"]');
    medicalCard.querySelector('.f-date').value = '2099-08-03';
    medicalCard.querySelector('.f-time').value = '09:00';
    medicalCard.querySelector('.f-status').value = 'confirmado';
    medicalCard.querySelector('.f-message').value = 'Atendimento médico confirmado';
    medicalCard.querySelector('.b-publish').click();
    await waitFor(
      () => medicalCard.querySelector('.day-status').classList.contains('success'),
      'A agenda médica não foi relida e confirmada'
    );
    assert.equal(
      medicalCard.querySelector('.day-status').textContent,
      'Publicado, relido e confirmado no Portal do Morador.'
    );
    const medicalPost = harness.records.mainPosts.at(-1);
    assert.equal(medicalPost.action, 'salvar_modulo');
    const medicalPayload = JSON.parse(medicalPost.payload);
    assert.equal(medicalPayload.module, 'medica');
    assert.equal(medicalPayload.days[0].active, true);
    assert.equal(medicalPayload.days[0].message, 'Atendimento médico confirmado');

    window.document.querySelector('[data-tab="nutricionista"]').click();
    assert.equal(window.document.querySelector('[data-section="nutricionista"]').hidden, false);
    assert.equal(window.document.querySelector('[data-section="medica"]').hidden, true);
    const nutritionCard = window.document.querySelector(
      '#nutricionistaWeek .day-card[data-index="1"]'
    );
    nutritionCard.querySelector('.f-date').value = '2099-08-04';
    nutritionCard.querySelector('.f-time').value = '10:30';
    nutritionCard.querySelector('.f-status').value = 'confirmado';
    nutritionCard.querySelector('.f-message').value = 'Atendimento com nutricionista';
    nutritionCard.querySelector('.b-publish').click();
    await waitFor(
      () => nutritionCard.querySelector('.day-status').classList.contains('success'),
      'A agenda da nutricionista não foi relida e confirmada'
    );
    const nutritionPost = harness.records.mainPosts.at(-1);
    assert.equal(nutritionPost.action, 'salvar_modulo');
    const nutritionPayload = JSON.parse(nutritionPost.payload);
    assert.equal(nutritionPayload.module, 'nutricionista');
    assert.equal(nutritionPayload.days[1].active, true);

    window.document.querySelector('[data-tab="enfermeira"]').click();
    assert.equal(window.document.querySelector('[data-section="enfermeira"]').hidden, false);
    const nurseCard = window.document.querySelector(
      '#enfermeiraWeek .day-card[data-index="2"]'
    );
    nurseCard.querySelector('.f-icon').value = '💉';
    nurseCard.querySelector('.f-service').value = 'Vacinação';
    nurseCard.querySelector('.b-publish').click();
    await waitFor(
      () => nurseCard.querySelector('.day-status').classList.contains('success'),
      'A agenda da enfermeira não foi relida e confirmada'
    );
    assert.equal(
      nurseCard.querySelector('.day-status').textContent,
      'Agenda da enfermeira publicada, relida e confirmada.'
    );
    const nursePost = harness.records.mainPosts.at(-1);
    assert.equal(nursePost.action, 'salvar_agenda_enfermeira');
    const nursePayload = JSON.parse(nursePost.payload);
    assert.equal(nursePayload.dias[2].service, 'Vacinação');
    assert.equal(nursePayload.dias[2].available, true);

    window.document.querySelector('[data-tab="campanhas"]').click();
    assert.equal(window.document.querySelector('[data-section="campanhas"]').hidden, false);
    setField(window, '#campaignTitle', 'Campanha de teste');
    setField(window, '#campaignMessage', 'Publicação simulada e conferida.');
    setField(window, '#campaignStart', '');
    setField(window, '#campaignDays', '5');
    window.document.querySelector('#publishCampaign').click();
    await waitFor(
      () => window.document.querySelector('#campaignStatus').classList.contains('success'),
      'A campanha não foi relida e confirmada'
    );
    assert.equal(
      window.document.querySelector('#campaignStatus').textContent,
      'Campanha publicada, relida e confirmada.'
    );
    assert.equal(harness.records.mainPosts.at(-1).action, 'salvar_campanha');
    assert.equal(harness.main.campanhas.length, 1);

    window.document.querySelector('#cancelCampaign').click();
    await waitFor(
      () =>
        window.document.querySelector('#campaignStatus').textContent ===
        'Todas as campanhas foram retiradas e a leitura confirmou.',
      'A retirada da campanha não foi confirmada'
    );
    assert.equal(harness.records.mainPosts.at(-1).action, 'cancelar_campanhas');
    assert.equal(harness.main.campanhas.length, 0);

    window.document.querySelector('[data-tab="odontologia"]').click();
    assert.ok(
      window.document.querySelector('[data-tab="odontologia"]').classList.contains('active'),
      'A aba Odontologia não ficou ativa'
    );
    assert.equal(window.document.querySelector('[data-section="odontologia"]').hidden, false);
    assert.equal(window.document.querySelector('[data-section="campanhas"]').hidden, true);
    const cards = Array.from(window.document.querySelectorAll('#odontologiaWeek .day-card'));
    assert.equal(cards.length, 3);
    assert.deepEqual(
      cards.map(card => card.querySelector('.day-title strong').textContent),
      ['Segunda-feira', 'Terça-feira', 'Quinta-feira']
    );

    const first = cards[0];
    first.querySelector('.f-date').value = '2099-08-03';
    first.querySelector('.f-common').value = '3';
    first.querySelector('.f-emergency').value = '2';
    first.querySelector('.f-active').checked = true;
    first.querySelector('.b-publish').click();
    await waitFor(
      () => {
        const current = window.document.querySelector(
          '#odontologiaWeek .day-card[data-index="0"] .day-status'
        );
        return current && current.classList.contains('success');
      },
      'As vagas do painel não foram relidas e confirmadas'
    );
    const dentalStatus = window.document.querySelector(
      '#odontologiaWeek .day-card[data-index="0"] .day-status'
    );
    assert.equal(
      dentalStatus.textContent,
      'Vagas odontológicas publicadas, relidas e confirmadas.'
    );

    const post = harness.records.dentalAdminPosts.at(-1);
    assert.equal(post.action, 'salvar_agenda');
    const payload = JSON.parse(post.payload);
    assert.deepEqual(
      payload.dias.map(item => item.dia),
      ['Segunda-feira', 'Terça-feira', 'Quinta-feira']
    );
    assert.equal(payload.dias[0].vagasComuns, 3);
    assert.equal(payload.dias[0].vagasEmergenciais, 2);
    assert.doesNotMatch(JSON.stringify(payload), /Sexta-feira/);

    window.document.querySelector('[data-tab="recados"]').click();
    window.document.querySelector('#cancelRecado').click();
    await waitFor(
      () =>
        window.document.querySelector('#recadoStatus').textContent ===
        'Todos os recados foram retirados e a leitura confirmou.',
      'A retirada do recado não foi confirmada'
    );
    assert.equal(harness.records.mainPosts.at(-1).action, 'cancelar_recados');
    assert.equal(harness.main.recados.length, 0);
  } finally {
    window.close();
  }
}

async function testPublicSynchronization(harness) {
  harness.main.modules.medica = [
    {
      day: 'Sexta-feira',
      active: true,
      date: '2099-08-07',
      time: '08:00 as 12:00',
      status: 'CANCELADO',
      message: 'Atendimento médico',
      service: 'Atendimento médico',
      closedNow: false
    }
  ];
  harness.main.modules.psicologo = [
    {
      day: 'Sexta-feira',
      active: true,
      date: '2099-08-07',
      time: '13:00 as 16:00',
      status: 'ATENDIMENTO',
      message: 'Atendimento psicológico',
      service: 'Atendimento psicológico',
      closedNow: false
    }
  ];
  harness.main.professionals = [
    {
      id: 'psicologo',
      title: 'Atendimento com psicólogo',
      icon: '🧠',
      order: 5,
      active: true,
      category: 'Solicitar atendimento com psicólogo',
      service: {
        name: 'Atendimento psicológico',
        description: 'Solicitação de atendimento com psicólogo.'
      }
    }
  ];
  harness.main.recados = [
    {
      id: 'recado-publico',
      title: 'Recado sincronizado',
      message: 'Mensagem vinda da fonte principal.',
      active: true
    }
  ];
  harness.main.campanhas = [
    {
      id: 'campanha-publica',
      title: 'Campanha sincronizada',
      message: 'Campanha vinda da fonte principal.',
      active: true
    }
  ];

  const dom = await harness.dom('index.html');
  const {window} = dom;
  try {
    await waitFor(
      () => window.document.querySelector('#integralPublicArea'),
      'Recados e campanhas da fonte principal não apareceram no portal'
    );
    const alerts = window.document.querySelector('#integralPublicArea').textContent;
    assert.match(alerts, /Recado sincronizado/);
    assert.match(alerts, /Campanha sincronizada/);

    await waitFor(
      () =>
        Array.from(window.document.querySelectorAll('#agenda-enfermeira .agenda-day')).some(button =>
          /Puericultura/.test(button.textContent)
        ),
      'A agenda da enfermeira não apareceu no portal'
    );
    const nurseDay = Array.from(
      window.document.querySelectorAll('#agenda-enfermeira .agenda-day')
    ).find(button => /Puericultura/.test(button.textContent));
    assert.equal(nurseDay.disabled, false);

    const category = window.document.querySelector('#category');
    category.value = 'Solicitar atendimento com a Médica';
    dispatch(window, category, 'change');
    await waitFor(
      () => window.document.querySelector('#agenda-medica .agenda-day'),
      'A agenda médica ativa não apareceu no portal'
    );
    const medicalDay = window.document.querySelector('#agenda-medica .agenda-day');
    assert.match(medicalDay.textContent, /Sexta-feira/);
    assert.match(medicalDay.textContent, /Situação:\s*Cancelado/);
    assert.equal(
      medicalDay.disabled,
      true,
      'Uma agenda cancelada deve ser publicada para informação, mas não pode ser selecionada'
    );
    assert.doesNotMatch(
      window.document.querySelector('#agenda-medica').textContent,
      /Nenhuma programação publicada/
    );

    await waitFor(
      () => Array.from(category.options).some(option =>
        option.dataset.professionalModule === 'psicologo' &&
        option.value === 'Solicitar atendimento com psicólogo'
      ),
      'O psicólogo ativo não foi incluído nas opções do morador'
    );
    category.value = 'Solicitar atendimento com psicólogo';
    dispatch(window, category, 'change');
    await waitFor(
      () => {
        const section = window.document.querySelector('#agenda-psicologo');
        return section && !section.hidden && section.querySelector('.agenda-day:not(:disabled)');
      },
      'A agenda dinâmica do psicólogo não apareceu no portal'
    );
    const psychologistDay = window.document.querySelector(
      '#agenda-psicologo .agenda-day:not(:disabled)'
    );
    assert.match(psychologistDay.textContent, /Sexta-feira/);
    assert.match(psychologistDay.textContent, /Atendimento psicológico/);
    psychologistDay.click();
    await waitFor(
      () => /Solicitar atendimento com psicólogo/.test(
        window.document.querySelector('#subject').value
      ),
      'O dia do psicólogo não preencheu a solicitação do morador'
    );
    assert.match(window.document.querySelector('#subject').value, /07\/08\/2099/);
    assert.ok(
      Array.from(category.options).some(option =>
        /odontológico \(dentista\)/.test(option.value)
      ),
      'A opção odontológica foi removida pela extensão dinâmica'
    );
  } finally {
    window.close();
  }
}

async function main() {
  const harness = new Harness();
  await testRegularDental(harness);
  await testEmergencyDental(harness);
  await testAdmin(harness);
  await testPublicSynchronization(harness);
  assert.equal(harness.records.dentalReservations.length, 2);
  assert.equal(harness.records.oldNoticeRequests.length, 0);
  assert.deepEqual(harness.errors, [], `Erros no DOM: ${harness.errors.join('; ')}`);
  console.log(
    'DOM: abas, sincronização pública, profissionais dinâmicos, médica, enfermeira, nutricionista, campanhas, recados, odontologia, abatimento único e WhatsApp validados sem gravação real.'
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
