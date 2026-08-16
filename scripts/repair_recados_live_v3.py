from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
WRAPPER = ROOT / 'painel-oficial-recados-campanhas.html'
BASE = ROOT / 'teste-v1' / 'painel-recados-campanhas-v1.html'
CENTRAL_JS = ROOT / 'central-administrativa-tacs.js'
CENTRAL_HTML = ROOT / 'central-administrativa-tacs.html'
REV = '20260816-recados-live-v3'

# 1) Volta o carregador de Recados/Campanhas exatamente ao último estado conhecido
# como funcional antes da inclusão dos meses. A extensão mensal passa a existir no
# painel-base, depois do script principal, para nunca bloquear o login/abertura.
old_wrapper = subprocess.check_output([
    'git', 'show',
    'a1d12621fff3a7ee9f611ae1cddf6154cfbf2fa2:painel-oficial-recados-campanhas.html'
], cwd=ROOT, text=True)
old_wrapper = old_wrapper.replace(
    'painel-recados-campanhas-v1.html?v=20260814-receipt-v110',
    f'painel-recados-campanhas-v1.html?v={REV}'
)
WRAPPER.write_text(old_wrapper, encoding='utf-8')

# 2) Alterações visuais mínimas e seguras diretamente no painel-base.
s = BASE.read_text(encoding='utf-8')
s = s.replace(
    '.preferenciaVisual{display:flex;justify-content:flex-end;margin-bottom:14px}',
    '.preferenciaVisual{display:none!important;justify-content:flex-end;margin-bottom:14px}'
)
s = s.replace(
    '.botao.verde{background:var(--v)}',
    '.botao.verde{background:linear-gradient(145deg,var(--p),var(--p2))}'
)

force_css = '''\n<style id="recadosPetroleoFixoV3">\n.preferenciaVisual,#alternarContraste{display:none!important}\n.numero,.areaEnvio,.item{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}\n.numero span,.areaEnvio p,.item .sub{color:#d8eef7!important}\n.item .corpo{border-top-color:rgba(216,238,247,.35)!important}\n.botao.verde{background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important}\n</style>\n'''
if 'recadosPetroleoFixoV3' not in s:
    s = s.replace('</head>', force_css + '</head>', 1)

month_tag = f'<script src="../campanhas-periodo-v1.js?v={REV}"></script>'
# Remove qualquer inclusão antiga dessa extensão no painel-base e reinstala uma única vez.
import re
s = re.sub(r'\s*<script src="\.\./campanhas-periodo-v1\.js\?v=[^"]+"></script>\s*', '\n', s)
s = s.replace('</body>', month_tag + '\n</body>', 1)
BASE.write_text(s, encoding='utf-8')

# 3) Invalidação de cache somente do módulo Recados/Campanhas na Central.
c = CENTRAL_JS.read_text(encoding='utf-8')
old = "if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;"
new = f"if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v={REV}';"
if old in c:
    c = c.replace(old, new)
else:
    c = re.sub(
        r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v='\+[^;]+;",
        new,
        c,
        count=1
    )
CENTRAL_JS.write_text(c, encoding='utf-8')

h = CENTRAL_HTML.read_text(encoding='utf-8')
h = re.sub(r'central-administrativa-tacs\.js\?v=[^\"\']+', f'central-administrativa-tacs.js?v={REV}', h, count=1)
CENTRAL_HTML.write_text(h, encoding='utf-8')

print('REPAIR_RECADOS_LIVE_V3_OK')
