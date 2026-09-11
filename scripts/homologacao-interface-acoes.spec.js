'use strict';

const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function prepareCentral(page){
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(window.PortalTacsCentralPerformanceV1))).toBe(true);
  await page.evaluate(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-bloco15');
    const modules=document.getElementById('modulesPanel');
    if(modules)modules.hidden=false;
    document.querySelectorAll('#moduleGrid .module[data-module]').forEach(button=>{
      if(button.dataset.module==='portal')return;
      button.hidden=false;
      button.disabled=false;
    });
  });
}

test('cartões administrativos respondem ao toque e retornam à Central',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await prepareCentral(page);
  const modules=['moradores','agendas','recados','profissionais','suporte','territorio','municipios'];
  const timings=[];

  for(const name of modules){
    const button=page.locator(`#moduleGrid .module[data-module="${name}"]`);
    await expect(button).toBeVisible();
    const elapsed=await page.evaluate((moduleName)=>{
      const button=document.querySelector(`#moduleGrid .module[data-module="${moduleName}"]`);
      const started=performance.now();
      button.click();
      const viewer=document.getElementById('viewer');
      return {ms:performance.now()-started,visible:Boolean(viewer&&!viewer.hidden)};
    },name);
    expect(elapsed.visible,`${name}: toque precisa abrir visualizador imediatamente`).toBe(true);
    expect(elapsed.ms,`${name}: resposta visual ao toque deve ficar abaixo de 100 ms`).toBeLessThan(100);
    await expect(page.locator(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${name}"]`)).toHaveCount(1);
    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    timings.push({name,ms:Math.round(elapsed.ms*100)/100});
  }

  console.log(JSON.stringify({kind:'central-interface-actions',browserName,timings}));
});

test('Agendas permanece viva mesmo após alguns segundos fora do painel',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await prepareCentral(page);

  const agendas=page.locator('#moduleGrid .module[data-module="agendas"]');
  await agendas.click();
  await expect(page.locator('#portalTacsAdminPreloadPoolV1 iframe[data-module="agendas"]')).toHaveCount(1);

  await page.waitForFunction(()=>{
    const frame=document.querySelector('#portalTacsAdminPreloadPoolV1 iframe[data-module="agendas"]');
    try{return Boolean(frame&&frame.contentDocument&&frame.contentDocument.body)}catch(error){return false}
  });

  const primed=await page.evaluate(()=>{
    const frame=document.querySelector('#portalTacsAdminPreloadPoolV1 iframe[data-module="agendas"]');
    window.__bloco15AgendaRef=frame;
    frame.dataset.bloco15Identity='agenda-persistente';
    const doc=frame.contentDocument;
    let conteudo=doc.getElementById('conteudo');
    let resumo=doc.getElementById('resumo');
    if(!conteudo){conteudo=doc.createElement('div');conteudo.id='conteudo';doc.body.appendChild(conteudo)}
    if(!resumo){resumo=doc.createElement('div');resumo.id='resumo';doc.body.appendChild(resumo)}
    conteudo.classList.remove('oculto');resumo.classList.remove('oculto');
    const marker=doc.createElement('div');marker.id='bloco15AgendaState';marker.textContent='estado-preservado';doc.body.appendChild(marker);
    return {sameNode:Boolean(frame),src:frame.getAttribute('src')||''};
  });
  expect(primed.sameNode).toBe(true);

  await page.locator('#viewerBack').click();
  await expect(page.locator('#viewer')).toBeHidden();

  // A implementação antiga descartava especificamente Agendas 5 s após ficar pronta e inativa.
  await page.waitForTimeout(5600);

  const afterIdle=await page.evaluate(()=>{
    const frames=Array.from(document.querySelectorAll('iframe[data-module="agendas"]'));
    const frame=frames[0]||null;
    let marker='';
    try{marker=frame&&frame.contentDocument&&frame.contentDocument.getElementById('bloco15AgendaState')?.textContent||''}catch(error){}
    return {
      count:frames.length,
      sameNode:Boolean(frame&&frame===window.__bloco15AgendaRef),
      identity:frame?frame.dataset.bloco15Identity||'':'',
      marker
    };
  });

  expect(afterIdle.count,'Agendas não pode ser descartada automaticamente enquanto a sessão permanece ativa').toBe(1);
  expect(afterIdle.sameNode,'A mesma instância de Agendas precisa permanecer conectada').toBe(true);
  expect(afterIdle.marker,'Estado interno da Agenda deve permanecer vivo durante navegação entre painéis').toBe('estado-preservado');

  const reopen=await page.evaluate(()=>{
    const started=performance.now();
    document.querySelector('#moduleGrid .module[data-module="agendas"]').click();
    const frame=document.querySelector('#portalTacsAdminPreloadPoolV1 iframe[data-module="agendas"]');
    return {
      elapsedMs:performance.now()-started,
      sameNode:Boolean(frame&&frame===window.__bloco15AgendaRef),
      marker:frame&&frame.contentDocument?frame.contentDocument.getElementById('bloco15AgendaState')?.textContent||'':'',
      visible:!document.getElementById('viewer').hidden
    };
  });

  expect(reopen.visible).toBe(true);
  expect(reopen.elapsedMs).toBeLessThan(100);
  expect(reopen.sameNode).toBe(true);
  expect(reopen.marker).toBe('estado-preservado');
  console.log(JSON.stringify({kind:'agenda-persistent-interface',browserName,touchElapsedMs:Math.round(reopen.elapsedMs*100)/100,sameNode:true,preservedState:true}));
});
