from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def ler(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def gravar(rel, texto):
    (ROOT / rel).write_text(texto, encoding='utf-8')


# 1) Desativa definitivamente a antiga ação que somava +1 dia em lote.
plus_rel = 'apps-script/ZZZZ_23_CorrecaoNascimentoMaisUmDiaV1.gs'
plus = ler(plus_rel)
if "DESATIVADA: true," not in plus:
    anchor = "  VERSAO: '1.0.0',\n"
    if anchor not in plus:
        raise SystemExit('Âncora da configuração +1 dia não encontrada.')
    plus = plus.replace(anchor, anchor + "  DESATIVADA: true,\n", 1)

preview_old = "    podeAplicar:!plano.jaAplicada&&plano.validas>0&&plano.invalidas.length===0&&plano.formulas.length===0,"
if preview_old in plus:
    plus = plus.replace(preview_old, "    podeAplicar:false,", 1)
elif "    podeAplicar:false," not in plus:
    raise SystemExit('Âncora podeAplicar da correção +1 dia não encontrada.')

apply_anchor = "function correcaoNascimentoV1Aplicar_(p,contexto){\n"
guard = (
    "  if(TACS_CORRECAO_NASCIMENTO_V1.DESATIVADA){\n"
    "    throw new Error('A correção histórica de +1 dia foi desativada permanentemente. A data de nascimento deve ser tratada como data civil e somente um backup comprovado pode restaurar valor anterior.');\n"
    "  }\n"
)
if guard not in plus:
    if apply_anchor not in plus:
        raise SystemExit('Função de aplicação da correção +1 dia não encontrada.')
    plus = plus.replace(apply_anchor, apply_anchor + guard, 1)

gravar(plus_rel, plus)

# 2) Inclui a proteção de leitura no pacote oficial do Apps Script.
build_rel = 'scripts/build_apps_script_release.js'
build = ler(build_rel)
marker = "TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1"
if marker not in build:
    old = """  {
    source: 'apps-script/ZZZZ_49_SaneamentoHistoricoAparelhoTacsV1.gs',
    marker: 'TACS_SANEAMENTO_HISTORICO_APARELHO_V1'
  }
];
"""
    new = """  {
    source: 'apps-script/ZZZZ_49_SaneamentoHistoricoAparelhoTacsV1.gs',
    marker: 'TACS_SANEAMENTO_HISTORICO_APARELHO_V1'
  },
  {
    source: 'apps-script/ZZZZ_50_NascimentoCivilBackupGuardV1.gs',
    marker: 'TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1'
  }
];
"""
    if old not in build:
        raise SystemExit('Âncora final da lista de módulos Apps Script não encontrada.')
    build = build.replace(old, new, 1)
    gravar(build_rel, build)

# 3) Torna o teste da proteção parte do gate integral de produção.
package_rel = 'package.json'
package = ler(package_rel)
novo_teste = 'node scripts/test_nascimento_civil_backup_guard_v1.js'
if novo_teste not in package:
    old = 'node scripts/test_birth_plus_one_fix.js && node scripts/test_portal_maintenance.js'
    new = 'node scripts/test_birth_plus_one_fix.js && node scripts/test_nascimento_civil_backup_guard_v1.js && node scripts/test_portal_maintenance.js'
    if old not in package:
        raise SystemExit('Âncora do teste de nascimento no package.json não encontrada.')
    package = package.replace(old, new, 1)
    gravar(package_rel, package)

# 4) Solicita implantação somente após o workflow validar as alterações acima.
release_rel = '.github/apps-script-release-request'
gravar(release_rel, 'NASCIMENTO_CIVIL_BACKUP_GUARD_V1_20260827_DEPLOY1\n')

print('NASCIMENTO_CIVIL_BACKUP_GUARD_V1_APLICADO')
