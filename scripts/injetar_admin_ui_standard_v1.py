from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'admin-ui-standard.inline.css').read_text(encoding='utf-8').strip()
BEHAVIOR = (ROOT / 'admin-ui-behavior.inline.js').read_text(encoding='utf-8').strip()
START = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_START -->'
END = '<!-- PORTAL_TACS_ADMIN_UI_STANDARD_END -->'
CANON = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10'
REVISION = 'CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R6'
DIAG_COMPAT = "/* DIAGNOSTICO_INLINE_CORRECAO_PONTUAL_V4 compat: diagFilter=PENDING_VIEW?'PENDENTES':'' */"

VISUAL_GUARD = r'''
<style id="cscVisualContractGuard20260913">
/* CORRECAO_VISUAL_CONTRATO_APP4_2026_09_13_V1
   Guarda final de apresentação. Não altera IDs funcionais, ações, sessão, PIN,
   permissões, áreas, gravações ou backend. */
#portalTacsCentralRefreshV1,
#portalTacsAtualizarPaginaV1,
#portalTacsAdminRefreshV1,
#atualizarPaginaAgendas,
#atualizarPaginaAgendasFlutuante,
.agendaAtualizarPaginaFlutuanteV2{
  display:none!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
html body .csc-appbar,
html body #cscInstitutionalAppbar{
  position:static!important;
  top:auto!important;
  inset:auto!important;
  background:#071827!important;
  background-image:none!important;
  border:0!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}
html body .csc-platform-footer,
html body #cscPlatformFooter{
  display:grid!important;
  position:static!important;
  width:min(720px,100%)!important;
  margin:34px auto 0!important;
  padding:22px 16px calc(30px + env(safe-area-inset-bottom))!important;
  gap:7px!important;
  text-align:center!important;
  background:#071827!important;
  background-image:none!important;
  color:#adc4d2!important;
  border:0!important;
  box-shadow:none!important;
}
html body #cscPlatformFooter strong,
html body .csc-platform-footer strong{
  color:#f7fcff!important;
  font-size:.92rem!important;
  line-height:1.35!important;
  font-weight:850!important;
}
html body #cscPlatformFooter small,
html body .csc-platform-footer small{
  color:#adc4d2!important;
  font-size:.78rem!important;
  line-height:1.3!important;
  font-weight:650!important;
}
html body.csc-central #cscPlatformFooter{
  display:grid!important;
  padding-bottom:calc(110px + env(safe-area-inset-bottom))!important;
}
html body .viewer.csc-native-viewer:not([hidden]){
  display:block!important;
  position:fixed!important;
  inset:0!important;
  z-index:30000!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  background:#071827!important;
  background-image:none!important;
  border:0!important;
  box-shadow:none!important;
}
html body .viewer.csc-native-viewer>.viewer-bar{
  position:static!important;
  top:auto!important;
  inset:auto!important;
  width:min(720px,100%)!important;
  margin:0 auto!important;
  background:#071827!important;
  background-image:none!important;
  border:0!important;
  box-shadow:none!important;
}
html body .viewer.csc-native-viewer>.csc-native-module-host{
  display:block!important;
  width:100%!important;
  min-height:0!important;
  overflow:visible!important;
  background:#071827!important;
  background-image:none!important;
  border:0!important;
  box-shadow:none!important;
}
html body .viewer.csc-native-viewer>.viewer-platform-footer{
  display:grid!important;
  position:static!important;
  width:min(720px,100%)!important;
  margin:0 auto!important;
  padding:24px 16px calc(32px + env(safe-area-inset-bottom))!important;
  gap:7px!important;
  text-align:center!important;
  background:#071827!important;
  background-image:none!important;
  color:#adc4d2!important;
  border:0!important;
  box-shadow:none!important;
}
html body .viewer.csc-native-viewer>.viewer-platform-footer strong{color:#f7fcff!important;font-size:.92rem!important;line-height:1.35!important;font-weight:850!important}
html body .viewer.csc-native-viewer>.viewer-platform-footer small{color:#adc4d2!important;font-size:.78rem!important;line-height:1.3!important;font-weight:650!important}
html body .viewer.csc-frame-viewer:not([hidden]){
  display:block!important;
  position:fixed!important;
  inset:0!important;
  z-index:30000!important;
  overflow:hidden!important;
  background:#071827!important;
  background-image:none!important;
  border:0!important;
  box-shadow:none!important;
}
html body .viewer.csc-frame-viewer>.viewer-bar,
html body .viewer.csc-frame-viewer>.viewer-platform-footer{display:none!important}
html body .viewer.csc-frame-viewer>iframe{
  display:block!important;
  width:100%!important;
  height:100dvh!important;
  min-height:100dvh!important;
  border:0!important;
  background:#071827!important;
}
html body .viewer.csc-native-viewer .panel,
html body .viewer.csc-native-viewer .painel,
html body .viewer.csc-native-viewer .card,
html body .viewer.csc-native-viewer .item,
html body .viewer.csc-native-viewer .cartao,
html body .viewer.csc-native-viewer .number,
html body .viewer.csc-native-viewer .metric,
html body .viewer.csc-native-viewer .status{
  border-color:#2b5a76!important;
  box-shadow:none!important;
}
</style>
<script id="cscVisualContractGuardJs20260913">
(function(){
'use strict';
var FOOTER_HTML='<strong>Conecta Saúde Comunitária — tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível.</strong><small>Plataforma institucional de saúde comunitária.</small>';
function trim(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function removeRefreshButtons(){
  document.querySelectorAll('#portalTacsCentralRefreshV1,#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1,#atualizarPaginaAgendas,#atualizarPaginaAgendasFlutuante,.agendaAtualizarPaginaFlutuanteV2').forEach(function(n){n.remove()});
  document.querySelectorAll('button,a').forEach(function(n){
    var t=trim(n.textContent).toLowerCase();
    if(t==='↻ atualizar página'||t==='atualizar página'||t==='atualizar pagina')n.remove();
  });
}
function ensurePlatformFooter(){
  if(!document.body)return;
  var viewer=document.getElementById('viewer');
  var existing=document.getElementById('cscPlatformFooter');
  if(!existing&&!viewer){
    existing=document.createElement('footer');existing.id='cscPlatformFooter';existing.className='csc-platform-footer';
    document.body.appendChild(existing);
  }
  if(existing){existing.innerHTML=FOOTER_HTML;existing.hidden=false;existing.style.display='grid'}
  var vf=document.getElementById('viewerFooter');
  if(vf){vf.innerHTML=FOOTER_HTML}
}
function normalizeHeader(){
  var bar=document.getElementById('cscInstitutionalAppbar');
  if(bar){bar.style.position='static';bar.style.top='auto';bar.style.background='#071827';bar.style.border='0';bar.style.boxShadow='none'}
  var viewer=document.getElementById('viewer');
  if(viewer&&viewer.classList.contains('csc-native-viewer')){
    var vbar=viewer.querySelector('.viewer-bar');
    if(vbar){vbar.style.position='static';vbar.style.top='auto';vbar.style.background='#071827';vbar.style.border='0';vbar.style.boxShadow='none'}
  }
}
function run(){removeRefreshButtons();ensurePlatformFooter();normalizeHeader()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
setTimeout(run,120);setTimeout(run,500);setTimeout(run,1500);
try{new MutationObserver(function(){run()}).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
}());
</script>
'''.strip()

# Somente área administrativa. Portal do Morador / Portal TACS público não entra aqui.
TARGETS = [
    'central-administrativa-tacs.html',
    'painel-oficial-organizacoes-municipios.html',
    'painel-oficial-agendas-vagas.html',
    'painel-oficial-profissionais-servicos.html',
    'painel-oficial-recados-campanhas.html',
    'painel-oficial-tacs-areas.html',
    'painel-suporte-moradores-v2.html',
    'painel-suporte-moradores.html',
    'teste-v1/painel-moradores-v2.html',
    'teste-v1/painel-profissionais-servicos-v1.html',
    'teste-v1/painel-tacs-areas-v1.html',
]

if CANON not in SOURCE or REVISION not in SOURCE:
    raise SystemExit(f'CSS administrativo não contém os contratos canônicos {CANON} / {REVISION}')
if REVISION not in BEHAVIOR:
    raise SystemExit(f'Comportamento administrativo não contém a revisão {REVISION}')

block = (
    f'{START}\n'
    f'<style id="portalTacsAdminUiStandardV1">\n{SOURCE}\n{DIAG_COMPAT}\n</style>\n'
    f'<script id="portalTacsAdminUiBehaviorR6">\n{BEHAVIOR}\n</script>\n'
    f'{VISUAL_GUARD}\n'
    f'{END}'
)
changed = []

for rel in TARGETS:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f'{rel}: arquivo administrativo não encontrado')
    text = path.read_text(encoding='utf-8')
    if START in text and END in text:
        before, rest = text.split(START, 1)
        _, after = rest.split(END, 1)
        new = before + block + after
    else:
        marker = '</head>'
        if marker not in text:
            raise SystemExit(f'{rel}: </head> não encontrado')
        new = text.replace(marker, block + '\n' + marker, 1)
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed.append(rel)

print(f'ADMIN_UI_APP4_CANON={CANON}')
print(f'ADMIN_UI_APP4_REVISION={REVISION}')
print(f'ADMIN_UI_STANDARD_INJETADO={len(changed)}')
print('CORRECAO_VISUAL_CONTRATO_APP4_2026_09_13_V1=ATIVA')
for rel in changed:
    print(rel)
