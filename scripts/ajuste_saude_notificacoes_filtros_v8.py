from pathlib import Path
import re

PANEL = Path('painel-oficial-recados-campanhas.html')
CENTRAL_JS = Path('central-administrativa-tacs.js')
CENTRAL_HTML = Path('central-administrativa-tacs.html')
REV = '20260816-recados-saude-filtros-v8'
MARK = 'SAUDE_NOTIFICACOES_FILTROS_V8'

text = PANEL.read_text(encoding='utf-8')

if MARK not in text:
    # 1) Os quatro indicadores passam a ser botoes-filtro, mantendo numeros e rotulos.
    old = '<div class="saude-resumo"><div class="saude-numero"><strong id="saudeAtivos">0</strong><span>Aptos</span></div><div class="saude-numero"><strong id="saudeInativos">0</strong><span>Inativos</span></div><div class="saude-numero"><strong id="saudeReparo">0</strong><span>Precisam de reparo</span></div><div class="saude-numero"><strong id="saudeSemConfirmacao">0</strong><span>Sem confirmação</span></div></div>'
    new = '<div class="saude-resumo"><button class="saude-numero" type="button" data-saude-filtro="ATIVO" aria-pressed="false"><strong id="saudeAtivos">0</strong><span>Aptos</span></button><button class="saude-numero" type="button" data-saude-filtro="INATIVO" aria-pressed="false"><strong id="saudeInativos">0</strong><span>Inativos</span></button><button class="saude-numero" type="button" data-saude-filtro="REPARO" aria-pressed="false"><strong id="saudeReparo">0</strong><span>Precisam de reparo</span></button><button class="saude-numero" type="button" data-saude-filtro="SEM_CONFIRMACAO" aria-pressed="false"><strong id="saudeSemConfirmacao">0</strong><span>Sem confirmação</span></button></div>'
    if old not in text:
        raise SystemExit('Bloco dos quatro indicadores nao encontrado')
    text = text.replace(old, new, 1)

    old_list = '<div id="saudeNotificacoesLista" class="saude-lista"></div>'
    if old_list not in text:
        raise SystemExit('Lista de notificacoes nao encontrada')
    text = text.replace(old_list, '<div id="saudeNotificacoesLista" class="saude-lista oculto"></div>', 1)

    # 2) Estilo clicavel, mantendo o mesmo padrao azul-petroleo existente.
    css = r'''
/* SAUDE_NOTIFICACOES_FILTROS_V8 */
.saude-resumo button.saude-numero{
  -webkit-appearance:none;appearance:none;width:100%;min-width:0;margin:0;
  font:inherit;color:inherit;cursor:pointer;touch-action:manipulation;
}
.saude-resumo button.saude-numero:focus-visible{outline:4px solid #ffd54f;outline-offset:2px}
.saude-resumo button.saude-numero[aria-pressed="true"]{
  border-color:#9de8ff!important;
  box-shadow:0 0 0 3px rgba(157,232,255,.35),0 10px 20px rgba(7,58,85,.2)!important;
  transform:translateY(-1px);
}
.saude-lista-controle{display:flex;justify-content:flex-end;margin-top:10px}
.saude-fechar-lista{width:100%;min-height:50px;border:2px solid #69c7e7;border-radius:15px;background:#fff;color:#073a55;font-weight:900}
'''
    needle = '</style>\n\n<style id="recadosStableV7Style">'
    if needle not in text:
        raise SystemExit('Ponto de insercao do CSS nao encontrado')
    text = text.replace('</style>\n\n<style id="recadosStableV7Style">', css + '\n</style>\n\n<style id="recadosStableV7Style">', 1)

    # 3) Troca somente a renderizacao da lista tecnica: por padrao fechada; abre por categoria.
    pattern = re.compile(r"function esconderSaudeNotificacoes\(\)\{.*?\nfunction carregarSaudeNotificacoes\(\)", re.S)
    match = pattern.search(text)
    if not match:
        raise SystemExit('Funcoes de saude das notificacoes nao encontradas')

    replacement = r'''var saudeNotificacoesDados=null,saudeFiltroAtivo='';
function esconderSaudeNotificacoes(){
  var box=document.getElementById('saudeNotificacoes'),lista=document.getElementById('saudeNotificacoesLista');
  if(box)box.classList.add('oculto');
  if(lista){lista.innerHTML='';lista.classList.add('oculto')}
  saudeNotificacoesDados=null;saudeFiltroAtivo='';
  document.querySelectorAll('[data-saude-filtro]').forEach(function(b){b.setAttribute('aria-pressed','false')});
}
function cartaoSaudeAparelho(a){
  var telefone=txt(a.telefone),meta=[txt(a.dispositivo),txt(a.navegador),txt(a.sistema)].filter(Boolean).join(' • '),ultima=txt(a.ultimoCheckin),ref=txt(a.subscriptionRef);
  return '<div class="saude-aparelho"><div class="saude-aparelho-topo"><div><h3>'+esc(a.nome)+'</h3><div class="saude-meta">'+esc(meta||'Aparelho identificado')+(telefone?'<br>Contato cadastrado: '+esc(telefone):'')+(ultima?'<br>Última checagem: '+esc(ultima):'')+(ref?'<br>Referência técnica: …'+esc(ref):'')+'</div></div><span class="saude-status '+esc(a.status)+'">'+esc(a.statusTexto||a.status)+'</span></div><div class="saude-meta">'+esc(a.motivo||'')+'</div></div>';
}
function atualizarBotoesSaude(){
  document.querySelectorAll('[data-saude-filtro]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-saude-filtro')===saudeFiltroAtivo?'true':'false')});
}
function renderSaudeLista(){
  var lista=document.getElementById('saudeNotificacoesLista'),aparelhos=Array.isArray(saudeNotificacoesDados&&saudeNotificacoesDados.aparelhos)?saudeNotificacoesDados.aparelhos:[];
  atualizarBotoesSaude();
  if(!saudeFiltroAtivo){lista.innerHTML='';lista.classList.add('oculto');return}
  var filtrados=aparelhos.filter(function(a){return txt(a.status).toUpperCase()===saudeFiltroAtivo});
  lista.classList.remove('oculto');
  if(!filtrados.length){
    lista.innerHTML='<div class="saude-vazio">Nenhum aparelho nesta situação.</div><div class="saude-lista-controle"><button class="saude-fechar-lista" type="button">Fechar lista</button></div>';
    return;
  }
  lista.innerHTML=filtrados.map(cartaoSaudeAparelho).join('')+'<div class="saude-lista-controle"><button class="saude-fechar-lista" type="button">Fechar lista</button></div>';
}
function selecionarSaudeFiltro(filtro){
  var novo=txt(filtro).toUpperCase();
  saudeFiltroAtivo=saudeFiltroAtivo===novo?'':novo;
  renderSaudeLista();
  if(saudeFiltroAtivo){var lista=document.getElementById('saudeNotificacoesLista');if(lista&&typeof lista.scrollIntoView==='function')setTimeout(function(){lista.scrollIntoView({behavior:'smooth',block:'nearest'})},0)}
}
function renderSaudeNotificacoes(r){
  var box=document.getElementById('saudeNotificacoes'),c=r&&r.contagens||{},aparelhos=Array.isArray(r&&r.aparelhos)?r.aparelhos:[];
  saudeNotificacoesDados=r||{aparelhos:[]};
  box.classList.remove('oculto');
  document.getElementById('saudeTitulo').textContent='Saúde das notificações — '+txt(r&&r.areaNome||areaId);
  document.getElementById('saudeAtivos').textContent=Number(c.ativos||0);
  document.getElementById('saudeInativos').textContent=Number(c.inativos||0);
  document.getElementById('saudeReparo').textContent=Number(c.reparo||0);
  document.getElementById('saudeSemConfirmacao').textContent=Number(c.semConfirmacao||0);
  renderSaudeLista();
  if(!aparelhos.length){status('saudeNotificacoesStatus','Nenhum aparelho identificado nesta área ainda.','aviso');return}
  var msg=r.oneSignalConsultado===true?'Situação atualizada com a consulta técnica ao OneSignal. Toque em um indicador para ver os aparelhos.':'Aparelhos listados pelo Portal, mas o OneSignal não pôde ser consultado agora. Toque em um indicador para ver os aparelhos.';
  status('saudeNotificacoesStatus',msg,r.oneSignalConsultado===true?'ok':'aviso');
}
function carregarSaudeNotificacoes()'''
    text = text[:match.start()] + replacement + text[match.end():]

    # 4) Delegacao de clique nos quatro indicadores e em "Fechar lista".
    listener_needle = "document.getElementById('atualizarSaudeNotificacoes').addEventListener('click',carregarSaudeNotificacoes);document.getElementById('solicitarReparoNotificacoes').addEventListener('click',solicitarReparoNotificacoesArea);"
    listener_new = "document.getElementById('atualizarSaudeNotificacoes').addEventListener('click',carregarSaudeNotificacoes);document.getElementById('solicitarReparoNotificacoes').addEventListener('click',solicitarReparoNotificacoesArea);document.getElementById('saudeNotificacoes').addEventListener('click',function(e){var filtro=e.target.closest('[data-saude-filtro]');if(filtro){selecionarSaudeFiltro(filtro.getAttribute('data-saude-filtro'));return}if(e.target.closest('.saude-fechar-lista')){saudeFiltroAtivo='';renderSaudeLista()}});"
    if listener_needle not in text:
        raise SystemExit('Ponto de listeners de saude nao encontrado')
    text = text.replace(listener_needle, listener_new, 1)

    PANEL.write_text(text, encoding='utf-8')

# Cache-busting: somente a URL do modulo Recados e o JS da Central.
central_js = CENTRAL_JS.read_text(encoding='utf-8')
central_js = re.sub(
    r"if\(name==='recados'\)return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'&v=[^']+';",
    "if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v="+REV+"';",
    central_js,
)
CENTRAL_JS.write_text(central_js, encoding='utf-8')

central_html = CENTRAL_HTML.read_text(encoding='utf-8')
central_html = re.sub(r"central-administrativa-tacs\.js\?v=[^\"']+", 'central-administrativa-tacs.js?v='+REV, central_html)
CENTRAL_HTML.write_text(central_html, encoding='utf-8')

# Validacoes de escopo e integridade.
final = PANEL.read_text(encoding='utf-8')
assert MARK in final
for filtro in ['ATIVO','INATIVO','REPARO','SEM_CONFIRMACAO']:
    assert 'data-saude-filtro="'+filtro+'"' in final
assert 'saudeNotificacoesLista" class="saude-lista oculto"' in final
assert 'cartaoSaudeAparelho' in final
assert 'Contato cadastrado:' in final
assert 'Última checagem:' in final
assert 'Referência técnica:' in final
assert "esc(a.statusTexto||a.status)" in final
assert "esc(a.motivo||'')" in final
assert 'Fechar lista' in final
assert "post('admin_notificacoes_saude'" in final
assert "post('admin_notificacoes_solicitar_reparo_area'" in final
assert '&v='+REV in CENTRAL_JS.read_text(encoding='utf-8')
assert 'central-administrativa-tacs.js?v='+REV in CENTRAL_HTML.read_text(encoding='utf-8')
print('OK: indicadores clicaveis, lista fechada por padrao e detalhes tecnicos preservados.')
