from pathlib import Path

m=Path('portal-servicos-coloridos-anexos-v1.js')
i=Path('index.html')
text=m.read_text(encoding='utf-8')
marker="  function lockSendIfNeeded(){\n"
if marker not in text:
    raise SystemExit('lockSendIfNeeded não encontrado')
if 'function updateAttachmentSendLabel(' not in text:
    helper="""  function updateAttachmentSendLabel(required){
    var send=getSend();if(!send)return;
    if(!send.dataset.portalAttachmentOriginalHtml)send.dataset.portalAttachmentOriginalHtml=send.innerHTML;
    if(required){
      send.innerHTML='📲 Enviar pelo WhatsApp com arquivo<small>O arquivo selecionado será compartilhado junto com a solicitação.</small>';
    }else if(send.dataset.portalAttachmentOriginalHtml){
      send.innerHTML=send.dataset.portalAttachmentOriginalHtml;
    }
  }

"""
    text=text.replace(marker,helper+marker,1)
old="    lockSendIfNeeded();applySelectedColor();\n"
new="    updateAttachmentSendLabel(required);lockSendIfNeeded();applySelectedColor();\n"
if old not in text:
    raise SystemExit('Ponto de atualização do anexo não encontrado')
text=text.replace(old,new,1)
m.write_text(text,encoding='utf-8')

text=i.read_text(encoding='utf-8')
oldv='portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v2'
newv='portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v3'
if oldv not in text:
    raise SystemExit('Versão V2 do módulo não encontrada no index')
text=text.replace(oldv,newv,1)
i.write_text(text,encoding='utf-8')

for p,n in [(m,'Enviar pelo WhatsApp com arquivo'),(i,'servicos-anexos-v3')]:
    if n not in p.read_text(encoding='utf-8'):
        raise SystemExit('Validação falhou: '+n)
print('OK')
