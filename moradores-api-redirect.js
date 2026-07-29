(function () {
  'use strict';

  var OLD_API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';
  var NEW_API = 'https://script.google.com/macros/s/AKfycbzWo5aKZDBdU6r7DLkIeoI_30U1J6anvfXCobG34vBB_Dh1cJDVbITgP1IvhIe6jlHs/exec';

  function rewrite(value) {
    var text = String(value == null ? '' : value);
    return text.indexOf(OLD_API) === 0 ? NEW_API + text.slice(OLD_API.length) : text;
  }

  function patchSrcProperty(constructor) {
    if (!constructor || !constructor.prototype) return;
    var descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, 'src');
    if (!descriptor || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') return;

    Object.defineProperty(constructor.prototype, 'src', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: function () {
        return descriptor.get.call(this);
      },
      set: function (value) {
        descriptor.set.call(this, rewrite(value));
      }
    });
  }

  patchSrcProperty(window.HTMLScriptElement);
  patchSrcProperty(window.HTMLIFrameElement);

  var originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var attribute = String(name || '').toLowerCase();
    if (attribute === 'src' && (this instanceof HTMLScriptElement || this instanceof HTMLIFrameElement)) {
      value = rewrite(value);
    }
    return originalSetAttribute.call(this, name, value);
  };

  window.TACS_MORADORES_API_URL = NEW_API;
}());
