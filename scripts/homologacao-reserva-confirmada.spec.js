'use strict';
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const dentalSource=fs.readFileSync(path.join(ROOT,'portal-odontologia-segunda-sexta.js'),'utf8');
const DATE='2099-08-24';

async function prepare(page,reservationHandler){
  let agendaCalls=0;
  let reservationCalls=0;
  const requestIds=[];
  await page.route('https://api.example.test/exec**',async route=>{
    const url=new URL(route.request().url());
    const action=url.searchParams.get('action');
    const callback=url.searchParams.get('callback');
    if(action==='agenda'){
      agendaCalls+=1;
      return route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:`${callback}(${JSON.stringify({ok:true,dias:[{id:'DENTISTA-JAPARANDUBA-2-'+DATE,dia:'Segunda-feira',data:DATE,vagasComuns:2,vagasEmergenciais:1,ativo:true}]})});`});
    }
    if(action==='reservar_get'){
      reservationCalls+=1;
      requestIds.push(url.searchParams.get('requestId'));
      return reservationHandler({route,url,callback,call:reservationCalls});
    }
    return route.abort();
  });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>
    <select id="category"><option selected>Solicitar atendimento odontológico (dentista)</option></select>
    <input id="name" value="Maria da Silva">
    <input id="locality" value="Sítio Japaranduba">
    <input id="cpf" value="52998224725">
    <input id="birth" value="1984-12-28">
    <input id="subject" value="">
    <div id="dentalTitle"></div><div id="dentalHelp"></div><div id="dentalStatus"></div>
    <div id="dentalEmergency" hidden></div><div id="dentalSlots"></div>
    <button id="send" type="button">Enviar</button>
  </body></html>`);
  await page.evaluate(()=>{
    window.DENTAL_AGENDA_API_URL='https://api.example.test/exec';
    window.TACS_AREA_ID='JAPARANDUBA';
  });
  await page.addScriptTag({content:dentalSource});
  await expect(page.locator('#dentalSlots .sheet-dental-choice.common')).toContainText('2 vagas comuns disponíveis');
  return {stats:()=>({agendaCalls,reservationCalls,requestIds:requestIds.slice()})};
}

test('vaga não é abatida nem enviada antes da confirmação real do servidor',async({page})=>{
  const ctx=await prepare(page,async({route,callback})=>{
    await new Promise(resolve=>setTimeout(resolve,700));
    return route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:`${callback}(${JSON.stringify({ok:true,alreadyReserved:false,requestId:'ignorado-no-mock',areaId:'JAPARANDUBA',date:DATE,type:'comum',remaining:1})});`});
  });
  const button=page.locator('#dentalSlots .sheet-dental-choice.common');
  await button.click();
  await expect(page.locator('#dentalStatus')).toContainText('Confirmando sua vaga na agenda');
  await expect(button).toContainText('2 vagas comuns disponíveis');
  await expect(page.locator('#send')).toBeDisabled();
  expect(await page.evaluate(()=>window.PortalTacsOdontologiaV98.selecao().confirmed)).toBe(false);

  // Segundo toque não pode gerar uma segunda reserva enquanto a primeira está pendente.
  await button.click();
  await expect(page.locator('#dentalStatus')).toContainText('Vaga reservada na agenda');
  await expect(page.locator('#dentalSlots .sheet-dental-choice.common')).toContainText('1 vaga comum disponível');
  await expect(page.locator('#send')).toBeEnabled();
  expect(await page.evaluate(()=>window.PortalTacsOdontologiaV98.selecao().confirmed)).toBe(true);
  expect(ctx.stats().reservationCalls).toBe(1);
});

test('retentativa de rede reutiliza o mesmo requestId e mantém envio bloqueado',async({page})=>{
  const ctx=await prepare(page,async({route,callback,call})=>{
    if(call===1)return route.abort('failed');
    return route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:`${callback}(${JSON.stringify({ok:true,alreadyReserved:true,areaId:'JAPARANDUBA',date:DATE,type:'comum',remaining:1})});`});
  });
  const button=page.locator('#dentalSlots .sheet-dental-choice.common');
  await button.click();
  await expect(page.locator('#send')).toBeDisabled();
  await expect(page.locator('#dentalStatus')).toContainText('Confirmando sua vaga na agenda');
  await expect(page.locator('#dentalStatus')).toContainText('Vaga reservada na agenda',{timeout:7000});
  await expect(page.locator('#send')).toBeEnabled();
  const stats=ctx.stats();
  expect(stats.reservationCalls).toBe(2);
  expect(stats.requestIds[0]).toBeTruthy();
  expect(stats.requestIds[1]).toBe(stats.requestIds[0]);
});
