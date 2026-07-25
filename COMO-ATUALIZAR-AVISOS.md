# Como atualizar os avisos do Serviço TACS

Os avisos públicos ficam no arquivo `avisos-config.js`. Eles não contêm dados de moradores e são publicados pelo próprio GitHub Pages.

## Pelo celular

1. Entre no GitHub com a conta responsável pelo portal.
2. Abra o repositório `atendimento-acs-farmaceutico`.
3. Abra o arquivo `avisos-config.js`.
4. Toque no ícone do lápis para editar.
5. Altere somente os textos entre aspas e os campos `ativo: true` ou `ativo: false`.
6. Sempre mude também o campo `versao` para um valor novo. Exemplo: de `2026-07-25-01` para `2026-07-25-02`.
7. Atualize o campo `atualizadoEm`.
8. Toque em **Commit changes** para publicar.

O GitHub Pages normalmente leva alguns instantes para mostrar a atualização. No portal, toque em **Atualizar avisos**.

## Situação do atendimento médico

Use uma destas palavras no campo `situacao`:

- `confirmado`
- `alterado`
- `cancelado`
- `aguardando`

## Mostrar ou esconder

- `ativo: true` mostra a informação.
- `ativo: false` esconde a informação.

## Validade de outro aviso

O campo `validade` é opcional. Quando usado, deve ficar no formato `AAAA-MM-DD`. Depois dessa data, o aviso deixa de aparecer automaticamente.

## Segurança

Nunca coloque CPF, telefone, endereço completo, diagnóstico ou qualquer dado pessoal de morador nesse arquivo. O mural serve somente para informações gerais da unidade de saúde e da comunidade.

## Limite do GitHub Pages

O portal consegue mostrar avisos novos, marcar novidades no aparelho e atualizar enquanto estiver aberto. Ele não consegue enviar notificação de tela bloqueada quando o site está fechado sem utilizar um serviço externo de notificações.
