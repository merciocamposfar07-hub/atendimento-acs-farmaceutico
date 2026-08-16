from pathlib import Path
import re

SRC = Path('teste-v1/painel-profissionais-servicos-v1.html')
OFFICIAL = Path('painel-oficial-profissionais-servicos.html')
CENTRAL_JS = Path('central-administrativa-tacs.js')
CENTRAL_HTML = Path('central-administrativa-tacs.html')

REV = '20260816-profissionais-v3'
MARKER = 'AJUSTE_PROFISSIONAIS_SERVICOS_V3'

text = SRC.read_text(encoding='utf-8')
if MARKER not in text:
    css = r'''
/* AJUSTE_PROFISSIONAIS_SERVICOS_V3 */
.resumo .numero{
  background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important;
  border-color:#69c7e7!important;
  color:#fff!important;
  box-shadow:0 8px 18px rgba(7,58,85,.16)!important;
}
.resumo .numero strong{color:#fff!important}
.resumo .numero span{color:#d8eef7!important}
'''
    text = text.replace('</style>', css + '\n</style>', 1)

    js = r'''
<script id="ajusteProfissionaisServicosV3">
(function(){
  'use strict';
  function normalizar(v){
    var s=String(v==null?'':v);
    if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return s.toUpperCase().replace(/\s+/g,' ').trim();
  }
  function redundante(card){
    return normalizar(card&&card.textContent).indexOf('ATENDIMENTO ODONTOLOGICO DE EMERGENCIA')!==-1;
  }
  function sincronizar(){
    var lista=document.getElementById('listaServicos');
    if(!lista)return;
    var cards=Array.prototype.slice.call(lista.querySelectorAll('.cartao'));
    cards.forEach(function(card){if(redundante(card)&&card.parentNode)card.parentNode.removeChild(card)});
    cards=Array.prototype.slice.call(lista.querySelectorAll('.cartao'));
    var total=document.getElementById('qServ');
    var ativos=document.getElementById('qServAtivos');
    if(total)total.textContent=String(cards.length);
    if(ativos)ativos.textContent=String(cards.filter(function(card){return !!card.querySelector('.sinal.ativo')}).length);
  }
  function instalar(){
    var lista=document.getElementById('listaServicos');
    if(!lista)return;
    sincronizar();
    if(window.MutationObserver){
      var agendado=false;
      new MutationObserver(function(){
        if(agendado)return;
        agendado=true;
        requestAnimationFrame(function(){agendado=false;sincronizar()});
      }).observe(lista,{childList:true,subtree:true});
    }
    document.addEventListener('click',function(e){
      if(e.target&&e.target.id==='abaServ')setTimeout(sincronizar,0);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
  else instalar();
})();
</script>
'''
    text = text.replace('</body>', js + '\n</body>', 1)
    SRC.write_text(text, encoding='utf-8')

# O painel oficial continua como carregador do painel fonte, mas com cache-busting novo.
official = OFFICIAL.read_text(encoding='utf-8')
official = re.sub(
    r"painel-profissionais-servicos-v1\.html\?v=[^'\"]+",
    f"painel-profissionais-servicos-v1.html?v={REV}",
    official,
)
OFFICIAL.write_text(official, encoding='utf-8')

# Apenas Profissionais e serviços recebe a revisão nova na Central.
central_js = CENTRAL_JS.read_text(encoding='utf-8')
central_js = re.sub(
    r"if\(name==='profissionais'\)return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos\.html\?area='\+area\+access\+'&v='\+revision;",
    "if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v=20260816-profissionais-v3';",
    central_js,
)
CENTRAL_JS.write_text(central_js, encoding='utf-8')

# Força o Safari/iPhone a buscar o JS novo da Central.
central_html = CENTRAL_HTML.read_text(encoding='utf-8')
central_html = re.sub(
    r"central-administrativa-tacs\.js\?v=[^\"']+",
    f"central-administrativa-tacs.js?v={REV}",
    central_html,
)
CENTRAL_HTML.write_text(central_html, encoding='utf-8')

# Validações locais de escopo e intenção.
final = SRC.read_text(encoding='utf-8')
assert MARKER in final
assert 'ATENDIMENTO ODONTOLOGICO DE EMERGENCIA' in final
assert '.resumo .numero{' in final
assert 'background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important' in final
assert f'painel-profissionais-servicos-v1.html?v={REV}' in OFFICIAL.read_text(encoding='utf-8')
assert f'&v={REV}' in CENTRAL_JS.read_text(encoding='utf-8')
assert f'central-administrativa-tacs.js?v={REV}' in CENTRAL_HTML.read_text(encoding='utf-8')
