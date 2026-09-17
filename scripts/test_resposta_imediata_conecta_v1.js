'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const core=read('conecta-module-core-v1.js');
const morador=read('conecta-morador-session-v1.js');
const moradoresNative=read('conecta-moradores-native-v1.js');
const index=read('index.html');

// Contrato geral: shell/cache primeiro; servidor continua obrigatório para confirmar.
assert.match(central,/PRECARREGAMENTO_REAL_PAINEIS_2026_09_16_V1/);
assert.match(central,/schedulePanelRuntimePrewarm\(\)/);
assert.match(central,/showShellFrame\(name,frame,title\|\|'Painel',routeId\)/);
assert.match(core,/prime:performancePrime/);
assert.match(core,/commit:performanceCommit/);
assert.match(core,/requiresRemote:true/);
assert.match(core,/localStorage\.setItem\(key,JSON\.stringify\(item\)\)/);

// Segundo acesso por PIN: o contexto local deve abrir a Central ANTES da sincronização remota.
assert.match(central,/FLUXO_CANONICO_LOCAL_FIRST_V1/);
const loginStart=central.indexOf("el('loginAdmin').addEventListener('click'");
const loginEnd=central.indexOf("el('loginTacs').addEventListener('click'",loginStart);
assert.ok(loginStart>=0&&loginEnd>loginStart,'Fluxo de login administrativo não encontrado.');
const loginAdmin=central.slice(loginStart,loginEnd);
const openLocal=loginAdmin.indexOf("aplicarAcessoLocal('admin',saved)");
const remoteSync=loginAdmin.indexOf("startRemoteAuthSync('admin',pin,Boolean(saved))");
assert.ok(openLocal>=0&&remoteSync>openLocal,'O login voltou a esperar o servidor antes de abrir o contexto local.');

// Painéis nativos: se o token remoto ainda não chegou, a tela real abre e tenta pintar o cache.
assert.match(central,/CORRECAO_PRIMEIRO_TOQUE_PAINEIS_V1/);
assert.match(central,/if\(name==='agendas'\)\{showNativeAgenda/);
assert.match(central,/if\(name==='moradores'&&moduleRouteOptions\(options\)\.view!=='prontuarios'\)\{showNativeMoradores/);
assert.match(central,/if\(name==='profissionais'\)\{showNativeProfissionais/);
assert.match(moradoresNative,/function showWaitingSession\(\)/);
assert.match(moradoresNative,/perf\.prime\('moradores-base'/);
assert.match(moradoresNative,/showAuthenticatedShell\('Acesso validado\. Conferindo os dados em segundo plano\.'/);

// Morador: família é aquecida antes do toque e o toque não espera Apps Script.
assert.match(morador,/RESPOSTA_IMEDIATA_MORADOR_2026_09_16_V1/);
assert.match(morador,/familyMemberCache=\{\},familyMemberLoads=\{\},familyWarmGeneration=0/);
assert.match(morador,/warmFamilyMembers\(Array\.isArray\(resident\.familia\)\?resident\.familia:\[\]\)/);
assert.match(morador,/function resolveFamilyMember\(tok\)/);
assert.match(morador,/if\(familyMemberCache\[key\]\)return Promise\.resolve\(familyMemberCache\[key\]\)/);
assert.match(morador,/function warmFamilyMembers\(members\)/);
assert.match(morador,/\.csc-family-person:active\{transform:scale\(\.985\)/);

const start=morador.indexOf('function selectFamilyMember(button)');
const end=morador.indexOf('function promptMemberCpf',start);
assert.ok(start>=0&&end>start,'selectFamilyMember não encontrado');
const select=morador.slice(start,end);
const visual=select.indexOf("classList.toggle('active',x===button)");
const local=select.indexOf("setField('name',name);setField('birth',birth)");
const remote=select.indexOf('resolveFamilyMember(tok)');
assert.ok(visual>=0&&local>visual&&remote>local,'O toque do familiar voltou a esperar a rede antes da resposta local.');
assert.match(select,/if\(cached\)\{applyFamilyMemberData\(cached,name,birth\);return\}/);

// O Portal deve carregar uma revisão versionada do script; o gate não pode quebrar a cada cache-buster integral.
assert.match(index,/conecta-morador-session-v1\.js\?v=[a-z0-9-]+/i);

console.log('RESPOSTA_IMEDIATA_CONECTA_OK: PIN local abre antes da rede; painéis nativos exibem shell/cache primeiro; família responde localmente; remoto apenas confirma e atualiza.');
