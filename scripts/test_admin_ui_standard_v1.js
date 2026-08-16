'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const targets = [
  'central-administrativa-tacs.html',
  'painel-oficial-organizacoes-municipios.html',
  'painel-oficial-agendas-vagas.html',
  'painel-oficial-profissionais-servicos.html',
  'painel-oficial-recados-campanhas.html',
  'painel-oficial-tacs-areas.html',
  'teste-v1/painel-moradores-v2.html',
  'teste-v1/painel-tacs-areas-v1.html'
];

const source = read('admin-ui-standard.inline.css');
assert.match(source, /--tacs-petroleo:#073a55/i);
assert.match(source, /--tacs-raio-botao:22px/i);
assert.match(source, /button\[id\*="salvar"\]/i);
assert.match(source, /button\.danger/);
assert.match(source, /#portalTacsContrastToggleV1/);

for (const file of targets) {
  const html = read(file);
  assert.match(html, /PORTAL_TACS_ADMIN_UI_STANDARD_START/, `${file}: padrão visual não foi injetado`);
  assert.match(html, /id="portalTacsAdminUiStandardV1"/, `${file}: style visual oficial ausente`);
  assert.match(html, /--tacs-petroleo:#073a55/i, `${file}: azul-petróleo oficial ausente`);
  assert.match(html, /--tacs-raio-card:28px/i, `${file}: raio oficial ausente`);
}

// Contratos funcionais críticos permanecem por nome; padronização não pode substituí-los por classes visuais.
const centralJs = read('central-administrativa-tacs.js');
assert.match(centralJs, /btn\.dataset\.permission/);
assert.match(centralJs, /btn\.dataset\.module/);
assert.match(centralJs, /data-admin-only/);

const centralHtml = read('central-administrativa-tacs.html');
for (const moduleName of ['moradores','recados','agendas','profissionais','territorio','municipios','portal']) {
  assert.match(centralHtml, new RegExp(`data-module=["']${moduleName}["']`));
}

const territorio = read('teste-v1/painel-tacs-areas-v1.html');
assert.match(territorio, /id="tacsCns"/);
assert.match(territorio, /id="tacsPin"/);
assert.match(territorio, /id="areaSpreadsheet"/);

console.log('Admin UI Standard V1: OK — visual unificado e contratos funcionais preservados.');
