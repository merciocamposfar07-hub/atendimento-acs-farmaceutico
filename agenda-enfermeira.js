(function () {
  'use strict';

  var API = String(
    window.TACS_ADMIN_API_URL ||
      'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec'
  ).trim();

  var ONE_SIGNAL_APP_ID = 'e2294b98-c72b-4f8c-a055-de28979676dc';
  var ONE_SIGNAL_SAFARI_ID =
    'web.onesignal.auto.4bead971-106d-461b-853f-83aecbd62d40';
  var WHATSAPP_NUMBER = '5581989613130';
  var TACS_NAME = 'Mércio José Campos dos Santos';

  var DEFAULTS = {
    enfermeira: [
      { day: 'Segunda-feira', active: true, service: 'Visita', icon: '🏠' },
      { day: 'Terça-feira', active: true, service: 'Pré-natal', icon: '🤰' },
      { day: 'Quarta-feira', active: false, service: 'Folga', icon: '❌' },
      {
        day: 'Quinta-feira',
        active: true,
        service: 'Puericultura - acompanhamento de crianças e adolescentes',
        icon: '👶'
      },
      { day: 'Sexta-feira', active: true, service: 'Preventivo', icon: '🌸' }
    ],
    medica: [],
    nutricionista: []
  };

  var state = {
    modules: {
      enfermeira: DEFAULTS.enfermeira.slice(),
      medica: [],
      nutricionista: []
    },
    professionals: {},
    updatedAt: '',
    syncError: ''
  };
  var publicListenerInstalled = false;

  function id(value) {
    return document.getElementById(value);
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function booleanValue(value) {
    if (value === true || value === 1) return true;
    return ['true', '1', 'sim', 'yes', 'ativo', 'ativa'].indexOf(
      clean(value).toLowerCase()
    ) !== -1;
  }

  function moduleKey(value) {
    var text = clean(value).toLowerCase();
    if (text.normalize) {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    text = text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (['medica', 'medico', 'medicina'].indexOf(text) !== -1) return 'medica';
    if (['nutricionista', 'nutricao'].indexOf(text) !== -1) return 'nutricionista';
    if (['enfermeira', 'enfermeiro', 'enfermagem'].indexOf(text) !== -1) return 'enfermeira';
    if (['odontologia', 'dentista'].indexOf(text) !== -1) return 'odontologia';
    return text;
  }

  function titleFromKey(value) {
    return clean(value).split('_').map(function (part) {
      return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
    }).join(' ');
  }

  function esc(value) {
    return clean(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function addStyles() {
    if (id('portal-tacs-restored-style')) return;
    var style = document.createElement('style');
    style.id = 'portal-tacs-restored-style';
    style.textContent = [
      'html,body{max-width:100%!important;overflow-x:hidden!important}',
      '.shell,.panel,.content,.form-panel,.grid,.grid>*,.full,label{min-width:0!important;max-width:100%!important}',
      'input,textarea,select,button{min-width:0!important;max-width:100%!important}',
      '.tacs-sync-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:rgba(2,18,30,.72);backdrop-filter:blur(4px)}',
      '.tacs-sync-box{width:min(92vw,520px);padding:25px;border-radius:22px;background:#fff;color:#102b3c;box-shadow:0 25px 70px rgba(0,0,0,.35)}',
      '.tacs-sync-icon{width:54px;height:54px;display:grid;place-items:center;margin:0 auto 12px;border-radius:50%;background:#e7f6ed;color:#078940;font-size:28px;font-weight:950;animation:tacs-spin 1.1s linear infinite}',
      '.tacs-sync-box h2{margin:0;text-align:center;font-size:28px}',
      '.tacs-sync-box p{margin:10px 0;text-align:center;font-size:17px;line-height:1.45}',
      '.tacs-sync-bar{height:10px;overflow:hidden;margin:18px 0 10px;border-radius:999px;background:#dbe6eb}',
      '.tacs-sync-progress{height:100%;width:8%;border-radius:999px;background:#079447;transition:width .35s ease}',
      '.tacs-sync-step{text-align:center;color:#06763a;font-size:15px;font-weight:900}',
      '@keyframes tacs-spin{to{transform:rotate(360deg)}}',
      '.portal-agendas{grid-column:1/-1;display:grid;gap:18px;margin:2px 0 4px}',
      '.portal-agenda{overflow:hidden;padding:22px;border:2px solid #0876a6;border-radius:20px;background:#e7f5fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.16)}',
      '.portal-agenda[data-module="medica"]{border-color:#197fb1;background:#eaf6fc}',
      '.portal-agenda[data-module="nutricionista"]{border-color:#1f9b58;background:#e9f9ef}',
      '.portal-agenda small{display:block;color:#078f45;font-size:15px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}',
      '.portal-agenda h3{margin:9px 0 6px;font-size:clamp(28px,5vw,39px);line-height:1.08}',
      '.portal-agenda>p{margin:0 0 16px;color:#345566;font-size:17px;font-weight:650;line-height:1.5}',
      '.agenda-days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}',
      '.agenda-day{min-width:0;min-height:142px;padding:14px 12px;border:2px solid #6594aa;border-radius:15px;background:#fff;color:#102b3c;text-align:left;overflow-wrap:anywhere;box-shadow:0 5px 13px rgba(4,44,70,.08)}',
      '.agenda-day strong,.agenda-day span,.agenda-day b,.agenda-day em{display:block}',
      '.agenda-day strong{font-size:18px;line-height:1.2}',
      '.agenda-day span{margin-top:8px;font-size:23px}',
      '.agenda-day b{margin-top:7px;color:#078f45;font-size:17px;font-weight:950;line-height:1.3}',
      '.agenda-day em{margin-top:6px;color:#3e5e6d;font-size:14px;font-weight:650;font-style:normal;line-height:1.35}',
      '.agenda-day.selected{border-color:#0876a6;background:#dff2fb;box-shadow:0 0 0 4px rgba(8,118,166,.18),0 7px 16px rgba(4,44,70,.12)}',
      '.agenda-day:disabled{opacity:1;background:#fff3f2;border-color:#d8aaa7;color:#526a76;cursor:not-allowed;box-shadow:none}.agenda-day:disabled strong{color:#536c79}.agenda-day:disabled span{opacity:.88}.agenda-day:disabled b{color:#b54039}.agenda-day:disabled em{color:#6b7f89}.portal-agenda[data-module="medica"] .agenda-day:not(:disabled){border-color:#4b98bd;background:#f7fcff}.portal-agenda[data-module="nutricionista"] .agenda-day:not(:disabled),.portal-agenda[data-module="enfermeira"] .agenda-day:not(:disabled){border-color:#51a976;background:#f7fff9}',
      '.agenda-status{margin:16px 0 0;padding-top:14px;border-top:1px solid #86a7b7;font-size:16px;font-weight:800;line-height:1.45}',
      '.tacs-send-options{display:grid;gap:12px;margin-top:16px}',
      '.tacs-card-button{width:100%;min-height:72px;border:0;border-radius:16px;padding:14px 20px;background:linear-gradient(180deg,#0d5f8a,#062c46);color:#fff;font-size:20px;font-weight:950;box-shadow:0 14px 28px rgba(6,44,70,.22)}',
      '.tacs-card-button small{display:block;margin-top:4px;font-size:14px;font-weight:750}',
      '.tacs-card-button:disabled{opacity:.45;box-shadow:none}',
      '.notification-offer{margin-top:18px;padding:20px;border:2px solid #0d5f8a;border-radius:18px;background:#f4fbff;color:#082b43}',
      '.notification-offer h3{margin:0 0 8px;font-size:24px}',
      '.notification-offer p{margin:8px 0;line-height:1.5}',
      '.notification-offer button{width:100%;margin-top:12px;padding:15px 18px;border:0;border-radius:14px;background:#086b9b;color:#fff;font-size:18px;font-weight:900}',
      '.notification-offer button:disabled{opacity:.6}',
      '.notification-repair{margin-top:10px!important;border:2px solid #0d5f8a!important;background:#fff!important;color:#073a55!important}',
      '.notification-repair[hidden]{display:none!important}',
      '.notification-status{font-weight:850}',
      '.notification-help{font-size:15px;color:#405866}',
      'footer.portal-footer-fixed{display:block!important;padding:22px 20px calc(34px + env(safe-area-inset-bottom))!important;text-align:center!important;overflow-wrap:anywhere!important}',
      'footer.portal-footer-fixed div{border:0!important;padding:0!important}',
      'footer.portal-footer-fixed strong{display:block!important;font-size:17px!important}',
      'footer.portal-footer-fixed .portal-location{margin-top:4px!important;font-size:15px!important}',
      'footer.portal-footer-fixed .portal-rights{margin-top:17px!important;padding-top:15px!important;border-top:1px solid #7895a5!important;font-size:14px!important;font-weight:800!important;line-height:1.55!important}',
      '@media(max-width:720px){',
      '.shell{width:calc(100% - 12px)!important;max-width:100%!important}',
      '.content{padding-left:13px!important;padding-right:13px!important}',
      '.form-panel{padding-left:14px!important;padding-right:14px!important}',
      '.portal-agenda{padding:18px 14px!important}',
      '.agenda-days{grid-template-columns:1fr!important;gap:12px!important}',
      '.agenda-day{width:100%!important;min-height:108px!important;padding:16px!important}',
      '.portal-agenda h3{font-size:30px!important}',
      'label,input,textarea,select,.help,.privacy{overflow-wrap:anywhere!important;word-break:normal!important}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function syncOverlay() {
    var overlay = id('tacsSyncOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'tacsSyncOverlay';
    overlay.className = 'tacs-sync-overlay';
    overlay.innerHTML =
      '<div class="tacs-sync-box" role="status" aria-live="polite">' +
      '<div class="tacs-sync-icon">↻</div>' +
      '<h2>Sincronizando o Portal TACS</h2>' +
      '<p id="tacsSyncText">Conectando ao banco de dados da unidade...</p>' +
      '<div class="tacs-sync-bar"><div id="tacsSyncProgress" class="tacs-sync-progress"></div></div>' +
      '<div id="tacsSyncStep" class="tacs-sync-step">1/3 — Conectando ao Google Apps Script</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function setSync(percent, text, step) {
    syncOverlay();
    var progress = id('tacsSyncProgress');
    var message = id('tacsSyncText');
    var stepBox = id('tacsSyncStep');
    if (progress) progress.style.width = percent + '%';
    if (message) message.textContent = text;
    if (stepBox) stepBox.textContent = step;
  }

  function finishSync(success) {
    setSync(
      100,
      success ? 'Dados atualizados com sucesso.' : 'O portal abriu com os dados disponíveis.',
      success ? '3/3 — Portal sincronizado' : '3/3 — Sincronização parcial'
    );
    setTimeout(function () {
      var overlay = id('tacsSyncOverlay');
      if (overlay && overlay.parentNode) overlay.remove();
    }, 750);
  }

  function jsonp(action) {
    if (
      action === 'painel_publico' &&
      window.PortalTacsPublicData &&
      typeof window.PortalTacsPublicData.get === 'function'
    ) {
      return window.PortalTacsPublicData.get();
    }
    return new Promise(function (resolve, reject) {
      if (!API) {
        reject(new Error('Serviço não configurado.'));
        return;
      }

      var callback =
        'tacsPortalSync' +
        Date.now() +
        Math.floor(Math.random() * 100000);
      var script = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () {
        finish(new Error('O servidor demorou para responder.'));
      }, 16000);

      function finish(error, data) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          delete window[callback];
        } catch (ignore) {}
        if (script.parentNode) script.remove();
        if (error) reject(error);
        else resolve(data);
      }

      window[callback] = function (data) {
        if (!data || data.ok === false) {
          finish(new Error((data && data.message) || 'Leitura recusada.'));
          return;
        }
        finish(null, data);
      };

      script.onerror = function () {
        finish(new Error('Falha ao consultar o servidor.'));
      };

      script.src =
        API +
        (API.indexOf('?') === -1 ? '?' : '&') +
        'action=' +
        encodeURIComponent(action) +
        '&callback=' +
        encodeURIComponent(callback) +
        '&v=' +
        Date.now();

      document.head.appendChild(script);
    });
  }

  function updateFooter() {
    var footer = document.querySelector('footer');
    if (!footer) return;
    footer.className = 'portal-footer-fixed';
    footer.innerHTML =
      '<div><strong>Serviço TACS – Unidade de Saúde Posto Matias</strong>' +
      '<div class="portal-location">Sítio Japaranduba • Chã Grande/PE</div>' +
      '<div class="portal-rights">© 2026 Mércio José Campos dos Santos — Portal TACS. Todos os direitos reservados.</div></div>';
  }

  function optionExists(select, value) {
    return Array.prototype.some.call(select.options, function (option) {
      return option.value === value;
    });
  }

  function addCategoryOptions() {
    var select = id('category');
    if (!select) return;

    var legacy = [
      {module: 'medica', value: 'Solicitar atendimento com a Médica'},
      {module: 'enfermeira', value: 'Solicitar atendimento com a Enfermeira Chefe'},
      {module: 'nutricionista', value: 'Solicitar atendimento com nutricionista'}
    ];

    legacy.forEach(function (item) {
      var value = item.value;
      if (optionExists(select, value)) return;
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.dataset.professionalModule = item.module;
      var firstDental = Array.prototype.find.call(
        select.options,
        function (item) {
          return clean(item.value).toLowerCase().indexOf('odontológico') !== -1;
        }
      );
      select.insertBefore(option, firstDental || null);
    });

    legacy.forEach(function (item) {
      Array.prototype.forEach.call(select.options, function (option) {
        if (option.value === item.value) {
          option.dataset.professionalModule = item.module;
        }
      });
    });

    var ativos = {};
    Object.keys(state.professionals).forEach(function (module) {
      var professional = state.professionals[module];
      if (!professional || professional.active === false || module === 'odontologia') return;
      ativos[module] = true;
      var category = moduleCategory(module);
      if (!category) return;
      var existing = Array.prototype.find.call(select.options, function (option) {
        return option.dataset.professionalModule === module || option.value === category;
      });
      if (existing) {
        existing.value = category;
        existing.textContent = category;
        existing.dataset.professionalModule = module;
        if (['medica', 'enfermeira', 'nutricionista'].indexOf(module) === -1) {
          existing.dataset.dynamicProfessional = '1';
        }
        return;
      }
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      option.dataset.professionalModule = module;
      option.dataset.dynamicProfessional = '1';
      var firstDental = Array.prototype.find.call(select.options, function (candidate) {
        return clean(candidate.value).toLowerCase().indexOf('odontológico') !== -1;
      });
      select.insertBefore(option, firstDental || null);
    });

    Array.prototype.slice.call(
      select.querySelectorAll('option[data-dynamic-professional="1"]')
    ).forEach(function (option) {
      if (!ativos[option.dataset.professionalModule]) option.remove();
    });
  }

  function moduleTitle(module) {
    if (module === 'medica') return 'Agenda da Médica';
    if (module === 'nutricionista') return 'Agenda da Nutricionista';
    if (module === 'enfermeira') return 'Agenda da Enfermeira Chefe';
    var professional = state.professionals[module] || {};
    return professional.title
      ? 'Agenda: ' + clean(professional.title)
      : 'Agenda de ' + titleFromKey(module);
  }

  function moduleCategory(module) {
    if (module === 'medica') return 'Solicitar atendimento com a Médica';
    if (module === 'nutricionista') return 'Solicitar atendimento com nutricionista';
    if (module === 'enfermeira') {
      return 'Solicitar atendimento com a Enfermeira Chefe';
    }
    var professional = state.professionals[module] || {};
    return clean(professional.category) ||
      'Solicitar atendimento com ' +
      clean(professional.title || titleFromKey(module));
  }

  function moduleIcon(module) {
    if (module === 'medica') return '🩺';
    if (module === 'nutricionista') return '🥗';
    if (module === 'enfermeira') return '👩‍⚕️';
    return clean((state.professionals[module] || {}).icon) || '👤';
  }

  function formatDate(value) {
    var text = clean(value);
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : text;
  }

  function statusKey(value) {
    var text = clean(value).toLowerCase();
    return text.normalize
      ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : text;
  }

  function unavailableStatus(value) {
    return ['cancelado', 'sem atendimento', 'feriado', 'desativado'].indexOf(
      statusKey(value)
    ) !== -1;
  }

  function statusLabel(value) {
    var labels = {
      atendimento: 'Atendimento confirmado',
      confirmado: 'Atendimento confirmado',
      aguardando: 'Aguardando confirmação',
      alterado: 'Data alterada',
      cancelado: 'Cancelado',
      'sem atendimento': 'Sem atendimento',
      feriado: 'Feriado',
      desativado: 'Desativado'
    };
    return labels[statusKey(value)] || clean(value);
  }

  function ensureAgendasContainer() {
    var existing = id('portalProfessionalAgendas');
    if (existing) return existing;
    var dental = id('dentalSchedule');
    var subjectField = id('subjectField');
    if (!dental || !dental.parentNode) return null;

    var container = document.createElement('section');
    container.id = 'portalProfessionalAgendas';
    container.className = 'portal-agendas full';

    dental.parentNode.insertBefore(container, dental);
    if (subjectField && subjectField.parentNode !== dental.parentNode) {
      dental.parentNode.insertBefore(container, dental);
    }
    return container;
  }

  function visibleDays(module) {
    var days = state.modules[module] || [];
    if (days.length) return days;
    if (module === 'enfermeira') return DEFAULTS.enfermeira.slice();
    return [];
  }

  function renderModule(module) {
    var container = ensureAgendasContainer();
    if (!container) return;
    var section = id('agenda-' + module);
    if (!section) {
      section = document.createElement('section');
      section.id = 'agenda-' + module;
      section.className = 'portal-agenda';
      section.dataset.module = module;
      container.appendChild(section);
    }

    var days = visibleDays(module);
    var hasPublished = days.some(function (item) {
      return item.active === true;
    });
    var hasAvailable = days.some(function (item) {
      return (
        item.active === true &&
        item.closedNow !== true &&
        !unavailableStatus(item.status)
      );
    });

    var intro =
      module === 'enfermeira'
        ? 'Toque no dia correspondente ao atendimento que você precisa.'
        : 'Veja os dias publicados pela Unidade de Saúde. Toque em um dia ativo para incluir a informação na solicitação.';

    var html =
      '<small>' +
      moduleIcon(module) +
      ' ' +
      esc(moduleTitle(module)) +
      '</small>' +
      '<h3>' +
      (module === 'enfermeira'
        ? 'Escolha o atendimento'
        : 'Programação publicada') +
      '</h3>' +
      '<p>' +
      intro +
      '</p>' +
      '<div class="agenda-days">';

    if (!days.length) {
      html +=
        '<div class="agenda-status">Nenhuma programação publicada no momento.</div>';
    } else {
      days.forEach(function (item, index) {
        var active =
          item.active === true &&
          item.closedNow !== true &&
          !unavailableStatus(item.status);
        var service = clean(item.service || item.message);
        var date = formatDate(item.date);
        var time = clean(item.time);
        var situation = statusLabel(item.status);
        var icon =
          module === 'enfermeira'
            ? clean(item.icon || (active ? '✅' : '❌'))
            : active
              ? moduleIcon(module)
              : '❌';

        html +=
          '<button type="button" class="agenda-day" data-module="' +
          esc(module) +
          '" data-index="' +
          index +
          '"' +
          (active ? '' : ' disabled') +
          '>' +
          '<strong>' +
          esc(item.day || 'Dia informado') +
          '</strong>' +
          '<span>' +
          esc(icon) +
          '</span>' +
          '<b>' +
          esc(service || (active ? 'Atendimento disponível' : 'Sem atendimento')) +
          '</b>' +
          (situation ? '<em>Situação: ' + esc(situation) + '</em>' : '') +
          (date ? '<em>Data: ' + esc(date) + '</em>' : '') +
          (time ? '<em>Horário: ' + esc(time) + '</em>' : '') +
          '</button>';
      });
    }

    html +=
      '</div><p class="agenda-status">' +
      (hasPublished
        ? hasAvailable
          ? 'Programação vigente publicada pela Unidade de Saúde.'
          : 'A programação foi publicada, mas não há atendimento disponível neste dia.'
        : 'Nenhum dia ativo foi publicado para este atendimento.') +
      '</p>';

    section.innerHTML = html;

    section.querySelectorAll('.agenda-day:not(:disabled)').forEach(function (button) {
      button.addEventListener('click', function () {
        section.querySelectorAll('.agenda-day').forEach(function (other) {
          other.classList.remove('selected');
        });
        button.classList.add('selected');

        var item =
          visibleDays(module)[Number(button.dataset.index)] || {};
        var category = id('category');
        var subject = id('subject');
        var subjectField = id('subjectField');

        if (category) {
          category.value = moduleCategory(module);
          category.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (subject) {
          var text =
            moduleCategory(module) +
            ' - ' +
            clean(item.day) +
            (item.date ? ' - ' + formatDate(item.date) : '') +
            (item.time ? ' às ' + clean(item.time) : '') +
            ': ' +
            clean(item.service || item.message || 'Atendimento publicado');
          subject.value = text;
          subject.dispatchEvent(new Event('input', { bubbles: true }));
        }

        var status = section.querySelector('.agenda-status');
        if (status) {
          status.textContent =
            'Selecionado: ' +
            clean(item.day) +
            ' — ' +
            clean(item.service || item.message || 'Atendimento.');
        }

        if (subjectField) {
          subjectField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  function renderAgendas() {
    var modules = ['medica', 'enfermeira', 'nutricionista'];
    Object.keys(state.professionals)
      .sort(function (a, b) {
        var pa = state.professionals[a] || {};
        var pb = state.professionals[b] || {};
        return Number(pa.order || 999) - Number(pb.order || 999);
      })
      .forEach(function (module) {
        if (
          module !== 'odontologia' &&
          modules.indexOf(module) === -1 &&
          state.professionals[module].active !== false
        ) {
          modules.push(module);
        }
      });

    var container = ensureAgendasContainer();
    if (container) {
      Array.prototype.slice.call(container.querySelectorAll('.portal-agenda')).forEach(
        function (section) {
          if (modules.indexOf(clean(section.dataset.module)) === -1) section.remove();
        }
      );
    }
    modules.forEach(renderModule);
  }

  function applyPublicData(data) {
    if (!data || data.ok === false) return null;
    var modules = data.modules || {};
    state.modules = {
      medica: [],
      enfermeira: DEFAULTS.enfermeira.slice(),
      nutricionista: []
    };
    Object.keys(modules).forEach(function (rawModule) {
      var module = moduleKey(rawModule);
      if (!module || !Array.isArray(modules[rawModule])) return;
      state.modules[module] = modules[rawModule];
    });
    if (!state.modules.enfermeira.length) {
      state.modules.enfermeira = DEFAULTS.enfermeira.slice();
    }

    state.professionals = {};
    var professionals = Array.isArray(data.professionals)
      ? data.professionals
      : Array.isArray(data.profissionais)
        ? data.profissionais
        : [];
    professionals.forEach(function (item) {
      var module = moduleKey(item && (item.id || item.ID || item.module));
      if (!module || !booleanValue(item.active == null ? item.ATIVO : item.active)) return;
      state.professionals[module] = {
        id: module,
        title: clean(item.title || item.TITULO_PUBLICO || item.name || item.NOME),
        icon: clean(item.icon || item.ICONE) || '👤',
        order: Number(item.order == null ? item.ORDEM : item.order) || 999,
        category: clean(item.category),
        active: true,
        service: item.service || null
      };
    });

    Object.keys(state.modules).forEach(function (module) {
      if (
        ['medica', 'enfermeira', 'nutricionista', 'odontologia'].indexOf(module) !== -1 ||
        state.professionals[module]
      ) return;
      var days = state.modules[module] || [];
      if (!days.some(function (item) { return booleanValue(item && item.active); })) return;
      state.professionals[module] = {
        id: module,
        title: titleFromKey(module),
        icon: '👤',
        order: 999,
        category: 'Solicitar atendimento com ' + titleFromKey(module),
        active: true,
        service: null
      };
    });

    addCategoryOptions();
    state.updatedAt = clean(data.atualizadoEm);
    state.syncError = '';
    renderAgendas();
    return data;
  }

  function syncPortal() {
    renderAgendas();
    return jsonp('painel_publico')
      .then(applyPublicData)
      .catch(function (error) {
        state.syncError = error.message || String(error);
        renderAgendas();
        return null;
      });
  }

  function normalizeFormText() {
    var send = id('send');
    if (send) {
      send.innerHTML =
        'Enviar solicitação por escrito pelo WhatsApp' +
        '<small>Mensagem completa em texto para o TACS.</small>';
    }
    var privacy = document.querySelector('.privacy');
    if (privacy) {
      privacy.textContent =
        'Nome, data de nascimento, idade, CPF/CNS, endereço e solicitação podem ser enviados por escrito ou em card pelo WhatsApp ao TACS – Mércio José Campos dos Santos. Esses dados não ficam armazenados nesta página.';
    }
  }

  function requestData() {
    var ageStatus = id('ageStatus');
    var ageText = ageStatus ? clean(ageStatus.textContent) : '';
    if (/^Idade:/i.test(ageText)) {
      ageText = ageText.replace(/^Idade:\s*/i, '');
    }

    return {
      name: clean(id('name') && id('name').value),
      birth: clean(id('birth') && id('birth').value),
      age: ageText || 'Não informada',
      document: clean(id('cpf') && id('cpf').value),
      locality: clean(id('locality') && id('locality').value),
      category: clean(id('category') && id('category').value),
      description: clean(id('subject') && id('subject').value),
      sentAt: new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Recife',
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date())
    };
  }

  function wrapText(ctx, text, maxWidth) {
    var words = clean(text).split(/\s+/);
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      var test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var lines = wrapText(ctx, text || 'Não informado', maxWidth);
    var limit = Math.min(lines.length, maxLines || lines.length);
    for (var index = 0; index < limit; index += 1) {
      var value = lines[index];
      if (index === limit - 1 && lines.length > limit) value += '…';
      ctx.fillText(value, x, y + index * lineHeight);
    }
    return y + limit * lineHeight;
  }

  function rounded(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function createCard(data) {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    var ctx = canvas.getContext('2d');

    var gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#031b2d');
    gradient.addColorStop(0.55, '#062c46');
    gradient.addColorStop(1, '#0d5f8a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#70e39f';
    ctx.font = '900 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('PORTAL TACS • POSTO MATIAS', 62, 92);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR', 62, 180);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    rounded(ctx, 52, 225, 976, 154, 28);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '850 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Área TACS: Sítio Japaranduba', 82, 282);
    ctx.fillText('TACS: ' + TACS_NAME, 82, 332);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 47px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    var categoryY = drawWrapped(
      ctx,
      data.category || 'Solicitação à Unidade de Saúde',
      62,
      450,
      950,
      57,
      3
    );

    var panelY = categoryY + 35;
    ctx.fillStyle = 'rgba(255,255,255,.97)';
    rounded(ctx, 48, panelY, 984, 1040, 38);
    ctx.fill();

    var cursor = panelY + 78;

    function block(label, value, maxLines) {
      ctx.fillStyle = '#0d5f8a';
      ctx.font = '900 27px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label.toUpperCase(), 88, cursor);
      cursor += 44;
      ctx.fillStyle = '#102b3c';
      ctx.font = '800 42px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      cursor =
        drawWrapped(ctx, value || 'Não informado', 88, cursor, 900, 50, maxLines) +
        34;
    }

    block('Nome completo', data.name, 3);
    block('Nascimento e idade', data.birth + ' • ' + data.age, 2);
    block('CPF ou CNS', data.document, 2);
    block('Onde mora', data.locality, 4);
    block('Descrição', data.description, 7);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('TACS responsável: ' + TACS_NAME, 62, 1770);
    ctx.fillStyle = '#d8e7ee';
    ctx.font = '700 28px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Unidade de Saúde Posto Matias • ' + data.sentAt, 62, 1820);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Não foi possível gerar o card.'));
          return;
        }
        resolve(blob);
      }, 'image/png', 1);
    });
  }

  function shareCard() {
    var data = requestData();
    var originalSend = id('send');

    if (!originalSend || originalSend.disabled) {
      alert('Preencha os dados obrigatórios antes de gerar o card.');
      return;
    }

    var button = id('sendCardTacs');
    if (button) button.disabled = true;

    createCard(data)
      .then(function (blob) {
        var file = new File([blob], 'solicitacao-portal-tacs.png', {
          type: 'image/png'
        });

        if (
          navigator.share &&
          (!navigator.canShare || navigator.canShare({ files: [file] }))
        ) {
          return navigator.share({
            title: 'Solicitação do morador',
            text:
              'Solicitação da área TACS de ' +
              TACS_NAME +
              ' — Unidade de Saúde Posto Matias.',
            files: [file]
          });
        }

        var url = URL.createObjectURL(blob);
        var opened = window.open(url, '_blank');
        if (!opened) window.location.href = url;
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 120000);
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        alert(error.message || 'Não foi possível compartilhar o card.');
      })
      .finally(function () {
        if (button) button.disabled = false;
      });
  }

  function installCardButton() {
    var send = id('send');
    if (!send || id('sendCardTacs')) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'tacs-send-options';
    send.parentNode.insertBefore(wrapper, send);
    wrapper.appendChild(send);

    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'sendCardTacs';
    button.className = 'tacs-card-button';
    button.innerHTML =
      'Enviar solicitação em card pelo WhatsApp' +
      '<small>Card com identificação do TACS responsável e da área.</small>';
    button.disabled = send.disabled;
    button.addEventListener('click', shareCard);
    wrapper.appendChild(button);

    var observer = new MutationObserver(function () {
      button.disabled = send.disabled;
    });
    observer.observe(send, { attributes: true, attributeFilter: ['disabled'] });
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function installNotifications() {
    if (id('notificationOffer')) return;
    var sendOptions = document.querySelector('.tacs-send-options');
    var send = id('send');
    var anchor = sendOptions || send;
    if (!anchor || !anchor.parentNode) return;

    var box = document.createElement('section');
    box.id = 'notificationOffer';
    box.className = 'notification-offer';
    box.innerHTML =
      '<h3>🔔 Receber recados e avisos da Unidade</h3>' +
      '<p>Ative para ser avisado sempre que um recado, campanha ou alteração de agenda for publicado ou republicado no Portal TACS.</p>' +
      '<p class="notification-status" id="notificationStatus">Verificando este aparelho...</p>' +
      '<button type="button" id="notificationButton">Configurar recebimento de avisos</button>' +
      '<button type="button" id="notificationRepairButton" class="notification-repair" hidden>🔧 Reparar recebimento de avisos</button>' +
      '<p class="notification-help" id="notificationHelp"></p>';

    anchor.insertAdjacentElement('afterend', box);

    var button = id('notificationButton');
    var repairButton = id('notificationRepairButton');
    var status = id('notificationStatus');
    var help = id('notificationHelp');

    if (isIos() && !isStandalone()) {
      status.textContent =
        'No iPhone, adicione primeiro o Portal TACS à Tela de Início.';
      help.textContent =
        'Safari → Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone e volte a este botão.';
      button.textContent = 'Ver instruções para iPhone';
      button.addEventListener('click', function () {
        help.textContent =
          'No Safari: toque no botão Compartilhar, escolha “Adicionar à Tela de Início”, confirme em Adicionar e abra o portal pelo novo ícone.';
      });
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: ONE_SIGNAL_APP_ID,
          safari_web_id: ONE_SIGNAL_SAFARI_ID,
          serviceWorkerPath:
            '/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js',
          serviceWorkerParam: {
            scope: '/atendimento-acs-farmaceutico/push/'
          },
          autoResubscribe: true,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: false
        });

        var repairInProgress = false;

        function areaAtualDaUnidade() {
          var area = '';
          try {
            if (window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function') {
              area = window.PortalTacsArea.id();
            }
          } catch (erroArea) {}
          if (!area) area = window.TACS_AREA_ID || '';
          if (!area) {
            var morador = window.TACS_MORADOR_ATUAL;
            area = morador && morador.areaId || '';
          }
          area = String(area || 'JAPARANDUBA')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
          return area || 'JAPARANDUBA';
        }

        function estadoInscricao() {
          var push = OneSignal.User && OneSignal.User.PushSubscription;
          return {
            permission: OneSignal.Notifications.permission === true,
            optedIn: Boolean(push && push.optedIn === true),
            subscriptionId: String(push && push.id || '')
          };
        }

        function inscricaoAtiva(estado) {
          var atual = estado || estadoInscricao();
          return Boolean(
            atual.permission &&
            atual.optedIn &&
            atual.subscriptionId
          );
        }

        function areaMarcadaDaUnidade(areaInformada) {
          var area = String(areaInformada || areaAtualDaUnidade())
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '') || 'JAPARANDUBA';
          if (!OneSignal.User || typeof OneSignal.User.getTags !== 'function') {
            return false;
          }
          var tags = OneSignal.User.getTags() || {};
          return String(tags.area_tacs || '').toUpperCase() === area;
        }

        async function marcarAreaDaUnidade(areaInformada) {
          if (!inscricaoAtiva()) return false;
          var area = String(areaInformada || areaAtualDaUnidade())
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
          if (OneSignal.User && typeof OneSignal.User.addTag === 'function') {
            await OneSignal.User.addTag('area_tacs', area || 'JAPARANDUBA');
          }
          return areaMarcadaDaUnidade(area);
        }

        function mostrarEstado(estado, areaConfirmada) {
          var atual = estado || estadoInscricao();
          if (repairButton) {
            repairButton.hidden = true;
            repairButton.disabled = repairInProgress;
          }
          if (inscricaoAtiva(atual) && areaConfirmada === true) {
            status.textContent = 'Avisos ativados neste aparelho.';
            button.textContent = 'Avisos ativados';
            button.disabled = true;
            if (repairButton) {
              repairButton.hidden = false;
              repairButton.disabled = false;
            }
            help.textContent =
              'Inscrição ativa e vinculada à área deste morador. Se os avisos não estiverem chegando, use o botão Reparar recebimento de avisos.';
            return;
          }
          button.disabled = false;
          if (inscricaoAtiva(atual)) {
            status.textContent =
              'Os avisos estão autorizados, mas a área precisa ser vinculada.';
            button.textContent = 'Reparar vínculo da área';
            help.textContent =
              'Toque para concluir a migração deste aparelho e voltar a receber recados da sua área.';
            return;
          }
          if (atual.permission) {
            status.textContent =
              'A permissão existe, mas a inscrição de avisos precisa ser reparada.';
            button.textContent = 'Reparar recebimento de avisos';
            help.textContent =
              'Toque para registrar novamente este ícone do Portal TACS no serviço de notificações.';
            return;
          }
          status.textContent =
            'Toque no botão para autorizar os avisos neste aparelho.';
          button.textContent = 'Ativar avisos neste aparelho';
          help.textContent =
            'O aparelho mostrará a janela oficial de permissão.';
        }

        function aguardarInscricao(limiteMs) {
          return new Promise(function (resolve) {
            var push = OneSignal.User && OneSignal.User.PushSubscription;
            var encerrado = false;
            var intervalo = null;
            var limite = null;
            function limpar() {
              if (intervalo) clearInterval(intervalo);
              if (limite) clearTimeout(limite);
              if (push && typeof push.removeEventListener === 'function') {
                push.removeEventListener('change', conferir);
              }
            }
            function terminar(estado) {
              if (encerrado) return;
              encerrado = true;
              limpar();
              resolve(estado);
            }
            function conferir() {
              var atual = estadoInscricao();
              if (inscricaoAtiva(atual)) terminar(atual);
            }
            if (inscricaoAtiva()) {
              terminar(estadoInscricao());
              return;
            }
            if (push && typeof push.addEventListener === 'function') {
              push.addEventListener('change', conferir);
            }
            intervalo = setInterval(conferir, 250);
            limite = setTimeout(function () {
              terminar(estadoInscricao());
            }, limiteMs || 8000);
          });
        }

        function aguardarToken(limiteMs) {
          return new Promise(function (resolve) {
            var inicio = Date.now();
            function conferirToken() {
              var push = OneSignal.User && OneSignal.User.PushSubscription;
              var token = String(push && push.token || '');
              if (token || Date.now() - inicio >= (limiteMs || 8000)) {
                resolve(token);
                return;
              }
              setTimeout(conferirToken, 250);
            }
            conferirToken();
          });
        }


        function confirmarReparoPorPush(subscriptionId, areaId) {
          return new Promise(function (resolve, reject) {
            var sub = String(subscriptionId || '').trim().toLowerCase();
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sub)) {
              reject(new Error('A inscrição deste aparelho ainda não está pronta para confirmação.'));
              return;
            }
            var requestId = 'reparo_push_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            var frame = document.createElement('iframe');
            var form = document.createElement('form');
            var frameName = 'portalReparoPush' + Date.now() + Math.floor(Math.random() * 1000);
            var finished = false;
            var submitted = false;
            var pollTimer = null;
            var timeout = null;
            frame.name = frameName;
            frame.setAttribute('name', frameName);
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01;pointer-events:none';
            frame.src = 'about:blank';
            form.method = 'POST';
            form.action = API + '?_=' + Date.now();
            form.target = frameName;
            form.style.display = 'none';
            function add(name, value) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              input.value = value;
              form.appendChild(input);
            }
            function cleanup() {
              clearTimeout(pollTimer);
              clearTimeout(timeout);
              window.removeEventListener('message', onMessage);
              if (form.parentNode) form.remove();
              setTimeout(function () { if (frame.parentNode) frame.remove(); }, 100);
            }
            function finish(error, result) {
              if (finished) return;
              finished = true;
              cleanup();
              if (error) reject(error); else resolve(result);
            }
            function acceptResult(result) {
              if (!result || result.ok !== true || result.push !== true) {
                finish(new Error((result && result.message) || 'A notificação de confirmação não foi aceita.'));
                return;
              }
              finish(null, result);
            }
            function onMessage(event) {
              if (event.source !== frame.contentWindow) return;
              var data = event.data;
              if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (error) { return; }
              }
              if (!data || data.source !== 'notificacoes-area-tacs-v1' || data.requestId !== requestId) return;
              acceptResult(data.result);
            }
            function poll() {
              if (finished) return;
              var callback = '__portalReparoPush_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
              var script = document.createElement('script');
              var settled = false;
              var pollTimeout = setTimeout(function () { settle(null); }, 5000);
              function settle(data) {
                if (settled) return;
                settled = true;
                clearTimeout(pollTimeout);
                try { delete window[callback]; } catch (error) { window[callback] = undefined; }
                if (script.parentNode) script.remove();
                if (data && data.ok === true && data.pendente === false && data.result) {
                  acceptResult(data.result);
                  return;
                }
                if (!finished) pollTimer = setTimeout(poll, 1200);
              }
              window[callback] = settle;
              script.onerror = function () { settle(null); };
              script.src = API + (API.indexOf('?') === -1 ? '?' : '&') +
                'action=publico_notificacao_reparo_result&requestId=' + encodeURIComponent(requestId) +
                '&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
              document.head.appendChild(script);
            }
            function submitOnce() {
              if (submitted || finished) return;
              submitted = true;
              try { form.submit(); }
              catch (error) { finish(new Error('Não foi possível solicitar a confirmação do aparelho.')); return; }
              pollTimer = setTimeout(poll, 900);
            }
            add('action', 'publico_confirmar_reparo_notificacao');
            add('requestId', requestId);
            add('subscriptionId', sub);
            add('areaId', areaId || 'JAPARANDUBA');
            window.addEventListener('message', onMessage);
            document.body.appendChild(frame);
            document.body.appendChild(form);
            frame.addEventListener('load', submitOnce, { once: true });
            setTimeout(submitOnce, 160);
            timeout = setTimeout(function () { finish(new Error('A confirmação por notificação demorou demais.')); }, 25000);
          });
        }

        async function repararRecebimento() {
          if (repairInProgress) return;
          repairInProgress = true;
          button.disabled = true;
          if (repairButton) repairButton.disabled = true;
          status.textContent = 'Reparando o recebimento de avisos...';
          help.textContent = 'Aguarde enquanto este aparelho renova a inscrição e o vínculo da área.';
          try {
            if (!OneSignal.Notifications.permission) {
              await OneSignal.Notifications.requestPermission();
            }
            var push = OneSignal.User && OneSignal.User.PushSubscription;
            if (!OneSignal.Notifications.permission || !push) {
              throw new Error('Permissão de notificações não disponível.');
            }
            if (push.optedIn === true && typeof push.optOut === 'function') {
              await push.optOut();
            }
            if (typeof push.optIn !== 'function') {
              throw new Error('O navegador não permitiu renovar a inscrição.');
            }
            await push.optIn();
            var atual = await aguardarInscricao(12000);
            var token = await aguardarToken(8000);
            if (!inscricaoAtiva(atual) || !token) {
              throw new Error('A inscrição não ficou pronta para receber avisos.');
            }
            var areaConfirmada = await marcarAreaDaUnidade();
            if (!areaConfirmada) {
              throw new Error('A área do aparelho não pôde ser confirmada.');
            }
            var confirmacaoErro = '';
            try {
              await confirmarReparoPorPush(estadoInscricao().subscriptionId, areaAtualDaUnidade());
            } catch (erroConfirmacao) {
              confirmacaoErro = erroConfirmacao && erroConfirmacao.message
                ? erroConfirmacao.message
                : 'A confirmação por notificação não foi concluída.';
            }
            repairInProgress = false;
            mostrarEstado(estadoInscricao(), true);
            help.textContent = confirmacaoErro
              ? 'A inscrição foi renovada e a área foi vinculada, mas a notificação de confirmação não chegou a ser enviada agora. Tente o reparo novamente em alguns instantes.'
              : 'Reparo concluído. Enviamos uma notificação de confirmação somente para este aparelho. Se ela aparecer, o canal de avisos está funcionando.';
          } catch (error) {
            repairInProgress = false;
            status.textContent = 'Não foi possível concluir o reparo agora.';
            help.textContent =
              'Feche e abra novamente o Portal TACS e tente outra vez. Se o aviso continuar sem chegar, confira também a permissão de notificações do navegador ou do sistema.';
            button.disabled = false;
            if (repairButton) {
              repairButton.hidden = false;
              repairButton.disabled = false;
            }
          }
        }

        async function sincronizarEstado() {
          var atual = estadoInscricao();
          var areaConfirmada = false;
          if (inscricaoAtiva(atual)) {
            areaConfirmada = await marcarAreaDaUnidade();
            atual = estadoInscricao();
          }
          mostrarEstado(atual, areaConfirmada);
          return atual;
        }

        window.PortalTacsMarcarAreaNotificacao = marcarAreaDaUnidade;
        document.addEventListener('tacs:morador', function (event) {
          var morador = event && event.detail;
          if (!inscricaoAtiva() || !morador || !morador.areaId) return;
          marcarAreaDaUnidade(morador.areaId).catch(function () {});
        });

        var pushSubscription =
          OneSignal.User && OneSignal.User.PushSubscription;
        if (
          pushSubscription &&
          typeof pushSubscription.addEventListener === 'function'
        ) {
          pushSubscription.addEventListener('change', function () {
            if (repairInProgress) return;
            sincronizarEstado().catch(function () {
              mostrarEstado();
            });
          });
        }

        if (repairButton) {
          repairButton.addEventListener('click', repararRecebimento);
        }

        button.addEventListener('click', async function () {
          var estadoAntes = estadoInscricao();
          var deveConfirmarReparo = estadoAntes.permission || inscricaoAtiva(estadoAntes);
          button.disabled = true;
          status.textContent = 'Confirmando a inscrição deste aparelho...';
          try {
            if (!OneSignal.Notifications.permission) {
              await OneSignal.Notifications.requestPermission();
            }
            var push = OneSignal.User && OneSignal.User.PushSubscription;
            if (
              OneSignal.Notifications.permission &&
              push &&
              push.optedIn !== true &&
              typeof push.optIn === 'function'
            ) {
              await push.optIn();
            }
            var atual = await aguardarInscricao(8000);
            if (inscricaoAtiva(atual)) {
              var areaConfirmada = await marcarAreaDaUnidade();
              mostrarEstado(estadoInscricao(), areaConfirmada);
              if (deveConfirmarReparo && areaConfirmada) {
                try {
                  await confirmarReparoPorPush(estadoInscricao().subscriptionId, areaAtualDaUnidade());
                  help.textContent =
                    'Conexão restabelecida. Enviamos uma notificação de confirmação somente para este aparelho. Se ela aparecer, o canal de avisos está funcionando.';
                } catch (erroConfirmacao) {
                  help.textContent =
                    'O vínculo foi reparado, mas a notificação de confirmação não pôde ser enviada agora. Tente o reparo novamente em alguns instantes.';
                }
              }
            } else {
              mostrarEstado(atual, false);
            }
          } catch (error) {
            status.textContent = 'Não foi possível concluir a inscrição agora.';
            help.textContent =
              'Feche e abra novamente o ícone do Portal TACS e toque em reparar.';
            button.disabled = false;
          }
        });

        await sincronizarEstado();
      } catch (error) {
        status.textContent =
          'O serviço de avisos não conseguiu iniciar neste navegador.';
        help.textContent =
          'No iPhone, use o portal instalado na Tela de Início. No Android, use o Chrome.';
        button.disabled = false;
        if (repairButton) repairButton.hidden = true;
      }
    });

    if (!document.querySelector('script[data-onesignal-sdk]')) {
      var script = document.createElement('script');
      script.src =
        'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.dataset.onesignalSdk = '1';
      document.head.appendChild(script);
    }
  }

  function loadAutofill() {
    if (
      document.querySelector('script[data-moradores-autofill]') ||
      document.querySelector('script[src*="moradores-autofill.js"]')
    ) {
      return;
    }
    var script = document.createElement('script');
    script.src = 'moradores-autofill.js?v=20260731-60';
    script.dataset.moradoresAutofill = '1';
    document.head.appendChild(script);
  }

  function install() {
    addStyles();
    updateFooter();
    addCategoryOptions();
    normalizeFormText();
    installCardButton();
    installNotifications();
    loadAutofill();
    renderAgendas();
    if (!publicListenerInstalled) {
      publicListenerInstalled = true;
      window.addEventListener('portal-tacs-public-data', function (event) {
        applyPublicData(event && event.detail);
      });
    }
    syncPortal();
  }

  window.portalTacsSincronizar = syncPortal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
