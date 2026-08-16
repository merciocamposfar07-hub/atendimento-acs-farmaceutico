'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'central-tacs-login-rapido-v1.js'),'utf8');
const html='<!doctype html><html><body>'+
  '<section id="loginPanel">'+
  '<div class="login-tabs"><button id="tabAdmin" class="tab active">Administrador geral</button><button id="tabTacs" class="tab">TACS da área</button></div>'+
  '<div id="adminLogin">ADMIN</div>'+
  '<div id="tacsLogin" hidden><label for="tacsCns">CNS</label><input id="tacsCns"><label for="tacsPin">PIN</label><input id="tacsPin"><button id="loginTacs">Entrar</button></div>'+
  '<div id="loginStatus"></div></section></body></html>';

function boot(url,territoryToken){
  const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
  if(territoryToken)dom.window.sessionStorage.setItem('portalTacsTerritorioTokenV1',territoryToken);
  dom.window.localStorage.setItem('portalTacsDispositivoV1','device-test');
  dom.window.eval(source);
  return dom;
}

(async function(){
  let dom=boot('https://example.test/central-administrativa-tacs.html','territorio-token-valido');
  let w=dom.window;
  assert.equal(w.document.getElementById('tabAdmin').hidden,true,'Administrador geral deve desaparecer durante sessão TACS.');
  assert.equal(w.document.getElementById('adminLogin').hidden,true,'Formulário administrativo deve ficar oculto durante sessão TACS.');
  assert.equal(w.document.getElementById('tabTacs').hidden,false);
  assert.equal(w.document.getElementById('tacsLogin').hidden,false);
  assert.equal(w.document.querySelector('.login-tabs').style.gridTemplateColumns,'1fr');
  assert.equal(w.sessionStorage.getItem('portalTacsModoExclusivoV2'),'tacs');

  w.document.getElementById('tabAdmin').hidden=false;
  w.document.getElementById('adminLogin').hidden=false;
  await new Promise(resolve=>w.setTimeout(resolve,0));
  assert.equal(w.document.getElementById('tabAdmin').hidden,true,'Observer deve impedir reaparecimento do botão administrativo.');
  assert.equal(w.document.getElementById('adminLogin').hidden,true,'Observer deve impedir reaparecimento do login administrativo.');
  dom.window.close();

  dom=boot('https://example.test/central-administrativa-tacs.html?acesso=tacs','');
  w=dom.window;
  assert.equal(w.document.getElementById('tabAdmin').hidden,true,'Link dedicado TACS nunca deve exibir Administrador geral.');
  assert.equal(w.sessionStorage.getItem('portalTacsModoExclusivoV2'),'tacs');
  dom.window.close();

  dom=boot('https://example.test/central-administrativa-tacs.html','');
  w=dom.window;
  assert.equal(w.document.getElementById('tabAdmin').hidden,false,'Central geral deve continuar oferecendo administrador quando não houver sessão TACS.');
  assert.equal(w.document.getElementById('adminLogin').hidden,false);
  dom.window.close();

  assert.match(source,/sessionStorage\.setItem\(EXCLUSIVE_MODE_KEY,'tacs'\)/);
  assert.match(source,/tabAdmin\.hidden=true/);
  assert.match(source,/exclusiveObserver\.observe/);
  console.log('Acesso TACS exclusivo: Administrador geral não reaparece após o PIN.');
})().catch(error=>{console.error(error);process.exitCode=1;});
