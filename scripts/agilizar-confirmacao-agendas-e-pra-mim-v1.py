from pathlib import Path
import re

# Escopo fechado:
# 1) "Para você" -> "Pra mim" na ficha de aposentadoria;
# 2) cache-bust apenas desse módulo no Portal;
# 3) remover a releitura completa síncrona após um admin_salvar_agenda bem-sucedido.

recipient = Path('portal-aposentadoria-destinatario-v1.js')
index = Path('index.html')
panel = Path('painel-oficial-agendas-vagas.html')

r = recipient.read_text(encoding='utf-8')
old_button = 'data-value="Para você" aria-pressed="false">Para você</button>'
new_button = 'data-value="Pra mim" aria-pressed="false">Pra mim</button>'
if old_button in r:
    r = r.replace(old_button, new_button, 1)
elif new_button not in r:
    raise SystemExit('Botão "Para você" não encontrado')
recipient.write_text(r, encoding='utf-8')

idx = index.read_text(encoding='utf-8')
old_src = 'portal-aposentadoria-destinatario-v1.js?v=20260818-aposentadoria-destino-v1'
new_src = 'portal-aposentadoria-destinatario-v1.js?v=20260818-aposentadoria-destino-v2'
if old_src in idx:
    idx = idx.replace(old_src, new_src, 1)
elif new_src not in idx:
    raise SystemExit('Referência do módulo de aposentadoria não encontrada')
index.write_text(idx, encoding='utf-8')

html = panel.read_text(encoding='utf-8')
pattern = re.compile(r"function salvarAgenda\(c\)\{.*?\}\nfunction restaurar\(\)", re.S)
match = pattern.search(html)
if not match:
    raise SystemExit('Função salvarAgenda atual não encontrada')

new_save = r'''function aplicarAgendaSalvaLocalmente(registro,p){
  if(!registro)return;
  registro.DATA=p.data;
  registro.HORARIO=p.horario;
  registro.SITUACAO=p.situacao;
  registro.MENSAGEM=p.mensagem;
  registro.ENCERRA_HORARIO=p.encerraHorario;
  registro.ENCERRA_12H=txt(p.encerraHorario)==='12:00';
  registro.VAGAS_COMUNS=num(p.vagasComuns);
  registro.VAGAS_EMERGENCIAIS=num(p.vagasEmergenciais);
  registro.DIA_EXTRA=bool(p.diaExtra);
  registro.ATIVO=bool(p.ativo);
}
function salvarAgenda(c){
  if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação dos dados atuais antes de salvar.','aviso');return}
  var p=payloadAgenda(c),anterior=achar(p.modulo,p.dia);
  if(!anterior){status('statusOperacao','Agenda não encontrada na leitura atual.','erro');return}
  if(!window.confirm('Gravar esta agenda na planilha real?'))return;
  setUndo(anterior);
  status('statusOperacao','Salvando agenda…','aviso');
  post('admin_salvar_agenda',p,function(r){
    if(!r||r.ok!==true){
      status('statusOperacao',txt(r&&r.message||'Não foi possível salvar a agenda.')+' Use “Desfazer” antes de outra alteração.','erro');
      return
    }
    var atual=achar(p.modulo,p.dia);
    aplicarAgendaSalvaLocalmente(atual,p);
    edicaoPendente=false;
    salvarSnapshot({profissionais:dados.profissionais,agendas:dados.agendas});
    render();
    status('statusOperacao','Agenda salva e confirmada pelo servidor.','ok')
  })
}
function restaurar()'''
html = html[:match.start()] + new_save + html[match.end():]

# Validações de segurança: gravação e restauração continuam presentes;
# nenhum botão flutuante ou função de odontologia é tocado por este patch.
required = [
    "post('admin_salvar_agenda',p,function(r)",
    "Agenda salva e confirmada pelo servidor.",
    "function restaurar()",
    "function sincronizarVagasOdontologia()",
    "atualizarPaginaAgendasFlutuante",
]
for token in required:
    if token not in html:
        raise SystemExit(f'Validação do painel falhou: {token}')

if 'Agenda salva, mas os campos alterados ainda aguardam confirmação na próxima leitura.' in html:
    raise SystemExit('Mensagem amarela antiga ainda existe no fluxo de salvamento')

panel.write_text(html, encoding='utf-8')

# Validações finais dos três arquivos.
if 'data-value="Pra mim" aria-pressed="false">Pra mim</button>' not in recipient.read_text(encoding='utf-8'):
    raise SystemExit('Pra mim não aplicado')
if new_src not in index.read_text(encoding='utf-8'):
    raise SystemExit('Cache-bust não aplicado')
