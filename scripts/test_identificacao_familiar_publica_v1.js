'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const backend=read('apps-script/ZZZZ_43_IdentificacaoFamiliarPublicaV1.gs');
const selection=read('apps-script/ZZZZ_44_SelecaoMembroFamiliaPublicaV1.gs');
const frontend=read('portal-identificacao-familia-v1.js');
const loader=read('portal-auto-update.js');
const build=read('scripts/build_apps_script_release.js');
new vm.Script(backend,{filename:'ZZZZ_43_IdentificacaoFamiliarPublicaV1.gs'});
new vm.Script(selection,{filename:'ZZZZ_44_SelecaoMembroFamiliaPublicaV1.gs'});
new vm.Script(frontend,{filename:'portal-identificacao-familia-v1.js'});

const sandbox={console};vm.createContext(sandbox);new vm.Script(backend).runInContext(sandbox);
assert.equal(sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_('34'),'034');
assert.equal(sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_('034'),'034');
assert.equal(sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_('02'),'002');
assert.equal(sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_('002'),'002');

assert.match(backend,/publico_familia_consultar/);
assert.match(backend,/requerConfirmacao:true/,'Família sem aparelho vinculado precisa exigir confirmação por documento.');
assert.match(backend,/identificacaoFamiliarPublicaV1AparelhoDaFamilia_/);
assert.match(backend,/identificacaoFamiliarPublicaV1DocumentoConfirmaFamilia_/);
assert.match(backend,/moradoresAdminV1AreasPublicas_\(areaId\)/,'A consulta familiar deve permanecer presa à área pública solicitada.');
assert.match(backend,/publico_documento_complementar/);
assert.match(backend,/já possui .* registrado/,'Documento existente não pode ser substituído pelo portal público.');
assert.match(backend,/DocumentoJaExiste_/,'Documento novo precisa ser único antes de gravar.');
assert.match(backend,/COMPLEMENTAR_.*_PORTAL_PUBLICO/,'Complemento documental precisa deixar auditoria.');
assert.match(backend,/moradoresAdminV1InvalidarResumo_/);

assert.match(selection,/TOKEN_SECONDS:900/);
assert.match(selection,/publico_familia_membro/);
assert.match(selection,/token:token,nome:item\.nome,nascimento:item\.nascimento,temDocumento/,'A lista familiar deve devolver token, nome e nascimento, sem documento completo.');
assert.doesNotMatch(selection,/return \{token:token[^\n]*cpf|return \{token:token[^\n]*cns/i,'CPF/CNS não podem aparecer na lista de integrantes.');
assert.match(selection,/documentoAcesso:documento/,'Documento só pode ser liberado após selecionar o integrante pelo token temporário.');
assert.match(selection,/CodigoMorador_\(registro\.morador\)!==familia/,'Seleção deve revalidar a família antes de liberar o integrante.');

assert.match(frontend,/CPF, Cartão SUS \(CNS\) ou cadastro da família/);
assert.match(frontend,/Buscar esta família/);
assert.match(frontend,/Quem precisa do atendimento\?/);
assert.match(frontend,/data-member-token/);
assert.match(frontend,/publico_familia_consultar/);
assert.match(frontend,/publico_familia_membro/);
assert.match(frontend,/Salvar .* neste cadastro/);
assert.match(frontend,/O Portal só preenche campo vazio/);
assert.match(frontend,/documentoLocalizador/);
assert.match(frontend,/documentoNovo/);
assert.match(frontend,/OneSignalDeferred/,'A consulta pode aproveitar o vínculo familiar do aparelho sem alterar o Push.');

assert.match(loader,/portal-identificacao-familia-v1\.js\?v=20260820-v1/);
assert.match(loader,/isAdminPage\(\)\|\|document\.getElementById/,'A nova camada não deve ser carregada nos painéis administrativos.');
assert.match(build,/ZZZZ_43_IdentificacaoFamiliarPublicaV1\.gs/);
assert.match(build,/TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1/);
assert.match(build,/ZZZZ_44_SelecaoMembroFamiliaPublicaV1\.gs/);
assert.match(build,/TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1/);

console.log('Identificação familiar pública V1: 02/002, 34/034, isolamento, seleção segura e complemento documental validados.');
