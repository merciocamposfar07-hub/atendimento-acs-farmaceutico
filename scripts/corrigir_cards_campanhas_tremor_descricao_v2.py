from pathlib import Path

p=Path('campanhas-periodo-v2.js')
s=p.read_text(encoding='utf-8')

old="""function dateBrIsoV41(v){var m=txt(v).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}\n/* CAMPANHAS_ADMIN_V5 */"""
new="""function dateBrIsoV41(v){var m=txt(v).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:txt(v)}
function campaignCatalogByTitle(title){
  var n=txt(title).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ').trim();
  var map={
    'janeiro roxo':{key:'JAN_ROXO',subtitle:'Combate e prevenção da hanseníase'},
    'fevereiro laranja':{key:'FEV_LARANJA',subtitle:'Conscientização e combate à leucemia'},
    'março roxo':{key:'MAR_ROXO',subtitle:'Conscientização sobre a epilepsia'},
    'marco roxo':{key:'MAR_ROXO',subtitle:'Conscientização sobre a epilepsia'},
    'março azul-marinho':{key:'MAR_AZUL_MARINHO',subtitle:'Prevenção do câncer colorretal'},
    'marco azul-marinho':{key:'MAR_AZUL_MARINHO',subtitle:'Prevenção do câncer colorretal'},
    'abril verde':{key:'ABR_VERDE',subtitle:'Segurança no trabalho'},
    'abril azul':{key:'ABR_AZUL',subtitle:'Conscientização sobre o autismo'},
    'maio amarelo':{key:'MAI_AMARELO',subtitle:'Prevenção e segurança no trânsito'},
    'junho vermelho':{key:'JUN_VERMELHO',subtitle:'Incentivo à doação de sangue'},
    'julho amarelo':{key:'JUL_AMARELO',subtitle:'Combate às hepatites virais'},
    'julho verde':{key:'JUL_VERDE',subtitle:'Prevenção do câncer de cabeça e pescoço'},
    'agosto lilás':{key:'AGO_LILAS',subtitle:'Fim da violência contra a mulher'},
    'agosto lilas':{key:'AGO_LILAS',subtitle:'Fim da violência contra a mulher'},
    'agosto dourado':{key:'AGO_DOURADO',subtitle:'Incentivo ao aleitamento materno'},
    'setembro amarelo':{key:'SET_AMARELO',subtitle:'Prevenção ao suicídio'},
    'setembro verde':{key:'SET_VERDE',subtitle:'Incentivo à doação de órgãos'},
    'outubro rosa':{key:'OUT_ROSA',subtitle:'Prevenção e diagnóstico precoce do câncer de mama'},
    'novembro azul':{key:'NOV_AZUL',subtitle:'Saúde do homem e prevenção do câncer de próstata'},
    'dezembro vermelho':{key:'DEZ_VERMELHO',subtitle:'Luta contra a AIDS e as ISTs'},
    'dezembro laranja':{key:'DEZ_LARANJA',subtitle:'Prevenção do câncer de pele'}
  };
  return map[n]||{key:'',subtitle:''};
}
/* CAMPANHAS_ADMIN_V5 */"""
if old not in s:
    raise SystemExit('âncora catálogo não encontrada')
s=s.replace(old,new,1)

old="""  var theme=campaignTheme(meta,h&&h.textContent);\n  var key=txt(meta&&meta.CAMPANHA_CHAVE).toUpperCase();\n  var isAugust=/^AGO_/.test(key)||parseInt(meta&&meta.MES,10)===8;\n  var subtitle=copy.querySelector('.camp-admin-subtitle');\n  if(!subtitle){subtitle=document.createElement('div');subtitle.className='camp-admin-subtitle';if(h)h.insertAdjacentElement('afterend',subtitle);else copy.insertBefore(subtitle,copy.firstChild)}\n  subtitle.textContent=txt(meta&&meta.SUBTITULO);subtitle.hidden=!subtitle.textContent;"""
new="""  var theme=campaignTheme(meta,h&&h.textContent);
  var catalog=campaignCatalogByTitle(h&&h.textContent);
  var key=txt(meta&&meta.CAMPANHA_CHAVE).toUpperCase()||catalog.key;
  var isAugust=/^AGO_/.test(key)||parseInt(meta&&meta.MES,10)===8;
  var subtitle=copy.querySelector('.camp-admin-subtitle');
  if(!subtitle){subtitle=document.createElement('div');subtitle.className='camp-admin-subtitle';if(h)h.insertAdjacentElement('afterend',subtitle);else copy.insertBefore(subtitle,copy.firstChild)}
  var subtitleValue=isAugust?txt(meta&&meta.SUBTITULO):txt(meta&&meta.SUBTITULO)||catalog.subtitle;
  subtitle.textContent=subtitleValue;subtitle.hidden=!subtitleValue;"""
if old not in s:
    raise SystemExit('âncora resumo não encontrada')
s=s.replace(old,new,1)

old="""    if(changedList){scheduleDecorate();fetchMetadata(700)}"""
new="""    if(changedList){decorate();fetchMetadata(700)}"""
if old not in s:
    raise SystemExit('âncora observer não encontrada')
s=s.replace(old,new,1)

# Não alterar o tratamento visual de agosto. Apenas impedir o flash de cards de outros meses
# entre a recriação da lista e a aplicação do filtro mensal.
marker="""#listaCampanhas .camp-admin-symbol svg{\n  display:block;"""
insert="""#listaCampanhas .camp-admin-symbol.camp-symbol-static svg{\n  animation:none!important;\n  transition:none!important;\n  transform:none!important;\n}\n#listaCampanhas .camp-admin-symbol.camp-symbol-static{\n  animation:none!important;\n  transition:none!important;\n  transform:none!important;\n  will-change:auto!important;\n}\n#listaCampanhas .camp-admin-symbol svg{\n  display:block;"""
if marker not in s:
    raise SystemExit('âncora css não encontrada')
s=s.replace(marker,insert,1)

p.write_text(s,encoding='utf-8')
print('OK: tremor corrigido; descrições e símbolos derivados do catálogo já existente; agosto preservado.')
