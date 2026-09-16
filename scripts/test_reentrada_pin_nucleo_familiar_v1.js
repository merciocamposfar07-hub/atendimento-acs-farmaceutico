'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const backend=fs.readFileSync('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs','utf8');
const pinLocal=fs.readFileSync('conecta-morador-pin-local-v2.js','utf8');
const session=fs.readFileSync('conecta-morador-session-v1.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const central=fs.readFileSync('central-administrativa-tacs.html','utf8');

new Function(backend);
new Function(pinLocal);
new Function(session);

const context={console};
vm.createContext(context);
vm.runInContext(backend,context);

const area={areaId:'JAPARANDUBA',areaNome:'Sitio Japaranduba',unidadeId:'POSTO_MATIAS',planilhaId:'PLANILHA',agenteId:'TACS'};
const moradores=[
  {area,row:2,chave:'CHAVE-SANDRIELLE',morador:{nome:'Sandrielle',cpf:'11111111111',cns:'',nascimento:'01/01/1990',endereco:'Sitio Japaranduba, 053.'}},
  {area,row:3,chave:'CHAVE-RICARDO',morador:{nome:'Ricardo',cpf:'22222222222',cns:'',nascimento:'02/02/1988',endereco:'Sitio Japaranduba, 053.'}}
];

context.conectaAcessoV1Areas_=()=>[area];
context.conectaAcessoV1RegistrosArea_=()=>moradores;
context.vinculoFamiliarNotifV1CodigoEndereco_=endereco=>/053/.test(endereco)?'053':'';
context.identificacaoFamiliarPublicaV1NormalizarFamilia_=valor=>String(valor||'').padStart(3,'0');
context.selecaoMembroFamiliaPublicaV1CriarLista_=(familia)=>{
  assert.equal(familia,'053');
  return moradores.map((item,index)=>({token:'fm_token_'+index.toString().padEnd(20,'x'),nome:item.morador.nome,nascimento:item.morador.nascimento,temDocumento:true}));
};

function acesso(chave,cpf,nome){
  const v=[];
  v[1]='JAPARANDUBA';v[2]=chave;v[3]=cpf;v[4]=nome;v[13]=false;
  return v;
}

for(const titular of [
  acesso('CHAVE-SANDRIELLE','11111111111','Sandrielle'),
  acesso('CHAVE-RICARDO','22222222222','Ricardo')
]){
  const nucleo=context.conectaAcessoV1NucleoFamiliar_(titular);
  assert.equal(nucleo.familiaId,'053');
  assert.deepEqual(Array.from(nucleo.membros,m=>m.nome),['Sandrielle','Ricardo']);
  assert.equal(nucleo.membros.filter(m=>m.responsavel).length,1);
}

assert.match(backend,/conectaAcessoV1CriarPin_[\s\S]*familiaId:nucleo\.familiaId,familia:nucleo\.membros/);
assert.match(backend,/conectaAcessoV1LoginMorador_[\s\S]*familiaId:nucleo\.familiaId,familia:nucleo\.membros/);
assert.match(backend,/conectaAcessoV1SessaoMorador_[\s\S]*familiaId:nucleo\.familiaId,familia:nucleo\.membros/);
assert.match(pinLocal,/familia:Array\.isArray\(r&&r\.familia\)\?r\.familia\.slice\(\):\[\]/);
assert.match(session,/mergeResidentFamily/);
assert.match(index,/conecta-morador-session-v1\.js\?v=20260916-pin-nucleo-familiar-v1/);
assert.match(central,/conecta-morador-pin-local-v2\.js\?v=20260916-pin-nucleo-familiar-v1/);

console.log('REENTRADA_PIN_NUCLEO_FAMILIAR_V1_OK: qualquer titular do PIN reabre Sandrielle e Ricardo no mesmo nucleo familiar.');
