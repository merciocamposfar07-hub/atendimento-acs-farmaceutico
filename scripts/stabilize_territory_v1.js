'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

function file(rel){return path.join(ROOT,rel)}
function read(rel){return fs.readFileSync(file(rel),'utf8')}
function write(rel,content){fs.mkdirSync(path.dirname(file(rel)),{recursive:true});fs.writeFileSync(file(rel),content,'utf8')}
function replaceOnce(rel,before,after){
  const source=read(rel);
  const first=source.indexOf(before);
  if(first<0)throw new Error('Trecho não encontrado em '+rel+': '+before.slice(0,120));
  if(source.indexOf(before,first+before.length)>=0)throw new Error('Trecho repetido em '+rel+': '+before.slice(0,120));
  write(rel,source.slice(0,first)+after+source.slice(first+before.length));
}

// 1) A Central precisa propagar a área e o modo TACS aos painéis internos.
replaceOnce(
  'central-administrativa-tacs.js',
  "function moduleUrl(name){var area=encodeURIComponent(selectedAreaId);if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html';if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area;if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+'&v=20260815-territorial-v1';if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+'&v=20260815-territorial-v1';if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v=20260815-csv-auto-v5';if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;return ''}",
  "function moduleUrl(name){var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260815-stabilization-v1';if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision;if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v='+revision;if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v=20260815-csv-auto-v5';if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;return ''}"
);

// 2) No link exclusivo do TACS, Moradores não pode exibir nem reutilizar sessão de administrador geral.
replaceOnce(
  'teste-v1/painel-moradores-v2.html',
  '<script src="../admin-warmup.js?v=20260813-admin-v103"></script>\n<script src="painel-moradores-transport-v2.js?v=20260813-admin-v103"></script>',
  `<style id="tacs-only-moradores-style">
html.tacs-only-ui label[for="pin"],html.tacs-only-ui #pin,html.tacs-only-ui #login{display:none!important}
html.tacs-only-ui a[href*="painel-oficial-tacs-areas"]{display:none!important}
</style>
<script>
(function(){
  'use strict';
  var params=new URLSearchParams(location.search||'');
  var tacsOnly=String(params.get('acesso')||'').toLowerCase()==='tacs';
  if(!tacsOnly)return;
  sessionStorage.removeItem('portalTacsAdminTokenV1');
  document.documentElement.classList.add('tacs-only-ui');
  function aplicar(){
    document.body.classList.add('tacs-only-ui');
    var seal=document.querySelector('.seal');if(seal)seal.textContent='ACESSO DO TACS • MORADORES';
    var h1=document.querySelector('header h1');if(h1)h1.textContent='Moradores da minha área';
    var heading=document.getElementById('areaHeading');if(heading)heading.textContent='Acesso restrito à área vinculada ao seu CNS profissional.';
    var note=document.querySelector('main .note');if(note)note.textContent='PAINEL DE MORADORES: você visualiza e administra somente os moradores da sua própria área.';
    var panelTitle=document.querySelector('main .panel h2');if(panelTitle)panelTitle.textContent='Acesso individual do TACS';
    var adminLabel=document.querySelector('label[for="pin"]');if(adminLabel)adminLabel.hidden=true;
    var pin=document.getElementById('pin');if(pin)pin.hidden=true;
    var adminButton=document.getElementById('login');if(adminButton)adminButton.hidden=true;
    var tacsBox=document.querySelector('main .panel .area-control');
    if(tacsBox&&sessionStorage.getItem('portalTacsTerritorioTokenV1'))tacsBox.classList.add('hidden');
    var muted=document.querySelector('main .panel .muted');if(muted)muted.textContent='O TACS autenticado acessa somente os moradores da área vinculada ao próprio CNS.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aplicar,{once:true});else aplicar();
}());
</script>
<script src="../admin-warmup.js?v=20260813-admin-v103"></script>
<script src="painel-moradores-transport-v2.js?v=20260815-stabilization-v1"></script>`
);

// 3) Recados/campanhas: preservar administrador no acesso geral, ocultá-lo somente no link TACS.
replaceOnce(
  'painel-oficial-recados-campanhas.html',
  "    var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260814-receipt-v110';",
  "    var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260814-receipt-v110';\n    var params=new URLSearchParams(location.search||''),TACS_ONLY=String(params.get('acesso')||'').toLowerCase()==='tacs';\n    if(TACS_ONLY)sessionStorage.removeItem('portalTacsAdminTokenV1');"
);
replaceOnce(
  'painel-oficial-recados-campanhas.html',
  "      trocas.forEach(function(par){html=substituir(html,par[0],par[1])});\n      html=substituir(html,'</body>',complementoStatus()+'</body>');",
  `      trocas.forEach(function(par){html=substituir(html,par[0],par[1])});
      if(TACS_ONLY){
        html=substituir(html,'<html lang="pt-BR">','<html lang="pt-BR" class="tacs-only-ui">');
        html=substituir(html,'</head>','<style id="tacs-only-recados-style">html.tacs-only-ui #loginAdminTab,html.tacs-only-ui #adminLogin{display:none!important}html.tacs-only-ui .abas{grid-template-columns:1fr!important}</style></head>');
        html=substituir(html,'</body>','<scr'+'ipt>(function(){sessionStorage.removeItem("portalTacsAdminTokenV1");var a=document.getElementById("loginAdminTab"),l=document.getElementById("adminLogin"),t=document.getElementById("loginTacsTab");if(a)a.hidden=true;if(l)l.hidden=true;if(!sessionStorage.getItem("portalTacsTerritorioTokenV1")&&t)t.click();}());<\\/scr'+'ipt></body>');
      }
      html=substituir(html,'</body>',complementoStatus()+'</body>');`
);

// 4) Consulta pública de moradores: sempre envia a área e rejeita resposta de outra área.
replaceOnce(
  'moradores-autofill.js',
  "  var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec';",
  "  var API = String(window.TACS_ADMIN_API_URL || 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();"
);
replaceOnce(
  'moradores-autofill.js',
  `  function onlyDigits(value) {
    return String(value || '').replace(/\\D/g, '').slice(0, 15);
  }
`,
  `  function onlyDigits(value) {
    return String(value || '').replace(/\\D/g, '').slice(0, 15);
  }

  function normalizeArea(value) {
    var area = String(value == null ? '' : value).trim().toUpperCase();
    if (area.normalize) area = area.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    return area.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  }

  function portalAreaId() {
    var fromUrl = '';
    try {
      var params = new URLSearchParams(window.location.search || '');
      fromUrl = normalizeArea(params.get('areaId') || params.get('area') || params.get('territorio'));
    } catch (e) {}
    if (fromUrl) return fromUrl;
    var current = '';
    try {
      current = window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function'
        ? window.PortalTacsArea.id()
        : window.TACS_AREA_ID;
    } catch (e) {}
    return normalizeArea(current) || 'JAPARANDUBA';
  }
`
);
replaceOnce(
  'moradores-autofill.js',
  `      if (payload && payload.ok === true && payload.encontrado === true && fillFields(payload)) {
        setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
      } else if (payload && payload.ok === true && payload.encontrado === false) {`,
  `      if (payload && payload.ok === true && payload.encontrado === true) {
        var expectedArea = portalAreaId();
        var returnedArea = normalizeArea(payload.morador && payload.morador.areaId);
        if (!returnedArea || returnedArea !== expectedArea) {
          clearResidentFields();
          setStatus(status, 'Este cadastro não pertence à área deste TACS.', 'invalid');
          return;
        }
        if (fillFields(payload)) {
          setStatus(status, (validCns(input.value) ? 'CNS' : 'CPF') + ' encontrado ✓ Dados preenchidos automaticamente.', 'valid');
        } else {
          clearResidentFields();
          setStatus(status, 'O cadastro retornado está incompleto. Procure seu TACS.', 'invalid');
        }
      } else if (payload && payload.ok === true && payload.encontrado === false) {`
);
replaceOnce(
  'moradores-autofill.js',
  "      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();",
  "      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();"
);
replaceOnce(
  'moradores-autofill.js',
  "      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();",
  "      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();"
);

// 5) O Portal do Morador carrega a consulta territorial segura explicitamente e nunca mostra a identidade de outra área enquanto valida.
replaceOnce(
  'index.html',
  '  <title>TACS - Técnico Agente Comunitário de Saúde | Unidade de Saúde Posto Matias</title>\n',
  `  <title>TACS - Técnico Agente Comunitário de Saúde | Unidade de Saúde Posto Matias</title>
  <script>
  (function(){
    try{
      var p=new URLSearchParams(location.search||''),area=String(p.get('areaId')||p.get('area')||localStorage.getItem('portalTacsAreaIdV1')||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64);
      if(area&&area!=='JAPARANDUBA')document.documentElement.classList.add('territory-pending');
    }catch(e){}
  }());
  </script>
`
);
replaceOnce(
  'index.html',
  '    [hidden]{display:none!important}\n',
  "    [hidden]{display:none!important}\n    html.territory-pending .hero .identity span,html.territory-pending .hero .exclusive,html.territory-pending .hero .responsible b,html.territory-pending footer>div{visibility:hidden!important}\n"
);
replaceOnce(
  'index.html',
  '<script src="portal-public-data.js?v=20260812-multiarea-v1"></script>',
  '<script src="portal-public-data.js?v=20260815-territorial-v2"></script>'
);
replaceOnce(
  'index.html',
  '  <script src="portal-auto-update.js?v=20260812-v101"></script>',
  '  <script src="moradores-autofill.js?v=20260815-territorial-v2"></script>\n  <script src="portal-auto-update.js?v=20260812-v101"></script>'
);
replaceOnce(
  'portal-public-data.js',
  'portal-territory-branding.js?v=20260814-v1',
  'portal-territory-branding.js?v=20260815-territorial-v2'
);
replaceOnce(
  'portal-territory-branding.js',
  `    if(description)description.setAttribute('content','Canal do TACS - Técnico Agente Comunitário de Saúde '+identity.tacsNome+', vinculado à '+identity.unidadeNome+', para moradores de '+identity.areaNome+', Chã Grande/PE.');

    window.PortalTacsTerritoryIdentity=identity;`,
  `    if(description)description.setAttribute('content','Canal do TACS - Técnico Agente Comunitário de Saúde '+identity.tacsNome+', vinculado à '+identity.unidadeNome+', para moradores de '+identity.areaNome+', Chã Grande/PE.');

    document.documentElement.classList.remove('territory-pending');
    window.PortalTacsTerritoryIdentity=identity;`
);

// 6) Defesa no servidor: sem área explícita não existe busca pública; resposta de área diferente é bloqueada.
write('apps-script/ZZZZ_29_IsolamentoMoradorPublicoV1.gs',`/*
 * Portal TACS — isolamento territorial da consulta pública de moradores V1.0.0
 * Falha fechada: a consulta pública só ocorre com areaId explícito e a resposta
 * precisa confirmar exatamente a mesma área.
 */
var TACS_MORADORES_PUBLICO_TERRITORIAL_V1=Object.freeze({VERSAO:'1.0.0'});
var moradoresPublicoTerritorialV1BuscarAnterior_=
  typeof moradoresAdminV1BuscarPublico_==='function'?moradoresAdminV1BuscarPublico_:null;

function moradoresPublicoTerritorialV1Area_(valor){
  if(typeof moradoresAdminV1NormalizarAreaId_==='function'){
    return moradoresAdminV1NormalizarAreaId_(valor);
  }
  var area=String(valor==null?'':valor).trim().toUpperCase();
  if(area.normalize)area=area.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  return area.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}

function moradoresPublicoTerritorialV1Negar_(codigo,mensagem){
  return {ok:false,encontrado:false,code:codigo,message:mensagem};
}

if(moradoresPublicoTerritorialV1BuscarAnterior_){
  moradoresAdminV1BuscarPublico_=function(documento,areaSolicitada){
    var area=moradoresPublicoTerritorialV1Area_(areaSolicitada);
    if(!area){
      return moradoresPublicoTerritorialV1Negar_(
        'AREA_REQUIRED',
        'Área do atendimento não informada. Atualize o portal e tente novamente.'
      );
    }
    var resultado=moradoresPublicoTerritorialV1BuscarAnterior_(documento,area);
    if(resultado&&resultado.ok===true&&resultado.encontrado===true){
      var retornada=moradoresPublicoTerritorialV1Area_(resultado.morador&&resultado.morador.areaId);
      if(!retornada||retornada!==area){
        return moradoresPublicoTerritorialV1Negar_(
          'AREA_MISMATCH',
          'Cadastro bloqueado por divergência territorial. Procure seu TACS.'
        );
      }
    }
    return resultado;
  };
}
`);

replaceOnce(
  'scripts/build_apps_script_release.js',
  `  {
    source: 'apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs',
    marker: 'TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1'
  }
];`,
  `  {
    source: 'apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs',
    marker: 'TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1'
  },
  {
    source: 'apps-script/ZZZZ_29_IsolamentoMoradorPublicoV1.gs',
    marker: 'TACS_MORADORES_PUBLICO_TERRITORIAL_V1'
  }
];`
);

// 7) Teste de regressão específico para as quatro falhas relatadas.
write('scripts/test_territorial_stabilization_v1.js',`'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const get=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

const central=get('central-administrativa-tacs.js');
assert.match(central,/painel-moradores-v2\\.html\\?area=['"]?\\+area\\+access/);
assert.match(central,/painel-oficial-recados-campanhas\\.html\\?area=['"]?\\+area\\+access/);
assert.match(central,/tacsOnly=mode===['"]tacs['"]\\|\\|TACS_ONLY/);

const moradoresPanel=get('teste-v1/painel-moradores-v2.html');
assert.match(moradoresPanel,/tacs-only-ui/);
assert.match(moradoresPanel,/sessionStorage\\.removeItem\\(['"]portalTacsAdminTokenV1['"]\\)/);
assert.match(moradoresPanel,/Acesso individual do TACS/);

const recados=get('painel-oficial-recados-campanhas.html');
assert.match(recados,/TACS_ONLY/);
assert.match(recados,/loginAdminTab/);
assert.match(recados,/portalTacsAdminTokenV1/);

const autofill=get('moradores-autofill.js');
assert.match(autofill,/areaId=['"]? \\+ encodeURIComponent\\(portalAreaId\\(\\)\\)/.source?/$a/:/); // marcador substituído abaixo
assert.match(autofill,/[&?]areaId=' \\+ encodeURIComponent\\(portalAreaId\\(\\)\\)/);
assert.match(autofill,/returnedArea !== expectedArea/);
assert.match(autofill,/TACS_ADMIN_API_URL/);

const index=get('index.html');
assert.match(index,/territory-pending/);
assert.match(index,/moradores-autofill\\.js\\?v=20260815-territorial-v2/);

const branding=get('portal-territory-branding.js');
assert.match(branding,/classList\\.remove\\(['"]territory-pending['"]\\)/);

const backend=get('apps-script/ZZZZ_29_IsolamentoMoradorPublicoV1.gs');
assert.match(backend,/AREA_REQUIRED/);
assert.match(backend,/AREA_MISMATCH/);
assert.match(backend,/moradoresAdminV1BuscarPublico_=function/);

const build=get('scripts/build_apps_script_release.js');
assert.match(build,/ZZZZ_29_IsolamentoMoradorPublicoV1\\.gs/);
assert.match(build,/TACS_MORADORES_PUBLICO_TERRITORIAL_V1/);

console.log('Estabilização territorial: acessos TACS, identidade e moradores isolados por área validados.');
`.replace("assert.match(autofill,/areaId=['\"]? \\+ encodeURIComponent\\(portalAreaId\\(\\)\\)/.source?/$a/:/); // marcador substituído abaixo\n",''));

replaceOnce(
  'package.json',
  'node scripts/test_portal_territory_branding.js && node scripts/test_performance_v101.js',
  'node scripts/test_portal_territory_branding.js && node scripts/test_territorial_stabilization_v1.js && node scripts/test_performance_v101.js'
);

write('.github/apps-script-release-request',[
  'release=isolamento-territorial-moradores-1.0.0',
  'requested_at=2026-08-15T19:45:00Z',
  'source=estabilizacao-acesso-tacs-identidade-e-moradores',
  'commit=workflow-stabilization-v1'
].join('\n')+'\n');

console.log('Arquivos preparados para estabilização territorial V1.');
