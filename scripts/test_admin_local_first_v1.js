const fs=require('fs');
const assert=require('assert');
const agendas=fs.readFileSync('painel-oficial-agendas-vagas.html','utf8');
const recados=fs.readFileSync('painel-oficial-recados-campanhas.html','utf8');
const prof=fs.readFileSync('teste-v1/painel-profissionais-servicos-v1.html','utf8');
const moradores=fs.readFileSync('teste-v1/painel-moradores-v2.html','utf8');
for(const [nome,src,mod] of [['agendas',agendas,'agendas'],['recados',recados,'recados'],['profissionais',prof,'profissionais']]){
  assert(src.includes("PROFILE_KEY='portalTacsAcessoRapidoV1'"),nome+': identidade TACS ausente');
  assert(src.includes('function cacheIdentity()'),nome+': namespace de identidade ausente');
  assert(src.includes('p&&p.tacsId')&&src.includes('p&&p.areaId'),nome+': cache TACS deve usar tacsId + areaId');
  assert(src.includes("'portalTacsAdminSnapshotV1:"+mod+":'"),nome+': chave local-first versionada ausente');
  assert(src.includes('24*60*60*1000'),nome+': TTL de snapshot ausente');
  assert(!/localStorage\.clear\s*\(/.test(src),nome+': proibido limpar todo armazenamento');
}
assert(!agendas.includes("portalTacsAdminAgendasSnapshotV102:'+areaId"),'Agendas ainda usa chave somente por área');
assert(recados.includes('function aplicarSnapshotSeDisponivel()'),'Recados sem leitura local-first');
assert(recados.includes("contextoPronto=false;manutencaoConhecida=false;podeAdministrar=false"),'Recados deve manter escrita/autoridade bloqueada no snapshot');
assert(recados.includes("r.temporario===true")&&recados.includes('snapshotVisivel'),'Recados deve preservar snapshot em falha transitória');
assert(recados.includes('salvarSnapshot(r)'),'Recados deve atualizar snapshot após leitura confirmada');
assert(prof.includes('dadosConfirmados=false'),'Profissionais sem estado explícito de confirmação');
assert(prof.includes('function bloquearEdicaoNaoConfirmada()'),'Profissionais sem trava de edição do snapshot');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar profissionais."),'Salvar profissional deve exigir leitura confirmada');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de alterar serviços."),'Salvar serviço deve exigir leitura confirmada');
assert(prof.includes("if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação do servidor antes de criar profissional."),'Criar profissional deve exigir leitura confirmada');
assert(prof.includes('salvarSnapshot(r)'),'Profissionais deve atualizar snapshot após leitura confirmada');
assert(!moradores.includes('portalTacsAdminSnapshotV1:moradores:'),'Moradores não pode receber cache local neste bloco');
console.log('Bloco 3 local-first: Agendas, Recados/Campanhas e Profissionais/Serviços isolados; escrita exige servidor; Moradores fora do cache.');
