from pathlib import Path
import re, time

ROOT=Path(__file__).resolve().parents[1]

def load(path):
    p=ROOT/path
    return p,p.read_text(encoding='utf-8')

def save(p,s): p.write_text(s,encoding='utf-8')

def once(s,old,new,label):
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: esperado 1, encontrado {n}')
    return s.replace(old,new,1)

def sub1(s,pattern,repl,label,flags=0):
    out,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: esperado 1, encontrado {n}')
    return out

# 1. Painel Recados e Campanhas: horário editável, preserva lógica existente, restaura card WhatsApp.
p,s=load('painel-oficial-recados-campanhas.html')
s=once(s,
'<label>Prioridade</label><select class="campo" name="prioridade"><option>INFORMATIVO</option><option>IMPORTANTE</option><option>URGENTE</option></select><label>Validade</label>',
'<label>Prioridade</label><select class="campo" name="prioridade"><option>INFORMATIVO</option><option>IMPORTANTE</option><option>URGENTE</option></select><label>Horário</label><input class="campo" name="horario" placeholder="Ex.: 08:00 às 16:00"><label>Validade</label>',
'novo recado horario')
s=once(s,
'<label>Mensagem</label><textarea class="campo" name="mensagem"></textarea><label>Data de início</label>',
'<label>Mensagem</label><textarea class="campo" name="mensagem"></textarea><label>Horário</label><input class="campo" name="horario" placeholder="Ex.: 08:00 às 16:00"><label>Data de início</label>',
'nova campanha horario')
s=once(s,
"function payloadRecado(c,id){return Object.assign(sessao(),{id:id||'',titulo:c.querySelector('[name=\"titulo\"]').value.trim(),mensagem:c.querySelector('[name=\"mensagem\"]').value.trim(),prioridade:c.querySelector('[name=\"prioridade\"]').value,validade:c.querySelector('[name=\"validade\"]').value,ativo:c.querySelector('[name=\"ativo\"]').checked?'true':'false'})}",
"function payloadRecado(c,id){return Object.assign(sessao(),{id:id||'',titulo:c.querySelector('[name=\"titulo\"]').value.trim(),mensagem:c.querySelector('[name=\"mensagem\"]').value.trim(),prioridade:c.querySelector('[name=\"prioridade\"]').value,horario:(c.querySelector('[name=\"horario\"]')||{}).value?c.querySelector('[name=\"horario\"]').value.trim():'',validade:c.querySelector('[name=\"validade\"]').value,ativo:c.querySelector('[name=\"ativo\"]').checked?'true':'false'})}",
'payload recado horario')
s=once(s,
"function payloadCampanha(c,id){return Object.assign(sessao(),{id:id||'',titulo:c.querySelector('[name=\"titulo\"]').value.trim(),mensagem:c.querySelector('[name=\"mensagem\"]').value.trim(),inicio:c.querySelector('[name=\"inicio\"]').value,dias:c.querySelector('[name=\"dias\"]').value.trim(),ativo:c.querySelector('[name=\"ativo\"]').checked?'true':'false'})}",
"function payloadCampanha(c,id){return Object.assign(sessao(),{id:id||'',titulo:c.querySelector('[name=\"titulo\"]').value.trim(),mensagem:c.querySelector('[name=\"mensagem\"]').value.trim(),horario:(c.querySelector('[name=\"horario\"]')||{}).value?c.querySelector('[name=\"horario\"]').value.trim():'',inicio:c.querySelector('[name=\"inicio\"]').value,dias:c.querySelector('[name=\"dias\"]').value.trim(),ativo:c.querySelector('[name=\"ativo\"]').checked?'true':'false'})}",
'payload campanha horario')
s=s.replace("&&dataInput(a.VALIDADE)===dataInput(p.validade)&&bool(a.ATIVO)","&&textoComparavel(a.HORARIO)===textoComparavel(p.horario)&&dataInput(a.VALIDADE)===dataInput(p.validade)&&bool(a.ATIVO)")
s=s.replace("&&textoComparavel(a.DIAS)===textoComparavel(p.dias)&&bool(a.ATIVO)","&&textoComparavel(a.HORARIO)===textoComparavel(p.horario)&&textoComparavel(a.DIAS)===textoComparavel(p.dias)&&bool(a.ATIVO)")
# Campos nas edições existentes, usando substituições únicas dentro das strings de render.
s=once(s,
"<label>Prioridade</label><select class=\"campo\" name=\"prioridade\"><option>INFORMATIVO</option><option>IMPORTANTE</option><option>URGENTE</option></select><label>Validade</label>",
"<label>Prioridade</label><select class=\"campo\" name=\"prioridade\"><option>INFORMATIVO</option><option>IMPORTANTE</option><option>URGENTE</option></select><label>Horário</label><input class=\"campo\" name=\"horario\" value=\"'+esc(x.HORARIO||'')+'\" placeholder=\"Ex.: 08:00 às 16:00\"><label>Validade</label>",
'render recado horario')
s=once(s,
"<label>Mensagem</label><textarea class=\"campo\" name=\"mensagem\">'+esc(x.MENSAGEM)+'</textarea><label>Data de início</label>",
"<label>Mensagem</label><textarea class=\"campo\" name=\"mensagem\">'+esc(x.MENSAGEM)+'</textarea><label>Horário</label><input class=\"campo\" name=\"horario\" value=\"'+esc(x.HORARIO||'')+'\" placeholder=\"Ex.: 08:00 às 16:00\"><label>Data de início</label>",
'render campanha horario')
s=s.replace("?'prioridade='+txt(p.prioridade)+';validade='+txt(p.validade):'inicio='+txt(p.inicio)+';dias='+txt(p.dias)","?'prioridade='+txt(p.prioridade)+';horario='+txt(p.horario)+';validade='+txt(p.validade):'inicio='+txt(p.inicio)+';horario='+txt(p.horario)+';dias='+txt(p.dias)")
# Proteção Safari para datas no painel.
s=once(s,'@media(max-width:649px){.contrasteBotao{width:100%}}','input[type="date"].campo,.validadeControle{display:block;width:100%!important;min-width:0!important;max-width:100%!important;inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;box-sizing:border-box!important} .corpo,.corpo>*{min-width:0}\n@media(max-width:649px){.contrasteBotao{width:100%}}','css datas recados')
# Carregamento do compartilhador atual, sem document.write.
if 'recados-campanhas-whatsapp-card-v9.js' not in s:
    s=s.replace('</body>','<script src="/atendimento-acs-farmaceutico/recados-campanhas-whatsapp-card-v9.js?v=20260816-publicacoes-v9"></script>\n</body>')
save(p,s)

# 2. Campanhas por período: data não extravasa no Safari.
p,s=load('campanhas-periodo-v2.js')
s=once(s,
"'.camp-period-fields{margin:12px 0;border:2px solid #86b9ca;border-radius:17px;padding:13px;background:#edf6f9}.camp-period-fields .period-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.camp-period-fields label{color:#073a55}',",
"'.camp-period-fields{margin:12px 0;border:2px solid #86b9ca;border-radius:17px;padding:13px;background:#edf6f9;min-width:0;max-width:100%;overflow:hidden}.camp-period-fields .period-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;min-width:0}.camp-period-fields .period-grid>div{min-width:0}.camp-period-fields label{color:#073a55}.camp-period-fields input[type=\"date\"]{display:block;width:100%!important;min-width:0!important;max-width:100%!important;inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;box-sizing:border-box!important}',",
'css validade campanha')
save(p,s)

# 3. Agendas: mantém horário de atendimento livre e torna horário de encerramento automático editável.
p,s=load('painel-oficial-agendas-vagas.html')
s=once(s,'@media(max-width:640px){.resumo{grid-template-columns:1fr 1fr}','input[type="date"].campo,input[type="time"].campo{display:block;width:100%!important;min-width:0!important;max-width:100%!important;inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;box-sizing:border-box!important}.corpo,.corpo>*{min-width:0}\n@media(max-width:640px){.resumo{grid-template-columns:1fr 1fr}','css datas agenda')
s=once(s,
"<label class=\"check\"><input name=\"encerra12h\" type=\"checkbox\" '+(bool(a.ENCERRA_12H)?'checked':'')+'> Encerrar às 12h</label>",
"<label>Encerrar automaticamente às</label><input class=\"campo\" name=\"encerraHorario\" type=\"time\" value=\"'+esc(txt(a.ENCERRA_HORARIO)||(bool(a.ENCERRA_12H)?'12:00':''))+'\"><div class=\"sub\">Deixe vazio para não encerrar automaticamente.</div>",
'ui encerra horario')
s=once(s,"encerra12h:check(c,'encerra12h'),","encerraHorario:campo(c,'encerraHorario'),encerra12h:campo(c,'encerraHorario')==='12:00'?'true':'false',",'payload encerra horario')
s=s.replace("&&bool(a.ENCERRA_12H)===bool(p.encerra12h)&&bool(a.DIA_EXTRA)","&&txt(a.ENCERRA_HORARIO||((bool(a.ENCERRA_12H))?'12:00':''))===txt(p.encerraHorario)&&bool(a.DIA_EXTRA)")
s=s.replace("encerra12h:bool(r.ENCERRA_12H)?'true':'false',vagasComuns", "encerraHorario:txt(r.ENCERRA_HORARIO)||((bool(r.ENCERRA_12H))?'12:00':''),encerra12h:(txt(r.ENCERRA_HORARIO)||((bool(r.ENCERRA_12H))?'12:00':''))==='12:00'?'true':'false',vagasComuns")
save(p,s)

# 4. Backend publicações: persiste HORARIO sem tornar a coluna antiga obrigatória.
p,s=load('apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs')
s=once(s,
"var registro={ID:id,AREA_ID:contexto.areaId,TITULO:titulo,MENSAGEM:mensagem,ATIVO:publicacoesTerritoriaisV1Booleano_(p.ativo)};",
"var registro={ID:id,AREA_ID:contexto.areaId,TITULO:titulo,MENSAGEM:mensagem,HORARIO:publicacoesTerritoriaisV1Texto_(p.horario).slice(0,160),ATIVO:publicacoesTerritoriaisV1Booleano_(p.ativo)};",
'backend publicacoes horario')
# Adiciona HORARIO como coluna opcional em qualquer uma das duas abas.
s=sub1(s,r"(if\(headers\.indexOf\('AREA_ID'\)===-1\)\{[^\n]+\})",r"\1\n  if(headers.indexOf('HORARIO')===-1){sheet.getRange(1,lastCol+1).setValue('HORARIO');headers.push('HORARIO');lastCol++;}",'coluna horario publicacoes')
save(p,s)

# 5. Campanhas: horário persistente junto ao período/validade.
p,s=load('apps-script/ZZZZ_34_CampanhasPeriodoV1.gs')
s=once(s,"COLUNAS:['ANO','MES','VALIDADE','MUNICIPIO_ID'","COLUNAS:['ANO','MES','VALIDADE','HORARIO','MUNICIPIO_ID'",'coluna horario campanha')
s=once(s,"VALIDADE:validade,\n      MUNICIPIO_ID:","VALIDADE:validade,\n      HORARIO:publicacoesTerritoriaisV1Texto_(p.horario).slice(0,160),\n      MUNICIPIO_ID:",'registro horario campanha')
save(p,s)

# 6. Conteúdo público: recado e campanha respeitam validade e expõem horário.
p,s=load('apps-script/ZZ_11_PublicoConteudoPortalV1.gs')
s=once(s,
"var prioridade = publicoConteudoPortalV1NormalizarPrioridade_(",
"var horario = publicoConteudoPortalV1Texto_(publicoConteudoPortalV1Campo_(linha, ['HORARIO', 'HORARIO_EXIBICAO']));\n\n    var prioridade = publicoConteudoPortalV1NormalizarPrioridade_(",
'ler horario recado publico')
s=once(s,"prioridade: prioridade,\n      validade: validade","prioridade: prioridade,\n      horario: horario,\n      validade: validade",'retorno horario recado')
s=once(s,
"if (inicio && inicio > hoje) return;\n\n    var titulo =",
"if (inicio && inicio > hoje) return;\n\n    var validade = publicoConteudoPortalV1DataIso_(\n      publicoConteudoPortalV1Campo_(linha, ['VALIDADE', 'DATA_VALIDADE', 'ATE'])\n    );\n    if (validade && validade < hoje) return;\n\n    var horario = publicoConteudoPortalV1Texto_(\n      publicoConteudoPortalV1Campo_(linha, ['HORARIO', 'HORARIO_EXIBICAO'])\n    );\n\n    var titulo =",
'validade campanha publico')
s=once(s,"mensagem: mensagem,\n      inicio: inicio,","mensagem: mensagem,\n      inicio: inicio,\n      validade: validade,\n      horario: horario,",'retorno validade horario campanha')
# Fortalece teste interno de campanha vencida.
s=once(s,
"{\n      ATIVO: 'true',\n      TITULO: 'Campanha futura',\n      MENSAGEM: 'Não pode aparecer',\n      INICIO: '03/08/2026'\n    }",
"{\n      ATIVO: 'true',\n      TITULO: 'Campanha futura',\n      MENSAGEM: 'Não pode aparecer',\n      INICIO: '03/08/2026'\n    },\n    {\n      ATIVO: 'true',\n      TITULO: 'Campanha vencida',\n      MENSAGEM: 'Não pode aparecer',\n      INICIO: '01/08/2026',\n      VALIDADE: '01/08/2026'\n    }",
'teste campanha vencida')
save(p,s)

# 7. Painel público de agendas: horário do recado e encerramento automático variável, com legado 12h.
p,s=load('apps-script/ZZ_12_PublicoAgendasPortalV1.gs')
s=once(s,
"var encerra12h = publicoAgendasV1Booleano_(\n      publicoAgendasV1Valor_(valores[linha], indices.encerra12h)\n    );",
"var encerra12h = publicoAgendasV1Booleano_(\n      publicoAgendasV1Valor_(valores[linha], indices.encerra12h)\n    );\n    var encerraHorario = publicoAgendasV1Hora_(\n      publicoAgendasV1Valor_(exibidos[linha], indices.encerraHorario)\n    ) || (encerra12h ? '12:00' : '');",
'ler encerramento agenda')
s=once(s,"closeAtNoon: encerra12h,","closeAtNoon: encerraHorario==='12:00',\n      closeAt: encerraHorario,",'retorno encerramento agenda')
s=once(s,"closedNow: publicoAgendasV1EncerradoAgora_(dataBruta, encerra12h),","closedNow: publicoAgendasV1EncerradoAgora_(dataBruta, encerraHorario),",'closedNow horario')
s=once(s,"encerra12h: indice(['ENCERRA_12H', 'ENCERRAR_AS_12H'], false),","encerra12h: indice(['ENCERRA_12H', 'ENCERRAR_AS_12H'], false),\n    encerraHorario: indice(['ENCERRA_HORARIO', 'HORARIO_ENCERRAMENTO'], false),",'indice encerramento')
s=sub1(s,r"function publicoAgendasV1EncerradoAgora_\(data, encerra12h\) \{.*?\n\}","function publicoAgendasV1Hora_(valor) {\n  var texto = publicoAgendasV1Texto_(valor), m = texto.match(/^([01]\\d|2[0-3]):([0-5]\\d)$/);\n  return m ? m[1] + ':' + m[2] : '';\n}\n\nfunction publicoAgendasV1EncerradoAgora_(data, horario) {\n  horario = publicoAgendasV1Hora_(horario);\n  if (!horario) return false;\n  var hoje = Utilities.formatDate(new Date(), PUBLICO_AGENDAS_PORTAL_V1.FUSO, 'yyyy-MM-dd');\n  if (publicoAgendasV1DataIso_(data) !== hoje) return false;\n  var agora = Utilities.formatDate(new Date(), PUBLICO_AGENDAS_PORTAL_V1.FUSO, 'HH:mm');\n  return agora >= horario;\n}",'func encerramento variável',flags=re.S)
# Recados do painel_publico também carregam horário se a coluna existir.
s=once(s,"validade: indice(['VALIDADE', 'DATA_VALIDADE', 'ATE']),","validade: indice(['VALIDADE', 'DATA_VALIDADE', 'ATE']),\n    horario: indice(['HORARIO', 'HORARIO_EXIBICAO']),",'indice horario recado painel publico')
s=once(s,"validity: validade,\n      active: true","validity: validade,\n      time: idx.horario >= 0 ? String(registro[idx.horario] || '').trim() : '',\n      active: true",'retorno horario recado painel publico')
save(p,s)

# 8. Backend de agendas: adiciona coluna opcional e salva hora de encerramento.
p,s=load('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs')
s=once(s,
"['AREA_ID','ATUALIZADO_EM'].forEach(function(h){if(headers.indexOf(h)===-1){sheet.getRange(1,colunas+1).setValue(h);headers.push(h);colunas++;}});",
"['AREA_ID','ATUALIZADO_EM'].forEach(function(h){if(headers.indexOf(h)===-1){sheet.getRange(1,colunas+1).setValue(h);headers.push(h);colunas++;}});\n  if(nome===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS&&headers.indexOf('ENCERRA_HORARIO')===-1){sheet.getRange(1,colunas+1).setValue('ENCERRA_HORARIO');headers.push('ENCERRA_HORARIO');colunas++;}",
'coluna encerra horario')
s=once(s,
"MENSAGEM:agendasProfissionaisTerritoriaisV1Texto_(p.mensagem),ENCERRA_12H:agendasProfissionaisTerritoriaisV1Booleano_(p.encerra12h),VAGAS_COMUNS:",
"MENSAGEM:agendasProfissionaisTerritoriaisV1Texto_(p.mensagem),ENCERRA_HORARIO:agendasProfissionaisTerritoriaisV1HoraOpcional_(p.encerraHorario),ENCERRA_12H:agendasProfissionaisTerritoriaisV1HoraOpcional_(p.encerraHorario)==='12:00',VAGAS_COMUNS:",
'salvar encerra horario')
s=once(s,
"function agendasProfissionaisTerritoriaisV1DataOpcional_(v){",
"function agendasProfissionaisTerritoriaisV1HoraOpcional_(v){v=agendasProfissionaisTerritoriaisV1Texto_(v);if(!v)return'';var m=v.match(/^([01]\\d|2[0-3]):([0-5]\\d)$/);if(!m)throw new Error('Horário de encerramento inválido.');return m[1]+':'+m[2];}\nfunction agendasProfissionaisTerritoriaisV1DataOpcional_(v){",
'helper hora agenda')
save(p,s)

# 9. Portal: mostra horário informado nos balões públicos.
p,s=load('portal-controle-integral.js')
s=once(s,
"(item.validity?'\\nVálido até: '+esc(dateBr(item.validity)):'')",
"(item.time||item.horario?'\\nHorário: '+esc(item.time||item.horario):'')+(item.validity?'\\nVálido até: '+esc(dateBr(item.validity)):'')",
'horario balao publico')
save(p,s)

# 10. Cache-busting central para os dois painéis alterados.
p,s=load('central-administrativa-tacs.js')
s=s.replace("v=20260816-recados-saude-filtros-v8","v=20260816-publicacoes-horarios-v9")
s=s.replace("'/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision","'/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v=20260816-agendas-horarios-v9'")
save(p,s)

# 11. Solicita implantação do Apps Script no workflow oficial.
p,s=load('.github/apps-script-release-request')
s=f"publicacoes-horarios-validade-v9 {int(time.time())}\n"
save(p,s)

print('AJUSTE_PUBLICACOES_HORARIOS_VALIDADE_V9_OK')
