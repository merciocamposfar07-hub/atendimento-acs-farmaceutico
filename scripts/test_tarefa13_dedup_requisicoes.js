'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const core=read('conecta-module-core-v1.js');
const central=read('central-administrativa-tacs.js');
const centralHtml=read('central-administrativa-tacs.html');
const agendas=read('painel-oficial-agendas-vagas.html');
const profissionais=read('teste-v1/painel-profissionais-servicos-v1.html');
const recados=read('painel-oficial-recados-campanhas.html');
const moradores=read('teste-v1/painel-moradores-transport-v2.js');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const suporte=read('painel-suporte-moradores-v2.html');
const territorio=read('teste-v1/painel-tacs-areas-v1.js');
const territorioHtml=read('teste-v1/painel-tacs-areas-v1.html');
const municipios=read('painel-oficial-organizacoes-municipios.html');

new Function(core);

// Núcleo: um broker em memória do top-level, sem persistir credenciais.
assert.match(core,/TAREFA_13_DEDUP_REQUISICOES_V1/);
assert.match(core,/REQUEST_REUSE_MS=5000/);
assert.match(core,/function requestRegistry\(\)/);
assert.match(core,/__conectaRequestBrokerV1/);
assert.match(core,/inFlight:\{\},recent:\{\},generation:0/);
assert.match(core,/function dedupRequestPromise\(action,payload,executor,options\)/);
assert.match(core,/function requestRead\(action,payload,executor,callback,options\)/);
assert.match(core,/requests:requestApi/);
assert.match(core,/source:'in-flight'/);
assert.match(core,/source:'recent-core'/);
assert.match(core,/source:'remote'/);

// Escopo da deduplicação não pode usar token cru na chave nem persistir o broker.
assert.match(core,/requestHash\(credential\+'\|'\+s\.device\)/);
for(const secret of ['token','territoriotoken','dispositivo','requestid','pin','quickkey','chaveconfianca']){
  assert.ok(core.includes(secret+':1'),'Segredo não filtrado do payload do broker: '+secret);
}
assert.ok(core.includes('escopo:1'),'O escopo local precisa ser ignorado para Agendas e Profissionais compartilharem admin_dados.');

assert.doesNotMatch(core,/sessionStorage\.setItem\([^\n]*conectaRequestBroker/i);
assert.doesNotMatch(core,/localStorage\.setItem\([^\n]*conectaRequestBroker/i);

// Somente leituras conhecidas entram na deduplicação.
for(const action of [
  'admin_dados','admin_moradores_status','admin_publicacoes_dados',
  'admin_suporte_chamados_listar','admin_territorio_dados','admin_multimunicipio_dados'
]){
  assert.ok(core.includes(action+':1'),'Leitura ausente da allowlist: '+action);
}
assert.match(core,/if\(!requestIsRead\(action\)\)requestInvalidate\(\)/);
assert.match(core,/registry\.generation=Number\(registry\.generation\|\|0\)\+1/);
assert.match(core,/registry\.recent=\{\}/);

// A Central continua sendo a origem do contexto (Tarefa 9); o broker consumidor
// vive nos módulos e compartilha o registro volátil pelo window.top.
assert.doesNotMatch(centralHtml,/conecta-module-core-v1\.js/);
assert.doesNotMatch(central,/moduleRequests=moduleCore&&moduleCore\.requests/);

// Agendas e Profissionais deixam de disparar admin_dados independentemente quando
// o mesmo resultado já está em voo/confirmado na janela curta do core.
for(const [src,name] of [[agendas,'agendas'],[profissionais,'profissionais']]){
  assert.match(src,/moduleRequests=moduleCore&&moduleCore\.requests/);
  assert.match(src,/coreRead\('admin_dados'/,name+' não usa o broker em admin_dados.');
  assert.match(src,/noteRequestAction\(action\)/,name+' não invalida o broker em mutações.');
  assert.match(src,/conecta-module-core-v1\.js\?v=[^"'\\<\\s]+/);
}

// Demais módulos usam o mesmo contrato para a leitura principal.
for(const [src,action,name] of [
  [recados,'admin_publicacoes_dados','recados'],
  [moradores,'admin_moradores_status','moradores'],
  [suporte,'admin_suporte_chamados_listar','suporte'],
  [territorio,'admin_territorio_dados','territorio'],
  [municipios,'admin_multimunicipio_dados','municipios']
]){
  assert.match(src,/moduleRequests=moduleCore&&moduleCore\.requests/,name+' não recebeu o broker do core.');
  assert.ok(src.includes("coreRead('"+action+"'"),name+' não deduplica a leitura principal '+action+'.');
  assert.match(src,/noteRequestAction\(action\)/,name+' não invalida leituras após mutação.');
}

for(const src of [moradoresHtml,territorioHtml,suporte,municipios,recados,agendas,profissionais]){
  assert.match(src,/conecta-module-core-v1\.js\?v=[^"'\\<\\s]+/);
}

// Tarefa 12 continua válida: cache visual não vira autoridade e o broker só distribui
// uma resposta remota confirmada ou um voo remoto em andamento.
assert.match(core,/requiresRemote:true/);
assert.match(core,/authoritative:false/);
assert.match(core,/if\(result&&result\.ok===true&&Number\(registry\.generation\|\|0\)===generation\)/);

console.log('TAREFA_13_DEDUP_REQUISICOES_OK: leituras idênticas usam um único voo do core, resultado remoto é distribuído aos módulos por janela curta e qualquer escrita invalida imediatamente o compartilhamento.');
