const fs = require('fs');
const assert = require('assert');

const backend = fs.readFileSync('apps-script/ZZZZ_49_SaneamentoHistoricoAparelhoTacsV1.gs','utf8');
const frontend = fs.readFileSync('admin-aparelho-tacs-teste-v1.js','utf8');
const build = fs.readFileSync('scripts/build_apps_script_release.js','utf8');

assert(backend.includes("var TACS_SANEAMENTO_HISTORICO_APARELHO_V1=Object.freeze"), 'módulo de saneamento ausente');
assert(backend.includes("HISTORY_SHEET:'TACS_APARELHO_TACS_HISTORICO_SUBS'"), 'histórico técnico ausente');
assert(backend.includes("AUDIT_SHEET:'TACS_APARELHO_TACS_SANEAMENTO_AUDITORIA'"), 'auditoria ausente');
assert(backend.includes("saudeNotificacoesV1IdentidadePorSubscription_"), 'identidade OneSignal não usada');
assert(backend.includes("saudeNotificacoesV1ViewUser_"), 'histórico do mesmo OneSignal user não consultado');
assert(backend.includes("saneamentoHistoricoAparelhoV1Texto_(row[3])!==one"), 'comparação exata de ONESIGNAL_ID ausente');
assert(backend.includes("aparelhoTacsTesteV1RemoverVinculoFamilia_"), 'remoção de vínculo familiar ausente');
assert(backend.includes("aparelhoTacsTesteV1LimparMoradorRegistro_"), 'limpeza do ID_PORTAL ausente');
assert(!backend.includes("registry.deleteRow"), 'registro técnico não pode ser apagado');
assert(!backend.includes("fonte.sheet.deleteRow"), 'cadastro do morador não pode ser apagado');
assert(backend.includes("sem prova de mesmo ONESIGNAL_ID. Não alterado automaticamente"), 'casos sem prova devem ser preservados');
assert(backend.includes("admin_notificacoes_aparelho_tacs_sanear_historico"), 'ação administrativa ausente');

assert(frontend.includes('🧹 Sanear vínculos antigos deste aparelho'), 'botão de saneamento ausente');
assert(frontend.includes("enviar('admin_notificacoes_aparelho_tacs_sanear_historico','')"), 'frontend não chama ação de saneamento');
assert(frontend.includes('Nenhum cadastro de morador ou inscrição Push será apagado.'), 'confirmação de escopo ausente');
const saneamentoBlock = frontend.match(/function sanearHistorico\(\)\{[\s\S]*?\n  \}\n  function alternar/);
assert(saneamentoBlock, 'função de saneamento não localizada');
assert(!saneamentoBlock[0].includes("atualizar.click()"), 'saneamento não deve disparar atualização remota automática');

assert(build.includes("source: 'apps-script/ZZZZ_49_SaneamentoHistoricoAparelhoTacsV1.gs'"), 'módulo não incluído no build Apps Script');
assert(build.includes("marker: 'TACS_SANEAMENTO_HISTORICO_APARELHO_V1'"), 'marker do módulo não incluído no build');

console.log('test_saneamento_historico_aparelho_tacs_v1: OK');
