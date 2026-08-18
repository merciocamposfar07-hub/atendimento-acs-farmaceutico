from pathlib import Path
import json
import re

ROOT = Path('.')
V = '20260818-icones-oficiais-v1'
PORTAL_SVG = '/atendimento-acs-farmaceutico/icons/portal-tacs-oficial.svg?v=' + V
PORTAL_512 = '/atendimento-acs-farmaceutico/icons/portal-tacs-oficial-512.png?v=' + V
ADMIN_SVG = '/atendimento-acs-farmaceutico/icons/central-admin-saude.svg?v=' + V
ADMIN_512 = '/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=' + V
TACS_AREA_512 = '/atendimento-acs-farmaceutico/icons/painel-tacs-areas-512.png?v=' + V


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)

# Portal público
p = ROOT / 'index.html'
s = p.read_text(encoding='utf-8')
s = replace_once(s,
    '<link rel="icon" type="image/svg+xml" href="/atendimento-acs-farmaceutico/icons/painel-moradores.svg">',
    f'<link rel="icon" type="image/svg+xml" href="{PORTAL_SVG}">',
    'favicon Portal')
s = replace_once(s,
    '<link rel="apple-touch-icon" sizes="180x180" href="/atendimento-acs-farmaceutico/icons/painel-moradores-180.png">',
    f'<link rel="apple-touch-icon" href="{PORTAL_512}">\n  <link rel="manifest" href="/atendimento-acs-farmaceutico/manifest.webmanifest?v={V}">',
    'apple touch Portal')
old_mark = '.mark{width:64px;height:64px;display:grid;place-items:center;flex:0 0 auto;border:2px solid #19b670;border-radius:18px;background:#061b2c;color:#fff;font-size:30px;font-weight:950;box-shadow:0 12px 28px rgba(0,0,0,.28)}'
new_mark = old_mark[:-1] + ';overflow:hidden;padding:0}' + '.mark img{width:100%;height:100%;display:block;object-fit:cover;border-radius:inherit}'
s = replace_once(s, old_mark, new_mark, 'CSS mark Portal')
s, n = re.subn(r'<div class="mark"([^>]*)>\s*T\s*</div>', f'<div class="mark"\\1><img src="{PORTAL_512}" alt=""></div>', s, count=1)
if n != 1:
    raise SystemExit(f'marca T do Portal: esperado 1, encontrado {n}')
p.write_text(s, encoding='utf-8')

# Manifest Portal
mp = ROOT / 'manifest.webmanifest'
m = json.loads(mp.read_text(encoding='utf-8'))
m['icons'] = [
    {'src':'/atendimento-acs-farmaceutico/icons/portal-tacs-oficial-192.png','sizes':'192x192','type':'image/png','purpose':'any'},
    {'src':'/atendimento-acs-farmaceutico/icons/portal-tacs-oficial-512.png','sizes':'512x512','type':'image/png','purpose':'any'}
]
mp.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Central Administrativa
c = ROOT / 'central-administrativa-tacs.html'
h = c.read_text(encoding='utf-8')
h = replace_once(h,
    '<link rel="icon" type="image/svg+xml" href="/atendimento-acs-farmaceutico/icons/painel-tacs-areas.svg">',
    f'<link rel="icon" type="image/svg+xml" href="{ADMIN_SVG}">',
    'favicon Central')
h = replace_once(h,
    '<link rel="apple-touch-icon" sizes="180x180" href="/atendimento-acs-farmaceutico/icons/painel-tacs-areas-180.png">',
    f'<link rel="apple-touch-icon" href="{ADMIN_512}">',
    'apple touch Central')
h = h.replace('<link rel="manifest" href="/atendimento-acs-farmaceutico/manifest-central-admin.webmanifest">',
              f'<link rel="manifest" href="/atendimento-acs-farmaceutico/manifest-central-admin.webmanifest?v={V}">', 1)
old_avatar = '.avatar{width:66px;height:66px;display:grid;place-items:center;border:2px solid #80e6ac;border-radius:20px;background:#05273d;font-size:30px;font-weight:950}'
new_avatar = old_avatar[:-1] + ';overflow:hidden;padding:0}' + '.avatar img{width:100%;height:100%;display:block;object-fit:cover;border-radius:inherit}'
h = replace_once(h, old_avatar, new_avatar, 'CSS avatar Central')
h = replace_once(h,
    '<div class="avatar">T</div>',
    f'<div class="avatar"><img id="profileIcon" src="{ADMIN_512}" alt=""></div>',
    'avatar T Central')
h = re.sub(r'central-administrativa-tacs\.js\?v=[^"\']+', f'central-administrativa-tacs.js?v={V}', h, count=1)
c.write_text(h, encoding='utf-8')

# Central JS: admin usa ícone administrativo; TACS da área preserva o ícone próprio.
jp = ROOT / 'central-administrativa-tacs.js'
j = jp.read_text(encoding='utf-8')
needle = "var area=selectedArea(),tacs=responsible(area);"
insert = needle + "var profileIcon=el('profileIcon');if(profileIcon){profileIcon.src=mode==='admin'?'" + ADMIN_512 + "':'" + TACS_AREA_512 + "';}"
j = replace_once(j, needle, insert, 'injeção do ícone por perfil')
jp.write_text(j, encoding='utf-8')

# Manifest Central
mc = ROOT / 'manifest-central-admin.webmanifest'
cm = json.loads(mc.read_text(encoding='utf-8'))
cm['icons'] = [
    {'src':'/atendimento-acs-farmaceutico/icons/central-admin-saude-192.png','sizes':'192x192','type':'image/png','purpose':'any'},
    {'src':'/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png','sizes':'512x512','type':'image/png','purpose':'any'}
]
mc.write_text(json.dumps(cm, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Gates funcionais/visuais
checks = {
    'portal sem T': '<div class="mark" aria-hidden="true">T</div>' not in s,
    'portal novo ícone': 'portal-tacs-oficial-512.png' in s,
    'portal manifest': 'manifest.webmanifest?v=' + V in s,
    'central sem T': '<div class="avatar">T</div>' not in h,
    'central novo ícone': 'central-admin-saude-512.png' in h,
    'central perfil TACS preservado': 'painel-tacs-areas-512.png?v=' + V in j,
    'central js versionado': 'central-administrativa-tacs.js?v=' + V in h,
}
failed = [k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('Falharam gates: ' + ', '.join(failed))
print('ICONES_OFICIAIS_TACS_V1_OK')
