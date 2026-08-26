from pathlib import Path
import re

ROOT_LINE = "const ROOT = path.resolve(__dirname, '..');\n"
HELPER = """const ROOT = path.resolve(__dirname, '..');

class LocalPortalResourceLoader extends ResourceLoader {
  fetch(url) {
    let parsed;
    try { parsed = new URL(url); } catch (_) { return null; }
    if (parsed.origin !== 'https://portal.test') return null;
    let relative = decodeURIComponent(parsed.pathname || '')
      .replace(/^\\/atendimento-acs-farmaceutico\\//, '')
      .replace(/^\\//, '');
    const full = path.resolve(ROOT, relative);
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
    return Promise.resolve(fs.readFileSync(full));
  }
}
"""

alterados = []
for p in sorted(Path('scripts').glob('test_*.js')):
    s = p.read_text(encoding='utf-8')
    if "resources: 'usable'" not in s and 'resources: "usable"' not in s:
        continue
    if 'https://portal.test' not in s:
        continue
    if "require('jsdom')" not in s:
        raise SystemExit(f'{p}: teste usa resources usable sem import jsdom reconhecido.')
    if 'ResourceLoader' not in s.split("require('jsdom')",1)[0].splitlines()[-1]:
        pat = re.compile(r"const \{([^}]*)\} = require\('jsdom'\);")
        m = pat.search(s)
        if not m:
            raise SystemExit(f'{p}: import jsdom não reconhecido.')
        nomes = [x.strip() for x in m.group(1).split(',') if x.strip()]
        if 'ResourceLoader' not in nomes:
            nomes.append('ResourceLoader')
        s = s[:m.start()] + 'const {' + ', '.join(nomes) + "} = require('jsdom');" + s[m.end():]
    if 'class LocalPortalResourceLoader extends ResourceLoader' not in s:
        if ROOT_LINE not in s:
            raise SystemExit(f'{p}: âncora ROOT não encontrada.')
        s = s.replace(ROOT_LINE, HELPER, 1)
    s = s.replace("resources: 'usable'", 'resources: new LocalPortalResourceLoader()')
    s = s.replace('resources: "usable"', 'resources: new LocalPortalResourceLoader()')
    p.write_text(s, encoding='utf-8')
    alterados.append(str(p))

if not alterados:
    raise SystemExit('Nenhum teste DOM com resources usable foi encontrado.')
print('LOCAL_RESOURCES_OK:', ', '.join(alterados))
