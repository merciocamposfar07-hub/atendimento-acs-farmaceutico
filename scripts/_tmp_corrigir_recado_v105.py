from pathlib import Path

source_path = Path('apps-script/ZZ_12_PublicoAgendasPortalV1.gs')
test_path = Path('scripts/test_public_agendas_apps_script.js')
source = source_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

source = source.replace(
    "return publicoAgendasV1Resposta_(modulos, aba ? aba.getName() : '', areaId);",
    "return publicoAgendasV1Resposta_(modulos, aba ? aba.getName() : '', areaId, planilha);"
)
source = source.replace(
    "return publicoAgendasV1Resposta_(modulos, aba.getName(), areaId);",
    "return publicoAgendasV1Resposta_(modulos, aba.getName(), areaId, planilha);"
)
source = source.replace(
    "function publicoAgendasV1Resposta_(modulos, aba, areaId) {",
    "function publicoAgendasV1Resposta_(modulos, aba, areaId, planilha) {"
)
source = source.replace(
    "    recados: [],\n    campanhas: []",
    "    recados: publicoAgendasV1LerRecados_(planilha, areaId),\n    campanhas: []"
)

marker = "function publicoAgendasV1LocalizarAba_(planilha) {"
helper = r'''function publicoAgendasV1LerRecados_(planilha, areaId) {
  areaId = publicoAgendasV1AreaId_(areaId) || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  if (!planilha || typeof planilha.getSheetByName !== 'function') return [];

  var aba = planilha.getSheetByName('RECADOS_PORTAL');
  if (!aba || aba.getLastRow() < 2 || aba.getLastColumn() < 1) return [];

  var valores = aba
    .getRange(1, 1, aba.getLastRow(), aba.getLastColumn())
    .getDisplayValues();
  var cabecalhos = valores[0].map(publicoAgendasV1Normalizar_);

  function indice(nomes) {
    for (var i = 0; i < nomes.length; i += 1) {
      var encontrado = cabecalhos.indexOf(publicoAgendasV1Normalizar_(nomes[i]));
      if (encontrado >= 0) return encontrado;
    }
    return -1;
  }

  var idx = {
    id: indice(['ID', 'CODIGO', 'RECADO_ID']),
    area: indice(['AREA_ID', 'AREA', 'TERRITORIO']),
    titulo: indice(['TITULO', 'TITULO_PUBLICO', 'NOME']),
    mensagem: indice(['MENSAGEM', 'TEXTO', 'CONTEUDO']),
    prioridade: indice(['PRIORIDADE', 'TIPO']),
    validade: indice(['VALIDADE', 'DATA_VALIDADE', 'ATE']),
    ativo: indice(['ATIVO', 'RECADO_ATIVO', 'PUBLICAR'])
  };

  if (idx.mensagem < 0 || idx.ativo < 0) return [];

  var hoje = Utilities.formatDate(
    new Date(),
    PUBLICO_AGENDAS_PORTAL_V1.FUSO,
    'yyyy-MM-dd'
  );
  var recados = [];

  for (var linha = 1; linha < valores.length; linha += 1) {
    var registro = valores[linha];
    var areaLinha = idx.area >= 0
      ? publicoAgendasV1AreaId_(registro[idx.area])
      : '';
    areaLinha = areaLinha || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
    if (areaLinha !== areaId) continue;
    if (!publicoAgendasV1Booleano_(registro[idx.ativo])) continue;

    var validade = idx.validade >= 0
      ? publicoAgendasV1DataIso_(registro[idx.validade])
      : '';
    if (validade && validade < hoje) continue;

    var mensagem = String(registro[idx.mensagem] || '').trim();
    if (!mensagem) continue;

    var titulo = idx.titulo >= 0
      ? String(registro[idx.titulo] || '').trim()
      : '';
    var prioridade = idx.prioridade >= 0
      ? String(registro[idx.prioridade] || '').trim()
      : '';

    recados.push({
      id: idx.id >= 0 ? String(registro[idx.id] || '').trim() : '',
      title: titulo || 'Recado da Unidade',
      message: mensagem,
      priority: prioridade || 'INFORMATIVO',
      validity: validade,
      active: true
    });
  }

  return recados;
}

'''
if helper.strip() not in source:
    if marker not in source:
        raise SystemExit('Ponto de inserção do leitor de recados não encontrado.')
    source = source.replace(marker, helper + marker, 1)

# O teste passa a simular a mesma planilha com a aba de recados e comprova
# que painel_publico não volta mais com recados zerados.
test = test.replace(
    "const sheet = {\n  getName: () => 'AGENDAS',",
    "const sheet = {\n  getName: () => 'AGENDAS',"
)

insert_after = "};\n\nconst context = {"
notice_mock = r''' };

const noticeRows = [
  ['ID', 'TITULO', 'MENSAGEM', 'PRIORIDADE', 'VALIDADE', 'ATIVO', 'ATUALIZADO_EM', 'AREA_ID'],
  ['RECADO_JAPARANDUBA_1', 'Horário da dentista', 'O atendimento com a dentista é até as 11:00 hs!', 'IMPORTANTE', '31/12/2099', true, '', 'JAPARANDUBA'],
  ['RECADO_MUNTUNS_1', 'Outro território', 'Não pode aparecer em Japaranduba.', 'INFORMATIVO', '31/12/2099', true, '', 'MUNTUNS']
];
const noticeSheet = {
  getName: () => 'RECADOS_PORTAL',
  getLastRow: () => noticeRows.length,
  getLastColumn: () => noticeRows[0].length,
  getRange: (row, column, rowCount, columnCount) => {
    const selected = noticeRows
      .slice(row - 1, row - 1 + rowCount)
      .map(values => values.slice(column - 1, column - 1 + columnCount));
    return {
      getDisplayValues: () => selected.map(values => values.map(value => String(value)))
    };
  }
};
const sharedSpreadsheet = {
  getSheets: () => [sheet, noticeSheet],
  getSheetByName: name => name === 'RECADOS_PORTAL' ? noticeSheet : null
};

const context = {'''
if "const noticeRows = [" not in test:
    if insert_after not in test:
        raise SystemExit('Ponto de inserção do mock de recados não encontrado.')
    test = test.replace(insert_after, notice_mock, 1)

test = test.replace(
    "adminTacsV1Planilha_: () => ({getSheets: () => [sheet]}),",
    "adminTacsV1Planilha_: () => sharedSpreadsheet,"
)

test = test.replace(
    "assert.equal(result.modules.medica.length, 1);\n\nconst muntunsResult",
    "assert.equal(result.modules.medica.length, 1);\nassert.equal(result.recados.length, 1);\nassert.equal(result.recados[0].title, 'Horário da dentista');\nassert.match(result.recados[0].message, /dentista é até as 11:00/);\nassert.equal(result.recados[0].active, true);\n\nconst muntunsResult"
)
test = test.replace(
    "assert.equal(muntunsResult.modules.medica[0].message, 'Atendimento Muntuns');",
    "assert.equal(muntunsResult.modules.medica[0].message, 'Atendimento Muntuns');\nassert.equal(muntunsResult.recados.length, 1);\nassert.equal(muntunsResult.recados[0].title, 'Outro território');"
)
test = test.replace(
    "console.log('Apps Script público: MEDICA normalizada e agenda cancelada publicada sem dados privados.');",
    "console.log('Apps Script público: agendas preservadas e recados ativos publicados por área.');"
)

source_path.write_text(source, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('RECADO_PUBLICO_V105_PATCH_OK')
