const fs=require('fs');
const assert=require('assert');

function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.html');
const nav=read('central-suporte-moradores-v1.js');
const panel=read('painel-suporte-moradores.html');
const backend=read('apps-script/ZZZZ_48_SuporteMoradoresV1.gs');
const builder=read('scripts/build_apps_script_release.js');

assert.strictEqual((central.match(/data-module="suporte"/g)||[]).length,1,'Central deve ter exatamente um módulo Suporte aos moradores');
assert(central.includes('<strong>Suporte aos moradores</strong>'),'Rótulo do módulo de suporte ausente');
assert(central.includes('central-suporte-moradores-v1.js'),'Central não carrega a navegação dedicada de suporte');
assert(nav.includes('painel-suporte-moradores.html'),'Navegação do suporte não aponta para a interface dedicada');
assert(!nav.includes('painel-oficial-agendas-vagas.html')&&!nav.includes('painel-oficial-profissionais-servicos.html'),'Suporte não pode ser incorporado a Agendas ou Profissionais');

assert(panel.includes('Vínculos protegidos'),'Interface deve explicar a preservação dos vínculos');
assert(panel.includes('admin_suporte_moradores_diagnostico'),'Interface não usa o diagnóstico dedicado');
assert(panel.includes('admin_notificacoes_solicitar_reparo_aparelho'),'Reparo individual seguro ausente');
assert(!panel.includes('admin_notificacoes_solicitar_reparo_area'),'Suporte dedicado não deve disparar reparo coletivo');
assert(!/removeItem\s*\(\s*DEVICE_KEY/.test(panel),'Interface não pode apagar a identidade local do aparelho');
assert(!/localStorage\.clear\s*\(/.test(panel),'Interface não pode limpar os vínculos locais');

assert(backend.includes('var TACS_SUPORTE_MORADORES_V1 = Object.freeze('),'Marcador do módulo Apps Script ausente');
assert(backend.includes("action!=='admin_suporte_moradores_diagnostico'"),'Roteamento POST do diagnóstico ausente');
assert(backend.includes("action!=='admin_suporte_moradores_result'"),'Roteamento de resultado do diagnóstico ausente');
assert(backend.includes("fonte:'REGISTRO_LOCAL_ONESIGNAL_DIRETO'"),'Diagnóstico deve registrar a fonte direta');
assert(backend.includes('vinculosPreservados:true'),'Contrato de preservação dos vínculos ausente');
assert(!backend.includes('saudeNotificacoesV1UpsertRegistro_('),'Diagnóstico não pode regravar o registro de aparelhos');
assert(!backend.includes('.appendRow('),'Módulo de diagnóstico deve ser somente leitura');
assert(!backend.includes('.setValues('),'Módulo de diagnóstico não pode reescrever vínculos');
assert(!/unsubscribe|delete_subscription|removeSubscription/i.test(backend),'Módulo não pode conter rotina de desligamento de inscrição');
assert(!backend.includes('saudeNotificacoesV1ExportarSubscriptions_('),'Diagnóstico cotidiano não deve depender da exportação CSV do OneSignal');
assert(backend.includes('saudeNotificacoesV1IdentidadePorSubscription_(')&&backend.includes('saudeNotificacoesV1ViewUser_('),'Conferência direta por inscrição não foi implementada');

assert(builder.includes("source: 'apps-script/ZZZZ_48_SuporteMoradoresV1.gs'"),'Builder do Apps Script não inclui o módulo de suporte');
assert(builder.includes("marker: 'TACS_SUPORTE_MORADORES_V1'"),'Builder não valida o marcador do suporte');

console.log('Suporte aos moradores V1: estrutura dedicada, diagnóstico direto e preservação de vínculos validados.');
