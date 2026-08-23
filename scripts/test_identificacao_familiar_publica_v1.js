'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const backend=read('apps-script/ZZZZ_43_IdentificacaoFamiliarPublicaV1.gs');
const selection=read('apps-script/ZZZZ_44_SelecaoMembroFamiliaPublicaV1.gs');
const familySearch=read('apps-script/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs');
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
assert.match(backend,/moradoresAdminV1CatalogoAreas_\(\).*ativa!==false/,'A duplicidade deve ser verificada em todas as áreas ativas cadastradas no Portal TACS.');
assert.match(backend,/COMPLEMENTAR_.*_PORTAL_PUBLICO/,'Complemento documental precisa deixar auditoria.');
assert.match(backend,/moradoresAdminV1InvalidarResumo_/);
assert.doesNotMatch(backend,/appendRow\([^\n]*morador/i,'Complementar CPF/CNS não pode criar uma nova linha de morador.');

assert.match(familySearch,/function buscaEnvioFamiliaV1BuscarExata_/);
assert.match(familySearch,/resultados\.push\(item\)/,'A busca familiar deve incluir cada integrante ativo localizado.');
assert.match(familySearch,/moradoresAdminV1EstaOculto_\(morador,meta\)\)continue/,'Morador inativo/oculto não pode aparecer na família pública.');
assert.match(familySearch,/MAX_SEARCH_RESULTS/,'A proteção de volume da busca familiar deve permanecer explícita.');

assert.match(selection,/TOKEN_SECONDS:900/);
assert.match(selection,/publico_familia_membro/);
assert.match(selection,/return \{token:token,nome:item\.nome,nascimento:item\.nascimento,temDocumento:/,'A lista familiar deve devolver token, nome e nascimento para todos os integrantes retornados.');
assert.doesNotMatch(selection,/return \{token:token[^\n]*(?:cpf:|cns:)/i,'CPF/CNS não podem ser campos da lista de integrantes.');
assert.match(selection,/documentoAcesso:documento/,'Documento só pode ser liberado após selecionar o integrante pelo token temporário.');
assert.match(selection,/CodigoMorador_\(registro\.morador\)!==familia/,'Seleção deve revalidar a família antes de liberar o integrante.');

assert.match(frontend,/CPF, Cartão SUS \(CNS\) ou cadastro da família/);
assert.match(frontend,/Buscar esta família/);
assert.match(frontend,/De quem é este/,'Documento não localizado deve levar à escolha explícita do proprietário.');
assert.match(frontend,/data-member-token/);
assert.match(frontend,/publico_familia_consultar/);
assert.match(frontend,/publico_familia_membro/);
assert.match(frontend,/documentoLocalizador/);
assert.match(frontend,/documentoNovo/);
assert.match(frontend,/var candidate=pendingMissing,candidateType=pendingType/,'O documento não localizado precisa sobreviver até a seleção do integrante.');
assert.match(frontend,/complementDocument\(localizer,candidate,function\(\)\{fillSelectedDocument\(candidate,r\.nome\)\}\)/,'Somente o integrante escolhido pode fornecer o documento localizador usado para vincular o novo CPF/CNS.');
assert.match(frontend,/candidateType!==localizerType/,'O Portal só pode complementar o outro tipo de documento; não pode substituir CPF por CPF nem CNS por CNS.');
assert.match(frontend,/pendingMissing='';pendingType='';pendingOwnerLookup='';setDocBox\('<strong class="tacs-family-title">✓ Cadastro atualizado/,'O documento pendente só deve ser descartado após gravação confirmada.');
assert.doesNotMatch(frontend,/function searchFamily\([^)]*\)\{pendingMissing=''/,'Entrar na família não pode apagar o CPF/CNS informado antes.');
assert.doesNotMatch(frontend,/function selectMember\([^)]*\)\{pendingMissing=''/,'Selecionar integrante não pode apagar o CPF/CNS antes de usá-lo.');
assert.match(frontend,/FAMILY_STORAGE_PREFIX='portalTacsFamiliaAutofillV1:'/,'A família já conhecida pelo navegador deve ser reaproveitada sem pedir o número novamente.');
assert.match(frontend,/function rememberedFamily\(\)/);
assert.match(frontend,/setTimeout\(startOwnerSelection,0\)/,'Após CPF/CNS não localizado, o Portal deve iniciar a seleção segura do proprietário.');
assert.match(frontend,/pendingMissing&&current===pendingMissing/,'Um render atrasado do campo não pode esconder a escolha do proprietário do documento pendente no WebKit.');
assert.match(frontend,/documento ficará guardado somente nesta tela/,'Sem família conhecida, o documento pode ficar apenas em memória enquanto o usuário confirma a família.');
assert.doesNotMatch(frontend,/localStorage\.setItem\([^\n]*(?:pendingMissing|documentoNovo)/i,'CPF/CNS não localizado não pode ser persistido no navegador.');
assert.match(frontend,/OneSignalDeferred/,'A consulta pode aproveitar o vínculo familiar do aparelho sem alterar o Push.');

assert.match(loader,/portal-identificacao-familia-v1\.js\?v=[^\"']+/,'O carregador familiar precisa ter cache-buster explícito.');
assert.match(loader,/isAdminPage\(\)\|\|document\.getElementById/,'A camada familiar não deve ser carregada nos painéis administrativos.');
assert.match(build,/ZZZZ_43_IdentificacaoFamiliarPublicaV1\.gs/);
assert.match(build,/TACS_IDENTIFICACAO_FAMILIAR_PUBLICA_V1/);
assert.match(build,/ZZZZ_44_SelecaoMembroFamiliaPublicaV1\.gs/);
assert.match(build,/TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1/);

console.log('Identificação familiar pública V1: documento pendente preservado em memória, proprietário escolhido por token, complemento em campo vazio, unicidade territorial e auditoria validados.');
