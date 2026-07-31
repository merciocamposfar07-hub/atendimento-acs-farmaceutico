(function () {
  'use strict';

  var CATEGORY = 'Atendimento com a Enfermeira Chefe';
  var API = String(
    window.TACS_ADMIN_API_URL ||
      'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec'
  ).trim();
  var DEFAULT = [
    { day: 'Segunda-feira', service: 'Visita', icon: '🏠', available: true },
    { day: 'Terça-feira', service: 'Pré-natal', icon: '🤰', available: true },
    { day: 'Quarta-feira', service: 'Folga', icon: '❌', available: false },
    {
      day: 'Quinta-feira',
      service: 'Puericultura - acompanhamento de crianças e adolescentes',
      icon: '👶',
      available: true
    },
    { day: 'Sexta-feira', service: 'Preventivo', icon: '🌸', available: true }
  ];
  var schedule = DEFAULT.slice();

  function addStyles() {
    if (document.getElementById('nurse-agenda-style')) return;
    var style = document.createElement('style');
    style.id = 'nurse-agenda-style';
    style.textContent =
      '.nurse-agenda{padding:24px;border:2px solid #0D5F8A;border-radius:20px;background:#eef7fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.14)}' +
      '.nurse-agenda small{display:block;color:#078b45;font-size:16px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}' +
      '.nurse-agenda h3{margin:10px 0 8px;color:#102b3c;font-size:clamp(29px,5vw,40px);line-height:1.08}' +
      '.nurse-agenda>p{font-size:18px;line-height:1.45}' +
      '.nurse-days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}' +
      '.nurse-day{min-height:142px;padding:14px 12px;border:2px solid #9bb4c1;border-radius:15px;background:#fff;color:#102B3C;text-align:left}' +
      '.nurse-day strong,.nurse-day span,.nurse-day b{display:block}' +
      '.nurse-day strong{font-size:18px;line-height:1.2}' +
      '.nurse-day span{margin-top:7px;font-size:23px}' +
      '.nurse-day b{margin-top:6px;color:#06763A;font-size:17px;line-height:1.25}' +
      '.nurse-day.selected{border-color:#0d5f8a;background:#e1f1f8;box-shadow:0 0 0 3px rgba(13,95,138,.15)}' +
      '.nurse-day:disabled{opacity:.62;background:#e4eaed;cursor:not-allowed}' +
      '.nurse-status{margin:17px 0 0;padding-top:15px;border-top:1px solid #86a7b7;font-size:17px;font-weight:800;line-height:1.45}' +
      'footer.portal-footer-fixed{display:block!important;padding:22px 20px!important;text-align:center!important}' +
      'footer.portal-footer-fixed div{border:0!important;padding:0!important}' +
      'footer.portal-footer-fixed strong{display:block!important;font-size:17px!important}' +
      'footer.portal-footer-fixed .portal-location{margin-top:4px!important;font-size:15px!important}' +
      'footer.portal-footer-fixed .portal-rights{margin-top:17px!important;padding-top:15px!important;border-top:1px solid #7895a5!important;font-size:14px!important;font-weight:750!important}' +
      '.id-cns-note{font-size:16px!important}' +
      '@media(max-width:720px){.nurse-agenda{padding:18px 14px}.nurse-days{grid-template-columns:repeat(5,minmax(112px,1fr));overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:6px}.nurse-day{min-height:150px;scroll-snap-align:start}.nurse-agenda h3{font-size:30px}.nurse-agenda>p{font-size:17px}}';
    document.head.appendChild(style);
  }

  function updateFooter() {
    var footer = document.querySelector('footer');
    if (!footer) return;
    footer.className = 'portal-footer-fixed';
    footer.innerHTML =
      '<div><strong>Serviço TACS – Unidade de Saúde Posto Matias</strong>' +
      '<div class="portal-location">Sítio Japaranduba • Chã Grande/PE</div>' +
      '<div class="portal-rights">© 2026 Portal TACS. Todos os direitos reservados.</div></div>';
  }

  function loadSchedule(done) {
    var callback = 'tacsNurse' + Date.now();
    var script = document.createElement('script');
    var finished = false;
    var timer = setTimeout(function () {
      finish();
    }, 9000);

    function finish(data) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      delete window[callback];
      if (script.parentNode) script.remove();
      if (
        data &&
        data.ok !== false &&
        Array.isArray(data.dias) &&
        data.dias.length
      ) {
        schedule = data.dias;
      }
      done(data);
    }

    window[callback] = finish;
    script.onerror = function () {
      finish();
    };
    script.src =
      API +
      '?action=agenda_enfermeira&callback=' +
      encodeURIComponent(callback) +
      '&v=' +
      Date.now();
    document.head.appendChild(script);
  }

  function installNurseSchedule() {
    var category = document.getElementById('category');
    var dentalSchedule = document.getElementById('dentalSchedule');
    var subject = document.getElementById('subject');
    var subjectField = document.getElementById('subjectField');
    if (
      !category ||
      !dentalSchedule ||
      !subject ||
      !subjectField ||
      document.getElementById('nurseSchedule')
    ) {
      return;
    }

    if (
      !Array.prototype.some.call(category.options, function (option) {
        return option.value === CATEGORY;
      })
    ) {
      var option = document.createElement('option');
      option.value = CATEGORY;
      option.textContent = CATEGORY;
      var firstDental = Array.prototype.find.call(
        category.options,
        function (item) {
          return item.value.indexOf('odontológico') !== -1;
        }
      );
      category.insertBefore(option, firstDental || null);
    }

    var section = document.createElement('section');
    section.className = 'nurse-agenda full';
    section.id = 'nurseSchedule';
    section.innerHTML =
      '<small>Agenda da Enfermeira Chefe</small>' +
      '<h3>Escolha o atendimento</h3>' +
      '<p>Toque no dia correspondente ao atendimento que você precisa.</p>' +
      '<div class="nurse-days" id="nurseDays"></div>' +
      '<p class="nurse-status" id="nurseStatus">Carregando a programação vigente...</p>';
    dentalSchedule.parentNode.insertBefore(section, dentalSchedule.nextSibling);

    var list = document.getElementById('nurseDays');
    var status = document.getElementById('nurseStatus');

    function render() {
      list.innerHTML = '';
      schedule.forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'nurse-day';
        button.disabled = !item.available;
        button.innerHTML =
          '<strong>' +
          item.day +
          '</strong><span>' +
          (item.icon || '') +
          '</span><b>' +
          item.service +
          '</b>';
        button.onclick = function () {
          Array.prototype.forEach.call(
            list.querySelectorAll('.nurse-day'),
            function (otherButton) {
              otherButton.classList.remove('selected');
            }
          );
          button.classList.add('selected');
          category.value = CATEGORY;
          category.dispatchEvent(new Event('change', { bubbles: true }));
          subject.value =
            'Atendimento com a Enfermeira Chefe - ' +
            item.day +
            ': ' +
            item.service;
          subject.dispatchEvent(new Event('input', { bubbles: true }));
          subjectField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          status.textContent =
            'Selecionado: ' + item.day + ' - ' + item.service + '.';
        };
        list.appendChild(button);
      });
      status.textContent = 'Programação vigente da Unidade de Saúde.';
    }

    render();
    loadSchedule(function (data) {
      render();
      if (!data || data.ok === false) {
        status.textContent =
          'Programação padrão exibida. Não foi possível atualizar agora.';
      }
    });
  }

  function loadResidentsAutofill() {
    if (document.querySelector('script[data-moradores-autofill]')) return;
    var script = document.createElement('script');
    script.src = 'moradores-autofill.js?v=20260728-04';
    script.dataset.moradoresAutofill = '1';
    document.head.appendChild(script);
  }

  function install() {
    updateFooter();
    installNurseSchedule();
    loadResidentsAutofill();
  }

  addStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
