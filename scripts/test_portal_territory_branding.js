'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(ROOT,'apps-script','ZZZZ_27_IdentidadePublicaAreaV1.gs'),'utf8');
const branding=fs.readFileSync(path.join(ROOT,'portal-territory-branding.js'),'utf8');
const institutional=fs.readFileSync(path.join(ROOT,'portal-institucional-suporte-v1.js'),'utf8');
const publicData=fs.readFileSync(path.join(ROOT,'portal-public-data.js'),'utf8');
const autoUpdate=fs.readFileSync(path.join(ROOT,'portal-auto-update.js'),'utf8');
const build=fs.readFileSync(path.join(ROOT,'scripts','build_apps_script_release.js'),'utf8');

assert.match(backend,/TACS_IDENTIDADE_PUBLICA_AREA_V1/);
assert.match(backend,/action!==['"]publico_identidade_area['"]/);
assert.match(backend,/areaId:areaId[\s\S]*areaNome:areaNome[\s\S]*unidadeNome:unidadeNome[\s\S]*tacsNome:tacsNome/);
assert.doesNotMatch(backend,/\b(cns|cpf|telefone|email|pinHash|pinSalt)\s*:/i,'A resposta pública não pode expor identificação privada do TACS.');
assert.match(build,/ZZZZ_27_IdentidadePublicaAreaV1\.gs/);
assert.match(build,/TACS_IDENTIDADE_PUBLICA_AREA_V1/);
assert.match(publicData,/portal-territory-branding\.js\?v=20260823-bloco18-footer-race-v1/);
assert.match(autoUpdate,/portal-institucional-suporte-v1\.js\?v=20260823-bloco18-footer-race-v1/);

const sandbox={
  console,
  ContentService:{MimeType:{JAVASCRIPT:'js',JSON:'json'},createTextOutput:v=>({value:v,setMimeType(){return this;}})},
  tacsTerritorioV1Id_:v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'_'),
  tacsTerritorioV1EncontrarArea_:id=>id==='MUNTUNS'
    ?{areaId:'MUNTUNS',areaNome:'Sítio Muntuns',unidadeId:'USF_MUNTUNS',unidadeNome:'USF Muntuns',tacsId:'TACS_2',ativa:true}
    :{areaId:'JAPARANDUBA',areaNome:'Sítio Japaranduba',unidadeId:'POSTO_MATIAS',unidadeNome:'POSTO_MATIAS',tacsId:'AG001',ativa:true},
  tacsTerritorioV1EncontrarTacs_:id=>id==='TACS_2'
    ?{tacsId:'TACS_2',nomeCompleto:'Maria da Silva',ativo:true,cnsProfissional:'000000000000000',cpf:'00000000000',telefone:'81999999999'}
    :null,
  doGet:function(){return null;},
  tratarGetPainelTacs_:function(){return null;}
};
vm.createContext(sandbox);vm.runInContext(backend,sandbox);
const muntuns=sandbox.identidadePublicaAreaV1Dados_('MUNTUNS');
assert.deepEqual(JSON.parse(JSON.stringify(muntuns)),{ok:true,versao:'1.0.0',areaId:'MUNTUNS',areaNome:'Sítio Muntuns',unidadeNome:'USF Muntuns',tacsNome:'Maria da Silva'});
assert.equal(Object.prototype.hasOwnProperty.call(muntuns,'cns'),false);
assert.equal(Object.prototype.hasOwnProperty.call(muntuns,'cpf'),false);
const japa=sandbox.identidadePublicaAreaV1Dados_('JAPARANDUBA');
assert.equal(japa.unidadeNome,'Unidade de Saúde Posto Matias');
assert.equal(japa.tacsNome,'Mércio José Campos dos Santos');

function portalHtml(){return '<!doctype html><html><head><meta name="description" content="original"><title>original</title></head><body><section class="panel"><header class="hero"><div class="identity"><div><strong>TACS - Técnico Agente Comunitário de Saúde</strong><span>Serviço vinculado à Unidade de Saúde Posto Matias</span><span>Sítio Japaranduba • Chã Grande/PE</span></div></div><p class="exclusive"><strong>Atendimento exclusivo</strong> aos moradores do Sítio Japaranduba - Unidade de Saúde Posto Matias.</p><div class="responsible"><b>Mércio José Campos dos Santos</b></div></header><section class="purpose"><p>Solicitar ou obter informações sobre serviços oferecidos pela Unidade de Saúde Posto Matias.</p></section><footer><div><strong>TACS - Técnico Agente Comunitário de Saúde</strong>Mércio José Campos dos Santos</div><div><strong>Serviço da Unidade de Saúde Posto Matias</strong>Sítio Japaranduba • Chã Grande/PE</div></footer></section></body></html>'}
const dom=new JSDOM(portalHtml(),{url:'https://example.test/?area=MUNTUNS',runScripts:'outside-only'});
dom.window.TACS_ADMIN_API_URL='';dom.window.TACS_AREA_ID='MUNTUNS';dom.window.PortalTacsArea={id:()=> 'MUNTUNS'};
dom.window.eval(branding);
assert.equal(dom.window.PortalTacsTerritoryBranding.apply({ok:true,areaId:'MUNTUNS',areaNome:'Sítio Muntuns',unidadeNome:'USF Muntuns',tacsNome:'Maria da Silva'}),true);
assert.match(dom.window.document.querySelector('.hero .identity span').textContent,/USF Muntuns/);
assert.equal(dom.window.document.querySelectorAll('.hero .identity span')[1].textContent,'Sítio Muntuns • Chã Grande/PE');
assert.equal(dom.window.document.querySelector('.hero .responsible b').textContent,'Maria da Silva');
assert.match(dom.window.document.querySelector('.hero .exclusive').textContent,/Sítio Muntuns/);
assert.equal(dom.window.document.querySelector('footer > div').childNodes[1].nodeValue,'Maria da Silva');
assert.match(dom.window.document.title,/USF Muntuns/);
assert.equal(dom.window.document.querySelector('.hero').getAttribute('style'),null,'Identidade territorial não deve alterar estilo do cabeçalho.');
dom.window.close();

function raceDom(){
  const race=new JSDOM(portalHtml(),{url:'https://example.test/atendimento-acs-farmaceutico/?area=MUNTUNS',runScripts:'outside-only'});
  race.window.TACS_ADMIN_API_URL='';
  race.window.TACS_AREA_ID='MUNTUNS';
  race.window.PortalTacsArea={id:()=> 'MUNTUNS'};
  return race;
}
function installInstitutional(race){
  race.window.eval(institutional);
  race.window.document.dispatchEvent(new race.window.Event('DOMContentLoaded'));
}
function assertInstitutionalTerritory(race){
  const meta=race.window.document.querySelector('.portal-footer-meta');
  assert.ok(meta,'Rodapé institucional precisa existir.');
  assert.deepEqual(Array.from(meta.childNodes).map(node=>node.textContent.trim()).filter(Boolean),['USF Muntuns','Sítio Muntuns • Chã Grande/PE']);
  assert.equal(race.window.document.querySelector('.portal-footer-owner span').textContent,'Mércio José Campos dos Santos','Identidade territorial não pode substituir a autoria da plataforma.');
}

const identityBeforeFooter=raceDom();
identityBeforeFooter.window.eval(branding);
assert.equal(identityBeforeFooter.window.PortalTacsTerritoryBranding.apply(muntuns),true);
assert.doesNotThrow(()=>installInstitutional(identityBeforeFooter),'Rodapé carregado depois da identidade não pode quebrar nem apagar o território.');
assertInstitutionalTerritory(identityBeforeFooter);
identityBeforeFooter.window.close();

const footerBeforeIdentity=raceDom();
installInstitutional(footerBeforeIdentity);
footerBeforeIdentity.window.eval(branding);
assert.doesNotThrow(()=>footerBeforeIdentity.window.PortalTacsTerritoryBranding.apply(muntuns),'Identidade carregada depois do rodapé não pode lançar removeChild.');
assertInstitutionalTerritory(footerBeforeIdentity);
assert.equal(footerBeforeIdentity.window.PortalTacsTerritoryIdentity.areaId,'MUNTUNS');
footerBeforeIdentity.window.close();

const domJapa=new JSDOM(portalHtml(),{url:'https://example.test/',runScripts:'outside-only'});
domJapa.window.TACS_ADMIN_API_URL='';domJapa.window.TACS_AREA_ID='JAPARANDUBA';domJapa.window.PortalTacsArea={id:()=> 'JAPARANDUBA'};
domJapa.window.eval(branding);
domJapa.window.PortalTacsTerritoryBranding.apply(japa);
assert.equal(domJapa.window.document.querySelector('.hero .identity span').textContent,'Serviço vinculado à Unidade de Saúde Posto Matias');
assert.equal(domJapa.window.document.querySelectorAll('.hero .identity span')[1].textContent,'Sítio Japaranduba • Chã Grande/PE');
assert.equal(domJapa.window.document.querySelector('.hero .responsible b').textContent,'Mércio José Campos dos Santos');
assert.match(domJapa.window.document.querySelector('.hero .exclusive').textContent,/aos moradores do Sítio Japaranduba - Unidade de Saúde Posto Matias\./);
domJapa.window.close();

console.log('Identidade territorial: dados públicos mínimos, Japaranduba preservada e cabeçalho dinâmico sem alteração de layout validados.');
