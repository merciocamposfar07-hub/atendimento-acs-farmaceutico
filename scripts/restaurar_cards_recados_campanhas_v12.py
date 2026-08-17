from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
PANEL=ROOT/'painel-oficial-recados-campanhas.html'
CENTRAL_JS=ROOT/'central-administrativa-tacs.js'
CENTRAL_HTML=ROOT/'central-administrativa-tacs.html'
CARD_JS=ROOT/'recados-campanhas-whatsapp-card-v9.js'
REV='20260817-recados-cards-mensais-v12'

p=PANEL.read_text(encoding='utf-8')
p=p.replace('>Executando testes internos da página…</div>','>Aguarde…</div>')
p=p.replace('>Executando testes internos da página...</div>','>Aguarde…</div>')
# restaura carregamento do gerador de cards de recados/campanhas e adiciona agrupamento mensal
p=re.sub(r'<script\s+src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-card-v9\.js\?v=[^"]+"></script>\s*','',p)
p=re.sub(r'<script\s+src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-mensal-v12\.js\?v=[^"]+"></script>\s*','',p)
insert=(f'<script src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-card-v9.js?v={REV}"></script>\n'
        f'<script src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-mensal-v12.js?v={REV}"></script>\n')
if '</body>' not in p: raise SystemExit('painel sem </body>')
p=p.replace('</body>',insert+'</body>',1)
PANEL.write_text(p,encoding='utf-8')

# linguagem direta no botão de recados; campanhas individuais serão ocultadas pelo módulo mensal
s=CARD_JS.read_text(encoding='utf-8')
s=s.replace("var label=type==='campanha'?'Postar no status do WhatsApp':'Compartilhar card azul-petróleo no WhatsApp';","var label=type==='campanha'?'Postar no status do WhatsApp':'📱 Postar recado no Status do WhatsApp';")
CARD_JS.write_text(s,encoding='utf-8')

# força a Central a abrir a versão nova do painel no Safari/iPhone
c=CENTRAL_JS.read_text(encoding='utf-8')
c=re.sub(r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v=[^']+';",
         "if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v="+REV+"';",c)
CENTRAL_JS.write_text(c,encoding='utf-8')

h=CENTRAL_HTML.read_text(encoding='utf-8')
h=re.sub(r'central-administrativa-tacs\.js\?v=[^"\']+', 'central-administrativa-tacs.js?v='+REV, h)
CENTRAL_HTML.write_text(h,encoding='utf-8')

# validações de escopo
final=PANEL.read_text(encoding='utf-8')
assert 'Aguarde…' in final
assert 'Executando testes internos da página' not in final
assert f'recados-campanhas-whatsapp-card-v9.js?v={REV}' in final
assert f'recados-campanhas-whatsapp-mensal-v12.js?v={REV}' in final
assert '📱 Postar recado no Status do WhatsApp' in CARD_JS.read_text(encoding='utf-8')
print('OK: cards restaurados, campanha mensal agrupada e mensagem técnica removida.')
