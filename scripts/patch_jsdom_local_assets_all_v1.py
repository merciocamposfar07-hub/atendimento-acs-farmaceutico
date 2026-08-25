from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
MARK='// PORTAL_TACS_JSDOM_LOCAL_ASSETS_V1'
HELPER=r'''// PORTAL_TACS_JSDOM_LOCAL_ASSETS_V1
const {ResourceLoader: __PortalTacsResourceLoader} = require('jsdom');
const __portalTacsFs = require('node:fs');
const __portalTacsPath = require('node:path');
class __PortalTacsLocalResourceLoader extends __PortalTacsResourceLoader {
  fetch(url) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { return null; }
    const prefix = '/atendimento-acs-farmaceutico/';
    if (!parsed.pathname.startsWith(prefix)) return null;
    const relative = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\/+/, '');
    const root = __portalTacsPath.resolve(__dirname, '..');
    const target = __portalTacsPath.resolve(root, relative);
    if (target !== root && !target.startsWith(root + __portalTacsPath.sep)) return null;
    if (!__portalTacsFs.existsSync(target) || !__portalTacsFs.statSync(target).isFile()) return null;
    return Promise.resolve(__portalTacsFs.readFileSync(target));
  }
}
function __portalTacsLocalResources(){ return new __PortalTacsLocalResourceLoader(); }
'''

changed=[]
for p in sorted((ROOT/'scripts').glob('test_*.js')):
    s=p.read_text(encoding='utf-8')
    if not re.search(r"resources\s*:\s*['\"]usable['\"]",s):
        continue
    if "require('jsdom')" not in s and 'require("jsdom")' not in s:
        raise SystemExit(f'{p}: resources usable sem jsdom')
    if MARK not in s:
        anchor="'use strict';\n"
        if anchor not in s:
            raise SystemExit(f'{p}: use strict ausente')
        s=s.replace(anchor,anchor+'\n'+HELPER+'\n',1)
    s,n=re.subn(r"resources\s*:\s*['\"]usable['\"]",'resources: __portalTacsLocalResources()',s)
    if n<1:
        raise SystemExit(f'{p}: não substituiu resources usable')
    p.write_text(s,encoding='utf-8')
    changed.append(str(p.relative_to(ROOT)))

if not changed:
    print('Nenhum teste adicional precisava de ajuste.')
else:
    print('TESTES_AJUSTADOS='+','.join(changed))
