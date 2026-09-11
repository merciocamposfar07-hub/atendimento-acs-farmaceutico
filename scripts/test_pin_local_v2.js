'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {performance}=require('node:perf_hooks');

const read=p=>fs.readFileSync(p,'utf8');
const vaultSource=read('conecta-pin-local-v2.js');
const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const unified=read('conecta-acesso-unificado-v1.js');
const residentHook=read('conecta-morador-pin-local-v2.js');
const residentSession=read('conecta-morador-session-v1.js');
const warmup=read('admin-warmup.js');
const centralHtml=read('central-administrativa-tacs.html');
const indexHtml=read('index.html');

for(const [name,source] of Object.entries({
  vaultSource,central,quick,unified,residentHook,residentSession,warmup
})){
  assert.doesNotThrow(()=>new Function(source),name+' possui erro de sintaxe');
}

assert.match(vaultSource,/PBKDF2/);
assert.match(vaultSource,/AES-GCM/);
assert.match(vaultSource,/ITERATIONS=180000/);
assert.doesNotMatch(vaultSource,/localStorage\.setItem\([^\n]*pin/i);

const adminListener=central.slice(central.indexOf("el('loginAdmin').addEventListener"),central.indexOf("el('loginTacs').addEventListener"));
assert(adminListener.indexOf("abrirAcessoLocal('admin',pin)")<adminListener.indexOf("post('admin_login'"),
  'Administrador deve tentar o desbloqueio local antes da validação remota');
assert.match(central,/LOGOFF_COMO_BLOQUEIO_LOCAL_V2/);
assert.doesNotMatch(central,/if\(hasSession\)invalidarSessaoServidorEmSegundoPlano\(action,payload\)/);
assert.match(central,/Acesso liberado\. Sincronizando em segundo plano/);
assert.match(central,/PortalTacsCentralPinLocalV2/);

const quickListener=quick.slice(quick.indexOf("loginBtn.addEventListener('click'"),quick.indexOf('HOMOLOGACAO_ARQUITETURAL_V1'));
assert(quickListener.indexOf("api.abrir('tacs',pin)")<quickListener.indexOf("post(action,payload"),
  'TACS deve tentar o desbloqueio local antes da validação remota');
assert.match(quick,/quickKey:profile\.quickKey/);
assert.match(quick,/api\.sincronizar\('tacs'/);

assert.match(residentHook,/v\.abrir\('morador',pin\)/);
assert.match(residentHook,/backgroundLogin\(p,pin\)/);
assert(residentHook.indexOf('backgroundLogin(p,pin)')<residentHook.indexOf('openPortal(saved.snapshot||saved)'),
  'Morador deve iniciar sincronização em segundo plano antes de navegar, sem esperar a resposta');
assert.match(unified,/hook\.registrar\(pin,r\)/);
assert.match(unified,/hook\.registrar\(a,r\)/);
assert.match(residentSession,/if\(local\)applyResident\(local,true\)/);
assert.match(residentSession,/waitBackgroundLogin\(\)/);
assert.match(residentSession,/removeResidentVault\(\)/);

assert(!warmup.includes('estado.ready=iniciar();'),'Tela de PIN não deve chamar Apps Script no carregamento inicial');
assert(centralHtml.indexOf('conecta-pin-local-v2.js')<centralHtml.indexOf('central-administrativa-tacs.js'));
assert(centralHtml.includes('conecta-morador-pin-local-v2.js'));
assert(indexHtml.indexOf('conecta-pin-local-v2.js')<indexHtml.indexOf('conecta-morador-session-v1.js'));

(async()=>{
  const store=new Map();
  const context={
    window:null,
    crypto:webcrypto,
    TextEncoder,TextDecoder,
    localStorage:{
      getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>store.set(k,String(v)),
      removeItem:k=>store.delete(k)
    },
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    atob:s=>Buffer.from(s,'base64').toString('binary')
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(vaultSource,context);
  const api=context.ConectaPinLocalV2;
  for(const scope of ['admin','tacs','morador']){
    const t0=performance.now();
    assert.equal(await api.guardar(scope,'2468',{device:'iphone-teste',token:'token-'+scope,context:{areas:[{areaId:'JAPARANDUBA'}]}}),true);
    const ok=await api.abrir(scope,'2468');
    const elapsed=performance.now()-t0;
    assert.equal(ok.token,'token-'+scope);
    assert.equal(await api.abrir(scope,'1357'),null,'PIN incorreto deve bloquear '+scope);
    assert(elapsed<1500,'Desbloqueio local muito lento em '+scope+': '+elapsed.toFixed(1)+' ms');
  }
  console.log('PIN_LOCAL_V2_OK: Administrador, TACS e Morador usam PIN local primeiro; PIN incorreto bloqueado.');
})().catch(err=>{console.error(err);process.exitCode=1});
