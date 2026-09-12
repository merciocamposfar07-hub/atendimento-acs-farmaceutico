# Tarefa 3 — identidade real após autenticação

Data: 12/09/2026
Status: suíte completa aprovada localmente; validação no GitHub e implantação pendentes.

## Autorização
O usuário autorizou concluir a tarefa 3 e continuar as demais uma por uma, somente após comprovação dos testes no GitHub e aviso ao terminar cada etapa.

## Contrato
- Nome completo e perfil funcional vêm da identidade autenticada, não do responsável pela área nem de uma lista com um único administrador.
- `usuarioAtual` no contexto é selecionado pelo identificador pessoal confirmado no servidor. O modo operacional e as permissões permanecem independentes do rótulo visual.
- Administrador: cadastro correspondente a identificador pessoal da sessão; alternativamente, identidade nominal explícita devolvida pela autenticação. Ausência ou ambiguidade não autoriza adivinhar a pessoa.
- TACS: cadastro correspondente a `acesso.tacsId`, preservando combinações funcionais.
- UBS: confirmação por CPF/PIN devolve `perfilCadastrado` completo. Nenhum vínculo permanente é criado nesta tarefa.
- Morador: barra autenticada mostra nome completo e rótulo Morador.
- Nomes completos com acentuação, quebra de linha e contraste; nunca interpretar nomes como HTML.
- Sem identidade confirmada: mensagem visível de identificação indisponível, mantendo a sessão.
- Requisito adicional solicitado: o painel de cadastro mostra "Aguarde, carregando dados…" fora da seção oculta; em falha mostra a mensagem recebida; rodapé preservado.

## Validação
O teste `scripts/test_tarefa3_identidade_real.js` executa resolução de identidade, seleção independente da área, ambiguidades, rótulos combinados, nomes longos/HTML seguro e autenticação UBS com PIN correto/incorreto.
A suíte completa inclui esse teste. Dados de teste são fictícios e não alteram cadastros reais.

## Limitações que impedem afirmar validação final
- Uma sessão administrativa antiga que não devolva nome nem identificador pessoal não permite comprovar a identidade real. O código informa a ausência, sem substituir por um administrador da lista.
- Testes locais ou no GitHub não substituem validação autenticada com dados reais nem a conferência no iPhone, Android e computador UBS.
- Tarefas 4 a 18 não são consideradas implementadas por este registro.
