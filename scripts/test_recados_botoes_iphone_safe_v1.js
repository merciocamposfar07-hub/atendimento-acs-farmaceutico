'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const panel = fs.readFileSync('painel-oficial-recados-campanhas.html', 'utf8');
const device = fs.readFileSync('admin-aparelho-tacs-teste-v1.js', 'utf8');
const loader = fs.readFileSync('recados-campanhas-whatsapp-mensal-v12.js', 'utf8');

const start = panel.indexOf('function post(action,payload,cb,resultAction)');
const end = panel.indexOf('function sessao()', start);
assert.ok(start >= 0 && end > start, 'A função post do painel precisa existir.');
const post = panel.slice(start, end);

assert.doesNotMatch(post, /createElement\(['"]iframe['"]\)/,
  'As ações do painel não podem criar iframe oculto no iPhone.');
assert.doesNotMatch(post, /createElement\(['"]form['"]\)/,
  'As ações do painel não podem criar formulário oculto no iPhone.');
assert.doesNotMatch(post, /\.submit\(\)/,
  'As ações do painel não podem submeter formulário para o Apps Script.');
assert.match(post, /fetch\(API\+'\?_='/,
  'O POST deve ser iniciado por fetch isolado.');
assert.match(post, /mode:'no-cors'/,
  'O fetch para o Apps Script deve usar no-cors e o resultado deve vir pelo requestId.');
assert.match(post, /agendarConsulta\(\)/,
  'O resultado deve continuar sendo consultado pelo fluxo existente de requestId/JSONP.');

assert.match(panel,
  /html\{overflow-x:hidden!important;overflow-y:auto!important\}body\{overflow-x:hidden!important;overflow-y:visible!important\}/,
  'O html precisa permanecer como scroller e o body não pode virar uma segunda área de rolagem.');

assert.doesNotMatch(device, /atualizar\.click\(\)/,
  'Alterar modo TACS/teste não pode disparar automaticamente uma consulta pesada ao OneSignal.');
assert.match(device, /admin_notificacoes_aparelho_tacs_sanear_historico/,
  'O saneamento histórico deve permanecer disponível.');
assert.match(device, /mode:'no-cors'/,
  'As ações do aparelho TACS devem continuar usando transporte isolado.');

assert.match(loader,
  /admin-aparelho-tacs-teste-v1\.js\?v=20260827-recados-buttons-safe-v1/,
  'O carregador precisa furar o cache do módulo corrigido no iPhone.');
assert.match(panel,
  /recados-campanhas-whatsapp-mensal-v12\.js\?v=20260827-recados-buttons-safe-v1/,
  'O painel precisa furar o cache do carregador corrigido.');

console.log('RECADOS_BOTOES_IPHONE_SAFE_V1_OK');
