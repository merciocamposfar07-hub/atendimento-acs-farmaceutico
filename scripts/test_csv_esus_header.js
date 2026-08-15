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

const realEsus = [
  'Nome equipe;INE equipe;Microárea;Endereço;CPF/CNS;Nome;Idade;Sexo;Identidade de gênero;Data de nascimento;Telefone celular;Telefone residencial;Telefone de contato;Última atualização cadastral;Origem;Coluna 16',
  'USF MATIAS;0001628011;01;Rua Um;44444444444;Pessoa CPF;30;Feminino;;01/01/1996;81999990000;;81988880000;14/08/2026;e-SUS;'
].join('\r\n');
const realLocated = context.csvReader.locateCsvHeader(realEsus);
assert.equal(realLocated.headerRow, 0);
assert.equal(context.csvReader.defaultIndex('equipe', realLocated.headers), 0);
assert.equal(context.csvReader.defaultIndex('microarea', realLocated.headers), 2);
assert.equal(context.csvReader.defaultIndex('endereco', realLocated.headers), 3);
assert.equal(context.csvReader.defaultIndex('cpf', realLocated.headers), 4);
assert.equal(context.csvReader.defaultIndex('cns', realLocated.headers), 4);
assert.equal(context.csvReader.defaultIndex('nome', realLocated.headers), 5);
assert.equal(context.csvReader.defaultIndex('sexo', realLocated.headers), 7);
assert.equal(context.csvReader.defaultIndex('nascimento', realLocated.headers), 9);
assert.equal(context.csvReader.defaultIndex('celular', realLocated.headers), 10);
assert.equal(context.csvReader.defaultIndex('telefoneContato', realLocated.headers), 12);
assert.equal(context.csvReader.defaultIndex('idade', realLocated.headers), -1);
assert.equal(context.csvReader.defaultIndex('ultimaAtualizacao', realLocated.headers), -1);
assert.equal(context.csvReader.defaultIndex('origem', realLocated.headers), -1);
assert.equal(context.csvReader.defaultIndex('idPortal', realLocated.headers), -1);

console.log('CSV do e-SUS: capa, acentuação e mapeamento automático do relatório real reconhecidos.');
