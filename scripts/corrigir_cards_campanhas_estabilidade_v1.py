from pathlib import Path

p = Path('campanhas-periodo-v2.js')
s = p.read_text(encoding='utf-8')

# 1) CSS exclusivo para os meses fora de agosto: remove filtros/animacoes que podem piscar no Safari.
needle = "#listaCampanhas .camp-admin-symbol svg{\n  display:block;\n  width:80px;\n  height:80px;\n  max-width:100%;\n  max-height:100%;\n  overflow:visible;\n  filter:drop-shadow(0 5px 7px rgba(7,31,47,.24));\n}\n"
replacement = needle + "#listaCampanhas .camp-admin-symbol.camp-symbol-static{\n  overflow:hidden;\n  contain:paint;\n  transform:none!important;\n  animation:none!important;\n}\n#listaCampanhas .camp-admin-symbol.camp-symbol-static svg,\n#listaCampanhas .camp-admin-symbol.camp-symbol-static svg *{\n  filter:none!important;\n  animation:none!important;\n  transform:none!important;\n}\n"
if needle not in s:
    raise SystemExit('Bloco CSS do simbolo nao encontrado')
s = s.replace(needle, replacement, 1)

# 2) Disponibiliza a chave unica da campanha no metadado do card.
needle = "    SUBTITULO:txt(m.SUBTITULO),COR_TEMA:txt(m.COR_TEMA),COR_NOME:txt(m.COR_NOME),ORIGEM:txt(m.ORIGEM)\n"
replacement = "    SUBTITULO:txt(m.SUBTITULO),CAMPANHA_CHAVE:txt(m.CAMPANHA_CHAVE),COR_TEMA:txt(m.COR_TEMA),COR_NOME:txt(m.COR_NOME),ORIGEM:txt(m.ORIGEM)\n"
if needle not in s:
    raise SystemExit('Linha de metadados nao encontrada')
s = s.replace(needle, replacement, 1)

# 3) Iconografia especifica, estatica e sem filtros para cada campanha fora de agosto.
insert_after = "function decorateCampaignSummary(box,meta){\n"
if insert_after not in s:
    raise SystemExit('Funcao decorateCampaignSummary nao encontrada')

icons = r'''function campaignSpecificIconSvg(key,theme){
  var p=campaignPalette(theme),a=p[0],b=p[1],d=p[2];
  function svg(body){return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">'+body+'</svg>'}
  var stroke=' stroke="'+d+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
  var fill=' fill="'+a+'"';
  var soft=' fill="'+b+'"';
  switch(key){
    case 'JAN_ROXO':
      return svg('<circle cx="60" cy="60" r="42" '+soft+' opacity=".72"/><path d="M42 77c5-17 10-27 18-31 8 4 13 14 18 31" fill="none"'+stroke+'/><circle cx="60" cy="39" r="10" '+fill+'/><path d="M31 87h58M60 23v12M54 29h12"'+stroke+'/>');
    case 'FEV_LARANJA':
      return svg('<path d="M60 16C46 37 35 52 35 70a25 25 0 0 0 50 0c0-18-11-33-25-54Z" '+fill+'/><circle cx="52" cy="67" r="9" fill="#fff" opacity=".78"/><circle cx="70" cy="80" r="7" '+soft+'/><path d="M47 91c9 6 19 6 28 0" fill="none"'+stroke+'/>');
    case 'MAR_ROXO':
      return svg('<path d="M45 29c-13 3-20 15-16 27-9 8-8 24 3 31 5 11 20 13 28 5 9 8 24 6 29-5 11-7 12-23 3-31 4-12-3-24-16-27-5-9-21-9-26 0Z" '+soft+'/><path d="M60 28v64M45 43c10 3 12 10 15 17M75 43c-10 3-12 10-15 17M43 72c9-4 14-2 17 5M77 72c-9-4-14-2-17 5" fill="none"'+stroke+'/>');
    case 'MAR_AZUL_MARINHO':
      return svg('<path d="M39 24c-11 4-15 15-11 26 3 8 9 10 9 20 0 17 10 27 23 27s23-10 23-27c0-10 6-12 9-20 4-11 0-22-11-26-8-3-15 2-21 8-6-6-13-11-21-8Z" '+soft+'/><path d="M43 43c8 6 10 13 7 22-3 10 1 18 10 18s13-8 10-18c-3-9-1-16 7-22" fill="none"'+stroke+'/>');
    case 'ABR_VERDE':
      return svg('<path d="M27 65c1-23 14-39 33-39s32 16 33 39" '+soft+'/><path d="M22 65h76v13H22z" '+fill+'/><path d="M43 65V47M77 65V47"'+stroke+'/><path d="M42 89l11 10 24-27" fill="none"'+stroke+'/>');
    case 'ABR_AZUL':
      return svg('<path d="M19 60c12-24 26-28 41-5 15-23 29-19 41 5-12 24-26 28-41 5-15 23-29 19-41-5Z" fill="none"'+stroke+'/><circle cx="33" cy="60" r="6" '+fill+'/><circle cx="87" cy="60" r="6" '+fill+'/>');
    case 'MAI_AMARELO':
      return svg('<rect x="38" y="15" width="44" height="90" rx="20" '+soft+'/><circle cx="60" cy="37" r="10" fill="#d84436"/><circle cx="60" cy="60" r="10" fill="#f2c94c"/><circle cx="60" cy="83" r="10" fill="#2f9e58"/><path d="M24 105h72"'+stroke+'/>');
    case 'JUN_VERMELHO':
      return svg('<path d="M60 13C43 38 31 54 31 73a29 29 0 0 0 58 0c0-19-12-35-29-60Z" '+fill+'/><path d="M60 84s-18-10-18-23c0-13 16-17 18-6 2-11 18-7 18 6 0 13-18 23-18 23Z" fill="#fff" opacity=".9"/>');
    case 'JUL_AMARELO':
      return svg('<path d="M25 60c8-24 25-35 46-31 15 3 23 13 24 27 1 15-8 26-23 28-15 2-27 11-37 22-8-13-14-28-10-46Z" '+soft+'/><path d="M43 43c12 8 25 12 40 10M43 80c12-5 24-5 37-2" fill="none"'+stroke+'/>');
    case 'JUL_VERDE':
      return svg('<circle cx="60" cy="35" r="19" '+soft+'/><path d="M39 102c2-23 10-35 21-35s19 12 21 35" '+fill+'/><path d="M47 55c4 8 4 16-1 23M73 55c-4 8-4 16 1 23" fill="none"'+stroke+'/>');
    case 'SET_AMARELO':
      return svg('<circle cx="60" cy="60" r="40" '+soft+' opacity=".72"/><path d="M60 87s-27-15-27-35c0-18 22-23 27-8 5-15 27-10 27 8 0 20-27 35-27 35Z" '+fill+'/><path d="M60 10v9M60 101v9M10 60h9M101 60h9"'+stroke+'/>');
    case 'SET_VERDE':
      return svg('<path d="M60 77s-22-13-22-30c0-15 18-20 22-7 4-13 22-8 22 7 0 17-22 30-22 30Z" '+fill+'/><path d="M20 83c13-8 23-9 40 3M100 83c-13-8-23-9-40 3M24 91c13 8 25 13 36 14M96 91c-13 8-25 13-36 14" fill="none"'+stroke+'/>');
    case 'OUT_ROSA':
      return svg('<circle cx="60" cy="47" r="29" '+soft+' opacity=".7"/><path d="M48 39c8-9 16-9 24 0M43 55c11 10 23 14 34 0" fill="none"'+stroke+'/><path d="M60 76v25M48 89h24"'+stroke+'/>');
    case 'NOV_AZUL':
      return svg('<path d="M60 16 91 27v25c0 23-12 39-31 52-19-13-31-29-31-52V27Z" '+soft+'/><circle cx="55" cy="55" r="15" fill="none"'+stroke+'/><path d="M66 44l19-19M74 25h11v11M55 70v19M46 80h18"'+stroke+'/>');
    case 'DEZ_VERMELHO':
      return svg('<path d="M45 20c-12 16-12 31 0 47l31 38M75 20c12 16 12 31 0 47l-31 38" fill="none" stroke="'+a+'" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 25c-6 9-7 17-3 25M72 25c6 9 7 17 3 25" fill="none" stroke="#fff" stroke-width="4" opacity=".28" stroke-linecap="round"/>');
    case 'DEZ_LARANJA':
      return svg('<circle cx="60" cy="55" r="23" '+fill+'/><path d="M60 12v13M60 85v13M17 55h13M90 55h13M30 25l9 9M81 76l9 9M90 25l-9 9M39 76l-9 9"'+stroke+'/><path d="M40 104c10-8 30-8 40 0" fill="none"'+stroke+'/>');
    default:
      return svg('<circle cx="60" cy="60" r="38" '+soft+'/><path d="M39 62l14 14 29-33" fill="none"'+stroke+'/>');
  }
}

'''
s = s.replace(insert_after, icons + insert_after, 1)

# 4) Decoracao: agosto permanece exatamente no caminho antigo; outros meses ganham descricao, sem data/dias e icone especifico estatico.
old = "  var theme=campaignTheme(meta,h&&h.textContent);\n  var subtitle=copy.querySelector('.camp-admin-subtitle');\n"
new = "  var theme=campaignTheme(meta,h&&h.textContent);\n  var key=txt(meta&&meta.CAMPANHA_CHAVE).toUpperCase();\n  var isAugust=/^AGO_/.test(key)||parseInt(meta&&meta.MES,10)===8;\n  var subtitle=copy.querySelector('.camp-admin-subtitle');\n"
if old not in s:
    raise SystemExit('Inicio da decoracao nao encontrado')
s = s.replace(old, new, 1)

old = "  if(period){\n    period.classList.add('camp-admin-period');\n    var startInput=box.querySelector('[name=\"inicio\"]'),daysInput=box.querySelector('[name=\"dias\"]');\n    var startValue=isoDate(startInput&&startInput.value),daysValue=txt(daysInput&&daysInput.value);\n    var bits=[];if(startValue)bits.push('Início: '+dateBrIsoV41(startValue));if(daysValue)bits.push(daysValue);\n    if(bits.length)period.textContent=bits.join(' • ');\n  }\n"
new = "  if(period){\n    period.classList.add('camp-admin-period');\n    if(isAugust){\n      var startInput=box.querySelector('[name=\"inicio\"]'),daysInput=box.querySelector('[name=\"dias\"]');\n      var startValue=isoDate(startInput&&startInput.value),daysValue=txt(daysInput&&daysInput.value);\n      var bits=[];if(startValue)bits.push('Início: '+dateBrIsoV41(startValue));if(daysValue)bits.push(daysValue);\n      if(bits.length)period.textContent=bits.join(' • ');\n      period.hidden=false;\n    }else{\n      period.hidden=true;\n    }\n  }\n"
if old not in s:
    raise SystemExit('Bloco de periodo nao encontrado')
s = s.replace(old, new, 1)

old = "  var symbol=summary.querySelector('.camp-admin-symbol');\n  if(!symbol){symbol=document.createElement('span');symbol.className='camp-admin-symbol';symbol.setAttribute('aria-hidden','true');summary.appendChild(symbol)}\n  if(symbol.dataset.theme!==theme){symbol.dataset.theme=theme;symbol.innerHTML=campaignIconSvg(theme)}\n"
new = "  var symbol=summary.querySelector('.camp-admin-symbol');\n  if(!symbol){symbol=document.createElement('span');symbol.className='camp-admin-symbol';symbol.setAttribute('aria-hidden','true');summary.appendChild(symbol)}\n  if(isAugust){\n    symbol.classList.remove('camp-symbol-static');\n    if(symbol.dataset.theme!==theme||symbol.dataset.iconKey!=='AUGUST_LEGACY'){symbol.dataset.theme=theme;symbol.dataset.iconKey='AUGUST_LEGACY';symbol.innerHTML=campaignIconSvg(theme)}\n  }else{\n    symbol.classList.add('camp-symbol-static');\n    var iconKey=key||('THEME_'+theme);\n    if(symbol.dataset.iconKey!==iconKey){symbol.dataset.theme=theme;symbol.dataset.iconKey=iconKey;symbol.innerHTML=campaignSpecificIconSvg(key,theme)}\n  }\n"
if old not in s:
    raise SystemExit('Bloco do simbolo nao encontrado')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('CAMPAIGN_CARDS_STABILITY_V1_OK')
