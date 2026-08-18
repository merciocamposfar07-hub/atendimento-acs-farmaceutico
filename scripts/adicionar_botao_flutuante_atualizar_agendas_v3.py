from pathlib import Path

TARGET = Path('painel-oficial-agendas-vagas.html')
html = TARGET.read_text(encoding='utf-8')

START = '<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V3_START -->'
END = '<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V3_END -->'

# Idempotência: remove bloco V3 anterior, caso exista.
if START in html and END in html:
    antes, resto = html.split(START, 1)
    _, depois = resto.split(END, 1)
    html = antes + depois

style = r'''<style id="agendaAtualizarPaginaFlutuanteV3Style">
#atualizarPaginaAgendasFlutuante{
  position:fixed!important;
  right:max(14px,calc(env(safe-area-inset-right) + 10px))!important;
  bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))!important;
  left:auto!important;
  top:auto!important;
  z-index:2147483000!important;
  width:auto!important;
  min-width:0!important;
  max-width:calc(100vw - 28px)!important;
  min-height:54px!important;
  margin:0!important;
  padding:10px 17px!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:8px!important;
  border:3px solid #d9f0f9!important;
  border-radius:999px!important;
  background:linear-gradient(145deg,#073a55,#0b5878)!important;
  color:#fff!important;
  font-size:.94rem!important;
  font-weight:900!important;
  line-height:1!important;
  white-space:nowrap!important;
  box-shadow:0 9px 24px rgba(0,0,0,.30)!important;
  cursor:pointer!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:transparent!important;
}
#atualizarPaginaAgendasFlutuante:active{transform:scale(.98)!important}
#atualizarPaginaAgendasFlutuante:disabled{opacity:.76!important}
@media(max-width:560px){
  #atualizarPaginaAgendasFlutuante{
    right:14px!important;
    bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))!important;
    font-size:.92rem!important;
    padding:10px 16px!important;
  }
}
</style>'''

button = r'''<button id="atualizarPaginaAgendasFlutuante" type="button" aria-label="Atualizar página" title="Atualizar página"><span aria-hidden="true">↻</span><span>Atualizar página</span></button>
<script id="agendaAtualizarPaginaFlutuanteV3Script">
(function(){
  'use strict';
  function removerBotaoAntigo(){
    var antigo=document.getElementById('atualizarPaginaAgendas');
    if(antigo&&antigo.parentNode)antigo.parentNode.removeChild(antigo);
  }
  function ligarBotao(){
    removerBotaoAntigo();
    var b=document.getElementById('atualizarPaginaAgendasFlutuante');
    if(!b||b.dataset.refreshBound==='1')return;
    b.dataset.refreshBound='1';
    b.addEventListener('click',function(){
      if(b.disabled)return;
      b.disabled=true;
      b.innerHTML='<span aria-hidden="true">↻</span><span>Atualizando…</span>';
      setTimeout(function(){window.location.reload()},40);
    });
  }
  ligarBotao();
  var obs=new MutationObserver(function(){removerBotaoAntigo();ligarBotao()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''

block = '\n' + START + '\n' + style + '\n' + button + '\n' + END + '\n'

if '</main>' not in html:
    raise SystemExit('ERRO: </main> não encontrado')
html = html.replace('</main>', '</main>' + block, 1)

# Evita carregar duas vezes o mesmo módulo auxiliar e força URL nova para fugir do cache antigo.
old1 = '<script src="/atendimento-acs-farmaceutico/agenda-whatsapp-card-v1.js?v=20260817-agenda-completa-v2"></script>'
old2 = '<script src="/atendimento-acs-farmaceutico/agenda-whatsapp-card-v1.js?v=20260817-1"></script>'
html = html.replace(old1 + '\n' + old2, '<script src="/atendimento-acs-farmaceutico/agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v3"></script>')
html = html.replace(old1, '<script src="/atendimento-acs-farmaceutico/agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v3"></script>')
html = html.replace(old2, '')

# Validações locais antes de gravar.
assert html.count('id="atualizarPaginaAgendasFlutuante"') == 1
assert 'position:fixed!important' in html
assert "window.location.reload()" in html
assert 'function salvarAgenda(c)' in html
assert 'function restaurar()' in html
assert html.count('agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v3') == 1

TARGET.write_text(html, encoding='utf-8')
print('BOTAO_FLUTUANTE_AGENDAS_V3_APLICADO_OK')
