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

has(backend,"VERSAO: '1.1.0'");
has(backend,"DEFAULT_RESIDENT_SPREADSHEET_ID: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg'");
has(backend,"DEFAULT_AGENT_ID: 'AG001'");
has(backend,"DEFAULT_AREA_ID: 'JAPARANDUBA'");
has(backend,"DEFAULT_AREA_NAME: 'Sítio Japaranduba'");
has(backend,"DEFAULT_UNIT_ID: 'POSTO_MATIAS'");
has(backend,"DEFAULT_OPERATOR_ID: 'ADMIN_GERAL'");

has(backend,'function moradoresAdminV1ResolverContexto_(sessao)');
has(backend,'var sessao=moradoresAdminV1ValidarSessao_(p);');
has(backend,'var contexto=moradoresAdminV1ResolverContexto_(sessao);');
lacks(backend,'p.areaId');
lacks(backend,'p.agenteId');
lacks(backend,'p.unidadeId');
has(backend,"if(contexto.areaId!==TACS_MORADORES_ADMIN_V1.DEFAULT_AREA_ID)");
has(backend,"typeof tacsAreasV1ResolverFonteMoradores_==='function'");
has(backend,"throw new Error('Esta área ainda não possui uma fonte de moradores autorizada no servidor.')");

has(backend,"contexto.perfil==='ADMIN_GERAL'");
has(backend,"'MORADORES_LER'");
has(backend,"'MORADORES_EDITAR'");
has(backend,"'MORADORES_SITUACAO'");

has(backend,"WRITES_PROPERTY: 'MORADORES_ADMIN_WRITES_ENABLED'");
has(backend,"STATUS_PROPERTY: 'MORADORES_ADMIN_STATUS_ENABLED'");
has(backend,'moradoresAdminV1ExigirEscrita_();');
has(backend,'moradoresAdminV1ExigirSituacao_();');
const statusFn=(backend.match(/function moradoresAdminV1Status_\(contexto\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(statusFn,'moradoresAdminV1GarantirMeta_','Status não pode criar ou alterar aba.');
lacks(statusFn,'moradoresAdminV1GarantirAuditoria_','Status não pode criar auditoria.');
has(statusFn,'getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET)');
has(statusFn,'getSheetByName(TACS_MORADORES_ADMIN_V1.AUDIT_SHEET)');

lacks(backend,'deleteRow(');
lacks(backend,'deleteRows(');
lacks(backend,'deleteSheet(');
lacks(backend,'clearContent(');
lacks(backend,'admin_moradores_importar_lote');

has(backend,"META_SHEET: 'TACS_META_AREA'");
has(backend,"AUDIT_SHEET: 'TACS_AUDIT_MORADORES'");
const safeMetaHeaders=['ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO','DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','ESCOPO_A','ESCOPO_B','ESCOPO_C','CRIADO_EM','ATUALIZADO_EM','OPERADOR_INTERNO','ORIGEM_CADASTRO'];
const safeAuditHeaders=['EVENTO_INTERNO','ID_REFERENCIA','TIPO_EVENTO','ESCOPO_A','ESCOPO_B','ESCOPO_C','OPERADOR_INTERNO','CAMPOS_EVENTO','REGISTRADO_EM'];
const aliases={
  nome:['nome','nome completo','nome do morador','morador','nome da pessoa','usuario','usuário'],
  nascimento:['data de nascimento','nascimento','data nascimento','dt nascimento','dn','data nasc'],
  cpf:['cpf','numero do cpf','número do cpf','cpf do morador','documento cpf'],
  cns:['cns','cartao nacional de saude','cartão nacional de saúde','cartao sus','cartão sus','numero do cns','número do cns','numero do cartao sus','número do cartão sus'],
  localidade:['localidade','comunidade','endereco','endereço','endereco completo','endereço completo','onde mora','sitio','sítio','area','área','microarea','microárea'],
  nomeMae:['nome da mae','nome da mãe','mae','mãe','nome mae','mãe','genitora','nome da genitora','filiacao mae','filiação mãe','filiacao materna','filiação materna','filiacao 1','filiação 1'],
  nomePai:['nome do pai','pai','nome pai','genitor','nome do genitor','filiacao pai','filiação pai','filiacao paterna','filiação paterna','filiacao 2','filiação 2']
};
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function locate(headers,list){const wanted=list.map(norm);for(let i=0;i<headers.length;i++)if(wanted.includes(norm(headers[i])))return i;for(let c=0;c<headers.length;c++){const key=norm(headers[c]);if(!key)continue;for(const alias of wanted){if(alias.length<6)continue;if(key.includes(alias)||alias.includes(key))return c}}return -1}
function publicDetectorScore(headers){const map={};Object.keys(aliases).forEach(k=>map[k]=locate(headers,aliases[k]));let score=0;if(map.cpf>=0||map.cns>=0)score+=6;if(map.nome>=0)score+=4;if(map.nascimento>=0)score+=2;if(map.localidade>=0)score+=1;if(map.nomeMae>=0)score+=3;if(map.nomePai>=0)score+=3;return score}
assert(publicDetectorScore(safeMetaHeaders)<8,'A aba de metadados poderia ser confundida com cadastro público.');
assert(publicDetectorScore(safeAuditHeaders)<8,'A aba de auditoria poderia ser confundida com cadastro público.');
safeMetaHeaders.forEach(h=>has(backend,`'${h}'`));
safeAuditHeaders.forEach(h=>has(backend,`'${h}'`));

const keyFn=(backend.match(/function moradoresAdminV1ChaveRegistro_\(morador\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(keyFn,'origem.linha');
lacks(keyFn,'origem.aba');
has(keyFn,'moradoresAdminV1ChaveIdentidade_(morador)');
has(backend,'chaveAnterior:chaveAnterior');
has(backend,"'MOR-'+Utilities.getUuid()");

has(backend,'function moradoresAdminV1Auditar_(ss,input,contexto)');
has(backend,"acao:criado?'CRIAR_MORADOR':'EDITAR_MORADOR'");
has(backend,"acao:'ALTERAR_SITUACAO'");
const diagnosticFn=(backend.match(/function testarConfiguracaoMoradoresAdminPortalV1\(\)\{([\s\S]*?)\n\}/)||[])[1]||'';
lacks(diagnosticFn,'moradoresAdminV1GarantirMeta_');
lacks(diagnosticFn,'moradoresAdminV1GarantirAuditoria_');
has(diagnosticFn,'totalColunas:fonte.sheet.getLastColumn()');
has(diagnosticFn,'colunasMapeadas:');
has(diagnosticFn,'nenhumaAlteracaoRealizada:true');

// Novo cadastro toca apenas as colunas reconhecidas e preserva colunas auxiliares desconhecidas.
const addFn=(backend.match(/function moradoresAdminV1AdicionarLinha_\(fonte,dados\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(addFn,'moradoresAdminV1SetCell_(sheet,row,fonte.map.nome,dados.nome)');
has(addFn,'moradoresAdminV1SetCell_(sheet,row,fonte.map.nascimento');
has(addFn,'moradoresAdminV1SetCell_(sheet,row,fonte.map.cpf');
has(addFn,'moradoresAdminV1SetCell_(sheet,row,fonte.map.cns');
lacks(addFn,'.setValues(','Novo cadastro não deve reescrever a linha inteira.');
lacks(addFn,'new Array(','Novo cadastro não deve montar uma linha inteira artificial.');

// Pré-validação técnica acontece antes de tocar no cadastro real.
const saveFn=(backend.match(/function moradoresAdminV1Salvar_\(p,contexto\)\{([\s\S]*?)\n\}/)||[])[1]||'';
const preMeta=saveFn.indexOf('moradoresAdminV1GarantirMeta_(fonte.ss)');
const preAudit=saveFn.indexOf('moradoresAdminV1GarantirAuditoria_(fonte.ss)');
const residentWrite=Math.min(...['moradoresAdminV1EscreverLinha_(','moradoresAdminV1AdicionarLinha_('].map(x=>{const i=saveFn.indexOf(x);return i<0?Number.MAX_SAFE_INTEGER:i}));
assert(preMeta>=0&&preAudit>=0&&residentWrite<Number.MAX_SAFE_INTEGER&&preMeta<residentWrite&&preAudit<residentWrite,'Estruturas técnicas devem ser validadas antes da escrita do morador.');

// Situação também é serializada por LockService.
const situationFn=(backend.match(/function moradoresAdminV1Situacao_\(p,contexto\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(situationFn,'LockService.getScriptLock()');
has(situationFn,'lock.tryLock(15000)');
has(situationFn,'lock.releaseLock()');

// A resposta do iframe precisa gerar fechamento de script válido no HTML final.
const responderFn=(backend.match(/function moradoresAdminV1ResponderPost_\(requestId,resultado\)\{([\s\S]*?)\n\}/)||[])[1]||'';
has(responderFn,'<\\/script>','Responder POST deve usar o escape HTML já validado nos outros módulos.');
lacks(responderFn,'<\\\\/script>','Responder POST não pode produzir barra extra antes de /script.');

has(backend,"RESULT_PREFIX: 'tacs_moradores_v11_result_'");
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

has(docs,'CSV não é obrigação do agente');
has(docs,'Administrador Geral poderá importar/atualizar o CSV em nome do agente');
has(docs,'PENDENTE');
has(docs,'APROVADO');
has(docs,'SUSPENSO');
has(docs,'CNS/matrícula são dados de vínculo, **não senha**');
has(docs,'Cada área terá uma fonte de moradores autorizada pelo servidor');
has(docs,'não poderão alterar layout, identidade, código, segurança ou funcionalidades centrais');

assert.strictEqual(gate.version,'1.1.0');
assert.strictEqual(gate.productionBase,'2f5136f52d59cc4a6cf188c0527f56cce3858c79');
assert.strictEqual(gate.architectureReview,'COMPLETED');
assert.strictEqual(gate.serverResolvedScopeFoundation,'COMPLETED');
assert.strictEqual(gate.stableResidentIdentityFoundation,'COMPLETED');
assert.strictEqual(gate.oneResidentSourcePerAreaRule,'COMPLETED');
assert.strictEqual(gate.permissionsFoundation,'COMPLETED');
assert.strictEqual(gate.auditTrailFoundation,'COMPLETED');
assert.strictEqual(gate.agentSelfRegistration,'SPECIFIED_NOT_IMPLEMENTED');
assert.strictEqual(gate.adminAssistedAgentSetup,'SPECIFIED_NOT_IMPLEMENTED');
assert.strictEqual(gate.dailyCrudWrites,'LOCKED');
assert.strictEqual(gate.statusWrites,'LOCKED');
assert.strictEqual(gate.publicStatusFilter,'NOT_STARTED');
assert.strictEqual(gate.csvReconciliation,'NOT_STARTED');
assert.strictEqual(gate.multiAreaRuntime,'NOT_STARTED');
assert.strictEqual(gate.mainMerge,'NOT_STARTED');
assert.strictEqual(gate.releaseAllowed,false);

console.log('OK — Moradores Admin V1.1: escopo servidor, identidade, auditoria, escrita conservadora, iframe e gates validados.');
