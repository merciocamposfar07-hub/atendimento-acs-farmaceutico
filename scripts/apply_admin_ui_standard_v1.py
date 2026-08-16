#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8').strip()

TARGETS = [
    'central-administrativa-tacs.html',
    'painel-oficial-organizacoes-municipios.html',
    'painel-oficial-agendas-vagas.html',
    'painel-oficial-profissionais-servicos.html',
    'painel-oficial-recados-campanhas.html',
    'painel-oficial-tacs-areas.html',
    'teste-v1/painel-moradores-v2.html',
    'teste-v1/painel-tacs-areas-v1.html',
]

START = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->'
END = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_END -->'
BLOCK = f'''{START}\n<style id="portalTacsAdminUiStandardV1">\n{CSS}\n</style>\n{END}'''
BLOCK_PATTERN = re.compile(re.escape(START) + r'.*?' + re.escape(END), re.S)


def without_visual_block(html: str) -> str:
    return BLOCK_PATTERN.sub('', html)


def fingerprint(html: str):
    """Contrato estrutural que a padronização visual não pode alterar."""
    html = without_visual_block(html)
    patterns = {
        'ids': r'\bid\s*=\s*["\']([^"\']+)["\']',
        'names': r'\bname\s*=\s*["\']([^"\']+)["\']',
        'data': r'\b(data-[\w-]+)\s*=\s*["\']([^"\']*)["\']',
        'scripts': r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']',
    }
    return {k: re.findall(p, html, flags=re.I) for k, p in patterns.items()}


for rel in TARGETS:
    path = ROOT / rel
    before = path.read_text(encoding='utf-8')
    fp_before = fingerprint(before)

    if START in before and END in before:
        after = BLOCK_PATTERN.sub(BLOCK, before, count=1)
    else:
        if '</head>' not in before.lower():
            raise RuntimeError(f'{rel}: </head> não encontrado')
        pos = before.lower().rfind('</head>')
        after = before[:pos] + BLOCK + '\n' + before[pos:]

    fp_after = fingerprint(after)
    if fp_before != fp_after:
        raise RuntimeError(f'{rel}: contrato funcional mudou durante injeção visual')

    path.write_text(after, encoding='utf-8')
    print(f'OK {rel}')

print('Padrão visual V1 aplicado sem alterar IDs, names, data-* ou scripts externos.')
