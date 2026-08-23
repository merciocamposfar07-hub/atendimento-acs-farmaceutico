'use strict';
const { test, expect } = require('@playwright/test');

const AREA='JAPARANDUBA';
const FAMILY='024';
const SUB='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEW_CPF='52998224725';
const MIGUEL_CNS='898001234567890';

function jsonp(callback,payload){return `${callback}(${JSON.stringify(payload)});`;}

test('CPF não localizado é vinculado somente ao integrante escolhido da família', async ({page}) => {
  let complementBody='';
  let familyConsults=0;
  let familyConsultFamily='';
  let familyCallback='';
  const pageErrors=[];
  page.on('pageerror',err=>pageErrors.push(String(err&&err.message||err)));

  await page.route('**/macros/s/**', async route => {
    const request=route.request();
    if(request.method()==='POST'){
      complementBody=request.postData()||'';
      await route.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:'OK'});
      return;
    }
    const url=new URL(request.url());
    const action=url.searchParams.get('action')||'';
    const callback=url.searchParams.get('callback')||'';
    let payload;
    if(action==='publico_familia_consultar'){
      familyConsults++;
      familyConsultFamily=url.searchParams.get('familia')||'';
      familyCallback=callback;
      payload={ok:true,autorizada:true,familiaId:FAMILY,membros:[
        {token:'fm_aaaaaaaaaaaaaaaaaaaaaaaa',nome:'Maria',nascimento:'01/01/1985',temDocumento:true},
        {token:'fm_bbbbbbbbbbbbbbbbbbbbbbbb',nome:'Miguel',nascimento:'02/02/2020',temDocumento:true}
      ]};
    }else if(action==='publico_familia_membro'){
      const token=url.searchParams.get('token')||'';
      payload=token.includes('bbbb')
        ?{ok:true,documentoAcesso:MIGUEL_CNS,tipoDocumento:'CNS',familiaId:FAMILY,nome:'Miguel'}
        :{ok:true,documentoAcesso:'39053344705',tipoDocumento:'CPF',familiaId:FAMILY,nome:'Maria'};
    }else if(action==='publico_documento_complementar_result'){
      payload={ok:true,pendente:false,result:{ok:true,message:'CPF adicionado ao cadastro de Miguel.'}};
    }else{
      payload={ok:false,message:`Ação inesperada: ${action}`};
    }
    await route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:jsonp(callback,payload)});
  });

  await page.goto('portal-version.json');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body><form><label>Documento <input id="cpf" inputmode="numeric"><span id="cpfStatus"></span></label></form></body></html>`);
  await page.evaluate(({area,family,sub})=>{
    localStorage.setItem(`portalTacsFamiliaAutofillV1:${area}`,family);
    window.OneSignalDeferred={push(fn){fn({User:{PushSubscription:{id:sub}}});}};
  },{area:AREA,family:FAMILY,sub:SUB});
  await expect.poll(()=>page.evaluate(area=>localStorage.getItem(`portalTacsFamiliaAutofillV1:${area}`)||'',AREA)).toBe(FAMILY);

  await page.addScriptTag({url:'portal-identificacao-familia-v1.js?homologacao=bloco9'});
  await expect.poll(()=>page.locator('#cpfStatus').evaluate(el=>el.dataset.familyDocObserver||'')).toBe('1');
  await page.locator('#cpf').fill(NEW_CPF);
  await page.locator('#cpf').dispatchEvent('input');
  await page.evaluate(({documento})=>{
    document.dispatchEvent(new CustomEvent('tacs:documento-nao-localizado',{detail:{documento,tipoDocumento:'CPF',areaId:'JAPARANDUBA'}}));
  },{documento:NEW_CPF});

  await expect.poll(()=>familyConsults,{message:'O contrato semântico de documento não localizado precisa disparar a consulta da família lembrada.'}).toBeGreaterThan(0);
  expect(familyConsultFamily).toBe(FAMILY);
  expect(familyCallback).toMatch(/^__tacsFam_/);
  await expect(page.locator('#portalFamilyLookupV1')).not.toHaveAttribute('hidden','');
  await expect.poll(async()=>await page.locator('#portalFamilyLookupV1').innerText(),{
    message:`A resposta JSONP da família precisa renderizar os integrantes. callback=${familyCallback}; pageErrors=${pageErrors.join(' | ')}`
  }).toContain('De quem é este CPF?');
  expect(pageErrors).toEqual([]);
  await expect(page.getByRole('button',{name:/Maria/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Miguel/})).toBeVisible();
  expect(complementBody).toBe('');

  await page.getByRole('button',{name:/Miguel/}).click();
  await expect.poll(()=>complementBody).not.toBe('');
  const posted=new URLSearchParams(complementBody);
  expect(posted.get('action')).toBe('publico_documento_complementar');
  expect(posted.get('areaId')).toBe(AREA);
  expect(posted.get('documentoLocalizador')).toBe(MIGUEL_CNS);
  expect(posted.get('documentoNovo')).toBe(NEW_CPF);

  await expect(page.locator('#cpf')).toHaveValue(NEW_CPF);
  await expect(page.getByText(/Cadastro atualizado/)).toBeVisible();
});
