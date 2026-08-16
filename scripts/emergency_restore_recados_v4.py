from pathlib import Path
import subprocess
import re

ROOT = Path(__file__).resolve().parents[1]
WRAPPER = ROOT / 'painel-oficial-recados-campanhas.html'
CENTRAL_JS = ROOT / 'central-administrativa-tacs.js'
CENTRAL_HTML = ROOT / 'central-administrativa-tacs.html'
REV = '20260816-recados-emergency-v4'

# Restaura exatamente o carregador anterior ao acréscimo dos meses, que era o estado funcional.
html = subprocess.check_output([
    'git', 'show',
    'a1d12621fff3a7ee9f611ae1cddf6154cfbf2fa2:painel-oficial-recados-campanhas.html'
], cwd=ROOT, text=True)
html = html.replace(
    'painel-recados-campanhas-v1.html?v=20260814-receipt-v110',
    f'painel-recados-campanhas-v1.html?v={REV}'
)
WRAPPER.write_text(html, encoding='utf-8')

c = CENTRAL_JS.read_text(encoding='utf-8')
new = f"if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v={REV}';"
c = re.sub(
    r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v=[^;]+;",
    new,
    c,
    count=1
)
CENTRAL_JS.write_text(c, encoding='utf-8')

h = CENTRAL_HTML.read_text(encoding='utf-8')
h = re.sub(r'central-administrativa-tacs\.js\?v=[^\"\']+', f'central-administrativa-tacs.js?v={REV}', h, count=1)
CENTRAL_HTML.write_text(h, encoding='utf-8')

print('EMERGENCY_RESTORE_RECADOS_V4_OK')
