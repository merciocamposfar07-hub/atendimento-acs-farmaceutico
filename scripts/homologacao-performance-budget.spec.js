'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('orçamento de interação da Central: despacho do shell persistente',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-performance-shell');
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-performance-shell');
  });
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');if(b){b.hidden=false;b.disabled=false}});
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
  const started=Date.now();
  const handlerMs=await page.evaluate(()=>{const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');const t=performance.now();b.click();return performance.now()-t});
  await expect(page.locator('#viewer')).toBeVisible();
  const visualMs=Date.now()-started;
  expect(handlerMs,browserName+': clique deve despachar o shell abaixo de 100 ms').toBeLessThan(100);
  expect(visualMs,browserName+': resposta visual do shell deve aparecer em até 500 ms').toBeLessThanOrEqual(500);
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe('suporte');
});

test('estrutura de Agendas aparece sem esperar Apps Script',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.goto('painel-oficial-agendas-vagas.html?area=JAPARANDUBA',{waitUntil:'domcontentloaded'});
  const started=Date.now();
  const status=String(await page.locator('#loginStatus').textContent()||'');
  const elapsed=Date.now()-started;
  expect(status).toContain('Aguarde enquanto os dados carregam');
  expect(elapsed,browserName+': estrutura inicial de Agendas deve responder em até 300 ms').toBeLessThanOrEqual(300);
});
