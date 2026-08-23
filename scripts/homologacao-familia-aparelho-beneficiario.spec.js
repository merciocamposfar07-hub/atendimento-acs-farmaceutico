'use strict';
const fs=require('fs');
const {test,expect}=require('@playwright/test');

const AREA='JAPARANDUBA';
const FAMILY='024';
const SUB='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MARIA_CPF='39053344705';
const MIGUEL_CNS='898001234567890';

function jsonp(callback,payload){return `${callback}(${JSON.stringify(payload)});`;}

test('trocar beneficiário não troca família nem identidade Push do aparelho',async({page})=>{
  const oneSignalCalls={login:0,logout:0,alias:0};
  await page.route('**/macros/s/**',async route=>{
    const url=new URL(route.request().url());
    const action=url.searchParams.get('action')||'';
    const callback=url.searchParams.get('callback')||'';
    let payload;
    if(action==='publico_familia_consultar'){
      payload={ok:true,autorizada:true,familiaId:FAMILY,membros:[
        {token:'fm_mariaaaaaaaaaaaaaaaaaaaa',nome:'Maria',nascimento:'01/01/1985',temDocumento:true},
        {token:'fm_miguelbbbbbbbbbbbbbbbbbb',nome:'Miguel',nascimento:'02/02/2020',temDocumento:true}
      ]};
    }else if(action==='publico_familia_membro'){
      const token=url.searchParams.get('token')||'';
      payload=token.includes('miguel')
        ?{ok:true,documentoAcesso:MIGUEL_CNS,tipoDocumento:'CNS',familiaId:FAMILY,nome:'Miguel'}
        :{ok:true,documentoAcesso:MARIA_CPF,tipoDocumento:'CPF',familiaId:FAMILY,nome:'Maria'};
    }else{
      payload={ok:false,message:`Ação inesperada: ${action}`};
    }
    await route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:jsonp(callback,payload)});
  });

  await page.goto('portal-version.json');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><form><label>Documento <input id="cpf" inputmode="numeric"><span id="cpfStatus"></span></label></form></body></html>');
  await page.exposeFunction('__osLogin',()=>{oneSignalCalls.login++;});
  await page.exposeFunction('__osLogout',()=>{oneSignalCalls.logout++;});
  await page.exposeFunction('__osAlias',()=>{oneSignalCalls.alias++;});
  await page.evaluate(({area,family,sub})=>{
    localStorage.setItem(`portalTacsFamiliaAutofillV1:${area}`,family);
    const os={
      User:{PushSubscription:{id:sub},addAlias(){window.__osAlias();}},
      login(){window.__osLogin();},
      logout(){window.__osLogout();}
    };
    window.__osRef=os;
    window.OneSignalDeferred={push(fn){fn(os);}};
  },{area:AREA,family:FAMILY,sub:SUB});

  const runtime=fs.readFileSync('portal-identificacao-familia-v1.js','utf8');
  await page.addScriptTag({content:runtime});
  await expect.poll(()=>page.locator('#cpfStatus').evaluate(el=>el.dataset.familyDocObserver||'')).toBe('1');

  async function abrirFamilia(){
    await page.locator('#cpf').fill('024');
    await page.locator('#cpf').dispatchEvent('input');
    await expect(page.getByRole('button',{name:/Buscar esta família/})).toBeVisible();
    await page.getByRole('button',{name:/Buscar esta família/}).click();
    await expect(page.getByRole('button',{name:/Maria/})).toBeVisible();
    await expect(page.getByRole('button',{name:/Miguel/})).toBeVisible();
  }

  await abrirFamilia();
  await page.getByRole('button',{name:/Maria/}).click();
  await expect(page.locator('#cpf')).toHaveValue(MARIA_CPF);
  expect(await page.evaluate(area=>localStorage.getItem(`portalTacsFamiliaAutofillV1:${area}`),AREA)).toBe(FAMILY);
  expect(await page.evaluate(()=>window.__osRef.User.PushSubscription.id)).toBe(SUB);

  await abrirFamilia();
  await page.getByRole('button',{name:/Miguel/}).click();
  await expect(page.locator('#cpf')).toHaveValue(MIGUEL_CNS);
  expect(await page.evaluate(area=>localStorage.getItem(`portalTacsFamiliaAutofillV1:${area}`),AREA)).toBe(FAMILY);
  expect(await page.evaluate(()=>window.__osRef.User.PushSubscription.id)).toBe(SUB);
  expect(oneSignalCalls).toEqual({login:0,logout:0,alias:0});
});
