# Registro canônico — PIN local V2

Data: 11/09/2026  
Escopo: acesso Administrador, TACS e Morador; Safari/iPhone; desempenho de reentrada.

## Problema confirmado

A versão anterior preservava cache e dados locais, mas ainda mantinha a ordem funcional:

`PIN → esperar validação remota → receber token → restaurar cache → abrir painel/portal`.

Quando o Apps Script demorava, o usuário continuava preso na tela de PIN e podia receber a mensagem de timeout.

## Regra aprovada

Depois da criação do PIN e reconhecimento do aparelho:

`PIN → contexto/snapshot local cifrado → área/painel/portal → nova sessão remota + sincronização em segundo plano`.

A regra vale separadamente para:
- Administrador;
- TACS;
- Morador.

## Implementação

- Cofre local cifrado com PBKDF2 + AES-GCM para contexto/snapshot, com descarte explícito de campos de credencial antes da cifra.
- PIN não é persistido em texto.
- Cofres separados por perfil.
- Contexto/snapshot local vinculado ao identificador do aparelho; nenhum token reutilizável é persistido no cofre.
- Administrador restaura contexto administrativo local antes da chamada remota.
- TACS restaura somente o contexto territorial correspondente ao perfil.
- Morador abre o portal com bootstrap local e a revalidação remota continua por requestId, sem transportar o PIN para a página seguinte.
- Recusa real do servidor remove o cofre local do perfil.
- Redefinição de PIN invalida o cofre anterior.
- Logoff remove a sessão ativa da interface, invalida a sessão remota em segundo plano e preserva somente cache/snapshot cifrado e vínculo do aparelho.
- Tela de PIN deixa de iniciar warmup remoto no carregamento inicial.
- Safari/iPhone prioriza a resposta direta do POST; polling fica como contingência tardia e controlada.

## Autoridade dos dados

Local-first não significa servidor opcional.

O estado local pode:
- desenhar a interface;
- apresentar o último dado previamente confirmado;
- permitir navegação imediata.

O estado local não pode confirmar sozinho:
- reserva de vaga;
- alteração de agenda;
- edição de morador;
- mudança de profissional/serviço;
- mudança de permissão;
- vínculo territorial;
- qualquer gravação administrativa crítica.

Essas operações exigem validação atual do servidor.

## Itens explicitamente fora do escopo

Esta correção não autoriza alterar:
- quantidade ou distribuição de vagas;
- agendas e horários;
- áreas/microáreas;
- UBS/unidades;
- permissões funcionais;
- cadastros de moradores;
- regras de profissionais/serviços;
- conteúdo visual dos painéis;
- ícone oficial e abertura canônica.

## Gates de regressão

Antes de publicação:
1. sintaxe de todos os JavaScripts alterados;
2. PIN correto abre cada cofre; PIN incorreto não abre;
3. Administrador tenta local antes de `admin_login`;
4. TACS tenta local antes de `admin_territorio_login_pin`;
5. Morador tenta local antes de `conecta_morador_login_pin`;
6. isolamento territorial TACS permanece;
7. recusa real remove o contexto/snapshot local do perfil;
8. Logoff invalida a sessão remota sem limpar cache/aparelho nem o armazenamento integral;
9. Safari não volta ao timeout/polling agressivo;
10. suíte integral do repositório.

## Regra de conclusão

Não considerar esta correção “resolvida” apenas por existir em código ou em `main`. A conclusão exige:
- testes internos aprovados;
- merge em `main`;
- implantação GitHub Pages concluída;
- verificação dos arquivos realmente servidos;
- teste real no iPhone do usuário para confirmar a experiência final.
