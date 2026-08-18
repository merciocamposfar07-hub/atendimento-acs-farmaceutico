from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old = "attachmentOptional=category==='Solicitar renovação de receita médica'||category==='Solicitar marcação de exames — Ultrassom / Fisioterapeuta',clinical=!isImplanon&&isClinicalSubject(subject),identity=updateIdentity(),dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot)),retirementOk=category!=='Solicitar ficha de cadastro para Aposentadoria'||Boolean(el('retirementRecipientValue')&&el('retirementRecipientValue').value);"
new = "attachmentOptional=category==='Solicitar renovação de receita médica'||category==='Solicitar marcação de exames — Ultrassom / Fisioterapeuta',retirementOptional=category==='Solicitar ficha de cadastro para Aposentadoria',clinical=!isImplanon&&isClinicalSubject(subject),identity=updateIdentity(),dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot)),retirementOk=!retirementOptional||Boolean(el('retirementRecipientValue')&&el('retirementRecipientValue').value);"
if old not in text:
    if "retirementOptional=category==='Solicitar ficha de cadastro para Aposentadoria'" not in text:
        raise SystemExit('Trecho de variáveis do updateForm não encontrado')
else:
    text = text.replace(old, new, 1)

old2 = "&&(subject||attachmentOptional)&&dentalOk&&retirementOk)}"
new2 = "&&(subject||attachmentOptional||retirementOptional)&&dentalOk&&retirementOk)}"
if old2 not in text:
    if new2 not in text:
        raise SystemExit('Trecho de validação do updateForm não encontrado')
else:
    text = text.replace(old2, new2, 1)

if "retirementOptional=category==='Solicitar ficha de cadastro para Aposentadoria'" not in text:
    raise SystemExit('Validação retirementOptional falhou')
if "(subject||attachmentOptional||retirementOptional)&&dentalOk&&retirementOk" not in text:
    raise SystemExit('Validação de liberação do envio falhou')

path.write_text(text, encoding='utf-8')
