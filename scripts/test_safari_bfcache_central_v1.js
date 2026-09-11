'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const performance = fs.readFileSync('central-admin-performance-v1.js', 'utf8');
const scrollStability = fs.readFileSync('central-admin-scroll-stability-v1.js', 'utf8');

assert.ok(
  performance.includes("window.addEventListener('pageshow',beginPreload);"),
  'A Central deve reagir ao pageshow para restauração/BFCache do Safari'
);
assert.ok(
  performance.includes("pool.id='portalTacsAdminPreloadPoolV1';") &&
  performance.includes("viewer.insertBefore(pool,original)") &&
  performance.includes("host.appendChild(frame);"),
  'Os painéis devem ser criados uma vez em um host estável dentro do visualizador'
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

const showFrame = performance.match(/function showFrame\(name,title\)\{[\s\S]*?\n\}/)?.[0] || '';
const closeViewer = performance.match(/function closeViewerFast\(options\)\{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(showFrame, 'showFrame deve continuar presente');
assert.ok(closeViewer, 'closeViewerFast deve continuar presente');
assert.ok(
  !showFrame.includes('appendChild(frame)') && !showFrame.includes('appendChild(frames['),
  'Abrir ou trocar painel não pode reparentear iframe já carregado'
);
assert.ok(
  !closeViewer.includes('appendChild(frame)') && !closeViewer.includes('appendChild(frames['),
  'Voltar à Central não pode reparentear iframe já carregado'
);
assert.ok(
  showFrame.includes('frameHiddenStyle(frames[activeName])') && closeViewer.includes('frameHiddenStyle(frames[activeName])'),
  'Troca e retorno devem apenas ocultar o iframe, preservando seu documento interno'
);
assert.ok(
  !/function closeViewerFast[\s\S]*?src\s*=\s*['\"]about:blank['\"]/.test(performance),
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

assert.ok(
  scrollStability.includes("frame.style.setProperty('left','-200vw');") &&
  scrollStability.includes("frame.style.setProperty('visibility','hidden');") &&
  scrollStability.includes("frame.style.setProperty('pointer-events','none');"),
  'Iframe preservado e inativo deve ficar fisicamente fora do viewport e sem superfície de toque'
);
assert.ok(
  scrollStability.includes("frame.style.setProperty('position','relative');") &&
  scrollStability.includes("frame.style.setProperty('left','0');") &&
  scrollStability.includes("frame.style.setProperty('visibility','visible');") &&
  scrollStability.includes("frame.style.setProperty('pointer-events','auto');"),
  'Somente o iframe ativo deve ocupar a superfície visível e tocável'
);
assert.ok(
  scrollStability.includes("frame.style.setProperty('inset','auto');"),
  'A estabilização deve neutralizar o inset:0 herdado do empilhamento absoluto antes de reposicionar as camadas'
);
assert.ok(
  scrollStability.includes('HOTFIX_MORADORES_SAFARI_LAYER_V1'),
  'A proteção específica contra recorte de compositor no Safari/iPhone deve permanecer identificável'
);

console.log('Safari/iPhone: BFCache preservado e iframes inativos isolados da superfície de pintura/toque.');
