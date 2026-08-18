from pathlib import Path
import re

# Escopo fechado: Portal TACS (serviços/anexos) + confirmação pós-salvamento do painel de agendas.
module = Path('portal-servicos-coloridos-anexos-v1.js')
index = Path('index.html')
adjust = Path('portal-ajustes-finais.js')
agendas = Path('painel-oficial-agendas-vagas.html')

# 1) Serviços coloridos/anexos
text = module.read_text(encoding='utf-8')

old_colors = """  var COLORS=[
    '#0B5A7A','#6A3F9B','#0D7351','#A34718','#9D2F49','#315E9E','#6E4B8F',
    '#08766C','#8A6500','#336E4B','#7B4E00','#8C365F','#4057A5','#4E626D','#7A3C28','#256A75'
  ];"""
new_colors = """  var COLORS=[
    '#06445D','#54307E','#095B40','#7E350F','#762338','#254A7B','#54386B',
    '#066057','#6B4E00','#28583C','#5E3A00','#702B4C','#30437E','#39484F','#5C2D1E','#1D515A'
  ];"""
if old_colors not in text:
    raise SystemExit('Paleta original não encontrada')
text = text.replace(old_colors, new_colors, 1)

color_map = {
    "color:'#6A3F9B'": "color:'#54307E'",
    "color:'#0B5A7A'": "color:'#06445D'",
    "color:'#0D7351'": "color:'#095B40'",
    "color:'#A34718'": "color:'#7E350F'",
    "color:'#315E9E'": "color:'#254A7B'",
    "color:'#08766C'": "color:'#066057'",
    "color:'#8C365F'": "color:'#702B4C'",
    "color:'#8A6500'": "color:'#6B4E00'",
    "color:'#336E4B'": "color:'#28583C'",
    "color:'#7B4E00'": "color:'#5E3A00'",
    "color:'#6E4B8F'": "color:'#54386B'",
    "color:'#9D2F49'": "color:'#762338'",
    "color:'#4057A5'": "color:'#30437E'",
    "color:'#4E626D'": "color:'#39484F'",
}
for a,b in color_map.items():
    text = text.replace(a,b)

old_removed = """  var REMOVED=[
    'Informações sobre dias, horários e funcionamento da Unidade de Saúde Posto Matias',
    'Solicitar atendimento odontológico de emergência (dentista)'
  ];"""
new_removed = """  var REMOVED=[
    'Informações sobre dias, horários e funcionamento da Unidade de Saúde Posto Matias',
    'Solicitar atendimento odontológico de emergência (dentista)',
    'Solicitar atendimento com a Médica',
    'Atendimento com a Médica'
  ];"""
if old_removed not in text:
    raise SystemExit('Lista REMOVED original não encontrada')
text = text.replace(old_removed, new_removed, 1)

old_choice = "'.portal-service-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid rgba(255,255,255,.75);border-radius:14px;color:#fff;text-align:left;font-size:17px;font-weight:900;line-height:1.28;box-shadow:0 5px 11px rgba(3,35,56,.18)}',"
new_choice = "'.portal-service-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid rgba(214,232,238,.72);border-radius:14px;color:#f2f7f8;text-align:left;font-size:17px;font-weight:900;line-height:1.28;box-shadow:0 5px 11px rgba(3,35,56,.18)}',"
if old_choice not in text:
    raise SystemExit('CSS das opções não encontrado')
text = text.replace(old_choice, new_choice, 1)
text = text.replace("'.portal-service-picker-toggle[data-selected=\"1\"]{color:#fff;border-color:#d8eef7;", "'.portal-service-picker-toggle[data-selected=\"1\"]{color:#f2f7f8;border-color:#cfe4eb;", 1)
text = text.replace("toggle.style.color='#fff'", "toggle.style.color='#f2f7f8'", 1)

old_observer = "pickerObserver=new MutationObserver(function(){renderPicker();applySelectedColor()});"
new_observer = """pickerObserver=new MutationObserver(function(){
      var legacy=false;
      Array.prototype.forEach.call(select.options,function(o){
        var v=text(o.value),l=text(o.textContent);
        if(REMOVED.indexOf(v)!==-1||REMOVED.indexOf(l)!==-1)legacy=true;
      });
      if(legacy)normalizeOptions();
      renderPicker();applySelectedColor()
    });"""
if old_observer not in text:
    raise SystemExit('Observer do seletor não encontrado')
text = text.replace(old_observer, new_observer, 1)

module.write_text(text, encoding='utf-8')

# 2) Corrigir fonte da opção dinâmica da médica no módulo existente
text = adjust.read_text(encoding='utf-8')
if "medica: 'Solicitar atendimento com a Médica'" not in text:
    raise SystemExit('Categoria médica antiga não encontrada em portal-ajustes-finais.js')
text = text.replace("medica: 'Solicitar atendimento com a Médica'", "medica: 'Solicitar consulta Médica'", 1)
needle = """    [
      'Atendimento com a Médica',
      'Atendimento com a Enfermeira Chefe',
      'Atendimento com a Nutricionista'
    ].forEach(function (legacyValue) {"""
replacement = """    [
      'Solicitar atendimento com a Médica',
      'Atendimento com a Médica',
      'Atendimento com a Enfermeira Chefe',
      'Atendimento com a Nutricionista'
    ].forEach(function (legacyValue) {"""
if needle not in text:
    raise SystemExit('Bloco de remoção de categorias antigas não encontrado')
text = text.replace(needle, replacement, 1)
adjust.write_text(text, encoding='utf-8')

# 3) Descrição opcional para os dois serviços com anexo, sem afrouxar os demais campos
text = index.read_text(encoding='utf-8')
old = "function updateForm(){var category=el('category').value,isImplanon=category===IMPLANON,type=dentalType(category),isDental=Boolean(type),subject=requestText(),clinical=!isImplanon&&isClinicalSubject(subject),identity=updateIdentity(),dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot));"
new = "function updateForm(){var category=el('category').value,isImplanon=category===IMPLANON,type=dentalType(category),isDental=Boolean(type),subject=requestText(),attachmentOptional=category==='Solicitar renovação de receita médica'||category==='Solicitar marcação de exames — Ultrassom / Fisioterapeuta',clinical=!isImplanon&&isClinicalSubject(subject),identity=updateIdentity(),dentalOk=!isDental||(dentalState==='ready'&&scheduleConfigured(type)&&Boolean(selectedDentalSlot));"
if old not in text:
    raise SystemExit('updateForm base não encontrado')
text = text.replace(old,new,1)
old_ready = "&&el('locality').value.trim()&&subject&&dentalOk)}"
new_ready = "&&el('locality').value.trim()&&(subject||attachmentOptional)&&dentalOk)}"
if old_ready not in text:
    raise SystemExit('Regra de obrigatoriedade da descrição não encontrada')
text = text.replace(old_ready,new_ready,1)
text = text.replace('portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v1','portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v2',1)
index.write_text(text, encoding='utf-8')

# 4) Painel de agendas: conferir apenas os campos realmente alterados, evitando falso erro de linha inteira
text = agendas.read_text(encoding='utf-8')
marker = "function salvarAgenda(c){"
if marker not in text:
    raise SystemExit('salvarAgenda não encontrado')
if 'function coincideAlteracoes(' not in text:
    helper = r"""
function valorRegistroAgenda(r,n){
  if(!r)return null;
  if(n==='data')return dataInput(r.DATA);
  if(n==='horario')return txt(r.HORARIO).trim();
  if(n==='situacao')return normalSituacao(r.SITUACAO);
  if(n==='mensagem')return txt(r.MENSAGEM).trim();
  if(n==='encerraHorario')return txt(r.ENCERRA_HORARIO||((bool(r.ENCERRA_12H))?'12:00':'')).trim();
  if(n==='vagasComuns')return num(r.VAGAS_COMUNS);
  if(n==='vagasEmergenciais')return num(r.VAGAS_EMERGENCIAIS);
  if(n==='diaExtra')return bool(r.DIA_EXTRA);
  if(n==='ativo')return bool(r.ATIVO);
  return '';
}
function valorPayloadAgenda(p,n){
  if(n==='data')return txt(p.data).trim();
  if(n==='horario')return txt(p.horario).trim();
  if(n==='situacao')return normalSituacao(p.situacao);
  if(n==='mensagem')return txt(p.mensagem).trim();
  if(n==='encerraHorario')return txt(p.encerraHorario).trim();
  if(n==='vagasComuns')return num(p.vagasComuns);
  if(n==='vagasEmergenciais')return num(p.vagasEmergenciais);
  if(n==='diaExtra')return bool(p.diaExtra);
  if(n==='ativo')return bool(p.ativo);
  return '';
}
function coincideAlteracoes(atual,p,anterior){
  if(!atual||!anterior)return false;
  if(normalId(atual.MODULO)!==normalId(p.modulo)||normalDia(atual.DIA)!==normalDia(p.dia))return false;
  var campos=['data','horario','situacao','mensagem','encerraHorario','vagasComuns','vagasEmergenciais','diaExtra','ativo'];
  var alterou=false;
  for(var i=0;i<campos.length;i++){
    var n=campos[i],antes=valorRegistroAgenda(anterior,n),pedido=valorPayloadAgenda(p,n);
    if(antes!==pedido){
      alterou=true;
      if(valorRegistroAgenda(atual,n)!==pedido)return false;
    }
  }
  return alterou?true:coincide(atual,p);
}
"""
    text = text.replace(marker, helper + marker, 1)

old_verify = "var atual=achar(p.modulo,p.dia),confirmado=coincide(atual,p);status('statusOperacao',confirmado?'Agenda gravada e confirmada pela releitura da planilha.':'O servidor respondeu, mas a releitura não coincidiu integralmente. Use “Desfazer” e não faça outra alteração.',confirmado?'ok':'erro')"
new_verify = "var atual=achar(p.modulo,p.dia),confirmado=coincideAlteracoes(atual,p,anterior);status('statusOperacao',confirmado?'Agenda gravada e confirmada pela releitura da planilha.':'Agenda salva, mas os campos alterados ainda aguardam confirmação na próxima leitura.',confirmado?'ok':'aviso')"
if old_verify not in text:
    raise SystemExit('Verificação pós-salvamento original não encontrada')
text = text.replace(old_verify,new_verify,1)
agendas.write_text(text, encoding='utf-8')

# Validação de escopo e requisitos
checks = {
    module: ['Solicitar consulta Médica', 'portal-service-choice', '#f2f7f8', 'Solicitar atendimento com a Médica'],
    adjust: ["medica: 'Solicitar consulta Médica'", "'Solicitar atendimento com a Médica'"],
    index: ['attachmentOptional=', 'portal-servicos-coloridos-anexos-v1.js?v=20260818-servicos-anexos-v2'],
    agendas: ['function coincideAlteracoes(', "confirmado?'ok':'aviso'"]
}
for path,needles in checks.items():
    data=path.read_text(encoding='utf-8')
    for needle in needles:
        if needle not in data:
            raise SystemExit(f'Validação falhou em {path}: {needle}')

print('OK: ajustes aplicados somente aos quatro arquivos previstos.')
