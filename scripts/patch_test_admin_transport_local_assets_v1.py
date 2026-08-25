from pathlib import Path

p=Path('scripts/test_admin_transport.js')
s=p.read_text(encoding='utf-8')
old="const {JSDOM, VirtualConsole} = require('jsdom');"
new="const {JSDOM, VirtualConsole, ResourceLoader} = require('jsdom');"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('import do jsdom não encontrado')

anchor="const ROOT = path.resolve(__dirname, '..');\n"
block="""const ROOT = path.resolve(__dirname, '..');

class LocalPortalResourceLoader extends ResourceLoader {
  fetch(url) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { return null; }
    if (parsed.origin !== 'https://portal.test') return null;
    const prefix = '/atendimento-acs-farmaceutico/';
    if (!parsed.pathname.startsWith(prefix)) return null;
    const relative = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\\/+/, '');
    const target = path.resolve(ROOT, relative);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
    return Promise.resolve(fs.readFileSync(target));
  }
}

function localResources() {
  return new LocalPortalResourceLoader();
}
"""
if 'class LocalPortalResourceLoader extends ResourceLoader' not in s:
    if anchor not in s:
        raise SystemExit('âncora ROOT não encontrada')
    s=s.replace(anchor,block,1)

count=s.count("resources: 'usable',")
if count:
    s=s.replace("resources: 'usable',","resources: localResources(),")
if "resources: 'usable'," in s:
    raise SystemExit('resources usable ainda presente')
if 'resources: localResources(),' not in s:
    raise SystemExit('ResourceLoader local não aplicado')

p.write_text(s,encoding='utf-8')
print('OK: test_admin_transport usa assets locais sem rede externa.')
