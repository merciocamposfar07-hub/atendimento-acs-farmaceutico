'use strict';
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.resolve(process.cwd(), 'homologacao-cross-engine.ndjson');
const portalViewports = [
  { name: 'iphone-390', width: 390, height: 844, direction: 'down' },
  { name: 'android-430', width: 430, height: 932, direction: 'down' },
  { name: 'tablet-768', width: 768, height: 1024, direction: 'right' },
  { name: 'desktop-1366', width: 1366, height: 768, direction: 'right' }
];

function writeResult(result){fs.appendFileSync(reportPath,JSON.stringify(result)+'\n','utf8')}
async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}
async function primeCentralSession(page){
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-shell-cross-engine');
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-shell-cross-engine');
  });
}
async function metrics(page){return page.evaluate(()=>{const h=document.documentElement,n=performance.getEntriesByType('navigation')[0];return{viewport:{width:innerWidth,height:innerHeight},scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,overflowPx:Math.max(0,h.scrollWidth-h.clientWidth),domContentLoadedMs:n?Math.round(n.domContentLoadedEventEnd):null,loadMs:n?Math.round(n.loadEventEnd):null}})}
async function expose(page,name){await page.evaluate(moduleName=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');if(b){b.hidden=false;b.disabled=false}},name)}
async function openShellModule(page,cfg,browserName){
  const centralPath=new URL(page.url()).pathname;
  const handlerMs=await page.evaluate(moduleName=>{
    const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
    const t=performance.now();b.click();return performance.now()-t;
  },cfg.name);
  expect(handlerMs,browserName+'/'+cfg.name+': clique deve despachar o shell em menos de 100 ms').toBeLessThan(100);
  await expect(page.locator('#viewer')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe(cfg.name);
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.tipoAtivo())).toBe(cfg.native?'native':'frame');
  expect(new URL(page.url()).pathname).toBe(centralPath);
  expect(new URL(page.url()).searchParams.get('preload')).toBeNull();
  if(cfg.native){
    await expect(page.locator('#viewer')).toHaveClass(/csc-native-viewer/);
    await expect(page.locator('#viewerFrame')).toBeHidden();
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
  return handlerMs;
}

for(const vp of portalViewports){
  test('Portal responsivo '+vp.name,async({page,browserName})=>{
    await page.setViewportSize({width:vp.width,height:vp.height});await blockExternal(page);
    const started=Date.now();await page.goto('index.html',{waitUntil:'domcontentloaded'});
    const arrow=page.locator('.portal-flow-arrow[data-guide-key="document"]');
    await expect(arrow).toBeVisible();await expect.poll(async()=>arrow.getAttribute('data-arrow-direction')).toBe(vp.direction);
    await expect(page.locator('#portalTacsAtualizarPaginaV1')).toBeVisible();
    await expect(page.locator('#portalTacsVoltarCentralV1')).toHaveCount(0);
    const appleHref=await page.locator('link[rel="apple-touch-icon"]').first().getAttribute('href');
    expect(appleHref||'').toContain('portal-tacs-oficial-512.png');
    const m=await metrics(page);expect(m.overflowPx).toBeLessThanOrEqual(1);
    writeResult({kind:'portal',browserName,viewport:vp.name,expectedDirection:vp.direction,actualDirection:await arrow.getAttribute('data-arrow-direction'),elapsedMs:Date.now()-started,...m});
  });
}

for(const vp of [{name:'central-mobile-390',width:390,height:844},{name:'central-desktop-1024',width:1024,height:768}]){
  test('Central responsiva '+vp.name,async({page,browserName})=>{
    await page.setViewportSize({width:vp.width,height:vp.height});await blockExternal(page);
    const started=Date.now();await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#tabAdmin')).toBeVisible();await expect(page.locator('#tabTacs')).toBeVisible();
    await expect(page.locator('#loginPanel')).toBeVisible();await expect(page.locator('#adminPin')).toBeVisible();
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    const m=await metrics(page);expect(m.overflowPx).toBeLessThanOrEqual(1);
    writeResult({kind:'central',browserName,viewport:vp.name,elapsedMs:Date.now()-started,...m});
  });
}

test('PIN local V3 funciona nos navegadores reais sem persistir token remoto',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  const rows=await page.evaluate(async()=>{
    const api=window.ConectaPinLocalV2;if(!api)throw new Error('ConectaPinLocalV2 ausente');
    const device=localStorage.getItem('portalTacsDispositivoV1')||'device-homologacao-pin-v3',out=[];
    for(const scope of ['admin','tacs','morador']){
      const started=performance.now();
      const saved=await api.guardar(scope,'2468',{device,token:'TOKEN-NAO-DEVE-SOBREVIVER-'+scope,context:{areas:[{areaId:'JAPARANDUBA',ativa:true}]},snapshot:{nome:'Teste',areaId:'JAPARANDUBA'},mode:scope});
      const opened=await api.abrir(scope,'2468'),wrong=await api.abrir(scope,'1357');
      out.push({scope,saved,elapsedMs:performance.now()-started,opened:Boolean(opened),wrongBlocked:wrong===null,hasToken:Boolean(opened&&opened.token),hasContext:Boolean(opened&&(opened.context||opened.snapshot)),storageV3:Boolean(localStorage.getItem('conectaPinLocalV3:'+scope))});
    }
    return out;
  });
  for(const row of rows){
    expect(row.saved).toBe(true);expect(row.opened).toBe(true);expect(row.wrongBlocked).toBe(true);
    expect(row.hasToken).toBe(false);expect(row.hasContext).toBe(true);expect(row.storageV3).toBe(true);
    expect(row.elapsedMs,browserName+'/'+row.scope+': desbloqueio local lento').toBeLessThan(1500);
  }
  writeResult({kind:'pin-local-v3',browserName,rows:rows.map(r=>({scope:r.scope,elapsedMs:Math.round(r.elapsedMs*100)/100}))});
});

for(const cfg of [
  {name:'suporte',path:'/painel-suporte-moradores-v2.html',native:false},
  {name:'agendas',path:'/painel-oficial-agendas-vagas.html',native:true}
]){
  test('Central abre '+cfg.name+' no shell persistente no primeiro toque',async({page,browserName})=>{
    await page.setViewportSize({width:390,height:844});await blockExternal(page);await primeCentralSession(page);
    await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});await expose(page,cfg.name);
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    const handlerMs=await openShellModule(page,cfg,browserName);
    writeResult({kind:'central-shell-nav',browserName,module:cfg.name,mode:cfg.native?'native':'frame',handlerMs:Math.round(handlerMs*100)/100});
  });
}

test('Portal vindo da Central mostra retorno sem credencial na URL',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.addInitScript(()=>sessionStorage.setItem('portalTacsAdminTokenV1','sessao-teste-sem-credencial-na-url'));
  await page.goto('index.html?from=central&area=JAPARANDUBA',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#portalTacsVoltarCentralV1')).toBeVisible();
  expect(page.url()).not.toContain('token=');expect(page.url()).not.toContain('territorioToken=');
  const m=await metrics(page);expect(m.overflowPx).toBeLessThanOrEqual(1);writeResult({kind:'central-return',browserName,viewport:'iphone-390',visible:true,...m});
});

test('Portal público comum não expõe retorno administrativo',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);await page.goto('index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#portalTacsVoltarCentralV1')).toHaveCount(0);const m=await metrics(page);expect(m.overflowPx).toBeLessThanOrEqual(1);
  writeResult({kind:'public-no-central-return',browserName,viewport:'iphone-390',visible:false,...m});
});

test('Botão Atualizar refaz a navegação com cache-bust real',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);await page.goto('index.html',{waitUntil:'domcontentloaded'});
  const refresh=page.locator('#portalTacsAtualizarPaginaV1');await expect(refresh).toBeVisible();
  await Promise.all([page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/index.html')&&u.searchParams.get('ptrefresh')==='1'&&/^\d+$/.test(u.searchParams.get('ptv')||'')},{waitUntil:'domcontentloaded'}),refresh.click()]);
  const u=new URL(page.url());expect(u.searchParams.get('ptrefresh')).toBe('1');expect(u.searchParams.get('ptv')).toMatch(/^\d+$/);
  writeResult({kind:'portal-refresh',browserName,viewport:'iphone-390',refreshed:true});
});

test('Rodapé usa o símbolo oficial da Conecta Saúde Comunitária',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);await page.goto('index.html',{waitUntil:'domcontentloaded'});
  const logo=page.locator('.portal-footer-brand [data-conecta-oficial="1"]');await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('aria-label','Símbolo oficial Conecta Saúde Comunitária');
  writeResult({kind:'conecta-brand',browserName,viewport:'iphone-390',official:true});
});
