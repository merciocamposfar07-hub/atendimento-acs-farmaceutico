#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s:
        if new in s:return
        raise SystemExit(label+' não encontrado em '+path)
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Permissão territorial explícita para publicações.
replace_once('apps-script/ZZZZ_17_TacsAreasAdminV1.gs',
"""  DEFAULT_PERMISSIONS:Object.freeze([
    'MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV'
  ]),""",
"""  DEFAULT_PERMISSIONS:Object.freeze([
    'MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV',
    'PUBLICACOES_GERENCIAR'
  ]),""",'Permissões padrão')
replace_once('apps-script/ZZZZ_17_TacsAreasAdminV1.gs',
"var permitidas=['MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV'];",
"var permitidas=['MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV','PUBLICACOES_GERENCIAR'];",
'Lista de permissões permitidas')

# Push: TACS pode publicar somente com a permissão; o resolver territorial continua impedindo outra área.
replace_once('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs',
"""    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    tacsTerritorioV1ExigirAdmin_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');""",
"""    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    notificacoesAreaV1ExigirPublicacao_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');""",
'Autorização do push')
anchor="function notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,input){"
p=Path('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs');s=p.read_text(encoding='utf-8')
helper="""function notificacoesAreaV1ExigirPublicacao_(acesso){
  if(acesso&&acesso.perfil==='TACS'){
    if((acesso.permissoes||[]).indexOf('PUBLICACOES_GERENCIAR')===-1){
      throw new Error('Seu cadastro não possui permissão para publicar notificações.');
    }
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);
  return true;
}

"""
if helper not in s:
    if anchor not in s:raise SystemExit('Ponto do helper de push não encontrado')
    p.write_text(s.replace(anchor,helper+anchor,1),encoding='utf-8')

# OneSignal: usar a área oficial do PortalTacsArea/TACS_AREA_ID, mantendo fallback legado.
replace_once('agenda-enfermeira.js',
"""  function areaAtualDaUnidade() {
    var morador = window.TACS_MORADOR_ATUAL;
    var area = String(morador && morador.areaId || 'JAPARANDUBA')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    return area || 'JAPARANDUBA';
  }""",
"""  function areaAtualDaUnidade() {
    var area = '';
    try {
      if (window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function') {
        area = window.PortalTacsArea.id();
      }
    } catch (erroArea) {}
    if (!area) area = window.TACS_AREA_ID || '';
    if (!area) {
      var morador = window.TACS_MORADOR_ATUAL;
      area = morador && morador.areaId || '';
    }
    area = String(area || 'JAPARANDUBA')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    return area || 'JAPARANDUBA';
  }""",'Área atual do OneSignal')

# Novo módulo entra no pacote de produção.
replace_once('scripts/build_apps_script_release.js',
"""  {
    source: 'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs',
    marker: 'TACS_NOTIFICACOES_AREA_V1'
  }
];""",
"""  {
    source: 'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs',
    marker: 'TACS_NOTIFICACOES_AREA_V1'
  },
  {
    source: 'apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs',
    marker: 'TACS_PUBLICACOES_TERRITORIAIS_V1'
  }
];""",'Módulo 20 no release')

# Gestão de TACS: nova permissão visível.
replace_once('teste-v1/painel-tacs-areas-v1.html',
"""<div class=\"permission-grid\"><label class=\"check\"><input id=\"permRead\" type=\"checkbox\"> Buscar e consultar moradores</label><label class=\"check\"><input id=\"permEdit\" type=\"checkbox\"> Criar e editar cadastros</label><label class=\"check\"><input id=\"permStatus\" type=\"checkbox\"> Alterar situação cadastral</label><label class=\"check\"><input id=\"permCsv\" type=\"checkbox\"> Importar CSV da área</label></div>""",
"""<div class=\"permission-grid\"><label class=\"check\"><input id=\"permRead\" type=\"checkbox\"> Buscar e consultar moradores</label><label class=\"check\"><input id=\"permEdit\" type=\"checkbox\"> Criar e editar cadastros</label><label class=\"check\"><input id=\"permStatus\" type=\"checkbox\"> Alterar situação cadastral</label><label class=\"check\"><input id=\"permCsv\" type=\"checkbox\"> Importar CSV da área</label><label class=\"check\"><input id=\"permPublish\" type=\"checkbox\"> Publicar recados, campanhas e notificações da própria área</label></div>""",'Checkbox de publicação')
replace_once('teste-v1/painel-tacs-areas-v1.js',
"""  ['permStatus','MORADORES_SITUACAO'],
  ['permCsv','MORADORES_IMPORTAR_CSV']
];""",
"""  ['permStatus','MORADORES_SITUACAO'],
  ['permCsv','MORADORES_IMPORTAR_CSV'],
  ['permPublish','PUBLICACOES_GERENCIAR']
];""",'Permissão do frontend territorial')
replace_once('teste-v1/painel-tacs-areas-v1.html','painel-tacs-areas-v1.js?v=20260811-territorio-v2','painel-tacs-areas-v1.js?v=20260812-publicacoes-v1','Cache do JS territorial')
replace_once('painel-oficial-tacs-areas.html','painel-tacs-areas-v1.html?v=20260811-territorio-v2','painel-tacs-areas-v1.html?v=20260812-publicacoes-v1','Cache do shell territorial')

# Painel de recados: login Admin ou TACS.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"""<h2>Acesso administrativo</h2>
<label for=\"pin\">PIN administrativo</label><input id=\"pin\" class=\"campo\" type=\"password\" inputmode=\"numeric\" maxlength=\"8\" autocomplete=\"off\">
<div class=\"acoes duas\"><button id=\"entrar\" class=\"botao\" type=\"button\">Entrar e carregar conteúdo</button><button id=\"sair\" class=\"botao vermelho\" type=\"button\" disabled>Encerrar sessão</button></div>
<p class=\"muted\">O PIN é enviado por POST, apagado do campo e não é armazenado nesta página.</p>""",
"""<h2>Acesso às publicações</h2>
<div class=\"abas\"><button id=\"loginAdminTab\" class=\"botao aba ativa\" type=\"button\">Administrador geral</button><button id=\"loginTacsTab\" class=\"botao aba\" type=\"button\">TACS da área</button></div>
<div id=\"adminLogin\"><label for=\"pin\">PIN administrativo</label><input id=\"pin\" class=\"campo\" type=\"password\" inputmode=\"numeric\" maxlength=\"8\" autocomplete=\"off\"><div class=\"acoes\"><button id=\"entrar\" class=\"botao\" type=\"button\">Entrar como administrador</button></div></div>
<div id=\"tacsLogin\" class=\"oculto\"><label for=\"tacsCnsPublicacoes\">CNS profissional</label><input id=\"tacsCnsPublicacoes\" class=\"campo\" inputmode=\"numeric\" maxlength=\"18\"><label for=\"tacsPinPublicacoes\">PIN individual</label><input id=\"tacsPinPublicacoes\" class=\"campo\" type=\"password\" inputmode=\"numeric\" maxlength=\"8\" autocomplete=\"off\"><div class=\"acoes\"><button id=\"entrarTacs\" class=\"botao\" type=\"button\">Entrar na minha área</button></div></div>
<div class=\"acoes\"><button id=\"sair\" class=\"botao vermelho\" type=\"button\" disabled>Encerrar sessão</button></div>
<p class=\"muted\">O administrador pode alternar áreas. O TACS acessa e publica somente na área vinculada ao próprio CNS.</p>""",'Login TACS do painel de recados')

# Variáveis de sessão e modo.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"""var TOKEN_KEY='portalTacsAdminTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoConteudoV1',TEMA_KEY='portalTacsTemaRecadosV1';
var token=sessionStorage.getItem(TOKEN_KEY)||'',dispositivo=localStorage.getItem(DEVICE_KEY)||'';""",
"""var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoConteudoV1',TEMA_KEY='portalTacsTemaRecadosV1';
var token=sessionStorage.getItem(TOKEN_KEY)||'',territorioToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',dispositivo=localStorage.getItem(DEVICE_KEY)||'';
var accessMode=territorioToken?'tacs':(token?'admin':'');var podeAdministrar=accessMode==='admin';""",'Tokens do painel de recados')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"var entrar=document.getElementById('entrar'),sair=document.getElementById('sair'),desfazer=document.getElementById('desfazer'),contraste=document.getElementById('alternarContraste');",
"var entrar=document.getElementById('entrar'),entrarTacs=document.getElementById('entrarTacs'),sair=document.getElementById('sair'),desfazer=document.getElementById('desfazer'),contraste=document.getElementById('alternarContraste');",
'Botões de login')

# Transporte sabe escolher o resultado novo/territorial.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"function mutacaoPublica(action){return /^admin_(salvar|remover|restaurar|criar)_/.test(txt(action))}",
"function mutacaoPublica(action){return /^admin_(?:publicacoes_)?(salvar|remover|restaurar|criar)_/.test(txt(action))}\nfunction resultadoPadrao(action){action=txt(action);if(/^admin_publicacoes_/.test(action))return'admin_publicacoes_result';if(/^admin_territorio_/.test(action))return'admin_territorio_result';return'admin_result'}",
'Result action do painel')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"entrar.disabled=false;sair.disabled=!token;atualizarBloqueioMutacoes();",
"entrar.disabled=false;if(entrarTacs)entrarTacs.disabled=false;sair.disabled=!(token||territorioToken);atualizarBloqueioMutacoes();",
'Finalização de login')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"ativa={id:id,action:action,cb:cb,resultAction:resultAction||'admin_result',frame:frame,form:f,submitTimer:null,pollTimer:null,proximaEspera:2500,limite:0,timeout:null};",
"ativa={id:id,action:action,cb:cb,resultAction:resultAction||resultadoPadrao(action),frame:frame,form:f,submitTimer:null,pollTimer:null,proximaEspera:2500,limite:0,timeout:null};",
'Result action ativo')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"entrar.disabled=true;sair.disabled=true;atualizarBloqueioMutacoes();",
"entrar.disabled=true;if(entrarTacs)entrarTacs.disabled=true;sair.disabled=true;atualizarBloqueioMutacoes();",
'Bloqueio dos logins')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"function sessao(){return{token:token,dispositivo:dispositivo,areaId:areaId}}",
"function sessao(){var s={dispositivo:dispositivo,areaId:areaId};if(accessMode==='tacs'&&territorioToken)s.territorioToken=territorioToken;else s.token=token;return s}",
'Sessão multi perfil')

# Releitura e mutações usam exclusivamente as rotas territoriais.
s=Path('teste-v1/painel-recados-campanhas-v1.html').read_text(encoding='utf-8')
for old,new in [
("post('admin_dados',sessao(),","post('admin_publicacoes_dados',sessao(),"),
("?'admin_salvar_recado':'admin_salvar_campanha'","?'admin_publicacoes_salvar_recado':'admin_publicacoes_salvar_campanha'"),
("?'admin_remover_recado':'admin_remover_campanha'","?'admin_publicacoes_remover_recado':'admin_publicacoes_remover_campanha'")
]:s=s.replace(old,new)
Path('teste-v1/painel-recados-campanhas-v1.html').write_text(s,encoding='utf-8')

# Aplicar resposta territorial: áreas, perfil e manutenção vêm juntas.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"function aplicar(r){dados.recados=Array.isArray(r.recados)?r.recados:[];dados.campanhas=Array.isArray(r.campanhas)?r.campanhas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');document.getElementById('manutencaoBox').classList.remove('oculto');sair.disabled=false;render()}",
"function aplicar(r){dados.recados=Array.isArray(r.recados)?r.recados:[];dados.campanhas=Array.isArray(r.campanhas)?r.campanhas:[];areas=Array.isArray(r.areas)?r.areas:[];areaId=txt(r.areaId||areaId).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||areaId;podeAdministrar=r.podeAdministrar===true;accessMode=r.perfil==='TACS'?'tacs':'admin';var m=r.manutencao||{};manutencaoAtiva=bool(m.ativa);manutencaoConhecida=true;contextoPronto=true;document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');document.getElementById('manutencaoBox').classList.remove('oculto');sair.disabled=false;renderAreas();renderManutencao();render()}",
'Aplicação da resposta territorial')

# Manutenção só pode ser alterada pelo administrador; TACS apenas enxerga estado.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"botao.textContent=manutencaoAtiva?'DESATIVAR MANUTENÇÃO':'ATIVAR PORTAL EM MANUTENÇÃO';botao.disabled=!manutencaoConhecida||Boolean(ativa)}",
"botao.textContent=manutencaoAtiva?'DESATIVAR MANUTENÇÃO':'ATIVAR PORTAL EM MANUTENÇÃO';botao.classList.toggle('oculto',!podeAdministrar);botao.disabled=!podeAdministrar||!manutencaoConhecida||Boolean(ativa)}",
'Controle de manutenção por perfil')
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"function alternarManutencao(){if(!manutencaoConhecida)return;",
"function alternarManutencao(){if(!podeAdministrar){status('statusOperacao','Somente o administrador geral pode alterar o modo manutenção.','aviso');return}if(!manutencaoConhecida)return;",
'Proteção manutenção')

# Carregamento passa a ser uma única leitura territorial; não usa dados globais.
start='function carregar(msg,cb,silencioso){'
p=Path('teste-v1/painel-recados-campanhas-v1.html');s=p.read_text(encoding='utf-8')
i=s.index(start);j=s.index('\nfunction render(){',i)
new="""function carregar(msg,cb,silencioso){contextoPronto=false;post('admin_publicacoes_dados',sessao(),function(r){if(!r||r.ok!==true){token='';territorioToken='';accessMode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');sair.disabled=true;status('loginStatus',silencioso?'Conexão preparada. A sessão anterior não pôde ser reutilizada; entre novamente.':txt(r&&r.message||'Sessão inválida.'),silencioso?'ok':'erro');if(cb)cb(false,r);return}aplicar(r);status('loginStatus',msg||'Sessão validada e publicações da área carregadas.','ok');if(cb)cb(true,r)})}
"""
s=s[:i]+new+s[j:];p.write_text(s,encoding='utf-8')

# Troca de área do admin recarrega as listas da área, não apenas manutenção.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"status('statusOperacao','Conferindo a manutenção da área selecionada…','aviso');carregarManutencao(function(ok){if(ok)status('statusOperacao','Área de envio alterada e validada pelo servidor.','ok')})",
"status('statusOperacao','Carregando publicações da área selecionada…','aviso');carregar('Área alterada e publicações isoladas carregadas.')",
'Troca de área')

# Login/logout e abas de login.
p=Path('teste-v1/painel-recados-campanhas-v1.html');s=p.read_text(encoding='utf-8')
old="""entrar.addEventListener('click',function(){if(!testesOk)return;var pin=document.getElementById('pin').value.replace(/\\D/g,'');if(!/^\\d{4,8}$/.test(pin)){status('loginStatus','Digite um PIN numérico de 4 a 8 dígitos.','erro');return}status('loginStatus','Validando o PIN…','aviso');post('admin_login',{pin:pin,dispositivo:dispositivo},function(r){document.getElementById('pin').value='';if(!r||r.ok!==true||!r.token){token='';sessionStorage.removeItem(TOKEN_KEY);status('loginStatus',txt(r&&r.message||'Login recusado.'),'erro');return}token=r.token;sessionStorage.setItem(TOKEN_KEY,token);status('loginStatus','PIN validado. Abrindo o painel agora…','ok');carregar('Sessão validada e conteúdo carregado.')})});
sair.addEventListener('click',function(){if(!token)return;post('admin_logout',sessao(),function(){token='';areas=[];contextoPronto=false;confirmacaoPendente=false;sessionStorage.removeItem(TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');manutencaoConhecida=false;sair.disabled=true;atualizarBloqueioMutacoes();status('loginStatus','Sessão encerrada.','ok')})});"""
new="""function mostrarLogin(tipo){var admin=tipo==='admin';document.getElementById('adminLogin').classList.toggle('oculto',!admin);document.getElementById('tacsLogin').classList.toggle('oculto',admin);document.getElementById('loginAdminTab').classList.toggle('ativa',admin);document.getElementById('loginTacsTab').classList.toggle('ativa',!admin)}
document.getElementById('loginAdminTab').addEventListener('click',function(){mostrarLogin('admin')});document.getElementById('loginTacsTab').addEventListener('click',function(){mostrarLogin('tacs')});
entrar.addEventListener('click',function(){if(!testesOk)return;var pin=document.getElementById('pin').value.replace(/\\D/g,'');if(!/^\\d{4,8}$/.test(pin)){status('loginStatus','Digite um PIN numérico de 4 a 8 dígitos.','erro');return}status('loginStatus','Validando o PIN…','aviso');post('admin_login',{pin:pin,dispositivo:dispositivo},function(r){document.getElementById('pin').value='';if(!r||r.ok!==true||!r.token){token='';sessionStorage.removeItem(TOKEN_KEY);status('loginStatus',txt(r&&r.message||'Login recusado.'),'erro');return}territorioToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=r.token;accessMode='admin';sessionStorage.setItem(TOKEN_KEY,token);carregar('Acesso de administrador validado.')})});
entrarTacs.addEventListener('click',function(){if(!testesOk)return;var cns=document.getElementById('tacsCnsPublicacoes').value.replace(/\\D/g,''),pin=document.getElementById('tacsPinPublicacoes').value.replace(/\\D/g,'');if(!/^\\d{15}$/.test(cns)||!/^\\d{4,8}$/.test(pin)){status('loginStatus','Informe o CNS profissional com 15 números e o PIN individual.','erro');return}status('loginStatus','Validando CNS e PIN…','aviso');post('admin_territorio_login_tacs',{cns:cns,pin:pin,dispositivo:dispositivo},function(r){document.getElementById('tacsPinPublicacoes').value='';if(!r||r.ok!==true||!r.token){territorioToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);status('loginStatus',txt(r&&r.message||'Acesso recusado.'),'erro');return}token='';sessionStorage.removeItem(TOKEN_KEY);territorioToken=r.token;accessMode='tacs';areaId=txt(r.areaId||areaId);sessionStorage.setItem(TERRITORY_TOKEN_KEY,territorioToken);carregar('Acesso individual validado para '+txt(r.areaNome||r.areaId)+'.')},'admin_territorio_result')});
sair.addEventListener('click',function(){if(!(token||territorioToken))return;var action=accessMode==='tacs'?'admin_territorio_encerrar_sessao':'admin_logout';post(action,sessao(),function(){token='';territorioToken='';accessMode='';podeAdministrar=false;areas=[];contextoPronto=false;confirmacaoPendente=false;sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');manutencaoConhecida=false;sair.disabled=true;atualizarBloqueioMutacoes();status('loginStatus','Sessão encerrada.','ok')})});"""
if old not in s:raise SystemExit('Bloco de login/logout não encontrado')
p.write_text(s.replace(old,new,1),encoding='utf-8')

# Inicialização aceita sessão administrativa ou territorial.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"function iniciarPainel(){entrar.disabled=false;if(token){carregar('Sessão existente validada e conteúdo carregado.',null,true);return}status('loginStatus','Digite o PIN para carregar o conteúdo. A conexão já está sendo preparada em segundo plano.','ok');var aquecimento=window.PortalTacsAdminWarmup;if(aquecimento&&typeof aquecimento.iniciar==='function')aquecimento.iniciar()}iniciarPainel();",
"function iniciarPainel(){entrar.disabled=false;entrarTacs.disabled=false;if(token||territorioToken){carregar('Sessão existente validada e publicações da área carregadas.',null,true);return}mostrarLogin('admin');status('loginStatus','Entre como administrador ou TACS da área. A conexão já está sendo preparada em segundo plano.','ok');var aquecimento=window.PortalTacsAdminWarmup;if(aquecimento&&typeof aquecimento.iniciar==='function')aquecimento.iniciar()}iniciarPainel();",
'Inicialização multi perfil')

# Área: TACS nunca pode trocar; admin pode.
replace_once('teste-v1/painel-recados-campanhas-v1.html',
"if(select)select.disabled=bloqueado||areas.length<2;",
"if(select)select.disabled=bloqueado||!podeAdministrar||areas.length<2;",
'Select de área por perfil')

# Cache do painel oficial de recados.
for wrapper in ['painel-oficial-recados-campanhas.html','painel-recados-campanhas.html']:
    p=Path(wrapper)
    if p.exists():
        s=p.read_text(encoding='utf-8').replace('painel-recados-campanhas-v1.html?v=20260811','painel-recados-campanhas-v1.html?v=20260812-publicacoes-v1')
        p.write_text(s,encoding='utf-8')

# Testes: permissão e tag oficial.
p=Path('scripts/test_territorio_dom.js');s=p.read_text(encoding='utf-8')
s=s.replace("['permRead', 'permEdit', 'permStatus', 'permCsv']","['permRead', 'permEdit', 'permStatus', 'permCsv', 'permPublish']")
if "PortalTacsArea" not in s:
    # O teste existente da tag deve agora enxergar a fonte territorial oficial no código cliente.
    marker="assert.match(source, /OneSignal\\.User\\.addTag/"
# acrescenta verificações estáticas perto do fim do teste de tags por substituição simples.
needle="assert.match(source, /morador && morador\\.areaId/);"
if needle in s:
    s=s.replace(needle,"assert.match(source, /PortalTacsArea/);\n  assert.match(source, /TACS_AREA_ID/);\n  assert.match(source, /morador && morador\\.areaId/);",1)
p.write_text(s,encoding='utf-8')

# Novo teste no npm.
p=Path('package.json');s=p.read_text(encoding='utf-8')
needle='node scripts/test_public_area_resolver.js && node scripts/test_territorio_dom.js'
repl='node scripts/test_public_area_resolver.js && node scripts/test_publicacoes_territoriais.js && node scripts/test_territorio_dom.js'
if needle not in s:raise SystemExit('Ponto do teste de publicações no package.json não encontrado')
p.write_text(s.replace(needle,repl,1),encoding='utf-8')
print('Publicações e notificações multiárea preparadas.')
