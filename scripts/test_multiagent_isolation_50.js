'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const agendas=read('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const publicIsolation=read('apps-script/ZZZZ_29_IsolamentoMoradorPublicoV1.gs');
const services=read('apps-script/ZZZZ_30_AutonomiaProfissionaisServicosV1.gs');
const central=read('central-administrativa-tacs.js');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  if(start<0)throw new Error('Função não encontrada: '+name);
  const brace=source.indexOf('{',start);
  let depth=0,quote='',escape=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i];
    if(quote){
      if(escape){escape=false;continue;}
      if(c==='\\'){escape=true;continue;}
      if(c===quote)quote='';
      continue;
    }
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error('Função incompleta: '+name);
}

// Blindagem estrutural: a sessão TACS é a fonte da área, nunca o parâmetro do navegador.
assert.match(territory,/if\(!admin\)\{[\s\S]*tacs=tacs\.filter\(function\(item\)\{return item\.tacsId===acesso\.tacsId;\}\);[\s\S]*areas=areas\.filter\(function\(item\)\{return item\.areaId===acesso\.areaId;\}\);/,
  'O backend territorial deve devolver ao TACS apenas seu cadastro e sua área.');
assert.match(agendas,/if\(acesso\.perfil==='TACS'\)\{[\s\S]*areaId=agendasProfissionaisTerritoriaisV1AreaId_\(acesso\.areaId\)/,
  'Agendas/profissionais devem derivar a área da sessão TACS.');
assert.match(services,/agendasProfissionaisTerritoriaisV1Encontrar_\(tabela,'ID',p\.id,contexto\.areaId\)/,
  'Serviço deve ser localizado dentro da área autenticada.');
assert.match(services,/agendasProfissionaisTerritoriaisV1Encontrar_\(prof,'ID',profissionalSolicitado,contexto\.areaId\)/,
  'Profissional associado deve pertencer à mesma área autenticada.');
assert.match(publicIsolation,/AREA_REQUIRED/);
assert.match(publicIsolation,/AREA_MISMATCH/);
assert.match(central,/if\(mode==='tacs'\)selectedAreaId=normArea\(areas\[0\]\.areaId\)/,
  'A Central deve fixar a área devolvida pela sessão TACS.');

let currentAccess=null;
const activeAreas=new Set(Array.from({length:50},(_,i)=>'AREA_'+String(i+1).padStart(3,'0')));
const sandbox={
  TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1:{
    AREA_PADRAO:'JAPARANDUBA',
    PERMISSAO_AGENDAS:'AGENDAS_GERENCIAR',
    PERMISSAO_PROFISSIONAIS:'PROFISSIONAIS_GERENCIAR'
  },
  tacsTerritorioV1ValidarAcesso_:()=>currentAccess,
  tacsTerritorioV1ExigirAdmin_:acesso=>{if(!acesso||acesso.perfil!=='ADMIN_GERAL')throw new Error('admin exigido');},
  tacsTerritorioV1EncontrarArea_:areaId=>activeAreas.has(areaId)||areaId==='JAPARANDUBA'?{areaId,ativa:true}:null,
  agendasProfissionaisTerritoriaisV1AreaId_:value=>String(value==null?'':value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64),
  agendasProfissionaisTerritoriaisV1Texto_:value=>String(value==null?'':value).trim()
};
vm.createContext(sandbox);
vm.runInContext(extractFunction(agendas,'agendasProfissionaisTerritoriaisV1Contexto_')+'\nthis.contexto=agendasProfissionaisTerritoriaisV1Contexto_;',sandbox);
const contexto=sandbox.contexto;
const permissions=['AGENDAS_GERENCIAR','PROFISSIONAIS_GERENCIAR'];
const actions=[
  ['admin_dados','agendas'],
  ['admin_dados','profissionais'],
  ['admin_salvar_agenda',''],
  ['admin_criar_profissional',''],
  ['admin_salvar_profissional',''],
  ['admin_salvar_servico','']
];

let checks=0;
for(let i=1;i<=50;i++){
  const own='AREA_'+String(i).padStart(3,'0');
  currentAccess={perfil:'TACS',tacsId:'TACS_'+String(i).padStart(3,'0'),areaId:own,operadorId:'TACS:'+i,permissoes:permissions.slice()};
  for(let j=1;j<=50;j++){
    const spoof='AREA_'+String(j).padStart(3,'0');
    for(const [action,scope] of actions){
      const p={areaId:spoof,area:spoof,escopo:scope};
      const result=contexto(p,action);
      assert.equal(result.areaId,own,`TACS ${i} não pode trocar sua área para ${spoof} em ${action}.`);
      assert.equal(result.perfil,'TACS');
      checks++;
    }
  }
}

// Permissões continuam obrigatórias mesmo na própria área.
currentAccess={perfil:'TACS',tacsId:'TACS_001',areaId:'AREA_001',operadorId:'TACS:1',permissoes:[]};
assert.throws(()=>contexto({areaId:'AREA_001',escopo:'agendas'},'admin_dados'),/não possui permissão/i);
assert.throws(()=>contexto({areaId:'AREA_001',escopo:'profissionais'},'admin_dados'),/não possui permissão/i);
assert.throws(()=>contexto({areaId:'AREA_001'},'admin_salvar_agenda'),/não possui permissão/i);
assert.throws(()=>contexto({areaId:'AREA_001'},'admin_salvar_profissional'),/não possui permissão/i);

// Administrador geral mantém capacidade explícita de selecionar qualquer área ativa.
currentAccess={perfil:'ADMIN_GERAL',areaId:'JAPARANDUBA',operadorId:'ADMIN_GERAL',permissoes:['*']};
for(let i=1;i<=50;i++){
  const area='AREA_'+String(i).padStart(3,'0');
  assert.equal(contexto({areaId:area,escopo:'profissionais'},'admin_dados').areaId,area);
  checks++;
}

assert.ok(checks>=15050,'A matriz multiagente deve executar pelo menos 15.050 verificações de isolamento/permissão.');
console.log(`Blindagem Multiagente V1: 50 TACS, 50 áreas e ${checks} verificações sem troca territorial pelo navegador.`);
