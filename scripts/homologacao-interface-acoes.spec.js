'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}
async function prepareCentral(page,name){
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(moduleName=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');if(b){b.hidden=false;b.disabled=false}},name);
}

test('cartões administrativos navegam diretamente e continuam tocáveis ao voltar',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const modules={
    moradores:'/teste-v1/painel-moradores-v2.html',
    recados:'/painel-oficial-recados-campanhas.html',
    profissionais:'/painel-oficial-profissionais-servicos.html',
    suporte:'/painel-suporte-moradores-v2.html',
    territorio:'/painel-oficial-tacs-areas.html',
    municipios:'/painel-oficial-organizacoes-municipios.html'
  };
  const timings=[];
  for(const [name,path] of Object.entries(modules)){
    await prepareCentral(page,name);
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    await page.evaluate(moduleName=>{const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');const t=performance.now();b.click();sessionStorage.setItem('homologacaoNavHandlerMs',String(performance.now()-t))},name);
    await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith(path)&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
    const ms=Number(await page.evaluate(()=>sessionStorage.getItem('homologacaoNavHandlerMs')||'9999'));
    expect(ms,name+': despacho do clique deve ficar abaixo de 100 ms').toBeLessThan(100);
    timings.push({name,ms:Math.round(ms*100)/100});
  }
  console.log(JSON.stringify({kind:'central-interface-actions-direct',browserName,timings}));
});

test('Agendas abre por navegação direta no iPhone-safe',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);await prepareCentral(page,'agendas');
  await page.locator('#moduleGrid .module[data-module="agendas"]').click();
  await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/painel-oficial-agendas-vagas.html')&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
  const u=new URL(page.url());expect(u.searchParams.get('preload')).toBeNull();
  console.log(JSON.stringify({kind:'agenda-direct-interface',browserName,direct:true}));
});
