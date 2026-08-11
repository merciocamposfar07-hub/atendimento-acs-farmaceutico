const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {buildRelease, MODULES} = require('./build_apps_script_release');

function project() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tacs-apps-script-'));
  fs.writeFileSync(path.join(directory, 'appsscript.json'), '{"runtimeVersion":"V8"}\n');
  fs.writeFileSync(path.join(directory, 'Portal.gs'), 'function doGet() { return true; }\n');
  fs.writeFileSync(
    path.join(directory, 'ZZZZ_15_ArquivoRealDoServidor.gs'),
    'var TACS_MORADORES_ADMIN_V1 = {VERSAO: "ANTIGA"};\n'
  );
  return directory;
}

const target = project();
try {
  const portalBefore = fs.readFileSync(path.join(target, 'Portal.gs'), 'utf8');
  const first = buildRelease(target);
  assert.strictEqual(first.length, MODULES.length);
  assert.strictEqual(first[0].file, 'ZZZZ_15_ArquivoRealDoServidor.gs');
  assert.strictEqual(first[0].operation, 'substituido');
  assert.match(
    fs.readFileSync(path.join(target, first[0].file), 'utf8'),
    /VERSAO:\s*'1\.4\.5'/
  );
  assert.strictEqual(fs.readFileSync(path.join(target, 'Portal.gs'), 'utf8'), portalBefore);

  const second = buildRelease(target);
  assert.ok(second.every((item) => item.operation === 'substituido'));
  MODULES.forEach((module) => {
    const occurrences = fs.readdirSync(target)
      .filter((name) => name.endsWith('.gs'))
      .filter((name) => fs.readFileSync(path.join(target, name), 'utf8').includes(module.marker));
    assert.strictEqual(occurrences.length, 1);
  });

  fs.writeFileSync(
    path.join(target, 'Duplicado.gs'),
    'var TACS_MORADORES_ADMIN_V1 = {VERSAO: "DUPLICADA"};\n'
  );
  assert.throws(() => buildRelease(target), /Mais de um arquivo contém TACS_MORADORES_ADMIN_V1/);
} finally {
  fs.rmSync(target, {recursive: true, force: true});
}

const missing = project();
try {
  fs.rmSync(path.join(missing, 'ZZZZ_15_ArquivoRealDoServidor.gs'));
  assert.throws(() => buildRelease(missing), /não foi localizado exatamente uma vez/);
} finally {
  fs.rmSync(missing, {recursive: true, force: true});
}

console.log('Montagem Apps Script: projeto real preservado, módulos únicos e falhas seguras validados.');
