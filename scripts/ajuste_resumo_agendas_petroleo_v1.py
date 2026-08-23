from pathlib import Path

ARQUIVO = Path('painel-oficial-agendas-vagas.html')
MARCADOR = 'AJUSTE_RESUMO_AGENDAS_PETROLEO_V1'

texto = ARQUIVO.read_text(encoding='utf-8')

if MARCADOR not in texto:
    css = r'''
/* AJUSTE_RESUMO_AGENDAS_PETROLEO_V1 */
/* Escopo fechado: somente os 4 balões-resumo de Agendas e vagas. */
#resumo.resumo .numero{
  background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important;
  border:2px solid #69c7e7!important;
  color:#fff!important;
  box-shadow:0 8px 18px rgba(7,58,85,.18)!important;
}
#resumo.resumo .numero strong{
  color:#fff!important;
}
#resumo.resumo .numero span{
  color:#d8eef7!important;
}
'''
    pos = texto.find('</style>')
    if pos < 0:
        raise RuntimeError('Bloco </style> não encontrado.')
    texto = texto[:pos] + css + '\n' + texto[pos:]
    ARQUIVO.write_text(texto, encoding='utf-8')

final = ARQUIVO.read_text(encoding='utf-8')
assert MARCADOR in final
assert '#resumo.resumo .numero{' in final
assert 'background:linear-gradient(145deg,var(--petroleo),var(--petroleo2))!important' in final
assert 'border:2px solid #69c7e7!important' in final
assert '#resumo.resumo .numero strong' in final and 'color:#fff!important' in final
assert '#resumo.resumo .numero span' in final and 'color:#d8eef7!important' in final

# Garante que os quatro contadores e a lógica principal continuam presentes.
for identificador in ('qAgendas', 'qAtivas', 'qProf', 'qVagas'):
    assert f'id="{identificador}"' in final
for trecho in ('function render()', 'function salvarAgenda(c)', 'function restaurar()', "post('admin_dados'", "post('admin_salvar_agenda'"):
    assert trecho in final

# A alteração é estritamente CSS; não renomeia nem remove nenhum contador.
assert final.count('class="numero"') == 4
print('AJUSTE_RESUMO_AGENDAS_PETROLEO_V1_OK')