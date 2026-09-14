# Registro — Correção isolada da busca de Morador por número de cadastro

Data: 13/09/2026

## Escopo autorizado
Correção limitada à sessão de busca administrativa do Morador, especificamente ao campo **Número de cadastro na área**.

Não foram alterados: interface, demais campos de busca, PIN, sessão, perfis, UBS, TACS, Administrador, agendas, vagas, notificações, painéis ou regras de gravação.

## Diagnóstico
A correção anterior reduziu releituras, mas o caminho pelo número de cadastro ainda carregava a planilha inteira da área para procurar uma única família. Em fallback de área, essa leitura integral podia se repetir e ultrapassar o limite percebido pelo navegador, produzindo a mensagem “A operação demorou demais. Tente novamente.”

## Bloco isolado
Marcador: `CORRECAO_CIRURGICA_BUSCA_MORADOR_CADASTRO_FAST_V2`.

Fluxo:
`Número de cadastro → normalizar família → procurar somente na coluna de endereço → ler somente as linhas encontradas → montar família → responder`.

Regras preservadas:
- o fallback para outra área continua existindo quando a área lembrada não contém o cadastro;
- busca de CPF, CNS, nome e data de nascimento não foi modificada;
- o diagnóstico continua somente leitura;
- nenhum vínculo residencial, PIN, sessão ou notificação é criado;
- o timeout global do Conecta não foi alterado;
- não existe varredura integral por ID depois que a entrada foi reconhecida como número de cadastro familiar.

## Validação
- teste de contrato do diagnóstico atualizado;
- caminho rápido exige `TextFinder` somente na coluna de endereço;
- caminho rápido é proibido de chamar `conectaAcessoV1RegistrosArea_`;
- workflow operacional do Apps Script: run `34794773478`;
- job `testar-e-implantar`: **success**;
- etapas de validação operacional, substituição dos módulos autorizados e atualização da implantação: **success**.

## Commits
- `0fbf8065a1d1f1b8e12ed322aef05b707c38c8fa` — correção funcional isolada;
- `5f85d74767be3f528b99a90bbc9d088478a29c3b` — trava de regressão;
- `37b94515d0612f67070f2d724016db20bcfac518` — solicitação de publicação operacional.

## Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO.**

A correção não deve ser marcada como concluída operacionalmente até a busca real no iPhone confirmar que o cadastro é localizado sem o timeout observado.
