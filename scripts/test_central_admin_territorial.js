'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('central-administrativa-tacs.html');
const js=read('central-administrativa-tacs.js');
const notificationHealthBackend=read('apps-script/ZZZZ_22_SaudeNotificacoesV1.gs');
const notificationHealthSource=read('teste-v1/painel-recados-campanhas-v1.html');
const professionalsPage=read('teste-v1/painel-profissionais-servicos-v1.html');
const professionalsWrapper=read('painel-oficial-profissionais-servicos.html');
const territoryWrapper=read('painel-oficial-tacs-areas.html');
const publicPortal=read('index.html');
const manifest=JSON.parse(read('manifest-central-admin.webmanifest'));
assert.equal(manifest.name,'Central Administrativa TACS');
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
assert.match(html,/data-module="agendas" data-admin-only="true"/);
assert.match(html,/data-module="profissionais" data-admin-only="true"/);
assert.match(html,/id="viewerBack"/);
assert.match(js,/portalTacsAdminTokenV1/);
assert.match(js,/portalTacsTerritorioTokenV1/);
assert.match(js,/admin_territorio_login_tacs/);
assert.match(js,/admin_territorio_dados/);
assert.match(js,/admin_notificacoes_saude/);
assert.match(js,/painel-oficial-recados-campanhas\.html\?area=/);
assert.doesNotMatch(js,/moduleUrl\(name\)[\s\S]*name==='notificacoes'/,
  'A rota do painel redundante de Saúde das notificações deve ser removida.');
assert.match(html,/central-administrativa-tacs\.js\?v=20260814-v7/,
  'A Central deve invalidar o cache após remover o painel redundante.');
assert.match(html,/\.health-card\{[^}]*background:linear-gradient\(145deg,var\(--p\),var\(--p2\)\)/,
  'Os cartões de Saúde geral devem usar fundo azul-petróleo.');
assert.match(html,/\.health-card strong\{[^}]*color:#fff/,
  'Os títulos dos cartões azul-petróleo devem permanecer legíveis.');
assert.doesNotMatch(notificationHealthSource,/O estado técnico não comprova a entrega física/,
  'A observação quase invisível deve ser removida da Saúde das notificações.');
assert.match(professionalsPage,/\.aba\{[^}]*min-height:76px[^}]*font-size:clamp\(\.78rem,3\.3vw,\.95rem\)[^}]*overflow-wrap:anywhere/,
  'Os botões de Profissionais devem conter os textos no iPhone.');
assert.match(professionalsWrapper,/painel-profissionais-servicos-v1\.html\?v=20260814-tabs-v104/);
assert.match(js,/painel-oficial-profissionais-servicos\.html\?v=20260814-tabs-v104/,
  'A Central deve carregar a versão corrigida do painel de Profissionais.');
assert.match(js,/painel-oficial-tacs-areas\.html\?v=20260814-status-v3/,
  'A Central deve carregar a confirmação atualizada do painel de TACS.');
assert.match(territoryWrapper,/painel-tacs-areas-v1\.html\?v=20260814-status-v3/,
  'O painel oficial deve invalidar o cache da confirmação corrigida.');
assert.match(publicPortal,/\.hero-actions\{grid-template-columns:1fr;margin:0;border-left:0;border-right:0;border-radius:0\}/,
  'O quadro inferior do Portal TACS deve alinhar com a largura do quadro superior no celular.');
assert.match(js,/teste-v1\/painel-moradores-v2\.html/);
assert.match(js,/filter\(function\(a\)\{return a&&a\.ativa!==false\}\)/);
assert.match(js,/post\('admin_moradores_status'[\s\S]*post\('admin_notificacoes_saude'/,
  'Saúde de moradores deve terminar antes da consulta autenticada das notificações.');
assert.match(notificationHealthBackend,/contagens=\{ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0\}/,
  'O contrato do backend deve expor a quantidade apta em contagens.ativos.');
assert.match(js,/Number\(c\.ativos\|\|0\)\+' aptos/,
  'A Central deve ler os aptos do campo contagens.ativos retornado pelo backend.');
assert.doesNotMatch(js,/Number\(c\.aptos\|\|0\)\+' aptos/,
  'A Central não pode usar contagens.aptos, pois esse campo não existe no backend.');
assert.doesNotMatch(js,/subscriptionId\s*[:=]\s*['"][0-9a-f-]{20,}/i);
console.log('Central Administrativa TACS: um ícone, sessão territorial, permissões e Saúde Geral validados.');
