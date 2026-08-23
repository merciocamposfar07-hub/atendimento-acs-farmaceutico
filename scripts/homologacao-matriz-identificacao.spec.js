'use strict';
const fs=require('fs');
const {test,expect}=require('@playwright/test');

const AREA='JAPARANDUBA';
const NEW_CPF='52998224725';

test('aparelho novo com CPF desconhecido não expõe integrantes sem contexto familiar',async({page})=>{
  let familyConsults=0;
  await page.route('**/macros/s/**',async route=>{
    const url=new URL(route.request().url());
    if((url.searchParams.get('action')||'')==='publico_familia_consultar')familyConsults++;
    await route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:`${url.searchParams.get('callback')||'noop'}(${JSON.stringify({ok:false,message:'Consulta não deveria ocorrer sem família reconhecida.'})});`});
  });

  await page.goto('portal-version.json');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><form><label>Documento <input id="cpf" inputmode="numeric"><span id="cpfStatus"></span></label></form></body></html>');
  await page.evaluate(area=>{
    localStorage.removeItem(`portalTacsFamiliaAutofillV1:${area}`);
    localStorage.removeItem(`portalTacsFamiliaConfirmadaV1:${area}`);
    window.OneSignalDeferred=[];
  },AREA);

  const runtime=fs.readFileSync('portal-identificacao-familia-v1.js','utf8');
  await page.addScriptTag({content:runtime});
  await expect.poll(()=>page.locator('#cpfStatus').evaluate(el=>el.dataset.familyDocObserver||'')).toBe('1');
  await page.locator('#cpf').fill(NEW_CPF);
  await page.evaluate(({documento,area})=>{
    document.dispatchEvent(new CustomEvent('tacs:documento-nao-localizado',{detail:{documento,tipoDocumento:'CPF',areaId:area}}));
  },{documento:NEW_CPF,area:AREA});

  const box=page.locator('#portalFamilyLookupV1');
  await expect(box).not.toHaveAttribute('hidden','');
  await expect(box).toContainText('informe agora o número do cadastro familiar');
  await expect(box).toContainText('guardado somente nesta tela');
  await expect(page.getByRole('button',{name:/Maria|Miguel/})).toHaveCount(0);
  expect(familyConsults).toBe(0);
  expect(await page.evaluate(area=>localStorage.getItem(`portalTacsFamiliaAutofillV1:${area}`),AREA)).toBeNull();
  expect(await page.evaluate(doc=>Object.values(localStorage).some(v=>String(v).includes(doc)),NEW_CPF)).toBe(false);
  await expect(page.locator('#cpf')).toHaveValue(NEW_CPF);
});
