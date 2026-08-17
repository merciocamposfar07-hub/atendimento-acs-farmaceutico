'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'agenda-config.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

function resolved(url,saved){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url,runScripts:'outside-only'});
  if(saved)dom.window.localStorage.setItem('portalTacsAreaIdV1',saved);
  dom.window.eval(source);
  const result={area:dom.window.TACS_AREA_ID,stored:dom.window.localStorage.getItem('portalTacsAreaIdV1')};
  dom.window.close();
  return result;
}

let r=resolved('https://example.test/atendimento-acs-farmaceutico/','SITIO_MATIAS');
assert.equal(r.area,'JAPARANDUBA','O link base não pode herdar Sítio Matias do localStorage.');
assert.equal(r.stored,'JAPARANDUBA','O link base deve limpar a área territorial antiga do navegador.');

r=resolved('https://example.test/atendimento-acs-farmaceutico/?area=SITIO_MATIAS','JAPARANDUBA');
assert.equal(r.area,'SITIO_MATIAS','O link explícito de Sítio Matias precisa continuar funcionando.');
assert.equal(r.stored,'SITIO_MATIAS');

r=resolved('https://example.test/atendimento-acs-farmaceutico/?area=JAPARANDUBA','SITIO_MATIAS');
assert.equal(r.area,'JAPARANDUBA');
assert.equal(r.stored,'JAPARANDUBA');

const bootstrap=index.match(/<script>\s*\(function\(\)\{[\s\S]*?<\/script>/);
assert.ok(bootstrap,'Bootstrap territorial inicial do index precisa existir.');
assert.match(bootstrap[0],/BASE_URL_TERRITORIO_CANONICO_V1/);
assert.doesNotMatch(bootstrap[0],/localStorage\.getItem\(['\"]portalTacsAreaIdV1['\"]\)/,'O bootstrap do link base não pode ler a última área salva.');
console.log('Link base canônico: Japaranduba fixa sem herdar área anterior; links explícitos continuam isolados.');
