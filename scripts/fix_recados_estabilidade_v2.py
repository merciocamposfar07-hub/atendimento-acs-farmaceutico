from pathlib import Path
import re

PAINEL = Path('painel-oficial-recados-campanhas.html')
RENDER = Path('central-back-button-v1.js')
VERSAO = '20260826-recados-estabilidade-v2'

html = PAINEL.read_text(encoding='utf-8')

if 'var saudeRemotaAtiva=null;' not in html:
    nova_funcao = r'''var saudeRemotaAtiva=null;
function postSaudeRemotaNaoBloqueante(payload,cb){
  if(saudeRemotaAtiva){cb({ok:false,temporario:true,message:'A conferência técnica já está em andamento.'});return}
  var id=requestId('admin_notificacoes_saude_remota'),campos={},frame=document.createElement('iframe'),form=document.createElement('form'),frameName='ponteSaude_'+Date.now()+'_'+Math.floor(Math.random()*1000),limite=Date.now()+22000,pollTimer=null,submitTimer=null,concluida=false;
  Object.keys(payload||{}).forEach(function(k){campos[k]=payload[k]});
  campos.action='admin_notificacoes_saude_remota';campos.requestId=id;
  frame.name=frameName;frame.setAttribute('name',frameName);frame.className='ponte';frame.setAttribute('aria-hidden','true');frame.src='about:blank';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.setAttribute('target',frameName);form.className='ponte';
  Object.keys(campos).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=txt(campos[k]);form.appendChild(i)});
  function limpar(){clearTimeout(pollTimer);clearTimeout(submitTimer);if(form.parentNode)form.remove();if(frame.parentNode)setTimeout(function(){if(frame.parentNode)frame.remove()},200)}
  function finalizarSaude(r){if(concluida)return;concluida=true;limpar();saudeRemotaAtiva=null;cb(r||{ok:false,temporario:true,message:'A conferência técnica não devolveu resposta.'})}
  function consultarSaude(){if(concluida)return;jsonp('admin_notificacoes_saude_result',{requestId:id},function(r){if(concluida)return;if(r&&r.ok===true&&r.pendente===false){finalizarSaude(r.result);return}if(Date.now()>=limite){finalizarSaude({ok:false,temporario:true,message:'A conferência do OneSignal não terminou no tempo desta tela.'});return}pollTimer=setTimeout(consultarSaude,750)})}
  var enviado=false;
  function enviar(){if(enviado||concluida)return;enviado=true;try{form.submit()}catch(e){finalizarSaude({ok:false,temporario:true,message:'Não foi possível iniciar a conferência técnica.'});return}pollTimer=setTimeout(consultarSaude,500)}
  saudeRemotaAtiva={id:id};
  document.body.appendChild(frame);document.body.appendChild(form);
  frame.addEventListener('load',enviar,{once:true});
  submitTimer=setTimeout(enviar,140);
}
function atualizarSaudeNotificacoesRemota(){
  if(!(token||territorioToken))return;
  var botao=document.getElementById('atualizarSaudeNotificacoes'),areaSolicitada=areaId;
  document.getElementById('saudeNotificacoes').classList.remove('oculto');
  if(saudeRemotaAtiva){status('saudeNotificacoesStatus','A conferência do OneSignal já está em andamento em segundo plano. Recados e campanhas continuam disponíveis.','aviso');return}
  if(botao)botao.disabled=true;
  status('saudeNotificacoesStatus','Conferindo o estado atual no OneSignal em segundo plano. Recados e campanhas continuam disponíveis.','aviso');
  postSaudeRemotaNaoBloqueante(sessao(),function(remoto){
    if(botao)botao.disabled=false;
    if(areaId!==areaSolicitada)return;
    if(remoto&&remoto.ok===true){renderSaudeNotificacoes(remoto);return}
    status('saudeNotificacoesStatus','A conferência do OneSignal não terminou agora. Os últimos dados continuam visíveis e o painel permaneceu disponível.','aviso');
  });
}
'''
    padrao = r"function atualizarSaudeNotificacoesRemota\(\)\{.*?\}\n(?=function solicitarReparoNotificacoesArea)"
    html, n = re.subn(padrao, nova_funcao, html, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('ERRO: a função remota de Saúde não foi localizada exatamente uma vez.')

html, nversao = re.subn(
    r'central-back-button-v1\.js\?v=[^"]+',
    'central-back-button-v1.js?v=' + VERSAO,
    html,
    count=1,
)
if nversao != 1:
    raise SystemExit('ERRO: o carregamento de central-back-button-v1.js não foi localizado exatamente uma vez.')

PAINEL.write_text(html, encoding='utf-8')

render = RENDER.read_text(encoding='utf-8')
antigo = "'html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;scroll-behavior:auto!important;}',"
novo = "'html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:visible!important;scroll-behavior:auto!important;}',"
if antigo in render:
    render = render.replace(antigo, novo, 1)
elif novo not in render:
    raise SystemExit('ERRO: a regra raiz de rolagem do painel Recados não foi localizada.')
RENDER.write_text(render, encoding='utf-8')

html_final = PAINEL.read_text(encoding='utf-8')
render_final = RENDER.read_text(encoding='utf-8')
assert 'var saudeRemotaAtiva=null;' in html_final
assert 'postSaudeRemotaNaoBloqueante(sessao()' in html_final
assert 'Recados e campanhas continuam disponíveis.' in html_final
assert 'central-back-button-v1.js?v=' + VERSAO in html_final
assert 'overflow-y:visible!important;scroll-behavior:auto!important' in render_final
assert "function atualizarSaudeNotificacoesRemota(){if(!(token||territorioToken)||ativa)return" not in html_final

scripts = []
for attrs, body in re.findall(r'<script([^>]*)>(.*?)</script>', html_final, flags=re.S | re.I):
    if 'src=' not in attrs.lower():
        scripts.append(body)
Path('/tmp/recados-inline.js').write_text('\n;\n'.join(scripts), encoding='utf-8')

print('PATCH_OK')
