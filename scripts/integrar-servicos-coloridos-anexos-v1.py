from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
marker = '<script src="portal-orientacao-morador.js?v=20260817-fluxo-guiado-v3"></script>'
include = '<script src="portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v1"></script>'

if include not in text:
    if marker not in text:
        raise SystemExit('Marcador de portal-orientacao-morador.js não encontrado')
    text = text.replace(marker, marker + '\n  ' + include, 1)

required = [
    'portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v1',
    'portal-orientacao-morador.js?v=20260817-fluxo-guiado-v3',
    'portal-auto-update.js?v=20260812-v101',
    'portal-odontologia-segunda-sexta.js?v=20260817-reserva-get-v111'
]
for item in required:
    if item not in text:
        raise SystemExit(f'Validação falhou: {item}')

path.write_text(text, encoding='utf-8')
