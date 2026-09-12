'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const core=read('conecta-module-core-v1.js');
const central=read('central-administrativa-tacs.js');
const agendas=read('painel-oficial-agendas-vagas.html');
const profissionais=read('teste-v1/painel-profissionais-servicos-v1.html');
const recados=read('painel-oficial-recados-campanhas.html');
const moradores=read('teste-v1/painel-moradores-transport-v2.js');
const suporte=read('painel-suporte-moradores-v2.html');
const territorio=read('teste-v1/painel-tacs-areas-v1.js');
const territorioHtml=read('teste-v1/painel-tacs-areas-v1.html');
const municipios=read('painel-oficial-organizacoes-municipios.html');

new Function(core);

// Núcleo versionado: referência explícita de versão/frescor e cache sempre não autoritativo.
assert.match(core,/TAREFA_12_FRESCOR_CACHE_V1/);
assert.match(core,/PERFORMANCE_SCHEMA_VERSION=2/);
assert.match(core,/PERFORMANCE_STALE_MS=60000/);
assert.match(core,/cacheVersionReference/);
assert.match(core,/confirmedAt/);
assert.match(core,/checkedAt/);
assert.match(core,/function performanceExplicitVersion\(value\)/);
assert.match(core,/function performanceVersionReference\(safe,fingerprint\)/);
assert.match(core,/return performanceExplicitVersion\(safe\)\|\|\('fp:'\+fingerprint\)/);
assert.match(core,/authoritative:false/);
assert.match(core,/requiresRemote:true/);
assert.match(core,/legacyUnversioned=true/);
assert.match(core,/previous\.cacheVersionReference!==cacheVersionReference/);
assert.match(core,/freshness:performanceFreshness/);

// Cache legado pode ser lido para continuidade visual, mas é explicitamente não versionado,
// stale e nunca vira confirmação atual.
assert.match(core,/if\(item\.schemaVersion===1\)[\s\S]*legacyUnversioned=true[\s\S]*requiresRemote=true/);
assert.match(core,/stale:!confirmedAt\|\|age>PERFORMANCE_STALE_MS\|\|Boolean\(item&&item\.legacyUnversioned\)/);

// Todos os módulos continuam cache-first. Após a Tarefa 13, a confirmação remota
// pode vir do broker do core em vez de cada módulo abrir uma chamada duplicada própria.
const modules=[
 [agendas,'agendas',"post('admin_dados'"],
 [profissionais,'profissionais',"post('admin_dados'"],
 [recados,'recados','post('],
 [moradores,'moradores-base',"post('admin_moradores_status'"],
 [suporte,'suporte-chamados',"post('admin_suporte_chamados_listar'"],
 [territorio,'territorio',"coreRead('admin_territorio_dados'"],
 [municipios,'municipios',"post('admin_multimunicipio_dados'"]
];
for(const [src,name,remote] of modules){
  const prime=src.indexOf("modulePerf.prime('"+name+"'");
  const call=src.indexOf(remote,prime);
  assert.ok(prime>=0,name+' não usa cache do core.');
  assert.ok(call>prime,name+' não consulta o servidor depois do cache.');
  assert.ok(src.includes("modulePerf.commit('"+name+"'"),name+' não atualiza a versão após confirmação remota.');
}

// Agendas/Profissionais: leitura compartilhada não pode mais substituir a consulta ao servidor.
assert.ok(agendas.includes('Leitura compartilhada exibida somente para consulta. Confirmando agendas no servidor'));
assert.ok(profissionais.includes('Leitura compartilhada exibida somente para consulta. Confirmando profissionais no servidor'));
assert.doesNotMatch(agendas,/Dados confirmados pela leitura compartilhada desta sessão\./);
assert.doesNotMatch(profissionais,/Dados confirmados pela leitura compartilhada desta sessão\./);

// No caminho do core, snapshots antigos sem referência de versão não são usados como fallback.
for(const src of [agendas,profissionais,recados]){
  assert.match(src,/if\(coreItem\)\{[^\n]*return true\}\s*return false;/);
}

// Dados críticos permanecem somente leitura até confirmação atual do servidor.
assert.match(agendas,/dadosConfirmados=false/);
assert.match(profissionais,/dadosConfirmados=false/);
assert.match(moradores,/remoteConfirmed&&r\.escritaHabilitada===true/);
assert.match(suporte,/n\.disabled=!supportConfirmed/);
assert.match(suporte,/n\.disabled=!diagConfirmed/);
assert.match(territorio,/n\.disabled=!territoryConfirmed/);
assert.match(municipios,/n\.disabled=!dataConfirmed/);

// Cache busting publica a revisão nova em vez da revisão da Tarefa 11.
assert.match(central,/revision='20260912-task(?:12-cache-version|13-request-dedup)-v1'/);
for(const [moduleName,src] of [
  ['agendas',agendas],['profissionais',profissionais],['recados',recados],['suporte',suporte],
  ['territorio',territorioHtml],['municipios',municipios],['moradores',read('teste-v1/painel-moradores-v2.html')]
]){
  assert.match(src,/conecta-module-core-v1\.js\?v=[^"'\\<\s]+/,'Módulo sem cache-busting do core: '+moduleName);
  assert.ok(!src.includes('conecta-module-core-v1.js?v=20260912-tarefa11-performance-v1'),'Módulo ainda preso ao core antigo da Tarefa 11: '+moduleName);
}

// A Tarefa 13 pode acrescentar o broker após o fechamento desta etapa.\nif(core.includes('TAREFA_13_DEDUP_REQUISICOES_V1'))assert.match(core,/dedupRequestPromise/);

console.log('TAREFA_12_CACHE_FRESCOR_OK: cache possui referência de versão/frescor, é sempre não autoritativo, servidor continua obrigatório e dados críticos só são liberados após confirmação remota atual.');
