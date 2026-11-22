# CSC — Visibilidade imediata da função de terceiros após PIN (22/11/2026)

## Defeito reproduzido no vídeo
A interface original já aparece após PIN, mas o módulo de terceiros fica oculto por depender apenas de `portalConectaMoradorTokenV1`. Em acessos por PIN local, o cofre libera os dados do morador enquanto a autenticação remota ainda está em processamento. O evento `tacs:morador` ocorria sem token remoto e não exibia a função.

## Ajuste
- Dois fluxos legítimos de PIN local (acesso rápido e PIN dentro do Portal) emitem um sinal efêmero de **exibição**, restrito à aba, aparelho e área, válido por até cinco minutos.
- `cscTerceiros` aparece no mesmo ciclo de validação do PIN local, sem verificar periodicamente o token nem esperar o Apps Script.
- A autorização remota continua **obrigatória** para consultar cadastro, selecionar integrantes e enviar solicitações de terceiros. Sem token válido, a interface explica que a confirmação segura está pendente.
- Sinal local removido no logout, troca de usuário e recusa de autenticação.
- URLs de scripts atualizadas para impedir reutilização do código antigo no Safari/iPhone.
- Nenhuma alteração no backend, no formulário oficial, no agendamento ou no compartilhamento por WhatsApp.

## Homologação
Teste de UI sem token após PIN local, token inválido de outro aparelho ou área, sinal expirado, sessão revogada e funcionamento normal quando o token remoto chega. Testes automatizados de Chrome e WebKit no workflow CSC.
