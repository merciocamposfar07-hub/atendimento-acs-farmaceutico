'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('central-administrativa-tacs.html', 'utf8');
const central = fs.readFileSync('central-administrativa-tacs.js', 'utf8');
const navigation = fs.readFileSync('central-suporte-moradores-v1.js', 'utf8');
const back = fs.readFileSync('central-back-button-v1.js', 'utf8');

assert.doesNotMatch(
  html,
  /central-admin-performance-v1\.js/,
  'A Central não deve reintroduzir o host antigo de iframes que travava o Safari/iPhone'
);

assert.match(
  navigation,
  /CENTRAL_IOS_PAINT_GUARD_V3/,
  'A navegação direta protegida para iPhone/Safari deve permanecer ativa'
);
assert.match(
  navigation,
  /location\.assign\(url\)/,
  'Os módulos da Central devem abrir por navegação direta'
);
assert.match(
  navigation,
  /if\(!hasAnySession\(\)\)return;/,
  'A navegação direta não pode interromper a criação da sessão remota após o PIN local'
);
assert.match(
  back,
  /PIN_UNICO_CENTRAL_V1/,
  'Painéis vindos da Central devem reutilizar a sessão autenticada'
);
assert.match(
  back,
  /#pin,label\[for="pin"\][\s\S]*#tacsPinPublicacoes/,
  'Os formulários legados de autenticação devem permanecer ocultos dentro dos painéis'
);
assert.match(
  navigation,
  /addEventListener\('click',[\s\S]*?\},true\)/,
  'A captura do toque deve impedir que o fluxo legado de iframe execute em paralelo'
);
assert.match(
  navigation,
  /#viewer,#portalTacsCentralRefreshV1,#portalTacsAdminPreloadPoolV1\{display:none!important\}/,
  'Visualizador e preload legados devem permanecer fora da superfície de pintura'
);
assert.match(
  navigation,
  /frame\.src='about:blank'/,
  'O iframe legado deve permanecer descarregado'
);

assert.match(
  central,
  /AGENDA_DIRECT_NAV_V1/,
  'Agendas e Vagas deve manter a correção de navegação direta'
);
assert.match(
  central,
  /if\(name==='agendas'\)\{location\.assign/,
  'Agendas e Vagas não pode voltar a abrir pelo iframe oculto'
);
assert.match(
  central,
  /window\.addEventListener\('pageshow'/,
  'A Central deve restaurar o estado ao voltar pelo BFCache do Safari'
);
assert.match(
  central,
  /frame&&frame\.src!=='about:blank'\)frame\.src='about:blank'/,
  'O retorno pelo BFCache deve manter o iframe legado descarregado'
);
assert.doesNotMatch(
  central,
  /window\.addEventListener\('pageshow'[\s\S]{0,500}location\.reload/,
  'pageshow/BFCache não pode forçar reload da Central'
);
assert.doesNotMatch(
  central,
  /sessionStorage\.removeItem\(CONTEXT_CACHE_KEY\)/,
  'Logoff não deve apagar o cache de contexto necessário ao retorno rápido'
);

console.log('Safari/iPhone: navegação direta, BFCache e preservação de cache validados.');
