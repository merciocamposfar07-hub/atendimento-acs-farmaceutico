'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function prepareCentral(page,names){
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
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
}

test('cartões administrativos usam um único visualizador e retornam à Central',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  const modules={
    moradores:'teste-v1/painel-moradores-v2.html',
    recados:'painel-oficial-recados-campanhas.html',
    profissionais:'painel-oficial-profissionais-servicos.html',
    suporte:'painel-suporte-moradores-v2.html',
    territorio:'painel-oficial-tacs-areas.html',
    municipios:'painel-oficial-organizacoes-municipios.html'
  };
  await prepareCentral(page,Object.keys(modules));
  const timings=[];

  for(const [name,path] of Object.entries(modules)){
    const button=page.locator('#moduleGrid .module[data-module="'+name+'"]');
    await expect(button).toBeVisible();
    const result=await page.evaluate(moduleName=>{
      const button=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
      const viewer=document.getElementById('viewer');
      const frame=document.getElementById('viewerFrame');
      const started=performance.now();
      button.click();
      return {
        ms:performance.now()-started,
        visible:Boolean(viewer&&!viewer.hidden),
        src:frame.getAttribute('src')||'',
        pool:Boolean(document.getElementById('portalTacsAdminPreloadPoolV1'))
      };
    },name);
    expect(result.visible,name+': toque precisa abrir o visualizador imediatamente').toBe(true);
    expect(result.ms,name+': resposta visual ao toque deve ficar abaixo de 100 ms').toBeLessThan(100);
    expect(result.src,name+': rota incorreta').toContain(path);
    expect(result.pool,name+': não deve recriar pool oculto').toBe(false);
    await expect(page.locator('#viewer')).toBeVisible();

    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    await expect(page.locator('#viewerFrame')).toHaveAttribute('src','about:blank');
    timings.push({name,ms:Math.round(result.ms*100)/100});
  }

  console.log(JSON.stringify({kind:'central-interface-actions-direct',browserName,timings}));
});

test('Agendas abre por navegação direta no iPhone-safe',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await prepareCentral(page,['agendas']);

  await Promise.all([
    page.waitForURL(url=>{
      const u=new URL(url);
      return u.pathname.endsWith('/painel-oficial-agendas-vagas.html') &&
        u.searchParams.get('from')==='central' &&
        /^\d+$/.test(u.searchParams.get('_cb')||'');
    }),
    page.locator('#moduleGrid .module[data-module="agendas"]').click()
  ]);

  expect(page.url()).not.toContain('preload=1');
  console.log(JSON.stringify({kind:'agenda-direct-interface',browserName,direct:true}));
});
