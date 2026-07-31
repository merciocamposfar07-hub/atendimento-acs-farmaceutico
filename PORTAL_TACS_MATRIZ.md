# Arquitetura oficial — Portal TACS

Esta é a fonte de verdade da arquitetura do portal. Rotinas antigas não devem
ser reativadas nem usadas como alternativa silenciosa.

## Entradas oficiais

| Uso | Arquivo |
|---|---|
| Portal do morador | `index.html` |
| Painel administrativo | `admin.html` |
| Endereço antigo do portal | `portal-atualizado.html` redireciona para `index.html` |
| Editor antigo de avisos | `admin-avisos.html` redireciona para `admin.html` |

## Duas fontes de dados, sem concorrência

### 1. Banco principal do Portal TACS

O endereço configurado em `TACS_ADMIN_API_URL` é a única fonte para:

- atendimento médico;
- atendimento da nutricionista;
- agenda da Enfermeira Chefe;
- recados;
- campanhas.

O Painel Administrativo grava esses dados somente no banco principal. O Portal
do Morador lê esses mesmos dados somente do banco principal.

### 2. Agenda odontológica

O endereço configurado em `TACS_DENTAL_AGENDA_API_URL` é a única fonte para:

- vagas odontológicas comuns;
- vagas odontológicas emergenciais;
- reservas odontológicas;
- abatimento automático da quantidade de vagas.

São aceitas agendas de segunda-feira, terça-feira e quinta-feira. Cada reserva
é enviada uma única vez, possui identificador próprio e é protegida contra
abatimento duplicado.

## Limites entre os módulos

- Odontologia nunca é gravada no banco principal.
- Recados e campanhas nunca são gravados no sistema antigo de avisos.
- A agenda da enfermeira nunca contém lógica odontológica.
- O WhatsApp serve apenas para compartilhar a solicitação já preparada; ele
  não publica nem sincroniza agendas, recados ou campanhas.
- Não existe `no-cors`, espelhamento ou fallback para outro banco nos caminhos
  oficiais.

## Funcionamento público

- O comunitário vê apenas informações publicadas pelas duas fontes oficiais.
- Na odontologia, o portal mostra apenas datas permitidas e vagas positivas.
- A mensagem do WhatsApp é liberada depois da confirmação da reserva
  odontológica pelo sistema.
- O portal calcula e apresenta os dados do atendimento conforme o formulário.

## Funcionamento administrativo

- O painel aguarda a leitura inicial antes de liberar alterações.
- Depois de uma publicação, o painel relê a fonte oficial e confere se a
  alteração ficou disponível.
- Agenda odontológica comum e emergencial é editada no mesmo painel.
- Recados e campanhas são publicados no banco principal e aparecem no Portal
  do Morador a partir dessa mesma origem.

## Verificação obrigatória antes de publicar

Execute:

```sh
npm test
```

Os testes cobrem, sem gravar dados reais:

- reserva odontológica comum;
- reserva odontológica emergencial;
- abatimento único de vaga;
- bloqueio de vaga indisponível;
- abertura do WhatsApp somente após confirmação;
- publicação e releitura de recado;
- publicação e releitura de agenda odontológica;
- ausência da API antiga de avisos nos arquivos oficiais.

O aplicativo web do Google Apps Script principal deve usar
`apps-script-controle-integral.gs`. O aplicativo odontológico deve usar
`google-apps-script/Code.gs`.
