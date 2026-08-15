'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'teste-v1/painel-tacs-areas-v1.js'), 'utf8');
const start = source.indexOf('var CSV_HEADER_ALIASES=');
const end = source.indexOf('function bytesToBase64', start);
assert.ok(start >= 0 && end > start, 'Leitor CSV do painel não foi localizado.');

const context = vm.createContext({
  TextDecoder,
  Uint8Array,
  String,
  Array,
  Object,
  Math,
  Error,
  text(value) { return String(value == null ? '' : value).trim(); }
});
vm.runInContext(
  source.slice(start, end) +
  ';this.csvReader={decodeCsvBuffer:decodeCsvBuffer,locateCsvHeader:locateCsvHeader,defaultIndex:defaultIndex};',
  context
);

const csv = [
  'e-SUS - Atenção Primária',
  'MINISTÉRIO DA SAÚDE',
  'UNIDADE DE SAÚDE: USF MATIAS',
  '',
  'Nome do cidadão;Data de nascimento;Sexo;CPF;CNS;Telefone celular;Microárea;Equipe responsável',
  'João da Área;07/04/1985;Masculino;77777777777;777777777777777;81988887777;04;Equipe Sítio'
].join('\r\n');
const bytes = Uint8Array.from(Buffer.from(csv, 'latin1'));
const decoded = context.csvReader.decodeCsvBuffer(bytes.buffer);
assert.equal(decoded.encoding, 'Windows-1252');
assert.equal(decoded.text.includes('\uFFFD'), false);
assert.match(decoded.text, /Atenção Primária/);

const located = context.csvReader.locateCsvHeader(decoded.text);
assert.equal(located.headerRow, 4);
assert.equal(located.delimiter, ';');
assert.equal(located.headers[0], 'Nome do cidadão');
assert.equal(context.csvReader.defaultIndex('nome', located.headers), 0);
assert.equal(context.csvReader.defaultIndex('nascimento', located.headers), 1);
assert.equal(context.csvReader.defaultIndex('sexo', located.headers), 2);
assert.equal(context.csvReader.defaultIndex('cpf', located.headers), 3);
assert.equal(context.csvReader.defaultIndex('cns', located.headers), 4);
assert.equal(context.csvReader.defaultIndex('celular', located.headers), 5);
assert.equal(context.csvReader.defaultIndex('telefoneContato', located.headers), -1);
assert.equal(context.csvReader.defaultIndex('microarea', located.headers), 6);
assert.equal(context.csvReader.defaultIndex('equipe', located.headers), 7);

console.log('CSV do e-SUS: capa ignorada, cabeçalho real e acentuação reconhecidos.');
