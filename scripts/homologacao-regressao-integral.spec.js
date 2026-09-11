'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}
async function prepare(page,name){
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(moduleName=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');if(b){b.hidden=false;b.disabled=false}},name);
}

test('regressão integral preserva rotas diretas sem pool oculto',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e)));
  const modules={
    moradores:'/teste-v1/painel-moradores-v2.html',
    recados:'/painel-oficial-recados-campanhas.html',
    profissionais:'/painel-oficial-profissionais-servicos.html',
    suporte:'/painel-suporte-moradores-v2.html',
    territorio:'/painel-oficial-tacs-areas.html',
    municipios:'/painel-oficial-organizacoes-municipios.html'
  };
  for(const [name,path] of Object.entries(modules)){
    await prepare(page,name);await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    await page.locator('#moduleGrid .module[data-module="'+name+'"]').click();
    await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith(path)&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
    expect(new URL(page.url()).searchParams.get('preload')).toBeNull();
  }
  expect(pageErrors).toEqual([]);
  console.log(JSON.stringify({kind:'regressao-integral-direta',browserName,poolOculto:false}));
});

test('regressão integral preserva Agendas por navegação direta',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);await prepare(page,'agendas');
  await page.locator('#moduleGrid .module[data-module="agendas"]').click();
  await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/painel-oficial-agendas-vagas.html')&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
  const u=new URL(page.url());expect(u.searchParams.get('preload')).toBeNull();
  console.log(JSON.stringify({kind:'regressao-agendas-direta',browserName,direct:true}));
});
