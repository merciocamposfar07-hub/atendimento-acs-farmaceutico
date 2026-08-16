from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def write(name, text):
    (ROOT / name).write_text(text, encoding='utf-8')

def require(cond, msg):
    if not cond:
        raise RuntimeError(msg)

def replace_once(text, old, new, label):
    require(old in text, f'Trecho não encontrado: {label}')
    return text.replace(old, new, 1)

def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    require(a >= 0, f'Início não encontrado: {label}')
    b = text.find(end, a + len(start))
    require(b >= 0, f'Fim não encontrado: {label}')
    return text[:a] + replacement + text[b:]

# Central: remove tecnologia/botão de contraste e mantém padrão visual/overflow/petróleo.
name = 'central-administrativa-tacs.js'
s = read(name)
s = s.replace(",CONTRAST_KEY='portalTacsContrasteV1'", '')
s = re.sub(r"function contrastEnabled\(\)\{[^\n]*\}\n", '', s, count=1)
new_apply = r'''function applyUiStandard(doc){
  try{
    if(!doc||!doc.documentElement||!doc.head||!doc.body)return;
    var root=doc.documentElement,style=doc.getElementById('portalTacsUiStandardV2Style');
    if(!style){
      style=doc.createElement('style');style.id='portalTacsUiStandardV2Style';style.textContent='\
:root{--tacs-petroleo:#073a55;--tacs-petroleo-2:#0b5878;--tacs-borda:#69c7e7}\
html,body{max-width:100%;overflow-x:hidden}\
.panel,.list,.card,.area-row,details,summary{min-width:0}\
.card summary>div,details summary>div:first-child{min-width:0;flex:1 1 auto}\
.card h3,.sub,.area-row strong,.area-row .sub,summary strong,summary span:not(.signal){overflow-wrap:anywhere;word-break:break-word}\
.signal{flex:0 0 auto!important;max-width:100%;margin-left:auto;white-space:normal!important;overflow-wrap:anywhere}\
input,select,textarea,button{max-width:100%}\
#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste,.contrasteBotao,.preferenciaVisual{display:none!important}\
.btn.green,.botao.verde{background:linear-gradient(145deg,var(--tacs-petroleo),var(--tacs-petroleo-2))!important;color:#fff!important}\
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:4px solid #ffd54f!important;outline-offset:2px!important}\
@media(max-width:430px){.card summary{align-items:flex-start!important}.signal{margin-top:2px}}';
      doc.head.appendChild(style);
    }
    root.classList.remove('tacs-high-contrast','high-contrast');
    ['portalTacsContrastToggleV1','contrastToggle','alternarContraste'].forEach(function(id){var n=doc.getElementById(id);if(n)n.hidden=true});
    doc.querySelectorAll('.contrasteBotao,.preferenciaVisual').forEach(function(n){n.hidden=true});
  }catch(e){}
}
'''
s = replace_between(s, 'function applyUiStandard(doc){', 'function jsonp(', new_apply, 'applyUiStandard')
s = s.replace("revision='20260816-ui-standard-v1'", "revision='20260816-ui-fixed-v2'")
write(name, s)

# Central HTML: cache bust.
name = 'central-administrativa-tacs.html'
s = read(name)
s = re.sub(r'central-administrativa-tacs\.js\?v=[^"\']+', 'central-administrativa-tacs.js?v=20260816-ui-fixed-v2', s, count=1)
write(name, s)

# Municípios: sem contraste e todos os botões principais em petróleo.
name = 'painel-oficial-organizacoes-municipios.html'
s = read(name)
s = s.replace('.btn.green{background:var(--green)}', '.btn.green{background:linear-gradient(145deg,var(--p),var(--p2))}')
s = re.sub(r'#portalTacsContrastToggleV1\{[^}]*\}\n?', '', s)
s = re.sub(r'html\.high-contrast[^\n]*\n?', '', s)
s = re.sub(r'<button id="portalTacsContrastToggleV1"[^>]*>[^<]*</button>\n?', '', s)
s = s.replace(",CONTRAST_KEY='portalTacsContrasteV1'", '')
s = re.sub(r'function syncContrast\(\)\{[^\n]*\}\n?', '', s)
s = re.sub(r"el\('portalTacsContrastToggleV1'\)\.addEventListener\([^\n]*?syncContrast\(\);load\(\);", 'load();', s)
require('<button id="portalTacsContrastToggleV1"' not in s, 'Botão de contraste municipal ainda existe')
write(name, s)

# Recados e campanhas: mantém painel original e acrescenta só Campanhas no mês.
name = 'painel-oficial-recados-campanhas.html'
s = read(name)
s = s.replace("var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260814-receipt-v110';", "var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260816-recados-repair-v2';")
s = s.replace("fetch(origem,{cache:'default'})", "fetch(origem,{cache:'no-store'})")
s = s.replace('campanhas-periodo-v1.js?v=20260816-periodo-v1', 'campanhas-periodo-v1.js?v=20260816-periodo-v2')
anchor = "trocas.forEach(function(par){html=substituir(html,par[0],par[1])});"
visual = anchor + r'''
      var visualFixo='<style id="recados-petroleo-fixo">#alternarContraste,.preferenciaVisual,.contrasteBotao{display:none!important}.botao.verde{background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important}.numero,.areaEnvio,.item{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}.numero span,.areaEnvio p,.item .sub{color:#d8eef7!important}.item .corpo{border-top-color:rgba(216,238,247,.35)!important}</style>';
      html=substituir(html,'</head>',visualFixo+'</head>');'''
if 'recados-petroleo-fixo' not in s:
    s = replace_once(s, anchor, visual, 'visual petróleo do painel Recados')
write(name, s)

# Card corporativo: dados essenciais preservados; serviço/descrição sem redundância.
name = 'portal-ajustes-finais.js'
s = read(name)
helpers = r'''  function escapeRegExp(value) {
    return String(value == null ? '' : value).replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  }

  function corporateRequest(data) {
    var service = clean(data.category).replace(/^Solicitar\s+/i, '') || 'Serviço informado';
    var raw = clean(data.description);
    [clean(data.category), service].forEach(function (prefix) {
      if (!prefix) return;
      raw = raw.replace(new RegExp('^' + escapeRegExp(prefix) + '\\s*(?:[-–:]\\s*)?', 'i'), '').trim();
    });
    var day = '';
    var dayMatch = raw.match(/^((?:Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado|Domingo)(?:-feira)?)\s*[-–]\s*/i);
    if (dayMatch) {
      day = clean(dayMatch[1]);
      raw = raw.slice(dayMatch[0].length).trim();
    }
    var status = '';
    var statusWithDetail = raw.match(/^Situa[cç][aã]o\s*:\s*([^:]+?)\s*:\s*(.+)$/i);
    if (statusWithDetail) {
      status = clean(statusWithDetail[1]);
      raw = clean(statusWithDetail[2]);
    } else {
      var statusOnly = raw.match(/^Situa[cç][aã]o\s*:\s*([^–-]+?)(?:\s*[-–]\s*(.+))?$/i);
      if (statusOnly) {
        status = clean(statusOnly[1]);
        raw = clean(statusOnly[2]);
      }
    }
    raw = raw.replace(/\s+-\s+/g, ' – ').trim();
    if (raw && !/[.!?]$/.test(raw)) raw += '.';
    return { service: service, description: raw || 'Não informada.', day: day, status: status };
  }

'''
if 'function corporateRequest(data)' not in s:
    s = replace_once(s, '  function createPetroleumCard(data) {', helpers + '  function createPetroleumCard(data) {', 'helpers do card')
new_card = r'''  function createPetroleumCard(data) {
    var summary = corporateRequest(data);
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#031b2d');
    gradient.addColorStop(0.55, '#073a55');
    gradient.addColorStop(1, '#0b5878');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = '#8df0b4';
    ctx.font = '900 36px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('PORTAL TACS • SOLICITAÇÃO', 60, 82);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 66px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SOLICITAÇÃO DO MORADOR', 60, 165);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, 52, 210, 976, 350, 30);
    ctx.fill();
    var infoY = 257;
    function identityBlock(label, value, valueSize, maxLines) {
      ctx.fillStyle = '#8df0b4';
      ctx.font = '900 24px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label, 82, infoY);
      infoY += 38;
      ctx.fillStyle = '#ffffff';
      ctx.font = '850 ' + valueSize + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      infoY = drawLines(ctx, value, 82, infoY, 890, valueSize + 7, maxLines) + 19;
    }
    identityBlock('ÁREA DE ATENDIMENTO', data.areaName, 38, 2);
    identityBlock('TACS RESPONSÁVEL', data.tacsName, 31, 2);
    identityBlock('UNIDADE DE SAÚDE', data.unitName, 29, 2);

    ctx.fillStyle = 'rgba(141,240,180,.13)';
    roundRect(ctx, 52, 590, 976, 180, 30);
    ctx.fill();
    ctx.fillStyle = '#8df0b4';
    ctx.font = '900 25px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('SERVIÇO SOLICITADO', 82, 638);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    drawLines(ctx, summary.service, 82, 698, 900, 52, 2);

    ctx.fillStyle = 'rgba(255,255,255,.98)';
    roundRect(ctx, 48, 805, 984, 895, 38);
    ctx.fill();
    var cursor = 862;
    function block(label, value, maxLines, spacing, fontSize) {
      ctx.fillStyle = '#0b5878';
      ctx.font = '900 23px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      ctx.fillText(label.toUpperCase(), 88, cursor);
      cursor += 33;
      ctx.fillStyle = '#102b3c';
      var size = fontSize || 36;
      ctx.font = '800 ' + size + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
      cursor = drawLines(ctx, value, 88, cursor, 900, size + 7, maxLines) + (spacing || 18);
    }

    block('Nome completo', data.name, 2, 17, 38);
    block('Data e horário do envio', data.sentAt, 1, 16, 35);
    block('Nascimento e idade', data.birth + ' • ' + data.age, 2, 16, 35);
    block('CPF ou CNS', data.document, 1, 16, 35);
    block('Localidade / comunidade', data.locality, 3, 18, 34);
    block('Descrição da solicitação', summary.description, 4, 13, 34);
    if (summary.day) block('Dia informado', summary.day, 1, 12, 32);
    if (summary.status) block('Situação', summary.status, 1, 8, 32);

    ctx.fillStyle = '#8df0b4';
    ctx.fillRect(52, 1742, 976, 7);
    ctx.fillStyle = '#ffffff';
    ctx.font = '850 31px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Código: ' + data.code, 60, 1810);
    ctx.fillStyle = '#d8e7ee';
    ctx.font = '700 26px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';
    ctx.fillText('Gerado pelo Portal TACS • ' + data.areaName, 60, 1855);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('Não foi possível gerar o card.'));
        else resolve(blob);
      }, 'image/png', 1);
    });
  }

'''
s = replace_between(s, '  function createPetroleumCard(data) {', '  function sendCard() {', new_card, 'card corporativo')
write(name, s)

# Teste visual: contrato V2 sem botões de contraste.
name = 'scripts/test_ui_contract_v1.js'
s = read(name)
old = """assert(/CONTRAST_KEY='portalTacsContrasteV1'/.test(centralJs), 'Central: chave persistente de contraste ausente');
assert(/function applyUiStandard\\(doc\\)/.test(centralJs), 'Central: aplicador do padrão visual ausente');
assert(/applyUiStandard\\(document\\)/.test(centralJs), 'Central: padrão visual não é aplicado à própria Central');
assert(/viewerFrame[^\\n]*addEventListener\\('load'/.test(centralJs), 'Central: painéis internos não recebem o padrão visual no carregamento');
assert(/portalTacsContrastToggleV1/.test(centralJs), 'Central: controle de contraste não é injetado nos painéis');"""
new = """assert(/function applyUiStandard\\(doc\\)/.test(centralJs), 'Central: aplicador do padrão visual ausente');
assert(/applyUiStandard\\(document\\)/.test(centralJs), 'Central: padrão visual não é aplicado à própria Central');
assert(/viewerFrame[^\\n]*addEventListener\\('load'/.test(centralJs), 'Central: painéis internos não recebem o padrão visual no carregamento');
assert(/#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste/.test(centralJs), 'Central: regra que oculta controles antigos ausente');
assert(!/doc\\.createElement\\('button'\\);button\\.id='portalTacsContrastToggleV1'/.test(centralJs), 'Central: botão de contraste não pode ser recriado');
assert(/btn\\.green,.botao\\.verde/.test(centralJs), 'Central: ações principais não recebem padrão azul-petróleo');"""
s = replace_once(s, old, new, 'teste do padrão visual')
s = s.replace("console.log('UI contract V1: OK — azul-petróleo, contraste centralizado, módulos e proteção de overflow conferidos.');", "assert(!/<button id=\"portalTacsContrastToggleV1\"/.test(multi), 'Municípios: botão de contraste deve estar removido');\nconsole.log('UI contract V2: OK — azul-petróleo fixo, sem botões de contraste, módulos e overflow conferidos.');")
write(name, s)

# Teste campanhas/card: mantém meses e valida reparo/corporativo.
name = 'scripts/test_campanhas_periodo_v1.js'
s = read(name)
s = s.replace('campanhas-periodo-v1.js?v=20260816-periodo-v1', 'campanhas-periodo-v1.js?v=20260816-periodo-v2')
s = s.replace("assert(portal.includes(\"ctx.font = '800 44px\"), 'Portal: tipografia ampliada do card não encontrada');", "assert(portal.includes('ÁREA DE ATENDIMENTO'), 'Portal: bloco Área de atendimento ausente');\nassert(portal.includes('TACS RESPONSÁVEL'), 'Portal: bloco TACS responsável ausente');\nassert(portal.includes('UNIDADE DE SAÚDE'), 'Portal: bloco Unidade de saúde ausente');\nassert(portal.includes('function corporateRequest(data)'), 'Portal: normalização corporativa da descrição ausente');\nassert(portal.includes(\"ctx.font = '800 ' + size\"), 'Portal: tipografia legível do card não encontrada');")
s = s.replace("assert(municipal.includes('portalTacsContrasteV1'), 'Municípios: contraste persistente ausente');", "assert(!municipal.includes('<button id=\"portalTacsContrastToggleV1\"'), 'Municípios: botão de contraste foi reintroduzido');")
s = s.replace("console.log('Campanhas/portal V1: OK — período anual/mensal, card profissional, feedback municipal e atenção pública validados.');", "assert(wrapper.includes('recados-petroleo-fixo'), 'Painel oficial: padrão petróleo fixo de Recados ausente');\nconsole.log('Campanhas/portal V2: OK — meses preservados, painel reparado, card corporativo e padrão petróleo validados.');")
write(name, s)

print('REPARO_UI_RECADOS_CARD_V2_OK')
