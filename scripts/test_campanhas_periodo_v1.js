'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const backend = read('apps-script/ZZZZ_34_CampanhasPeriodoV1.gs');
assert(/TACS_CAMPANHAS_PERIODO_V1/.test(backend), 'Campanhas: marcador do módulo ausente');
for (const column of ['ANO','MES','VALIDADE','HORARIO','MUNICIPIO_ID','MUNICIPIO_NOME','ORGANIZACAO_ID','ORGANIZACAO_NOME']) {
  assert(backend.includes(`'${column}'`) || backend.includes(`${column}:`), `Campanhas: coluna ${column} ausente`);
}
assert(/publicacoesTerritoriaisV1Salvar_=function/.test(backend), 'Campanhas: extensão de salvamento territorial ausente');
assert(/publicacoesTerritoriaisV1Dados_=function/.test(backend), 'Campanhas: enriquecimento de leitura ausente');
assert(/validade<inicio/.test(backend), 'Campanhas: validação de validade não encontrada');
assert(/tacsOrganizacoesMunicipiosV1ContextoArea_/.test(backend), 'Campanhas: contexto municipal não deriva da área do servidor');

const frontend = read('campanhas-periodo-v2.js');
for (const month of ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']) {
  assert(frontend.includes(month), `Campanhas: aba ${month} ausente`);
}
assert(frontend.includes('Campanhas no mês'), 'Campanhas: título mensal ausente');
assert(frontend.includes("action.value!=='admin_publicacoes_salvar_campanha'"), 'Campanhas: injeção segura no transporte ausente');
assert(frontend.includes("appendHidden(form,'ano'"), 'Campanhas: ano não é enviado');
assert(frontend.includes("appendHidden(form,'mes'"), 'Campanhas: mês não é enviado');
assert(frontend.includes("appendHidden(form,'validade'"), 'Campanhas: validade não é enviada');
assert(frontend.includes('ORGANIZACAO_NOME'), 'Campanhas: organização não aparece no contexto');
assert(frontend.includes('min-inline-size:0'), 'Campanhas: proteção contra extravasamento da validade no Safari ausente');

const official = read('painel-oficial-recados-campanhas.html');
assert(official.includes('admin_publicacoes_dados'), 'Painel oficial: versão standalone territorial ausente');
assert(!official.includes('document.write'), 'Painel oficial: carregador legado frágil foi reintroduzido');
assert(official.includes('campanhas-periodo-v2.js'), 'Painel oficial: extensão mensal V2 não está carregada');
assert(official.includes('name="horario"'), 'Painel oficial: horário editável de recados/campanhas ausente');
assert(official.includes('recados-campanhas-whatsapp-card-v9.js'), 'Painel oficial: compartilhamento em card azul-petróleo ausente');
assert(official.includes('.preferenciaVisual,#alternarContraste{display:none!important'), 'Painel oficial: controle de contraste voltou a ficar visível');

const base = read('teste-v1/painel-recados-campanhas-v1.html');
assert(base.includes('id="campanhasPeriodoInlineV3"'), 'Painel-base legado: extensão mensal inline ausente');
assert(base.includes('Campanhas no mês'), 'Painel-base legado: organização mensal não foi preservada');

const portal = read('portal-ajustes-finais.js');
assert(portal.includes("#sendWrittenTacs,.tacs-written-button{display:none!important}"), 'Portal: botão escrito antigo não está bloqueado');
assert(!portal.includes('Enviar solicitação por escrito no WhatsApp'), 'Portal: botão verde escrito foi reintroduzido');
assert(portal.includes('Enviar solicitação em card azul-petróleo'), 'Portal: botão único do card azul ausente');
assert(portal.includes('PortalTacsTerritoryIdentity'), 'Portal: card não usa identidade territorial dinâmica');
assert(portal.includes('tacsPublicAttentionPulse'), 'Portal: atenção sutil de recados/campanhas ausente');
assert(portal.includes('prefers-reduced-motion:reduce'), 'Portal: pulsação não respeita redução de movimento');
assert(portal.includes('ÁREA DE ATENDIMENTO'), 'Portal: bloco Área de atendimento ausente');
assert(portal.includes('TACS RESPONSÁVEL'), 'Portal: bloco TACS responsável ausente');
assert(portal.includes('UNIDADE DE SAÚDE'), 'Portal: bloco Unidade de saúde ausente');
assert(portal.includes('function corporateRequest(data)'), 'Portal: normalização corporativa da descrição ausente');
assert(portal.includes("ctx.font = '800 ' + size"), 'Portal: tipografia legível do card não encontrada');

const municipal = read('painel-oficial-organizacoes-municipios.html');
assert(municipal.includes('area-feedback'), 'Municípios: feedback local do vínculo ausente');
assert(municipal.includes('Vínculo salvo:'), 'Municípios: mensagem nominal de vínculo ausente');
assert(/\.signal\{[^}]*background:var\(--p\)/.test(municipal), 'Municípios: balão de status não usa azul-petróleo');
assert(!municipal.includes('<button id="portalTacsContrastToggleV1"'), 'Municípios: botão de contraste foi reintroduzido');

console.log('Campanhas/portal V9: meses, validade, horário e painel standalone preservados.');
