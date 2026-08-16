from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def inject_once(text, marker, css, tag):
    if tag in text:
        return text
    if marker not in text:
        raise SystemExit(f'Marcador ausente para {tag}')
    return text.replace(marker, css+'\n'+marker, 1)

# 1) Municípios/organizações: somente destacar "Salvar vínculo" dentro dos cards petróleo.
p='painel-oficial-organizacoes-municipios.html'
t=read(p)
css='''/* PADRAO_VISUAL_PETROLEO_V2_MUNICIPIOS */\n.area-row .btn{background:#fff!important;color:var(--p)!important;border:2px solid var(--blue)!important;box-shadow:0 7px 16px rgba(0,0,0,.18)!important}\n.area-row .btn:active{transform:translateY(1px)}'''
t=inject_once(t,'</style>',css,'PADRAO_VISUAL_PETROLEO_V2_MUNICIPIOS')
write(p,t)

# 2) Profissionais e serviços: cartões de profissionais/serviços no padrão azul-petróleo.
p='teste-v1/painel-profissionais-servicos-v1.html'
t=read(p)
css='''/* PADRAO_VISUAL_PETROLEO_V2_PROFISSIONAIS */\n.cartao{border-color:#69c7e7!important;background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}\n.cartao h3,.cartao .tituloItem,.cartao label{color:#fff!important}\n.cartao .sub{color:#d8eef7!important}\n.cartao .corpo{border-top-color:rgba(216,238,247,.35)!important}\n.cartao .check{background:rgba(255,255,255,.08)!important;border-color:rgba(216,238,247,.42)!important;color:#fff!important}\n.cartao .campo{background:#fff!important;color:var(--texto)!important}\n.cartao .sinal.ativo{background:#e8f7ee!important;color:#08723a!important;border:2px solid #9ed6b2!important}\n.cartao .sinal.inativo{background:#fff0f0!important;color:#a52d2d!important;border:2px solid #d88a8a!important}'''
t=inject_once(t,'</style>',css,'PADRAO_VISUAL_PETROLEO_V2_PROFISSIONAIS')
write(p,t)

# Força o wrapper oficial a buscar a revisão visual nova do fonte.
p='painel-oficial-profissionais-servicos.html'
t=read(p)
t=t.replace('painel-profissionais-servicos-v1.html?v=20260815-autonomia-v2','painel-profissionais-servicos-v1.html?v=20260816-petroleo-v2')
write(p,t)

# 3) Agendas e vagas: cartões no mesmo padrão, sem alterar formulários/lógica.
p='painel-oficial-agendas-vagas.html'
t=read(p)
css='''/* PADRAO_VISUAL_PETROLEO_V2_AGENDAS */\n.cartao{border-color:#69c7e7!important;background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}\n.cartao h3,.cartao .tituloItem,.cartao label{color:#fff!important}\n.cartao .sub{color:#d8eef7!important}\n.cartao .corpo{border-top-color:rgba(216,238,247,.35)!important}\n.cartao .check{background:rgba(255,255,255,.08)!important;border-color:rgba(216,238,247,.42)!important;color:#fff!important}\n.cartao .campo{background:#fff!important;color:var(--texto)!important}\n.cartao .sinal.ativo{background:#e8f7ee!important;color:#08723a!important;border:2px solid #9ed6b2!important}\n.cartao .sinal.inativo{background:#fff0f0!important;color:#a52d2d!important;border:2px solid #d88a8a!important}'''
t=inject_once(t,'</style>',css,'PADRAO_VISUAL_PETROLEO_V2_AGENDAS')
write(p,t)

# 4) Moradores: cartões de resultados/listas no padrão petróleo.
p='teste-v1/painel-moradores-v2.html'
t=read(p)
css='''/* PADRAO_VISUAL_PETROLEO_V2_MORADORES */\n.card{border-color:#69c7e7!important;background:linear-gradient(145deg,var(--pet),var(--pet2))!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}\n.card>button{color:#fff!important}\n.card strong,.card label{color:#fff!important}\n.card .sub{color:#d8eef7!important}\n.card .pill{background:#e8f7ee!important;color:#08723a!important;border:2px solid #9ed6b2!important}\n.card .field{background:#fff!important;color:var(--text)!important}'''
t=inject_once(t,'</style>',css,'PADRAO_VISUAL_PETROLEO_V2_MORADORES')
write(p,t)

# 5) Cache-bust da Central, sem mudar comportamento dos módulos.
p='central-administrativa-tacs.js'
t=read(p)
t=t.replace("revision='20260816-ui-fixed-v2'","revision='20260816-padrao-petroleo-v2'")
t=t.replace('painel-oficial-organizacoes-municipios.html?v=20260816-municipios-petroleo-v1','painel-oficial-organizacoes-municipios.html?v=20260816-padrao-petroleo-v2')
write(p,t)

p='central-administrativa-tacs.html'
t=read(p)
old='/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260816-municipios-petroleo-v1'
new='/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260816-padrao-petroleo-v2'
if old in t:
    t=t.replace(old,new)
elif new not in t:
    raise SystemExit('Versão esperada da Central não encontrada')
write(p,t)

print('PADRONIZACAO_VISUAL_PETROLEO_V2_OK')
