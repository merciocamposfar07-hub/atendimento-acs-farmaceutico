from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20260822-promocao-institucional-v1'


def patch(path_name, replacements):
    path = ROOT / path_name
    text = path.read_text(encoding='utf-8')
    original = text
    for pattern, replacement, label in replacements:
        text, count = re.subn(pattern, replacement, text)
        if count < 1:
            raise SystemExit(f'{path_name}: não encontrei {label}')
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f'ATUALIZADO {path_name}')
    else:
        print(f'SEM ALTERACAO {path_name}')

patch('index.html', [
    (r'(agenda-config\.js\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão agenda-config'),
    (r'(portal-auto-update\.js\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão portal-auto-update'),
    (r'(portal-orientacao-morador\.js\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão portal-orientacao-morador'),
    (r'(manifest\.webmanifest\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão manifest'),
    (r'(portal-tacs-oficial-512\.png\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão apple-touch-icon'),
])

patch('agenda-config.js', [
    (r'(assets/js/portal-conteudo-publico-v1\.js\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão conteúdo público'),
])

patch('central-administrativa-tacs.html', [
    (r'(central-tacs-login-rapido-v1\.js\?v=)[^"\']+', rf'\g<1>{VERSION}', 'versão login rápido'),
])

print('PROMOCAO_FRONTEND_V1_APLICADA')
