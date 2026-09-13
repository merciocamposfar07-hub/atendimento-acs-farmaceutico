'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('regressão: Central inicia shell persistente sem pool de preload',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const errors=[];page.on('pageerror',e=>errors.push(String(e&&e.message||e)));
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});

  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>Boolean(window.PortalTacsCentralSuporteMoradoresV1))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>Boolean(window.ConectaCentralShellV1))).toBe(true);

  const baseline=await page.evaluate(()=>{
    const viewer=document.getElementById('viewer');
    const frame=document.getElementById('viewerFrame');
    return {
      viewerHidden:Boolean(viewer&&viewer.hidden),
      frameSrc:frame?frame.getAttribute('src')||'':'',
      frameModule:frame?frame.getAttribute('data-shell-module')||'':'',
      pool:Boolean(document.getElementById('portalTacsAdminPreloadPoolV1'))
    };
  });
  expect(baseline.viewerHidden).toBe(true);
  expect(baseline.frameSrc).toBe('about:blank');
  expect(baseline.frameModule).toBe('');
  expect(baseline.pool).toBe(false);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({kind:'regressao-central-shell-baseline',browserName}));
});

test('regressão: Moradores permanece no shell nativo da Central',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-regressao-shell');
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-regressao-shell');
  });
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="moradores"]');if(b){b.hidden=false;b.disabled=false}});
  const centralPath=new URL(page.url()).pathname;
  await page.locator('#moduleGrid .module[data-module="moradores"]').click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(page.locator('#viewer')).toHaveClass(/csc-native-viewer/);
  await expect(page.locator('#viewerFrame')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe('moradores');
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.tipoAtivo())).toBe('native');
  expect(new URL(page.url()).pathname).toBe(centralPath);
  expect(new URL(page.url()).searchParams.get('preload')).toBeNull();
  console.log(JSON.stringify({kind:'regressao-moradores-shell-nativo',browserName}));
});
