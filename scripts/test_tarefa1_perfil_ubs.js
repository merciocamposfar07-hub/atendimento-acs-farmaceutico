'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8');}

const access=read('conecta-acesso-unificado-v1.js');
const form=read('teste-v1/painel-tacs-areas-v1.html');
const formJs=read('teste-v1/painel-tacs-areas-v1.js');
const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const central=read('central-administrativa-tacs.html');
const centralJs=read('central-administrativa-tacs.js');

new Function(access);
new Function(formJs);
new Function(territory);
new Function(backend);
new Function(centralJs);

// Entrada da UBS: somente PIN, sem CPF.
assert.match(access,/b\.id='tabUbs'/);
assert.match(access,/b\.textContent='UBS'/);
assert.match(access,/\.login-tabs\.csc-four\{grid-template-columns:repeat\(4/);
assert.match(access,/field\('cscUbsPin'/);
assert.doesNotMatch(access,/field\('cscUbsCpf'/);
assert.doesNotMatch(access,/Primeiro acesso da UBS/);
assert.match(access,/function loginUbsAccess\(\)/);
assert.match(access,/post\('conecta_ubs_login_pin'/);

// Compatibilidade de cache e backend também usam PIN; a unidade é o único vínculo obrigatório.
assert.match(backend,/function conectaAcessoV1UbsPorPin_/);
assert.match(backend,/function conectaAcessoV1LoginUbs_/);
assert.match(backend,/function conectaAcessoV1IdentificarUbsPrimeiroAcesso_\(p\)[\s\S]*return conectaAcessoV1LoginUbs_\(p\|\|\{\}\)/);
assert.match(backend,/O cadastro UBS precisa de uma unidade de saúde válida/);
assert.doesNotMatch(backend,/O cadastro UBS precisa de unidade e função válidas/);

// Administrador autenticado acessa a lista de UBS sem credencial da unidade.
assert.match(central,/data-module="ubs" data-admin-only="true"/);
assert.match(centralJs,/function showAdminUbs\(/);
assert.match(centralJs,/Apenas visualizar/);
assert.match(centralJs,/data-ubs-mode="edit"/);
assert.match(centralJs,/Unidade de saúde, PIN, perfil e permissões/);

// Cadastro UBS institucional: ao selecionar PERFIL UBS puro, não é cadastro de pessoa física.
assert.match(form,/Administrador \/ TACS \/ UBS/);
assert.match(form,/value="UBS">UBS<\/option>/);
assert.match(form,/class="wide csc-person-field"><label for="tacsName">Nome completo/);
assert.match(form,/class="csc-person-field"><label for="tacsBirth">Data de nascimento/);
assert.match(form,/class="csc-person-field"><label for="tacsCpf">CPF/);
assert.match(form,/class="csc-person-field"><label for="tacsPhone">Celular/);
assert.match(form,/class="csc-person-field"><label for="tacsEmail">E-mail/);
assert.match(form,/id="tacsUnit"/);
assert.match(form,/PIN de acesso à plataforma/);
assert.match(form,/id="tacsPermissionsBlock"/);
assert.match(formJs,/function isInstitutionalUbsProfile\(v\)\{return normalizeAccessProfile\(v\)==='UBS';\}/);
assert.match(formJs,/querySelectorAll\('#tacsForm \.csc-person-field'\)/);
assert.match(formJs,/ubsInstitucional\?'':el\('tacsName'\)\.value/);
assert.match(formJs,/cpf:ubsInstitucional\?'':cpf/);
assert.match(formJs,/telefone:ubsInstitucional\?'':phone/);
assert.match(formJs,/funcaoUbs:\(isUbs&&!ubsInstitucional\)\?/);

// Persistência: UBS puro dispensa e limpa dados pessoais, mantendo unidade, PIN e permissões.
assert.match(territory,/var ubsInstitucional=perfil==='UBS';/);
assert.match(territory,/var nome=ubsInstitucional\?'':/);
assert.match(territory,/var cpf=ubsInstitucional\?'':/);
assert.match(territory,/var dataNascimento=ubsInstitucional\?'':/);
assert.match(territory,/var telefone=ubsInstitucional\?'':/);
assert.match(territory,/if\(!ubsInstitucional\)\{[\s\S]*Informe o nome completo/);
assert.match(territory,/if\(temUbs\)\{[\s\S]*Informe a unidade de saúde do perfil UBS/);
assert.match(territory,/if\(!ubsInstitucional&&!funcaoUbs\)throw new Error\('Informe a função do responsável na UBS\.'/);
assert.match(territory,/var permissoes=\(temTacs\|\|temUbs\)/);

// Contrato pedido: perfil UBS + unidade + PIN + permissões; o controle ativo/inativo existente é preservado.
console.log('TAREFA_1_PERFIL_UBS_OK: UBS é cadastro institucional, sem dados de pessoa física; computador entra somente por PIN e Administrador pode usar PIN administrativo ou PIN da UBS.');
