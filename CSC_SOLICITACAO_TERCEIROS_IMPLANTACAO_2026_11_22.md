# CSC — Solicitação para outro morador (2026-11-22)

## Situação
Implementado **somente** na ramificação `feature/csc-solicitacao-terceiros-v1`, PR #197. Não publicado aos moradores. `window.CSC_TERCEIROS_ENABLED=false` por padrão.

## Garantias de isolamento
- O HTML atual recebe apenas um link para o CSS, um indicador de ativação e uma inclusão JavaScript. As funções antigas continuam intactas.
- A nova interface tem prefixos `cscTerceiros`, CSS restrito ao ID `#cscTerceiros` e campos próprios. Nenhum campo com ID `cpf`, `name` ou `category` do portal original é alterado.
- A rota `csc_terceiros_buscar` e a rota `csc_terceiros_enviar` exigem sessão real `cms1`, aparelho válido e território `JAPARANDUBA`.
- CPF/CNS não localizado pode ser associado a um cadastro encontrado por nascimento (e nome, se ambíguo), **somente para a solicitação**. Não grava CPF na planilha nem cria PIN.
- Beneficiário e solicitante são diferenciados por dados territoriais e ID do acesso do solicitante, com código de solicitação idempotente.
- O pedido é gravado no painel da UBS e o botão do WhatsApp é apresentado após resposta positiva do servidor.
- Solicitações que envolvem consulta e vaga **não confirmam reserva automaticamente**. É um pedido dirigido à UBS.

## Desempenho
- Abertura do formulário é inteiramente local, sem requisição ao servidor e sem recarregar a página.
- O módulo executa uma leitura territorial por operação, compartilhada entre identificação do titular e beneficiário, sem criar cache persistente de terceiros.
- Requisições são assíncronas, com feedback imediato, anti-duplo-clique e consulta por código; a latência real depende do Apps Script/planilha e precisa ser medida no iPhone.

## Homologação necessária ANTES de ativar
1. Confirmar que a versão corrente do portal e da implantação Apps Script é a esperada; registrar os identificadores e manter forma de reversão.
2. Implantar a rota backend isolada em ambiente de teste, sem executar o workflow de substituição total de módulos.
3. Validar, com cadastros de teste autorizados, CPF existente, CPF sem registro, confirmação por nascimento, nomes coincidentes e pessoas fora da área.
4. Validar sessão PIN do solicitante e assegurar ausência de convite para criar PIN do beneficiário.
5. Simular envio interrompido/repetido: a UBS deve receber apenas um registro; WhatsApp deve mostrar o mesmo código.
6. Confirmar entrega na UBS, identificação de solicitante/beneficiário e eventual Push, sem leitura indevida de dados de terceiros.
7. Validar no Safari/iPhone e no PWA, com fontes grandes e contraste legível; conferir abertura do botão, campos, teclado numérico e desempenho.
8. Verificar que o fluxo regular do morador, listas familiares, agenda médica, nutricionista, odontologia, notificações, PIN e Central administrativa não sofrem mudanças.
9. Publicar primeiro o backend homologado, e **somente depois** definir `CSC_TERCEIROS_ENABLED=true` em uma alteração controlada do `index.html`, com revisão e rollback pronto.

## Testes automatizados
`node scripts/test_csc_terceiros_v1.js`

Os testes usam registros simulados: não produzem operações reais e não substituem homologação em Apps Script.

## Rollback
- Voltar `CSC_TERCEIROS_ENABLED=false` no `index.html` para ocultar imediatamente a nova função, sem modificar PIN/cadastros do portal.
- Se necessário, restaurar versão anterior do Apps Script após conferir as rotas e logs.
