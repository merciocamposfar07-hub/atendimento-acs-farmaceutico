from pathlib import Path
import json
import re
from datetime import datetime, timezone


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Padrão não encontrado: {label}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label, flags=0):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'Padrão regex inválido ({count}): {label}')
    return out

# -----------------------------------------------------------------------------
# 1) Painel administrativo: Data de início contida + revisão visual V4
# -----------------------------------------------------------------------------
p = Path('campanhas-periodo-v2.js')
s = read(p)

if '/* CAMPANHAS_ADMIN_FIX_V4 */' not in s:
    css_anchor = """.camp-period-fields .validadeControle,#secaoCampanhas .validadeControle{\n  display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;\n  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;\n  box-sizing:border-box!important;font-size:1rem!important;\n}\n"""
    css_new = css_anchor + """/* CAMPANHAS_ADMIN_FIX_V4 */\n.camp-start-wrap,#secaoCampanhas .camp-start-wrap{\n  display:block!important;position:relative!important;width:100%!important;min-width:0!important;max-width:100%!important;\n  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;\n  overflow:hidden!important;contain:inline-size!important;border:2px solid #a9c0ca!important;border-radius:18px!important;\n  background:#fff!important;box-sizing:border-box!important;clip-path:inset(0 round 18px)!important;\n}\n.camp-start-wrap>input[name=\"inicio\"],#secaoCampanhas .camp-start-wrap>input[name=\"inicio\"]{\n  display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;\n  inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;\n  -webkit-min-logical-width:0!important;box-sizing:border-box!important;margin:0!important;\n  border:0!important;border-radius:0!important;background:#fff!important;overflow:hidden!important;\n}\n.camp-start-wrap:focus-within{outline:3px solid rgba(11,88,120,.17)!important;border-color:#0b5878!important}\n"""
    s = replace_once(s, css_anchor, css_new, 'CSS de validade para anexar correção de início')

    old_decorate = """function decorateBox(box,meta){\n  if(!box)return;applyCampaignTheme(box,meta);decorateCampaignSummary(box,meta);\n  if(box.querySelector('.camp-period-fields'))return;\n  var start=box.querySelector('[name=\"inicio\"]');if(!start)return;\n  var fields=makeFields(meta);\n  var label=start.previousElementSibling;\n  start.parentNode.insertBefore(fields,label||start);\n  renameContentLabel(box);\n}\n"""
    new_decorate = """function wrapCampaignStart(start){\n  if(!start||start.closest('.camp-start-wrap'))return;\n  var parent=start.parentNode;if(!parent)return;\n  var wrap=document.createElement('div');wrap.className='camp-start-wrap';\n  parent.insertBefore(wrap,start);wrap.appendChild(start);start.classList.add('camp-start-input');\n}\nfunction decorateBox(box,meta){\n  if(!box)return;applyCampaignTheme(box,meta);decorateCampaignSummary(box,meta);\n  var start=box.querySelector('[name=\"inicio\"]');if(!start)return;\n  if(!box.querySelector('.camp-period-fields')){\n    var fields=makeFields(meta);\n    var label=start.previousElementSibling;\n    start.parentNode.insertBefore(fields,label||start);\n  }\n  wrapCampaignStart(start);\n  renameContentLabel(box);\n}\n"""
    s = replace_once(s, old_decorate, new_decorate, 'decorateBox / Data de início')
write(p, s)

# -----------------------------------------------------------------------------
# 2) WhatsApp: botão abaixo de CADA campanha e card de status na cor da campanha
# -----------------------------------------------------------------------------
p = Path('recados-campanhas-whatsapp-card-v9.js')
s = read(p)

# Atualiza guarda global sem quebrar nome de arquivo histórico.
s = s.replace('if(window.PortalTacsPublicacoesWhatsAppV9)return;\nwindow.PortalTacsPublicacoesWhatsAppV9=true;',
              'if(window.PortalTacsPublicacoesWhatsAppV10)return;\nwindow.PortalTacsPublicacoesWhatsAppV10=true;')

# Acrescenta subtítulo/tema ao snapshot.
s = replace_once(s,
"""    areaName:t.areaName,\n    unitName:t.unitName,\n    tacsName:t.tacsName\n""",
"""    areaName:t.areaName,\n    unitName:t.unitName,\n    tacsName:t.tacsName,\n    subtitle:field(card,'subtitulo'),\n    theme:themeFromCard(card,field(card,'titulo'))\n""",
'read() campanha')

if 'function themeFromCard(' not in s:
    insert_before = 'function blob(canvas){'
    campaign_code = r'''function normalizeTheme(v){var n=txt(v).toLowerCase();return n.normalize?n.normalize('NFD').replace(/[\u0300-\u036f]/g,''):n}
function themeFromCard(card,title){
  var cls=card&&String(card.className||''),m=cls.match(/camp-theme-([a-z0-9-]+)/);if(m)return m[1];
  var n=normalizeTheme(title),list=['lilas','dourado','azul-marinho','laranja','amarelo','vermelho','verde','roxo','rosa','azul'];
  for(var i=0;i<list.length;i++)if(n.indexOf(list[i])!==-1)return list[i];return'azul';
}
function campaignPalette(theme){
  var p={
    lilas:['#ead9ff','#d4adf2','#32105f','#6f2ab5'],dourado:['#ffe7a3','#f6c954','#4f3400','#a66a00'],
    roxo:['#e4d4ff','#b995e8','#2e1258','#6331a8'],laranja:['#ffe0b5','#f2a24d','#512700','#b85d00'],
    'azul-marinho':['#163a69','#0b2443','#ffffff','#72a8df'],verde:['#d8f2df','#79c992','#123f23','#17723a'],
    azul:['#d8efff','#79bce8','#0b3654','#17618f'],amarelo:['#fff5b8','#f2d257','#4c3d00','#9b7900'],
    vermelho:['#ffd6d6','#e78383','#5d1717','#9e2f2f'],rosa:['#ffdbea','#ef9cbd','#641d3a','#a53e68']
  };return p[theme]||p.azul;
}
function monthYear(data){
  var m=txt(data.start).match(/^(\d{4})-(\d{2})-/),months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return m?(months[Number(m[2])-1]+' '+m[1]):'';
}
function fitFont(ctx,text,maxWidth,start,min,weight){var size=start;do{ctx.font=(weight||900)+' '+size+'px -apple-system,BlinkMacSystemFont,Arial';if(ctx.measureText(text).width<=maxWidth)return size;size-=2}while(size>min);return min}
function drawRibbon(ctx,x,y,w,h,color1,color2){
  ctx.save();var g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,color2);g.addColorStop(.5,color1);g.addColorStop(1,color2);ctx.strokeStyle=g;ctx.lineWidth=Math.max(18,w*.17);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(30,12,55,.25)';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(x+w*.34,y+h*.10);ctx.bezierCurveTo(x+w*.04,y+h*.27,x+w*.18,y+h*.43,x+w*.55,y+h*.73);ctx.lineTo(x+w*.76,y+h*.94);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w*.64,y+h*.10);ctx.bezierCurveTo(x+w*.95,y+h*.27,x+w*.80,y+h*.46,x+w*.49,y+h*.72);ctx.lineTo(x+w*.28,y+h*.94);ctx.stroke();ctx.restore();
}
function drawMotherBaby(ctx,x,y,w,h){
  ctx.save();var g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff0a5');g.addColorStop(.34,'#f7c542');g.addColorStop(1,'#9b6100');ctx.fillStyle=g;ctx.strokeStyle='#9b6100';ctx.lineWidth=5;ctx.shadowColor='rgba(91,57,0,.24)';ctx.shadowBlur=18;
  ctx.beginPath();ctx.arc(x+w*.53,y+h*.25,w*.16,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x+w*.52,y+h*.38);ctx.bezierCurveTo(x+w*.24,y+h*.45,x+w*.18,y+h*.77,x+w*.34,y+h*.91);ctx.bezierCurveTo(x+w*.55,y+h*1.02,x+w*.82,y+h*.88,x+w*.79,y+h*.60);ctx.bezierCurveTo(x+w*.76,y+h*.44,x+w*.66,y+h*.38,x+w*.52,y+h*.38);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffe8a0';ctx.beginPath();ctx.arc(x+w*.57,y+h*.61,w*.12,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#8a5500';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w*.34,y+h*.56);ctx.bezierCurveTo(x+w*.43,y+h*.72,x+w*.62,y+h*.76,x+w*.76,y+h*.66);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w*.31,y+h*.70);ctx.bezierCurveTo(x+w*.45,y+h*.87,x+w*.68,y+h*.88,x+w*.80,y+h*.74);ctx.stroke();
  ctx.fillStyle='#f1b82f';ctx.beginPath();ctx.moveTo(x+w*.86,y+h*.40);ctx.bezierCurveTo(x+w*.77,y+h*.29,x+w*.65,y+h*.43,x+w*.86,y+h*.57);ctx.bezierCurveTo(x+w*1.07,y+h*.43,x+w*.95,y+h*.29,x+w*.86,y+h*.40);ctx.fill();ctx.restore();
}
function drawCalendar(ctx,x,y,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=6;roundRect(ctx,x,y,56,54,10);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+18);ctx.lineTo(x+56,y+18);ctx.stroke();ctx.beginPath();ctx.moveTo(x+15,y-5);ctx.lineTo(x+15,y+9);ctx.moveTo(x+41,y-5);ctx.lineTo(x+41,y+9);ctx.stroke();ctx.restore()}
function drawCampaign(data){
  var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d'),p=campaignPalette(data.theme),bg=ctx.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,'#041f34');bg.addColorStop(.60,'#073a55');bg.addColorStop(1,'#0b5878');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
  ctx.globalAlpha=.10;ctx.fillStyle='#7fc9e6';ctx.beginPath();ctx.arc(990,250,300,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle='#21b9f3';ctx.lineWidth=6;roundRect(ctx,58,65,105,105,25);ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 62px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('T',93,137);ctx.font='900 38px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('TACS – TÉCNICO AGENTE',188,105);ctx.fillText('COMUNITÁRIO DE SAÚDE',188,150);
  ctx.font='900 70px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Campanhas da unidade',58,300);ctx.fillStyle='#64df9a';ctx.font='900 49px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(monthYear(data),58,372);
  var x=48,y=440,w=984,h=1040,grad=ctx.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,p[0]);grad.addColorStop(1,p[1]);ctx.fillStyle=grad;roundRect(ctx,x,y,w,h,48);ctx.fill();ctx.strokeStyle=p[3];ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle=p[3];roundRect(ctx,84,492,405,72,30);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 31px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('CAMPANHA DO MÊS',116,540);
  ctx.fillStyle='rgba(255,255,255,.90)';roundRect(ctx,790,492,190,72,35);ctx.fill();ctx.fillStyle='#08723a';ctx.font='900 32px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('✓ Ativa',825,540);
  ctx.fillStyle=p[2];var titleSize=fitFont(ctx,data.title,640,70,48,900);ctx.font='900 '+titleSize+'px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.title,86,690);
  ctx.font='900 39px -apple-system,BlinkMacSystemFont,Arial';var sy=wrap(ctx,data.subtitle,86,760,625,49,3)+20;ctx.fillStyle=p[3];ctx.fillRect(86,sy,82,8);sy+=85;
  ctx.fillStyle=p[2];ctx.font='800 40px -apple-system,BlinkMacSystemFont,Arial';wrap(ctx,data.message,86,sy,610,54,6);
  var iconX=735,iconY=690,iconW=225,iconH=330;if(data.theme==='dourado')drawMotherBaby(ctx,iconX,iconY,iconW,iconH);else drawRibbon(ctx,iconX,iconY,iconW,iconH,p[3],p[1]);
  var validity=data.validity?dateBr(data.validity):'';if(validity){drawCalendar(ctx,88,1325,p[3]);ctx.fillStyle=p[2];ctx.font='900 35px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('Válida até '+validity,166,1366)}
  ctx.fillStyle='#79e5a6';ctx.font='900 35px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText('PORTAL TACS',60,1710);ctx.fillStyle='#fff';ctx.font='700 32px -apple-system,BlinkMacSystemFont,Arial';ctx.fillText(data.unitName,60,1760);ctx.fillText(data.areaName,60,1805);return c;
}
'''
    s = replace_once(s, insert_before, campaign_code + insert_before, 'inserção do renderer de campanha WhatsApp')

s = s.replace("var data=read(card,type);button.disabled=true;if(status)status.textContent='Criando card azul-petróleo…';\n  blob(draw(data))",
              "var data=read(card,type);button.disabled=true;if(status)status.textContent=type==='campanha'?'Criando card da campanha…':'Criando card azul-petróleo…';\n  blob(type==='campanha'?drawCampaign(data):draw(data))")

old_inject = """function inject(card,type){\n  if(!card||card.querySelector('.publicacao-whatsapp-v9'))return;\n  var actions=card.querySelector('.corpo .acoes');if(!actions)return;\n  var box=document.createElement('div');box.className='publicacao-whatsapp-v9';\n  box.innerHTML='<button type=\"button\" class=\"botao publicacao-card-whatsapp\">📱 Compartilhar card azul-petróleo no WhatsApp</button><div class=\"publicacao-whatsapp-status\" aria-live=\"polite\"></div>';\n  actions.insertAdjacentElement('afterend',box);var b=box.querySelector('button'),s=box.querySelector('.publicacao-whatsapp-status');b.addEventListener('click',function(){share(card,type,b,s)});\n}\n"""
new_inject = """function inject(card,type){\n  if(!card)return;\n  var flag=type==='campanha'?'whatsappCampanhaV10':'whatsappRecadoV10';if(card.dataset[flag]==='1')return;card.dataset[flag]='1';\n  var box=document.createElement('div');box.className='publicacao-whatsapp-v10 '+(type==='campanha'?'publicacao-campanha-status':'publicacao-recado-card');\n  var label=type==='campanha'?'Postar no status do WhatsApp':'Compartilhar card azul-petróleo no WhatsApp';\n  box.innerHTML='<button type=\"button\" class=\"botao publicacao-card-whatsapp\"><span class=\"wa-mark\" aria-hidden=\"true\">◉</span> '+label+'</button><div class=\"publicacao-whatsapp-status\" aria-live=\"polite\"></div>';\n  if(type==='campanha'){card.insertAdjacentElement('afterend',box)}else{var actions=card.querySelector('.corpo .acoes');if(!actions){card.dataset[flag]='0';return}actions.insertAdjacentElement('afterend',box)}\n  var b=box.querySelector('button'),st=box.querySelector('.publicacao-whatsapp-status');b.addEventListener('click',function(){share(card,type,b,st)});\n}\n"""
s = replace_once(s, old_inject, new_inject, 'botão WhatsApp abaixo das campanhas')

old_style = """function style(){if(document.getElementById('publicacoesWhatsappV9Style'))return;var s=document.createElement('style');s.id='publicacoesWhatsappV9Style';s.textContent='.publicacao-whatsapp-v9{display:grid;gap:8px;margin-top:12px}.publicacao-card-whatsapp{background:linear-gradient(145deg,#073a55,#0b5878)!important;border:2px solid #69c7e7!important;color:#fff!important}.publicacao-whatsapp-status{min-height:20px;color:#d8eef7;font-size:.86rem;font-weight:800;line-height:1.4}';document.head.appendChild(s)}\n"""
new_style = """function style(){if(document.getElementById('publicacoesWhatsappV10Style'))return;var s=document.createElement('style');s.id='publicacoesWhatsappV10Style';s.textContent='.publicacao-whatsapp-v10{display:grid;gap:7px;min-width:0;max-width:100%}.publicacao-campanha-status{margin:-4px 0 14px}.publicacao-recado-card{margin-top:12px}.publicacao-card-whatsapp{width:100%!important;min-height:58px!important;background:linear-gradient(145deg,#073a55,#0b5878)!important;border:3px solid #69c7e7!important;border-radius:22px!important;color:#fff!important;font-weight:900!important;box-shadow:0 7px 18px rgba(7,58,85,.20)!important}.wa-mark{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:5px;border:2px solid currentColor;border-radius:50%;font-size:12px;line-height:1}.publicacao-whatsapp-status{min-height:0;color:#536b78;font-size:.84rem;font-weight:800;line-height:1.35}.publicacao-whatsapp-status:empty{display:none}';document.head.appendChild(s)}\n"""
s = replace_once(s, old_style, new_style, 'estilo botão WhatsApp V10')
write(p, s)

# -----------------------------------------------------------------------------
# 3) Portal do morador: cards corrigidos, SVG padronizado, sem emoji
# -----------------------------------------------------------------------------
p = Path('portal-controle-integral.js')
s = read(p)

new_style = r'''function style(){if(document.getElementById('portal-integral-style'))return;var s=document.createElement('style');s.id='portal-integral-style';s.textContent='/* CAMPANHAS_PUBLICAS_CARDS_V4 */.integral-area{display:grid;gap:14px;margin-bottom:20px}.integral-balloon{padding:20px;border:2px solid #0e6b98;border-radius:22px;background:linear-gradient(145deg,#052a43,#0a476b);color:#fff;box-shadow:0 14px 30px rgba(4,44,70,.2)}.integral-balloon small{display:block;color:#79e5a6;font-size:14px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.integral-balloon strong{display:block;margin-top:8px;font-size:clamp(25px,5vw,34px);line-height:1.15}.integral-balloon p{margin:10px 0 0;color:#fff;font-size:18px;line-height:1.55;white-space:pre-line}.campaign-group{display:grid;gap:16px;padding:20px;border:2px solid #69c7e7;border-radius:24px;background:linear-gradient(145deg,#052a43,#0a476b);color:#fff}.campaign-group-head h2{margin:0;font-size:clamp(29px,6vw,42px);line-height:1.08}.campaign-group-head p{margin:6px 0 0;color:#70e39f;font-size:20px;font-weight:900}.campaign-card{--c1:#edf4f7;--c2:#d5e4ea;--ct:#16384a;--cb:#7aa4b7;position:relative;overflow:hidden;min-height:390px;padding:22px;border:3px solid var(--cb);border-radius:25px;background:linear-gradient(135deg,var(--c1),var(--c2));color:var(--ct);box-shadow:0 12px 26px rgba(0,0,0,.16)}.campaign-card.integral-campaign{border-left-width:3px}.campaign-theme-lilas{--c1:#ead9ff;--c2:#d4adf2;--ct:#32105f;--cb:#9258c6}.campaign-theme-dourado{--c1:#ffe7a3;--c2:#f6c954;--ct:#4f3400;--cb:#c28a13}.campaign-theme-roxo{--c1:#e4d4ff;--c2:#b995e8;--ct:#2e1258;--cb:#7650ae}.campaign-theme-laranja{--c1:#ffe0b5;--c2:#f2a24d;--ct:#512700;--cb:#c46b12}.campaign-theme-azul-marinho{--c1:#163a69;--c2:#0b2443;--ct:#fff;--cb:#72a8df}.campaign-theme-verde{--c1:#d8f2df;--c2:#79c992;--ct:#123f23;--cb:#39945b}.campaign-theme-azul{--c1:#d8efff;--c2:#79bce8;--ct:#0b3654;--cb:#2e88bf}.campaign-theme-amarelo{--c1:#fff5b8;--c2:#f2d257;--ct:#4c3d00;--cb:#c4a20f}.campaign-theme-vermelho{--c1:#ffd6d6;--c2:#e78383;--ct:#5d1717;--cb:#b33b3b}.campaign-theme-rosa{--c1:#ffdbea;--c2:#ef9cbd;--ct:#641d3a;--cb:#bd5b82}.campaign-top{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px}.campaign-label{display:inline-flex!important;width:max-content;max-width:68%;padding:8px 12px;border-radius:11px;background:rgba(5,42,67,.86);color:#fff!important;font-size:13px!important;font-weight:950!important}.campaign-status{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.88);color:#08723a;font-size:15px;font-weight:950;white-space:nowrap}.campaign-title{position:relative;z-index:3;display:block;max-width:70%;margin-top:19px!important;color:var(--ct);font-size:clamp(32px,6.4vw,46px)!important;font-weight:950!important;line-height:1.04!important;letter-spacing:-.035em}.campaign-subtitle{position:relative;z-index:3;max-width:70%;margin:9px 0 0;color:var(--ct);font-size:clamp(20px,4.2vw,26px);font-weight:900;line-height:1.27}.campaign-description{position:relative;z-index:3;width:65%;max-width:65%;margin:22px 0 0!important;padding-top:18px;border-top:4px solid var(--cb);color:var(--ct)!important;font-size:clamp(21px,4.5vw,25px)!important;font-weight:820!important;line-height:1.46!important}.campaign-meta{position:absolute;left:22px;bottom:22px;z-index:3;display:flex;align-items:center;gap:9px;max-width:65%;color:var(--ct);font-size:17px;font-weight:900;opacity:1}.campaign-calendar{display:inline-grid;place-items:center;width:31px;height:31px;flex:0 0 auto}.campaign-calendar svg{display:block;width:100%;height:100%}.campaign-art{position:absolute;right:18px;bottom:48px;z-index:2;width:128px;height:158px;display:grid;place-items:center;pointer-events:none}.campaign-art svg{display:block;width:100%;height:100%;filter:drop-shadow(0 8px 8px rgba(45,24,6,.22))}.integral-days{display:grid;grid-template-columns:1fr;gap:12px;margin-top:16px}.integral-day{width:100%;padding:18px 17px;border:2px solid #9bb4c1;border-radius:16px;background:#fff;color:#102b3c;text-align:left}.integral-day strong,.integral-day span,.integral-day b{display:block}.integral-day strong{font-size:22px}.integral-day span{margin-top:6px;color:#415b69;font-size:16px}.integral-day b{margin-top:8px;color:#06763a;font-size:18px}@media(max-width:520px){.campaign-card{min-height:410px;padding:18px 17px}.campaign-label{font-size:12px!important;padding:7px 9px}.campaign-status{font-size:14px;padding:7px 10px}.campaign-title{max-width:72%;font-size:clamp(30px,8vw,39px)!important}.campaign-subtitle{max-width:72%;font-size:clamp(19px,5vw,23px)}.campaign-description{width:68%;max-width:68%;font-size:clamp(20px,5.2vw,23px)!important}.campaign-meta{left:17px;bottom:18px;max-width:68%;font-size:15px}.campaign-art{right:9px;bottom:54px;width:104px;height:132px}}';document.head.appendChild(s)}'''
s = regex_once(s, r'function style\(\)\{.*?\}\nfunction jsonp', new_style + '\nfunction jsonp', 'style público de campanhas', re.S)

helper = r'''function campaignIconSvg(theme){
  if(theme==='dourado')return '<svg viewBox="0 0 100 120" aria-hidden="true" focusable="false"><defs><linearGradient id="publicGoldV4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a5"/><stop offset=".36" stop-color="#f5bf36"/><stop offset="1" stop-color="#9b6100"/></linearGradient></defs><circle cx="52" cy="26" r="14" fill="url(#publicGoldV4)"/><path d="M50 40c-18 5-27 23-25 43 2 21 16 31 31 31 19 0 32-13 31-32-1-17-11-33-25-40-4-2-8-3-12-2Z" fill="url(#publicGoldV4)"/><circle cx="58" cy="72" r="11" fill="#ffe9a0" stroke="#a66a00" stroke-width="2"/><path d="M34 66c8 13 20 20 39 17M31 80c12 14 27 20 45 13" fill="none" stroke="#875500" stroke-width="6" stroke-linecap="round"/><path d="M83 49c5-8 17-2 11 7-3 6-11 11-11 11s-8-5-11-11c-6-9 6-15 11-7Z" fill="#f3b72f" stroke="#9b6100" stroke-width="2"/></svg>';
  var colors={lilas:['#6d28d9','#b87cff'],roxo:['#6331a8','#b892ee'],laranja:['#b85d00','#ffb75b'],'azul-marinho':['#173b69','#72a8df'],verde:['#17723a','#79c992'],azul:['#17618f','#79bce8'],amarelo:['#9b7900','#f3d95e'],vermelho:['#9e2f2f','#e98686'],rosa:['#a53e68','#f2a3c2']},p=colors[theme]||colors.azul,id='publicRibbonV4'+theme.replace(/[^a-z0-9]/g,'');
  return '<svg viewBox="0 0 100 120" aria-hidden="true" focusable="false"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p[1]+'"/><stop offset=".55" stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient></defs><path d="M37 12c-10 11-12 26-6 40 5 12 13 23 23 34L38 111l15 8 15-26 15 26 15-8-20-32c10-12 16-23 16-35 0-18-11-31-29-31-13 0-23 6-28 16Zm34 14c8 0 14 7 14 16 0 8-5 16-13 26L51 37c5-7 11-11 20-11Z" fill="url(#'+id+')" stroke="'+p[0]+'" stroke-width="2" stroke-linejoin="round"/></svg>';
}
function campaignCalendarSvg(){return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M3 12h26M10 3v7M22 3v7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M9 17h3M15 17h3M21 17h3M9 22h3M15 22h3M21 22h3" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'}
'''
s = replace_once(s, 'function monthLabel(){', helper + 'function monthLabel(){', 'SVGs públicos de campanha')

old_render = re.search(r'function renderCampaign\(group,item\)\{.*?\}\nfunction renderAlerts', s, re.S)
if not old_render:
    raise SystemExit('renderCampaign público não encontrado')
new_render = r'''function renderCampaign(group,item){var theme=campaignTheme(item),c=document.createElement('article');c.className='integral-balloon integral-campaign campaign-card campaign-theme-'+theme;c.dataset.campaignTheme=theme;var meta='';if(item.validity)meta='<div class="campaign-meta"><span class="campaign-calendar">'+campaignCalendarSvg()+'</span><span>Válida até '+esc(dateBr(item.validity))+'</span></div>';else if(item.time)meta='<div class="campaign-meta"><span>Horário: '+esc(item.time)+'</span></div>';c.innerHTML='<div class="campaign-top"><small class="campaign-label">CAMPANHA DO MÊS</small><span class="campaign-status">✓ Ativa</span></div><strong class="campaign-title">'+esc(item.title||'Campanha da Unidade')+'</strong>'+(item.subtitle?'<div class="campaign-subtitle">'+esc(item.subtitle)+'</div>':'')+'<p class="campaign-description">'+esc(item.message||'')+'</p>'+meta+'<div class="campaign-art" aria-hidden="true">'+campaignIconSvg(theme)+'</div>';group.appendChild(c)}
function renderAlerts'''
s = s[:old_render.start()] + new_render + s[old_render.end():]
s = s.replace('🤱','')
write(p, s)

# -----------------------------------------------------------------------------
# 4) Cache/revisões: painel, Central, Portal/PWA
# -----------------------------------------------------------------------------
p = Path('painel-oficial-recados-campanhas.html')
s = read(p)
s = re.sub(r'campanhas-periodo-v2\.js\?v=[A-Za-z0-9._-]+', 'campanhas-periodo-v2.js?v=20260817-campanhas-admin-ui-v4', s)
s = re.sub(r'recados-campanhas-whatsapp-card-v9\.js\?v=[A-Za-z0-9._-]+', 'recados-campanhas-whatsapp-card-v9.js?v=20260817-publicacoes-v10', s)
if 'campanhas-admin-ui-v4' not in s or 'publicacoes-v10' not in s:
    raise SystemExit('Revisões do painel não foram atualizadas')
write(p, s)

p = Path('central-administrativa-tacs.js')
s = read(p)
s = re.sub(r"painel-oficial-recados-campanhas\.html\?area='\+area\+access\+'[&?]v=[A-Za-z0-9._-]+", "painel-oficial-recados-campanhas.html?area='+area+access+'&v=20260817-campanhas-reparos-v4", s)
# fallback exato para o formato atual
s = s.replace("painel-oficial-recados-campanhas.html?area='+area+access+'&v=20260816-campanhas-admin-ui-v3", "painel-oficial-recados-campanhas.html?area='+area+access+'&v=20260817-campanhas-reparos-v4")
if '20260817-campanhas-reparos-v4' not in s:
    raise SystemExit('Revisão do módulo Recados/Campanhas na Central não foi atualizada')
write(p, s)

p = Path('central-administrativa-tacs.html')
s = read(p)
s = re.sub(r'central-administrativa-tacs\.js\?v=[A-Za-z0-9._-]+', 'central-administrativa-tacs.js?v=20260816-campanhas-reparos-v4', s)
write(p, s)

p = Path('index.html')
s = read(p)
s = re.sub(r'portal-controle-integral\.js\?v=[A-Za-z0-9._-]+', 'portal-controle-integral.js?v=20260817-campanhas-cards-v4', s)
write(p, s)

p = Path('portal-version.json')
data = json.loads(read(p))
data['version'] = '20260817-campanhas-reparos-v4'
data['releasedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
data['scope'] = 'Portal TACS • cards de campanhas corrigidos, status WhatsApp e datas contidas'
write(p, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# -----------------------------------------------------------------------------
# 5) Push: reenvio único/idempotente após a correção visual
# -----------------------------------------------------------------------------
p = Path('apps-script/ZZZZ_35_CampanhasAutomaticasV1.gs')
s = read(p)
s = s.replace("VERSAO:'1.0.0',", "VERSAO:'1.1.0',", 1)
s = s.replace("TOMB_PREFIX:'TACS_CAMP_AUTO_REMOVIDA_V1_',", "TOMB_PREFIX:'TACS_CAMP_AUTO_REMOVIDA_V1_',\n  RENOTIF_REVISAO:'CARDS_VISUAIS_V4_20260817',\n  RENOTIF_PREFIX:'TACS_CAMP_AUTO_RENOTIF_V1_',", 1)

pattern = r'function campanhasAutomaticasV1NotificarArea_\(areaId\)\{.*?\n\}\n\nfunction campanhasAutomaticasV1MarcarNotificada_'
replacement = r'''function campanhasAutomaticasV1NotificarArea_(areaId){
  if(typeof notificacoesAreaV1Enviar_!=='function')return {enviadas:0,pendentes:0,erros:1,detalhes:['Módulo de notificações indisponível.']};
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  if(!appId||!apiKey)return {enviadas:0,pendentes:0,erros:1,detalhes:['Credenciais Push não configuradas.']};
  var areaInfo=null;
  try{if(typeof tacsTerritorioV1EncontrarArea_==='function')areaInfo=tacsTerritorioV1EncontrarArea_(areaId);}catch(erroArea){}
  var contexto={areaId:areaId,areaNome:campanhasAutomaticasV1Texto_(areaInfo&&areaInfo.areaNome)||areaId};
  var acesso={perfil:'SISTEMA',operadorId:'SISTEMA_CAMPANHAS'};
  var hoje=Utilities.formatDate(new Date(),TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'yyyyMMdd');
  var resumo={enviadas:0,pendentes:0,erros:0,detalhes:[]};
  campanhasAutomaticasV1AtivasAgora_(areaId).forEach(function(item){
    var id=campanhasAutomaticasV1Texto_(item.ID),notificado=campanhasAutomaticasV1Texto_(item.NOTIFICADO_EM);
    var reKey=TACS_CAMPANHAS_AUTOMATICAS_V1.RENOTIF_PREFIX+TACS_CAMPANHAS_AUTOMATICAS_V1.RENOTIF_REVISAO+'_'+id;
    var reenviar=Boolean(notificado)&&!props.getProperty(reKey);
    if(notificado&&!reenviar)return;
    try{
      if(!reenviar){
        var anterior=typeof notificacoesAreaV1UltimoEnvio_==='function'?notificacoesAreaV1UltimoEnvio_(areaId,'CAMPANHA',id):null;
        if(anterior&&anterior.onesignalId){campanhasAutomaticasV1MarcarNotificada_(areaId,id,'AUDITADO '+anterior.registradoEm);return;}
      }
      var subtitulo=campanhasAutomaticasV1Texto_(item.SUBTITULO),mensagem=campanhasAutomaticasV1Texto_(item.MENSAGEM);
      var evento=((reenviar?'REVISAO_':'AUTO_')+id+'_'+hoje+(reenviar?'_'+TACS_CAMPANHAS_AUTOMATICAS_V1.RENOTIF_REVISAO:'')).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,160);
      var resultado=notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,{
        evento:evento,tipo:'CAMPANHA',referencia:id,titulo:campanhasAutomaticasV1Texto_(item.TITULO).slice(0,120),
        mensagem:(subtitulo+(subtitulo&&mensagem?' — ':'')+mensagem).slice(0,1000),
        meta:'origem=CALENDARIO_AUTOMATICO;inicio='+campanhasAutomaticasV1Texto_(item.INICIO)+';validade='+campanhasAutomaticasV1Texto_(item.VALIDADE)+';revisao='+TACS_CAMPANHAS_AUTOMATICAS_V1.RENOTIF_REVISAO,
        quantidadeAreas:notificacoesAreaV1QuantidadeAreas_()
      });
      if(resultado&&resultado.ok===true&&resultado.push===true){
        var carimbo=Utilities.formatDate(new Date(),TACS_CAMPANHAS_AUTOMATICAS_V1.FUSO,'dd/MM/yyyy HH:mm:ss');
        if(reenviar)props.setProperty(reKey,carimbo);else campanhasAutomaticasV1MarcarNotificada_(areaId,id,carimbo);
        resumo.enviadas++;
      }else{
        resumo.pendentes++;
        resumo.detalhes.push(id+': '+campanhasAutomaticasV1Texto_(resultado&&resultado.message||'aguardando novo envio'));
      }
    }catch(erro){resumo.erros++;resumo.detalhes.push(id+': '+campanhasAutomaticasV1Erro_(erro));}
  });
  return resumo;
}

function campanhasAutomaticasV1MarcarNotificada_'''
s = regex_once(s, pattern, replacement, 'função de reenvio Push', re.S)
write(p, s)

# Aciona implantação Apps Script existente.
write('.github/apps-script-release-request', 'campanhas-reparos-v4-20260817\n')

print('CAMPANHAS_REPAROS_V4_OK')
