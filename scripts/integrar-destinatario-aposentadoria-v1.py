from pathlib import Path

index = Path('index.html')
finals = Path('portal-ajustes-finais.js')

idx = index.read_text(encoding='utf-8')
fin = finals.read_text(encoding='utf-8')

# 1) Carregar o novo módulo depois dos serviços coloridos/anexos.
service_script = '<script src="portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v3"></script>'
recipient_script = '<script src="portal-aposentadoria-destinatario-v1.js?v=20260818-aposentadoria-destino-v1"></script>'
if recipient_script not in idx:
    if service_script not in idx:
        raise SystemExit('Script de serviços não encontrado no index.html')
    idx = idx.replace(service_script, service_script + '\n  ' + recipient_script, 1)

# 2) Forçar uma versão nova do portal-ajustes-finais.js, pois ele passa a levar o destinatário no card.
old_adjust = '<script src="portal-ajustes-finais.js?v=20260817-dental-card-bridge-v4"></script>'
new_adjust = '<script src="portal-ajustes-finais.js?v=20260818-aposentadoria-destino-v5"></script>'
if old_adjust in idx:
    idx = idx.replace(old_adjust, new_adjust, 1)
elif new_adjust not in idx:
    raise SystemExit('Referência de portal-ajustes-finais.js não encontrada')

# 3) Exigir a escolha "Para você / Para outra pessoa" somente para a ficha de aposentadoria.
needle = "dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot));el('implanonField')"
replacement = "dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot)),retirementOk=category!=='Solicitar ficha de cadastro para Aposentadoria'||Boolean(el('retirementRecipientValue')&&el('retirementRecipientValue').value);el('implanonField')"
if needle in idx:
    idx = idx.replace(needle, replacement, 1)
elif 'retirementOk=' not in idx:
    raise SystemExit('Trecho updateForm não encontrado para destinatário da aposentadoria')

needle = "&&(subject||attachmentOptional)&&dentalOk)}"
replacement = "&&(subject||attachmentOptional)&&dentalOk&&retirementOk)}"
if needle in idx:
    idx = idx.replace(needle, replacement, 1)
elif '&&dentalOk&&retirementOk)}' not in idx:
    raise SystemExit('Validação final do formulário não encontrada')

# 4) Incluir o destinatário na mensagem textual enviada pelo WhatsApp.
needle = "+'\\nOnde mora: '+el('locality').value.trim()+'\\n'+label+': '+requestText()+"
replacement = "+'\\nOnde mora: '+el('locality').value.trim()+(category==='Solicitar ficha de cadastro para Aposentadoria'&&el('retirementRecipientValue')&&el('retirementRecipientValue').value?'\\nSolicitação para: '+el('retirementRecipientValue').value:'')+'\\n'+label+': '+requestText()+"
if needle in idx:
    idx = idx.replace(needle, replacement, 1)
elif 'Solicitação para:' not in idx:
    raise SystemExit('Trecho da mensagem do WhatsApp não encontrado')

# 5) Levar o destinatário também no card azul-petróleo.
needle = "      description: clean(el('subject') && el('subject').value),\n      areaId: identity.areaId,"
replacement = "      description: clean(el('subject') && el('subject').value),\n      recipient: clean(el('retirementRecipientValue') && el('retirementRecipientValue').value),\n      areaId: identity.areaId,"
if needle in fin:
    fin = fin.replace(needle, replacement, 1)
elif 'recipient: clean(el(\'retirementRecipientValue\')' not in fin:
    raise SystemExit('requestData não encontrado em portal-ajustes-finais.js')

needle = "    block('Localidade / comunidade', data.locality, 3, 18, 34);\n    block('Descrição da solicitação', summary.description, 4, 13, 34);"
replacement = "    block('Localidade / comunidade', data.locality, 3, 18, 34);\n    if (data.recipient) block('Solicitação para', data.recipient, 1, 16, 34);\n    block('Descrição da solicitação', summary.description, 4, 13, 34);"
if needle in fin:
    fin = fin.replace(needle, replacement, 1)
elif "if (data.recipient) block('Solicitação para'" not in fin:
    raise SystemExit('Bloco de dados do card não encontrado')

required_idx = [
    recipient_script,
    'retirementOk=',
    'retirementRecipientValue',
    'Solicitação para:'
]
for item in required_idx:
    if item not in idx:
        raise SystemExit(f'Validação index falhou: {item}')

required_fin = [
    "recipient: clean(el('retirementRecipientValue')",
    "if (data.recipient) block('Solicitação para'"
]
for item in required_fin:
    if item not in fin:
        raise SystemExit(f'Validação portal-ajustes falhou: {item}')

index.write_text(idx, encoding='utf-8')
finals.write_text(fin, encoding='utf-8')
