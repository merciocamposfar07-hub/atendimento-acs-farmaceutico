import { chromium } from 'playwright';

const base=process.env.PORTAL_BASE_URL||'http://127.0.0.1:4173';
const failures=[];
function assert(ok,msg){if(!ok)failures.push(msg)}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR'});

async function smoke(path,label){
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e)));
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith(base)) return route.continue();
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  const r=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
  assert(r&&r.ok(),`${label}: HTTP inválido`);
  await page.waitForTimeout(1200);
  assert(pageErrors.length===0,`${label}: pageerror: ${pageErrors.join(' | ')}`);
  const body=await page.locator('body').innerText().catch(()=> '');
  assert(body.trim().length>20,`${label}: página vazia/incompleta`);
  await page.close();
}

await smoke('/atendimento-acs-farmaceutico/central-administrativa-tacs.html','Central administrativa');
await smoke('/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html','Painel recados/campanhas');

{
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e)));
  // Usa uma URL inexistente apenas para fixar a origem HTTP. Nenhum script do portal
  // público fica rodando em paralelo com a fixture de regressão.
  await page.goto(base+'/atendimento-acs-farmaceutico/__fixture_campanhas__.html',{waitUntil:'domcontentloaded'}).catch(()=>{});
  await page.setContent(`<!doctype html><html><body>
    <section id="secaoCampanhas">
      <div class="acoes novo"></div>
      <div id="listaCampanhas" class="lista">
        <details class="item" data-id="aug1"><summary>Agosto Lilás</summary><div class="corpo"><input name="inicio" value="2026-08-01"><input name="ativo" type="checkbox" checked></div></details>
        <details class="item" data-id="aug2"><summary>Agosto Dourado</summary><div class="corpo"><input name="inicio" value="2026-08-05"><input name="ativo" type="checkbox" checked></div></details>
        <details class="item" data-id="sep1"><summary>Setembro Amarelo</summary><div class="corpo"><input name="inicio" value="2026-09-01"><input name="ativo" type="checkbox" checked></div></details>
        <details class="item" data-id="old1"><summary>Agosto anterior</summary><div class="corpo"><input name="inicio" value="2025-08-01"><input name="ativo" type="checkbox" checked></div></details>
      </div>
    </section>
    <select id="areaEnvio"><option value="JAPARANDUBA" selected>JAPARANDUBA</option></select>
  </body></html>`);

  await page.evaluate(()=>{
    window.PortalTacsRecadosCampanhasV12={
      post:function(action,payload,callback){
        if(action!=='admin_publicacoes_dados') throw new Error('Ação inesperada no teste: '+action);
        setTimeout(function(){callback({ok:true,contextoMunicipal:{areaNome:'Sítio Japaranduba'},campanhas:[
          {ID:'aug1',ANO:'2026',MES:'08'},
          {ID:'aug2',ANO:'2026',MES:'08'},
          {ID:'sep1',ANO:'2026',MES:'09'},
          {ID:'old1',ANO:'2025',MES:'08'}
        ]})},10);
      }
    };
  });
  await page.addScriptTag({url:base+'/atendimento-acs-farmaceutico/campanhas-periodo-v2.js'});
  await page.waitForSelector('#campPeriodBox',{timeout:10000});
  await page.waitForSelector('#campMonthTabs .camp-month-tab',{timeout:10000});
  await page.selectOption('#campYear','2026');
  await page.getByRole('button',{name:'Agosto',exact:true}).click();
  await page.waitForTimeout(250);
  const stateAug=await page.evaluate(()=>({
    aug1:document.querySelector('[data-id="aug1"]').hidden,
    aug2:document.querySelector('[data-id="aug2"]').hidden,
    sep1:document.querySelector('[data-id="sep1"]').hidden,
    old1:document.querySelector('[data-id="old1"]').hidden,
    summary:document.getElementById('campPeriodSummary')?.textContent||''
  }));
  assert(stateAug.aug1===false&&stateAug.aug2===false,'Campanhas: Agosto/2026 não exibiu as duas campanhas esperadas');
  assert(stateAug.sep1===true&&stateAug.old1===true,'Campanhas: filtro Agosto/2026 misturou outro mês/ano');
  assert(/Agosto.*2026.*2 campanhas/i.test(stateAug.summary),'Campanhas: resumo Agosto/2026 não informa 2 campanhas: '+stateAug.summary);

  await page.addScriptTag({url:base+'/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-mensal-v12.js'});
  await page.waitForTimeout(250);
  const afterMonthly=await page.evaluate(()=>({
    aug1:document.querySelector('[data-id="aug1"]').hidden,
    aug2:document.querySelector('[data-id="aug2"]').hidden,
    sep1:document.querySelector('[data-id="sep1"]').hidden,
    old1:document.querySelector('[data-id="old1"]').hidden
  }));
  assert(JSON.stringify(afterMonthly)===JSON.stringify({aug1:false,aug2:false,sep1:true,old1:true}),
    'Campanhas: módulo mensal voltou a interferir no filtro administrativo: '+JSON.stringify(afterMonthly));

  await page.getByRole('button',{name:'Setembro',exact:true}).click();
  await page.waitForTimeout(150);
  const stateSep=await page.evaluate(()=>({
    aug1:document.querySelector('[data-id="aug1"]').hidden,
    sep1:document.querySelector('[data-id="sep1"]').hidden,
    summary:document.getElementById('campPeriodSummary')?.textContent||''
  }));
  assert(stateSep.aug1===true&&stateSep.sep1===false,'Campanhas: troca para Setembro/2026 não funcionou');
  assert(/Setembro.*2026.*1 campanha/i.test(stateSep.summary),'Campanhas: resumo Setembro/2026 incorreto: '+stateSep.summary);
  assert(pageErrors.length===0,'Campanhas: erro JavaScript no Chromium: '+pageErrors.join(' | '));
  await page.close();
}

await browser.close();
if(failures.length){
  console.error('\nFALHAS DA SIMULAÇÃO REAL ('+failures.length+')');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('SIMULAÇÃO REAL CHROMIUM: APROVADA');
console.log('Fluxos validados: Central, painel Recados/Campanhas, filtro Agosto/Setembro e não-interferência do card mensal.');
