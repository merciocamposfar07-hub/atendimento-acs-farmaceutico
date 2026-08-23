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

  await page.route('**/macros/s/**', async route => {
    const request=route.request();
    if(request.method()==='POST'){
      complementBody=request.postData()||'';
      await route.fulfill({status:200,contentType:'text/plain',body:'OK'});
      return;
    }
    const url=new URL(request.url());
    const action=url.searchParams.get('action')||'';
    const callback=url.searchParams.get('callback')||'';
    let payload;
    if(action==='publico_familia_consultar'){
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
    await route.fulfill({status:200,contentType:'application/javascript',body:jsonp(callback,payload)});
  });

  await page.goto('portal-version.json');
  await page.setContent(`<!doctype html><html><head></head><body><form><label>Documento <input id="cpf" inputmode="numeric"><span id="cpfStatus"></span></label></form></body></html>`);
  await page.evaluate(({area,family,sub})=>{
    localStorage.setItem(`portalTacsFamiliaAutofillV1:${area}`,family);
    window.OneSignalDeferred={push(fn){fn({User:{PushSubscription:{id:sub}}});}};
  },{area:AREA,family:FAMILY,sub:SUB});

  await page.addScriptTag({url:'portal-identificacao-familia-v1.js?homologacao=bloco9'});
  await page.locator('#cpf').fill(NEW_CPF);
  await page.locator('#cpf').dispatchEvent('input');
  await page.locator('#cpfStatus').evaluate((el)=>{el.textContent='CPF não localizado nesta área. Tente informar o Cartão SUS (CNS).';});

  await expect(page.getByText('De quem é este CPF?')).toBeVisible();
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
