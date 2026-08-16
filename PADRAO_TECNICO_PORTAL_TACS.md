# Padrão técnico oficial — Portal TACS

Este documento é uma regra de projeto e uma fonte de verdade. Novas telas, correções e implantações não podem reduzir os requisitos abaixo.

## 1. Identidade visual e acessibilidade

- Cor estrutural principal: azul-petróleo `#073A55`, com variações compatíveis já adotadas pelo projeto.
- Clareza de leitura em iPhone, Android e navegadores móveis comuns.
- Nenhum texto, selo, status, botão, card, tabela ou campo pode ultrapassar a largura do contêiner.
- IDs técnicos, CNS, CPF, nomes longos e descrições devem quebrar linha de forma segura sem empurrar outros elementos para fora da tela.
- O padrão administrativo é fixo e de alta legibilidade; controles antigos de alternância manual de contraste não devem ser recriados.
- Estados de foco devem ser visíveis para teclado e tecnologias assistivas.
- Botões e campos devem manter dimensão adequada para toque.
- Botões de salvar/confirmar devem compartilhar o mesmo padrão visual: azul-petróleo, texto branco, contorno azul-claro, raio e altura consistentes.
- Ações destrutivas devem permanecer visualmente distintas em vermelho; estados de alerta/sucesso preservam semântica própria.
- Cards, campos, abas, selos, tipografia e espaçamentos devem obedecer aos tokens visuais oficiais do projeto.

### 1.1 Separação obrigatória entre visual e funcional

A camada visual nunca deve ser usada como fonte de verdade funcional.

**Contrato funcional protegido:**
- IDs (`id`);
- nomes de campos (`name`);
- atributos `data-*`;
- classes que o JavaScript consulta explicitamente;
- autenticação, sessão e permissões;
- território/área/município/organização;
- payloads e respostas do Apps Script;
- regras de gravação, releitura, auditoria e isolamento.

**Contrato visual independente:**
- cor;
- contorno;
- `border-radius`;
- tipografia;
- espaçamento;
- sombra;
- aparência de cards, campos, selos e botões.

Padronizações visuais devem ser feitas sem renomear ou remover identificadores funcionais. O arquivo `admin-ui-standard.inline.css` é a fonte de verdade visual administrativa; ele é injetado inline nos painéis para não criar requisição HTTP adicional em tempo de uso.

## 2. Integridade territorial

- O navegador nunca é a fonte de verdade da área do TACS.
- Para perfil TACS, organização, município, área e unidade são derivados e confirmados pela sessão autenticada no servidor.
- Alterar `area=`, IDs, query strings ou campos ocultos no navegador não pode conceder acesso a outro território.
- Um TACS pode administrar somente a própria área e somente as funções concedidas pelas permissões do servidor.
- O Administrador Geral pode administrar as áreas sob a estrutura global autorizada.
- Consultas de moradores, agendas, profissionais, serviços, recados e campanhas devem respeitar o mesmo isolamento territorial tanto na leitura quanto na gravação.

## 3. Autonomia operacional do TACS

Quando a permissão correspondente estiver ativa, o TACS deve conseguir na própria área:

- buscar, cadastrar e editar moradores;
- atualizar situação cadastral;
- gerir agendas, horários, vagas e disponibilidade;
- ativar, inativar e editar profissionais;
- ativar, inativar e editar serviços;
- gerir recados e campanhas;
- revisar e reeditar informações sem depender do Administrador Geral.

O bloqueio territorial não pode ser confundido com bloqueio funcional dentro da própria área.

## 4. Segurança de digitação e gravação

- Validar campos no cliente para reduzir erro humano, sem substituir a validação do servidor.
- O servidor deve validar novamente identidade, sessão, permissão, território, formato e vínculo antes de gravar.
- Impedir envio duplicado acidental e operações concorrentes incompatíveis.
- Uma resposta de sucesso só deve ser exibida após confirmação confiável da gravação ou releitura do estado salvo.
- Em divergência de releitura, não assumir sucesso silenciosamente.
- Edições devem preservar IDs técnicos estáveis quando esses IDs forem usados por auditoria ou vínculos.
- Operações críticas devem manter histórico/auditoria suficiente para identificar operador, área, antes, depois e horário.

## 5. Reedição, recuperação e auditoria

- Não realizar exclusão física de registros administrativos ou cidadãos quando a regra funcional prevê inativação/status.
- Mudanças estruturais devem ser recuperáveis por histórico/versionamento.
- Funções de desfazer só podem ser oferecidas quando houver confirmação segura do estado anterior.
- Consolidações e alterações de moradores devem permanecer auditáveis.

## 6. Arquitetura multiagente e multimunicípio

Hierarquia oficial pretendida:

`Organização → Município → Área/Microárea → TACS → Moradores/Agenda/Profissionais/Serviços/Publicações`

- IDs de organizações, municípios e áreas são técnicos e estáveis.
- Nomes exibidos ao usuário são independentes dos IDs técnicos.
- Áreas existentes não devem ser deslocadas automaticamente em migrações estruturais.
- Estruturas provisórias de compatibilidade só podem ser removidas depois que as áreas reais estiverem vinculadas e validadas.
- Municípios diferentes não podem compartilhar contexto administrativo por acidente.

## 7. Testes mínimos antes de considerar uma revisão estável

Toda alteração relevante deve passar, conforme o módulo afetado, por:

1. teste funcional do fluxo alterado;
2. teste de regressão das funções já existentes;
3. teste de isolamento entre pelo menos dois TACS/áreas;
4. teste de permissão TACS versus Administrador Geral;
5. teste de gravação e releitura;
6. teste de duplicidade/duplo clique quando houver escrita;
7. teste responsivo/mobile e de overflow;
8. teste de legibilidade, foco e padrão visual;
9. teste de manipulação de `area=`/IDs no navegador;
10. teste de concorrência/carga quando a alteração afetar infraestrutura compartilhada.

Mudança exclusivamente visual deve, adicionalmente, passar pelo teste de contrato visual e comprovar que IDs, `name`, `data-*` e scripts funcionais não foram alterados.

## 8. Regra de publicação

- Não declarar uma correção como publicada apenas porque o arquivo foi alterado no repositório.
- Conferir a implantação aplicável (GitHub Pages e/ou Apps Script) e os testes relevantes.
- Falhas de workflows legados devem ser identificadas separadamente dos gates oficiais, para não mascarar falhas reais nem gerar falso alarme.
- Novas rotinas não devem reativar caminhos antigos ou criar fontes concorrentes silenciosas.

## 9. Dados pessoais, saúde e expansão comercial

- O sistema manipula dados pessoais e potencialmente dados relacionados à saúde; privacidade e controle de acesso fazem parte da arquitetura, não são acabamento visual.
- Antes de expansão contratual ampla, manter política de privacidade, responsabilidades, retenção, recuperação, logs, acesso e suporte formalizados.
- Cada prefeitura/organização deve permanecer logicamente isolada das demais.
- O crescimento comercial não pode depender de reduzir controles de segurança, auditoria ou privacidade.

## 10. Regra de manutenção

Uma nova funcionalidade só está concluída quando preserva simultaneamente:

**funcionalidade + território + segurança + gravação + reedição + auditoria + acessibilidade + layout + desempenho.**

Correções pontuais não devem quebrar esse contrato.
