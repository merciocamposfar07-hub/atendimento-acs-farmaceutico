'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}
async function prepareCentral(page,name){
  await blockExternal(page);
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-interface-shell');
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-interface-shell');
  });
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(moduleName=>{
    const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;
    const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
    if(b){b.hidden=false;b.disabled=false}
  },name);
}

const modules=[
  {name:'moradores',path:'/teste-v1/painel-moradores-v2.html',native:true},
  {name:'recados',path:'/painel-oficial-recados-campanhas.html',native:false},
  {name:'profissionais',path:'/painel-oficial-profissionais-servicos.html',native:true},
  {name:'suporte',path:'/painel-suporte-moradores-v2.html',native:false},
  {name:'territorio',path:'/teste-v1/painel-tacs-areas-v1.html',native:false},
  {name:'municipios',path:'/painel-oficial-organizacoes-municipios.html',native:false},
  {name:'agendas',path:'/painel-oficial-agendas-vagas.html',native:true}
];

for(const cfg of modules){
  test('cartão '+cfg.name+' abre no shell no primeiro toque',async({page,browserName})=>{
    await page.setViewportSize({width:390,height:844});
    await prepareCentral(page,cfg.name);
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    if(cfg.name==='agendas'){
      await page.evaluate(()=>sessionStorage.setItem('portalConectaModulePerfV1:admin:JAPARANDUBA:agendas',JSON.stringify({schemaVersion:2,module:'agendas',mode:'admin',areaId:'JAPARANDUBA',confirmedAt:Date.now(),checkedAt:Date.now(),cacheVersionReference:'teste-cache-corrompido',fingerprint:'teste-cache-corrompido',data:{ok:true,profissionais:[null],agendas:[null]}})));
    }
    const centralPath=new URL(page.url()).pathname;

    const ms=await page.evaluate(moduleName=>{
      const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
      const t=performance.now();b.click();return performance.now()-t;
    },cfg.name);

    expect(ms,cfg.name+': despacho do clique deve ficar abaixo de 100 ms').toBeLessThan(100);
    await expect(page.locator('#viewer')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe(cfg.name);
    await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.tipoAtivo())).toBe(cfg.native?'native':'frame');
    expect(new URL(page.url()).pathname).toBe(centralPath);
    expect(new URL(page.url()).searchParams.get('preload')).toBeNull();

    if(cfg.native){
      await expect(page.locator('#viewer')).toHaveClass(/csc-native-viewer/);
      await expect(page.locator('#viewerFrame')).toBeHidden();
      if(cfg.name==='agendas'){
        await expect(page.locator('#nativeModuleHost .csc-ag-native')).toBeVisible();
        await expect(page.locator('#nativeModuleHost')).not.toContainText('não pôde ser iniciado sem perder a sessão');
      }
    }else{
      await expect(page.locator('#viewer')).toHaveClass(/csc-frame-viewer/);
      const frame=page.locator('iframe[data-shell-module="'+cfg.name+'"]').first();
      await expect(frame).toBeVisible();
      await expect.poll(()=>frame.getAttribute('src')).toContain(cfg.path);
      const frameUrl=await page.evaluate(moduleName=>{
        const f=document.querySelector('iframe[data-shell-module="'+moduleName+'"]');
        return new URL((f&&f.getAttribute('src'))||'',location.href).href;
      },cfg.name);
      const u=new URL(frameUrl);expect(u.pathname.endsWith(cfg.path)).toBe(true);expect(u.searchParams.get('from')).toBe('central');expect(u.searchParams.get('preload')).toBeNull();
    }

    console.log(JSON.stringify({kind:'central-interface-action-shell',browserName,module:cfg.name,mode:cfg.native?'native':'frame',ms:Math.round(ms*100)/100}));
  });
}


test('local-first sem token remoto abre painéis reais',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
    const api=window.ConectaPinLocalV2;
    const device=localStorage.getItem('portalTacsDispositivoV1');
    await api.guardar('admin','2468',{
      device,
      mode:'admin',
      selectedAreaId:'JAPARANDUBA',
      context:{
        perfil:'ADMIN_GERAL',
        administradorAtual:{nomeCompleto:'Administrador Teste',perfil:'ADMIN_GERAL'},
        administradores:[{nomeCompleto:'Administrador Teste',perfil:'ADMIN_GERAL',ativo:true}],
        areas:[{areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',unidadeId:'POSTO_MATIAS',unidadeNome:'USF Matias',ativa:true}],
        tacs:[]
      }
    });
  });
  await page.locator('#adminPin').fill('2468');
  await page.locator('#loginAdmin').click();
  await expect(page.locator('#modulesPanel')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('portalTacsAdminTokenV1'))).toBeFalsy();

  for(const name of ['moradores','agendas','profissionais','ubs']){
    const button=page.locator('#moduleGrid .module[data-module="'+name+'"]');
    await button.click();
    await expect(page.locator('#viewer')).toBeVisible();
    await expect(page.locator('.csc-pending-preview')).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe(name);
    await page.evaluate(()=>window.ConectaCentralShellV1.voltar());
    await expect(page.locator('#viewer')).toBeHidden();
  }

  for(const name of ['suporte','recados','territorio','municipios']){
    const button=page.locator('#moduleGrid .module[data-module="'+name+'"]');
    await button.click();
    await expect(page.locator('#viewer')).toBeVisible();
    await expect(page.locator('.csc-pending-preview')).toHaveCount(0);
    const frame=page.locator('iframe[data-shell-module="'+name+'"]').first();
    await expect(frame).toBeVisible();
    await expect.poll(()=>frame.getAttribute('src')).toContain('localfirst=1');
    await page.evaluate(()=>window.ConectaCentralShellV1.voltar());
    await expect(page.locator('#viewer')).toBeHidden();
  }
});
