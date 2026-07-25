/*
 * Serviços externos gratuitos usados pelo portal.
 */
window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/AKfycbzB8HKs_sawD2X8K9O3hGjgCge3gao5S9FjajcqYxyO8e_0WTkrsoqjtBhC4kFhAFTl/exec';
window.POSTO_MATIAS_AVISOS_API_URL = 'https://script.google.com/macros/s/AKfycby-90dbbC-aMYEmSXxGUef6zshd1SNI85duivD18HJP6sFnkOmAZ9lYda2Cs7mZddpBcw/exec';

(function () {
  'use strict';

  var base = new URL('.', window.location.href);

  function addLink(rel, href, extra) {
    var link = document.createElement('link');
    link.rel = rel;
    link.href = new URL(href, base).href;
    if (extra) Object.keys(extra).forEach(function (key) { link.setAttribute(key, extra[key]); });
    document.head.appendChild(link);
  }

  function installDentalTheme() {
    if (document.getElementById('dental-theme-posto-matias')) return;
    var style = document.createElement('style');
    style.id = 'dental-theme-posto-matias';
    style.textContent = [
      '.dental{padding:24px!important;border:2px solid #0D5F8A!important;border-radius:20px!important;background:linear-gradient(145deg,#041F34 0%,#062C46 58%,#0A4265 100%)!important;color:#fff!important;box-shadow:0 18px 34px rgba(3,35,56,.22)!important}',
      '.dental-head span{color:#70E39F!important;font-size:14px!important;font-weight:950!important;letter-spacing:.075em!important;line-height:1.45!important}',
      '.dental-head h3{margin:10px 0 8px!important;color:#fff!important;font-size:clamp(30px,5vw,42px)!important;line-height:1.15!important;letter-spacing:-.025em!important}',
      '.dental-head p{margin:0 0 20px!important;color:#D8E7EE!important;font-size:18px!important;font-weight:650!important;line-height:1.55!important}',
      '.slots{gap:14px!important}',
      '.slot{min-height:132px!important;padding:18px 20px!important;border:2px solid #6E9DB5!important;border-radius:17px!important;background:#fff!important;color:#102B3C!important;box-shadow:0 8px 18px rgba(0,0,0,.12)!important}',
      '.slot:hover,.slot:focus-visible{border-color:#70E39F!important;box-shadow:0 0 0 4px rgba(112,227,159,.20),0 10px 22px rgba(0,0,0,.14)!important}',
      '.slot.selected{border-color:#16A85D!important;background:#ECF9F1!important;box-shadow:0 0 0 4px rgba(22,168,93,.22),0 10px 22px rgba(0,0,0,.14)!important}',
      '.slot strong{color:#102B3C!important;font-size:20px!important;line-height:1.3!important}',
      '.slot span{color:#425B69!important;font-size:17px!important}',
      '.slot b{color:#078940!important;font-size:17px!important;font-weight:950!important}',
      '.slot:disabled{opacity:.72!important;background:#EEF3F5!important;border-color:#A9BDC7!important;box-shadow:none!important}',
      '.slot:disabled strong,.slot:disabled span,.slot:disabled b{color:#718792!important}',
      '.dental-status{margin:20px 0 0!important;padding-top:18px!important;border-top:1px solid #4C829D!important;color:#fff!important;font-size:17px!important;font-weight:850!important;line-height:1.55!important}',
      '.dental-status.error{color:#FFD5D2!important}',
      '@media(max-width:720px){.dental{padding:21px 17px!important}.dental-head h3{font-size:32px!important}.dental-head p{font-size:17px!important}.slot{min-height:116px!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function installNoticeTheme() {
    if (document.getElementById('notice-theme-posto-matias')) return;
    var style = document.createElement('style');
    style.id = 'notice-theme-posto-matias';
    style.textContent = [
      '.notice-board{padding:clamp(21px,4vw,30px)!important;border:2px solid #0D5F8A!important;border-radius:22px!important;background:linear-gradient(145deg,#041F34 0%,#062C46 58%,#0A4265 100%)!important;color:#fff!important;box-shadow:0 18px 34px rgba(3,35,56,.22)!important}',
      '.notice-board h2{margin:0 0 7px!important;color:#fff!important;font-size:clamp(29px,5vw,42px)!important;line-height:1.13!important;letter-spacing:-.025em!important}',
      '.notice-updated{margin:0 0 20px!important;color:#D8E7EE!important;font-size:16px!important;font-weight:750!important;line-height:1.45!important}',
      '.notice-list{gap:15px!important}',
      '.notice-card{padding:20px 21px!important;border:2px solid #6E9DB5!important;border-left:8px solid #70E39F!important;border-radius:18px!important;background:#fff!important;color:#102B3C!important;box-shadow:0 9px 20px rgba(0,0,0,.14)!important}',
      '.notice-card.important{border-color:#D7A351!important;border-left-color:#F2A000!important;background:#FFF9ED!important}',
      '.notice-card.urgent{border-color:#D99C98!important;border-left-color:#C23B34!important;background:#FFF4F3!important}',
      '.notice-card small{margin-bottom:8px!important;color:#0D5F8A!important;font-size:13px!important;font-weight:950!important;letter-spacing:.09em!important}',
      '.notice-card.important small{color:#9A5600!important}',
      '.notice-card.urgent small{color:#A3302B!important}',
      '.notice-card strong{color:#102B3C!important;font-size:clamp(24px,4vw,32px)!important;line-height:1.23!important;letter-spacing:-.018em!important}',
      '.notice-card p{margin:12px 0 0!important;color:#314B59!important;font-size:clamp(18px,3.2vw,22px)!important;line-height:1.55!important;font-weight:520!important}',
      '@media(max-width:720px){.notice-board{padding:21px 16px!important}.notice-card{padding:18px 17px!important;border-radius:16px!important}.notice-card strong{font-size:27px!important}.notice-card p{font-size:19px!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  addLink('manifest', 'manifest.webmanifest');
  addLink('icon', 'icon-tacs.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', 'icon-tacs.svg');
  installDentalTheme();
  installNoticeTheme();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('service-worker.js', base).href, { scope: base.pathname })
        .catch(function (error) { console.warn('Modo offline não pôde ser ativado:', error); });
    });
  }

  function installOfflineBanner() {
    var style = document.createElement('style');
    style.textContent = '.offline-tacs{position:sticky;top:0;z-index:10000;padding:13px 16px;background:#a85b00;color:#fff;text-align:center;font:800 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.22)}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.className = 'offline-tacs';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.textContent = 'Sem internet: o portal pode ser preenchido, mas o envio pelo WhatsApp e as atualizações da agenda só funcionarão quando a conexão voltar.';
    document.body.insertBefore(banner, document.body.firstChild);

    function updateConnection() { banner.hidden = navigator.onLine; }
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    updateConnection();
  }

  function installFormPersistence() {
    var storageKey = 'tacs-posto-matias-formulario-v1';
    var fieldIds = ['category', 'implanonChoice', 'name', 'birth', 'cpf', 'locality', 'subject'];
    function fieldsReady() { return fieldIds.some(function (id) { return document.getElementById(id); }); }
    function save() {
      var data = {};
      fieldIds.forEach(function (id) { var field = document.getElementById(id); if (field) data[id] = field.value; });
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
    }
    function restore() {
      var raw;
      try { raw = localStorage.getItem(storageKey); } catch (e) { return; }
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        fieldIds.forEach(function (id) {
          var field = document.getElementById(id);
          if (field && typeof data[id] === 'string' && !field.value) {
            field.value = data[id];
            field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
          }
        });
      } catch (e) {}
    }
    function bind() {
      if (!fieldsReady()) return;
      restore();
      fieldIds.forEach(function (id) {
        var field = document.getElementById(id);
        if (!field) return;
        field.addEventListener('input', save);
        field.addEventListener('change', save);
      });
      var send = document.getElementById('send');
      if (send) send.addEventListener('click', save);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }

  function installReliableDentalWhatsApp() {
    var send = document.getElementById('send');
    if (!send || send.dataset.dentalFix === '2') return;
    send.dataset.dentalFix = '2';

    function text(id) {
      var field = document.getElementById(id);
      return field ? String(field.value || '').trim() : '';
    }
    function makeCode() {
      var now = new Date();
      var d = String(now.getDate()).padStart(2, '0');
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var y = String(now.getFullYear()).slice(-2);
      return 'TACS-' + d + m + y + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }
    function submitReservation(date, type, requestId) {
      if (!window.DENTAL_AGENDA_API_URL || !date) return;
      var iframe = document.createElement('iframe');
      iframe.name = 'reservaDentista' + Date.now();
      iframe.hidden = true;
      var form = document.createElement('form');
      form.method = 'post';
      form.action = window.DENTAL_AGENDA_API_URL;
      form.target = iframe.name;
      form.hidden = true;
      [['action','reservar'],['requestId',requestId],['date',date],['type',type]].forEach(function (pair) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = pair[0];
        input.value = pair[1];
        form.appendChild(input);
      });
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
      setTimeout(function () { if (form.parentNode) form.remove(); if (iframe.parentNode) iframe.remove(); }, 8000);
    }
    function openWhatsApp(message) {
      var encoded = encodeURIComponent(message);
      var webUrl = 'https://api.whatsapp.com/send?phone=5581989613130&text=' + encoded;
      var appUrl = 'whatsapp://send?phone=5581989613130&text=' + encoded;
      var link = document.createElement('a');
      link.href = appUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        if (link.parentNode) link.remove();
        if (document.visibilityState === 'visible') window.location.assign(webUrl);
      }, 1200);
    }

    send.addEventListener('click', function (event) {
      var category = text('category');
      var isDental = category === 'Solicitar atendimento odontológico (dentista)' || category === 'Solicitar atendimento odontológico de emergência (dentista)';
      if (!isDental) return;
      var selected = document.querySelector('.slot.selected');
      if (!selected) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!navigator.onLine) {
        alert('Sem internet. Os dados permanecem preenchidos e poderão ser enviados quando a conexão voltar.');
        return;
      }
      var parts = selected.querySelectorAll('strong, span');
      var day = parts[0] ? parts[0].textContent.trim() : '';
      var date = parts[1] ? parts[1].textContent.trim() : '';
      var isoDate = date.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
      var type = category.indexOf('emergência') >= 0 ? 'emergencial' : 'comum';
      var code = makeCode();
      var birth = text('birth');
      var ageStatus = document.getElementById('ageStatus');
      var age = ageStatus ? ageStatus.textContent.replace(/^Idade:\s*/i, '') : '';
      var subject = text('subject');
      submitReservation(isoDate, type, code);
      var message = '*SOLICITAÇÃO DE ATENDIMENTO DO TACS*\n\n' +
        'Código: ' + code + '\n' +
        'Data e horário do envio: ' + new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()) + '\n' +
        'Categoria: ' + category + '\n' +
        '*Dia escolhido: ' + day + ' — ' + date + '*\n' +
        'Tipo de vaga odontológica: ' + type + '\n' +
        'Reserva automática: solicitada\n' +
        'Nome completo: ' + text('name') + '\n' +
        'Data de nascimento: ' + birth + '\n' +
        'Idade: ' + age + '\n' +
        'CPF: ' + text('cpf') + '\n' +
        'Localidade: ' + text('locality') + '\n' +
        'Assunto: ' + subject + '\n\n' +
        'Este código é apenas uma referência para localizar a conversa.';
      openWhatsApp(message);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      installOfflineBanner();
      installFormPersistence();
      installReliableDentalWhatsApp();
    });
  } else {
    installOfflineBanner();
    installFormPersistence();
    installReliableDentalWhatsApp();
  }
}());