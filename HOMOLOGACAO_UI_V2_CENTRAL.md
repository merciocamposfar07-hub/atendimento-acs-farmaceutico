# Homologação visual V2 — Central Administrativa TACS

Data: 09/09/2026
Status: PILOTO PARA TESTE — NÃO APROVADO EM PRODUÇÃO

## Objetivo
Aplicar uma nova roupagem à Central Administrativa principal sem interromper, substituir ou modificar a infraestrutura funcional atualmente operante.

## Regra de isolamento
A produção permanece em `central-administrativa-tacs.html` sem alteração funcional.

O piloto é acessado separadamente por:
`homologacao-ui-v2/central-administrativa.html`

O piloto carrega a Central atual e injeta apenas a folha visual:
`homologacao-ui-v2/central-theme-v2.css`

## Contrato protegido
Nesta fase não alterar:
- IDs;
- nomes de campos;
- atributos `data-*`;
- classes consultadas por JavaScript;
- scripts funcionais;
- Apps Script;
- autenticação e sessão;
- permissões;
- isolamento territorial;
- payloads;
- gravação ou releitura;
- links funcionais dos módulos.

## Escopo visual do piloto
Pode mudar somente:
- cores;
- tipografia;
- bordas e raios;
- sombras;
- espaçamentos;
- aparência dos cards;
- aparência de campos e botões;
- apresentação da Central em iPhone/Android/browser.

## Paleta do piloto
Base azul-petróleo/azul escuro, usando como referência os tokens já catalogados do Conecta Saúde Comunitária:
- `#081829` fundo profundo;
- `#0B1E32` fundo principal;
- `#102A42` superfície;
- `#163651` superfície elevada;
- `#214667` azul institucional;
- `#85DC9F` verde apenas como acento.

## Gate
Nenhuma alteração do piloto deve substituir o visual de produção antes de:
1. comparação visual no iPhone;
2. teste funcional dos acessos e módulos;
3. confirmação de que a Central de produção permaneceu intacta;
4. aprovação expressa do usuário.
