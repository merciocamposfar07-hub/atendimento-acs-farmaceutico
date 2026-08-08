'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs'),'utf8');
const ui=fs.readFileSync(path.join(root,'teste-v1/painel-moradores-v1.html'),'utf8');
const publicAutofill=fs.readFileSync(path.join(root,'moradores-autofill.js'),'utf8');
const gate=JSON.parse(fs.readFileSync(path.join(root,'MORADORES_RELEASE_GATE_V1.json'),'utf8'));

function has(text,part,msg){assert(text.includes(part),msg||`Esperado: ${part}`)}
function lacks(text,part,msg){assert(!text.includes(part),msg||`Não deveria conter: ${part}`)}

assert.doesNotThrow(()=>new Function(backend),'Backend Apps Script contém erro de sintaxe JavaScript.');
const inlineScripts=[...ui.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
assert(inlineScripts.length>=1,'Painel não contém script inline.');
inlineScripts.forEach((code,i)=>assert.doesNotThrow(()=>new Function(code),`Script inline ${i} contém erro de sintaxe.`));

has(backend,"VERSAO: '1.0.0'");
has(backend,"SPREADSHEET_ID: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg'");
has(backend,"AREA_ID: 'JAPARANDUBA'");
has(backend,"AREA_NOME: 'Sítio Japaranduba'");

has(backend,"WRITES_PROPERTY: 'MORADORES_ADMIN_WRITES_ENABLED'");
has(backend,"STATUS_PROPERTY: 'MORADORES_ADMIN_STATUS_ENABLED'");
has(backend,'moradoresAdminV1ExigirEscrita_();');
has(backend,'moradoresAdminV1ExigirSituacao_();');
const statusFn=(backend.match(/function moradoresAdminV1Status_\(\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(statusFn,'moradoresAdminV1GarantirMeta_','Status não pode criar ou alterar aba.');
has(statusFn,'getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET)');

lacks(backend,'deleteRow(');
lacks(backend,'deleteRows(');
lacks(backend,'deleteSheet(');
lacks(backend,'clearContent(');
lacks(backend,'admin_moradores_importar_lote');

has(backend,"META_SHEET: 'TACS_META_AREA'");
const safeHeaders=['ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO','DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','AREA_INTERNA','ATUALIZADO_EM'];
const aliases={
  nome:['nome','nome completo','nome do morador','morador','nome da pessoa','usuario','usuário'],
  nascimento:['data de nascimento','nascimento','data nascimento','dt nascimento','dn','data nasc'],
  cpf:['cpf','numero do cpf','número do cpf','cpf do morador','documento cpf'],
  cns:['cns','cartao nacional de saude','cartão nacional de saúde','cartao sus','cartão sus','numero do cns','número do cns','numero do cartao sus','número do cartão sus'],
  localidade:['localidade','comunidade','endereco','endereço','endereco completo','endereço completo','onde mora','sitio','sítio','area','área','microarea','microárea'],
  nomeMae:['nome da mae','nome da mãe','mae','mãe','nome mae','nome mãe','genitora','nome da genitora','filiacao mae','filiação mãe','filiacao materna','filiação materna','filiacao 1','filiação 1'],
  nomePai:['nome do pai','pai','nome pai','genitor','nome do genitor','filiacao pai','filiação pai','filiacao paterna','filiação paterna','filiacao 2','filiação 2']
};
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function locate(headers,list){const wanted=list.map(norm);for(let i=0;i<headers.length;i++)if(wanted.includes(norm(headers[i])))return i;for(let c=0;c<headers.length;c++){const key=norm(headers[c]);if(!key)continue;for(const alias of wanted){if(alias.length<6)continue;if(key.includes(alias)||alias.includes(key))return c}}return -1}
const map={};Object.keys(aliases).forEach(k=>map[k]=locate(safeHeaders,aliases[k]));let score=0;if(map.cpf>=0||map.cns>=0)score+=6;if(map.nome>=0)score+=4;if(map.nascimento>=0)score+=2;if(map.localidade>=0)score+=1;if(map.nomeMae>=0)score+=3;if(map.nomePai>=0)score+=3;
assert(score<8,`A aba de metadados seria confundida com cadastro público (score ${score}).`);

const keyFn=(backend.match(/function moradoresAdminV1ChaveRegistro_\(morador\)\{([\s\S]*?)\}/)||[])[1]||'';
lacks(keyFn,'origem.linha');
lacks(keyFn,'origem.aba');
has(keyFn,'moradoresAdminV1ChaveIdentidade_(morador)');
has(backend,'chaveAnterior:chaveAnterior');

has(backend,"RESULT_PREFIX: 'tacs_moradores_v1_result_'");
has(backend,"action!=='admin_moradores_result'");

has(ui,"var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec'");
has(ui,"TOKEN_KEY='portalTacsAdminTokenV1'");
has(ui,"DEVICE_KEY='portalTacsDispositivoV1'");
has(ui,'＋ Novo morador');
has(ui,'🔎 Buscar / editar');
has(ui,'📄 Atualização por CSV');
has(ui,'ADMINISTRAÇÃO GERAL • PORTAL TACS');
has(ui,'Agentes e áreas');
has(ui,'Próxima etapa');
has(ui,'Nenhum dado foi enviado ao servidor');
lacks(ui,'admin_moradores_importar_lote');
lacks(ui,"jsonp('admin_moradores_status'",'Status administrativo não deve enviar token na URL.');
lacks(ui,"jsonp('admin_moradores_buscar'",'Busca administrativa não deve enviar token na URL.');
has(ui,"post('admin_moradores_status'");
has(ui,"post('admin_moradores_buscar'");

has(publicAutofill,"var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec'");
has(publicAutofill,'action=buscar_morador');
lacks(publicAutofill,'admin_morador_salvar');

assert.strictEqual(gate.version,'1.0.0');
assert.strictEqual(gate.productionBase,'2f5136f52d59cc4a6cf188c0527f56cce3858c79');
assert.strictEqual(gate.releaseAllowed,false);
assert.strictEqual(gate.realReadValidation,'NOT_STARTED');
assert.strictEqual(gate.dailyCrudWrites,'LOCKED');
assert.strictEqual(gate.publicStatusFilter,'NOT_STARTED');
assert.strictEqual(gate.csvReconciliation,'NOT_STARTED');
assert.strictEqual(gate.mainMerge,'NOT_STARTED');

console.log('OK — Moradores Admin V1: estrutura isolada, gates e regressões validados.');
