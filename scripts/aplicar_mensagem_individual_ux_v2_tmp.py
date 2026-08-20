from pathlib import Path

front=Path('teste-v1/mensagem-individual-morador-v1.js')
s=front.read_text(encoding='utf-8')

replacements=[
(".msg-ind-box{width:min(100%,620px);max-height:94vh;overflow:auto;background:#fff;border:3px solid #69c7e7;border-radius:26px;padding:18px;color:#102d40;box-shadow:0 24px 70px rgba(0,0,0,.35)}\\\n",
 ".msg-ind-box{width:min(100%,620px);max-height:94vh;overflow:auto;background:linear-gradient(160deg,#073a55,#0b5878);border:3px solid #69c7e7;border-radius:26px;padding:18px;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35)}\\\n"),
(".msg-ind-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.msg-ind-head h2{margin:0;color:#073a55;font-size:1.75rem}.msg-ind-close{width:48px;height:48px;border:0;border-radius:14px;background:#e8f1f4;color:#073a55;font-size:24px;font-weight:900}\\\n",
 ".msg-ind-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.msg-ind-head h2{margin:0;color:#fff;font-size:1.75rem}.msg-ind-close{width:48px;height:48px;border:0;border-radius:14px;background:#fff;color:#073a55;font-size:24px;font-weight:900}\\\n"),
(".msg-ind-box label{display:block;margin:12px 0 6px;font-weight:900}.msg-ind-field{width:100%;min-height:56px;border:2px solid #9bb6c2;border-radius:16px;padding:12px 13px;background:#fff;color:#102d40;font:inherit}.msg-ind-box textarea.msg-ind-field{min-height:110px;resize:vertical}\\\n",
 ".msg-ind-box label{display:block;margin:12px 0 6px;font-weight:900;color:#fff}.msg-ind-field{width:100%;min-height:62px;border:3px solid #a8c3ce;border-radius:18px;padding:12px 13px;background:#fff;color:#102d40;font:inherit;box-sizing:border-box}.msg-ind-box textarea.msg-ind-field{min-height:110px;resize:vertical}\\\n"),
(".msg-ind-preview{margin-top:14px;padding:14px;border:2px solid #b9cbd4;border-radius:18px;background:#f4f9fb;white-space:pre-line;line-height:1.45}.msg-ind-preview strong{display:block;margin-bottom:5px;color:#073a55}\\\n",
 ".msg-ind-preview{margin-top:14px;padding:14px;border:3px solid #a8c3ce;border-radius:18px;background:#fff;color:#102d40;line-height:1.45}.msg-ind-preview strong{display:block;margin-bottom:8px;color:#073a55}.msg-ind-preview-edit{width:100%;min-height:128px;border:0;outline:0;resize:vertical;background:#fff;color:#102d40;font:inherit;line-height:1.45;box-sizing:border-box}.msg-ind-preview small{display:block;margin-top:8px;color:#536b78;font-weight:750}.msg-ind-preview-legacy{display:none!important}\\\n"),
(".msg-ind-note{margin-top:12px;color:#536b78;font-size:.9rem;font-weight:700}.msg-ind-hide{display:none!important}\\\n",
 ".msg-ind-note{margin-top:12px;color:#d8eef7;font-size:.9rem;font-weight:700}.msg-ind-hide{display:none!important}#msgIndLivre{display:none!important}\\\n"),
("<label for=\"msgIndData\">Data</label><input id=\"msgIndData\" class=\"msg-ind-field\" type=\"date\"><label for=\"msgIndHora\">Horário</label><input id=\"msgIndHora\" class=\"msg-ind-field\" type=\"time\">",
 "<label for=\"msgIndData\">Data</label><input id=\"msgIndData\" class=\"msg-ind-field\" type=\"text\" inputmode=\"numeric\" maxlength=\"10\" autocomplete=\"off\" placeholder=\"DD/MM/AAAA\"><label for=\"msgIndHora\">Horário</label><input id=\"msgIndHora\" class=\"msg-ind-field\" type=\"text\" maxlength=\"22\" autocomplete=\"off\" placeholder=\"Ex.: 08:00 às 11:00 hs\">"),
("<div id=\"msgIndPreview\" class=\"msg-ind-preview\"><strong>Prévia</strong><span></span></div>",
 "<div id=\"msgIndPreview\" class=\"msg-ind-preview\"><strong>Prévia / mensagem a enviar</strong><textarea id=\"msgIndPreviewTexto\" class=\"msg-ind-preview-edit\" maxlength=\"700\" aria-label=\"Prévia editável da mensagem\"></textarea><small>Este é exatamente o texto que será enviado.</small><span class=\"msg-ind-preview-legacy\"></span></div>")
]
for old,new in replacements:
    if old not in s:
        raise SystemExit('Trecho esperado não encontrado no frontend: '+old[:80])
    s=s.replace(old,new,1)

old_listener="['msgIndTipo','msgIndServico','msgIndData','msgIndHora','msgIndMensagem'].forEach(function(id){var n=document.getElementById(id);if(n){n.addEventListener('input',atualizarFormulario);n.addEventListener('change',atualizarFormulario)}});"
new_listener="['msgIndTipo','msgIndServico','msgIndData','msgIndHora'].forEach(function(id){var n=document.getElementById(id);if(n){n.addEventListener('input',atualizarFormulario);n.addEventListener('change',atualizarFormulario)}});document.getElementById('msgIndPreviewTexto').addEventListener('input',function(){document.getElementById('msgIndMensagem').value=this.value});"
if old_listener not in s: raise SystemExit('Listener esperado não encontrado.')
s=s.replace(old_listener,new_listener,1)

start=s.index('function preview(){')
end=s.index('function resetTrack(){',start)
novo="""function mascararData(v){var d=txt(v).replace(/\\D/g,'').slice(0,8);if(d.length>4)return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);if(d.length>2)return d.slice(0,2)+'/'+d.slice(2);return d}\nfunction dataVisual(v){var d=txt(v);var iso=d.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);if(iso)return iso[3]+'/'+iso[2]+'/'+iso[1];return d}\nfunction horarioVisual(v){var h=txt(v).replace(/\\s+/g,' '),m=h.match(/^([01]\\d|2[0-3]):([0-5]\\d)\\s*(?:a|as|às|-)\\s*([01]\\d|2[0-3]):([0-5]\\d)\\s*(?:h|hs)?$/i);if(m)return'das '+m[1]+':'+m[2]+' às '+m[3]+':'+m[4]+' hs';if(/^([01]\\d|2[0-3]):[0-5]\\d$/.test(h))return'às '+h;return h}\nfunction horarioValido(v){var h=txt(v);return !h||/^([01]\\d|2[0-3]):[0-5]\\d$/.test(h)||/^([01]\\d|2[0-3]):[0-5]\\d\\s*(?:a|as|às|-)\\s*([01]\\d|2[0-3]):[0-5]\\d\\s*(?:h|hs)?$/i.test(h)}\nfunction preview(){var tipo=txt(document.getElementById('msgIndTipo').value),servico=txt(document.getElementById('msgIndServico').value),data=dataVisual(document.getElementById('msgIndData').value),hora=horarioVisual(document.getElementById('msgIndHora').value),nome=txt(selecionado&&selecionado.nome).split(' ')[0]||'Morador';if(tipo==='OUTRA_MENSAGEM')return'';if(!servico||!data)return'Informe o serviço e a data para montar a mensagem.';var quando=data+(hora?', '+hora:'');if(tipo==='CONFIRMAR_ATENDIMENTO')return nome+', seu atendimento de '+servico+' está confirmado para '+quando+'.';if(tipo==='ALTERAR_DATA')return nome+', a nova data do seu atendimento de '+servico+' é '+quando+'.';if(tipo==='LEMBRETE')return nome+', lembramos que seu atendimento de '+servico+' será em '+quando+'.';return nome+', seu atendimento de '+servico+', previsto para '+quando+', foi cancelado. Aguarde nova orientação do TACS.'}\nfunction atualizarFormulario(event){var tipo=document.getElementById('msgIndTipo').value,livre=tipo==='OUTRA_MENSAGEM',dados=document.getElementById('msgIndDadosAtendimento'),campo=document.getElementById('msgIndPreviewTexto');if(event&&event.target&&event.target.id==='msgIndData'){var mascarada=mascararData(event.target.value);if(event.target.value!==mascarada)event.target.value=mascarada}dados.classList.toggle('msg-ind-hide',livre);document.getElementById('msgIndLivre').classList.add('msg-ind-hide');if(livre){campo.placeholder='Digite aqui a mensagem que será enviada.';if(event&&event.target&&event.target.id==='msgIndTipo')campo.value=''}else{campo.placeholder='A mensagem será montada automaticamente.';campo.value=preview()}document.getElementById('msgIndMensagem').value=campo.value}\n"""
s=s[:start]+novo+s[end:]

start=s.index("function enviar(){if(!selecionado)return;")
end=s.index('\n\nfunction abrir(item)',start)
novo_enviar="""function enviar(){if(!selecionado)return;var tipo=document.getElementById('msgIndTipo').value,servico=txt(document.getElementById('msgIndServico').value),data=txt(document.getElementById('msgIndData').value),hora=txt(document.getElementById('msgIndHora').value),mensagem=txt(document.getElementById('msgIndPreviewTexto').value);document.getElementById('msgIndMensagem').value=mensagem;if(tipo!=='OUTRA_MENSAGEM'&&(!servico||!data)){setStatus('Informe o serviço e a data.','err');return}if(data&&!/^(?:\\d{2}\\/\\d{2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2})$/.test(data)){setStatus('Informe a data no formato DD/MM/AAAA.','err');return}if(!horarioValido(hora)){setStatus('Informe um horário como 08:00 ou 08:00 às 11:00 hs.','err');return}if(mensagem.length<3||/^Informe o serviço/.test(mensagem)){setStatus('Confira a mensagem que será enviada.','err');return}var b=document.getElementById('msgIndEnviar');b.disabled=true;setStatus('Enviando somente para o cadastro familiar deste morador…','warn');post('admin_mensagem_individual_enviar',sessao({origemAba:selecionado.origemAba,origemLinha:selecionado.origemLinha,moradorId:selecionado.moradorId||'',tipo:tipo,servico:servico,data:data,hora:hora,mensagem:mensagem}),function(r){b.disabled=false;if(!r||r.ok!==true){setStatus(txt(r&&r.message)||'O envio foi recusado pelo servidor.','err');return}if(r.enviado!==true){ultimoEnvio=null;resetTrack();setStatus(txt(r.message)||'Nenhum aparelho apto foi encontrado para este morador.','warn');return}ultimoEnvio={eventoId:r.eventoId};document.getElementById('msgIndTrack').classList.remove('msg-ind-hide');marcar('msgStepEnc',Number(r.encaminhadas)>0,'');setStatus('📤 Mensagem encaminhada para '+Number(r.encaminhadas||0)+' aparelho(s). Acompanhando a confirmação…','ok');agendarAtualizacoes()})}"""
s=s[:start]+novo_enviar+s[end:]

old_open="function abrir(item){instalar();selecionado=item||null;ultimoEnvio=null;limparTimers();resetTrack();if(!selecionado)return;var familia=txt(item.familiaId)||familiaEndereco(item.endereco);document.getElementById('msgIndPessoa').innerHTML='<strong>'+esc(item.nome||'Morador')+'</strong><span>Cadastro familiar '+esc(familia||'não identificado')+'</span>';document.getElementById('msgIndTipo').value='CONFIRMAR_ATENDIMENTO';document.getElementById('msgIndServico').value='';document.getElementById('msgIndData').value='';document.getElementById('msgIndHora').value='';document.getElementById('msgIndMensagem').value='';document.getElementById('msgIndividualMoradorV1').classList.remove('msg-ind-hide');setStatus('Confira a mensagem antes de enviar.','');atualizarFormulario();setTimeout(function(){document.getElementById('msgIndServico').focus()},50)}"
new_open="function abrir(item){instalar();selecionado=item||null;ultimoEnvio=null;limparTimers();resetTrack();if(!selecionado)return;var familia=txt(item.familiaId)||familiaEndereco(item.endereco);document.getElementById('msgIndPessoa').innerHTML='<strong>'+esc(item.nome||'Morador')+'</strong><span>Cadastro familiar '+esc(familia||'não identificado')+'</span>';document.getElementById('msgIndTipo').value='CONFIRMAR_ATENDIMENTO';document.getElementById('msgIndServico').value='';document.getElementById('msgIndData').value='';document.getElementById('msgIndHora').value='';document.getElementById('msgIndMensagem').value='';document.getElementById('msgIndPreviewTexto').value='';document.getElementById('msgIndividualMoradorV1').classList.remove('msg-ind-hide');setStatus('Confira a mensagem antes de enviar.','');atualizarFormulario();setTimeout(function(){document.getElementById('msgIndServico').focus()},50)}"
if old_open not in s: raise SystemExit('Função abrir esperada não encontrada.')
s=s.replace(old_open,new_open,1)
front.write_text(s,encoding='utf-8')

backend=Path('apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs')
b=backend.read_text(encoding='utf-8')
needle="  var nome=mensagemIndividualV1Texto_(morador.item.nome).split(' ')[0]||'Morador';\n"
insert="""  var mensagemFinal=mensagemIndividualV1Texto_(p.mensagem).slice(0,700);\n  if(mensagemFinal.length>=3){\n    var titulos={\n      CONFIRMAR_ATENDIMENTO:'Portal TACS — Atendimento confirmado',\n      ALTERAR_DATA:'Portal TACS — Nova data do atendimento',\n      LEMBRETE:'Portal TACS — Lembrete de atendimento',\n      CANCELAMENTO:'Portal TACS — Atendimento cancelado',\n      OUTRA_MENSAGEM:'Portal TACS — Mensagem individual'\n    };\n    return {titulo:titulos[tipo]||'Portal TACS — Mensagem individual',mensagem:mensagemFinal};\n  }\n  var nome=mensagemIndividualV1Texto_(morador.item.nome).split(' ')[0]||'Morador';\n"""
if needle not in b: raise SystemExit('Ponto do backend esperado não encontrado.')
b=b.replace(needle,insert,1)
backend.write_text(b,encoding='utf-8')

painel=Path('teste-v1/painel-moradores-v2.html')
p=painel.read_text(encoding='utf-8')
old='mensagem-individual-morador-v1.js?v=20260820-v1'
new='mensagem-individual-morador-v1.js?v=20260820-ux-v2'
if old not in p: raise SystemExit('Versão atual do módulo individual não encontrada no painel.')
painel.write_text(p.replace(old,new,1),encoding='utf-8')

teste=Path('scripts/test_mensagem_individual_morador_v1.js')
t=teste.read_text(encoding='utf-8')
anchor="assert.match(frontend,/Recebimento confirmado/);\n"
extra="""assert.match(frontend,/msgIndPreviewTexto/,'A prévia precisa ser um único campo editável.');\nassert.match(frontend,/Este é exatamente o texto que será enviado/,'A interface deve deixar claro que a prévia é a mensagem final.');\nassert.match(frontend,/type=\\\"text\\\" inputmode=\\\"numeric\\\" maxlength=\\\"10\\\"/,'A data não pode depender do seletor nativo fora do padrão.');\nassert.match(frontend,/08:00 às 11:00 hs/,'O horário deve aceitar intervalo de atendimento.');\nassert.match(frontend,/background:linear-gradient\\(160deg,#073a55,#0b5878\\)/,'A área externa da janela individual deve usar azul-petróleo.');\nassert.match(backend,/mensagemFinal=mensagemIndividualV1Texto_\\(p\\.mensagem\\)/,'O servidor deve respeitar exatamente a mensagem editada na prévia.');\nassert.match(panel,/mensagem-individual-morador-v1\\.js\\?v=20260820-ux-v2/,'O painel deve quebrar o cache da nova interface individual.');\n"""
if extra.strip() not in t:
    if anchor not in t: raise SystemExit('Âncora do teste não encontrada.')
    t=t.replace(anchor,anchor+extra,1)
teste.write_text(t,encoding='utf-8')
