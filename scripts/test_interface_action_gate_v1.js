'use strict';

const fs=require('node:fs');
const assert=require('node:assert/strict');

const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const npmGate=String(pkg.scripts&&pkg.scripts.test||'');
const playwright=read('playwright.homologacao.config.js');
const central=read('central-administrativa-tacs.html');
const index=read('index.html');
const autoUpdate=read('portal-auto-update.js');

const requiredStatic=[
  'test_dom_flows.js',
  'test_dental_confirmation_gate_v103.js',
  'test_notification_repair_button.js',
  'test_notification_repair_confirmation.js',
  'test_push_onboarding_v1.js',
  'test_identificacao_familiar_publica_v1.js',
  'test_public_area_resolver.js',
  'test_central_admin_performance_v1.js',
  'test_ui_contract_v1.js',
  'test_admin_ui_standard_v1.js'
];
for(const file of requiredStatic){
  assert.ok(npmGate.includes(file),'Bloco 15: gate perdeu teste funcional obrigatório: '+file);
}

const requiredBrowser=[
  'homologacao-interface-acoes.spec.js',
  'homologacao-cross-engine.spec.js',
  'homologacao-push-onboarding.spec.js',
  'homologacao-identificacao-familiar.spec.js',
  'homologacao-reserva-confirmada.spec.js',
  'homologacao-regressao-integral.spec.js'
];
for(const file of requiredBrowser){
  assert.ok(playwright.includes(file),'Bloco 15: matriz perdeu prova prática de ação: '+file);
}

for(const moduleName of ['moradores','agendas','recados','profissionais','suporte','territorio','municipios']){
  const re=new RegExp(`data-module=["']${moduleName}["']`);
  assert.match(central,re,'Bloco 15: cartão administrativo ausente: '+moduleName);
}
assert.match(central,/id=["']viewerBack["']/,'Bloco 15: retorno à Central ausente');
assert.match(index,/id=["']send["']/,'Bloco 15: ação pública de envio ausente');
assert.ok(index.includes('agenda-enfermeira.js'),'Bloco 15: controlador de ativação de avisos deve permanecer carregado');
assert.ok(index.includes('portal-auto-update.js'),'Bloco 15: carregador complementar do Portal deve permanecer ativo');
assert.ok(autoUpdate.includes('portal-identificacao-familia-v1.js'),'Bloco 15: seleção segura de integrante deve permanecer na cadeia real de carregamento');
assert.ok(index.includes('portal-odontologia-segunda-sexta.js'),'Bloco 15: confirmação de vaga deve permanecer carregada');

console.log('INTERFACE_ACTION_GATE_V1_OK: cartões, retorno, envio, Push, família e reserva permanecem cobertos por testes funcionais e matriz real.');
