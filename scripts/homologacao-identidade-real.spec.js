'use strict';
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

for(const width of [390,1280]){
 test('Tarefa 3: nome e perfis legíveis em '+width+'px',async({page,browserName})=>{
  await page.setViewportSize({width,height:900});
  await page.route('https://**',route=>route.abort());
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.PortalTacsCentralPinLocalV2));
  await expect(page.locator('#identityPanel')).toBeHidden();
  const fullName='Júlia Maria da Silva Conceição dos Santos';
  for(const perfil of ['ADMIN_TACS','TACS','UBS','ADMIN_TACS_UBS_MORADOR']){
   await page.evaluate(({nomeCompleto,perfil})=>{
    window.PortalTacsCentralPinLocalV2.aplicar(perfil==='TACS'?'tacs':'admin',{
     selectedAreaId:'TESTE',context:{perfil:perfil==='TACS'?'TACS':'ADMIN_GERAL',usuarioAtual:{nomeCompleto,perfil},areas:[{areaId:'TESTE',areaNome:'Área de teste',ativa:true}],tacs:[]}
    });
   },{nomeCompleto:fullName,perfil});
   const name=page.locator('.csc-authenticated-name');
   await expect(name).toBeVisible();await expect(name).toHaveText(fullName);
   const profiles=page.locator('.csc-authenticated-profiles');
   await expect(profiles).toBeVisible();
   const metrics=await name.evaluate(n=>{const s=getComputedStyle(n);return {fontPx:parseFloat(s.fontSize),linePx:parseFloat(s.lineHeight),color:s.color,whiteSpace:s.whiteSpace,overflowPx:n.scrollWidth-n.clientWidth}});
   expect(metrics.fontPx).toBeGreaterThanOrEqual(20);
   expect(metrics.linePx).toBeGreaterThanOrEqual(metrics.fontPx*1.25);
   expect(metrics.whiteSpace).toBe('normal');
   expect(metrics.overflowPx).toBeLessThanOrEqual(1);
   expect(metrics.color).toBe('rgb(255, 255, 255)');
   fs.appendFileSync('homologacao-cross-engine.ndjson',JSON.stringify({scenario:'tarefa3-identidade',browserName,width,perfil,...metrics})+'\n');
  }
 });
}
