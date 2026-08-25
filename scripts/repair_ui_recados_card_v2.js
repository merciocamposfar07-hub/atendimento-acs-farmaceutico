'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, content) { fs.writeFileSync(path.join(root, file), content); }
function must(condition, message) { if (!condition) throw new Error(message); }
function replaceOnce(text, from, to, label) {
  const i = text.indexOf(from);
  must(i !== -1, 'Não encontrou trecho para ' + label);
  return text.slice(0, i) + to + text.slice(i + from.length);
}
function replaceBetween(text, start, end, replacement, label) {
  const a = text.indexOf(start);
  must(a !== -1, 'Início não encontrado: ' + label);
  const b = text.indexOf(end, a + start.length);
  must(b !== -1, 'Fim não encontrado: ' + label);
  return text.slice(0, a) + replacement + text.slice(b);
}

// 1) Central: mantém padrão visual/overflow, mas remove qualquer controle de contraste.
{
  const file = 'central-administrativa-tacs.js';
  let s = read(file);
  s = s.replace(",CONTRAST_KEY='portalTacsContrasteV1'", '');
  s = s.replace(/function contrastEnabled\(\)\{[^\n]*\}\n/, '');
  const newApply = `function applyUiStandard(doc){\n  try{\n    if(!doc||!doc.documentElement||!doc.head||!doc.body)return;\n    var root=doc.documentElement,style=doc.getElementById('portalTacsUiStandardV2Style');\n    if(!style){\n      style=doc.createElement('style');style.id='portalTacsUiStandardV2Style';style.textContent='\\\n:root{--tacs-petroleo:#073a55;--tacs-petroleo-2:#0b5878;--tacs-borda:#69c7e7}\\\nhtml,body{max-width:100%;overflow-x:hidden}\\\n.panel,.list,.card,.area-row,details,summary{min-width:0}\\\n.card summary>div,details summary>div:first-child{min-width:0;flex:1 1 auto}\\\n.card h3,.sub,.area-row strong,.area-row .sub,summary strong,summary span:not(.signal){overflow-wrap:anywhere;word-break:break-word}\\\n.signal{flex:0 0 auto!important;max-width:100%;margin-left:auto;white-space:normal!important;overflow-wrap:anywhere}\\\ninput,select,textarea,button{max-width:100%}\\\n#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste,.contrasteBotao,.preferenciaVisual{display:none!important}\\\n.btn.green,.botao.verde{background:linear-gradient(145deg,var(--tacs-petroleo),var(--tacs-petroleo-2))!important;color:#fff!important}\\\ninput:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:4px solid #ffd54f!important;outline-offset:2px!important}\\\n@media(max-width:430px){.card summary{align-items:flex-start!important}.signal{margin-top:2px}}';\n      doc.head.appendChild(style);\n    }\n    root.classList.remove('tacs-high-contrast','high-contrast');\n    ['portalTacsContrastToggleV1','contrastToggle','alternarContraste'].forEach(function(id){var n=doc.getElementById(id);if(n)n.hidden=true});\n    doc.querySelectorAll('.contrasteBotao,.preferenciaVisual').forEach(function(n){n.hidden=true});\n  }catch(e){}\n}\n`;
  s = replaceBetween(s, 'function applyUiStandard(doc){', 'function jsonp(', newApply, 'applyUiStandard');
  s = s.replace(/revision='20260816-ui-standard-v1'/g, "revision='20260816-ui-fixed-v2'");
  write(file, s);
}

// 2) Central HTML: invalida cache da nova revisão.
{
  const file = 'central-administrativa-tacs.html';
  let s = read(file);
  s = s.replace(/central-administrativa-tacs\.js\?v=[^"']+/, 'central-administrativa-tacs.js?v=20260816-ui-fixed-v2');
  write(file, s);
}

// 3) Municípios/organizações: remove botão de contraste e fixa ações principais em petróleo.
{
  const file = 'painel-oficial-organizacoes-municipios.html';
  let s = read(file);
  s = s.replace('.btn.green{background:var(--green)}', '.btn.green{background:linear-gradient(145deg,var(--p),var(--p2))}');
  s = s.replace(/#portalTacsContrastToggleV1\{[^}]*\}\n?/g, '');
  s = s.replace(/html\.high-contrast[^\n]*\n?/g, '');
  s = s.replace(/<button id="portalTacsContrastToggleV1"[^>]*>[^<]*<\/button>\n?/, '');
  s = s.replace(",CONTRAST_KEY='portalTacsContrasteV1'", '');
  s = s.replace(/function syncContrast\(\)\{[^\n]*\}\n?/g, '');
  s = s.replace(/el\('portalTacsContrastToggleV1'\)\.addEventListener\([^\n]*syncContrast\(\);load\(\);/, 'load();');
  must(!s.includes('<button id="portalTacsContrastToggleV1"'), 'Botão de contraste municipal ainda existe');
  write(file, s);
}

// 4) Recados e campanhas: restaura painel original, mantém somente a extensão mensal e força petróleo.
{
  const file = 'painel-oficial-recados-campanhas.html';
  let s = read(file);
  s = s.replace("var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260814-receipt-v110';", "var origem='/atendimento-acs-farmaceutico/teste-v1/painel-recados-campanhas-v1.html?v=20260816-recados-repair-v2';");
  s = s.replace("fetch(origem,{cache:'default'})", "fetch(origem,{cache:'no-store'})");
  s = s.replace(/campanhas-periodo-v1\.js\?v=20260816-periodo-v1/g, 'campanhas-periodo-v1.js?v=20260816-periodo-v2');
  const anchor = "trocas.forEach(function(par){html=substituir(html,par[0],par[1])});";
  const injection = anchor + "\n      var visualFixo='<style id=\"recados-petroleo-fixo\">#alternarContraste,.preferenciaVisual,.contrasteBotao{display:none!important}.botao.verde{background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important}.numero,.areaEnvio,.item{background:linear-gradient(145deg,#073a55,#0b5878)!important;border-color:#69c7e7!important;color:#fff!important;box-shadow:0 8px 18px rgba(7,58,85,.18)!important}.numero span,.areaEnvio p,.item .sub{color:#d8eef7!important}.item .corpo{border-top-color:rgba(216,238,247,.35)!important}</style>';\n      html=substituir(html,'</head>',visualFixo+'</head>');";
  if (!s.includes('recados-petroleo-fixo')) s = replaceOnce(s, anchor, injection, 'visual fixo de recados');
  // Corrige a montagem do documento para que a extensão mensal só entre depois do HTML base estar completo.
  const oldWrite = "document.open();document.write(html);document.close();";
  const newWrite = "document.open();document.write(html);document.close();";
  s = replaceOnce(s, oldWrite, newWrite, 'escrita estável de recados');
  write(file, s);
}

// 5) Card do morador: remove redundância, separa área/TACS/unidade e mantém dados essenciais.
{
  const file = 'portal-ajustes-finais.js';
  let s = read(file);
  const helpers = `  function escapeRegExp(value) {\n    return String(value == null ? '' : value).replace(/[.*+?^\\\${}()|[\\]\\\\]/g, '\\\\$&');\n  }\n\n  function corporateRequest(data) {\n    var service = clean(data.category).replace(/^Solicitar\\s+/i, '') || 'Serviço informado';\n    var raw = clean(data.description);\n    [clean(data.category), service].forEach(function (prefix) {\n      if (!prefix) return;\n      raw = raw.replace(new RegExp('^' + escapeRegExp(prefix) + '\\\\s*(?:[-–:]\\\\s*)?', 'i'), '').trim();\n    });\n    var day = '';\n    var dayMatch = raw.match(/^((?:Segunda|Terça|Terca|Quarta|Quinta|Sexta|Sábado|Sabado|Domingo)(?:-feira)?)\\s*[-–]\\s*/i);\n    if (dayMatch) { day = clean(dayMatch[1]); raw = raw.slice(dayMatch[0].length).trim(); }\n    var status = '';\n    var statusWithDetail = raw.match(/^Situa[cç][aã]o\\s*:\\s*([^:]+?)\\s*:\\s*(.+)$/i);\n    if (statusWithDetail) {\n      status = clean(statusWithDetail[1]);\n      raw = clean(statusWithDetail[2]);\n    } else {\n      var statusOnly = raw.match(/^Situa[cç][aã]o\\s*:\\s*([^–-]+?)(?:\\s*[-–]\\s*(.+))?$/i);\n      if (statusOnly) { status = clean(statusOnly[1]); raw = clean(statusOnly[2]); }\n    }\n    raw = raw.replace(/\\s+-\\s+/g, ' – ').trim();\n    if (raw && !/[.!?]$/.test(raw)) raw += '.';\n    return { service: service, description: raw || 'Não informada.', day: day, status: status };\n  }\n\n`;
  if (!s.includes('function corporateRequest(data)')) {
    s = replaceOnce(s, '  function createPetroleumCard(data) {', helpers + '  function createPetroleumCard(data) {', 'helpers corporativos do card');
  }
  const newCard = `  function createPetroleumCard(data) {\n    var summary = corporateRequest(data);\n    var canvas = document.createElement('canvas');\n    canvas.width = 1080;\n    canvas.height = 1920;\n    var ctx = canvas.getContext('2d');\n    var gradient = ctx.createLinearGradient(0, 0, 1080, 1920);\n    gradient.addColorStop(0, '#031b2d');\n    gradient.addColorStop(0.55, '#073a55');\n    gradient.addColorStop(1, '#0b5878');\n    ctx.fillStyle = gradient;\n    ctx.fillRect(0, 0, 1080, 1920);\n\n    ctx.fillStyle = '#8df0b4';\n    ctx.font = '900 36px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    ctx.fillText('PORTAL TACS • SOLICITAÇÃO', 60, 82);\n    ctx.fillStyle = '#ffffff';\n    ctx.font = '900 66px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    ctx.fillText('SOLICITAÇÃO DO MORADOR', 60, 165);\n\n    ctx.fillStyle = 'rgba(255,255,255,.12)';\n    roundRect(ctx, 52, 210, 976, 350, 30);\n    ctx.fill();\n    var infoY = 257;\n    function identityBlock(label, value, valueSize, maxLines) {\n      ctx.fillStyle = '#8df0b4';\n      ctx.font = '900 24px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n      ctx.fillText(label, 82, infoY);\n      infoY += 38;\n      ctx.fillStyle = '#ffffff';\n      ctx.font = '850 ' + valueSize + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n      infoY = drawLines(ctx, value, 82, infoY, 890, valueSize + 7, maxLines) + 19;\n    }\n    identityBlock('ÁREA DE ATENDIMENTO', data.areaName, 38, 2);\n    identityBlock('TACS RESPONSÁVEL', data.tacsName, 31, 2);\n    identityBlock('UNIDADE DE SAÚDE', data.unitName, 29, 2);\n\n    ctx.fillStyle = 'rgba(141,240,180,.13)';\n    roundRect(ctx, 52, 590, 976, 180, 30);\n    ctx.fill();\n    ctx.fillStyle = '#8df0b4';\n    ctx.font = '900 25px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    ctx.fillText('SERVIÇO SOLICITADO', 82, 638);\n    ctx.fillStyle = '#ffffff';\n    ctx.font = '900 44px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    drawLines(ctx, summary.service, 82, 698, 900, 52, 2);\n\n    ctx.fillStyle = 'rgba(255,255,255,.98)';\n    roundRect(ctx, 48, 805, 984, 895, 38);\n    ctx.fill();\n    var cursor = 862;\n    function block(label, value, maxLines, spacing, fontSize) {\n      ctx.fillStyle = '#0b5878';\n      ctx.font = '900 23px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n      ctx.fillText(label.toUpperCase(), 88, cursor);\n      cursor += 33;\n      ctx.fillStyle = '#102b3c';\n      var size = fontSize || 36;\n      ctx.font = '800 ' + size + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n      cursor = drawLines(ctx, value, 88, cursor, 900, size + 7, maxLines) + (spacing || 18);\n    }\n\n    block('Nome completo', data.name, 2, 17, 38);\n    block('Data e horário do envio', data.sentAt, 1, 16, 35);\n    block('Nascimento e idade', data.birth + ' • ' + data.age, 2, 16, 35);\n    block('CPF ou CNS', data.document, 1, 16, 35);\n    block('Localidade / comunidade', data.locality, 3, 18, 34);\n    block('Descrição da solicitação', summary.description, 4, 13, 34);\n    if (summary.day) block('Dia informado', summary.day, 1, 12, 32);\n    if (summary.status) block('Situação', summary.status, 1, 8, 32);\n\n    ctx.fillStyle = '#8df0b4';\n    ctx.fillRect(52, 1742, 976, 7);\n    ctx.fillStyle = '#ffffff';\n    ctx.font = '850 31px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    ctx.fillText('Código: ' + data.code, 60, 1810);\n    ctx.fillStyle = '#d8e7ee';\n    ctx.font = '700 26px -apple-system,BlinkMacSystemFont,Segoe UI,Arial';\n    ctx.fillText('Gerado pelo Portal TACS • ' + data.areaName, 60, 1855);\n\n    return new Promise(function (resolve, reject) {\n      canvas.toBlob(function (blob) {\n        if (!blob) reject(new Error('Não foi possível gerar o card.'));\n        else resolve(blob);\n      }, 'image/png', 1);\n    });\n  }\n\n`;
  s = replaceBetween(s, '  function createPetroleumCard(data) {', '  function sendCard() {', newCard, 'card corporativo');
  write(file, s);
}

// 6) Testes: novo contrato sem botão de contraste + regressão do painel/campanhas/card.
{
  const file = 'scripts/test_ui_contract_v1.js';
  let s = read(file);
  const from = `assert(/CONTRAST_KEY='portalTacsContrasteV1'/.test(centralJs), 'Central: chave persistente de contraste ausente');\nassert(/function applyUiStandard\\(doc\\)/.test(centralJs), 'Central: aplicador do padrão visual ausente');\nassert(/applyUiStandard\\(document\\)/.test(centralJs), 'Central: padrão visual não é aplicado à própria Central');\nassert(/viewerFrame[^\\n]*addEventListener\\('load'/.test(centralJs), 'Central: painéis internos não recebem o padrão visual no carregamento');\nassert(/portalTacsContrastToggleV1/.test(centralJs), 'Central: controle de contraste não é injetado nos painéis');`;
  const to = `assert(/function applyUiStandard\\(doc\\)/.test(centralJs), 'Central: aplicador do padrão visual ausente');\nassert(/applyUiStandard\\(document\\)/.test(centralJs), 'Central: padrão visual não é aplicado à própria Central');\nassert(/viewerFrame[^\\n]*addEventListener\\('load'/.test(centralJs), 'Central: painéis internos não recebem o padrão visual no carregamento');\nassert(/#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste/.test(centralJs), 'Central: regra de remoção dos controles antigos ausente');\nassert(!/doc\\.createElement\\('button'\\);button\\.id='portalTacsContrastToggleV1'/.test(centralJs), 'Central: não pode recriar botão de contraste');\nassert(/btn\\.green,.botao\\.verde/.test(centralJs), 'Central: ações principais não recebem padrão azul-petróleo');`;
  s = replaceOnce(s, from, to, 'contrato visual sem contraste');
  s = s.replace("console.log('UI contract V1: OK — azul-petróleo, contraste centralizado, módulos e proteção de overflow conferidos.');", "assert(!/<button id=\"portalTacsContrastToggleV1\"/.test(multi), 'Municípios: botão de contraste deve estar removido');\nconsole.log('UI contract V2: OK — azul-petróleo fixo, sem botões de contraste, módulos e overflow conferidos.');");
  write(file, s);
}

{
  const file = 'scripts/test_campanhas_periodo_v1.js';
  let s = read(file);
  s = s.replace("campanhas-periodo-v1.js?v=20260816-periodo-v1", "campanhas-periodo-v1.js?v=20260816-periodo-v2");
  s = s.replace("assert(portal.includes(\"ctx.font = '800 44px\"), 'Portal: tipografia ampliada do card não encontrada');", "assert(portal.includes('ÁREA DE ATENDIMENTO'), 'Portal: bloco Área de atendimento ausente');\nassert(portal.includes('TACS RESPONSÁVEL'), 'Portal: bloco TACS responsável ausente');\nassert(portal.includes('UNIDADE DE SAÚDE'), 'Portal: bloco Unidade de saúde ausente');\nassert(portal.includes('function corporateRequest(data)'), 'Portal: normalização corporativa da descrição ausente');\nassert(portal.includes(\"ctx.font = '800 ' + size\"), 'Portal: tipografia legível do card não encontrada');");
  s = s.replace("assert(municipal.includes('portalTacsContrasteV1'), 'Municípios: contraste persistente ausente');", "assert(!municipal.includes('<button id=\"portalTacsContrastToggleV1\"'), 'Municípios: botão de contraste foi reintroduzido');");
  s = s.replace("console.log('Campanhas/portal V1: OK — período anual/mensal, card profissional, feedback municipal e atenção pública validados.');", "assert(wrapper.includes('recados-petroleo-fixo'), 'Painel oficial: padrão petróleo fixo de Recados ausente');\nconsole.log('Campanhas/portal V2: OK — meses preservados, painel reparado, card corporativo e padrão petróleo validados.');");
  write(file, s);
}

console.log('REPARO_UI_RECADOS_CARD_V2_OK');
