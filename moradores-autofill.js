(function () {
  'use strict';

  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var timer = null;
  var requestId = 0;
  var activeFrame = null;
  var activeTimeout = null;
  var activeNonce = '';

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
      var field = document.getElementById(id);
      if (!field) return;
      field.value = values[id];
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });

    return true;
  }

  function clearRequest() {
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = null;
    activeNonce = '';
    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }
  }

  function install() {
    var oldInput = document.getElementById('cpf');
    var status = document.getElementById('cpfStatus');
    if (!oldInput || !status || oldInput.dataset.autofillIsolado === '1') return;

    var input = oldInput.cloneNode(true);
    input.dataset.autofillIsolado = '1';
    input.value = '';
    input.maxLength = 18;
    input.placeholder = 'CPF ou CNS';
    oldInput.parentNode.replaceChild(input, oldInput);

    var label = input.closest('label');
    if (label && label.firstChild) label.firstChild.textContent = 'CPF ou CNS ';
    setStatus(status, 'Informe o CPF ou o Cartão Nacional de Saúde (CNS).', '');

    window.addEventListener('message', function (event) {
      if (!activeFrame || event.source !== activeFrame.contentWindow) return;

      var message = event.data;
      if (!message || message.source !== 'portal-tacs-morador' || message.nonce !== activeNonce) return;

      var current = requestId;
      var payload = message.payload;
      clearRequest();
      if (current !== requestId) return;

      if (payload && payload.ok === true && payload.encontrado === true && fillFields(payload)) {
        setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
      } else if (payload && payload.ok === true && payload.encontrado === false) {
        setStatus(status, 'Cadastro não encontrado. Confira o documento ou preencha os dados manualmente.', 'invalid');
      } else {
        setStatus(status, payload && payload.message ? payload.message : 'Não foi possível completar a consulta. Tente novamente.', 'invalid');
      }
    });

    function lookup() {
      var doc = onlyDigits(input.value);
      if (!(validCpf(doc) || validCns(doc))) return;

      requestId++;
      var current = requestId;
      clearRequest();
      setStatus(status, 'Buscando cadastro...', '');

      var nonce = 'morador-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Consulta de cadastro';
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

      activeNonce = nonce;
      activeFrame = frame;
      activeTimeout = setTimeout(function () {
        if (current !== requestId) return;
        clearRequest();
        setStatus(status, 'A consulta demorou mais que o esperado. Tente novamente.', 'invalid');
      }, 15000);

      document.body.appendChild(frame);
    }

    function refresh() {
      var doc = onlyDigits(input.value);
      clearTimeout(timer);
      clearRequest();
      requestId++;

      if (validCpf(doc) || validCns(doc)) {
        setStatus(status, 'Documento completo. Buscando cadastro...', 'valid');
        timer = setTimeout(lookup, 300);
      } else if (doc.length) {
        setStatus(status, 'Digite um CPF válido ou os 15 números do CNS.', 'invalid');
      } else {
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