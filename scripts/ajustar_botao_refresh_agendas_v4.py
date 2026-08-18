from pathlib import Path

p = Path('painel-oficial-agendas-vagas.html')
s = p.read_text(encoding='utf-8')

start = '<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V3_START -->'
end = '<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V3_END -->'
assert start in s and end in s, 'bloco flutuante V3 não encontrado'

novo = '''<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V4_START -->
<style id="agendaAtualizarPaginaFlutuanteV4Style">
#atualizarPaginaAgendasFlutuante{
  position:fixed!important;
  right:12px!important;
  bottom:calc(12px + env(safe-area-inset-bottom))!important;
  z-index:2147483000!important;
  min-height:46px!important;
  width:auto!important;
  max-width:calc(100vw - 24px)!important;
  margin:0!important;
  border:2px solid rgba(255,255,255,.9)!important;
  border-radius:999px!important;
  padding:10px 15px!important;
  background:#073a55!important;
  color:#fff!important;
  font:900 15px/1.15 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
  box-shadow:0 8px 24px rgba(0,0,0,.28)!important;
  cursor:pointer!important;
  white-space:nowrap!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:transparent!important;
}
#atualizarPaginaAgendasFlutuante:active{transform:translateY(1px)!important}
#atualizarPaginaAgendasFlutuante:disabled{opacity:.76!important}
@media(max-width:430px){
  #atualizarPaginaAgendasFlutuante{
    right:10px!important;
    bottom:calc(10px + env(safe-area-inset-bottom))!important;
    min-height:44px!important;
    padding:9px 13px!important;
    font-size:14px!important;
  }
}
</style>
<button id="atualizarPaginaAgendasFlutuante" type="button" aria-label="Atualizar esta página e refazer a conexão" title="Atualizar esta página e refazer a conexão"><span aria-hidden="true">↻</span><span>Atualizar página</span></button>
<script id="agendaAtualizarPaginaFlutuanteV4Script">
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
</script>
<!-- ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V4_END -->'''

a = s.index(start)
b = s.index(end, a) + len(end)
s = s[:a] + novo + s[b:]
s = s.replace('agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v3', 'agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v4')

# Validações: mesmas medidas do botão do Portal do Morador (portal-auto-update.js)
for token in [
    'right:12px!important;',
    'bottom:calc(12px + env(safe-area-inset-bottom))!important;',
    'min-height:46px!important;',
    'border:2px solid rgba(255,255,255,.9)!important;',
    'padding:10px 15px!important;',
    'background:#073a55!important;',
    'font:900 15px/1.15',
    'right:10px!important;',
    'bottom:calc(10px + env(safe-area-inset-bottom))!important;',
    'min-height:44px!important;',
    'padding:9px 13px!important;',
    'font-size:14px!important;',
    'ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V4_START',
    'agenda-whatsapp-card-v1.js?v=20260818-agendas-refresh-float-v4'
]:
    assert token in s, f'faltou validação: {token}'

assert 'ATUALIZAR_PAGINA_FLUTUANTE_AGENDAS_V3_START' not in s
p.write_text(s, encoding='utf-8')
print('BOTAO_REFRESH_AGENDAS_V4_OK')
