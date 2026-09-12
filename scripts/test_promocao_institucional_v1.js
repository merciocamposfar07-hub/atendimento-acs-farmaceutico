'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const manifest = JSON.parse(read('manifest.webmanifest'));
const guide = read('portal-orientacao-morador.js');
const update = read('portal-auto-update.js');
const centralQuick = read('central-tacs-login-rapido-v1.js');
const centralCore = read('central-administrativa-tacs.js');

// Identidade PWA única e estável do Conecta Saúde Comunitária.
assert.equal(manifest.id, '/atendimento-acs-farmaceutico/conecta-saude-comunitaria');
assert.equal(manifest.name, 'Conecta Saúde Comunitária');
assert.equal(manifest.short_name, 'Conecta Saúde');
assert.equal(manifest.start_url, '/atendimento-acs-farmaceutico/central-administrativa-tacs.html');
assert.equal(manifest.scope, '/atendimento-acs-farmaceutico/');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.length >= 1);
manifest.icons.forEach(icon => assert.match(icon.src, /conecta-saude-central-canonico-2026-09-09\.png/));

// O orientador do morador não pode reintroduzir ícones de outro painel.
assert.doesNotMatch(guide, /painel-moradores(?:-180)?\.(?:svg|png)/);
assert.match(guide, /portal-tacs-oficial\.svg/);
assert.match(guide, /portal-tacs-oficial-512\.png/);

// Responsividade semântica: a direção da seta depende da geometria real.
assert.match(guide, /function orientFlowArrowNow\(\)/);
assert.match(guide, /Math\.abs\(dx\) > Math\.abs\(dy\)/);
assert.match(guide, /direction = dx >= 0 \? 'right' : 'left'/);
assert.match(guide, /direction = dy >= 0 \? 'down' : 'up'/);
assert.match(guide, /window\.addEventListener\('resize', orientFlowArrow/);
assert.match(guide, /window\.addEventListener\('orientationchange'/);

// Portal aberto pela Central recebe retorno somente com sessão existente.
assert.match(update, /function cameFromCentral\(\)/);
assert.match(update, /function hasCentralSession\(\)/);
assert.match(update, /if\(!document\.body\|\|isAdminPage\(\)\|\|!cameFromCentral\(\)\|\|!hasCentralSession\(\)\)return/);
assert.match(update, /portalTacsVoltarCentralV1/);
assert.match(update, /central-administrativa-tacs\.html\?retorno=portal/);
assert.doesNotMatch(update, /[?&](?:token|territorioToken)=/);

// Central única: perfil é sessão, não URL de segurança; atalho TACS continua opcional.
assert.match(centralQuick, /function hasAdminSession\(\)/);
assert.match(centralQuick, /function hasTerritorySession\(\)/);
assert.match(centralQuick, /return !adminDeviceRecognized\(\)&&\(queryTacsOnly\(\)\|\|hasTerritorySession\(\)\)/);
assert.match(centralQuick, /function stableModuleUrl\(name\)/);
assert.match(centralQuick, /from=central/);
assert.match(centralQuick, /grid\.addEventListener\('click',[\s\S]*?,true\)/);
assert.match(centralQuick, /event\.stopImmediatePropagation\(\)/);
assert.doesNotMatch(centralQuick, /_cb='?\+?Date\.now/);

// Sessão reutilizada nos painéis, sem botão flutuante cobrindo ações internas.
assert.match(centralQuick, /function hideRedundantPanelLogin\(doc\)/);
assert.match(centralQuick, /tacsSessionReused/);
assert.match(centralQuick, /function removePanelRefresh\(doc\)/);
assert.doesNotMatch(centralQuick, /function installPanelRefresh\(doc\)/);
assert.match(centralCore, /#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1\{display:none!important\}/);
assert.match(update, /function isEmbeddedAdminPage\(\)/);
assert.match(centralQuick, /portalTacsCentralRefreshV1/);
assert.match(centralQuick, /event\.isTrusted/);
assert.match(centralQuick, /Há alterações que podem não ter sido salvas/);

// A Tarefa 10 substitui o cache-busting destrutivo por shell persistente.
assert.match(centralCore, /TAREFA_10_SHELL_PERSISTENTE_V1/);
assert.doesNotMatch(centralCore, /_cb='?\+?Date\.now\(\)/);
assert.match(centralQuick, /TAREFA_10_ROUTER_UNICO_V1/);
assert.match(centralQuick, /grid\.addEventListener\('click'/);

console.log('PROMOCAO_INSTITUCIONAL_V1_OK');
