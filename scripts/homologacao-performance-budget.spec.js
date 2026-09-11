'use strict';
const { test, expect } = require('@playwright/test');

async function seedCentralSession(page){
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','homologacao-admin-session');
    sessionStorage.setItem('portalTacsCentralReturnUrlV1',location.origin+'/atendimento-acs-farmaceutico/central-administrativa-tacs.html');
    localStorage.setItem('portalTacsCentralAreaV1','JAPARANDUBA');
  });
}

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('orçamento de interação da Central: despacho da navegação direta',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await seedCentralSession(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');if(b){b.hidden=false;b.disabled=false}});
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
  await page.evaluate(()=>{const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');const t=performance.now();b.click();sessionStorage.setItem('homologacaoNavHandlerMs',String(performance.now()-t))});
  await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/painel-suporte-moradores-v2.html')&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
  const ms=Number(await page.evaluate(()=>sessionStorage.getItem('homologacaoNavHandlerMs')||'9999'));
  expect(ms,browserName+': clique deve despachar navegação abaixo de 100 ms').toBeLessThan(100);
});

test('snapshot de Agendas aparece sem esperar Apps Script',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.addInitScript(()=>{const token='sessao-homologacao-snapshot-budget';function fp(v){let a=2166136261,b=2246822519;for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917)}return(a>>>0).toString(16)+(b>>>0).toString(16)}sessionStorage.setItem('portalTacsAdminTokenV1',token);localStorage.setItem('portalTacsDispositivoV1','device-homologacao-performance');const key='portalTacsAdminSnapshotV1:agendas:lf1:admin:'+fp(token)+':JAPARANDUBA';localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:[],agendas:[]}}))});
  await page.goto('painel-oficial-agendas-vagas.html?area=JAPARANDUBA',{waitUntil:'domcontentloaded'});
  const started=Date.now();await expect(page.locator('#loginStatus')).toContainText('Dados exibidos da última leitura');
  expect(Date.now()-started,browserName+': snapshot local deve aparecer em até 300 ms').toBeLessThanOrEqual(300);
});
