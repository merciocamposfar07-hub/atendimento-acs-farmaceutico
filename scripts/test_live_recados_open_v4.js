'use strict';

// PORTAL_TACS_JSDOM_LOCAL_ASSETS_V1
const {ResourceLoader: __PortalTacsResourceLoader} = require('jsdom');
const __portalTacsFs = require('node:fs');
const __portalTacsPath = require('node:path');
class __PortalTacsLocalResourceLoader extends __PortalTacsResourceLoader {
  fetch(url) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { return null; }
    const prefix = '/atendimento-acs-farmaceutico/';
    if (!parsed.pathname.startsWith(prefix)) return null;
    const relative = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\/+/, '');
    const root = __portalTacsPath.resolve(__dirname, '..');
    const target = __portalTacsPath.resolve(root, relative);
    if (target !== root && !target.startsWith(root + __portalTacsPath.sep)) return null;
    if (!__portalTacsFs.existsSync(target) || !__portalTacsFs.statSync(target).isFile()) return null;
    return Promise.resolve(__portalTacsFs.readFileSync(target));
  }
}
function __portalTacsLocalResources(){ return new __PortalTacsLocalResourceLoader(); }

const assert = require('assert');
const {JSDOM, VirtualConsole} = require('jsdom');
const REV='20260816-recados-emergency-v4';
const URL='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area=JAPARANDUBA&v='+REV+'&_='+Date.now();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const vc=new VirtualConsole();
  const errors=[];
  vc.on('jsdomError',e=>errors.push(String(e&&e.message||e)));
  const dom=await JSDOM.fromURL(URL,{runScripts:'dangerously',resources: __portalTacsLocalResources(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.fetch=(input,opts)=>global.fetch(new URL(String(input),w.location.href).href,opts);
    w.alert=()=>{};
    w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  }});
  const w=dom.window,d=w.document;
  for(let i=0;i<40;i++){await sleep(250);const b=d.getElementById('entrar'),s=d.getElementById('loginStatus');if(b&&s&&!b.disabled&&!/Verificando|Executando/.test(s.textContent||''))break;}
  const entrar=d.getElementById('entrar'),status=d.getElementById('loginStatus'),tacsTab=d.getElementById('loginTacsTab'),adminTab=d.getElementById('loginAdminTab'),tacsLogin=d.getElementById('tacsLogin'),adminLogin=d.getElementById('adminLogin');
  assert(entrar&&status,'Painel ao vivo não montou controles de acesso.');
  assert(!entrar.disabled,'Botão Entrar continua bloqueado. Status: '+status.textContent);
  assert(!/Verificando o painel administrativo oficial|Executando testes internos/.test(status.textContent||''),'Painel continua travado: '+status.textContent);
  tacsTab.click();await sleep(60);assert(!tacsLogin.classList.contains('oculto'),'Aba TACS não responde.');
  adminTab.click();await sleep(60);assert(!adminLogin.classList.contains('oculto'),'Aba Administrador não responde.');
  console.log('LIVE_RECADOS_OPEN_V4_OK');
  console.log('STATUS='+status.textContent.trim());
  if(errors.length)console.log('WARNINGS='+errors.slice(0,5).join(' | '));
  w.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
