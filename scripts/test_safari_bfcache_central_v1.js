'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('central-administrativa-tacs.html', 'utf8');
const central = fs.readFileSync('central-administrativa-tacs.js', 'utf8');
const navigation = fs.readFileSync('central-suporte-moradores-v1.js', 'utf8');
const quick = fs.readFileSync('central-tacs-login-rapido-v1.js', 'utf8');

assert.doesNotMatch(
  html,
  /central-admin-performance-v1\.js/,
  'A Central não deve reintroduzir o antigo preload oculto que travava o Safari/iPhone'
);

assert.match(
  central,
  /TAREFA_10_SHELL_PERSISTENTE_V1/,
  'Shell persistente da Tarefa 10 deve estar ativo'
);
assert.match(
  html,
  /cscTask10PersistentShellStyle[\s\S]*\.viewer\.csc-shell-viewer:not\(\[hidden\]\)\{display:flex!important/,
  'O shell de módulos precisa ser uma superfície visível no Safari, não iframe oculto'
);
assert.match(
  central,
  /function ensureShellFrame\(name,url,title\)/,
  'Cada módulo deve ser preservado no shell após o primeiro carregamento'
);
assert.match(
  central,
  /TAREFA_10_AGENDA_LAZY_VISIBLE_V1/,
  'Agenda deve iniciar somente depois de o shell estar visível'
);
const closeStart=central.indexOf('function closeViewer()');
const closeEnd=central.indexOf('function loadContext(',closeStart);
assert.ok(closeStart>=0&&closeEnd>closeStart,'closeViewer não localizado');
assert.doesNotMatch(
  central.slice(closeStart,closeEnd),
  /about:blank/,
  'Voltar à Central não deve descarregar o módulo e provocar reconstrução'
);
assert.doesNotMatch(
  central,
  /if\(name==='agendas'\)\{location\.assign/,
  'Agendas e Vagas deve permanecer dentro do shell, sem troca de página'
);

assert.match(
  navigation,
  /TAREFA_10_SHELL_PERSISTENTE_V1[\s\S]*ConectaCentralShellV1/,
  'A proteção Safari antiga deve reconhecer o shell canônico'
);
assert.match(
  navigation,
  /function installSafeNavigation\(\)[\s\S]*ConectaCentralShellV1[\s\S]*return;/,
  'O fallback location.assign não pode capturar cliques quando o shell existe'
);
assert.match(
  quick,
  /TAREFA_10_ROUTER_UNICO_V1[\s\S]*ConectaCentralShellV1/,
  'Login rápido não pode instalar roteador concorrente'
);

assert.match(
  central,
  /window\.addEventListener\('pageshow'/,
  'A Central deve restaurar o estado ao voltar pelo BFCache do Safari'
);
const pageStart=central.indexOf("window.addEventListener('pageshow'");
const pageEnd=central.indexOf('window.ConectaCentralModuleCoreV1',pageStart);
assert.ok(pageStart>=0&&pageEnd>pageStart,'bloco pageshow não localizado');
assert.doesNotMatch(
  central.slice(pageStart,pageEnd),
  /src='about:blank'|location\.reload/,
  'pageshow/BFCache não pode destruir módulos nem forçar reload da Central'
);
assert.doesNotMatch(
  central,
  /sessionStorage\.removeItem\(CONTEXT_CACHE_KEY\)/,
  'Logoff não deve apagar o cache de contexto necessário ao retorno rápido'
);

console.log('Safari/iPhone: shell persistente visível, BFCache e preservação de sessão/contexto validados.');
