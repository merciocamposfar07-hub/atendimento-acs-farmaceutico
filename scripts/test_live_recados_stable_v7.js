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

const assert=require('assert');
const {JSDOM,VirtualConsole}=require('jsdom');
const REV='20260816-recados-stable-v7';
const PATHNAME=process.env.RECADOS_LIVE_PATH||'painel-oficial-recados-campanhas.html';
const BASE='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/'+PATHNAME;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function openOnce(query,attempt){
  const errors=[];const vc=new VirtualConsole();
  vc.on('jsdomError',e=>errors.push('jsdom:'+String(e&&e.message||e)));
  vc.on('error',e=>errors.push('console:'+String(e)));
  const url=BASE+'?'+query+'&v='+REV+'&_='+Date.now()+'-'+attempt;
  const dom=await JSDOM.fromURL(url,{runScripts:'dangerously',resources: __portalTacsLocalResources(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
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
async function waitFor(fn,ms,label){
  const start=Date.now();
  while(Date.now()-start<ms){if(fn())return;await sleep(80)}
  throw new Error('Timeout aguardando '+label);
}
function click(w,node){node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,view:w}))}

(async()=>{
  const a=await open('area=JAPARANDUBA');
  const w=a.dom.window,d=w.document;
  const status=d.getElementById('loginStatus'),entrar=d.getElementById('entrar');
  assert(status&&entrar,'Painel ao vivo não montou login: '+a.url);
  assert.strictEqual(entrar.disabled,false,'Entrar iniciou bloqueado: '+status.textContent);
  assert.strictEqual(typeof w.PortalTacsRecadosCampanhasV12,'object','API principal do painel não inicializou.');

  const admin=d.getElementById('loginAdminTab'),tacs=d.getElementById('loginTacsTab');
  click(w,tacs);await sleep(30);assert(!d.getElementById('tacsLogin').classList.contains('oculto'),'Botão TACS não abre o formulário.');
  click(w,admin);await sleep(30);assert(!d.getElementById('adminLogin').classList.contains('oculto'),'Botão Administrador não volta ao formulário.');
  d.getElementById('pin').value='12';click(w,entrar);await sleep(20);assert(/PIN numérico/.test(status.textContent),'Botão Entrar não executou a validação local.');

  click(w,d.getElementById('abaCampanhas'));
  await waitFor(()=>w.__portalTacsCampanhasPeriodoV2===true,5000,'extensão Campanhas V2');
  await waitFor(()=>d.querySelectorAll('#campMonthTabs .camp-month-tab').length===12,5000,'12 meses');
  const monthBox=d.getElementById('campMonthTabs');
  assert(monthBox,'Grade dos meses ausente.');
  assert.strictEqual(w.getComputedStyle(monthBox).display,'grid','Meses ainda estão em faixa horizontal.');
  assert.notStrictEqual(w.getComputedStyle(monthBox).overflowX,'auto','Meses ainda exigem rolagem horizontal.');
  assert.deepStrictEqual([...monthBox.querySelectorAll('.camp-month-tab')].map(n=>n.textContent.trim()),MONTHS,'Meses estão faltando ou fora de ordem.');

  for(let i=0;i<12;i++){
    const btn=d.querySelector('#campMonthTabs .camp-month-tab[data-month="'+(i+1)+'"]');
    assert(btn,'Botão do mês '+MONTHS[i]+' ausente.');
    click(w,btn);await sleep(25);
    assert(d.getElementById('campPeriodSummary').textContent.startsWith(MONTHS[i]+' /'),'Botão '+MONTHS[i]+' não altera o período.');
    const active=[...d.querySelectorAll('#campMonthTabs .camp-month-tab[aria-selected="true"]')];
    assert.strictEqual(active.length,1,'Mais de um mês ficou ativo após clicar em '+MONTHS[i]+'.');
    assert.strictEqual(active[0].textContent.trim(),MONTHS[i],'Mês ativo incorreto após clicar em '+MONTHS[i]+'.');
  }

  const nova=d.getElementById('novaCampanha');click(w,nova);await sleep(30);
  const formCamp=d.getElementById('formNovaCampanha');
  assert(!formCamp.classList.contains('oculto'),'Criar nova campanha não abre o formulário.');
  assert(formCamp.querySelector('[name="ano"]')&&formCamp.querySelector('[name="mes"]'),'Campos Ano/Mês não foram montados na nova campanha.');
  click(w,formCamp.querySelector('.cancelarNovaCampanha'));await sleep(20);
  assert(formCamp.classList.contains('oculto'),'Cancelar nova campanha não fecha o formulário.');

  click(w,d.getElementById('abaRecados'));await sleep(20);
  assert(!d.getElementById('secaoRecados').classList.contains('oculto'),'Botão Recados não volta para a seção Recados.');
  click(w,d.getElementById('novoRecado'));await sleep(20);
  const formRec=d.getElementById('formNovoRecado');assert(!formRec.classList.contains('oculto'),'Criar novo recado não abre o formulário.');
  click(w,formRec.querySelector('.cancelarNovoRecado'));await sleep(20);assert(formRec.classList.contains('oculto'),'Cancelar recado não fecha o formulário.');

  for(let i=0;i<12;i++){
    click(w,d.getElementById(i%2?'abaCampanhas':'abaRecados'));
    await sleep(10);
  }
  click(w,d.getElementById('abaCampanhas'));await sleep(20);
  const dezembro=d.querySelector('#campMonthTabs .camp-month-tab[data-month="12"]');click(w,dezembro);await sleep(40);
  assert(d.getElementById('campPeriodSummary').textContent.startsWith('Dezembro /'),'Interface deixou de responder após uso repetido dos botões.');

  const fake=d.createElement('details');fake.className='item';fake.innerHTML='<summary><div><h3>Teste</h3></div><span class="sinal ativo">Ativo</span></summary>';d.body.appendChild(fake);
  const badge=fake.querySelector('.sinal');const cs=w.getComputedStyle(badge);
  assert.strictEqual(cs.whiteSpace,'nowrap','Selo Ativo ainda permite quebrar a palavra.');
  assert.notStrictEqual(cs.maxWidth,'38%','Selo Ativo ainda está comprimido pelo CSS antigo.');
  fake.remove();

  const runtimeErrors=a.errors.filter(x=>/^window:/.test(x));
  assert.strictEqual(runtimeErrors.length,0,'Erros JavaScript no painel: '+runtimeErrors.join(' | '));
  console.log('ADMIN_BUTTONS_OK');
  console.log('MONTHS_12_GRID_OK '+MONTHS.join(','));
  console.log('CREATE_CANCEL_OK');
  console.log('ACTIVE_BADGE_OK');
  w.close();

  const b=await open('area=SITIO_MATIAS&acesso=tacs');
  const wd=b.dom.window,dd=wd.document;
  assert(dd.getElementById('loginAdminTab')&&wd.getComputedStyle(dd.getElementById('loginAdminTab')).display==='none','Administrador geral aparece no acesso TACS.');
  assert(!dd.getElementById('tacsLogin').classList.contains('oculto'),'Acesso TACS não abre diretamente no formulário TACS.');
  click(wd,dd.getElementById('abaCampanhas'));
  await waitFor(()=>dd.querySelectorAll('#campMonthTabs .camp-month-tab').length===12,5000,'12 meses no acesso TACS');
  const nov=dd.querySelector('#campMonthTabs .camp-month-tab[data-month="11"]');click(wd,nov);await sleep(40);
  assert(dd.getElementById('campPeriodSummary').textContent.startsWith('Novembro /'),'Botões de mês falham no acesso TACS.');
  console.log('TACS_BUTTONS_OK');
  wd.close();
  console.log('RECADOS_STABLE_V7_LIVE_OK path='+PATHNAME);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
