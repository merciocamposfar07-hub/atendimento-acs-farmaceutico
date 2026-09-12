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
const municipios=read('painel-oficial-organizacoes-municipios.html');

// Núcleo: cache apenas da sessão atual, isolado por modo + área + módulo.
assert.match(core,/TAREFA_11_DESEMPENHO_MODULOS_V1/);
assert.match(core,/PERFORMANCE_PREFIX='portalConectaModulePerfV1:'/);
assert.match(core,/PERFORMANCE_PREFIX\+\(mode\(\)\|\|'anon'\)\+': '\.replace|PERFORMANCE_PREFIX\+\(mode\(\)\|\|'anon'\)\+':'\+areaId\(\)\+':'\+moduleName/);
assert.match(core,/sessionStorage\.getItem\(key\)/);
assert.match(core,/sessionStorage\.setItem\(key,JSON\.stringify\(item\)\)/);
assert.match(core,/performance:performanceApi/);
assert.match(core,/prime:performancePrime/);
assert.match(core,/commit:performanceCommit/);
assert.match(core,/previous\.fingerprint!==fingerprint/);

// Credenciais não podem entrar no cache de desempenho.
for(const secret of ['token','admintoken','territoriotoken','sessiontoken','authorization','accesstoken','refreshtoken','quickkey','chaveconfianca','pin','pinhash','pinsalt']){
  assert.ok(core.includes(secret+':1'),'Campo sensível não filtrado: '+secret);
}

// Shell responde antes do carregamento remoto.
assert.match(central,/TAREFA_11_RESPOSTA_VISUAL_IMEDIATA_V1/);
assert.match(central,/setShellOpening\(title\|\|'Painel',frame\.dataset\.shellReady!=='1'\)/);
assert.match(central,/frame\.dataset\.shellReady='1'/);
assert.match(central,/revision='20260912-task\d+-[a-z0-9-]+-v1'/);

// Módulos cache-first + servidor em paralelo + diff remoto.
const contracts=[
  [agendas,'agendas'],
  [profissionais,'profissionais'],
  [recados,'recados'],
  [moradores,'moradores-base'],
  [suporte,'suporte-chamados'],
  [territorio,'territorio'],
  [municipios,'municipios']
];
for(const [src,name] of contracts){
  assert.ok(src.includes("modulePerf"),name+' não usa o núcleo de desempenho.');
  assert.ok(src.includes("modulePerf.prime('"+name+"'"),name+' não pinta a última confirmação primeiro.');
  assert.ok(src.includes("modulePerf.commit('"+name+"'"),name+' não compara a resposta remota.');
}

// Suporte também deve acelerar o diagnóstico técnico.
assert.ok(suporte.includes("modulePerf.prime('suporte-diagnostico'"));
assert.ok(suporte.includes("modulePerf.commit('suporte-diagnostico'"));

// Cache é leitura; gravação só volta após confirmação remota.
assert.match(agendas,/aplicarDados\(data,false\)/);
assert.match(profissionais,/aplicarDadosLocalFirst\(data,false\)/);
assert.match(moradores,/remoteConfirmed&&r\.escritaHabilitada===true/);
assert.match(suporte,/n\.disabled=!supportConfirmed/);
assert.match(suporte,/n\.disabled=!diagConfirmed/);
assert.match(territorio,/n\.disabled=!territoryConfirmed/);
assert.match(municipios,/n\.disabled=!dataConfirmed/);

// Se o remoto for idêntico, os módulos evitam reconstrução integral e apenas confirmam estado.
assert.match(agendas,/if\(diff\.changed\|\|!snapshotVisivel\)aplicarDados/);
assert.match(profissionais,/if\(diff\.changed\|\|!tinhaSnapshot\)aplicarDadosLocalFirst/);
assert.match(recados,/if\(diff\.changed\|\|!tinhaSnapshot\)aplicar\(r,false\);else/);
assert.match(moradores,/if\(diff\.changed\|\|!cached\)ok=renderBase/);
assert.match(suporte,/if\(diff\.changed\|\|!cached\)\{items=payload\.tickets/);
assert.match(territorio,/if\(diff\.changed\|\|!cached\)render\(\);else syncTerritoryWriteState/);
assert.match(municipios,/if\(diff\.changed\|\|!cached\)render\(\);else syncMunicipioWriteState/);

// Correção pós-auditoria: leitura compartilhada pode acelerar a pintura, mas nunca encerrar
// a função antes da confirmação remota própria do módulo.
assert.ok(agendas.includes('Leitura compartilhada exibida somente para consulta. Confirmando agendas no servidor'));
assert.ok(profissionais.includes('Leitura compartilhada exibida somente para consulta. Confirmando profissionais no servidor'));
assert.doesNotMatch(agendas,/Dados confirmados pela leitura compartilhada desta sessão\./);
assert.doesNotMatch(profissionais,/Dados confirmados pela leitura compartilhada desta sessão\./);
assert.doesNotMatch(agendas,/Object\.assign\(\{compartilhado:true\}/);
assert.doesNotMatch(profissionais,/Object\.assign\(\{compartilhado:true\}/);

// A Tarefa 12 pode acrescentar versionamento/frescor sem invalidar o contrato da Tarefa 11.
// Deduplicação continua reservada à Tarefa 13.
assert.doesNotMatch(core,/requestPromiseMap|inFlightRequestMap|dedupRequestPromise/i);

console.log('TAREFA_11_DESEMPENHO_MODULOS_OK: toque abre shell imediatamente; módulos exibem última confirmação em modo seguro, sincronizam o servidor em paralelo e evitam rerender quando não há mudança.');
