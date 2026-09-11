'use strict';
const { test, expect } = require('@playwright/test');

async function seedCentralSession(page){
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','homologacao-admin-session');
    sessionStorage.setItem('portalTacsCentralReturnUrlV1',location.origin+'/atendimento-acs-farmaceutico/central-administrativa-tacs.html');
    localStorage.setItem('portalTacsCentralAreaV1','JAPARANDUBA');
  });
}
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
async function metrics(page){return page.evaluate(()=>{const h=document.documentElement,n=performance.getEntriesByType('navigation')[0];return{viewport:{width:innerWidth,height:innerHeight},scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,overflowPx:Math.max(0,h.scrollWidth-h.clientWidth),domContentLoadedMs:n?Math.round(n.domContentLoadedEventEnd):null,loadMs:n?Math.round(n.loadEventEnd):null}})}
async function expose(page,name){await page.evaluate(moduleName=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');if(b){b.hidden=false;b.disabled=false}},name)}

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
  await seedCentralSession(page);
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
  {name:'suporte',path:'/painel-suporte-moradores-v2.html'},
  {name:'agendas',path:'/painel-oficial-agendas-vagas.html'}
]){
  test('Central navega diretamente para '+cfg.name+' sem iframe oculto',async({page,browserName})=>{
    await page.setViewportSize({width:390,height:844});await blockExternal(page);
    await seedCentralSession(page);
    await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});await expose(page,cfg.name);
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    await page.evaluate(moduleName=>{
      const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
      const t=performance.now();b.click();sessionStorage.setItem('homologacaoNavHandlerMs',String(performance.now()-t));
    },cfg.name);
    await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith(cfg.path)&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
    const handlerMs=Number(await page.evaluate(()=>sessionStorage.getItem('homologacaoNavHandlerMs')||'9999'));
    expect(handlerMs,browserName+'/'+cfg.name+': clique deve despachar navegação em menos de 100 ms').toBeLessThan(100);
    const u=new URL(page.url());expect(u.searchParams.get('preload')).toBeNull();
    writeResult({kind:'central-direct-nav',browserName,module:cfg.name,handlerMs:Math.round(handlerMs*100)/100});
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
