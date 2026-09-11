'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const index=read('index.html');
const agenda=read('agenda-config.js');
const institutional=read('portal-institucional-suporte-v1.js');
const auto=read('portal-auto-update.js');
const abrir=read('abrir.html');
const central=read('central-administrativa-tacs.html');
const workflow=read('.github/workflows/atualizar-versao-portal-tacs.yml');

assert.match(index,/<body class="tema-petroleo">/,'Portal deve iniciar sempre no azul-petróleo institucional');
assert.match(index,/name="color-scheme" content="light only"/,'Portal deve bloquear recoloração automática do Android');
assert.strictEqual((index.match(/class="hours"/g)||[]).length,1,'Horário deve existir somente dentro do cabeçalho');
const actions=(index.match(/<section class="hero-actions"[\s\S]*?<\/section>/)||[])[0]||'';
assert.strictEqual((actions.match(/class="action-card/g)||[]).length,1,'Faixa abaixo do cabeçalho deve ter somente o WhatsApp');
assert.match(actions,/Envio pelo WhatsApp/);
assert.doesNotMatch(actions,/Segunda a sexta|08h às 16h/,'Horário duplicado reapareceu abaixo do cabeçalho');
assert.doesNotMatch(agenda,/Usar cartões claros|Usar cartões azul-petróleo|alternarContrastePortal/,'Seletor visual antigo não pode voltar');
assert.doesNotMatch(agenda,/installCnsWhatsappActivation/,'Atalho temporário de CNS não pode voltar');
assert.match(index,/function validCns\(value\)/,'Portal deve validar CNS diretamente');
assert.match(index,/CPF\/CNS:/,'WhatsApp deve identificar corretamente CPF ou CNS');

assert.match(institutional,/#portalTacsAtualizarPaginaV1\{[^']*width:50px!important[^']*height:50px!important[^']*border-radius:50%!important/,'Atualizar deve ser circular em todos os aparelhos');
assert.doesNotMatch(institutional,/@media\(max-width:560px\)\{#portalTacsAtualizarPaginaV1/,'Formato do Atualizar não pode depender do aparelho');
assert.match(institutional,/footer\.portal-institutional-footer[^']*linear-gradient\(135deg,#041f34 0%,#062c46 55%,#0b4b6e 100%\)/,'Rodapé deve usar a paleta do cabeçalho');

assert.match(auto,/function currentPageVersion\(\)/);
assert.match(auto,/function purgeLegacyDeliveryState\(\)/);
assert.match(auto,/scopePath==='\/atendimento-acs-farmaceutico\/'/);
assert.match(auto,/scopePath\.indexOf\('\/push\/'\)===-1/,'Limpeza de versão não pode apagar o Push');
assert.match(auto,/releaseMismatch&&forcedRelease!==remote/,'Versão da página deve ser comparada com a versão publicada');
assert.match(abrir,/portal-version\.json\?t=/);
assert.doesNotMatch(abrir,/index\.html\?v=20260805/);
assert.match(central,/portal-auto-update\.js\?v=/,'Central deve receber o mesmo guardião de versão');

function tokens(html){
  return [...html.matchAll(/\b(?:src|href)=["'](?!https?:|\/\/|data:|#)[^"']+\?v=([^"']+)["']/gi)].map(match=>match[1]);
}
for(const [name,html] of [['index',index],['central',central]]){
  const values=tokens(html);
  assert.ok(values.length>0,name+': ativos locais versionados ausentes');
  assert.strictEqual(new Set(values).size,1,name+': página mistura tokens de versões diferentes');
}
assert.match(workflow,/github\.actor != 'github-actions\[bot\]'/,'Workflow deve evitar recursão sem impedir o deploy do Pages');
assert.match(workflow,/Registrar versão única e carimbar arquivos públicos/);
for(const entry of ['index.html','abrir.html','central-administrativa-tacs.html']){
  assert.ok(workflow.includes("Path('"+entry+"')"),entry+': entrada ausente do carimbo automático');
}
console.log('PORTAL_RELEASE_INTEGRITY_V1_OK');
