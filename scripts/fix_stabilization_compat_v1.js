'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');

const panelFile=path.join(ROOT,'teste-v1','painel-moradores-v2.html');
let html=fs.readFileSync(panelFile,'utf8');
const from='painel-moradores-transport-v2.js?v=20260815-stabilization-v1';
const to='painel-moradores-transport-v2.js?v=20260813-admin-v103';
if(!html.includes(from))throw new Error('Versão temporária do transporte não encontrada.');
html=html.replace(from,to);
fs.writeFileSync(panelFile,html,'utf8');

const brandingTest=path.join(ROOT,'scripts','test_portal_territory_branding.js');
let test=fs.readFileSync(brandingTest,'utf8');
const oldVersion='portal-territory-branding\\.js\\?v=20260814-v1';
const newVersion='portal-territory-branding\\.js\\?v=20260815-territorial-v2';
if(!test.includes(oldVersion))throw new Error('Expectativa antiga do branding não encontrada.');
test=test.replace(oldVersion,newVersion);
fs.writeFileSync(brandingTest,test,'utf8');

console.log('Compatibilidade do transporte e teste do branding atualizados.');
