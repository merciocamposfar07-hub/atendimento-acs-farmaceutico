const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT_EXTENSIONS = ['.js', '.gs'];
const MODULES = [
  {
    source: 'apps-script/ZZ_11_PublicoConteudoPortalV1.gs',
    marker: 'PUBLICO_CONTEUDO_PORTAL_V1'
  },
  {
    source: 'apps-script/ZZ_12_PublicoAgendasPortalV1.gs',
    marker: 'PUBLICO_AGENDAS_PORTAL_V1'
  },
  {
    source: 'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs',
    marker: 'TACS_MORADORES_ADMIN_V1',
    existingRequired: true
  },
  {
    source: 'apps-script/ZZZZ_16_PortalManutencaoNotificacoesV1.gs',
    marker: 'TACS_PORTAL_MANUTENCAO_V1'
  },
  {
    source: 'apps-script/ZZZZ_17_TacsAreasAdminV1.gs',
    marker: 'TACS_TERRITORIO_V1'
  },
  {
    source: 'apps-script/ZZZZ_18_ImportacaoCsvMoradoresV1.gs',
    marker: 'TACS_CSV_MORADORES_V1'
  },
  {
    source: 'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs',
    marker: 'TACS_NOTIFICACOES_AREA_V1'
  },
  {
    source: 'apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs',
    marker: 'TACS_PUBLICACOES_TERRITORIAIS_V1'
  },
  {
    source: 'apps-script/ZZZZ_21_PerformanceCacheV101.gs',
    marker: 'TACS_PERFORMANCE_CACHE_V101'
  }
];

function listFiles(directory, extensions) {
  const allowed = Array.isArray(extensions) ? extensions : [extensions];
  const out = [];
  fs.readdirSync(directory, {withFileTypes: true}).forEach((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, allowed));
    else if (entry.isFile() && allowed.some((extension) => full.endsWith(extension))) {
      out.push(full);
    }
  });
  return out;
}

function moduleDeclarationPattern(marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bvar\\s+${escaped}\\s*=\\s*Object\\.freeze\\s*\\(`);
}

function filesWithMarker(directory, marker) {
  const declaration = moduleDeclarationPattern(marker);
  return listFiles(directory, SCRIPT_EXTENSIONS).filter((file) =>
    declaration.test(fs.readFileSync(file, 'utf8'))
  );
}

function preferredScriptExtension(directory) {
  const scripts = listFiles(directory, SCRIPT_EXTENSIONS);
  const jsCount = scripts.filter((file) => file.endsWith('.js')).length;
  const gsCount = scripts.filter((file) => file.endsWith('.gs')).length;
  return jsCount > gsCount ? '.js' : '.gs';
}

function buildRelease(targetDirectory) {
  const target = path.resolve(targetDirectory || '');
  if (!targetDirectory || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    throw new Error('Informe o diretório previamente baixado pelo clasp pull.');
  }
  if (!fs.existsSync(path.join(target, 'appsscript.json'))) {
    throw new Error('O projeto baixado não contém appsscript.json. A publicação foi bloqueada.');
  }

  const report = [];
  const targetExtension = preferredScriptExtension(target);
  MODULES.forEach((module) => {
    const sourceFile = path.join(ROOT, module.source);
    const source = fs.readFileSync(sourceFile, 'utf8');
    const found = filesWithMarker(target, module.marker);

    if (found.length > 1) {
      throw new Error(`Mais de um arquivo contém ${module.marker}. A publicação foi bloqueada.`);
    }
    if (module.existingRequired && found.length !== 1) {
      throw new Error(
        `O backend atual ${module.marker} não foi localizado exatamente uma vez. ` +
        'Nenhum arquivo foi publicado.'
      );
    }

    const sourceExtension = path.extname(module.source);
    const destination = found[0] || path.join(
      target,
      path.basename(module.source, sourceExtension) + targetExtension
    );
    fs.writeFileSync(destination, source, 'utf8');
    report.push({
      marker: module.marker,
      file: path.relative(target, destination),
      operation: found.length ? 'substituido' : 'adicionado'
    });
  });

  MODULES.forEach((module) => {
    const found = filesWithMarker(target, module.marker);
    if (found.length !== 1) {
      throw new Error(`A montagem terminou com ${found.length} ocorrências de ${module.marker}.`);
    }
  });
  return report;
}

if (require.main === module) {
  try {
    const report = buildRelease(process.argv[2]);
    console.log(JSON.stringify({ok: true, modules: report}, null, 2));
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {buildRelease, MODULES, SCRIPT_EXTENSIONS, moduleDeclarationPattern};
