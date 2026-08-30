from pathlib import Path

JS_PATH = Path('central-back-button-v1.js')
PANEL_PATH = Path('painel-oficial-recados-campanhas.html')
TEST_PATH = Path('scripts/test_recados_safari_render_v1.js')


def patch_js():
    js = JS_PATH.read_text(encoding='utf-8')
    marker = 'portalTacsRecadosViewerSafeV4'
    if marker not in js:
        anchor = 'installRecadosRenderSafe();\n'
        if anchor not in js:
            raise SystemExit('Âncora installRecadosRenderSafe não encontrada')
        block = r'''

/*
 * Safari/iPhone — estabilização isolada do visor da Central para Recados.
 * Corrige o recorte vertical sem mudar rotas, dados, Push ou outros painéis.
 */
function installRecadosViewerSafeV4(){
  if(!isRecados)return;
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}

  var parentWindow=null,parentDocument=null,viewer=null,frame=null,visual=null,raf=0;
  try{
    if(window.parent!==window){
      parentWindow=window.parent;
      parentDocument=parentWindow.document;
      viewer=parentDocument.getElementById('viewer');
      frame=parentDocument.getElementById('viewerFrame');
      if(!viewer||!frame||frame.contentWindow!==window){viewer=null;frame=null;parentWindow=null;parentDocument=null;}
    }
  }catch(e){viewer=null;frame=null;parentWindow=null;parentDocument=null;}

  if(viewer&&frame){
    var style=parentDocument.getElementById('portalTacsRecadosViewerSafeV4');
    if(!style){
      style=parentDocument.createElement('style');
      style.id='portalTacsRecadosViewerSafeV4';
      style.textContent=[
        '#viewer.portal-tacs-recados-viewer-safe-v4{position:fixed!important;top:0!important;right:0!important;bottom:auto!important;left:0!important;width:100%!important;height:100vh!important;height:100dvh!important;min-height:100vh!important;min-height:100dvh!important;max-height:100dvh!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;grid-template-columns:minmax(0,1fr)!important;align-items:stretch!important;overflow:hidden!important;transform:none!important;will-change:auto!important;}',
        '#viewer.portal-tacs-recados-viewer-safe-v4>.viewer-bar{grid-row:1!important;grid-column:1!important;min-width:0!important;position:relative!important;inset:auto!important;}',
        '#viewer.portal-tacs-recados-viewer-safe-v4>#viewerFrame{grid-row:2!important;grid-column:1!important;display:block!important;position:relative!important;inset:auto!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:100%!important;flex:none!important;align-self:stretch!important;border:0!important;transform:none!important;will-change:auto!important;}',
        'body.viewer-open #viewer.portal-tacs-recados-viewer-safe-v4{margin:0!important;}'
      ].join('\n');
      (parentDocument.head||parentDocument.documentElement).appendChild(style);
    }
    viewer.classList.add('portal-tacs-recados-viewer-safe-v4');
    try{visual=parentWindow.visualViewport||null}catch(e){visual=null}
  }

  function syncViewer(){
    if(!viewer||!frame)return;
    try{
      if(viewer.hidden||frame.contentWindow!==window)return;
      viewer.style.setProperty('top','0px','important');
      viewer.style.setProperty('left','0px','important');
      viewer.style.setProperty('right','0px','important');
      viewer.style.setProperty('bottom','auto','important');
      viewer.style.setProperty('width','100%','important');
      viewer.style.setProperty('height','100dvh','important');
      frame.style.setProperty('width','100%','important');
      frame.style.setProperty('height','100%','important');
      frame.style.setProperty('min-height','0','important');
      frame.style.setProperty('max-height','100%','important');
      void viewer.offsetHeight;
    }catch(e){}
  }

  function scheduleSync(){
    if(!viewer||!parentWindow)return;
    try{
      if(raf&&typeof parentWindow.cancelAnimationFrame==='function')parentWindow.cancelAnimationFrame(raf);
      if(typeof parentWindow.requestAnimationFrame==='function')raf=parentWindow.requestAnimationFrame(function(){raf=0;syncViewer()});
      else setTimeout(syncViewer,0);
    }catch(e){setTimeout(syncViewer,0)}
  }

  function resetInitialPosition(){
    try{window.scrollTo(0,0)}catch(e){}
    scheduleSync();
  }

  window.PortalTacsRecadosViewportSafeV4={resetInitial:resetInitialPosition,sync:scheduleSync};
  resetInitialPosition();
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(resetInitialPosition);
  setTimeout(resetInitialPosition,80);
  setTimeout(scheduleSync,320);

  window.addEventListener('pageshow',function(e){if(e&&e.persisted)resetInitialPosition()});
  if(visual){visual.addEventListener('resize',scheduleSync);visual.addEventListener('scroll',scheduleSync)}
  if(parentWindow){
    parentWindow.addEventListener('resize',scheduleSync);
    parentWindow.addEventListener('orientationchange',scheduleSync);
  }

  window.addEventListener('pagehide',function cleanup(){
    try{
      if(visual){visual.removeEventListener('resize',scheduleSync);visual.removeEventListener('scroll',scheduleSync)}
      if(parentWindow){parentWindow.removeEventListener('resize',scheduleSync);parentWindow.removeEventListener('orientationchange',scheduleSync)}
      if(viewer&&frame&&frame.contentWindow===window){
        viewer.classList.remove('portal-tacs-recados-viewer-safe-v4');
        ['top','left','right','bottom','width','height'].forEach(function(p){viewer.style.removeProperty(p)});
        ['width','height','min-height','max-height'].forEach(function(p){frame.style.removeProperty(p)});
      }
    }catch(e){}
  },{once:true});
}
installRecadosViewerSafeV4();
'''
        js = js.replace(anchor, anchor + block, 1)

    reset_marker = 'recadosFirstContentResetDone'
    if reset_marker not in js:
        state_anchor = '  var PAGE=6;\n  var states={};\n'
        if state_anchor not in js:
            raise SystemExit('Âncora da janela de Recados não encontrada')
        js = js.replace(state_anchor, state_anchor + '  var recadosFirstContentResetDone=false;\n', 1)
        compact_anchor = "    var control=makeControl(id,state);if(control)list.appendChild(control);\n    reconnect(state);\n  }\n\n  function ensureFirstPage(id){"
        compact_replacement = "    var control=makeControl(id,state);if(control)list.appendChild(control);\n    reconnect(state);\n    if(items.length&&!recadosFirstContentResetDone){\n      recadosFirstContentResetDone=true;\n      setTimeout(function(){\n        try{\n          var safe=window.PortalTacsRecadosViewportSafeV4;\n          if(safe&&typeof safe.resetInitial==='function')safe.resetInitial();\n          else window.scrollTo(0,0);\n        }catch(e){}\n      },0);\n    }\n  }\n\n  function ensureFirstPage(id){"
        if compact_anchor not in js:
            raise SystemExit('Âncora compactFresh não encontrada')
        js = js.replace(compact_anchor, compact_replacement, 1)

    JS_PATH.write_text(js, encoding='utf-8')


def patch_panel():
    panel = PANEL_PATH.read_text(encoding='utf-8')
    old = 'central-back-button-v1.js?v=20260827-recados-buttons-safe-v1'
    new = 'central-back-button-v1.js?v=20260830-recados-viewport-safe-v4'
    if old in panel:
        panel = panel.replace(old, new, 1)
    elif new not in panel:
        raise SystemExit('Carimbo do central-back-button não encontrado')
    PANEL_PATH.write_text(panel, encoding='utf-8')


def patch_test():
    test = TEST_PATH.read_text(encoding='utf-8')
    if 'RECADOS_VIEWER_SAFE_V4_OK' not in test:
        anchor = "console.log('RECADOS_SAFARI_RENDER_V1_OK');"
        if anchor not in test:
            raise SystemExit('Âncora do teste Safari não encontrada')
        checks = r'''
const backButton = fs.readFileSync('central-back-button-v1.js', 'utf8');
assert.match(backButton, /portalTacsRecadosViewerSafeV4/,
  'Recados deve instalar a estabilização isolada do visor da Central.');
assert.match(backButton, /portal-tacs-recados-viewer-safe-v4/);
assert.match(backButton, /height:100dvh!important/,
  'O visor de Recados deve ocupar o viewport dinâmico inteiro no iPhone.');
assert.match(backButton, /grid-template-rows:auto minmax\(0,1fr\)/,
  'O visor de Recados deve evitar o colapso flex do iframe no Safari.');
assert.match(backButton, /history\.scrollRestoration='manual'/,
  'Recados não deve restaurar uma posição antiga que deixe a página aparente cortada.');
assert.match(backButton, /window\.scrollTo\(0,0\)/,
  'A primeira abertura de Recados deve começar no topo real do painel.');
assert.match(backButton, /recadosFirstContentResetDone/,
  'A primeira compactação da lista deve neutralizar a posição antiga do Safari.');
assert.doesNotMatch(backButton, /html\{[^}]*overflow-y:visible!important/,
  'A correção não pode reintroduzir overflow-y visible no elemento html.');
assert.match(panel, /central-back-button-v1\.js\?v=20260830-recados-viewport-safe-v4/,
  'O painel deve invalidar o cache do estabilizador corrigido.');
console.log('RECADOS_VIEWER_SAFE_V4_OK');
'''
        test = test.replace(anchor, checks + '\n' + anchor, 1)
    TEST_PATH.write_text(test, encoding='utf-8')


patch_js()
patch_panel()
patch_test()
print('RECADOS_VIEWPORT_SAFE_V4_PATCH_OK')
