'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const admin=read('admin-aparelho-tacs-teste-v1.js');
const panel=read('painel-oficial-recados-campanhas.html');
const loader=read('recados-campanhas-whatsapp-mensal-v12.js');

new vm.Script(admin,{filename:'admin-aparelho-tacs-teste-v1.js'});

function functionBlock(text,name){
  const start=text.indexOf('function '+name+'(');
  assert.ok(start>=0,'Função '+name+' não localizada.');
  const brace=text.indexOf('{',start);
  let depth=0,quote='',escaped=false;
  for(let i=brace;i<text.length;i++){
    const c=text[i];
    if(quote){
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(c===quote)quote='';
      continue;
    }
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return text.slice(start,i+1);
  }
  throw new Error('Bloco incompleto: '+name);
}

const alternar=functionBlock(admin,'alternar');
assert.doesNotMatch(alternar,/atualizarSaudeNotificacoes|\.click\s*\(/,'Alternar modo TACS/teste não pode disparar automaticamente a consulta remota do OneSignal.');
assert.match(alternar,/executar\(modo\)/,'A alteração do modo TACS/teste deve continuar usando a rotina técnica existente.');
assert.match(alternar,/render\(r\)/,'A interface do próprio botão deve continuar sendo atualizada após a resposta.');

const remoto=functionBlock(panel,'atualizarSaudeNotificacoesRemota');
assert.match(remoto,/postSaudeNotificacoesIsolado\(sessao\(\)/,'Atualizar situação deve usar transporte isolado.');
assert.doesNotMatch(remoto,/(^|[^A-Za-z])post\s*\(/,'Atualizar situação não pode usar o post global que cria iframe/form e bloqueia o painel.');
assert.doesNotMatch(remoto,/scrollIntoView|scrollTo|location\./,'Atualizar situação não pode deslocar ou navegar a página.');
assert.match(remoto,/saudeRemotaEmCurso/,'A consulta remota precisa impedir toques duplicados sem bloquear os outros painéis.');

const isolado=functionBlock(panel,'postSaudeNotificacoesIsolado');
assert.match(isolado,/fetch\(API/,'O transporte isolado precisa enviar por fetch.');
assert.match(isolado,/mode:'no-cors'/,'O transporte isolado precisa manter o padrão seguro já usado no iPhone.');
assert.match(isolado,/jsonp\('admin_notificacoes_saude_result'/,'A resposta deve ser consultada pelo resultado assíncrono existente.');
assert.doesNotMatch(isolado,/createElement\(['"]iframe|createElement\(['"]form|className=['"]ponte|document\.body\.appendChild/,'A consulta isolada não pode criar iframe/form oculto, causa conhecida de recorte no Safari/iPhone.');
assert.doesNotMatch(isolado,/ativa\s*=/,'A consulta da Saúde não pode tomar o bloqueio global do painel.');

assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260827-botoes-safe-v1/,'O iPhone deve receber a versão nova do módulo TACS/teste, sem reaproveitar cache antigo.');
assert.match(panel,/recados-campanhas-whatsapp-mensal-v12\.js\?v=20260827-botoes-safe-v1/,'O painel deve quebrar o cache do carregador que chama o módulo corrigido.');

console.log('BOTÕES NOTIFICAÇÕES SAFE V1 OK: sem auto-refresh OneSignal, sem post global/iframe no Atualizar situação e sem navegação/scroll forçado.');
