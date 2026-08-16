'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const adminEntries = [
  'central-administrativa-tacs.html',
  'teste-v1/painel-moradores-v2.html',
  'painel-oficial-recados-campanhas.html',
  'painel-oficial-agendas-vagas.html',
  'painel-oficial-profissionais-servicos.html',
  'painel-oficial-tacs-areas.html',
  'painel-oficial-organizacoes-municipios.html'
];

for (const file of adminEntries) {
  const html = read(file);
  assert(/viewport-fit=cover/i.test(html), `${file}: viewport móvel oficial ausente`);
  assert(/#073a55/i.test(html), `${file}: identidade azul-petróleo #073A55 ausente`);
}

const centralHtml = read('central-administrativa-tacs.html');
const centralJs = read('central-administrativa-tacs.js');

for (const moduleName of ['moradores','recados','agendas','profissionais','territorio','municipios','portal']) {
  assert(new RegExp(`data-module=["']${moduleName}["']`).test(centralHtml), `Central: módulo ${moduleName} ausente`);
}
assert(/data-module="municipios"[^>]*data-admin-only="true"/.test(centralHtml), 'Central: Municípios e organizações deve permanecer exclusivo do Administrador Geral');
assert(/function applyUiStandard\(doc\)/.test(centralJs), 'Central: aplicador do padrão visual ausente');
assert(/applyUiStandard\(document\)/.test(centralJs), 'Central: padrão visual não é aplicado à própria Central');
assert(/viewerFrame[^\n]*addEventListener\('load'/.test(centralJs), 'Central: painéis internos não recebem o padrão visual no carregamento');
assert(/#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste/.test(centralJs), 'Central: regra que oculta controles antigos ausente');
assert(!/doc\.createElement\('button'\);button\.id='portalTacsContrastToggleV1'/.test(centralJs), 'Central: botão de contraste não pode ser recriado');
assert(/btn\.green,.botao\.verde/.test(centralJs), 'Central: ações principais não recebem padrão azul-petróleo');
assert(/card summary>div/.test(centralJs), 'Central: proteção genérica contra overflow em cards ausente');
assert(/\.signal\{flex:0 0 auto!important/.test(centralJs), 'Central: selo de status não está protegido contra extravasamento');
assert(/max-width:100%;overflow-x:hidden/.test(centralJs), 'Central: proteção horizontal mobile ausente');

const multi = read('painel-oficial-organizacoes-municipios.html');
assert(/class="signal /.test(multi), 'Municípios: selos de status não encontrados');
assert(/SECRETARIA_CHA_GRANDE/.test(multi), 'Municípios: formulário estrutural inesperadamente alterado');

assert(!/<button id="portalTacsContrastToggleV1"/.test(multi), 'Municípios: botão de contraste deve estar removido');
console.log('UI contract V2: OK — azul-petróleo fixo, sem botões de contraste, módulos e overflow conferidos.');
