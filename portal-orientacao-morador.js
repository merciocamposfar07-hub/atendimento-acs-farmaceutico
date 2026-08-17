(function () {
  'use strict';

  if (window.PortalTacsOrientacaoMoradorV1) return;

  var residentReady = false;
  var residentDocument = '';
  var sendIntent = false;
  var sendArrowShownForService = '';
  var selectionConfirmed = false;
  var flowArrow = null;
  var alertObserver = null;
  var formObserver = null;
  var initialized = false;

  function el(id) { return (typeof document !== 'undefined' && document && typeof document.getElementById === 'function') ? document.getElementById(id) : null; }
  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function clean(value) { return String(value == null ? '' : value).trim(); }

  function ensureHeadLink(rel, href, attrs) {
    var selector = 'link[rel="' + rel + '"][data-portal-tacs-public-icon="1"]';
    var link = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      link.dataset.portalTacsPublicIcon = '1';
      document.head.appendChild(link);
    }
    link.href = href;
    Object.keys(attrs || {}).forEach(function (key) { link.setAttribute(key, attrs[key]); });
  }

  function ensurePublicIcon() {
    var base = '/atendimento-acs-farmaceutico/icons/';
    ensureHeadLink('icon', base + 'painel-moradores.svg', { type: 'image/svg+xml' });
    ensureHeadLink('apple-touch-icon', base + 'painel-moradores-180.png', { sizes: '180x180' });
    var meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(meta);
    }
    meta.content = 'Portal TACS';
  }

  function addStyle() {
    if (document.getElementById('portal-guide-style-v2')) return;
    var old = document.getElementById('portal-guide-style-v1');
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = 'portal-guide-style-v2';
    style.textContent = [
      '.portal-flow-arrow{display:flex;align-items:center;gap:10px;width:100%;max-width:100%;min-width:0;margin:0 0 12px;padding:10px 14px;border:2px solid #70e39f;border-radius:20px;background:#073a55;color:#fff;font-size:15px;font-weight:950;line-height:1.3;box-shadow:0 9px 22px rgba(3,42,64,.20);overflow:hidden}',
      '.portal-flow-arrow>span:last-child{min-width:0;overflow-wrap:anywhere;word-break:normal}',
      '.portal-flow-arrow .portal-arrow-symbol{display:inline-block;flex:0 0 auto;color:#7af0a8;font-size:25px;line-height:1;animation:portalArrowBlink 1.1s ease-in-out infinite}',
      '.portal-alert-guide{display:inline-flex;align-items:center;gap:8px;max-width:100%;margin:0 0 10px;padding:7px 11px;border:2px solid #70e39f;border-radius:999px;background:#073a55;color:#fff;font-size:14px;font-weight:950;line-height:1.2}',
      '.portal-alert-guide .portal-arrow-symbol{display:inline-block;flex:0 0 auto;color:#7af0a8;font-size:21px;animation:portalArrowBlink 1.1s ease-in-out infinite}',
      '@keyframes portalArrowBlink{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(5px)}}',
      '@media(prefers-reduced-motion:reduce){.portal-flow-arrow .portal-arrow-symbol,.portal-alert-guide .portal-arrow-symbol{animation:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function dispatchValue(field, value) {
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function removeFlowArrow() {
    if (flowArrow && flowArrow.parentNode) flowArrow.parentNode.removeChild(flowArrow);
    flowArrow = null;
    Array.prototype.forEach.call(document.querySelectorAll('.portal-flow-arrow'), function (node) { node.remove(); });
  }

  function clearForm() {
    residentReady = false;
    residentDocument = '';
    sendIntent = false;
    sendArrowShownForService = '';
    selectionConfirmed = false;
    removeFlowArrow();

    ['birth', 'name', 'locality', 'motherName', 'fatherName', 'subject', 'implanonChoice'].forEach(function (id) {
      dispatchValue(el(id), '');
    });

    var localityDisplay = el('localityDisplay');
    if (localityDisplay) localityDisplay.value = '';

    var cpf = el('cpf');
    if (cpf) {
      cpf.value = '';
      cpf.autocomplete = 'off';
    }

    var category = el('category');
    if (category) {
      category.value = '';
      category.dispatchEvent(new Event('change', { bubbles: true }));
    }

    Array.prototype.forEach.call(document.querySelectorAll('.slot.selected,.sheet-dental-choice.selected,.integral-day.selected,[aria-checked="true"]'), function (node) {
      node.classList.remove('selected');
      if (node.hasAttribute('aria-checked')) node.setAttribute('aria-checked', 'false');
    });

    window.TACS_MORADOR_ATUAL = null;
    var status = el('cpfStatus');
    if (status) {
      status.textContent = 'Digite seu CPF ou Cartão SUS (CNS). Seus dados serão carregados automaticamente para conferência.';
      status.className = 'help id-cns-note';
    }

    setTimeout(updateFlowGuide, 0);
  }

  function makeArrow(text) {
    var node = document.createElement('div');
    node.className = 'portal-flow-arrow';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.innerHTML = '<span class="portal-arrow-symbol" aria-hidden="true">↓</span><span></span>';
    node.lastChild.textContent = text;
    return node;
  }

  function placeArrow(target, text, key) {
    if (!target || !target.parentNode) return;
    if (flowArrow && flowArrow.dataset.guideKey === key) return;
    removeFlowArrow();
    flowArrow = makeArrow(text);
    flowArrow.dataset.guideKey = key;
    target.parentNode.insertBefore(flowArrow, target);
  }

  function cpfTarget() {
    var cpf = el('cpf');
    return cpf && (cpf.closest('label') || cpf);
  }

  function categoryTarget() {
    var category = el('category');
    return category && (category.closest('label') || category);
  }

  function visibleChoiceExists() {
    var nodes = document.querySelectorAll('.slot,.sheet-dental-choice,.integral-day');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.hidden || node.disabled) continue;
      if (node.getClientRects && node.getClientRects().length === 0) continue;
      var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (!style || (style.display !== 'none' && style.visibility !== 'hidden')) return true;
    }
    return false;
  }

  function slowScrollTo(target, duration, done) {
    if (!target) { if (done) done(); return; }
    var startY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var rect = target.getBoundingClientRect();
    var targetY = Math.max(0, startY + rect.top - Math.max(70, (window.innerHeight - rect.height) * 0.42));
    var distance = targetY - startY;
    if (Math.abs(distance) < 8) { if (done) done(); return; }
    var started = null;
    var total = Math.max(850, Number(duration) || 1100);
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function frame(now) {
      if (started === null) started = now;
      var progress = Math.min(1, (now - started) / total);
      window.scrollTo(0, startY + distance * ease(progress));
      if (progress < 1) window.requestAnimationFrame(frame);
      else if (done) done();
    }
    window.requestAnimationFrame(frame);
  }

  function revealSendAfterChoice() {
    removeFlowArrow();
    setTimeout(function () {
      var send = el('sendPetroleumCard') || el('send');
      if (!send || send.hidden || (window.getComputedStyle && window.getComputedStyle(send).display === 'none')) { updateFlowGuide(); return; }
      slowScrollTo(send, 1150, function () {
        setTimeout(updateFlowGuide, 80);
      });
    }, 220);
  }

  function updateFlowGuide() {
    if (!initialized) return;
    var category = el('category');
    var send = el('sendPetroleumCard') || el('send');

    if (!residentReady) {
      placeArrow(cpfTarget(), 'Comece aqui: digite seu CPF ou Cartão SUS.', 'document');
      return;
    }

    if (!category || !clean(category.value)) {
      placeArrow(categoryTarget(), 'Agora toque abaixo e escolha o serviço necessário.', 'service');
      return;
    }

    if (visibleChoiceExists() && !selectionConfirmed) {
      removeFlowArrow();
      return;
    }

    if (send && !send.hidden && !send.disabled) {
      var serviceKey = clean(category.value);
      sendArrowShownForService = serviceKey;
      placeArrow(send, 'Tudo pronto. Toque abaixo para enviar sua solicitação ao TACS.', 'send:' + serviceKey);
      return;
    }

    removeFlowArrow();
  }

  function decorateAlerts() {
    var area = el('integralPublicArea');
    if (!area) return;
    Array.prototype.forEach.call(area.querySelectorAll('.integral-balloon'), function (card) {
      if (card.querySelector('.portal-alert-guide')) return;
      var guide = document.createElement('div');
      guide.className = 'portal-alert-guide';
      var isCampaign = card.classList.contains('integral-campaign');
      guide.innerHTML = '<span class="portal-arrow-symbol" aria-hidden="true">↓</span><span></span>';
      guide.lastChild.textContent = isCampaign ? 'Veja a campanha ativa' : 'Veja o recado ativo';
      card.insertBefore(guide, card.firstChild);
    });
  }

  function installObservers() {
    if (!alertObserver) {
      alertObserver = new MutationObserver(function () { decorateAlerts(); });
      alertObserver.observe(document.body, { childList: true, subtree: true });
    }
    var send = el('sendPetroleumCard') || el('send');
    if (send && !formObserver) {
      formObserver = new MutationObserver(function () { updateFlowGuide(); });
      formObserver.observe(send, { attributes: true, attributeFilter: ['disabled', 'hidden', 'style', 'class'] });
    }
  }

  function installEvents() {
    document.addEventListener('tacs:morador', function () {
      residentReady = true;
      residentDocument = digits(el('cpf') && el('cpf').value);
      sendArrowShownForService = '';
      selectionConfirmed = false;
      setTimeout(updateFlowGuide, 0);
    });

    var cpf = el('cpf');
    if (cpf) {
      cpf.addEventListener('input', function () {
        if (residentReady && digits(cpf.value) !== residentDocument) {
          residentReady = false;
          residentDocument = '';
          sendArrowShownForService = '';
          selectionConfirmed = false;
        }
        setTimeout(updateFlowGuide, 0);
      });
    }

    var category = el('category');
    if (category) {
      category.addEventListener('change', function () {
        sendArrowShownForService = '';
        selectionConfirmed = false;
        removeFlowArrow();
        setTimeout(updateFlowGuide, 60);
      });
    }

    ['birth', 'name', 'locality', 'localityDisplay', 'subject', 'implanonChoice'].forEach(function (id) {
      var field = el(id);
      if (field) field.addEventListener('input', function () { setTimeout(updateFlowGuide, 20); });
    });

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('.slot,.sheet-dental-choice,.integral-day,#send,#sendPetroleumCard') : null;
      if (!target) return;
      if (target.id === 'send' || target.id === 'sendPetroleumCard') {
        if (!target.disabled && !target.hidden) sendIntent = true;
        return;
      }
      if (target.disabled) return;
      selectionConfirmed = true;
      sendArrowShownForService = '';
      revealSendAfterChoice();
    });

    window.addEventListener('pagehide', function () {
      if (!sendIntent) return;
      try { sessionStorage.setItem('portalTacsResetAfterSendV1', '1'); } catch (e) {}
      clearForm();
    });

    window.addEventListener('pageshow', function () {
      var reset = false;
      try {
        reset = sessionStorage.getItem('portalTacsResetAfterSendV1') === '1';
        if (reset) sessionStorage.removeItem('portalTacsResetAfterSendV1');
      } catch (e) {}
      if (reset) clearForm();
      else setTimeout(updateFlowGuide, 0);
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    ensurePublicIcon();
    addStyle();

    ['cpf', 'birth', 'name', 'locality', 'category', 'subject', 'implanonChoice'].forEach(function (id) {
      var field = el(id);
      if (field) field.autocomplete = 'off';
    });

    clearForm();
    installEvents();
    installObservers();
    decorateAlerts();
    updateFlowGuide();
  }

  window.PortalTacsOrientacaoMoradorV1 = Object.freeze({
    reset: clearForm,
    refreshGuide: updateFlowGuide
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
