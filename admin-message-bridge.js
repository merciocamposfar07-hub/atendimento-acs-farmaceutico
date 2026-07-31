(function () {
  'use strict';

  var originalAdd = window.addEventListener.bind(window);
  var originalRemove = window.removeEventListener.bind(window);
  var listenerMap = new WeakMap();

  window.addEventListener = function (type, listener, options) {
    if (type !== 'message' || typeof listener !== 'function') {
      return originalAdd(type, listener, options);
    }

    var wrapped = function (event) {
      var data = event && event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.source === 'portal-tacs-integral'
      ) {
        var normalized = {};
        Object.keys(data).forEach(function (key) {
          normalized[key] = data[key];
        });
        normalized.source = 'painel-tacs-integral';
        return listener.call(window, {
          data: normalized,
          source: event.source,
          origin: event.origin,
          lastEventId: event.lastEventId,
          ports: event.ports
        });
      }
      return listener.call(window, event);
    };

    listenerMap.set(listener, wrapped);
    return originalAdd(type, wrapped, options);
  };

  window.removeEventListener = function (type, listener, options) {
    return originalRemove(
      type,
      listenerMap.get(listener) || listener,
      options
    );
  };
}());
