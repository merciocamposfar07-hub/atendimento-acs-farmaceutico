// CSC: smoke test da página publicada, sem alterar dados reais.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const URL='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/?area=JAPARANDUBA';
(async()=>{
 for(const browserType of [chromium,webkit]){
   const browser=await browserType.launch({headless:true});
   const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,deviceScaleFactor:3});
   const page=await context.newPage();
   const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
   assert(response&&response.ok(),`${browserType.name()}: página indisponível`);
   await page.waitForSelector('#cscTerceiros',{state:'attached',timeout:18000});
   assert.equal(await page.evaluate(()=>window.CSC_TERCEIROS_ENABLED),true,'flag publicada');
   assert.equal(await page.locator('#cscTerceiros').isVisible(),false,'o formulário de terceiros deve exigir login');
   const mainBefore=await page.locator('#cpf').inputValue();
   await page.evaluate(()=>{
      sessionStorage.setItem('portalConectaMoradorTokenV1','cms1.smoke-sem-autenticacao');
      localStorage.setItem('portalTacsDispositivoV1','csc-smoke-virtual');
      window.dispatchEvent(new Event('pageshow'));
   });
   await page.waitForFunction(()=>{const n=document.getElementById('cscTerceiros');return n&&!n.hidden;},{timeout:3500});
   const elapsed=await page.evaluate(()=>{
      const start=performance.now();
      document.getElementById('cscTerceirosToggle').click();
      return performance.now()-start;
   });
   assert(elapsed<120,`abertura local lenta: ${elapsed.toFixed(1)} ms`);
   assert.equal(await page.locator('#cscTerceirosFields').isVisible(),true);
   assert.equal(await page.locator('#cscTerceirosFields [type=password]').count(),0,'novo fluxo não deve pedir PIN');
   assert.equal(await page.locator('#cpf').inputValue(),mainBefore,'campo principal foi alterado');
   assert.equal(await page.locator('#send').count(),1,'botão de envio legado alterado');
   const territory=await page.locator('#cscTerceiros').innerText();
   assert(territory.includes('EXCLUSIVO PARA MORADORES DA ZONA RURAL DE JAPARANDUBA'));
   console.log(browserType.name()+': página real OK; abertura local '+elapsed.toFixed(1)+' ms; formulário legado preservado.');
   await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
