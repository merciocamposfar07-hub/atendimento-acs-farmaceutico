'use strict';
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const html = fs.readFileSync('central-administrativa-tacs.html', 'utf8');
const source = fs.readFileSync('central-administrativa-tacs.js', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[0]).join('\n');
const guard = html.match(/<script id="cscVisualContractGuardJs20260913">([\s\S]*?)<\/script>/)[1];
const closeViewer = source.slice(source.indexOf('function closeViewer(){'), source.indexOf('function loadContext(message)'));

for (const viewport of [{width:390,height:844},{width:412,height:915},{width:1366,height:768}]) {
  test('Voltar libera Central e preserva módulos '+viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/*', route => route.abort());
    // Fixture isolada: nenhum login, credencial ou requisição ao servidor real.
    await page.setContent('<!doctype html><html><head>'+styles+'</head><body class="csc-central"><main><button id="openAgenda">Agendas</button><button id="openResidents">Moradores</button></main><footer id="cscPlatformFooter"></footer><div id="viewer" class="viewer csc-shell-viewer" hidden><div class="viewer-bar"><button id="viewerBack">Voltar</button></div><div id="nativeModuleHost" class="csc-native-module-host" hidden><input value="Agenda confirmada"><div style="height:1200px"></div></div><div id="nativeMoradoresHost" class="csc-native-module-host" hidden>Moradores confirmados</div><iframe id="viewerFrame" hidden></iframe><footer id="viewerFooter" class="viewer-platform-footer" hidden></footer></div></body></html>');
    await page.addScriptTag({content: `
      var shellActiveNative='',shellActiveModule='',shellActiveRoute='',moduloPendente=null,adminUbsContext=null,adminUbsPreviousAreaId='',selectedAreaId='';
      function el(id){return document.getElementById(id)}
      function shellActiveFrame(){return null}
      function shellHasUnsaved(){return false}
      function setShellOpening(){}
      function refreshHealth(){}
      ${closeViewer}
      el('viewerBack').addEventListener('click',closeViewer);
      function openFixture(id,name){
        el('viewer').classList.add('csc-native-viewer');el('viewer').hidden=false;
        el('nativeModuleHost').hidden=id!=='nativeModuleHost';
        el('nativeMoradoresHost').hidden=id!=='nativeMoradoresHost';
        document.body.classList.add('viewer-open');shellActiveNative=name;
      }
      el('openAgenda').onclick=function(){openFixture('nativeModuleHost','agendas')};
      el('openResidents').onclick=function(){openFixture('nativeMoradoresHost','moradores')};
      window.originalAgenda=el('nativeModuleHost');
      ${guard}
    `});
    await page.locator('#openAgenda').click();
    await expect(page.locator('#nativeModuleHost')).toBeVisible();
    await expect(page.locator('#nativeMoradoresHost')).toBeHidden();
    await page.locator('#nativeModuleHost input').fill('Edição local preservada');
    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    await page.locator('#openResidents').click();
    await expect(page.locator('#nativeMoradoresHost')).toBeVisible();
    await expect(page.locator('#nativeModuleHost')).toBeHidden();
    await page.locator('#viewerBack').click();
    await page.locator('#openAgenda').click();
    await expect(page.locator('#nativeModuleHost input')).toHaveValue('Edição local preservada');
    expect(await page.evaluate(() => window.originalAgenda===document.getElementById('nativeModuleHost'))).toBe(true);
    await page.locator('#viewerBack').click();
    // Aguarda apenas os três ajustes iniciais já existentes; mede repouso depois deles.
    await page.waitForTimeout(1700);
    const changes = await page.evaluate(() => new Promise(resolve => {
      let count=0;const observer=new MutationObserver(records=>count+=records.length);
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true});
      setTimeout(()=>{observer.disconnect();resolve(count)},250);
    }));
    expect(changes).toBe(0);
  });
}


test('Portal TACS usa o shell e Voltar revela a Central autenticada', async ({ page }) => {
  const openModule = source.slice(source.indexOf('function openModule(name,title,options){'), source.indexOf('function closeViewer(){'));
  const normalizeFrame = source.slice(source.indexOf('function normalizeEmbeddedPanelFrame(frame){'), source.indexOf('function enhanceShellFrame(frame){'));
  const backSource = fs.readFileSync('central-back-button-v1.js', 'utf8');

  expect(openModule).not.toMatch(/window\.open\(|location\.(?:assign|href)/);
  expect(openModule).toMatch(/if\(name==='portal'\)\{[\s\S]*ensureShellFrame\(name,url,title\|\|'Portal TACS',routeId\)[\s\S]*showShellFrame\(name,portalFrame,title\|\|'Portal TACS',routeId\)/);
  expect(normalizeFrame).toMatch(/shellModule==='portal'[\s\S]*portalTacsBackCentralV1\{display:block!important\}/);

  await page.setContent('<!doctype html><html><body><main id="central">Central autenticada</main><div id="viewer"><iframe id="portal"></iframe></div></body></html>');
  await page.evaluate(() => {
    sessionStorage.setItem('portalTacsAdminTokenV1','token-teste');
    window.__voltas=0;
    window.ConectaCentralShellV1={
      voltar:function(){
        window.__voltas++;
        document.getElementById('viewer').hidden=true;
      }
    };
  });

  const frameHandle = await page.locator('#portal').elementHandle();
  const frame = await frameHandle.contentFrame();
  await frame.setContent('<!doctype html><html><body><main>Portal TACS</main></body></html>');
  await frame.evaluate(() => sessionStorage.setItem('portalTacsRetornoCentralV1','1'));
  await frame.addScriptTag({content: backSource});
  await frame.locator('#portalTacsBackCentralV1 button').click();

  expect(await page.evaluate(() => window.__voltas)).toBe(1);
  expect(await page.locator('#viewer').isHidden()).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem('portalTacsAdminTokenV1'))).toBe('token-teste');
});
