'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const html=read('teste-v1/painel-tacs-areas-v1.html');
const js=read('teste-v1/painel-tacs-areas-v1.js');
const central=read('central-administrativa-tacs.js');
const safe=read('central-suporte-moradores-v1.js');
const wrapper=read('painel-oficial-tacs-areas.html');

assert.match(html,/id="workspacePanel"/,'Painel territorial precisa ter Área de trabalho.');
assert.match(html,/id="workAreaSelect"/,'Seletor Área de trabalho ausente.');
assert.match(html,/>Área de trabalho</,'Rótulo Área de trabalho ausente.');
assert.doesNotMatch(html,/id="loginPanel"/,'Painel territorial não pode manter segundo login.');
assert.doesNotMatch(html,/id="adminLoginButton"/,'Login administrativo duplicado deve ser removido.');
assert.doesNotMatch(html,/id="tacsLoginButton"/,'Login TACS duplicado deve ser removido.');
assert.doesNotMatch(html,/PIN administrativo/,'PIN administrativo não pertence ao módulo territorial.');
assert.doesNotMatch(html,/Entrar como administrador/,'Botão de login interno não pode reaparecer.');

assert.match(js,/CENTRAL_CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV3'/,
  'Painel territorial deve herdar contexto confirmado da Central.');
assert.match(js,/administradorAtual:r\.administradorAtual\|\|null/,
  'Resposta territorial precisa preservar o administrador autenticado.');
assert.match(js,/function currentAdministrator\(\)/,
  'Painel territorial precisa usar a identidade administrativa já reconhecida.');
assert.match(js,/Administrador: /,
  'Área de trabalho deve expor a identidade administrativa somente após sessão herdada.');
assert.match(js,/function areaWorkLabel\(area\)/,
  'Rótulo territorial deve ser montado por área.');
assert.match(js,/TACS: /);
assert.match(js,/Unidade: /);
assert.match(js,/function changeWorkArea\(id\)/,
  'Troca de área deve ser explícita e local.');
assert.match(js,/persistWorkArea\(id\);render\(\)/,
  'Troca de área deve renderizar imediatamente sem recarregar a página.');
assert.match(js,/function scopedTacs\(\)/,
  'Registros TACS devem ser filtrados pelo território atual.');
assert.match(js,/function scopedArea\(\)/,
  'Dados da área devem ser derivados do território atual.');
assert.match(js,/select\.innerHTML=area&&bool\(area\.ativa\)\?/,
  'Importação CSV deve permanecer presa à Área de trabalho selecionada.');
assert.doesNotMatch(js,/post\('admin_login'/,
  'Módulo territorial não pode refazer login administrativo.');
assert.doesNotMatch(js,/post\('admin_territorio_login_pin'/,
  'Módulo territorial não pode refazer login TACS.');
assert.match(js,/TERRITORIO_HERDA_SESSAO_CENTRAL_V1/,
  'Contrato de sessão única da Central ausente.');

assert.match(central,/function areaWorkLabel\(area\)/,
  'Central deve identificar área, TACS e unidade no seletor.');
assert.match(central,/esc\(areaWorkLabel\(a\)\)/,
  'Opções da Área de trabalho da Central devem usar o rótulo territorial completo.');
assert.match(central,/saveContextCache\(\);renderContext\(\)/,
  'Troca de área da Central deve persistir antes de renderizar.');
assert.match(central,/painel-oficial-tacs-areas\.html\?area='\+area\+'&from=central/,
  'Gestão territorial deve receber a Área de trabalho atual.');
assert.match(central,/name==='agendas'\|\|name==='territorio'/,
  'Gestão territorial deve abrir por navegação direta após validação.');

assert.match(safe,/moduleName==='territorio'&&!hasAnySession\(\)/,
  'Clique territorial deve aguardar a sessão remota sem abrir segundo login.');
assert.match(safe,/painel-oficial-tacs-areas\.html\?area='\+area\+from/,
  'Navegação segura deve transportar a área selecionada.');
assert.match(wrapper,/20260911-area-trabalho-v1/,
  'Shell oficial precisa usar revisão nova do painel territorial.');

/* Escopo cirúrgico: a correção não altera o contrato já existente de CPF. */
assert.match(js,/function cpfText\(v\)/);
assert.match(js,/digits\(v\)\.slice\(0,11\)/);
assert.match(js,/if\(!\/\^\\d\{11\}\$\/\.test\(cpf\)\)/);
assert.match(js,/if\(digits\(salvo\.cpf\)!==digits\(body\.cpf\)\)return 'CPF'/);

console.log('TERRITORIO_AREA_TRABALHO_V1_OK: sessão única, administrador reconhecido, área isolada e CPF preservado.');
