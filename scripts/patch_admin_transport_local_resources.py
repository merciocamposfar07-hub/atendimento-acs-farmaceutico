from pathlib import Path

p = Path('scripts/test_admin_transport.js')
s = p.read_text(encoding='utf-8')

old_import = "const {JSDOM, VirtualConsole} = require('jsdom');"
new_import = "const {JSDOM, VirtualConsole, ResourceLoader} = require('jsdom');"
if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif new_import not in s:
    raise SystemExit('Import do jsdom esperado não encontrado; abortando.')

anchor = "const ROOT = path.resolve(__dirname, '..');\n"
helper = """const ROOT = path.resolve(__dirname, '..');

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
if 'class LocalPortalResourceLoader extends ResourceLoader' not in s:
    if anchor not in s:
        raise SystemExit('Âncora ROOT não encontrada; abortando.')
    s = s.replace(anchor, helper, 1)

old_resources = "    resources: 'usable',"
new_resources = "    resources: new LocalPortalResourceLoader(),"
if old_resources in s:
    s = s.replace(old_resources, new_resources, 1)
elif new_resources not in s:
    raise SystemExit('Configuração resources esperada não encontrada; abortando.')

p.write_text(s, encoding='utf-8')
print('ADMIN_TRANSPORT_LOCAL_RESOURCES_OK')
