'use strict';
const assert=require('assert');
const {JSDOM,VirtualConsole}=require('jsdom');
const REV='20260816-recados-standalone-v6';
const PATHNAME=process.env.RECADOS_LIVE_PATH||'painel-oficial-recados-campanhas.html';
const BASE='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/'+PATHNAME;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function openOnce(query,attempt){
  const errors=[];const vc=new VirtualConsole();
  vc.on('jsdomError',e=>errors.push('jsdom:'+String(e&&e.message||e)));
  vc.on('error',e=>errors.push('console:'+String(e)));
  const url=BASE+'?'+query+'&v='+REV+'&_='+Date.now()+'-'+attempt;
  const dom=await JSDOM.fromURL(url,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.alert=()=>{};w.confirm=()=>false;
    w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
    w.addEventListener('error',e=>errors.push('window:'+String(e.message||e.error||'erro')));
  }});
  await sleep(1200);
  return {dom,errors,url};
}
async function open(query){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{return await openOnce(query,attempt)}catch(e){last=e;console.log('OPEN_RETRY_'+attempt+' '+String(e&&e.message||e));await sleep(700*attempt)}
  }
  throw last;
}

(async()=>{
  const a=await open('area=JAPARANDUBA');
  const w=a.dom.window,d=w.document;
  const status=d.getElementById('loginStatus'),entrar=d.getElementById('entrar');
  assert(status&&entrar,'Painel ao vivo não montou login: '+a.url);
  assert.strictEqual(entrar.disabled,false,'Entrar está bloqueado: '+status.textContent);
  assert(!/Verificando|Executando testes/.test(status.textContent||''),'Status ficou travado: '+status.textContent);
  assert.strictEqual(typeof w.PortalTacsRecadosCampanhasV12,'object','API do painel principal não foi inicializada.');

  const tacs=d.getElementById('loginTacsTab'),admin=d.getElementById('loginAdminTab');
  tacs.click();await sleep(40);assert(!d.getElementById('tacsLogin').classList.contains('oculto'),'Aba TACS não responde.');
  admin.click();await sleep(40);assert(!d.getElementById('adminLogin').classList.contains('oculto'),'Aba Administrador não responde.');

  const contrast=d.getElementById('alternarContraste');
  assert(contrast,'Controle legado necessário ao script sumiu do DOM.');
  assert(w.getComputedStyle(contrast).display==='none'||w.getComputedStyle(contrast.parentElement).display==='none','Botão de contraste está visível.');

  d.getElementById('abaCampanhas').click();
  for(let i=0;i<50;i++){if(d.querySelectorAll('#campMonthTabs .camp-month-tab').length===12)break;await sleep(150)}
  const months=[...d.querySelectorAll('#campMonthTabs .camp-month-tab')].map(x=>x.textContent.trim());
  assert.deepStrictEqual(months,['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],'Campanhas no mês não carregou os 12 meses. Erros: '+a.errors.join(' | '));
  assert(d.getElementById('campPeriodBox'),'Bloco Campanhas no mês ausente.');
  console.log('ADMIN_LIVE_OK path='+PATHNAME+' status='+status.textContent.trim());
  console.log('MONTHS_LIVE_OK '+months.join(','));
  if(a.errors.length)console.log('ADMIN_WARNINGS='+a.errors.slice(0,8).join(' | '));
  w.close();

  const b=await open('area=SITIO_MATIAS&acesso=tacs');
  const wd=b.dom.window,dd=wd.document;
  const tStatus=dd.getElementById('loginStatus'),tEnter=dd.getElementById('entrarTacs');
  assert(tStatus&&tEnter,'Painel TACS ao vivo não montou acesso.');
  assert.strictEqual(tEnter.disabled,false,'Entrar TACS ficou bloqueado.');
  const adminTab=dd.getElementById('loginAdminTab');
  assert(adminTab && wd.getComputedStyle(adminTab).display==='none','Administrador geral ainda aparece no acesso TACS.');
  assert(!dd.getElementById('tacsLogin').classList.contains('oculto'),'Login TACS não ficou ativo.');
  console.log('TACS_LIVE_OK path='+PATHNAME+' status='+tStatus.textContent.trim());
  if(b.errors.length)console.log('TACS_WARNINGS='+b.errors.slice(0,8).join(' | '));
  wd.close();
  console.log('RECADOS_STANDALONE_V6_LIVE_OK path='+PATHNAME);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
