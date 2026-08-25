from pathlib import Path
import re

REV='20260825-campanhas-estavel-v14'

js=Path('recados-campanhas-whatsapp-mensal-v12.js')
s=js.read_text(encoding='utf-8')

# Este utilitário histórico trata SOMENTE do card mensal do WhatsApp.
# A visibilidade dos cartões no painel administrativo pertence a campanhas-periodo-v2.js.
if 'function currentMonthKey()' not in s:
    anchor="function monthLabel(key){var m=String(key).match(/^(\\d{4})-(\\d{2})$/),meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return m?meses[Number(m[2])-1]+' '+m[1]:key}\n"
    helper=anchor+"function currentMonthKey(){var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');return y+'-'+m}\n"
    if anchor not in s:
        raise SystemExit('anchor monthLabel não encontrado')
    s=s.replace(anchor,helper,1)

# Remove a regressão V13 que escondia cartões administrativos segundo o mês vigente.
s=s.replace('card.hidden=!mostrar;','')
if 'card.hidden=!mostrar' in s:
    raise SystemExit('interferência administrativa ainda presente no módulo mensal')
if 'monthKey(card)===vigente' not in s:
    raise SystemExit('seleção do card mensal do WhatsApp não encontrada')
js.write_text(s,encoding='utf-8')

p=Path('painel-oficial-recados-campanhas.html')
h=p.read_text(encoding='utf-8')
h=re.sub(r'recados-campanhas-whatsapp-mensal-v12\.js\?v=[^"\']+', 'recados-campanhas-whatsapp-mensal-v12.js?v='+REV, h)
h=re.sub(r'campanhas-periodo-v2\.js\?v=[^"\']+', 'campanhas-periodo-v2.js?v='+REV, h)
p.write_text(h,encoding='utf-8')

print('OK: WhatsApp mensal isolado; filtro administrativo preservado em campanhas-periodo-v2.js.')
