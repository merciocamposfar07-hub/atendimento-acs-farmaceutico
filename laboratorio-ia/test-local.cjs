const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/supervisor-client.js','utf8');
function boot(storage=new Map(),blocked=false){
 const nodes=new Map(),events={},timers=[],requests=[];
 function element(){const children=new Map();return {style:{},dataset:{},nodeType:1,textContent:'',setAttribute(){},appendChild(n){if(n.id)nodes.set(n.id,n)},querySelector(s){if(!children.has(s))children.set(s,element());return children.get(s)},querySelectorAll(){return []},matches(){return false},addEventListener(){}}}
 const body=element(),document={body,head:element(),documentElement:element(),visibilityState:'visible',getElementById:id=>nodes.get(id),createElement:element,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const localStorage={getItem:k=>{if(blocked)throw Error('disabled');return storage.get(k)||null},setItem:(k,v)=>{if(blocked)throw Error('disabled');storage.set(k,v)}};
 const context={document,localStorage,sessionStorage:{getItem:()=>null,setItem(){}},location:{pathname:'/moradores',search:'?supervisorApi=https://script.google.com/macros/s/old/exec',href:'https://lab.example/moradores',hash:''},navigator:{onLine:true},performance:{timeOrigin:Date.now(),now:()=>1,getEntriesByType:()=>[]},history:{pushState(){},replaceState(){}},URL,URLSearchParams,Date,Math,Promise,Set,CustomEvent:function(type,o){this.type=type;this.detail=o.detail},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval:()=>1,clearInterval(){},addEventListener:(type,fn)=>{events[type]=fn},dispatchEvent(){},fetch:()=>{requests.push(1);return Promise.resolve({ok:true})},getComputedStyle:()=>({display:'none'})};
 context.window=context;vm.runInNewContext(source,context);
 return {api:context.ConectaSupervisorIA,context,events,requests,storage,timers};
}
test('30 repetições são um incidente; persistem ao reabrir',()=>{
 const b=boot();const data={modulo:'moradores',funcao:'carregar',mensagem:'Demorou 900 ms'};
 const id=b.api.incidente('LENTO',data);
 for(let i=0;i<29;i++)assert.equal(b.api.incidente('LENTO',{...data,mensagem:'Demorou 950 ms'}),id);
 assert.equal(b.api.pendentes().length,1);assert.equal(b.api.pendentes()[0].ocorrencias,30);
 const next=boot(b.storage);assert.equal(next.api.incidente('LENTO',data),id);
 assert.equal(next.api.pendentes()[0].ocorrencias,31);
});
test('agrupamento exige operação explícita; não confirma causa',()=>{
 const b=boot();const a=b.api.incidente('LENTO',{operacaoId:'op-1'});
 assert.equal(b.api.incidente('LOADER',{operacaoId:'op-1'}),a);
 assert.notEqual(b.api.incidente('LOADER',{operacaoId:'op-2',modulo:'outro'}),a);
 assert.notEqual(b.api.incidente('JS_ERROR',{mensagem:'erro distinto'}),a);
 assert.equal(b.api.pendentes()[0].causaConfirmada,false);
});
test('limite remoto zero mesmo com endpoint e flush manual',async()=>{
 const b=boot();b.api.incidente('JS_ERROR',{mensagem:'teste'});b.api.flush();b.events.online();
 assert.equal(b.api.endpoint(),'');assert.equal(b.api.estado().limiteGastoUSD,0);
 assert.equal(b.requests.length,0);assert.equal(b.api.pendentes()[0].estado,'REGISTRADO_LOCAL_SEM_IA');
});
test('evidência incompleta não resolve; recorrência não aplica correção',()=>{
 const b=boot();const id=b.api.incidente('JS_ERROR',{mensagem:'falha'});
 assert.equal(b.api.registrarValidacao(id,{aprovado:true}).ok,false);
 assert.equal(b.api.pendentes().length,1);
 assert.equal(b.api.registrarValidacao(id,{aprovado:true,teste:'Teste sintético de contrato',causa:'causa teste',correcao:'correção teste',versao:'teste',commit:'a'.repeat(40)}).ok,true);
 assert.equal(b.api.pendentes().length,0);assert.equal(b.api.memoria().length,1);
 const repeated=b.api.incidente('JS_ERROR',{mensagem:'falha'});
 assert.notEqual(repeated,id);assert.equal(b.api.pendentes()[0].memoriaRelacionada.estado,'RECORRENCIA_A_INVESTIGAR');
});
test('armazenamento bloqueado não derruba monitor nem perde fila em memória',()=>{
 const b=boot(new Map(),true);const id=b.api.incidente('JS_ERROR',{mensagem:'erro'});
 assert.equal(b.api.incidente('JS_ERROR',{mensagem:'erro'}),id);
 assert.equal(b.api.pendentes()[0].ocorrencias,2);assert.equal(b.api.estado().armazenamentoPersistente,false);
});
test('offline registra e online não anuncia reparo nem dispara IA',()=>{
 const b=boot();b.context.navigator.onLine=false;b.events.offline();
 assert.equal(b.api.pendentes()[0].estado,'PENDENTE_REDE');
 b.context.navigator.onLine=true;b.events.online();
 assert.equal(b.api.pendentes()[0].estado,'REGISTRADO_LOCAL_SEM_IA');assert.equal(b.requests.length,0);
});
test('fila limitada e armazenamento malformado não interrompem cliente',()=>{
 const storage=new Map([['conectaSupervisorIA:incidentes:v1','{}']]);const b=boot(storage);
 for(let i=0;i<50;i++)b.api.incidente('ERRO',{mensagem:'Falha '+i});
 assert.equal(b.api.pendentes().length,40);
});
