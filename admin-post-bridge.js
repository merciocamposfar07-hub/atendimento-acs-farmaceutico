(function () {
  'use strict';

  /*
   * O Apps Script responde ao POST com source="portal-tacs-integral".
   * O painel consolidado reconhece source="painel-tacs-integral".
   * A normalização acontece no evento original, preservando event.source
   * como o iframe real que enviou a resposta — necessário no Safari/iPhone.
   */
  window.addEventListener(
    'message',
    function (event) {
      var data = event && event.data;
      if (!data || typeof data !== 'object') return;
      if (data.source === 'portal-tacs-integral') {
        data.source = 'painel-tacs-integral';
      }
    },
    true
  );
}());
