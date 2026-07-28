(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var timer = null;
  var requestId = 0;
  var activeFrame = null;
  var activeScript = null;
  var activeTimeout = null;
  var activeNonce = '';
  var activeCallback = '';

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 15);
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

  function setStatus(status, text, type) {
    status.textContent = text;
    status.className = 'help id-cns-note' + (type ? ' ' + type : '');
  }

  function dispatchField(field, value) {
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearResidentFields() {
    dispatchField(document.getElementById('birth'), '');
    dispatchField(document.getElementById('name'), '');
    dispatchField(document.getElementById('locality'), '');
  }

  function fillFields(payload) {
    var resident = payload && payload.morador;
    if (!resident || typeof resident !== 'object') return false;

    var values = {
      name: String(resident.nome || '').trim(),
      birth: normalizeBirth(resident.nascimento || resident.dataNascimento || ''),
      locality: String(resident.localidade || resident.endereco || '').trim()
    };

    if (!values.name || !values.birth || !values.locality) return false;
    Object.keys(values).forEach(function (id) {
      dispatchField(document.getElementById(id), values[id]);
    });
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
    var oldInput = document.getElementById('cpf');
    var status = document.getElementById('cpfStatus');
    if (!oldInput || !status || oldInput.dataset.autofillIsolado === '3') return;

    var input = oldInput.cloneNode(true);
    input.dataset.autofillIsolado = '3';
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

      if (payload && payload.ok === true && payload.encontrado === true && fillFields(payload)) {
        setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
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
      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();
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
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

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