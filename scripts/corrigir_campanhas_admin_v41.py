from pathlib import Path
import re


def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,s): Path(p).write_text(s,encoding='utf-8')
def once(s,old,new,label):
    if old not in s: raise SystemExit('Padrão não encontrado: '+label)
    return s.replace(old,new,1)

# 1) Hidrata validade/subtítulo reais e normaliza resumo de datas sem timezone.
p='campanhas-periodo-v2.js'; s=read(p)
if 'CAMPANHAS_ADMIN_V41' not in s:
    anchor="function campaignPalette(theme){"
    helper="""function dateBrIsoV41(v){var m=txt(v).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}\n/* CAMPANHAS_ADMIN_V41 */\n"""
    s=once(s,anchor,helper+anchor,'helper data BR V4.1')

    old="""  var period=copy.querySelector('.sub');if(period)period.classList.add('camp-admin-period');\n  var badge=summary.querySelector('.camp-admin-badge');\n"""
    new="""  var period=copy.querySelector('.sub');\n  if(period){\n    period.classList.add('camp-admin-period');\n    var startInput=box.querySelector('[name=\"inicio\"]'),daysInput=box.querySelector('[name=\"dias\"]'),validityInput=box.querySelector('[name=\"validade\"]');\n    var startValue=isoDate(startInput&&startInput.value),validityValue=isoDate(meta&&meta.VALIDADE)||isoDate(validityInput&&validityInput.value),daysValue=txt(daysInput&&daysInput.value);\n    var bits=[];if(startValue)bits.push('Início: '+dateBrIsoV41(startValue));if(validityValue)bits.push('até '+dateBrIsoV41(validityValue));if(daysValue)bits.push(daysValue);\n    if(bits.length)period.textContent=bits.join(' • ');\n  }\n  var badge=summary.querySelector('.camp-admin-badge');\n"""
    s=once(s,old,new,'resumo de datas do card')

    old2="""  if(!box.querySelector('.camp-period-fields')){\n    var fields=makeFields(meta);\n    var label=start.previousElementSibling;\n    start.parentNode.insertBefore(fields,label||start);\n  }\n  wrapCampaignStart(start);\n  renameContentLabel(box);\n}\n"""
    new2="""  if(!box.querySelector('.camp-period-fields')){\n    var fields=makeFields(meta);\n    var label=start.previousElementSibling;\n    start.parentNode.insertBefore(fields,label||start);\n  }\n  var periodFields=box.querySelector('.camp-period-fields'),id=txt(box.dataset&&box.dataset.id),metaReady=id&&metadata[id];\n  if(periodFields&&metaReady&&periodFields.dataset.metaHydratedV41!=='1'){\n    var y=periodFields.querySelector('[name=\"ano\"]'),m=periodFields.querySelector('[name=\"mes\"]'),v=periodFields.querySelector('[name=\"validade\"]'),sub=periodFields.querySelector('[name=\"subtitulo\"]');\n    if(y&&meta.ANO)y.value=txt(meta.ANO);\n    if(m&&meta.MES)m.value=digits2(meta.MES);\n    if(v&&meta.VALIDADE)v.value=isoDate(meta.VALIDADE);\n    if(sub&&meta.SUBTITULO)sub.value=txt(meta.SUBTITULO);\n    periodFields.dataset.metaHydratedV41='1';\n  }\n  wrapCampaignStart(start);\n  decorateCampaignSummary(box,meta);\n  renameContentLabel(box);\n}\n"""
    s=once(s,old2,new2,'hidratação metadados V4.1')
write(p,s)

# 2) Botão acompanha o card filtrado/oculto.
p='recados-campanhas-whatsapp-card-v9.js'; s=read(p)
old=".publicacao-whatsapp-status:empty{display:none}'"
new=".publicacao-whatsapp-status:empty{display:none}#listaCampanhas .item[hidden]+.publicacao-campanha-status{display:none!important}'"
s=once(s,old,new,'botão status acompanha filtro')
write(p,s)

# 3) Revisões para invalidar cache do painel/Central.
p='painel-oficial-recados-campanhas.html'; s=read(p)
s=re.sub(r'campanhas-periodo-v2\\.js\\?v=[A-Za-z0-9._-]+','campanhas-periodo-v2.js?v=20260817-campanhas-admin-ui-v4-1',s)
s=re.sub(r'recados-campanhas-whatsapp-card-v9\\.js\\?v=[A-Za-z0-9._-]+','recados-campanhas-whatsapp-card-v9.js?v=20260817-publicacoes-v10-1',s)
if '20260817-campanhas-admin-ui-v4-1' not in s or '20260817-publicacoes-v10-1' not in s: raise SystemExit('Cache bust painel falhou')
write(p,s)

p='central-administrativa-tacs.js'; s=read(p)
s=s.replace("&v=20260817-campanhas-reparos-v4","&v=20260817-campanhas-reparos-v4-1")
if '20260817-campanhas-reparos-v4-1' not in s: raise SystemExit('Cache bust Central módulo falhou')
write(p,s)

p='central-administrativa-tacs.html'; s=read(p)
s=re.sub(r'central-administrativa-tacs\\.js\\?v=[A-Za-z0-9._-]+','central-administrativa-tacs.js?v=20260816-campanhas-reparos-v4-1',s)
write(p,s)

print('CAMPANHAS_ADMIN_V41_OK')
