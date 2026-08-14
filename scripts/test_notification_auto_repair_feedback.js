const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const portal = fs.readFileSync(path.join(root, 'portal-notification-health.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'apps-script', 'ZZZZ_25_ReparoAutomaticoFeedbackV1.gs'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts', 'build_apps_script_release.js'), 'utf8');

assert.match(portal,/if\(!st\.permission\)[\s\S]*ACAO_MORADOR_NECESSARIA[\s\S]*return;/,
  'O reparo automático não pode tentar ultrapassar a permissão do navegador.');
assert.match(portal,/AUTO_INICIADO/);
assert.match(portal,/repair\.click\(\)/);
assert.match(portal,/AUTO_FALHOU/);
assert.match(portal,/event\.isTrusted!==true/,
  'O clique programático não pode ser confundido com ação manual do morador.');
assert.match(portal,/CONCLUIDO_AUTO/);
assert.match(portal,/CONCLUIDO_MANUAL/);
assert.match(portal,/O Portal tentará reparar automaticamente; se não conseguir, toque em Reparar agora/);

assert.match(backend,/VERSAO:'1\.0\.0'/);
assert.match(backend,/TACS_REPAROS_NOTIFICACOES_EVENTOS/);
assert.match(backend,/publico_notificacao_reparo_estado/);
assert.match(backend,/DETECTADO_NO_APARELHO/);
assert.match(backend,/CONFIRMACAO_PUSH_ENVIADA/);
assert.match(backend,/CONFIRMADA_NO_APARELHO/);
assert.match(backend,/ACEITA_SEM_CONFIRMACAO/,
  'Aceitação pelo serviço Push deve continuar distinta de confirmação física.');
assert.match(backend,/Ação do morador necessária/);
assert.match(backend,/Ativo • reparo concluído/);
assert.doesNotMatch(backend,/reparoFeedback=\{[^}]*subscriptionId/i,
  'O feedback entregue ao painel não deve expor Subscription ID completo.');
assert.match(build,/ZZZZ_25_ReparoAutomaticoFeedbackV1\.gs/);
assert.match(build,/TACS_REPARO_AUTO_FEEDBACK_V1/);

console.log('Reparo automático: tentativa silenciosa com permissão, fallback manual e feedback de conclusão/entrega validados.');
