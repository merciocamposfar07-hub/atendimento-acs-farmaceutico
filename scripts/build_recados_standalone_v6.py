from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'teste-v1' / 'painel-recados-campanhas-v1.html'
CANDIDATE = ROOT / 'painel-recados-campanhas-candidato-v6.html'
OFFICIAL = ROOT / 'painel-oficial-recados-campanhas.html'
CENTRAL_JS = ROOT / 'central-administrativa-tacs.js'
CENTRAL_HTML = ROOT / 'central-administrativa-tacs.html'
REV = '20260816-recados-standalone-v6'
PROMOTE = '--promote' in sys.argv

s = BASE.read_text(encoding='utf-8')

# Identidade do painel oficial, sem carregador intermediário/document.write.
s = s.replace('../icons/', '/atendimento-acs-farmaceutico/icons/')
s = s.replace('../manifest-recados.webmanifest', '/atendimento-acs-farmaceutico/manifest-recados.webmanifest')
s = s.replace('<title>Recados e campanhas V1 • Portal TACS</title>', '<title>Painel oficial de recados e campanhas • Portal TACS</title>')
s = s.replace('AMBIENTE ISOLADO • FASE 4', 'PAINEL ADMINISTRATIVO OFICIAL')
s = s.replace('<h1>Recados e campanhas V1</h1>', '<h1>Recados e campanhas</h1>')
s = s.replace('O painel é isolado, mas um salvamento confirmado altera a planilha real. O Portal do Morador continua inalterado nesta etapa.', 'Painel administrativo oficial conectado ao Portal TACS. Alterações confirmadas são aplicadas somente à área validada pelo servidor.')
s = s.replace('Portal TACS • Painel administrativo isolado', 'Portal TACS • Painel administrativo oficial')
s = s.replace('Portal do Morador não foi modificado', 'Alterações confirmadas são aplicadas ao Portal do Morador')

# O controle legado continua no DOM para que o JS antigo não quebre, mas nunca aparece.
visual = '''\n<style id="recadosStandaloneV6Style">\n.preferenciaVisual,#alternarContraste{display:none!important}\n.numero,.areaEnvio,.item{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}\n.numero span,.areaEnvio p,.item .sub{color:#d8eef7!important}\n.item .corpo{border-top-color:rgba(216,238,247,.35)!important}\n.botao.verde{background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important}\n@media(max-width:430px){.sinal{white-space:normal!important;text-align:center;max-width:38%;overflow-wrap:anywhere}.item summary>div{min-width:0;flex:1 1 auto}}\n</style>\n'''
s = s.replace('</head>', visual + '</head>', 1)

# TACS-only é aplicado depois que o script principal já instalou seus listeners.
tacs_guard = '''\n<script id="tacsOnlyRecadosV6">\n(function(){\n  try{\n    var p=new URLSearchParams(location.search||'');\n    if(String(p.get('acesso')||'').toLowerCase()!=='tacs')return;\n    sessionStorage.removeItem('portalTacsAdminTokenV1');\n    var a=document.getElementById('loginAdminTab'),l=document.getElementById('adminLogin'),t=document.getElementById('loginTacsTab');\n    if(a)a.style.display='none';\n    if(l){l.classList.add('oculto');l.style.display='none'}\n    if(t)t.click();\n    var abas=t&&t.parentElement;if(abas)abas.style.gridTemplateColumns='1fr';\n  }catch(e){}\n}());\n</script>\n'''

# Meses carregam só ao abrir Campanhas. O login já estará pronto nesse momento.
months = f'''\n<script id="campanhasMesLoaderV6">\n(function(){{\n  var tentativa=0;\n  function carregar(){{\n    if(window.__portalTacsCampanhasPeriodoV1)return;\n    tentativa+=1;\n    var s=document.createElement('script');\n    s.src='/atendimento-acs-farmaceutico/campanhas-periodo-v1.js?v={REV}&t='+tentativa;\n    s.async=true;\n    s.onerror=function(){{\n      if(tentativa<4){{setTimeout(carregar,500*tentativa);return}}\n      console.error('Campanhas no mês não pôde ser carregado.');\n    }};\n    document.head.appendChild(s);\n  }}\n  var aba=document.getElementById('abaCampanhas');\n  if(aba)aba.addEventListener('click',carregar,{{once:true}});\n}}());\n</script>\n'''
s = s.replace('</body>', tacs_guard + months + '</body>', 1)

if not PROMOTE:
    CANDIDATE.write_text(s, encoding='utf-8')
    print('BUILD_RECADOS_CANDIDATE_V6_OK')
    raise SystemExit(0)

# Somente depois de o candidato público ser testado é que o mesmo conteúdo vira oficial.
OFFICIAL.write_text(s, encoding='utf-8')

c = CENTRAL_JS.read_text(encoding='utf-8')
replacement = f"if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v={REV}';"
c, n = re.subn(
    r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v[^;]*;",
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
print('PROMOTE_RECADOS_STANDALONE_V6_OK')
