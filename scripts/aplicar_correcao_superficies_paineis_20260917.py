from pathlib import Path

JS = Path('central-administrativa-tacs.js')
HTML = Path('central-administrativa-tacs.html')
MARKER = 'CORRECAO_CIRURGICA_ISOLAMENTO_SUPERFICIES_20260917_V1'
NEW_REV = '20260917-isolamento-superficies-v1'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: âncora esperada 1 vez, encontrada {count}. Nenhum patch aplicado.')
    return text.replace(old, new, 1)


js = JS.read_text(encoding='utf-8')
html = HTML.read_text(encoding='utf-8')

if MARKER not in js:
    old_hide = """function hideAllNativeExcept(kind){
  if(kind!=='agendas'){try{if(window.ConectaAgendasNativeV1&&window.ConectaAgendasNativeV1.hide)window.ConectaAgendasNativeV1.hide()}catch(e){}var a=el('nativeModuleHost');if(a)a.hidden=true;var av=el('viewer');if(av)av.classList.remove('csc-agendas-native-viewer')}
  if(kind!=='moradores'){try{if(window.ConectaMoradoresNativeV1&&window.ConectaMoradoresNativeV1.hide)window.ConectaMoradoresNativeV1.hide()}catch(e){}var m=el('nativeMoradoresHost');if(m)m.hidden=true}
  if(kind!=='profissionais'){try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}var p=el('nativeProfissionaisHost');if(p)p.hidden=true}
}
"""
    new_hide = """/* CORRECAO_CIRURGICA_ISOLAMENTO_SUPERFICIES_20260917_V1
   Cada superfície do shell passa a ter um host próprio. UBS e prévia local não reutilizam
   mais o host nativo de Agendas; assim um painel não apaga nem reaproveita o DOM do outro.
   Não altera sessão, PIN, permissões, áreas, backend ou regras de gravação. */
function ensureIsolatedSurfaceHost(id){
  var host=el(id);if(host)return host;
  var viewer=el('viewer'),frame=el('viewerFrame');if(!viewer)return null;
  host=document.createElement('div');host.id=id;host.className='csc-native-module-host';host.hidden=true;
  viewer.insertBefore(host,frame||null);return host;
}
function ensureAdminUbsHost(){return ensureIsolatedSurfaceHost('nativeUbsHost')}
function ensurePendingModuleHost(){return ensureIsolatedSurfaceHost('nativePendingHost')}
function hideAllNativeExcept(kind){
  if(kind!=='agendas'){try{if(window.ConectaAgendasNativeV1&&window.ConectaAgendasNativeV1.hide)window.ConectaAgendasNativeV1.hide()}catch(e){}var a=el('nativeModuleHost');if(a)a.hidden=true;var av=el('viewer');if(av)av.classList.remove('csc-agendas-native-viewer')}
  if(kind!=='moradores'){try{if(window.ConectaMoradoresNativeV1&&window.ConectaMoradoresNativeV1.hide)window.ConectaMoradoresNativeV1.hide()}catch(e){}var m=el('nativeMoradoresHost');if(m)m.hidden=true}
  if(kind!=='profissionais'){try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}var p=el('nativeProfissionaisHost');if(p)p.hidden=true}
  if(kind!=='ubs'){var u=el('nativeUbsHost');if(u)u.hidden=true}
  if(kind!=='pending'){var pending=el('nativePendingHost');if(pending)pending.hidden=true}
}
"""
    js = replace_once(js, old_hide, new_hide, 'isolamento dos hosts')

    old_ubs = """  prepareShellScope();hideAllNativeExcept('ubs');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var host=el('nativeModuleHost'),viewer=el('viewer');if(!host||!viewer)return false;
"""
    new_ubs = """  prepareShellScope();hideAllNativeExcept('ubs');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var base=el('viewerFrame');if(base)base.hidden=true;
  var host=ensureAdminUbsHost(),viewer=el('viewer');if(!host||!viewer)return false;
"""
    js = replace_once(js, old_ubs, new_ubs, 'host exclusivo da UBS')

    old_pending = """  var viewer=el('viewer'),host=el('nativeModuleHost');if(!viewer||!host)return false;
  ensurePendingPreviewStyle();
"""
    new_pending = """  var viewer=el('viewer'),host=ensurePendingModuleHost();if(!viewer||!host)return false;
  ensurePendingPreviewStyle();
"""
    js = replace_once(js, old_pending, new_pending, 'host exclusivo da prévia pendente')

    old_reset = """  var moradoresHost=el('nativeMoradoresHost');if(moradoresHost&&moradoresHost.parentNode)moradoresHost.remove()
  var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost&&profissionaisHost.parentNode)profissionaisHost.remove()
  shellFrames={};shellActiveModule='';shellActiveRoute='';shellActiveNative='';shellScopeKey='';
"""
    new_reset = """  var moradoresHost=el('nativeMoradoresHost');if(moradoresHost&&moradoresHost.parentNode)moradoresHost.remove()
  var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost&&profissionaisHost.parentNode)profissionaisHost.remove()
  var ubsHost=el('nativeUbsHost');if(ubsHost&&ubsHost.parentNode)ubsHost.remove()
  var pendingHost=el('nativePendingHost');if(pendingHost&&pendingHost.parentNode)pendingHost.remove()
  shellFrames={};shellActiveModule='';shellActiveRoute='';shellActiveNative='';shellScopeKey='';
"""
    js = replace_once(js, old_reset, new_reset, 'limpeza dos hosts isolados')

    old_close = """  if(shellActiveNative==='profissionais'){
    try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}
    var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost)profissionaisHost.hidden=true;
  }
  /* CORRECAO_CIRURGICA_QUADRO_VAZIO_UBS_2026_09_16_V1
"""
    new_close = """  if(shellActiveNative==='profissionais'){
    try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}
    var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost)profissionaisHost.hidden=true;
  }
  var ubsHost=el('nativeUbsHost');if(ubsHost)ubsHost.hidden=true;
  var pendingHost=el('nativePendingHost');if(pendingHost)pendingHost.hidden=true;
  /* CORRECAO_CIRURGICA_QUADRO_VAZIO_UBS_2026_09_16_V1
"""
    js = replace_once(js, old_close, new_close, 'fechamento dos hosts isolados')

old_rev = '/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v=20260916-resposta-imediata-v2'
new_rev = f'/atendimento-acs-farmaceutico/central-administrativa-tacs.js?v={NEW_REV}'
if new_rev not in html:
    html = replace_once(html, old_rev, new_rev, 'cache-buster da Central no Safari')

JS.write_text(js, encoding='utf-8')
HTML.write_text(html, encoding='utf-8')
print('CORRECAO_SUPERFICIES_PAINEIS_20260917_OK')
