# CSC — Solicitação para outro morador (2026-11-22)

## Situação em produção — verificada em 22/11/2026
- **Backend:** Apps Script publicado como versão **286** (versão anterior preservada: 285). Workflow de implantação seletiva #45035780158 concluiu com sucesso.
- **Frontend:** `window.CSC_TERCEIROS_ENABLED=true` na `main`; GitHub Pages publicou a página ativa.
- **Rede real:** rota de resultado `csc_terceiros_result` e `portal_manutencao_status` responderam corretamente.
- **Navegador publicado:** workflow #45036085178 concluiu com sucesso em Chromium e WebKit; abertura local do formulário em 0,6 ms e 1,0 ms, respectivamente, em testes automatizados de dispositivo móvel.
- **Pendência:** envio autenticado de pedido verdadeiro por morador autorizado, conferência do registro na fila da UBS e da abertura do WhatsApp. Os testes no navegador usaram credenciais simuladas apenas para visualizar o botão, sem pedidos reais.
- A matriz geral de qualidade do repositório possui falha anterior de auditoria da dependência `source-map-js`; o teste específico CSC foi aprovado.

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

## Homologação e acompanhamento após ativação
1. Confirmar que a versão corrente do portal e da implantação Apps Script é a esperada; registrar os identificadores e manter forma de reversão.
2. Implantar a rota backend isolada em ambiente de teste, sem executar o workflow de substituição total de módulos.
3. Validar, com cadastros de teste autorizados, CPF existente, CPF sem registro, confirmação por nascimento, nomes coincidentes e pessoas fora da área.
4. Validar sessão PIN do solicitante e assegurar ausência de convite para criar PIN do beneficiário.
5. Simular envio interrompido/repetido: a UBS deve receber apenas um registro; WhatsApp deve mostrar o mesmo código.
6. Confirmar entrega na UBS, identificação de solicitante/beneficiário e eventual Push, sem leitura indevida de dados de terceiros.
7. Validar no Safari/iPhone e no PWA, com fontes grandes e contraste legível; conferir abertura do botão, campos, teclado numérico e desempenho.
8. Verificar que o fluxo regular do morador, listas familiares, agenda médica, nutricionista, odontologia, notificações, PIN e Central administrativa não sofrem mudanças.
9. **Executado:** backend v286 publicado antes da ativação; `CSC_TERCEIROS_ENABLED=true` publicado depois. Manter rollback pronto.

## Testes automatizados
`node scripts/test_csc_terceiros_v1.js`

Os testes usam registros simulados: não produzem operações reais e não substituem homologação em Apps Script.

## Rollback
- Voltar `CSC_TERCEIROS_ENABLED=false` no `index.html` para ocultar imediatamente a nova função, sem modificar PIN/cadastros do portal.
- Se necessário, restaurar versão anterior do Apps Script após conferir as rotas e logs.

## Correção de UX — envio único (22/11/2026)
- O botão padrão `Enviar solicitação` do formulário original é o único controle de envio, inclusive para terceiros.
- Removido o segundo botão `ENVIAR CARTÃO OFICIAL PELO WHATSAPP` do fluxo de terceiros.
- O compartilhamento do cartão original CSC e o registro do pedido na UBS iniciam em paralelo, sem esperar pela leitura síncrona da planilha antes de abrir o WhatsApp.
- O cartão é pré-gerado após a escolha do serviço para permitir a chamada do compartilhamento no próprio gesto do iPhone, quando disponível.
- Registro da UBS e entrega do WhatsApp são estados independentes; testes não autorizam afirmar que o usuário efetivamente concluiu o compartilhamento.

## Agilidade após PIN — 22/11/2026
- Diagnóstico: o recarregamento após o PIN repetia um splash fixo de 2,8 s; a função de terceiros só era montada após a cadeia de scripts, e ainda verificava credenciais a cada 900 ms.
- Ajuste localizado: se já existe sessão `cms1` vinculada ao dispositivo, a abertura animada é omitida no retorno autenticado; permanece intacta no primeiro acesso.
- O módulo de terceiros é carregado sem bloquear os scripts do portal, assim que o formulário já existe, antes das integrações legadas.
- O evento `tacs:morador` exibe o módulo imediatamente após a sessão; fallback limitado a 100 ms por até 10 s apenas durante inicialização.
- PIN, servidor, proteção dos dados, formulário, agenda, card e envio único mantidos sem alteração.
- Homologação: testes de carga do módulo antes do evento DOMContentLoaded, desbloqueio após o evento de sessão e comportamento do splash após autenticação.
