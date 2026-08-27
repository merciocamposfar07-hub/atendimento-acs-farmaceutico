from pathlib import Path

PANEL = Path('painel-oficial-recados-campanhas.html')
DEVICE = Path('admin-aparelho-tacs-teste-v1.js')
LOADER = Path('recados-campanhas-whatsapp-mensal-v12.js')
TEST_RENDER = Path('scripts/test_recados_safari_render_v1.js')


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'Ponto cirúrgico não localizado: {label}')
    return text.replace(old, new, 1)


def main():
    panel = PANEL.read_text()

    # Safari/iPhone: o documento raiz deve continuar sendo o scroller.
    panel = replace_once(
        panel,
        'html,body{overflow-x:visible!important;overflow-y:visible!important}',
        'html{overflow-x:hidden!important;overflow-y:auto!important}body{overflow-x:hidden!important;overflow-y:visible!important}',
        'overflow raiz do painel Recados'
    )

    # Remove o transporte por iframe/form de TODAS as ações deste painel.
    # O Apps Script já trabalha por requestId + consulta JSONP; portanto o POST
    # pode ser disparado com fetch no-cors sem criar uma subpágina dentro do Safari.
    old_transport = """  var frame=document.createElement('iframe'),f=document.createElement('form'),frameName='ponteConteudoV102_'+Date.now()+'_'+Math.floor(Math.random()*1000);
  frame.name=frameName;frame.setAttribute('name',frameName);frame.className='ponte';frame.setAttribute('aria-hidden','true');frame.src='about:blank';
  f.method='POST';f.action=API+'?_='+Date.now();f.target=frameName;f.setAttribute('target',frameName);f.className='ponte';
  Object.keys(campos).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=txt(campos[k]);f.appendChild(i)});
  ativa.frame=frame;ativa.form=f;document.body.appendChild(frame);document.body.appendChild(f);
  var enviado=false;
  function enviarUmaVez(){
    if(enviado||!ativa||ativa.id!==id)return;
    enviado=true;
    clearTimeout(ativa.submitTimer);ativa.submitTimer=null;
    try{f.submit()}catch(erro){finalizar({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
    agendarConsulta();
  }
  function enviarDepoisDoRegistro(){
    if(typeof window.requestAnimationFrame==='function'){
      window.requestAnimationFrame(function(){window.requestAnimationFrame(enviarUmaVez)});
      return;
    }
    setTimeout(enviarUmaVez,60);
  }
  frame.addEventListener('load',enviarDepoisDoRegistro,{once:true});
  enviarDepoisDoRegistro();
  ativa.submitTimer=setTimeout(enviarUmaVez,180);
"""
    new_transport = """  var body=new URLSearchParams();
  Object.keys(campos).forEach(function(k){body.set(k,txt(campos[k]))});
  ativa.frame=null;ativa.form=null;
  fetch(API+'?_='+Date.now(),{
    method:'POST',
    mode:'no-cors',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body:body.toString(),
    cache:'no-store'
  }).catch(function(){
    /* A resposta CORS não é lida aqui. O resultado real é obtido pelo requestId. */
  }).then(function(){
    if(!ativa||ativa.id!==id)return;
    agendarConsulta();
  });
"""
    panel = replace_once(panel, old_transport, new_transport, 'transporte POST do painel')

    # Garante que o Safari receba os JS novos, sem depender do cache anterior.
    panel = panel.replace(
        'central-back-button-v1.js?v=43a5c181d2c9',
        'central-back-button-v1.js?v=20260827-recados-buttons-safe-v1'
    )
    panel = panel.replace(
        'recados-campanhas-whatsapp-mensal-v12.js?v=43a5c181d2c9',
        'recados-campanhas-whatsapp-mensal-v12.js?v=20260827-recados-buttons-safe-v1'
    )
    PANEL.write_text(panel)

    device = DEVICE.read_text()
    auto_refresh = "var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){if(paginaAtiva())atualizar.click()},250)"
    if auto_refresh in device:
        device = device.replace(auto_refresh, "/* atualização remota fica manual para não repintar a página no iPhone */", 1)
    elif 'atualizar.click()' in device:
        raise SystemExit('Há outro auto-clique de Saúde das notificações não previsto.')
    DEVICE.write_text(device)

    loader = LOADER.read_text()
    loader = loader.replace(
        'admin-aparelho-tacs-teste-v1.js?v=20260821-tacs-device-v7',
        'admin-aparelho-tacs-teste-v1.js?v=20260827-recados-buttons-safe-v1'
    )
    LOADER.write_text(loader)

    test = TEST_RENDER.read_text()
    test = test.replace(
        "assert.match(panel.slice(safariFix), /html,body\\{overflow-x:visible!important;overflow-y:visible!important\\}/);",
        "assert.match(panel.slice(safariFix), /html\\{overflow-x:hidden!important;overflow-y:auto!important\\}body\\{overflow-x:hidden!important;overflow-y:visible!important\\}/);"
    )
    TEST_RENDER.write_text(test)

    # Validação estrutural antes de o workflow sequer executar os testes Node.
    panel = PANEL.read_text()
    start = panel.index('function post(action,payload,cb,resultAction)')
    end = panel.index('function sessao()', start)
    post_block = panel[start:end]
    if "createElement('iframe')" in post_block or "createElement('form')" in post_block or '.submit()' in post_block:
        raise SystemExit('O POST do painel ainda cria iframe/form.')
    if "mode:'no-cors'" not in post_block or 'agendarConsulta()' not in post_block:
        raise SystemExit('O POST seguro por fetch/requestId não foi instalado corretamente.')
    if 'html{overflow-x:hidden!important;overflow-y:auto!important}' not in panel:
        raise SystemExit('O HTML raiz não ficou como scroller no Safari.')
    if 'atualizar.click()' in DEVICE.read_text():
        raise SystemExit('O modo TACS ainda dispara atualização remota automática.')

    print('RECADO_BOTOES_IPHONE_SAFE_V1_APLICADO')


if __name__ == '__main__':
    main()
