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

test('Central preserva sessão e cartões tocáveis ao restaurar BFCache/Safari',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await blockExternal(page);
  await seedCentralSession(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});

  await page.evaluate(()=>{
    const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if(b){b.hidden=false;b.disabled=false}
  });

  await page.evaluate(()=>{
    let event;
    try{event=new PageTransitionEvent('pageshow',{persisted:true})}
    catch(e){event=new Event('pageshow')}
    window.dispatchEvent(event);
  });

  const support=page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  const state=await page.evaluate(()=>({
    token:sessionStorage.getItem('portalTacsAdminTokenV1')||'',
    pointerEvents:getComputedStyle(document.querySelector('#moduleGrid .module[data-module="suporte"]')).pointerEvents,
    disabled:Boolean(document.querySelector('#moduleGrid .module[data-module="suporte"]').disabled),
    ariaBusy:document.querySelector('#moduleGrid .module[data-module="suporte"]').getAttribute('aria-busy')||''
  }));
  expect(state.token).toBe('homologacao-admin-session');
  expect(state.pointerEvents).not.toBe('none');
  expect(state.disabled).toBe(false);
  expect(state.ariaBusy).toBe('');
  await support.click({trial:true});

  console.log(JSON.stringify({kind:'safari-bfcache-central-session',browserName,sessionPreserved:true,touchable:true}));
});


test('Painel aberto pela Central não solicita segundo PIN',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await blockExternal(page);
  await seedCentralSession(page);
  await page.goto('painel-oficial-agendas-vagas.html?area=JAPARANDUBA&from=central',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(/painel-oficial-agendas-vagas\.html/);
  await expect(page.locator('#pin')).toBeHidden();
  await expect(page.locator('#entrar')).toBeHidden();
  await expect(page.locator('#portalTacsBackCentralV1')).toBeVisible();
  console.log(JSON.stringify({kind:'pin-unico-painel',browserName,segundoPin:false}));
});
