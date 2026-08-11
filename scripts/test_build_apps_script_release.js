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
  assert.strictEqual(first[0].file, 'ZZZZ_15_ArquivoRealDoServidor.js');
  assert.strictEqual(first[0].operation, 'substituido');
  assert.ok(first.every((item) => item.file.endsWith('.js')));
  assert.match(
    fs.readFileSync(path.join(target, first[0].file), 'utf8'),
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
  assert.strictEqual(report[0].file, 'ZZZZ_15_ArquivoRealDoServidor.gs');
} finally {
  fs.rmSync(legacyGs, {recursive: true, force: true});
}

console.log('Montagem Apps Script: .js/.gs, projeto real preservado, módulos únicos e falhas seguras validados.');
