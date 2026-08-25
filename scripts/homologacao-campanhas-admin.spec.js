'use strict';

const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

function card(id,title,date){
  return `<details class="item" data-id="${id}"><summary><div><h3>${title}</h3></div><span class="sinal ativo">Ativa</span></summary><div class="corpo"><input name="titulo" value="${title}"><textarea name="mensagem">Mensagem ${title}</textarea><input name="inicio" type="date" value="${date}"><input name="dias" value="Mês"><input name="ativo" type="checkbox" checked></div></details>`;
}

test('campanhas por mês permanecem editáveis sem interferência do WhatsApp mensal',async({page,browserName})=>{
  await blockExternal(page);
  await page.setViewportSize({width:390,height:844});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error&&error.message||error)));
  await page.goto('painel-oficial-recados-campanhas.html',{waitUntil:'domcontentloaded'});

  await page.locator('#abaCampanhas').click();
  await expect.poll(()=>page.evaluate(()=>window.__portalTacsCampanhasPeriodoV2===true)).toBe(true);

  await page.evaluate((html)=>{
    const list=document.getElementById('listaCampanhas');
    list.innerHTML=html;
  },[
    card('CJAN','Janeiro Branco','2026-01-05'),
    card('CAGO1','Agosto Lilás','2026-08-01'),
    card('CAGO2','Agosto Dourado','2026-08-01'),
    card('CSET','Setembro Amarelo','2026-09-01')
  ].join(''));

  await expect(page.locator('#campPeriodSummary')).toContainText('Agosto / 2026 • 2 campanhas');
  await expect(page.locator('#listaCampanhas .item:not([hidden])')).toHaveCount(2);
  await expect(page.locator('#listaCampanhas [data-id="CAGO1"]')).toBeVisible();
  await expect(page.locator('#listaCampanhas [data-id="CAGO2"]')).toBeVisible();
  await expect(page.locator('#listaCampanhas [data-id="CJAN"]')).toBeHidden();

  await page.locator('.camp-month-tab[data-month="1"]').click();
  await expect(page.locator('#campPeriodSummary')).toContainText('Janeiro / 2026 • 1 campanha');
  await expect(page.locator('#listaCampanhas .item:not([hidden])')).toHaveCount(1);
  await expect(page.locator('#listaCampanhas [data-id="CJAN"]')).toBeVisible();
  await expect(page.locator('#listaCampanhas [data-id="CAGO1"]')).toBeHidden();
  await expect(page.locator('#listaCampanhas [data-id="CAGO2"]')).toBeHidden();

  await page.locator('.camp-month-tab[data-month="8"]').click();
  await expect(page.locator('#campPeriodSummary')).toContainText('Agosto / 2026 • 2 campanhas');
  await expect(page.locator('#listaCampanhas .item:not([hidden])')).toHaveCount(2);

  const monthlySource=await page.evaluate(async()=>await (await fetch('recados-campanhas-whatsapp-mensal-v12.js',{cache:'no-store'})).text());
  expect(monthlySource).not.toContain('card.hidden=!mostrar');
  expect(monthlySource).toContain('monthKey(card)===vigente');
  expect(errors,`${browserName}: nenhum erro JavaScript não tratado`).toEqual([]);
  console.log(JSON.stringify({kind:'campanhas-admin-v14',browserName,agosto:2,janeiro:1,interferenciaWhatsapp:false}));
});
