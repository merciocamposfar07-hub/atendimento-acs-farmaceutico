// CSC: smoke test da página publicada, sem alterar dados reais.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const PAGE_URL='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/?area=JAPARANDUBA';
(async()=>{
 for(const browserType of [chromium,webkit]){
   const browser=await browserType.launch({headless:true});
   const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,deviceScaleFactor:3});
   const page=await context.newPage();
   const response=await page.goto(PAGE_URL,{waitUntil:'domcontentloaded',timeout:45000});
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
   // Exercício real do DOM publicado com retornos SIMULADOS da API:
   // nenhum CPF de paciente nem registro UBS é escrito pelo teste.
   const fixtures=new Map();
   const beneficiary={
     ok:true,encontrado:true,selecaoToken:'ctv1.fake',
     beneficiario:{nome:'ANA TESTE',nascimento:'29/03/1960',localidade:'Sítio Japaranduba',
       documento:'52998224725',familiaId:'002'},
     familia:[
       {nome:'ANA TESTE',nascimento:'29/03/1960',membroToken:'ctm1.ana',temDocumento:true},
       {nome:'PEDRO TESTE',nascimento:'20/03/1964',membroToken:'ctm1.pedro',temDocumento:true}
     ]
   };
   await page.route(/https:\/\/script\.google\.com\/macros\/s\/.*\/exec(?:\?|$)/,async route=>{
     const req=route.request(),url=new URL(req.url()),params=new URLSearchParams(req.postData()||''),a=url.searchParams.get('action')||params.get('action')||'';
     if(!a.startsWith('csc_terceiros_')){await route.continue();return;}
     if(a==='csc_terceiros_result'){
       const id=url.searchParams.get('requestId'),cb=url.searchParams.get('callback');
       const result=fixtures.get(id);
       const output=result?{ok:true,pendente:false,result}:{ok:true,pendente:true};
       await route.fulfill({status:200,contentType:'application/javascript',
         body:cb+'('+JSON.stringify(output)+');'});return;
     }
     const id=params.get('requestId');
     let result;
     if(a==='csc_terceiros_buscar')result=beneficiary;
     else if(a==='csc_terceiros_membro')result={
       ...beneficiary,selecaoToken:'ctv1.pedro',
       beneficiario:{nome:'PEDRO TESTE',nascimento:'20/03/1964',localidade:'Sítio Japaranduba',
         documento:'123456789012345',familiaId:'002'}
     };
     else result={ok:false,message:'Ação de teste não autorizada'};
     fixtures.set(id,result);
     await route.fulfill({status:200,contentType:'text/plain',body:'ok'});
   });
   await page.locator('#cscTerceirosConsent').check();
   page.on('console',message=>{if(message.type()==='error')console.error('PAGINA:',message.text())});
   await page.locator('#cscTerceirosDoc').fill('52998224725');
   await page.locator('#cscTerceirosLookup').click();
   try{
     await page.locator('#cscTerceirosFamily button').first().waitFor({state:'visible',timeout:10000});
   }catch(error){
     console.error('DIAGNOSTICO CSC '+browserType.name(),JSON.stringify({
       status:await page.locator('#cscTerceirosStatus').textContent(),
       family:await page.locator('#cscTerceirosFamily').innerHTML(),
       birthHidden:await page.locator('#cscTerceirosBirthRow').evaluate(e=>e.hidden),
       consent:await page.locator('#cscTerceirosConsent').isChecked(),
       actions:[...fixtures.keys()]
     }));
     throw error;
   }
   assert.equal(await page.locator('#cscTerceirosFamily button').count(),2);
   await page.locator('#cscTerceirosFamily button').nth(1).click();
   await page.locator('#cscTerceirosLegacyHelp').waitFor({state:'visible',timeout:10000});
   assert.equal(await page.locator('#name').inputValue(),'PEDRO TESTE');
   assert.equal((await page.locator('#cpf').inputValue()).replace(/\D/g,''),'123456789012345');
   assert(await page.locator('#category option').count()>5,'serviços nativos não carregados');
   await page.waitForFunction(()=>Boolean(window.PortalCscSolicitacaoCardOficialV1?.create),null,{timeout:10000});
   const officialCard=await page.evaluate(async()=>{
      const blob=await window.PortalCscSolicitacaoCardOficialV1.create({
        name:'PEDRO TESTE',birth:'20/03/1964',document:'123456789012345',
        locality:'Sítio Japaranduba, Chã Grande - PE',
        category:'Solicitar consulta Médica',description:'Solicitação de consulta médica para sexta-feira.',
        areaName:'Sítio Japaranduba',tacsName:'TACS responsável',
        unitName:'Unidade de Saúde Posto Matias',
        code:'CSC-T-TESTE',sentAt:'22/11/2026, 14:00'
      });
      const buf=await blob.arrayBuffer();
      return {size:blob.size,type:blob.type,signature:Array.from(new Uint8Array(buf.slice(0,8)))};
   });
   assert.equal(officialCard.type,'image/png');
   assert(officialCard.size>10000,'imagem oficial incompleta');
   assert.deepEqual(officialCard.signature,[137,80,78,71,13,10,26,10]);
   await page.locator('#cscTerceirosFinish').click();
   assert.equal(await page.locator('#cpf').inputValue(),mainBefore);
   console.log(browserType.name()+': família por toque e gerador do cartão oficial PNG OK; sem chamadas reais de solicitação.');

   console.log(browserType.name()+': página real OK; abertura local '+elapsed.toFixed(1)+' ms; formulário legado preservado.');
   await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
