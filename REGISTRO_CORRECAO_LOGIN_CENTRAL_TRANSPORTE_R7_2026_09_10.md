# Registro de correção — Login da Central / Transporte R7

Data: 10/09/2026

## Problema observado no iPhone

Após digitar o PIN administrativo e tocar em **Entrar na Central**, a interface permanecia aguardando até exibir:

`O servidor demorou para confirmar a operação.`

A mensagem vinha do transporte legado da própria `central-administrativa-tacs.js`, que usava POST em iframe oculto com confirmação/polling menos robustos no Safari.

## Correção aplicada

- Mantido o mesmo endpoint produtivo do Apps Script.
- Mantida a autenticação por PIN e o modelo de sessão existente.
- O PIN continua fora da URL e não é armazenado.
- O iframe de transporte passa a registrar `name` por propriedade e atributo.
- O formulário passa a registrar `target` por propriedade e atributo.
- O POST continua sendo enviado **uma única vez**.
- A submissão é feita somente após o iframe estar registrado no DOM, com dupla `requestAnimationFrame` e fallback de 180 ms.
- A confirmação começa em 450 ms e usa espera progressiva até 1,6 s.
- A resposta direta via `postMessage` continua validando `event.source` contra o iframe da operação.
- O polling continua como fallback sem reenviar o POST.
- A mensagem antiga `O servidor demorou para confirmar a operação.` foi removida do código da Central.
- Foi adicionado aquecimento leve por `admin_status` antes da primeira tentativa de login.
- O HTML da Central recebeu revisão de cache para o Safari carregar o JavaScript corrigido.

## Escopo

Correção limitada ao transporte de autenticação/consulta da **Central Administrativa**. Não altera PIN, regras de permissão, dados, painéis administrativos, Portal do Morador nem o ícone oficial.

## Validação

O workflow `Aplicar UI App4 canônica aos painéis administrativos` concluiu com sucesso após a correção, incluindo os testes estáticos do transporte Safari R7.

A validação real do PIN continua dependente do teste no iPhone, pois o código não possui nem deve possuir o PIN administrativo do usuário.
