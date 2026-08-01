(function () {
  'use strict';

  var VERSION = '20260731-80';

  function install() {
    if (document.getElementById('portalAdminEntry')) return;

    var footer = document.querySelector('footer');
    var link = document.createElement('a');
    link.id = 'portalAdminEntry';
    link.href = 'modo-admin.html?v=' + VERSION;
    link.textContent = '🔒 Área do administrador';
    link.setAttribute('aria-label', 'Abrir modo administrador do Portal TACS');
    link.style.cssText = [
      'display:grid',
      'place-items:center',
      'width:calc(100% - 32px)',
      'max-width:720px',
      'min-height:62px',
      'margin:20px auto 10px',
      'padding:14px 18px',
      'border:1px solid rgba(255,255,255,.45)',
      'border-radius:16px',
      'background:rgba(255,255,255,.10)',
      'color:#fff',
      'text-decoration:none',
      'font-size:18px',
      'font-weight:950',
      'text-align:center'
    ].join(';');

    (footer || document.body).appendChild(link);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}());
