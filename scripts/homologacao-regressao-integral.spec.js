'use strict';

const { test, expect } = require('@playwright/test');

// O cenário percorre sete painéis e ainda supera deliberadamente o timer legado
// de 5 s. O orçamento de interação continua validado separadamente em <100 ms.
test.setTimeout(60000);

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function prepare(page){
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(window.PortalTacsCentralPerformanceV1))).toBe(true);
  await page.evaluate(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-bloco16');
    const modules=document.getElementById('modulesPanel');
    if(modules)modules.hidden=false;
    document.querySelectorAll('#moduleGrid .module[data-module]').forEach(button=>{
      if(button.dataset.module==='portal')return;
      button.hidden=false;
      button.disabled=false;
    });
  });
}

test('regressão integral mantém todos os painéis vivos entre navegações',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.message||error)));
  await prepare(page);

  const modules=['moradores','agendas','recados','profissionais','suporte','territorio','municipios'];

  // Primeiro ciclo: grava o marcador somente depois que o documento local do
  // painel substitui o about:blank. A homologação bloqueia Apps Script/OneSignal,
  // portanto não pode depender do marcador tacsReady, que representa dados vivos.
  for(const name of modules){
    const button=page.locator(`#moduleGrid .module[data-module="${name}"]`);
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${name}"]`)).toHaveCount(1);
    await page.waitForFunction(moduleName=>{
      const frame=document.querySelector(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${moduleName}"]`);
      try{
        if(!frame||!frame.contentDocument||!frame.contentDocument.body||frame.contentDocument.readyState!=='complete')return false;
        const expectedPath=new URL(frame.getAttribute('src')||'',location.href).pathname;
        return frame.contentWindow.location.pathname===expectedPath;
      }catch(error){return false}
    },name,{timeout:30000});
    await page.evaluate(moduleName=>{
      const frame=document.querySelector(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${moduleName}"]`);
      window.__bloco16Refs=window.__bloco16Refs||{};
      window.__bloco16Loads=window.__bloco16Loads||{};
      window.__bloco16Refs[moduleName]=frame;
      window.__bloco16Loads[moduleName]=0;
      frame.addEventListener('load',()=>{window.__bloco16Loads[moduleName]=(window.__bloco16Loads[moduleName]||0)+1});
      frame.dataset.bloco16Identity=`persistente-${moduleName}`;
      const doc=frame.contentDocument;
      let marker=doc.getElementById(`bloco16-${moduleName}`);
      if(!marker){marker=doc.createElement('input');marker.id=`bloco16-${moduleName}`;doc.body.appendChild(marker)}
      marker.value=`estado-${moduleName}`;
    },name);
    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
  }

  // Supera o timer legado que antes descartava Agendas.
  await page.waitForTimeout(5600);

  const afterIdle=await page.evaluate(moduleNames=>Object.fromEntries(moduleNames.map(name=>{
    const frames=Array.from(document.querySelectorAll(`iframe[data-module="${name}"]`));
    const frame=frames[0]||null;
    let marker='';
    try{marker=frame&&frame.contentDocument&&frame.contentDocument.getElementById(`bloco16-${name}`)?.value||''}catch(error){}
    return [name,{count:frames.length,sameNode:Boolean(frame&&frame===window.__bloco16Refs[name]),marker,loads:Number(window.__bloco16Loads[name]||0)}];
  })),modules);

  for(const name of modules){
    expect(afterIdle[name].count,`${name}: deve existir exatamente uma instância`).toBe(1);
    expect(afterIdle[name].sameNode,`${name}: instância original deve continuar conectada`).toBe(true);
    expect(afterIdle[name].marker,`${name}: DOM interno deve continuar preservado`).toBe(`estado-${name}`);
    expect(afterIdle[name].loads,`${name}: painel inativo não pode recarregar`).toBe(0);
  }

  const timings=[];
  for(const name of modules){
    const reopen=await page.evaluate(moduleName=>{
      const started=performance.now();
      document.querySelector(`#moduleGrid .module[data-module="${moduleName}"]`).click();
      const frame=document.querySelector(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${moduleName}"]`);
      let marker='';
      try{marker=frame&&frame.contentDocument&&frame.contentDocument.getElementById(`bloco16-${moduleName}`)?.value||''}catch(error){}
      return {ms:performance.now()-started,visible:!document.getElementById('viewer').hidden,sameNode:Boolean(frame&&frame===window.__bloco16Refs[moduleName]),marker,loads:Number(window.__bloco16Loads[moduleName]||0)};
    },name);
    expect(reopen.visible,`${name}: deve responder visualmente no mesmo toque`).toBe(true);
    expect(reopen.ms,`${name}: reabertura deve ficar abaixo de 100 ms`).toBeLessThan(100);
    expect(reopen.sameNode,`${name}: reabertura deve reutilizar a instância`).toBe(true);
    expect(reopen.marker,`${name}: estado interno precisa sobreviver`).toBe(`estado-${name}`);
    expect(reopen.loads,`${name}: reabertura não pode disparar load`).toBe(0);
    timings.push({name,ms:Math.round(reopen.ms*100)/100});
    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
  }

  expect(pageErrors,'Navegação integral não pode produzir erro JavaScript não tratado').toEqual([]);
  console.log(JSON.stringify({kind:'regressao-integral-bloco16',browserName,timings,pageErrors:0,persistent:true}));
});
