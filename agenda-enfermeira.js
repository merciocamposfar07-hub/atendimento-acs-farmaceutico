(function () {
  'use strict';

  var CATEGORY = 'Atendimento com a Enfermeira Chefe';
  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var DEFAULT_SCHEDULE = [
    { day: 'Segunda-feira', service: 'Visita', icon: '🏠', available: true },
    { day: 'Terça-feira', service: 'Pré-natal', icon: '🤰', available: true },
    { day: 'Quarta-feira', service: 'Folga', icon: '❌', available: false },
    { day: 'Quinta-feira', service: 'Puericultura - acompanhamento de crianças e adolescentes', icon: '👶', available: true },
    { day: 'Sexta-feira', service: 'Preventivo', icon: '🌸', available: true }
  ];
  var schedule = DEFAULT_SCHEDULE.slice();

  function installStyle() {
    if (document.getElementById('nurse-agenda-style')) return;
    var style = document.createElement('style');
    style.id = 'nurse-agenda-style';
    style.textContent = [
      '.nurse-agenda{padding:24px;border:2px solid #0D5F8A;border-radius:20px;background:linear-gradient(145deg,#041F34 0%,#062C46 58%,#0A4265 100%);color:#fff;box-shadow:0 18px 34px rgba(3,35,56,.22)}',
      '.nurse-agenda small{display:block;color:#70E39F;font-size:14px;font-weight:950;letter-spacing:.075em;text-transform:uppercase}',
      '.nurse-agenda h3{margin:10px 0 8px;color:#fff;font-size:clamp(29px,5vw,40px);line-height:1.15}',
      '.nurse-agenda>p{margin:0 0 18px;color:#D8E7EE;font-size:17px;line-height:1.5}',
      '.nurse-days{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.nurse-day{min-height:112px;padding:15px;border:2px solid #6E9DB5;border-radius:16px;background:#fff;color:#102B3C;text-align:left;cursor:pointer}',
      '.nurse-day strong,.nurse-day span,.nurse-day b{display:block}',
      '.nurse-day strong{font-size:18px}.nurse-day span{margin-top:5px;font-size:22px}.nurse-day b{margin-top:6px;color:#06763A;font-size:16px;line-height:1.35}',
      '.nurse-day.selected{border-color:#16A85D;background:#ECF9F1;box-shadow:0 0 0 4px rgba(22,168,93,.22)}',
      '.nurse-day:disabled{cursor:not-allowed;opacity:.72;background:#EEF3F5}.nurse-day:disabled b{color:#718792}',
      '.nurse-status{margin:17px 0 0;padding-top:15px;border-top:1px solid #4C829D;color:#fff;font-size:16px;font-weight:800;line-height:1.5}',
      '@media(max-width:720px){.nurse-agenda{padding:21px 17px}.nurse-days{grid-template-columns:1fr}.nurse-day{min-height:100px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function loadRemote(onDone) {
    if (!API) { onDone(); return; }
    var callback = 'tacsNurseAgenda' + Date.now() + Math.floor(Math.random() * 9999);
    var script = document.createElement('script');
    var finished = false;
    var timer = setTimeout(function () { finish(); }, 9000);

    function finish(data) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      delete window[callback];
      if (script.parentNode) script.remove();
      if (data && data.ok !== false && Array.isArray(data.dias) && data.dias.length) schedule = data.dias;
      onDone(data);
    }

    window[callback] = finish;
    script.onerror = function () { finish(); };
    script.src = API + '?action=agenda_enfermeira&callback=' + encodeURIComponent(callback) + '&v=' + Date.now();
    document.head.appendChild(script);
  }

  function install() {
    var category = document.getElementById('category');
    var dental = document.getElementById('dentalSchedule');
    var subject = document.getElementById('subject');
    var subjectField = document.getElementById('subjectField');
    if (!category || !dental || !subject || !subjectField || document.getElementById('nurseSchedule')) return;

    var option = document.createElement('option');
    option.value = CATEGORY;
    option.textContent = CATEGORY;
    var firstDental = Array.prototype.find.call(category.options, function (item) {
      return item.value.indexOf('odontológico') !== -1;
    });
    category.insertBefore(option, firstDental || null);

    var section = document.createElement('section');
    section.className = 'nurse-agenda full';
    section.id = 'nurseSchedule';
    section.hidden = true;
    section.innerHTML = '<small>Agenda da Enfermeira Chefe - Unidade de Saúde Posto Matias</small><h3>Escolha o atendimento</h3><p>Toque no dia correspondente ao atendimento que você precisa.</p><div class="nurse-days" id="nurseDays"></div><p class="nurse-status" id="nurseStatus">Carregando a programação vigente...</p>';
    dental.parentNode.insertBefore(section, dental.nextSibling);

    var list = document.getElementById('nurseDays');
    var status = document.getElementById('nurseStatus');

    function render() {
      list.innerHTML = '';
      schedule.forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'nurse-day';
        button.disabled = !item.available;
        button.innerHTML = '<strong>' + item.day + '</strong><span aria-hidden="true">' + (item.icon || '') + '</span><b>' + item.service + '</b>';
        button.addEventListener('click', function () {
          Array.prototype.forEach.call(list.querySelectorAll('.nurse-day'), function (other) { other.classList.remove('selected'); });
          button.classList.add('selected');
          subject.value = 'Atendimento com a Enfermeira Chefe - ' + item.day + ': ' + item.service;
          subject.dispatchEvent(new Event('input', { bubbles: true }));
          status.textContent = 'Selecionado: ' + item.day + ' - ' + item.service + '.';
        });
        list.appendChild(button);
      });
      status.textContent = 'Programação vigente da Unidade de Saúde. Ela poderá ser alterada quando necessário.';
    }

    function update() {
      var active = category.value === CATEGORY;
      section.hidden = !active;
      if (active) {
        subjectField.firstChild.textContent = 'Motivo do atendimento ';
        subject.placeholder = 'Explique resumidamente o motivo do atendimento';
      } else {
        if (subject.value.indexOf('Atendimento com a Enfermeira Chefe - ') === 0) subject.value = '';
        subjectField.firstChild.textContent = 'Descrição da solicitação ';
        subject.placeholder = 'Descreva sua solicitação ou dúvida com detalhes';
        Array.prototype.forEach.call(list.querySelectorAll('.nurse-day'), function (button) { button.classList.remove('selected'); });
        status.textContent = 'Programação vigente da Unidade de Saúde. Ela poderá ser alterada quando necessário.';
      }
      subject.dispatchEvent(new Event('input', { bubbles: true }));
    }

    category.addEventListener('change', update);
    render();
    update();
    loadRemote(function (data) {
      render();
      update();
      if (!data || data.ok === false) status.textContent = 'Programação padrão exibida. Não foi possível atualizar a agenda agora.';
    });
  }

  installStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());