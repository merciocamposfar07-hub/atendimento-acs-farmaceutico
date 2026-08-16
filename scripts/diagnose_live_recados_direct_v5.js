'use strict';
const {JSDOM, VirtualConsole}=require('jsdom');
const URL='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?area=JAPARANDUBA&diag='+Date.now();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const messages=[];
  const vc=new VirtualConsole();
  ['jsdomError','error','warn','log'].forEach(k=>vc.on(k,(...a)=>messages.push(k+': '+a.map(x=>x&&x.stack||String(x)).join(' '))));
  const dom=await JSDOM.fromURL(URL,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.alert=()=>{};w.confirm=()=>false;
    w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
    w.addEventListener('error',e=>messages.push('window.onerror: '+(e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||0)+':'+(e.colno||0)));
    w.addEventListener('unhandledrejection',e=>messages.push('unhandled: '+String(e.reason&&e.reason.stack||e.reason)));
  }});
  const d=dom.window.document;
  await sleep(2500);
  const status=d.getElementById('loginStatus');
  const entrar=d.getElementById('entrar');
  console.log('URL='+URL);
  console.log('TITLE='+d.title);
  console.log('STATUS='+(status?status.textContent.trim():'<missing>'));
  console.log('ENTRAR='+(entrar?'exists disabled='+entrar.disabled:'missing'));
  console.log('TACS_TAB='+(!!d.getElementById('loginTacsTab')));
  console.log('PORTAL_API='+(typeof dom.window.PortalTacsRecadosCampanhasV12));
  console.log('READY='+d.readyState);
  console.log('ERRORS='+JSON.stringify(messages.slice(0,30)));
  if(status&&entrar&&!entrar.disabled&&typeof dom.window.PortalTacsRecadosCampanhasV12==='object'){
    console.log('DIRECT_BASE_FUNCTIONAL_OK');dom.window.close();return;
  }
  console.log('BODY_HEAD='+d.body.innerHTML.slice(0,1800).replace(/\s+/g,' '));
  dom.window.close();process.exit(2);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
