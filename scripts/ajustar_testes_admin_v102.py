from pathlib import Path

p = Path('scripts/test_admin_transport.js')
text = p.read_text(encoding='utf-8')
old = """    assert.match(base, /requestAnimationFrame\\(function\\(\\)\\{window\\.requestAnimationFrame\\(enviarUmaVez\\)\\}\\)/);\n    assert.match(base, /submitTimer=setTimeout\\(enviarUmaVez,180\\)/);\n"""
new = """    assert.match(base, /mode:'no-cors'/);\n    assert.match(base, /if\\(enviarPostRapidoV102\\(campos\\)\\)\\{agendarConsulta\\(\\);return\\}/);\n"""
if old not in text:
    raise SystemExit('Asserções antigas do transporte Safari de recados não foram encontradas.')
text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('TESTE_ADMIN_TRANSPORT_V102_ATUALIZADO')
