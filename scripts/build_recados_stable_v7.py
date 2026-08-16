from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'teste-v1' / 'painel-recados-campanhas-v1.html'
CANDIDATE = ROOT / 'painel-recados-campanhas-candidato-v7.html'
OFFICIAL = ROOT / 'painel-oficial-recados-campanhas.html'
CENTRAL_JS = ROOT / 'central-administrativa-tacs.js'
CENTRAL_HTML = ROOT / 'central-administrativa-tacs.html'
REV = '20260816-recados-stable-v7'
PROMOTE = '--promote' in sys.argv

s = BASE.read_text(encoding='utf-8')

s = s.replace('../icons/', '/atendimento-acs-farmaceutico/icons/')
s = s.replace('../manifest-recados.webmanifest', '/atendimento-acs-farmaceutico/manifest-recados.webmanifest')
s = s.replace('<title>Recados e campanhas V1 • Portal TACS</title>', '<title>Painel oficial de recados e campanhas • Portal TACS</title>')
s = s.replace('AMBIENTE ISOLADO • FASE 4', 'PAINEL ADMINISTRATIVO OFICIAL')
s = s.replace('<h1>Recados e campanhas V1</h1>', '<h1>Recados e campanhas</h1>')
s = s.replace('O painel é isolado, mas um salvamento confirmado altera a planilha real. O Portal do Morador continua inalterado nesta etapa.', 'Painel administrativo oficial conectado ao Portal TACS. Alterações confirmadas são aplicadas somente à área validada pelo servidor.')
s = s.replace('Portal TACS • Painel administrativo isolado', 'Portal TACS • Painel administrativo oficial')
s = s.replace('Portal do Morador não foi modificado', 'Alterações confirmadas são aplicadas ao Portal do Morador')

visual = '''
<style id="recadosStableV7Style">
.preferenciaVisual,#alternarContraste{display:none!important}
.numero,.areaEnvio,.item{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}
.numero span,.areaEnvio p,.item .sub{color:#d8eef7!important}
.item .corpo{border-top-color:rgba(216,238,247,.35)!important}
.botao.verde{background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important}
.item summary{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important;gap:10px!important}
.item summary>div{min-width:0!important}
.sinal{justify-self:end!important;align-self:start!important;min-width:76px!important;max-width:none!important;white-space:nowrap!important;text-align:center!important;overflow-wrap:normal!important;word-break:normal!important;line-height:1.2!important}
.botao,.aba,.sinal{touch-action:manipulation}
@media(max-width:430px){.item summary{grid-template-columns:minmax(0,1fr) auto!important}.sinal{min-width:72px!important;font-size:.78rem!important;padding:6px 8px!important}}
</style>
'''
s = s.replace('</head>', visual + '</head>', 1)

tacs_guard = '''
<script id="tacsOnlyRecadosV7">
(function(){
  try{
    var p=new URLSearchParams(location.search||'');
    if(String(p.get('acesso')||'').toLowerCase()!=='tacs')return;
    sessionStorage.removeItem('portalTacsAdminTokenV1');
    var a=document.getElementById('loginAdminTab'),l=document.getElementById('adminLogin'),t=document.getElementById('loginTacsTab');
    if(a)a.style.display='none';
    if(l){l.classList.add('oculto');l.style.display='none'}
    if(t)t.click();
    var abas=t&&t.parentElement;if(abas)abas.style.gridTemplateColumns='1fr';
  }catch(e){}
}());
</script>
'''

months = f'''
<script id="campanhasMesLoaderV7">
(function(){{
  function carregar(){{
    if(window.__portalTacsCampanhasPeriodoV2)return;
    var s=document.createElement('script');
    s.src='/atendimento-acs-farmaceutico/campanhas-periodo-v2.js?v={REV}';
    s.async=true;
    s.onerror=function(){{console.error('Campanhas por mês não pôde ser carregado.')}};
    document.head.appendChild(s);
  }}
  var aba=document.getElementById('abaCampanhas');
  if(aba)aba.addEventListener('click',carregar,{{once:true}});
}}());
</script>
'''
s = s.replace('</body>', tacs_guard + months + '</body>', 1)

if not PROMOTE:
    CANDIDATE.write_text(s, encoding='utf-8')
    print('BUILD_RECADOS_CANDIDATE_V7_OK')
    raise SystemExit(0)

OFFICIAL.write_text(s, encoding='utf-8')

c = CENTRAL_JS.read_text(encoding='utf-8')
replacement = f"if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v={REV}';"
c, n = re.subn(
    r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v=[^']*';",
    replacement,
    c,
    count=1
)
if n != 1:
    raise SystemExit('Não foi possível atualizar a rota Recados na Central.')
CENTRAL_JS.write_text(c, encoding='utf-8')

h = CENTRAL_HTML.read_text(encoding='utf-8')
h, n = re.subn(r'central-administrativa-tacs\.js\?v=[^\"\']+', f'central-administrativa-tacs.js?v={REV}', h, count=1)
if n != 1:
    raise SystemExit('Não foi possível invalidar o cache da Central.')
CENTRAL_HTML.write_text(h, encoding='utf-8')
print('PROMOTE_RECADOS_STABLE_V7_OK')
