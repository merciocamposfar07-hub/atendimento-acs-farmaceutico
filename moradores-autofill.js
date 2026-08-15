(function () {
  'use strict';

  var API = String(window.TACS_ADMIN_API_URL || 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();
  var timer = null;
  var requestId = 0;
  var activeFrame = null;
  var activeScript = null;
  var activeTimeout = null;
  var activeNonce = '';
  var activeCallback = '';
  var localityDisplay = null;
  var ageObserver = null;

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

  function setStatus(status, text, type) {
    status.textContent = text;
    status.className = 'help id-cns-note' + (type ? ' ' + type : '');
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
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = null;
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
    input.placeholder = 'CPF ou CNS';
    oldInput.parentNode.replaceChild(input, oldInput);

    var label = input.closest('label');
    if (label && label.firstChild) label.firstChild.textContent = 'CPF ou CNS ';
    setStatus(status, 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).', '');

    function complete(payload, token) {
      if (token !== requestId) return;
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
          setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
        } else {
          clearResidentFields();
          setStatus(status, 'O cadastro retornado está incompleto. Procure seu TACS.', 'invalid');
        }
      } else if (payload && payload.ok === true && payload.encontrado === false) {
        setStatus(status, 'Cadastro não encontrado. Confira o documento.', 'invalid');
      } else {
        setStatus(status, payload && payload.message ? payload.message : 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function failOrRetry(doc, token, attempt) {
      if (token !== requestId) return;
      cleanupTransport();

      if (attempt < 2) {
        setStatus(status, 'A consulta está demorando. Tentando novamente...', '');
        setTimeout(function () {
          if (token === requestId) startJsonp(doc, token, attempt + 1);
        }, 700);
      } else {
        setStatus(status, 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function startJsonp(doc, token, attempt) {
      if (token !== requestId) return;
      cleanupTransport();

      var callback = 'moradorTacs_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      activeCallback = callback;
      window[callback] = function (data) {
        complete(data, token);
      };

      var script = document.createElement('script');
      activeScript = script;
      script.async = true;
      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();
      script.onerror = function () {
        failOrRetry(doc, token, attempt);
      };

      activeTimeout = setTimeout(function () {
        failOrRetry(doc, token, attempt);
      }, 6500);

      document.head.appendChild(script);
    }

    function startBridge(doc, token) {
      if (token !== requestId) return;
      cleanupTransport();

      var nonce = 'morador-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Consulta de cadastro';
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

      activeNonce = nonce;
      activeFrame = frame;
      activeTimeout = setTimeout(function () {
        if (token !== requestId) return;
        cleanupTransport();
        setStatus(status, 'A consulta está demorando. Tentando novamente...', '');
        startJsonp(doc, token, 0);
      }, 6000);

      document.body.appendChild(frame);
    }

    window.addEventListener('message', function (event) {
      if (!activeFrame || event.source !== activeFrame.contentWindow) return;
      var message = event.data;
      if (!message || message.source !== 'portal-tacs-morador' || message.nonce !== activeNonce) return;
      complete(message.payload, requestId);
    });

    function lookup() {
      var doc = onlyDigits(input.value);
      if (!(validCpf(doc) || validCns(doc))) return;

      var token = ++requestId;
      cleanupTransport();
      clearResidentFields();
      setStatus(status, 'Buscando cadastro...', '');
      startBridge(doc, token);
    }

    function refresh() {
      var doc = onlyDigits(input.value);
      clearTimeout(timer);
      cleanupTransport();
      requestId++;

      if (validCpf(doc) || validCns(doc)) {
        clearResidentFields();
        setStatus(status, 'Documento completo. Buscando cadastro...', 'valid');
        timer = setTimeout(lookup, 350);
      } else if (doc.length) {
        clearResidentFields();
        setStatus(status, 'Digite um CPF válido ou os 15 números do CNS.', 'invalid');
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
