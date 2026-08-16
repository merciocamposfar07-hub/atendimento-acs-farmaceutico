from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PANEL = ROOT / 'painel-oficial-organizacoes-municipios.html'
CENTRAL_JS = ROOT / 'central-administrativa-tacs.js'
CENTRAL_HTML = ROOT / 'central-administrativa-tacs.html'
REV = '20260816-municipios-petroleo-v1'

s = PANEL.read_text(encoding='utf-8')
old_card = ".card,.area-row{min-width:0;border:2px solid #c3d4db;border-radius:18px;background:#fbfdfe;overflow:hidden}"
new_card = ".card,.area-row{min-width:0;border:2px solid var(--blue);border-radius:18px;background:linear-gradient(145deg,var(--p),var(--p2));color:#fff;overflow:hidden;box-shadow:0 8px 18px rgba(7,58,85,.18)}"
if old_card not in s:
    raise SystemExit('Regra original de card não encontrada; nenhuma alteração aplicada.')
s = s.replace(old_card, new_card, 1)

old_h = ".card h3,.area-row strong{margin:0;font-size:1.12rem;overflow-wrap:anywhere;word-break:break-word}"
new_h = ".card h3,.area-row strong{margin:0;font-size:1.12rem;color:#fff;overflow-wrap:anywhere;word-break:break-word}"
if old_h not in s:
    raise SystemExit('Regra de títulos dos cards não encontrada.')
s = s.replace(old_h, new_h, 1)

old_body = ".body{padding:0 14px 15px;border-top:1px solid #d9e3e7}"
new_body = ".body{padding:0 14px 15px;border-top:1px solid rgba(216,238,247,.35)}"
if old_body not in s:
    raise SystemExit('Regra de corpo dos cards não encontrada.')
s = s.replace(old_body, new_body, 1)

old_newbox = ".newbox{min-width:0;border:2px dashed #9bb8c5;border-radius:18px;padding:14px;margin-bottom:13px;background:#f7fbfc}"
new_newbox = ".newbox{min-width:0;border:2px solid var(--blue);border-radius:18px;padding:14px;margin-bottom:13px;background:linear-gradient(145deg,var(--p),var(--p2));color:#fff;box-shadow:0 8px 18px rgba(7,58,85,.18)}"
if old_newbox not in s:
    raise SystemExit('Regra original do balão de cadastro não encontrada.')
s = s.replace(old_newbox, new_newbox, 1)

anchor = ".empty{padding:17px;border:2px dashed #b8cbd4;border-radius:16px;text-align:center;color:var(--muted);font-weight:800}"
extra = anchor + ".newbox h2,.newbox label,.card .body label,.area-row label{color:#fff}.card .sub,.area-row .sub{color:#d8eef7}.newbox .check{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(216,238,247,.45)}"
if anchor not in s:
    raise SystemExit('Âncora visual não encontrada.')
s = s.replace(anchor, extra, 1)
PANEL.write_text(s, encoding='utf-8')

c = CENTRAL_JS.read_text(encoding='utf-8')
pattern = r"if\(name==='municipios'\)return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios\.html\?v='\+revision;"
replacement = "if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?v=" + REV + "';"
c, n = re.subn(pattern, replacement, c, count=1)
if n != 1:
    raise SystemExit('Rota Municípios da Central não encontrada.')
CENTRAL_JS.write_text(c, encoding='utf-8')

h = CENTRAL_HTML.read_text(encoding='utf-8')
h, n = re.subn(r'central-administrativa-tacs\.js\?v=[^\"\']+', 'central-administrativa-tacs.js?v=' + REV, h, count=1)
if n != 1:
    raise SystemExit('Versão do JavaScript da Central não encontrada.')
CENTRAL_HTML.write_text(h, encoding='utf-8')

print('MUNICIPIOS_PETROLEO_V1_OK')
