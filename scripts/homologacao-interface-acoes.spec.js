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
async function prepareCentral(page,name){
  await blockExternal(page);
  await seedCentralSession(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(moduleName=>{
    const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;
    const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
    if(b){b.hidden=false;b.disabled=false}
  },name);
}

const modules=[
  {name:'moradores',path:'/teste-v1/painel-moradores-v2.html'},
  {name:'recados',path:'/painel-oficial-recados-campanhas.html'},
  {name:'profissionais',path:'/painel-oficial-profissionais-servicos.html'},
  {name:'suporte',path:'/painel-suporte-moradores-v2.html'},
  {name:'territorio',path:'/painel-oficial-tacs-areas.html'},
  {name:'municipios',path:'/painel-oficial-organizacoes-municipios.html'},
  {name:'agendas',path:'/painel-oficial-agendas-vagas.html'}
];

for(const cfg of modules){
  test('cartão '+cfg.name+' navega diretamente no primeiro toque',async({page,browserName})=>{
    await page.setViewportSize({width:390,height:844});
    await prepareCentral(page,cfg.name);
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

    await page.evaluate(moduleName=>{
      const b=document.querySelector('#moduleGrid .module[data-module="'+moduleName+'"]');
      const t=performance.now();
      b.click();
      sessionStorage.setItem('homologacaoNavHandlerMs',String(performance.now()-t));
    },cfg.name);

    await page.waitForURL(url=>{
      const u=new URL(url);
      return u.pathname.endsWith(cfg.path)&&u.searchParams.get('from')==='central';
    },{waitUntil:'domcontentloaded'});

    const ms=Number(await page.evaluate(()=>sessionStorage.getItem('homologacaoNavHandlerMs')||'9999'));
    expect(ms,cfg.name+': despacho do clique deve ficar abaixo de 100 ms').toBeLessThan(100);
    expect(new URL(page.url()).searchParams.get('preload')).toBeNull();
    console.log(JSON.stringify({kind:'central-interface-action-direct',browserName,module:cfg.name,ms:Math.round(ms*100)/100}));
  });
}
