from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'{path}: trecho de fallback não encontrado')
    text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')


# Moradores: o caminho principal é fetch no-cors. Se fetch não existir, o iframe
# continua sendo fallback, mas só recebe o único submit depois de o Safari registrar o target.
replace_once(
    'teste-v1/painel-moradores-transport-v2.js',
    """  try{form.submit()}catch(erro){finish({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}\n  schedulePoll();\n""",
    """  var enviado=false;\n  function enviarUmaVez(){\n    if(enviado)return;\n    enviado=true;\n    try{form.submit()}catch(erro){finish({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'})}\n  }\n  if(window.requestAnimationFrame){window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)})}\n  active.submitTimer=setTimeout(enviarUmaVez,180);\n  schedulePoll();\n"""
)

# Recados cria iframe dinamicamente, então mantém o mesmo cuidado somente no fallback.
replace_once(
    'teste-v1/painel-recados-campanhas-v1.html',
    """  try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}\n  agendarConsulta();\n""",
    """  var enviado=false;\n  function enviarUmaVez(){\n    if(enviado)return;\n    enviado=true;\n    try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'})}\n  }\n  if(window.requestAnimationFrame){window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)})}\n  ativa.submitTimer=setTimeout(enviarUmaVez,180);\n  agendarConsulta();\n"""
)

print('FALLBACK_SAFARI_ADMIN_V102_OK')
