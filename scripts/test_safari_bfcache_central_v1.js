'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const performance = fs.readFileSync('central-admin-performance-v1.js', 'utf8');

assert.ok(
  performance.includes("window.addEventListener('pageshow',beginPreload);"),
  'A Central deve reagir ao pageshow para restauração/BFCache do Safari'
);
assert.ok(
  performance.includes("ensurePool().appendChild(frames[activeName])"),
  'Ao voltar, o painel administrativo carregado deve ser preservado no pool'
);
assert.ok(
  performance.includes('var frame=frames[name];') &&
  performance.includes('if(frame&&frame.dataset.tacsKey===sessionKey()&&frame.parentNode)return frame;'),
  'ensureFrame deve reutilizar a instância da mesma sessão enquanto ela permanecer conectada'
);
assert.ok(
  performance.includes('if(frame&&frame.parentNode)frame.remove();') && performance.includes('delete frames[name];'),
  'Iframe só pode ser descartado quando deixa de pertencer à sessão atual'
);
assert.ok(
  !/function closeViewer[\s\S]*?src\s*=\s*['\"]about:blank['\"]/.test(performance),
  'Voltar à Central não pode descarregar o iframe preservado'
);
assert.ok(
  !/window\.addEventListener\('pageshow'[\s\S]{0,220}location\.reload/.test(performance),
  'pageshow/BFCache não pode forçar reload da Central'
);
assert.ok(
  performance.includes("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();"),
  'Instalação inicial deve continuar idempotente e separada da restauração por pageshow'
);
assert.ok(
  performance.includes('function beginPreload()') && performance.includes('if(preloadStartedFor===currentKey)return;') && performance.includes('preloadStartedFor=currentKey;'),
  'pageshow deve reutilizar a rotina de preload protegida pela chave da sessão'
);

console.log('Safari/iPhone Bloco 13: pageshow, BFCache e reuso persistente de painel validados sem troca de arquitetura.');
