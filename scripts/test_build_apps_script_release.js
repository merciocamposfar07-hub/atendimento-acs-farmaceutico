const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildRelease,
  MODULES,
  SCRIPT_EXTENSIONS,
  moduleDeclarationPattern
} = require('./build_apps_script_release');

function project(extension = '.js') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tacs-apps-script-'));
  fs.writeFileSync(path.join(directory, 'appsscript.json'), '{"runtimeVersion":"V8"}\n');
  fs.writeFileSync(
    path.join(directory, `Portal${extension}`),
    [
      'function doGet() { return true; }',
      'function diagnostico() { return TACS_MORADORES_ADMIN_V1.VERSAO; }',
      ''
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(directory, `ZZZZ_15_ArquivoRealDoServidor${extension}`),
    'var TACS_MORADORES_ADMIN_V1 = Object.freeze({VERSAO: "ANTIGA"});\n'
  );
  return directory;
}

const target = project();
try {
  const portalBefore = fs.readFileSync(path.join(target, 'Portal.js'), 'utf8');
  const first = buildRelease(target);
  assert.strictEqual(first.length, MODULES.length);
  const residentFirst = first.find((item) => item.file === 'ZZZZ_15_ArquivoRealDoServidor.js');
  assert.ok(residentFirst, 'O módulo de Moradores precisa permanecer no pacote.');
  assert.strictEqual(residentFirst.operation, 'substituido');
  assert.ok(first.every((item) => item.file.endsWith('.js')));
  assert.match(
    fs.readFileSync(path.join(target, residentFirst.file), 'utf8'),
    /VERSAO:\s*'1\.4\.5'/
  );
  assert.strictEqual(fs.readFileSync(path.join(target, 'Portal.js'), 'utf8'), portalBefore);

  const second = buildRelease(target);
  assert.ok(second.every((item) => item.operation === 'substituido'));
  MODULES.forEach((module) => {
    const declaration = moduleDeclarationPattern(module.marker);
    const occurrences = fs.readdirSync(target)
      .filter((name) => SCRIPT_EXTENSIONS.some((extension) => name.endsWith(extension)))
      .filter((name) => declaration.test(fs.readFileSync(path.join(target, name), 'utf8')));
    assert.strictEqual(occurrences.length, 1);
  });

  fs.writeFileSync(
    path.join(target, 'Duplicado.gs'),
    'var TACS_MORADORES_ADMIN_V1 = Object.freeze({VERSAO: "DUPLICADA"});\n'
  );
  assert.throws(() => buildRelease(target), /Mais de um arquivo contém TACS_MORADORES_ADMIN_V1/);
} finally {
  fs.rmSync(target, {recursive: true, force: true});
}

const missing = project();
try {
  fs.rmSync(path.join(missing, 'ZZZZ_15_ArquivoRealDoServidor.js'));
  assert.throws(() => buildRelease(missing), /não foi localizado exatamente uma vez/);
} finally {
  fs.rmSync(missing, {recursive: true, force: true});
}

const legacyGs = project('.gs');
try {
  const report = buildRelease(legacyGs);
  assert.ok(report.every((item) => item.file.endsWith('.gs')));
  assert.ok(report.some((item) => item.file === 'ZZZZ_15_ArquivoRealDoServidor.gs'));
} finally {
  fs.rmSync(legacyGs, {recursive: true, force: true});
}

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'deploy-apps-script-moradores.yml'),
  'utf8'
);
assert.strictEqual(
  (workflow.match(/@google\/clasp@3\.3\.0 redeploy/g) || []).length,
  2,
  'O fluxo deve conter exatamente a implantação e a reversão automática.'
);
assert.match(
  workflow,
  /redeploy \\\n\s+--versionNumber "\$PREVIOUS_VERSION" \\\n\s+--description "Rollback automático após falha de validação" \\\n\s+"\$DEPLOYMENT_ID" \|\| true/,
  'A reversão deve usar as opções aceitas pelo clasp 3.3.0.'
);
assert.match(
  workflow,
  /redeploy \\\n\s+--versionNumber "\$NEW_VERSION" \\\n\s+--description "Agendas territoriais 1\.0\.0 e TACS 1\.2\.0" \\\n\s+"\$DEPLOYMENT_ID"/,
  'A implantação deve usar as opções aceitas pelo clasp 3.3.0.'
);
assert.match(
  workflow,
  /action=agenda&areaId=SITIO_MATIAS/,
  'A implantação deve validar a agenda isolada de Sítio Matias.'
);
assert.match(
  workflow,
  /action=painel_publico&areaId=SITIO_MATIAS/,
  'A implantação deve validar o painel público territorial de Sítio Matias.'
);

console.log('Montagem Apps Script: .js/.gs, projeto real preservado, módulos únicos, clasp 3.3.0 e falhas seguras validados.');
