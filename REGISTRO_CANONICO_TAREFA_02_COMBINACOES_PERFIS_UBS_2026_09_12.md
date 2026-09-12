# Registro canônico — Tarefa 02 — Combinações de perfis com UBS

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E PUBLICADA; VALIDAÇÃO VISUAL DO USUÁRIO PENDENTE

## Autorização
O usuário encerrou a Tarefa 1 como bem-sucedida e autorizou o início da Tarefa 2, mantendo execução sequencial e sem avançar para a próxima tarefa antes dos testes e registros.

## Objetivo exclusivo
Ampliar o cadastro funcional para representar combinações envolvendo UBS, mantendo todos os perfis anteriores e **UBS pura**.

## Quatro portas de entrada
A Tarefa 2 não cria novos botões de entrada.

`Administrador | TACS | Morador | UBS`

As combinações abaixo são identidade funcional do cadastro, não portas adicionais.

## Matriz canônica de 14 perfis
1. Administrador + TACS + UBS + Morador — `ADMIN_TACS_UBS_MORADOR`
2. Administrador + TACS + UBS — `ADMIN_TACS_UBS`
3. Administrador + UBS + Morador — `ADMIN_UBS_MORADOR`
4. TACS + UBS + Morador — `TACS_UBS_MORADOR`
5. Administrador + UBS — `ADMIN_UBS`
6. TACS + UBS — `TACS_UBS`
7. UBS + Morador — `UBS_MORADOR`
8. Administrador + TACS + Morador — `ADMIN_TACS_MORADOR`
9. Administrador + TACS — `ADMIN_TACS`
10. Administrador + Morador — `ADMIN_MORADOR`
11. TACS + Morador — `TACS_MORADOR`
12. TACS — `TACS`
13. Administrador — `ADMIN`
14. UBS — `UBS`

## Regras herdadas por vínculo
- contém `TACS`: CNS, microárea, unidade e regras territoriais TACS permanecem obrigatórias;
- contém `UBS`: função na UBS e unidade vinculada permanecem obrigatórias;
- contém `TACS + UBS`: cumpre simultaneamente os dois conjuntos;
- `UBS` pura permanece válida;
- perfil sem TACS não pode assumir responsabilidade territorial apenas por conter UBS.

## Arquivos funcionais alterados
- `apps-script/ZZZZ_17_TacsAreasAdminV1.gs`;
- `teste-v1/painel-tacs-areas-v1.html`;
- `teste-v1/painel-tacs-areas-v1.js`;
- `central-administrativa-tacs.js` somente para reconhecer os novos rótulos quando recebidos.

## Proteção de escopo
A Tarefa 2 não implementa:
- reconhecimento persistente do computador UBS;
- segunda entrada mostrando apenas o perfil reconhecido;
- modo diagnóstico administrativo;
- vínculo de aparelho de Morador;
- migração dos painéis para módulos;
- qualquer modificação em agendas, vagas, profissionais, campanhas ou moradores.

## Gates
- sintaxe dos arquivos alterados;
- presença dos 14 perfis;
- presença obrigatória de UBS pura;
- validação das regras TACS/UBS em perfis combinados;
- manutenção das quatro portas de entrada;
- ausência de antecipação de reconhecimento persistente de aparelho;
- suíte integral do repositório;
- implantação Apps Script e health checks;
- publicação GitHub Pages e conferência do artefato servido.

## Documentos associados
- `conecta-saude-homologacao/FLUXOGRAMA_ABERTURA_CANONICA.md`;
- `PLANO_CANONICO_MIGRACAO_PAINÉIS_APP_INSTITUCIONAL.md`;
- `CANON_UI_CENTRAL_ADMINISTRATIVA.json`.

## Regra de conclusão
A Tarefa 2 somente poderá ser marcada VALIDADA após todos os gates acima. A Tarefa 3 não deve começar antes disso.


## Resultado da validação
- gate específico: `TAREFA_2_COMBINACOES_PERFIS_UBS_OK`;
- suíte integral: aprovada;
- workflow Apps Script: `34713166644`;
- versão Apps Script implantada: `200`;
- health checks: aprovados;
- workflow GitHub Pages: `34713294470`;
- publicação Pages: aprovada;
- UBS pura: preservada e coberta pelo gate;
- quatro portas de entrada: preservadas;
- reconhecimento persistente do aparelho: não antecipado.

A Tarefa 3 permanece não iniciada até o encerramento desta etapa.
