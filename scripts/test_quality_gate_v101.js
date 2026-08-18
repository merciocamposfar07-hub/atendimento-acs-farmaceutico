'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const categorias = {
  regressao: {nome: 'Regressão funcional', peso: 35, checks: []},
  dados: {nome: 'Integridade e segurança dos dados', peso: 25, checks: []},
  desempenho: {nome: 'Desempenho e agilidade', peso: 20, checks: []},
  resiliencia: {nome: 'Compatibilidade e resiliência', peso: 10, checks: []},
  usabilidade: {nome: 'Usabilidade e acessibilidade', peso: 10, checks: []}
};

function registrar(categoria, nome, aprovado) {
  categorias[categoria].checks.push({nome, aprovado: Boolean(aprovado)});
}
function contem(texto, trecho) { return texto.includes(trecho); }
function regex(texto, padrao) { return padrao.test(texto); }

const packageJson = JSON.parse(read('package.json'));
const comandoTestes = packageJson.scripts && packageJson.scripts.test || '';
const testesEsperados = [
  'test_agenda_apps_script.js','test_public_agendas_apps_script.js','test_public_content_multiarea.js',
  'test_dynamic_professionals_apps_script.js','test_apps_script_module_chain.js','test_build_apps_script_release.js',
  'test_dom_flows.js','test_admin_transport.js','test_admin_fast_v102.js','test_dynamic_professionals_dom.js','test_public_data_transport.js',
  'test_moradores_v145.js','test_portal_maintenance.js','test_territorio_csv_notifications.js',
  'test_public_area_identification.js','test_public_area_resolver.js','test_publicacoes_territoriais.js',
  'test_territorio_dom.js','test_notification_repair_button.js','test_notification_repair_confirmation.js',
  'test_performance_v101.js'
];
for (const teste of testesEsperados) registrar('regressao', `Suíte obrigatória encadeada: ${teste}`, contem(comandoTestes, teste));
registrar('regressao', 'Gate percentual executado por último', /test_performance_v101\.js\s*&&\s*node scripts\/test_quality_gate_v101\.js\s*$/.test(comandoTestes));

const backend = read('apps-script/ZZZZ_21_PerformanceCacheV101.gs');
const dental = read('portal-odontologia-segunda-sexta.js');
const auto = read('portal-auto-update.js');
const warmup = read('admin-warmup.js');
const agenda = read('painel-oficial-agendas-vagas.html');
const profissionais = read('painel-oficial-profissionais-servicos.html');
const recados = read('painel-oficial-recados-campanhas.html');
const adminTransport = read('scripts/test_admin_transport.js');
const perfTest = read('scripts/test_performance_v101.js');
const index = read('index.html');

registrar('dados', 'Cache global instável está explicitamente desativado', contem(backend, 'ATIVO: false'));
registrar('dados', 'Módulo de desempenho não redefine doGet', !regex(backend, /\bdoGet\s*=\s*function/));
registrar('dados', 'Módulo de desempenho não redefine doPost', !regex(backend, /\bdoPost\s*=\s*function/));
registrar('dados', 'Módulo neutro não executa CacheService global', !contem(backend, 'CacheService.getScriptCache'));
registrar('dados', 'Reserva odontológica real continua no backend', contem(dental, "params.set('action', 'reservar_get')"));
registrar('dados', 'Abatimento visual é unitário', contem(dental, 'optimisticRemaining: Math.max(0, Number(available) - 1)'));
registrar('dados', 'CPF/CNS continua validado antes da reserva', contem(dental, "validDocument(el('cpf') && el('cpf').value)"));
registrar('dados', 'Snapshot de agendas não libera escrita sem confirmação', contem(agenda, 'Aguarde a confirmação dos dados atuais antes de salvar.'));
registrar('dados', 'Proteção contra profissional duplicado permanece', contem(profissionais, 'Profissional já cadastrado'));
registrar('dados', 'Teste territorial e isolamento multiárea continuam obrigatórios', contem(comandoTestes, 'test_public_content_multiarea.js') && contem(comandoTestes, 'test_publicacoes_territoriais.js'));

registrar('desempenho', 'Agenda odontológica abre por snapshot territorial completo', contem(dental, 'portalTacsDentalAgendaV103FullWeek:'));
registrar('desempenho', 'Snapshot odontológico antigo não autoriza reserva', contem(perfTest, 'Cache acima de 90s não pode permitir reserva'));
registrar('desempenho', 'Painel de agendas abre última leitura imediatamente', contem(agenda, 'function aplicarSnapshotSeDisponivel()') && contem(agenda, 'aplicarDados(item.data,false)') && contem(agenda, 'Dados exibidos da última leitura. Atualizando dados em segundo plano…'));
registrar('desempenho', 'Pré-aquecimento reaproveita conexão recente por 3 minutos', contem(warmup, 'var WARM_MS=3*60*1000;'));
registrar('desempenho', 'Timeout de pré-aquecimento limitado a 6 segundos', contem(warmup, 'var TIMEOUT_MS=6000;'));
registrar('desempenho', 'Atualização inteligente evita apagar caches duráveis', !contem(auto, "'portalTacsPublicDataV4'") && !contem(auto, "'portalTacsDentalAgendaV103FullWeek'"));
registrar('desempenho', 'Primeira abertura da web app não recarrega só por faltar ?ptv', contem(auto, 'if(!pageSeen)') && !contem(auto, 'currentUrl=new URL'));
registrar('desempenho', 'Autoatualização recarrega apenas quando a versão publicada muda', contem(auto, 'if(pageSeen!==remote)'));
registrar('desempenho', 'Consulta odontológica duplicada antiga virou somente fallback', contem(index, 'if(!window.__PORTAL_TACS_ODONTOLOGIA_V98__)loadDental()'));
registrar('desempenho', 'Arquivo neutro do backend é incluído no release para substituir a versão instável', contem(read('scripts/build_apps_script_release.js'), "marker: 'TACS_PERFORMANCE_CACHE_V101'"));

registrar('resiliencia', 'Fluxo Safari/iframe possui teste dedicado', contem(adminTransport, 'transporte Safari'));
registrar('resiliencia', 'Resposta direta encerra polling duplicado', contem(adminTransport, 'iniciou polling mesmo após a resposta direta'));
registrar('resiliencia', 'Pré-aquecimento tolera DOM mínimo', contem(warmup, "typeof document==='undefined'||typeof document.createElement!=='function'||!document.head"));
registrar('resiliencia', 'Atualização funciona mesmo sem fetch nativo', contem(auto, "if(typeof fetch!=='function')return Promise.resolve(null);"));
registrar('resiliencia', 'Painéis que usam transporte aquecido fazem preconnect; Recados standalone não depende disso', [agenda, profissionais].every(t => contem(t, 'rel="preconnect" href="https://script.google.com"')) && !contem(recados, 'admin-warmup.js?v='));
registrar('resiliencia', 'Falha de rede não duplica envio administrativo', contem(adminTransport, 'deve enviar cada operação uma única vez'));
registrar('resiliencia', 'Sessão expirada volta ao PIN sem alerta falso', contem(adminTransport, 'sessão anterior não pôde ser reutilizada'));
registrar('resiliencia', 'Pré-aquecimento administrativo é carregado somente onde necessário, sem UI do Portal', contem(agenda, 'admin-warmup.js?v=20260813-admin-v103') && contem(profissionais, 'admin-warmup.js?v=20260813-admin-v103') && !contem(recados, 'admin-warmup.js?v=') && !contem(warmup, 'portal-auto-update.js'));

registrar('usabilidade', 'Viewport móvel preservado nos três painéis', [agenda, profissionais, recados].every(t => contem(t, 'width=device-width,initial-scale=1,viewport-fit=cover')));
registrar('usabilidade', 'Botões do painel de agendas têm alvo grande', regex(agenda, /\.botao\{[^}]*min-height:56px/));
registrar('usabilidade', 'Campos do painel de agendas têm altura ampla', regex(agenda, /\.campo\{[^}]*min-height:54px/));
registrar('usabilidade', 'Campo de validade possui correção de overflow Safari', contem(adminTransport, 'contain:inline-size'));
registrar('usabilidade', 'Controle de contraste do painel de recados permanece oculto', contem(recados, '.preferenciaVisual,#alternarContraste{display:none!important'));
registrar('usabilidade', 'Padrão visual petróleo permanece definido no painel de recados', contem(recados, 'tema-petroleo') && contem(recados, 'linear-gradient(145deg,#073a55,#0b5878)'));
registrar('usabilidade', 'Portal público mantém atualização sem recarga forçada', contem(index, 'portal-auto-update.js?v=20260812-v101'));
registrar('usabilidade', 'Mensagens administrativas permanecem em português claro', contem(agenda, 'Digite o PIN para carregar as agendas') && contem(recados, 'Digite o PIN administrativo ou entre como TACS da área.'));

let geral = 0;
let falhas = [];
for (const categoria of Object.values(categorias)) {
  const total = categoria.checks.length;
  const aprovados = categoria.checks.filter(c => c.aprovado).length;
  const percentual = total ? (aprovados / total) * 100 : 100;
  categoria.percentual = percentual;
  geral += percentual * categoria.peso / 100;
  for (const item of categoria.checks) if (!item.aprovado) falhas.push(`${categoria.nome}: ${item.nome}`);
  console.log(`QUALIDADE ${categoria.nome}: ${aprovados}/${total} = ${percentual.toFixed(1)}%`);
}
console.log(`QUALIDADE_INTERNA_V101=${geral.toFixed(1)}%`);
console.log('OBSERVACAO=Percentual de critérios automatizados desta homologação; não equivale a garantia de 100% em todas as redes e aparelhos reais.');
if (falhas.length) {
  console.error('FALHAS_DO_GATE:');
  falhas.forEach(f => console.error('- ' + f));
  process.exit(1);
}
if (geral < 100) {
  console.error(`Gate rejeitado: ${geral.toFixed(1)}%. Exigência interna desta versão: 100% dos critérios definidos.`);
  process.exit(1);
}
console.log('QUALITY_GATE_V101_OK');
