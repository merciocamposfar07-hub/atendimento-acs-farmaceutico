(function () {
  'use strict';

  var API = String(window.TACS_ADMIN_API_URL || 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();
  var timer = null;
  var requestId = 0;
  var activeFrame = null;
  var activeScript = null;
  var activeBridgeTimeout = null;
  var activeJsonpTimeout = null;
  var adaptiveHedgeTimer = null;
  var activeNonce = '';
  var activeCallback = '';
  var completedRequestId = 0;
  var negativeRequestId = 0;
  var negativeProofs = {};
  var HEDGE_DELAY_MS = 1250;
  var BRIDGE_LIMIT_MS = 6500;
  var localityDisplay = null;
  var ageObserver = null;
  var familyMemory = '';
  var FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'; // FAMILIA_AUTOFILL_SEM_PUSH_V1
  var LEGACY_FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaConfirmadaV1:'; // FAMILIA_AUTOFILL_MIGRA_LEGADO_V1

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 15);
  }

  function normalizeArea(value) {
    var area = String(value == null ? '' : value).trim().toUpperCase();
    if (area.normalize) area = area.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return area.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  }

  function portalAreaId() {
    var fromUrl = '';
    try {
      var params = new URLSearchParams(window.location.search || '');
      fromUrl = normalizeArea(params.get('areaId') || params.get('area') || params.get('territorio'));
    } catch (e) {}
    if (fromUrl) return fromUrl;
    var current = '';
    try {
      current = window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function'
        ? window.PortalTacsArea.id()
        : window.TACS_AREA_ID;
    } catch (e) {}
    return normalizeArea(current) || 'JAPARANDUBA';
  }

  function familyStorageKey() {
    return FAMILY_STORAGE_PREFIX + portalAreaId();
  }

  function legacyFamilyStorageKey() {
    return LEGACY_FAMILY_STORAGE_PREFIX + portalAreaId();
  }

  function validFamilyCode(value) {
    return /^[0-9]{1,4}[A-Z]?$/.test(String(value || '').trim().toUpperCase());
  }

  function familyReference() {
    if (validFamilyCode(familyMemory)) return familyMemory;
    try {
      var current = String(localStorage.getItem(familyStorageKey()) || '').trim().toUpperCase();
      var legacy = String(localStorage.getItem(legacyFamilyStorageKey()) || '').trim().toUpperCase();
      familyMemory = validFamilyCode(current) ? current : (validFamilyCode(legacy) ? legacy : '');
      if (familyMemory && !current) localStorage.setItem(familyStorageKey(), familyMemory);
    } catch (e) {}
    return validFamilyCode(familyMemory) ? familyMemory : '';
  }

  function rememberFamilyReference(payload) {
    var current = familyReference();
    if (current) return current;
    var family = String(payload && payload.familiaId || '').trim().toUpperCase();
    if (!/^[0-9]{1,4}[A-Z]?$/.test(family)) return '';
    familyMemory = family;
    try { localStorage.setItem(familyStorageKey(), family); } catch (e) {}
    return family;
  }

  function clearFamilyNotice() {
    var notice = document.getElementById('familyAutofillNotice');
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
  }

  function applyFamilyContext(payload) {
    if (!payload || payload.familiaDiferente !== true) {
      clearFamilyNotice();
      rememberFamilyReference(payload);
      return;
    }
    var notice = document.getElementById('familyAutofillNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'familyAutofillNotice';
      notice.className = 'info amber full';
      notice.setAttribute('role', 'status');
      var status = document.getElementById('cpfStatus');
      var label = status && status.closest ? status.closest('label') : null;
      if (label && label.parentNode) label.parentNode.insertBefore(notice, label.nextSibling);
      else {
        var form = document.querySelector('.form-panel') || document.body;
        form.appendChild(notice);
      }
    }
    notice.textContent = payload.messageFamilia || 'Esta pessoa pertence a outro cadastro familiar desta mesma área. Você pode continuar a solicitação normalmente.';
  }

  function validCpf(value) {
    var d = onlyDigits(value);
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    var sum = 0;
    var i;
    for (i = 0; i < 9; i++) sum += Number(d.charAt(i)) * (10 - i);
    var first = (sum * 10) % 11;
    if (first === 10) first = 0;
    if (first !== Number(d.charAt(9))) return false;
    sum = 0;
    for (i = 0; i < 10; i++) sum += Number(d.charAt(i)) * (11 - i);
    var second = (sum * 10) % 11;
    if (second === 10) second = 0;
    return second === Number(d.charAt(10));
  }

  function validCns(value) {
    return /^\d{15}$/.test(onlyDigits(value));
  }

  function formatDocument(value) {
    var d = onlyDigits(value);
    if (d.length <= 11) {
      if (d.length > 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
      if (d.length > 6) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
      if (d.length > 3) return d.slice(0, 3) + '.' + d.slice(3);
      return d;
    }
    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 10) + '.' + d.slice(10, 15);
  }

  function normalizeBirth(value) {
    var text = String(value || '').trim();
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[3] + '/' + match[2] + '/' + match[1];
    match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? match[1] + '/' + match[2] + '/' + match[3] : text;
  }

  function normalizedKey(value) {
    var text = String(value || '').toLowerCase();
    if (text.normalize) text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.replace(/[^a-z0-9]/g, '');
  }

  function findDeepValue(source, aliases) {
    var wanted = aliases.map(normalizedKey);
    var queue = [source];
    var visited = [];
    while (queue.length) {
      var current = queue.shift();
      if (!current || typeof current !== 'object' || visited.indexOf(current) !== -1) continue;
      visited.push(current);
      var keys = Object.keys(current);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = current[key];
        var nk = normalizedKey(key);
        if (wanted.indexOf(nk) !== -1 && value !== undefined && value !== null && String(value).trim()) return String(value).trim();
        if (value && typeof value === 'object') queue.push(value);
      }
    }
    return '';
  }

  function parentNames(resident) {
    return {
      mother: findDeepValue(resident, ['nomeMae', 'nome_da_mae', 'nome da mãe', 'nome da mae', 'mae', 'mãe', 'maeNome', 'nomeDaMae', 'motherName']),
      father: findDeepValue(resident, ['nomePai', 'nome_do_pai', 'nome do pai', 'pai', 'paiNome', 'nomeDoPai', 'fatherName'])
    };
  }

  function ensureLoadingStatusStyle() {
    if (document.getElementById('tacsAutofillLoadingStyle')) return;
    var style = document.createElement('style');
    style.id = 'tacsAutofillLoadingStyle';
    style.textContent = [
      '@keyframes tacsAutofillLoadingPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(234,172,43,.15)}50%{transform:scale(1.012);box-shadow:0 0 0 6px rgba(234,172,43,.13)}}',
      '@keyframes tacsAutofillHourglassTurn{0%{transform:rotate(0deg) scale(1)}25%{transform:rotate(-12deg) scale(1.08)}50%{transform:rotate(180deg) scale(1.12)}75%{transform:rotate(192deg) scale(1.08)}100%{transform:rotate(360deg) scale(1)}}',
      '.help.id-cns-note.tacs-autofill-loading{display:grid!important;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:11px;margin-top:8px!important;padding:14px 16px!important;min-height:66px!important;border:2px solid #c88c08!important;border-radius:14px!important;background:#fff3d8!important;color:#082b43!important;-webkit-text-fill-color:#082b43!important;opacity:1!important;filter:none!important;text-shadow:none!important;font-size:16px!important;font-weight:900!important;line-height:1.38!important;white-space:pre-line!important;animation:tacsAutofillLoadingPulse 1.45s ease-in-out infinite;transform-origin:center}',
      '.help.id-cns-note.tacs-autofill-loading::before{content:"⏳";display:grid;place-items:center;width:38px;height:38px;color:#7a4a00!important;-webkit-text-fill-color:#7a4a00!important;opacity:1!important;font-size:27px;line-height:1;animation:tacsAutofillHourglassTurn 1.25s ease-in-out infinite;transform-origin:center}',
      '@media(prefers-reduced-motion:reduce){.help.id-cns-note.tacs-autofill-loading,.help.id-cns-note.tacs-autofill-loading::before{animation:none!important;transform:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setLoadingStatus(status) {
    ensureLoadingStatusStyle();
    status.textContent = 'Aguarde o carregamento automático dos seus dados.\nNão digite ainda.';
    status.className = 'help id-cns-note tacs-autofill-loading';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-busy', 'true');
  }

  function setStatus(status, text, type) {
    status.textContent = text;
    status.className = 'help id-cns-note' + (type ? ' ' + type : '');
    status.removeAttribute('role');
    status.removeAttribute('aria-live');
    status.removeAttribute('aria-busy');
  }

  function resizeLocality() {
    if (!localityDisplay) return;
    localityDisplay.style.height = 'auto';
    localityDisplay.style.height = Math.max(72, localityDisplay.scrollHeight) + 'px';
  }

  function setupLocalityField() {
    var original = document.getElementById('locality');
    if (!original || document.getElementById('localityDisplay')) return;
    localityDisplay = document.createElement('textarea');
    localityDisplay.id = 'localityDisplay';
    localityDisplay.rows = 2;
    localityDisplay.placeholder = original.placeholder || 'Ex.: Japaranduba';
    localityDisplay.autocomplete = original.autocomplete || 'street-address';
    localityDisplay.value = original.value || '';
    localityDisplay.style.minHeight = '72px';
    localityDisplay.style.resize = 'none';
    localityDisplay.style.overflow = 'hidden';
    original.style.display = 'none';
    original.setAttribute('aria-hidden', 'true');
    original.insertAdjacentElement('afterend', localityDisplay);
    localityDisplay.addEventListener('input', function () {
      original.value = localityDisplay.value;
      original.dispatchEvent(new Event('input', { bubbles: true }));
      original.dispatchEvent(new Event('change', { bubbles: true }));
      resizeLocality();
    });
    resizeLocality();
  }

  function dispatchField(field, value) {
    if (!field) return;
    field.value = value;
    if (field.id === 'locality' && localityDisplay) {
      localityDisplay.value = value;
      resizeLocality();
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function recifeParts() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (part) { out[part.type] = Number(part.value); });
    return { year: out.year, month: out.month, day: out.day };
  }

  function preciseAgeText(value) {
    var match = normalizeBirth(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    var birth = { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
    var today = recifeParts();
    var birthStamp = Date.UTC(birth.year, birth.month - 1, birth.day);
    var todayStamp = Date.UTC(today.year, today.month - 1, today.day);
    if (birthStamp > todayStamp) return '';
    var totalDays = Math.floor((todayStamp - birthStamp) / 86400000);
    var years = today.year - birth.year;
    if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) years--;
    var months = (today.year - birth.year) * 12 + today.month - birth.month;
    if (today.day < birth.day) months--;
    if (years >= 2) return years + (years === 1 ? ' ano' : ' anos');
    if (years === 1) {
      var remainingMonths = Math.max(0, months - 12);
      return remainingMonths ? '1 ano e ' + remainingMonths + (remainingMonths === 1 ? ' mês' : ' meses') : '1 ano';
    }
    if (months >= 1) {
      var monthStart = new Date(Date.UTC(birth.year, birth.month - 1 + months, birth.day));
      var days = Math.max(0, Math.floor((todayStamp - monthStart.getTime()) / 86400000));
      return months + (months === 1 ? ' mês' : ' meses') + (days ? ' e ' + days + (days === 1 ? ' dia' : ' dias') : '');
    }
    return totalDays + (totalDays === 1 ? ' dia' : ' dias');
  }

  function updatePreciseAge() {
    var field = document.getElementById('birth');
    var status = document.getElementById('ageStatus');
    if (!field || !status) return;
    var age = preciseAgeText(field.value);
    if (!age) return;
    var expected = 'Idade: ' + age;
    if (status.textContent !== expected) status.textContent = expected;
    status.className = 'help valid';
  }

  function protectPreciseAge() {
    var status = document.getElementById('ageStatus');
    var birth = document.getElementById('birth');
    if (!status || !birth || ageObserver) return;
    ageObserver = new MutationObserver(function () { window.requestAnimationFrame(updatePreciseAge); });
    ageObserver.observe(status, { childList: true, characterData: true, subtree: true });
    birth.addEventListener('input', function () { window.requestAnimationFrame(updatePreciseAge); });
    birth.addEventListener('change', function () { window.requestAnimationFrame(updatePreciseAge); });
  }

  function clearResidentFields() {
    dispatchField(document.getElementById('birth'), '');
    dispatchField(document.getElementById('name'), '');
    dispatchField(document.getElementById('locality'), '');
    dispatchField(document.getElementById('motherName'), '');
    dispatchField(document.getElementById('fatherName'), '');
    window.TACS_MORADOR_ATUAL = null;
    clearFamilyNotice();
  }

  function fillFields(payload) {
    var resident = payload && payload.morador;
    if (!resident || typeof resident !== 'object') return false;

    var values = {
      name: String(resident.nome || resident.nomeCompleto || '').trim(),
      birth: normalizeBirth(resident.nascimento || resident.dataNascimento || resident.data_nascimento || ''),
      locality: String(resident.localidade || resident.endereco || resident.endereço || resident.comunidade || '').trim()
    };

    if (!values.name || !values.birth || !values.locality) return false;
    Object.keys(values).forEach(function (id) {
      dispatchField(document.getElementById(id), values[id]);
    });

    var parents = parentNames(resident);
    if (parents.mother) dispatchField(document.getElementById('motherName'), parents.mother);
    if (parents.father) dispatchField(document.getElementById('fatherName'), parents.father);

    window.TACS_MORADOR_ATUAL = resident;
    try {
      document.dispatchEvent(new CustomEvent('tacs:morador', { detail: resident }));
    } catch (e) {}
    window.requestAnimationFrame(function () { updatePreciseAge(); resizeLocality(); });
    return true;
  }

  function cleanupTransport() {
    if (activeBridgeTimeout) clearTimeout(activeBridgeTimeout);
    if (activeJsonpTimeout) clearTimeout(activeJsonpTimeout);
    if (adaptiveHedgeTimer) clearTimeout(adaptiveHedgeTimer);
    activeBridgeTimeout = null;
    activeJsonpTimeout = null;
    adaptiveHedgeTimer = null;
    activeNonce = '';

    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }

    if (activeScript) {
      activeScript.onerror = null;
      if (activeScript.parentNode) activeScript.parentNode.removeChild(activeScript);
      activeScript = null;
    }

    if (activeCallback) {
      try { delete window[activeCallback]; } catch (e) { window[activeCallback] = undefined; }
      activeCallback = '';
    }
  }

  function finishBridgeOnly() {
    if (activeBridgeTimeout) clearTimeout(activeBridgeTimeout);
    activeBridgeTimeout = null;
    activeNonce = '';
    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }
  }

  function finishJsonpOnly() {
    if (activeJsonpTimeout) clearTimeout(activeJsonpTimeout);
    activeJsonpTimeout = null;
    if (activeScript) {
      activeScript.onerror = null;
      if (activeScript.parentNode) activeScript.parentNode.removeChild(activeScript);
      activeScript = null;
    }
    if (activeCallback) {
      try { delete window[activeCallback]; } catch (e) { window[activeCallback] = undefined; }
      activeCallback = '';
    }
  }

  function install() {
    setupLocalityField();
    protectPreciseAge();

    var oldInput = document.getElementById('cpf');
    var status = document.getElementById('cpfStatus');
    if (!oldInput || !status || oldInput.dataset.autofillIsolado === '4') return;

    var input = oldInput.cloneNode(true);
    input.dataset.autofillIsolado = '4';
    input.value = '';
    input.maxLength = 18;
    input.placeholder = 'CPF ou Cartão SUS (CNS)';
    oldInput.parentNode.replaceChild(input, oldInput);
    clearResidentFields();

    var label = input.closest('label');
    if (label && label.firstChild) label.firstChild.textContent = 'CPF ou Cartão SUS (CNS) ';
    setStatus(status, 'Digite seu CPF ou Cartão SUS (CNS). Seus dados serão carregados automaticamente para conferência.', '');

    function complete(payload, token, proofKey, jsonpAttempt) {
      if (token !== requestId || token === completedRequestId) return;

      if (payload && payload.ok === true && payload.encontrado === false) {
        if (negativeRequestId !== token) {
          negativeRequestId = token;
          negativeProofs = {};
        }
        var negativeKey = String(proofKey || ('proof-' + Date.now() + '-' + Math.random()));
        negativeProofs[negativeKey] = true;

        if (negativeKey.indexOf('bridge:') === 0) finishBridgeOnly();
        else if (negativeKey.indexOf('jsonp:') === 0) finishJsonpOnly();

        if (Object.keys(negativeProofs).length < 2) {
          setLoadingStatus(status);
          var retryDoc = onlyDigits(input.value);
          if (!activeFrame && !activeScript && (validCpf(retryDoc) || validCns(retryDoc))) {
            var nextAttempt = Math.min(2, Number(jsonpAttempt || 0) + 1);
            setTimeout(function () {
              if (token === requestId && token !== completedRequestId && !activeFrame && !activeScript) {
                startJsonp(retryDoc, token, nextAttempt, false);
              }
            }, 250);
          }
          return;
        }
      }

      completedRequestId = token;
      cleanupTransport();

      if (payload && payload.ok === true && payload.encontrado === true) {
        var expectedArea = portalAreaId();
        var returnedArea = normalizeArea(payload.morador && payload.morador.areaId);
        if (!returnedArea || returnedArea !== expectedArea) {
          clearResidentFields();
          setStatus(status, 'Este cadastro não pertence à área deste TACS.', 'invalid');
          return;
        }
        if (fillFields(payload)) {
          applyFamilyContext(payload);
          setStatus(status, (validCns(input.value) ? 'Cartão SUS encontrado ✓ ' : 'CPF encontrado ✓ ') + 'Dados carregados automaticamente. Confira nome, nascimento e localidade; se algo estiver errado, corrija antes de continuar.', 'valid');
        } else {
          clearResidentFields();
          setStatus(status, 'O cadastro retornado está incompleto. Procure seu TACS.', 'invalid');
        }
      } else if (payload && payload.ok === true && payload.encontrado === false) {
        setStatus(status, validCns(input.value) ? 'Cartão SUS não localizado nesta área. Confira os 15 números ou procure seu TACS.' : 'CPF não localizado nesta área. Tente informar o Cartão SUS (CNS).', 'invalid');
      } else {
        setStatus(status, payload && payload.message ? payload.message : 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function failOrRetry(doc, token, attempt) {
      if (token !== requestId || token === completedRequestId) return;
      finishJsonpOnly();

      if (attempt < 2) {
        setLoadingStatus(status);
        setTimeout(function () {
          if (token === requestId && token !== completedRequestId) startJsonp(doc, token, attempt + 1, Boolean(activeFrame));
        }, 700);
      } else {
        cleanupTransport();
        setStatus(status, 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function startJsonp(doc, token, attempt, keepBridge) {
      if (token !== requestId || token === completedRequestId) return;
      if (!keepBridge) cleanupTransport();
      else finishJsonpOnly();

      var callback = 'moradorTacs_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      activeCallback = callback;
      window[callback] = function (data) {
        complete(data, token, 'jsonp:' + callback, attempt);
      };

      var script = document.createElement('script');
      activeScript = script;
      script.async = true;
      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();
      script.onerror = function () {
        failOrRetry(doc, token, attempt);
      };

      activeJsonpTimeout = setTimeout(function () {
        failOrRetry(doc, token, attempt);
      }, 6500);

      document.head.appendChild(script);
    }

    function startBridge(doc, token) {
      if (token !== requestId || token === completedRequestId) return;
      cleanupTransport();

      var nonce = 'morador-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Consulta de cadastro';
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

      activeNonce = nonce;
      activeFrame = frame;

      adaptiveHedgeTimer = setTimeout(function () {
        if (token !== requestId || token === completedRequestId || !activeFrame || activeScript) return;
        setLoadingStatus(status);
        startJsonp(doc, token, 0, true);
      }, HEDGE_DELAY_MS);

      activeBridgeTimeout = setTimeout(function () {
        if (token !== requestId || token === completedRequestId) return;
        finishBridgeOnly();
        if (!activeScript) {
          setLoadingStatus(status);
          startJsonp(doc, token, 0, false);
        }
      }, BRIDGE_LIMIT_MS);

      document.body.appendChild(frame);
    }

    window.addEventListener('message', function (event) {
      if (!activeFrame || event.source !== activeFrame.contentWindow) return;
      var message = event.data;
      if (!message || message.source !== 'portal-tacs-morador' || message.nonce !== activeNonce) return;
      complete(message.payload, requestId, 'bridge:' + message.nonce, 0);
    });

    function lookup() {
      var doc = onlyDigits(input.value);
      if (!(validCpf(doc) || validCns(doc))) return;

      var token = ++requestId;
      completedRequestId = 0;
      negativeRequestId = token;
      negativeProofs = {};
      cleanupTransport();
      clearResidentFields();
      setLoadingStatus(status);
      startBridge(doc, token);
    }

    function refresh() {
      var doc = onlyDigits(input.value);
      clearTimeout(timer);
      cleanupTransport();
      requestId++;

      if (validCpf(doc) || validCns(doc)) {
        clearResidentFields();
        setLoadingStatus(status);
        timer = setTimeout(lookup, 350);
      } else if (/^\d{2,4}$/.test(doc)) {
        clearResidentFields();
        setStatus(status, 'Número de cadastro familiar informado. Toque em Buscar esta família abaixo.', '');
      } else if (doc.length) {
        clearResidentFields();
        setStatus(status, 'Digite um CPF válido ou os 15 números do Cartão SUS (CNS).', 'invalid');
      } else {
        clearResidentFields();
        setStatus(status, 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).', '');
      }
    }

    input.addEventListener('input', function () {
      input.value = formatDocument(input.value);
      refresh();
    });

    input.addEventListener('paste', function () {
      setTimeout(function () {
        input.value = formatDocument(input.value);
        refresh();
      }, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}());