'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('central-administrativa-tacs.html');
const js=read('central-administrativa-tacs.js');
const multiPage=read('painel-oficial-organizacoes-municipios.html');
const notificationHealthBackend=read('apps-script/ZZZZ_22_SaudeNotificacoesV1.gs');
const notificationHealthSource=read('teste-v1/painel-recados-campanhas-v1.html');
const professionalsPage=read('teste-v1/painel-profissionais-servicos-v1.html');
const professionalsWrapper=read('painel-oficial-profissionais-servicos.html');
const territoryWrapper=read('painel-oficial-tacs-areas.html');
const publicPortal=read('index.html');
const manifest=JSON.parse(read('manifest-central-admin.webmanifest'));
assert.equal(manifest.name,'Conecta Saúde Comunitária');
assert.match(manifest.start_url,/central-administrativa-tacs\.html$/);
assert.equal(manifest.display,'standalone');
assert.match(html,/CENTRAL ADMINISTRATIVA TACS/);
assert.match(html,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.doesNotMatch(html,/Saúde das notificações/,
  'A Central não deve oferecer um painel redundante de Saúde das notificações.');
assert.doesNotMatch(html,/data-module="notificacoes"/,
  'O módulo exclusivo de Saúde das notificações deve ser removido da Central.');
assert.match(html,/data-module="moradores"/);
assert.match(html,/data-module="recados"/);
assert.match(html,/data-permission="MORADORES_LER"/);
assert.match(html,/data-permission="PUBLICACOES_GERENCIAR"/);
assert.match(html,/data-module="agendas" data-permission="AGENDAS_GERENCIAR"/);
assert.match(html,/data-module="profissionais" data-permission="PROFISSIONAIS_GERENCIAR"/);
assert.doesNotMatch(html,/data-module="agendas" data-admin-only="true"/);
assert.doesNotMatch(html,/data-module="profissionais" data-admin-only="true"/);
assert.match(html,/data-module="municipios" data-admin-only="true"/,
  'Gestão multi-município deve existir somente como módulo do administrador geral.');
assert.match(html,/id="viewerBack"/);
assert.match(js,/portalTacsAdminTokenV1/);
assert.match(js,/portalTacsTerritorioTokenV1/);
assert.match(js,/admin_territorio_login_pin/,
  'A Central deve autenticar o TACS somente pelo PIN individual.');
assert.doesNotMatch(js,/admin_territorio_login_tacs/,
  'A Central não deve voltar ao login antigo por CNS + PIN.');
assert.match(js,/admin_territorio_dados/);
assert.match(js,/function aquecerValidacaoPin\(\)/,
  'Administrador e TACS devem aquecer o Apps Script enquanto o PIN é digitado.');
assert.match(js,/event\.source!==active\.frame\.contentWindow/,
  'A confirmação da Central deve priorizar a resposta direta do POST pelo iframe correto.');
assert.match(js,/frame\.setAttribute\('name',frameName\)/,
  'A Central deve registrar o iframe antes do POST no Safari.');
assert.match(js,/form\.setAttribute\('target',frameName\)/,
  'A Central deve registrar explicitamente o target do formulário no Safari.');
assert.match(js,/schedulePoll\(fastPin\?8000:1800\)/,
  'Polling deve ser apenas contingência tardia, sem saturar o Apps Script.');
assert.doesNotMatch(js,/O servidor demorou para confirmar a operação\./,
  'A Central não pode manter o timeout legado que bloqueava o acesso pelo PIN.');
assert.match(html,/central-administrativa-tacs\.js\?v=[A-Za-z0-9._-]+/,
  'A Central deve invalidar o cache para carregar a versão atual do acesso.');
assert.match(js,/ACCESS_PROFILE_LABELS/,
  'A Central deve traduzir o perfil funcional cadastrado.');
assert.match(js,/function currentAdministrator\(\)/,
  'A Central deve resolver o administrador autenticado antes de montar a saudação.');
assert.match(js,/var adminNome=text\(admin&&admin\.nomeCompleto\)\|\|'Administrador'/,
  'A saudação administrativa deve usar o nome cadastrado quando disponível.');
assert.doesNotMatch(js,/<small>Olá, administrador<\/small><h1>Administrador<\/h1>/,
  'A Central não pode manter saudação fixa genérica para administrador autenticado.');
assert.match(js,/Olá, '\+esc\(nome\)/,
  'A saudação do TACS deve usar o nome do agente autenticado.');
assert.match(js,/accessProfileLabel\(tacs&&tacs\.perfil\|\|'TACS'\)/,
  'A saudação deve refletir o perfil real do TACS, inclusive perfis combinados.');
assert.match(js,/var adminPerfil=accessProfileLabel\(admin&&admin\.perfil\|\|context&&context\.perfil\|\|'ADMIN'\)/,
  'O administrador deve manter o próprio perfil, sem ser rotulado como TACS.');
assert.match(js,/NOTIFICACOES_FONTE_UNICA_ATUAL_V2/,
  'A Central deve usar uma única fonte atual para a Saúde das notificações.');
assert.doesNotMatch(js,/function refreshNotificationHealth[\s\S]*admin_notificacoes_saude_rapida/,
  'A Central não pode exibir snapshot rápido/cache como contagem atual.');
assert.match(js,/notificationPostIsolated\('admin_notificacoes_saude_remota'/,
  'A Central deve validar a saúde das notificações diretamente na fonte remota.');
assert.match(js,/result\.oneSignalConsultado!==true/,
  'A Central não pode aceitar contagens provisórias como verdade confirmada.');
assert.match(js,/painel-oficial-recados-campanhas\.html\?area=/);
assert.doesNotMatch(js,/moduleUrl\(name\)[\s\S]*name==='notificacoes'/,
  'A rota do painel redundante de Saúde das notificações deve ser removida.');
const centralScript=html.match(/central-administrativa-tacs\.js\?v=([A-Za-z0-9._-]+)/);
assert.ok(centralScript&&centralScript[1],
  'A Central deve carregar o JavaScript com revisão explícita para invalidar o cache.');
assert.notEqual(centralScript&&centralScript[1],'20260816-multimunicipio-v1',
  'A Central não pode voltar à revisão anterior à padronização visual e de contraste.');
assert.match(js,/new URLSearchParams\(location\.search\)/,
  'A Central deve reconhecer o modo de acesso informado pelo link.');
assert.match(js,/TACS_ONLY=String\(URL_PARAMS\.get\('acesso'\)\|\|''\)\.toLowerCase\(\)==='tacs'/,
  'O link dedicado deve ativar somente o perfil TACS.');
assert.match(js,/el\('tabAdmin'\)\.hidden=TACS_ONLY/,
  'Administrador geral deve ficar oculto no link exclusivo do TACS.');
assert.match(js,/showLogin\(TACS_ONLY\?'tacs':'admin'\)/,
  'O link geral deve continuar abrindo como administrador e o dedicado como TACS.');
assert.match(html,/\.health-card\{[^}]*background:linear-gradient\(145deg,var\(--p\),var\(--p2\)\)/,
  'Os cartões de Saúde geral devem usar fundo azul-petróleo.');
assert.match(html,/\.health-card strong\{[^}]*color:#fff/,
  'Os títulos dos cartões azul-petróleo devem permanecer legíveis.');
assert.doesNotMatch(notificationHealthSource,/O estado técnico não comprova a entrega física/,
  'A observação quase invisível deve ser removida da Saúde das notificações.');
assert.match(professionalsPage,/\.aba\{[^}]*min-height:76px[^}]*font-size:clamp\(\.78rem,3\.3vw,\.95rem\)[^}]*overflow-wrap:anywhere/,
  'Os botões de Profissionais devem conter os textos no iPhone.');
assert.match(professionalsWrapper,/painel-profissionais-servicos-v1\.html\?v=[A-Za-z0-9._-]+/,
  'Profissionais deve carregar o painel interno com revisão explícita de cache.');
assert.match(js,/painel-oficial-profissionais-servicos\.html\?area=/,
  'A Central deve carregar a versão corrigida do painel de Profissionais.');
assert.match(js,/painel-oficial-agendas-vagas\.html\?area=/,
  'A Central deve informar a área ao painel de Agendas.');
assert.match(professionalsPage,/portalTacsTerritorioTokenV1/,
  'Profissionais deve reutilizar a sessão territorial do TACS.');
assert.match(professionalsPage,/escopo:'profissionais'/,
  'Profissionais deve solicitar somente dados da própria área.');
const territorioVersionado=js.includes("painel-oficial-tacs-areas.html?area='+area+'&from=central&v='+revision");
assert.ok(territorioVersionado,
  'A Central deve carregar o painel territorial com área atual e revisão explícita de cache.');
assert.match(js,/painel-oficial-organizacoes-municipios\.html\?v=/,
  'A Central deve abrir o painel global de organizações e municípios.');
assert.match(multiPage,/ADMINISTRADOR GERAL/);
assert.match(multiPage,/admin_multimunicipio_dados/);
assert.match(multiPage,/admin_multimunicipio_salvar_organizacao/);
assert.match(multiPage,/admin_multimunicipio_salvar_municipio/);
assert.match(multiPage,/admin_multimunicipio_vincular_area/);
assert.match(multiPage,/territoryToken&&!token/,
  'O painel global deve bloquear a interface quando existir apenas sessão territorial TACS.');
assert.match(territoryWrapper,/painel-tacs-areas-v1\.html\?v=[A-Za-z0-9._-]+/,
  'O painel oficial de TACS e áreas deve carregar a revisão atual de forma versionada.');
assert.match(publicPortal,/\.hero-actions\{grid-template-columns:1fr;margin:0;border-left:0;border-right:0;border-radius:0\}/,
  'O quadro inferior do Portal TACS deve alinhar com a largura do quadro superior no celular.');
assert.match(js,/teste-v1\/painel-moradores-v2\.html/);
assert.match(js,/filter\(function\(a\)\{return a&&a\.ativa!==false\}\)/);
assert.match(js,/refreshNotificationHealth\(areaId,Boolean\(force\)\)/,
  'A saúde das notificações deve iniciar independentemente da leitura de moradores.');
assert.doesNotMatch(js,/post\('admin_moradores_status'[\s\S]{0,1800}post\('admin_notificacoes_saude_rapida'/,
  'A saúde das notificações não pode ficar presa ao término da consulta de moradores.');
assert.match(notificationHealthBackend,/contagens=\{ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0\}/,
  'O contrato do backend deve expor a quantidade apta em contagens.ativos.');
assert.ok(notificationHealthBackend.includes('SAUDE_NOTIFICACOES_DEDUP_V2'),
  'A saúde remota deve deduplicar aparelhos por Subscription ID.');
assert.ok(notificationHealthBackend.includes('registros=Object.keys(registroPorId).map'),
  'Linhas repetidas do registro não podem inflar aptos ou reparos.');
assert.ok(notificationHealthBackend.includes('||remotoTodos[id])return'),
  'A exportação OneSignal não pode contar a mesma Subscription ID duas vezes.');
assert.match(js,/c\.ativos\+' aptos/,
  'A Central deve exibir somente contagens.ativos já normalizado e confirmado.');
assert.match(js,/notificationCount\(c\.ativos\)/,
  'A Central deve validar numericamente contagens.ativos antes de exibir.');
assert.doesNotMatch(js,/c\.aptos\+' aptos/,
  'A Central não pode usar contagens.aptos, pois esse campo não existe no backend.');
assert.doesNotMatch(js,/subscriptionId\s*[:=]\s*['"][0-9a-f-]{20,}/i);
console.log('Central Administrativa TACS: sessão territorial PIN-only, permissões, Saúde Geral e gestão multi-município ADMIN_GERAL validados.');
