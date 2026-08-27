from pathlib import Path

ADMIN = Path('admin-aparelho-tacs-teste-v1.js')
PANEL = Path('painel-oficial-recados-campanhas.html')
LOADER = Path('recados-campanhas-whatsapp-mensal-v12.js')
TEST_TACS = Path('scripts/test_aparelho_tacs_teste_v1.js')

ADMIN_OLD = "ultimoEstado=r;operando=false;render(r);var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){if(paginaAtiva())atualizar.click()},250)"
ADMIN_NEW = "ultimoEstado=r;operando=false;render(r)"

HEALTH_OLD = "function atualizarSaudeNotificacoesRemota(){if(!(token||territorioToken)||ativa)return;document.getElementById('saudeNotificacoes').classList.remove('oculto');status('saudeNotificacoesStatus','Conferindo o estado atual no OneSignal…','aviso');post('admin_notificacoes_saude_remota',sessao(),function(remoto){if(remoto&&remoto.ok===true){renderSaudeNotificacoes(remoto);return}status('saudeNotificacoesStatus','A conferência do OneSignal não terminou agora. Os últimos dados continuam visíveis.','aviso')},'admin_notificacoes_saude_result')}"

HEALTH_NEW = r"""var saudeRemotaEmCurso=false;
function postSaudeNotificacoesIsolado(payload,cb){
  var id=requestId('admin_notificacoes_saude_remota'),body=new URLSearchParams(),inicio=Date.now(),concluido=false;
  Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k])});
  body.set('action','admin_notificacoes_saude_remota');body.set('requestId',id);
  function terminar(r){if(concluido)return;concluido=true;cb(r||{ok:false,message:'Resposta vazia da conferência das notificações.'})}
  function consultarResultado(){
    if(concluido)return;
    jsonp('admin_notificacoes_saude_result',{requestId:id},function(r){
      if(concluido)return;
      if(r&&r.ok===true&&r.pendente===false){terminar(r.result);return}
      if(Date.now()-inicio>=25000){terminar({ok:false,temporario:true,message:'A conferência do OneSignal ainda está processando. Os últimos dados permanecem na tela.'});return}
      setTimeout(consultarResultado,850);
    });
  }
  fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
  setTimeout(consultarResultado,350);
}
function atualizarSaudeNotificacoesRemota(){
  if(!(token||territorioToken)||ativa||saudeRemotaEmCurso)return;
  var botao=document.getElementById('atualizarSaudeNotificacoes');
  saudeRemotaEmCurso=true;if(botao)botao.disabled=true;
  document.getElementById('saudeNotificacoes').classList.remove('oculto');
  status('saudeNotificacoesStatus','Conferindo o estado atual no OneSignal…','aviso');
  postSaudeNotificacoesIsolado(sessao(),function(remoto){
    saudeRemotaEmCurso=false;if(botao)botao.disabled=false;
    if(remoto&&remoto.ok===true){renderSaudeNotificacoes(remoto);return}
    status('saudeNotificacoesStatus',txt(remoto&&remoto.message||'A conferência do OneSignal não terminou agora. Os últimos dados continuam visíveis.'),'aviso');
  });
}"""

LOADER_OLD = "admin-aparelho-tacs-teste-v1.js?v=20260821-tacs-device-v7"
LOADER_NEW = "admin-aparelho-tacs-teste-v1.js?v=20260827-botoes-safe-v1"
PANEL_LOADER_OLD = "recados-campanhas-whatsapp-mensal-v12.js?v=43a5c181d2c9"
PANEL_LOADER_NEW = "recados-campanhas-whatsapp-mensal-v12.js?v=20260827-botoes-safe-v1"


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'Ponto cirúrgico não localizado: {label}')
    return text.replace(old, new, 1)


def function_slice(text, name, next_name):
    start = text.find('function ' + name + '(')
    if start < 0:
        raise SystemExit('Função não localizada: ' + name)
    end = text.find('function ' + next_name + '(', start)
    if end < 0:
        raise SystemExit('Limite da função não localizado: ' + next_name)
    return text[start:end]


def main():
    admin = ADMIN.read_text()
    admin = replace_once(admin, ADMIN_OLD, ADMIN_NEW, 'auto atualização OneSignal após alternar modo TACS')
    ADMIN.write_text(admin)

    panel = PANEL.read_text()
    panel = replace_once(panel, HEALTH_OLD, HEALTH_NEW, 'atualização remota da Saúde das notificações')
    panel = replace_once(panel, PANEL_LOADER_OLD, PANEL_LOADER_NEW, 'cache-bust do módulo mensal')
    PANEL.write_text(panel)

    loader = LOADER.read_text()
    loader = replace_once(loader, LOADER_OLD, LOADER_NEW, 'cache-bust do aparelho TACS/teste')
    LOADER.write_text(loader)

    test_tacs = TEST_TACS.read_text()
    test_tacs = test_tacs.replace(LOADER_OLD, LOADER_NEW)
    TEST_TACS.write_text(test_tacs)

    admin = ADMIN.read_text()
    panel = PANEL.read_text()
    loader = LOADER.read_text()

    alternar = function_slice(admin, 'alternar', 'iniciarOneSignalOpcional')
    if 'atualizarSaudeNotificacoes' in alternar or '.click(' in alternar:
        raise SystemExit('A função alternar ainda dispara atualização remota automática.')
    if 'executar(modo)' not in alternar or 'render(r)' not in alternar:
        raise SystemExit('A função alternar perdeu o fluxo técnico principal.')
    if HEALTH_OLD in panel:
        raise SystemExit('A atualização remota antiga ainda está presente.')
    if "function postSaudeNotificacoesIsolado" not in panel:
        raise SystemExit('Transporte isolado da Saúde das notificações ausente.')
    if "postSaudeNotificacoesIsolado(sessao()" not in panel:
        raise SystemExit('Botão Atualizar situação não usa transporte isolado.')
    if LOADER_NEW not in loader or PANEL_LOADER_NEW not in panel:
        raise SystemExit('Cache-bust seguro não foi aplicado.')

    print('Correção cirúrgica aplicada: sem auto-refresh pesado e com consulta OneSignal isolada.')


if __name__ == '__main__':
    main()
