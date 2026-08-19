from pathlib import Path

P=Path('painel-oficial-recados-campanhas.html')
s=P.read_text(encoding='utf-8')
MARK='SAUDE_NOTIFICACOES_CORES_CATEGORIAS_V1'

if MARK not in s:
    old="return '<div class=\"saude-aparelho\"><div class=\"saude-aparelho-topo\">"
    new="var classeStatus=txt(a.status).toUpperCase().replace(/[^A-Z0-9_]/g,'');\n  return '<div class=\"saude-aparelho saude-aparelho-'+esc(classeStatus)+'\"><div class=\"saude-aparelho-topo\">"
    if old not in s: raise SystemExit('Render do card não localizado')
    s=s.replace(old,new,1)
    css=r'''
/* SAUDE_NOTIFICACOES_CORES_CATEGORIAS_V1 */
.saude-resumo button.saude-numero[data-saude-filtro="ATIVO"],body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro="ATIVO"]{background:linear-gradient(145deg,#064f49,#087064)!important;border-color:#36a99a!important;color:#fff!important}
.saude-resumo button.saude-numero[data-saude-filtro="REPARO"],body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro="REPARO"]{background:linear-gradient(145deg,#806000,#aa7f00)!important;border-color:#d5ab2c!important;color:#fff!important}
.saude-resumo button.saude-numero[data-saude-filtro="INATIVO"],body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro="INATIVO"]{background:linear-gradient(145deg,#71282d,#962f35)!important;border-color:#c75b61!important;color:#fff!important}
.saude-resumo button.saude-numero[data-saude-filtro="SEM_CONFIRMACAO"],body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro="SEM_CONFIRMACAO"]{background:linear-gradient(145deg,#a84400,#ca5a00)!important;border-color:#ed8232!important;color:#fff!important}
.saude-resumo button.saude-numero[data-saude-filtro] strong,.saude-resumo button.saude-numero[data-saude-filtro] span,body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro] strong,body.tema-petroleo .saude-resumo button.saude-numero[data-saude-filtro] span{color:#fff!important}
.saude-aparelho.saude-aparelho-ATIVO,body.tema-petroleo .saude-aparelho.saude-aparelho-ATIVO{background:linear-gradient(145deg,#064f49,#087064)!important;border-color:#36a99a!important;color:#fff!important}
.saude-aparelho.saude-aparelho-REPARO,body.tema-petroleo .saude-aparelho.saude-aparelho-REPARO{background:linear-gradient(145deg,#806000,#aa7f00)!important;border-color:#d5ab2c!important;color:#fff!important}
.saude-aparelho.saude-aparelho-INATIVO,body.tema-petroleo .saude-aparelho.saude-aparelho-INATIVO{background:linear-gradient(145deg,#71282d,#962f35)!important;border-color:#c75b61!important;color:#fff!important}
.saude-aparelho.saude-aparelho-SEM_CONFIRMACAO,body.tema-petroleo .saude-aparelho.saude-aparelho-SEM_CONFIRMACAO{background:linear-gradient(145deg,#a84400,#ca5a00)!important;border-color:#ed8232!important;color:#fff!important}
.saude-aparelho[class*="saude-aparelho-"] h3,.saude-aparelho[class*="saude-aparelho-"] .saude-meta,body.tema-petroleo .saude-aparelho[class*="saude-aparelho-"] h3,body.tema-petroleo .saude-aparelho[class*="saude-aparelho-"] .saude-meta{color:#fff!important}
'''
    needle='.saude-fechar-lista{width:100%;min-height:50px;border:2px solid #69c7e7;border-radius:15px;background:#fff;color:#073a55;font-weight:900}\n\n</style>'
    if needle not in s: raise SystemExit('Ponto CSS não localizado')
    s=s.replace(needle,'.saude-fechar-lista{width:100%;min-height:50px;border:2px solid #69c7e7;border-radius:15px;background:#fff;color:#073a55;font-weight:900}\n'+css+'\n</style>',1)

for t in ['data-saude-filtro="ATIVO"','data-saude-filtro="REPARO"','data-saude-filtro="INATIVO"','data-saude-filtro="SEM_CONFIRMACAO"','saude-aparelho-ATIVO','saude-aparelho-REPARO','saude-aparelho-INATIVO','saude-aparelho-SEM_CONFIRMACAO','function selecionarSaudeFiltro(filtro)',"post('admin_notificacoes_saude'",'id="atualizarSaudeNotificacoes"','id="solicitarReparoNotificacoes"']:
    if t not in s: raise SystemExit('Gate ausente: '+t)
P.write_text(s,encoding='utf-8')
print('OK')
