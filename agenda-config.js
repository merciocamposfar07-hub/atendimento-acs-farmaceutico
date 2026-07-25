/*
 * Agenda odontológica.
 * O endereço abaixo é o /exec publicado pelo Google Apps Script.
 */
window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/AKfycbzB8HKs_sawD2X8K9O3hGjgCge3gao5S9FjajcqYxyO8e_0WTkrsoqjtBhC4kFhAFTl/exec';

/*
 * Mural de avisos do Serviço TACS.
 * Usa somente arquivos estáticos do GitHub Pages.
 */
(function () {
  'use strict';

  var CONFIG_FILE = 'avisos-config.js';
  var STORAGE_KEY = 'tacs-japaranduba-avisos-vistos';
  var ADMIN_EDIT_URL = 'https://github.com/merciocamposfar07-hub/atendimento-acs-farmaceutico/edit/main/avisos-config.js';
  var currentVersion = '';
  var refreshTimer = null;

  function adminMode() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('modo') === 'tacs';
    } catch (error) {
      return false;
    }
  }

  function addStyles() {
    if (document.getElementById('tacsNoticeStyles')) return;
    var style = document.createElement('style');
    style.id = 'tacsNoticeStyles';
    style.textContent = [
      '.tacs-notice-board{margin:0 0 24px;padding:19px;border:2px solid #b8d7e6;border-radius:20px;background:#f7fbfd;box-shadow:0 10px 28px rgba(42,102,138,.08)}',
      '.tacs-notice-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}',
      '.tacs-notice-kicker{display:block;color:#2a668a;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}',
      '.tacs-notice-head h2{margin:5px 0 3px;color:#15332d;font-size:21px;line-height:1.25}',
      '.tacs-notice-updated{margin:0;color:#657873;font-size:11px;line-height:1.45}',
      '.tacs-head-actions{display:grid;gap:8px;flex:0 0 auto}',
      '.tacs-refresh,.tacs-edit-link{min-height:38px;border:1px solid #a9cbdc;border-radius:12px;background:#fff;color:#2a668a;padding:8px 11px;font-size:12px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none}',
      '.tacs-edit-link{border-color:#86bfae;color:#087c68;background:#f3fbf8}',
      '.tacs-refresh:disabled{opacity:.55;cursor:wait}',
      '.tacs-admin-note{margin:0 0 13px;padding:11px 12px;border:1px dashed #9fc9bb;border-radius:12px;background:#f2faf7;color:#285d50;font-size:11px;line-height:1.45}',
      '.tacs-medical-card{display:grid;grid-template-columns:42px 1fr;gap:13px;padding:16px;border-radius:16px;background:#fff;border:1px solid #c9dee8}',
      '.tacs-medical-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#eaf4fa;color:#2a668a;font-size:21px}',
      '.tacs-status{display:inline-flex;margin-bottom:5px;padding:4px 8px;border-radius:999px;background:#eaf4fa;color:#2a668a;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}',
      '.tacs-status.alterado{background:#fff1d9;color:#8a5310}.tacs-status.cancelado{background:#fdebea;color:#9a332d}.tacs-status.confirmado{background:#e9f7f2;color:#087c68}',
      '.tacs-medical-card h3,.tacs-alert h3{margin:0 0 5px;color:#15332d;font-size:16px;line-height:1.3}',
      '.tacs-medical-date{display:block;color:#15332d;font-size:17px;font-weight:900;line-height:1.4}',
      '.tacs-medical-time{display:block;margin-top:2px;color:#2a668a;font-size:14px;font-weight:800}',
      '.tacs-medical-note,.tacs-alert p{margin:7px 0 0;color:#526963;font-size:13px;line-height:1.5}',
      '.tacs-alert-list{display:grid;gap:10px;margin-top:12px}',
      '.tacs-alert{position:relative;padding:14px 15px 14px 17px;border:1px solid #d7e5e1;border-left:5px solid #2a668a;border-radius:14px;background:#fff}',
      '.tacs-alert.importante{border-left-color:#b66c13;background:#fffaf2}.tacs-alert.urgente{border-left-color:#a13c35;background:#fff6f5}',
      '.tacs-alert-label{display:block;margin-bottom:4px;color:#657873;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.tacs-new-label{display:inline-flex;margin-left:7px;padding:3px 6px;border-radius:999px;background:#a13c35;color:#fff;font-size:8px;font-weight:900;vertical-align:middle}',
      '.tacs-notice-empty{margin:0;padding:14px;border:1px dashed #b9cfca;border-radius:14px;color:#657873;background:#fff;font-size:13px;line-height:1.5}',
      '.tacs-notice-foot{margin:12px 2px 0;color:#657873;font-size:10px;line-height:1.45}',
      '.tacs-home-badge{position:absolute;top:15px;right:15px;z-index:2;padding:6px 9px;border-radius:999px;background:#a13c35;color:#fff;font-size:10px;font-weight:900;box-shadow:0 6px 14px rgba(161,60,53,.24)}',
      '.tacs-toast{position:fixed;left:50%;bottom:max(22px,env(safe-area-inset-bottom));z-index:9999;width:min(calc(100% - 28px),520px);transform:translateX(-50%);padding:15px 17px;border-radius:15px;background:#15332d;color:#fff;box-shadow:0 18px 45px rgba(0,0,0,.24);font-size:14px;font-weight:800;line-height:1.45}',
      '@media(max-width:600px){.tacs-notice-board{padding:16px}.tacs-notice-head{display:block}.tacs-head-actions{margin-top:12px}.tacs-refresh,.tacs-edit-link{width:100%;display:block}.tacs-medical-card{grid-template-columns:38px 1fr}.tacs-medical-icon{width:38px;height:38px}.tacs-notice-head h2{font-size:20px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function safeText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function todayInRecife() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    for (var i = 0; i < parts.length; i++) values[parts[i].type] = parts[i].value;
    return values.year + '-' + values.month + '-' + values.day;
  }

  function activeNotices(config) {
    var items = Array.isArray(config.avisos) ? config.avisos : [];
    var today = todayInRecife();
    return items.filter(function (item) {
      if (!item || item.ativo === false) return false;
      return !item.validade || safeText(item.validade) >= today;
    });
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = safeText(text);
    return element;
  }

  function statusLabel(status) {
    var labels = {
      confirmado: 'Confirmado', alterado: 'Data alterada', cancelado: 'Cancelado', aguardando: 'Aguardando confirmação'
    };
    return labels[status] || 'Informação da unidade';
  }

  function renderMedical(container, medical) {
    if (!medical || medical.ativo === false) return;
    var status = safeText(medical.situacao || 'aguardando').toLowerCase();
    var card = createElement('article', 'tacs-medical-card');
    card.appendChild(createElement('span', 'tacs-medical-icon', '🩺'));
    var copy = createElement('div');
    copy.appendChild(createElement('span', 'tacs-status ' + status, statusLabel(status)));
    copy.appendChild(createElement('h3', '', medical.titulo || 'Atendimento médico'));
    if (medical.data) copy.appendChild(createElement('strong', 'tacs-medical-date', medical.data));
    if (medical.horario) copy.appendChild(createElement('span', 'tacs-medical-time', medical.horario));
    if (medical.observacao) copy.appendChild(createElement('p', 'tacs-medical-note', medical.observacao));
    card.appendChild(copy);
    container.appendChild(card);
  }

  function renderNoticeList(container, notices, isNewVersion) {
    if (!notices.length) {
      container.appendChild(createElement('p', 'tacs-notice-empty', 'Nenhum outro aviso está publicado no momento.'));
      return;
    }
    var list = createElement('div', 'tacs-alert-list');
    notices.forEach(function (notice) {
      var priority = safeText(notice.prioridade || 'informativo').toLowerCase();
      var article = createElement('article', 'tacs-alert ' + priority);
      var label = createElement('span', 'tacs-alert-label', priority === 'urgente' ? 'Aviso urgente' : priority === 'importante' ? 'Aviso importante' : 'Informação');
      if (isNewVersion) label.appendChild(createElement('span', 'tacs-new-label', 'NOVO'));
      article.appendChild(label);
      article.appendChild(createElement('h3', '', notice.titulo || 'Aviso'));
      if (notice.mensagem) article.appendChild(createElement('p', '', notice.mensagem));
      list.appendChild(article);
    });
    container.appendChild(list);
  }

  function showToast(message) {
    var old = document.getElementById('tacsNoticeToast');
    if (old) old.remove();
    var toast = createElement('div', 'tacs-toast', message);
    toast.id = 'tacsNoticeToast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    window.setTimeout(function () { if (toast.parentNode) toast.remove(); }, 5000);
  }

  function updateHomeBadge(isNew) {
    var card = document.getElementById('openAcs');
    if (!card) return;
    var badge = document.getElementById('tacsHomeBadge');
    if (isNew && !badge) {
      badge = createElement('span', 'tacs-home-badge', 'NOVO AVISO');
      badge.id = 'tacsHomeBadge';
      badge.setAttribute('aria-label', 'Há novo aviso do Serviço TACS');
      card.appendChild(badge);
    } else if (!isNew && badge) badge.remove();
  }

  function markCurrentAsSeen() {
    if (!currentVersion) return;
    try { localStorage.setItem(STORAGE_KEY, currentVersion); } catch (error) {}
    updateHomeBadge(false);
    var labels = document.querySelectorAll('#tacsNoticeBoard .tacs-new-label');
    for (var i = 0; i < labels.length; i++) labels[i].remove();
  }

  function render(config, announceChange) {
    if (!config || typeof config !== 'object') return false;
    var seenVersion = '';
    try { seenVersion = localStorage.getItem(STORAGE_KEY) || ''; } catch (error) {}
    var version = safeText(config.versao || config.atualizadoEm || '1');
    var isNew = Boolean(version && version !== seenVersion);
    var versionChangedWhileOpen = Boolean(currentVersion && currentVersion !== version);
    currentVersion = version;

    var board = document.getElementById('tacsNoticeBoard');
    if (!board) return versionChangedWhileOpen;
    board.innerHTML = '';

    var head = createElement('div', 'tacs-notice-head');
    var heading = createElement('div');
    heading.appendChild(createElement('span', 'tacs-notice-kicker', 'COMUNICADOS DA SUA ÁREA'));
    heading.appendChild(createElement('h2', '', 'Avisos da unidade de saúde'));
    heading.appendChild(createElement('p', 'tacs-notice-updated', 'Área: ' + safeText(config.area || 'Sítio Japaranduba') + (config.atualizadoEm ? ' • Atualizado em ' + safeText(config.atualizadoEm) : '')));
    head.appendChild(heading);

    var actions = createElement('div', 'tacs-head-actions');
    var refresh = createElement('button', 'tacs-refresh', '↻ Verificar novos avisos');
    refresh.type = 'button';
    refresh.addEventListener('click', function () { loadConfig(true, refresh); });
    actions.appendChild(refresh);

    if (adminMode()) {
      var edit = createElement('a', 'tacs-edit-link', '✎ Editar avisos (TACS)');
      edit.href = ADMIN_EDIT_URL;
      edit.target = '_blank';
      edit.rel = 'noopener noreferrer';
      actions.appendChild(edit);
    }

    head.appendChild(actions);
    board.appendChild(head);

    if (adminMode()) {
      board.appendChild(createElement('p', 'tacs-admin-note', 'Modo TACS: o botão Editar avisos abre o arquivo oficial no GitHub. Depois de salvar a alteração, volte ao portal e toque em Verificar novos avisos.'));
    }

    renderMedical(board, config.atendimentoMedico);
    renderNoticeList(board, activeNotices(config), isNew);
    board.appendChild(createElement('p', 'tacs-notice-foot', 'As informações são publicadas manualmente pelo TACS. Em caso de dúvida, envie sua solicitação pelo formulário abaixo.'));
    updateHomeBadge(isNew);

    if (announceChange && versionChangedWhileOpen) showToast('Nova atualização carregada nos avisos do Serviço TACS.');
    return versionChangedWhileOpen;
  }

  function loadConfig(announceChange, button) {
    if (button) button.disabled = true;
    var beforeVersion = currentVersion;
    var old = document.getElementById('tacsNoticesConfigScript');
    if (old) old.remove();
    var script = document.createElement('script');
    script.id = 'tacsNoticesConfigScript';
    script.src = CONFIG_FILE + '?v=' + Date.now();
    script.onload = function () {
      if (button) button.disabled = false;
      var changed = render(window.PORTAL_TACS_AVISOS || {}, announceChange);
      if (button && !changed && beforeVersion === currentVersion) {
        showToast('Avisos verificados. Nenhuma atualização nova.');
      }
    };
    script.onerror = function () {
      if (button) button.disabled = false;
      showToast('Não foi possível verificar os avisos agora. Tente novamente.');
    };
    document.head.appendChild(script);
  }

  function createBoard() {
    var schedule = document.getElementById('acsSchedule');
    if (!schedule || document.getElementById('tacsNoticeBoard')) return;
    var board = createElement('section', 'tacs-notice-board');
    board.id = 'tacsNoticeBoard';
    board.setAttribute('aria-live', 'polite');
    schedule.insertAdjacentElement('afterend', board);
  }

  function init() {
    addStyles();
    createBoard();
    loadConfig(false);

    var openAcs = document.getElementById('openAcs');
    if (openAcs) openAcs.addEventListener('click', function () {
      window.setTimeout(markCurrentAsSeen, 450);
      loadConfig(false);
    });

    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(function () {
      if (!document.hidden) loadConfig(true);
    }, 180000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());