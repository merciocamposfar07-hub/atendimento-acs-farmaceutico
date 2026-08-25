from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
PANEL=ROOT/'painel-oficial-recados-campanhas.html'
CENTRAL_JS=ROOT/'central-administrativa-tacs.js'
CENTRAL_HTML=ROOT/'central-administrativa-tacs.html'
CARD_JS=ROOT/'recados-campanhas-whatsapp-card-v9.js'
MONTHLY_JS=ROOT/'recados-campanhas-whatsapp-mensal-v12.js'
REV='20260825-campanhas-estavel-v14'

p=PANEL.read_text(encoding='utf-8')
p=p.replace('>Executando testes internos da página…</div>','>Aguarde…</div>')
p=p.replace('>Executando testes internos da página...</div>','>Aguarde…</div>')
# Restaura os geradores sem permitir que o módulo de WhatsApp controle a lista administrativa.
p=re.sub(r'<script\s+src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-card-v9\.js\?v=[^"]+"></script>\s*','',p)
p=re.sub(r'<script\s+src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-mensal-v12\.js\?v=[^"]+"></script>\s*','',p)
p=re.sub(r'campanhas-periodo-v2\.js\?v=[^"\']+', 'campanhas-periodo-v2.js?v='+REV, p)
insert=(f'<script src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-card-v9.js?v={REV}"></script>\n'
        f'<script src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-mensal-v12.js?v={REV}"></script>\n')
if '</body>' not in p:
    raise SystemExit('painel sem </body>')
p=p.replace('</body>',insert+'</body>',1)
PANEL.write_text(p,encoding='utf-8')

# Linguagem direta no botão de recados.
s=CARD_JS.read_text(encoding='utf-8')
s=s.replace("var label=type==='campanha'?'Postar no status do WhatsApp':'Compartilhar card azul-petróleo no WhatsApp';","var label=type==='campanha'?'Postar no status do WhatsApp':'📱 Postar recado no Status do WhatsApp';")
CARD_JS.write_text(s,encoding='utf-8')

# Guardrail: o módulo mensal nunca pode voltar a ocultar cartões do painel.
monthly=MONTHLY_JS.read_text(encoding='utf-8')
if 'card.hidden=!mostrar' in monthly:
    raise SystemExit('regressão detectada: módulo mensal voltou a ocultar campanhas administrativas')

# Força a Central a abrir a revisão estabilizada no Safari/iPhone.
c=CENTRAL_JS.read_text(encoding='utf-8')
c=re.sub(r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v=[^']+';",
         "if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v="+REV+"';",c)
CENTRAL_JS.write_text(c,encoding='utf-8')

h=CENTRAL_HTML.read_text(encoding='utf-8')
h=re.sub(r'central-administrativa-tacs\.js\?v=[^"\']+', 'central-administrativa-tacs.js?v='+REV, h)
CENTRAL_HTML.write_text(h,encoding='utf-8')

final=PANEL.read_text(encoding='utf-8')
assert 'Aguarde…' in final
assert 'Executando testes internos da página' not in final
assert f'campanhas-periodo-v2.js?v={REV}' in final
assert f'recados-campanhas-whatsapp-card-v9.js?v={REV}' in final
assert f'recados-campanhas-whatsapp-mensal-v12.js?v={REV}' in final
assert '📱 Postar recado no Status do WhatsApp' in CARD_JS.read_text(encoding='utf-8')
print('OK: cards preservados, filtro mensal isolado e revisão de cache estabilizada.')
