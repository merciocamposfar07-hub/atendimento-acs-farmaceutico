from pathlib import Path
import json

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path, text): (ROOT/path).write_text(text, encoding='utf-8')
def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'PADRAO_NAO_ENCONTRADO: {label}')
    return text.replace(old,new,1)

# ---------- AGENDAS: preservar local-first existente e isolar snapshot ----------
p=Path('painel-oficial-agendas-vagas.html')
s=p.read_text(encoding='utf-8')
s=rep(s,
"var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoAgendaV1';\nvar areaId=String(new URLSearchParams(location.search).get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA';\nvar DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'+areaId;\nvar token=sessionStorage.getItem(TOKEN_KEY)||'',territorioToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',dispositivo=localStorage.getItem(DEVICE_KEY)||'',tacsMode=Boolean(territorioToken);",
"var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',PROFILE_KEY='portalTacsAcessoRapidoV1',UNDO_KEY='portalTacsUndoAgendaV1',CACHE_SCHEMA='lf1';\nvar areaId=String(new URLSearchParams(location.search).get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA';\nvar token=sessionStorage.getItem(TOKEN_KEY)||'',territorioToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',dispositivo=localStorage.getItem(DEVICE_KEY)||'',tacsMode=Boolean(territorioToken);",
'agendas-declaracoes')
s=rep(s,
"function lerSnapshot(){try{var item=JSON.parse(localStorage.getItem(DATA_CACHE_KEY)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>24*60*60*1000)return null;return item}catch(e){return null}}\nfunction salvarSnapshot(r){try{localStorage.setItem(DATA_CACHE_KEY,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:Array.isArray(r.profissionais)?r.profissionais:[],agendas:Array.isArray(r.agendas)?r.agendas:[]}}))}catch(e){}}",
"function cacheFingerprint(v){var s=String(v||''),a=2166136261,b=2246822519;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917)}return (a>>>0).toString(16)+(b>>>0).toString(16)}\nfunction cacheTacsProfile(){try{var p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return p&&p.tacsId&&p.areaId?p:null}catch(e){return null}}\nfunction cacheIdentity(){if(territorioToken){var p=cacheTacsProfile(),tid=String(p&&p.tacsId||'').toUpperCase().replace(/[^A-Z0-9_-]/g,''),pa=String(p&&p.areaId||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'');if(!tid||pa!==areaId)return'';return'tacs:'+tid+':'+areaId}if(token)return'admin:'+cacheFingerprint(token)+':'+areaId;return''}\nfunction dataCacheKey(){var id=cacheIdentity();return id?'portalTacsAdminSnapshotV1:agendas:'+CACHE_SCHEMA+':'+id:''}\nfunction lerSnapshot(){try{var key=dataCacheKey();if(!key)return null;var item=JSON.parse(localStorage.getItem(key)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>24*60*60*1000)return null;return item}catch(e){return null}}\nfunction salvarSnapshot(r){try{var key=dataCacheKey();if(!key)return;localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:Array.isArray(r.profissionais)?r.profissionais:[],agendas:Array.isArray(r.agendas)?r.agendas:[]}}))}catch(e){}}",
'agendas-chave-cache')
p.write_text(s,encoding='utf-8')

# ---------- RECADOS/CAMPANHAS: snapshot read-only + revalidacao ----------
p=Path('painel-oficial-recados-campanhas.html')
s=p.read_text(encoding='utf-8')
s=rep(s,
"var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoConteudoV1',TEMA_KEY='portalTacsTemaRecadosV1';",
"var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',PROFILE_KEY='portalTacsAcessoRapidoV1',UNDO_KEY='portalTacsUndoConteudoV1',TEMA_KEY='portalTacsTemaRecadosV1',CACHE_SCHEMA='lf1';",
'recados-declaracoes')
s=rep(s,
"var dados={recados:[],campanhas:[]},areas=[],ativa=null,contador=0,abaAtual='recados',testesOk=false,manutencaoAtiva=false,manutencaoConhecida=false,contextoPronto=false,confirmacaoPendente=false;",
"var dados={recados:[],campanhas:[]},areas=[],ativa=null,contador=0,abaAtual='recados',testesOk=false,manutencaoAtiva=false,manutencaoConhecida=false,contextoPronto=false,confirmacaoPendente=false,snapshotVisivel=false,snapshotReconexaoTentativas=0,snapshotReconexaoTimer=null;",
'recados-estado-cache')
s=rep(s,
"function txt(v){return String(v==null?'':v)}",
"function txt(v){return String(v==null?'':v)}\nfunction cacheFingerprint(v){var s=txt(v),a=2166136261,b=2246822519;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917)}return (a>>>0).toString(16)+(b>>>0).toString(16)}\nfunction cacheTacsProfile(){try{var p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return p&&p.tacsId&&p.areaId?p:null}catch(e){return null}}\nfunction cacheIdentity(){if(territorioToken){var p=cacheTacsProfile(),tid=txt(p&&p.tacsId).toUpperCase().replace(/[^A-Z0-9_-]/g,''),pa=txt(p&&p.areaId).toUpperCase().replace(/[^A-Z0-9_-]/g,'');if(!tid||pa!==areaId)return'';return'tacs:'+tid+':'+areaId}if(token)return'admin:'+cacheFingerprint(token)+':'+areaId;return''}\nfunction dataCacheKey(){var id=cacheIdentity();return id?'portalTacsAdminSnapshotV1:recados:'+CACHE_SCHEMA+':'+id:''}\nfunction lerSnapshot(){try{var key=dataCacheKey();if(!key)return null;var item=JSON.parse(localStorage.getItem(key)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>24*60*60*1000)return null;return item}catch(e){return null}}\nfunction salvarSnapshot(r){try{var key=dataCacheKey();if(!key)return;localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,areaId:areaId,recados:Array.isArray(r.recados)?r.recados:[],campanhas:Array.isArray(r.campanhas)?r.campanhas:[]}}))}catch(e){}}\nfunction aplicarSnapshotSeDisponivel(){if(!(token||territorioToken))return false;var item=lerSnapshot();if(!item)return false;snapshotVisivel=true;contextoPronto=false;manutencaoConhecida=false;podeAdministrar=false;aplicar(item.data,true);status('loginStatus','Dados exibidos da última leitura. Atualizando dados em segundo plano…','aviso');return true}\nfunction cancelarReconexaoSnapshot(){if(snapshotReconexaoTimer){clearTimeout(snapshotReconexaoTimer);snapshotReconexaoTimer=null}}\nfunction agendarReconexaoSnapshot(msg){cancelarReconexaoSnapshot();if(snapshotReconexaoTentativas>=2)return;snapshotReconexaoTentativas++;snapshotReconexaoTimer=setTimeout(function(){snapshotReconexaoTimer=null;if(snapshotVisivel&&(token||territorioToken)&&!ativa)carregar(msg,null,true)},2500+snapshotReconexaoTentativas*1500)}",
'recados-funcoes-cache')
old_apply="function aplicar(r){dados.recados=Array.isArray(r.recados)?r.recados:[];dados.campanhas=Array.isArray(r.campanhas)?r.campanhas:[];areas=Array.isArray(r.areas)?r.areas:[];areaId=txt(r.areaId||areaId).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||areaId;podeAdministrar=r.podeAdministrar===true;accessMode=r.perfil==='TACS'?'tacs':'admin';var m=r.manutencao||{};manutencaoAtiva=bool(m.ativa);manutencaoConhecida=true;contextoPronto=true;document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');document.getElementById('manutencaoBox').classList.remove('oculto');sair.disabled=false;renderAreas();renderManutencao();render()}"
new_apply="function aplicar(r,doSnapshot){dados.recados=Array.isArray(r.recados)?r.recados:[];dados.campanhas=Array.isArray(r.campanhas)?r.campanhas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=false;if(doSnapshot){contextoPronto=false;manutencaoConhecida=false;podeAdministrar=false;document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');render();return}areas=Array.isArray(r.areas)?r.areas:[];areaId=txt(r.areaId||areaId).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||areaId;podeAdministrar=r.podeAdministrar===true;accessMode=r.perfil==='TACS'?'tacs':'admin';var m=r.manutencao||{};manutencaoAtiva=bool(m.ativa);manutencaoConhecida=true;contextoPronto=true;snapshotVisivel=false;snapshotReconexaoTentativas=0;cancelarReconexaoSnapshot();document.getElementById('manutencaoBox').classList.remove('oculto');renderAreas();renderManutencao();render();salvarSnapshot(r)}"
s=rep(s,old_apply,new_apply,'recados-aplicar')
old_load="function carregar(msg,cb,silencioso){contextoPronto=false;post('admin_publicacoes_dados',sessao(),function(r){if(!r||r.ok!==true){token='';territorioToken='';accessMode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');esconderSaudeNotificacoes();sair.disabled=true;status('loginStatus',silencioso?'Conexão preparada. A sessão anterior não pôde ser reutilizada; entre novamente.':txt(r&&r.message||'Sessão inválida.'),silencioso?'ok':'erro');if(cb)cb(false,r);return}aplicar(r);status('loginStatus',msg||'Sessão validada e publicações da área carregadas.','ok');setTimeout(carregarSaudeNotificacoes,80);if(cb)cb(true,r)})}"
new_load="function carregar(msg,cb,silencioso){contextoPronto=false;manutencaoConhecida=false;aplicarSnapshotSeDisponivel();post('admin_publicacoes_dados',sessao(),function(r){if(!r||r.ok!==true){if((!r||r.temporario===true)&&snapshotVisivel){contextoPronto=false;manutencaoConhecida=false;atualizarBloqueioMutacoes();status('loginStatus','Dados exibidos da última leitura. Atualizando dados em segundo plano…','aviso');status('statusOperacao','Leitura local disponível somente para consulta até o servidor confirmar a sessão.','aviso');agendarReconexaoSnapshot(msg);if(cb)cb(false,r);return}snapshotVisivel=false;cancelarReconexaoSnapshot();token='';territorioToken='';accessMode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');document.getElementById('areaEnvioBox').classList.add('oculto');document.getElementById('manutencaoBox').classList.add('oculto');esconderSaudeNotificacoes();sair.disabled=true;status('loginStatus',silencioso?'A sessão anterior não pôde ser validada; entre novamente.':txt(r&&r.message||'Sessão inválida.'),silencioso?'ok':'erro');if(cb)cb(false,r);return}aplicar(r,false);status('loginStatus',msg||'Sessão validada e publicações da área carregadas.','ok');setTimeout(carregarSaudeNotificacoes,80);if(cb)cb(true,r)})}"
s=rep(s,old_load,new_load,'recados-carregar')
s=rep(s,"window.PortalTacsRecadosCampanhasV12={version:'1.2.0',post:post,localizarSalvo:localizarSalvo,relerAteConfirmar:relerAteConfirmar};","window.PortalTacsRecadosCampanhasV12={version:'1.3.0-local-first',post:post,localizarSalvo:localizarSalvo,relerAteConfirmar:relerAteConfirmar,aplicarSnapshotSeDisponivel:aplicarSnapshotSeDisponivel};",'recados-versao')
p.write_text(s,encoding='utf-8')

# ---------- PROFISSIONAIS/SERVICOS: snapshot somente leitura + trava explicita ----------
p=Path('teste-v1/painel-profissionais-servicos-v1.html')
s=p.read_text(encoding='utf-8')
s=rep(s,
"var UNDO_KEY='portalTacsUndoPSV1';",
"var UNDO_KEY='portalTacsUndoPSV1',PROFILE_KEY='portalTacsAcessoRapidoV1',CACHE_SCHEMA='lf1';",
'prof-declaracoes')
s=rep(s,
"var dados={profissionais:[],servicos:[]};\nvar ativa=null,contador=0;",
"var dados={profissionais:[],servicos:[]};\nvar ativa=null,contador=0,dadosConfirmados=false,snapshotVisivel=false,snapshotReconexaoTentativas=0,snapshotReconexaoTimer=null;",
'prof-estado')
s=rep(s,
"function txt(v){return String(v==null?'':v)}",
"function txt(v){return String(v==null?'':v)}\nfunction cacheFingerprint(v){var s=txt(v),a=2166136261,b=2246822519;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917)}return (a>>>0).toString(16)+(b>>>0).toString(16)}\nfunction cacheTacsProfile(){try{var p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return p&&p.tacsId&&p.areaId?p:null}catch(e){return null}}\nfunction cacheIdentity(){if(territorioToken){var p=cacheTacsProfile(),tid=txt(p&&p.tacsId).toUpperCase().replace(/[^A-Z0-9_-]/g,''),pa=txt(p&&p.areaId).toUpperCase().replace(/[^A-Z0-9_-]/g,'');if(!tid||pa!==areaId)return'';return'tacs:'+tid+':'+areaId}if(token)return'admin:'+cacheFingerprint(token)+':'+areaId;return''}\nfunction dataCacheKey(){var id=cacheIdentity();return id?'portalTacsAdminSnapshotV1:profissionais:'+CACHE_SCHEMA+':'+id:''}\nfunction lerSnapshot(){try{var key=dataCacheKey();if(!key)return null;var item=JSON.parse(localStorage.getItem(key)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>24*60*60*1000)return null;return item}catch(e){return null}}\nfunction salvarSnapshot(r){try{var key=dataCacheKey();if(!key)return;localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:Array.isArray(r.profissionais)?r.profissionais:[],servicos:Array.isArray(r.servicos)?r.servicos:[]}}))}catch(e){}}\nfunction cancelarReconexaoSnapshot(){if(snapshotReconexaoTimer){clearTimeout(snapshotReconexaoTimer);snapshotReconexaoTimer=null}}\nfunction agendarReconexaoSnapshot(msg){cancelarReconexaoSnapshot();if(snapshotReconexaoTentativas>=2)return;snapshotReconexaoTentativas++;snapshotReconexaoTimer=setTimeout(function(){snapshotReconexaoTimer=null;if(snapshotVisivel&&(token||territorioToken)&&!ativa)carregarDados(msg,true)},2500+snapshotReconexaoTentativas*1500)}",
'prof-funcoes-cache')
s=rep(s,
"function atualizarUndo(){desfazer.classList.toggle('oculto',!lerUndo())}",
"function atualizarUndo(){var existe=Boolean(lerUndo());desfazer.classList.toggle('oculto',!existe);desfazer.disabled=!dadosConfirmados||!existe}\nfunction bloquearEdicaoNaoConfirmada(){document.querySelectorAll('#conteudo input:not([readonly]),#conteudo textarea,#conteudo select,.salvarProf,.salvarServ,#criarProfissional').forEach(function(e){e.disabled=!dadosConfirmados});atualizarUndo()}\nfunction aplicarDadosLocalFirst(r,confirmado){dados.profissionais=Array.isArray(r.profissionais)?r.profissionais.map(normalizarRegistro):[];dados.servicos=Array.isArray(r.servicos)?r.servicos.map(normalizarRegistro):[];dadosConfirmados=confirmado===true;render();document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=tacsMode;bloquearEdicaoNaoConfirmada();if(dadosConfirmados)status('statusOperacao','Leitura territorial concluída. Nenhuma alteração realizada.','ok');else status('statusOperacao','Dados da última leitura visíveis somente para consulta. Atualizando em segundo plano…','aviso')}\nfunction aplicarSnapshotSeDisponivel(){if(!(token||territorioToken))return false;var item=lerSnapshot();if(!item)return false;snapshotVisivel=true;dadosConfirmados=false;aplicarDadosLocalFirst(item.data,false);status('loginStatus','Dados exibidos da última leitura. Atualizando dados em segundo plano…','aviso');return true}",
'prof-trava')
old_load="function carregarDados(mensagem,silencioso,depois){post('admin_dados',sessao(),function(r){if(!r||r.ok!==true){if(tacsMode){territorioToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY)}else{token='';sessionStorage.removeItem(TOKEN_KEY)}document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');sair.disabled=true;status('loginStatus',tacsMode?txt(r&&r.message||'Sessão territorial inválida. Volte à Central e entre novamente.'):(silencioso?'Conexão preparada. A sessão anterior não pôde ser reutilizada; digite o PIN.':txt(r&&r.message||'Sessão inválida ou expirada.')),tacsMode||!silencioso?'erro':'ok');if(depois)depois(false,r);return}dados.profissionais=Array.isArray(r.profissionais)?r.profissionais.map(normalizarRegistro):[];dados.servicos=Array.isArray(r.servicos)?r.servicos.map(normalizarRegistro):[];render();document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=tacsMode;status('loginStatus',mensagem||'Sessão validada e dados desta área carregados.','ok');status('statusOperacao','Leitura territorial concluída. Nenhuma alteração realizada.','ok');if(depois)depois(true,r)})}"
new_load="function carregarDados(mensagem,silencioso,depois){aplicarSnapshotSeDisponivel();post('admin_dados',sessao(),function(r){if(!r||r.ok!==true){if((!r||r.temporario===true)&&snapshotVisivel){dadosConfirmados=false;bloquearEdicaoNaoConfirmada();status('loginStatus','Dados exibidos da última leitura. Atualizando dados em segundo plano…','aviso');agendarReconexaoSnapshot(mensagem);if(depois)depois(false,r);return}snapshotVisivel=false;dadosConfirmados=false;cancelarReconexaoSnapshot();if(tacsMode){territorioToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY)}else{token='';sessionStorage.removeItem(TOKEN_KEY)}document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');sair.disabled=true;status('loginStatus',tacsMode?txt(r&&r.message||'Sessão territorial inválida. Volte à Central e entre novamente.'):(silencioso?'A sessão anterior não pôde ser validada; digite o PIN.':txt(r&&r.message||'Sessão inválida ou expirada.')),tacsMode||!silencioso?'erro':'ok');if(depois)depois(false,r);return}snapshotVisivel=false;snapshotReconexaoTentativas=0;cancelarReconexaoSnapshot();aplicarDadosLocalFirst(r,true);salvarSnapshot(r);status('loginStatus',mensagem||'Sessão validada e dados desta área carregados.','ok');if(depois)depois(true,r)})}"
s=rep(s,old_load,new_load,'prof-carregar')
for old,new,label in [
("function salvarProfissional(cartao){","function salvarProfissional(cartao){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar profissionais.','aviso');return}",'prof-guard-prof'),
("function salvarServico(cartao){","function salvarServico(cartao){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar serviços.','aviso');return}",'prof-guard-serv'),
("function restaurarUltima(){","function restaurarUltima(){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de restaurar alterações.','aviso');return}",'prof-guard-undo'),
("function criarNovoProfissional(){","function criarNovoProfissional(){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de criar profissional.','aviso');return}",'prof-guard-create')]:
    s=rep(s,old,new,label)
s=rep(s,
"sair.addEventListener('click',function(){if(!token)return;post('admin_logout',sessao(),function(){token='';sessionStorage.removeItem(TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');sair.disabled=true;status('loginStatus','Sessão encerrada.','ok')})});",
"sair.addEventListener('click',function(){if(!token)return;post('admin_logout',sessao(),function(){snapshotVisivel=false;dadosConfirmados=false;cancelarReconexaoSnapshot();token='';sessionStorage.removeItem(TOKEN_KEY);document.getElementById('conteudo').classList.add('oculto');document.getElementById('resumo').classList.add('oculto');sair.disabled=true;status('loginStatus','Sessão encerrada.','ok')})});",
'prof-logout')
p.write_text(s,encoding='utf-8')

# ---------- TESTE DE REGRESSAO PERMANENTE ----------
test=Path('scripts/test_admin_local_first_v1.js')
test.write_text(r"""const fs=require('fs');
const assert=require('assert');
const agendas=fs.readFileSync('painel-oficial-agendas-vagas.html','utf8');
const recados=fs.readFileSync('painel-oficial-recados-campanhas.html','utf8');
const prof=fs.readFileSync('teste-v1/painel-profissionais-servicos-v1.html','utf8');
const moradores=fs.readFileSync('teste-v1/painel-moradores-v2.html','utf8');
for(const [nome,src,mod] of [['agendas',agendas,'agendas'],['recados',recados,'recados'],['profissionais',prof,'profissionais']]){
  assert(src.includes("PROFILE_KEY='portalTacsAcessoRapidoV1'"),nome+': identidade TACS ausente');
  assert(src.includes('function cacheIdentity()'),nome+': namespace de identidade ausente');
  assert(src.includes('p&&p.tacsId')&&src.includes('p&&p.areaId'),nome+': cache TACS deve usar tacsId + areaId');
  assert(src.includes("'portalTacsAdminSnapshotV1:"+mod+":'"),nome+': chave local-first versionada ausente');
  assert(src.includes('24*60*60*1000'),nome+': TTL de snapshot ausente');
  assert(!/localStorage\.clear\s*\(/.test(src),nome+': proibido limpar todo armazenamento');
}
assert(!agendas.includes("portalTacsAdminAgendasSnapshotV102:'+areaId"),'Agendas ainda usa chave somente por área');
assert(recados.includes('function aplicarSnapshotSeDisponivel()'),'Recados sem leitura local-first');
assert(recados.includes("contextoPronto=false;manutencaoConhecida=false;podeAdministrar=false"),'Recados deve manter escrita/autoridade bloqueada no snapshot');
assert(recados.includes("r.temporario===true")&&recados.includes('snapshotVisivel'),'Recados deve preservar snapshot em falha transitória');
assert(recados.includes('salvarSnapshot(r)'),'Recados deve atualizar snapshot após leitura confirmada');
assert(prof.includes('dadosConfirmados=false'),'Profissionais sem estado explícito de confirmação');
assert(prof.includes('function bloquearEdicaoNaoConfirmada()'),'Profissionais sem trava de edição do snapshot');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar profissionais."),'Salvar profissional deve exigir leitura confirmada');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar serviços."),'Salvar serviço deve exigir leitura confirmada');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de criar profissional."),'Criar profissional deve exigir leitura confirmada');
assert(prof.includes('salvarSnapshot(r)'),'Profissionais deve atualizar snapshot após leitura confirmada');
assert(!moradores.includes('portalTacsAdminSnapshotV1:moradores:'),'Moradores não pode receber cache local neste bloco');
console.log('Bloco 3 local-first: Agendas, Recados/Campanhas e Profissionais/Serviços isolados; escrita exige servidor; Moradores fora do cache.');
""",encoding='utf-8')

# ---------- incluir teste no gate completo ----------
pkg_path=Path('package.json')
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
cmd='node scripts/test_admin_local_first_v1.js'
if cmd not in pkg['scripts']['test']:
    pkg['scripts']['test']=pkg['scripts']['test']+' && '+cmd
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('BLOCO_3_LOCAL_FIRST_APLICADO_EM_WORKTREE')
