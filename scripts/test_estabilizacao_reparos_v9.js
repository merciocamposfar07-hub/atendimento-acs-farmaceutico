const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {JSDOM}=require('jsdom');

const root=path.join(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'apps-script','ZZZZ_47_EstabilizacaoReparosV9.gs'),'utf8');
const frontend=fs.readFileSync(path.join(root,'portal-notification-repair-v9.js'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts','build_apps_script_release.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

// 1) Simula estados de reparo no backend: aguardando, detectado travado, automático travado e concluído.
const context={console,Date,Object,String,Number,Math,isFinite,Array};
vm.createContext(context);vm.runInContext(backend,context);
const now=new Date(2026,7,21,15,30,0);
let c=context.reparosV9ClassificarCiclo_({}, {reparoId:'r1',solicitadoEm:'2026-08-13 18:00:00'}, now);
assert.strictEqual(c.fase,'AGUARDANDO_PORTAL');assert.strictEqual(c.precisaMorador,true);
c=context.reparosV9ClassificarCiclo_({}, {reparoId:'r2',detectadoEm:'2026-08-21 15:20:00'}, now);
assert.strictEqual(c.fase,'TRAVADO_DETECTADO');assert.strictEqual(c.travado,true);assert.strictEqual(c.reexecutavel,true);
c=context.reparosV9ClassificarCiclo_({}, {reparoId:'r3',autoIniciadoEm:'2026-08-21 15:20:00'}, now);
assert.strictEqual(c.fase,'TRAVADO_AUTO');assert.strictEqual(c.travado,true);
c=context.reparosV9ClassificarCiclo_({}, {reparoId:'r4',concluidoEm:'2026-08-21 15:25:00'}, now);
assert.strictEqual(c.fase,'CONCLUIDO');assert.strictEqual(c.travado,false);

assert.match(build,/ZZZZ_47_EstabilizacaoReparosV9\.gs/,'A V9 precisa entrar no pacote oficial do Apps Script.');
assert.match(index,/portal-notification-repair-v9\.js\?v=[^"']+/,'O Portal precisa carregar o watchdog V9 com o carimbo integral da publicação.');
assert.doesNotMatch(frontend,/\.optOut\(/,'A estabilização V9 nunca deve desligar o Push para tentar repará-lo.');
assert.match(frontend,/tried>=2/,'A autorrecuperação deve ter limite de tentativas.');
assert.match(frontend,/AUTO_FALHOU/,'Falha automática precisa ser registrada.');
assert.match(frontend,/ACAO_MORADOR_NECESSARIA/,'Permissão ausente precisa virar ação do morador.');

async function simulateAutomaticRecovery(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="notificationOffer"></div><button id="notificationRepairButton" hidden></button><div id="notificationHelp"></div></body></html>',{url:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',runScripts:'outside-only'});
  const w=dom.window;let tag='',optInCalls=0,checkins=0,completion=null;const posts=[];
  w.PortalTacsArea={id:()=> 'JAPARANDUBA'};
  w.PortalTacsSaudeNotificacoes={checkin:async()=>{checkins++;return {ok:true,reparoPendente:false}}};
  w.fetch=async(url,opts)=>{posts.push(String(opts&&opts.body||''));return {ok:true}};
  const realAppend=w.document.head.appendChild.bind(w.document.head);
  w.document.head.appendChild=function(node){
    if(node&&node.tagName==='SCRIPT'&&node.src&&node.src.includes('publico_notificacao_reparo_result')){
      const u=new URL(node.src);const cb=u.searchParams.get('callback');setTimeout(()=>{if(typeof w[cb]==='function')w[cb]({ok:true,pendente:false,result:{ok:true,push:true,onesignalId:'push-v9'}})},0);return node;
    }
    return realAppend(node);
  };
  w.document.addEventListener('tacs:notificacao-reparo-concluido',e=>{completion=e.detail});
  w.eval(frontend);
  const deferred=w.OneSignalDeferred[w.OneSignalDeferred.length-1];
  const oneSignal={
    Notifications:{permission:true},
    User:{
      PushSubscription:{optedIn:true,id:'11111111-2222-4333-8444-555555555555',token:'token-v9',optIn:async()=>{optInCalls++},addEventListener:()=>{}},
      getTags:()=>({area_tacs:tag}),
      addTag:async(k,v)=>{if(k==='area_tacs')tag=v}
    }
  };
  deferred(oneSignal);
  const ok=await w.PortalTacsReparoV9.executarReparo({reparoId:'REPARO_SIMULADO_V9'});
  assert.strictEqual(ok,true,'A recuperação simulada deve concluir.');
  assert.strictEqual(optInCalls,1,'A V9 deve revalidar o Push sem optOut.');
  assert.strictEqual(tag,'JAPARANDUBA','A área precisa ser reconfirmada.');
  assert.ok(checkins>=1,'A baixa do reparo precisa ser conferida no servidor.');
  assert.ok(completion&&completion.automatico===true&&completion.v9===true,'A conclusão automática deve ser emitida para o fluxo existente.');
  assert.ok(posts.some(x=>x.includes('estado=AUTO_INICIADO')),'O início automático precisa ser registrado.');
  assert.ok(posts.some(x=>x.includes('action=publico_confirmar_reparo_notificacao')),'O Push técnico precisa ser realmente solicitado.');
  dom.window.close();
}

async function simulatePermissionBlocked(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="notificationOffer"></div><button id="notificationRepairButton" hidden></button><div id="notificationHelp"></div></body></html>',{url:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',runScripts:'outside-only'});
  const w=dom.window;const posts=[];
  w.PortalTacsArea={id:()=> 'JAPARANDUBA'};w.PortalTacsSaudeNotificacoes={checkin:async()=>({ok:true,reparoPendente:true,reparoId:'R'})};
  w.fetch=async(url,opts)=>{posts.push(String(opts&&opts.body||''));return {ok:true}};
  w.eval(frontend);
  const deferred=w.OneSignalDeferred[w.OneSignalDeferred.length-1];
  deferred({Notifications:{permission:false},User:{PushSubscription:{optedIn:false,id:'11111111-2222-4333-8444-555555555555',token:'',addEventListener:()=>{}},getTags:()=>({})}});
  const ok=await w.PortalTacsReparoV9.executarReparo({reparoId:'REPARO_SEM_PERMISSAO'});
  assert.strictEqual(ok,false);
  assert.strictEqual(w.document.getElementById('notificationRepairButton').hidden,false,'Sem permissão, Reparar agora deve ficar disponível.');
  assert.ok(posts.some(x=>x.includes('estado=ACAO_MORADOR_NECESSARIA')),'O sistema deve registrar que depende do morador.');
  dom.window.close();
}

(async()=>{
  await simulateAutomaticRecovery();
  await simulatePermissionBlocked();
  console.log('ESTABILIZACAO_REPAROS_V9_OK: estados travados, OneSignal, Push técnico, baixa e fallback manual simulados.');
})().catch(err=>{console.error(err);process.exit(1)});
