'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('orçamento de interação da Central: toque, retorno e reabertura', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(window.PortalTacsCentralPerformanceV1))).toBe(true);
  await page.evaluate(() => {
    sessionStorage.setItem('portalTacsAdminTokenV1', 'sessao-homologacao-performance-budget');
    const modules=document.getElementById('modulesPanel');
    if(modules)modules.hidden=false;
    const support=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if(support){support.hidden=false;support.disabled=false;}
  });

  const first=await page.evaluate(() => {
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const viewer=document.getElementById('viewer');
    const t=performance.now(); b.click();
    return {ms:performance.now()-t,visible:Boolean(viewer&&!viewer.hidden)};
  });
  expect(first.visible).toBe(true);
  expect(first.ms, `${browserName}: primeiro toque deve responder abaixo de 100 ms`).toBeLessThan(100);
  await expect(page.locator('#viewer iframe[data-module="suporte"]')).toHaveCount(1);

  const back=await page.evaluate(() => {
    const viewer=document.getElementById('viewer');
    const b=document.getElementById('viewerBack');
    const t=performance.now(); b.click();
    return {ms:performance.now()-t,hidden:Boolean(viewer&&viewer.hidden)};
  });
  expect(back.hidden).toBe(true);
  expect(back.ms, `${browserName}: retorno à Central deve responder abaixo de 150 ms`).toBeLessThan(150);

  const reopen=await page.evaluate(() => {
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const viewer=document.getElementById('viewer');
    const t=performance.now(); b.click();
    return {ms:performance.now()-t,visible:Boolean(viewer&&!viewer.hidden)};
  });
  expect(reopen.visible).toBe(true);
  expect(reopen.ms, `${browserName}: painel preservado deve reabrir abaixo de 300 ms`).toBeLessThan(300);
  await expect(page.locator('#viewer iframe[data-module="suporte"]')).toHaveCount(1);
});

test('snapshot de Agendas aparece sem esperar Apps Script', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.addInitScript(() => {
    const token='sessao-homologacao-snapshot-budget';
    function fp(v){let a=2166136261,b=2246822519;for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917)}return (a>>>0).toString(16)+(b>>>0).toString(16)}
    sessionStorage.setItem('portalTacsAdminTokenV1',token);
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-performance');
    const key='portalTacsAdminSnapshotV1:agendas:lf1:admin:'+fp(token)+':JAPARANDUBA';
    localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:[],agendas:[]}}));
  });
  await page.goto('painel-oficial-agendas-vagas.html?area=JAPARANDUBA', { waitUntil:'domcontentloaded' });
  const started=Date.now();
  await expect(page.locator('#loginStatus')).toContainText('Dados exibidos da última leitura');
  const elapsed=Date.now()-started;
  expect(elapsed, `${browserName}: snapshot local deve aparecer em até 300 ms depois do shell`).toBeLessThanOrEqual(300);
});
