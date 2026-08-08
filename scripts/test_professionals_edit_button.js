'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'painel-oficial-profissionais-servicos.html'),
  'utf8'
);

assert.match(html, /class="botao secundario editarProf"/);
assert.match(html, /class="botao secundario editarServ"/);
assert.match(html, />Editar<\/button>/);
assert.match(html, /function toggleEditor\(button\)/);
assert.match(html, /aria-expanded="false"/);
assert.match(html, /id="abaNovo"[^>]*>Adicionar<\/button>/);
assert.match(html, /id="criarProfissional"[^>]*>Criar profissional, serviço e agenda<\/button>/);
assert.match(html, /admin_salvar_profissional/);
assert.match(html, /admin_salvar_servico/);
assert.match(html, /admin_criar_profissional/);
assert.doesNotMatch(html, /<details class="cartao" data-prof=/);

console.log('OK: painel de profissionais e serviços possui edição explícita e cadastro separado.');
