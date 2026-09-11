'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function prepare(page,names){
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#loginPanel')).toBeVisible();
  await page.evaluate(moduleNames=>{
    const modules=document.getElementById('modulesPanel');
    if(modules)modules.hidden=false;
    moduleNames.forEach(name=>{
      const button=document.querySelector('#moduleGrid .module[data-module="'+name+'"]');
      if(button){button.hidden=false;button.disabled=false}
    });
  },names);
}

test('regressão integral mantém as rotas dos painéis sem recriar arquitetura oculta',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.message||error)));

  const modules={
    moradores:'teste-v1/painel-moradores-v2.html',
    recados:'painel-oficial-recados-campanhas.html',
    profissionais:'painel-oficial-profissionais-servicos.html',
    suporte:'painel-suporte-moradores-v2.html',
    territorio:'painel-oficial-tacs-areas.html',
    municipios:'painel-oficial-organizacoes-municipios.html'
  };
  await prepare(page,Object.keys(modules));
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  const timings=[];
  for(const [name,path] of Object.entries(modules)){
    const result=await page.evaluate(moduleName=>{
      const started=performance.now();
      document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]').click();
      const viewer=document.getElementById('viewer');
      const frame=document.getElementById('viewerFrame');
      return {
        ms:performance.now()-started,
        visible:Boolean(viewer&&!viewer.hidden),
        src:frame.getAttribute('src')||''
      };
    },name);
    expect(result.visible,name+': deve responder visualmente no mesmo toque').toBe(true);
    expect(result.ms,name+': abertura do shell deve ficar abaixo de 100 ms').toBeLessThan(100);
    expect(result.src,name+': rota do painel foi alterada').toContain(path);
    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    await expect(page.locator('#viewerFrame')).toHaveAttribute('src','about:blank');
    timings.push({name,ms:Math.round(result.ms*100)/100});
  }

  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
  expect(pageErrors,'Navegação dos painéis não pode produzir erro JavaScript não tratado').toEqual([]);
  console.log(JSON.stringify({kind:'regressao-integral-direta',browserName,timings,poolOculto:false}));
});

test('regressão integral preserva Agendas por navegação direta',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await prepare(page,['agendas']);

  await Promise.all([
    page.waitForURL(url=>{
      const u=new URL(url);
      return u.pathname.endsWith('/painel-oficial-agendas-vagas.html') &&
        u.searchParams.get('from')==='central' &&
        /^\d+$/.test(u.searchParams.get('_cb')||'');
    }),
    page.locator('#moduleGrid .module[data-module="agendas"]').click()
  ]);

  const u=new URL(page.url());
  expect(u.searchParams.get('preload')).toBeNull();
  console.log(JSON.stringify({kind:'regressao-agendas-direta',browserName,direct:true}));
});
