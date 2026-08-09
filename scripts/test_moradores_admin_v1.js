'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs'),'utf8');
const ui=fs.readFileSync(path.join(root,'teste-v1/painel-moradores-v1.html'),'utf8');
const publicAutofill=fs.readFileSync(path.join(root,'moradores-autofill.js'),'utf8');
const gate=JSON.parse(fs.readFileSync(path.join(root,'MORADORES_RELEASE_GATE_V1.json'),'utf8'));
const docs=fs.readFileSync(path.join(root,'MORADORES_ADMIN_V1.md'),'utf8');

function has(text,part,msg){assert(text.includes(part),msg||`Esperado: ${part}`)}
function lacks(text,part,msg){assert(!text.includes(part),msg||`Não deveria conter: ${part}`)}

assert.doesNotThrow(()=>new Function(backend),'Backend Apps Script contém erro de sintaxe JavaScript.');
const inlineScripts=[...ui.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
assert(inlineScripts.length>=1,'Painel não contém script inline.');
inlineScripts.forEach((code,i)=>assert.doesNotThrow(()=>new Function(code),`Script inline ${i} contém erro de sintaxe.`));

has(backend,"VERSAO: '1.2.0'");
has(backend,"DEFAULT_RESIDENT_SPREADSHEET_ID: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg'");
has(backend,"DEFAULT_AGENT_ID: 'AG001'");
has(backend,"DEFAULT_AREA_ID: 'JAPARANDUBA'");
has(backend,"DEFAULT_AREA_NAME: 'Sítio Japaranduba'");
has(backend,"DEFAULT_UNIT_ID: 'POSTO_MATIAS'");
has(backend,"DEFAULT_OPERATOR_ID: 'ADMIN_GERAL'");

const schema=[
  'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO','CELULAR',
  'TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO','STATUS',
  'CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL','OBSERVACOES'
];
schema.forEach(h=>has(backend,`'${h}'`,`Schema real não contém ${h}`));
has(backend,'function moradoresAdminV1MapearSchemaReal_(headers)');
has(backend,"throw new Error('Não foi localizada uma aba com o schema oficial de 20 colunas de moradores. Nenhuma coluna será presumida.')");
lacks(backend,'function moradoresAdminV1CompletarMapa_');
lacks(backend,'nomeMae:');
lacks(backend,'nomePai:');
lacks(backend,'Nome da mãe');
lacks(backend,'Nome do pai');
has(backend,"modeloCadastro:'CIDADAO_INDIVIDUAL'");
has(backend,"vinculoFamiliar:'CAMADA_SEPARADA_PLANEJADA'");

has(backend,'function moradoresAdminV1ResolverContexto_(sessao)');
has(backend,'var sessao=moradoresAdminV1ValidarSessao_(p);');
has(backend,'var contexto=moradoresAdminV1ResolverContexto_(sessao);');
lacks(backend,'p.areaId');
lacks(backend,'p.agenteId');
lacks(backend,'p.unidadeId');
has(backend,"if(contexto.areaId!==TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID)");
has(backend,"typeof tacsAreasV1ResolverFonteMoradores_==='function'");

has(backend,"contexto.perfil==='ADMIN_GERAL'");
has(backend,"'MORADORES_LER'");
has(backend,"'MORADORES_EDITAR'");
has(backend,"'MORADORES_SITUACAO'");
has(backend,"WRITES_PROPERTY: 'MORADORES_ADMIN_WRITES_ENABLED'");
has(backend,"STATUS_PROPERTY: 'MORADORES_ADMIN_STATUS_ENABLED'");
has(backend,'moradoresAdminV1ExigirEscrita_();');
has(backend,'moradoresAdminV1ExigirSituacao_();');

const statusFn=(backend.match(/function moradoresAdminV1Status_\(contexto\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(statusFn,'moradoresAdminV1GarantirMeta_');
lacks(statusFn,'moradoresAdminV1GarantirAuditoria_');
has(statusFn,'schemaValido:true');

lacks(backend,'deleteRow(');
lacks(backend,'deleteRows(');
lacks(backend,'deleteSheet(');
lacks(backend,'clearContent(');
lacks(backend,'admin_moradores_importar_lote');

has(backend,"META_SHEET: 'TACS_META_AREA'");
has(backend,"AUDIT_SHEET: 'TACS_AUDIT_MORADORES'");
has(backend,'function moradoresAdminV1Auditar_(ss,input,contexto)');
has(backend,"acao:criado?'CRIAR_MORADOR':'EDITAR_MORADOR'");
has(backend,"acao:'ALTERAR_SITUACAO'");
has(backend,'LockService.getScriptLock()');
has(backend,'lock.tryLock(15000)');
has(backend,'lock.releaseLock()');

const validFn=(backend.match(/function moradoresAdminV1ValidarDadosMorador_\(dados\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(validFn,"if(!dados.nome)");
has(validFn,"if(!dados.nascimento)");
has(validFn,"if(!dados.sexo)");
lacks(validFn,'nomeMae');
lacks(validFn,'nomePai');

const identityFn=(backend.match(/function moradoresAdminV1ChaveIdentidade_\(morador\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(identityFn,'morador.nome');
has(identityFn,'morador.nascimento');
has(identityFn,'morador.endereco');
lacks(identityFn,'nomeMae');
lacks(identityFn,'nomePai');

has(backend,'function moradoresAdminV1ProximoIdPortal_(fonte)');
has(backend,"return 'TACS-'+('000000'+(maior+1)).slice(-6)");
has(backend,"out.origem='PAINEL_TACS'");
has(backend,"out.status='ATIVO'");
has(backend,"out.consentimentoWhatsapp=out.consentimentoWhatsapp||'NÃO'");
has(backend,'out.idade=moradoresAdminV1IdadeTexto_(out.nascimento,agora)');

const diagnosticFn=(backend.match(/function testarConfiguracaoMoradoresAdminPortalV1\(\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(diagnosticFn,'moradoresAdminV1GarantirMeta_');
lacks(diagnosticFn,'moradoresAdminV1GarantirAuditoria_');
has(diagnosticFn,'schemaValido:true');
has(diagnosticFn,"modeloCadastro:'CIDADAO_INDIVIDUAL'");
has(diagnosticFn,'colunasMapeadas:');
has(diagnosticFn,'nenhumaAlteracaoRealizada:true');

const addFn=(backend.match(/function moradoresAdminV1AdicionarLinha_\(fonte,dados\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(addFn,'moradoresAdminV1EscreverCamposCidadao_');
lacks(addFn,'.setValues(');
const writeFields=(backend.match(/function moradoresAdminV1EscreverCamposCidadao_\(sheet,row,map,dados,novo\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(writeFields,'map.idPortal');
has(writeFields,'map.nome');
has(writeFields,'map.nascimento');
has(writeFields,'map.sexo');
has(writeFields,'map.endereco');
has(writeFields,'map.microarea');
has(writeFields,'map.observacoes');
lacks(writeFields,'nomeMae');
lacks(writeFields,'nomePai');

const responderFn=(backend.match(/function moradoresAdminV1ResponderPost_\(requestId,resultado\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(responderFn,'<\\/script>');
lacks(responderFn,'<\\\\/script>');
has(backend,"RESULT_PREFIX: 'tacs_moradores_v12_result_'");
has(backend,"action!=='admin_moradores_result'");

// Produção pública continua isolada.
has(publicAutofill,"var API = 'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec'");
has(publicAutofill,'action=buscar_morador');
lacks(publicAutofill,'admin_morador_salvar');

// Administração Geral segue no roadmap controlado.
has(ui,'ADMINISTRAÇÃO GERAL • PORTAL TACS');
has(ui,'Agentes e áreas');
has(ui,'📄 Atualização por CSV');
lacks(ui,'admin_moradores_importar_lote');
has(docs,'CSV não é obrigação do agente');
has(docs,'Cada área terá uma fonte de moradores autorizada pelo servidor');
has(docs,'não poderão alterar layout, identidade, código, segurança ou funcionalidades centrais');

assert.strictEqual(gate.productionBase,'2f5136f52d59cc4a6cf188c0527f56cce3858c79');
assert.strictEqual(gate.dailyCrudWrites,'LOCKED');
assert.strictEqual(gate.statusWrites,'LOCKED');
assert.strictEqual(gate.publicStatusFilter,'NOT_STARTED');
assert.strictEqual(gate.csvReconciliation,'NOT_STARTED');
assert.strictEqual(gate.multiAreaRuntime,'NOT_STARTED');
assert.strictEqual(gate.mainMerge,'NOT_STARTED');
assert.strictEqual(gate.releaseAllowed,false);

console.log('OK — Moradores Admin V1.2: schema real, cidadão individual, zero mãe/pai artificial, escopo e gates validados.');
