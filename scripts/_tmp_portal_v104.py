from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,t): (ROOT/p).write_text(t,encoding='utf-8')
def once(t,old,new,p):
    n=t.count(old)
    if n!=1: raise SystemExit(f'{p}: esperado 1 ocorrência, encontrei {n}: {old[:90]}')
    return t.replace(old,new,1)

# 1) Agenda profissional: somente aparência. Nenhuma regra de disponibilidade/seleção é alterada.
p='agenda-enfermeira.js'
t=read(p)
repls=[
(".portal-agenda{overflow:hidden;padding:22px;border:2px solid #0d5f8a;border-radius:20px;background:#eef7fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.12)}",
 ".portal-agenda{overflow:hidden;padding:22px;border:2px solid #0876a6;border-radius:20px;background:#e7f5fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.16)}"),
(".portal-agenda[data-module=\"medica\"]{border-color:#286f9a;background:#f0f7fb}",
 ".portal-agenda[data-module=\"medica\"]{border-color:#197fb1;background:#eaf6fc}"),
(".portal-agenda[data-module=\"nutricionista\"]{border-color:#3d8f62;background:#f0faf4}",
 ".portal-agenda[data-module=\"nutricionista\"]{border-color:#1f9b58;background:#e9f9ef}"),
(".portal-agenda small{display:block;color:#078940;font-size:15px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}",
 ".portal-agenda small{display:block;color:#078f45;font-size:15px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}"),
(".portal-agenda>p{margin:0 0 16px;color:#415b69;font-size:17px;line-height:1.5}",
 ".portal-agenda>p{margin:0 0 16px;color:#345566;font-size:17px;font-weight:650;line-height:1.5}"),
(".agenda-day{min-width:0;min-height:142px;padding:14px 12px;border:2px solid #9bb4c1;border-radius:15px;background:#fff;color:#102b3c;text-align:left;overflow-wrap:anywhere}",
 ".agenda-day{min-width:0;min-height:142px;padding:14px 12px;border:2px solid #6594aa;border-radius:15px;background:#fff;color:#102b3c;text-align:left;overflow-wrap:anywhere;box-shadow:0 5px 13px rgba(4,44,70,.08)}"),
(".agenda-day b{margin-top:7px;color:#06763a;font-size:17px;line-height:1.3}",
 ".agenda-day b{margin-top:7px;color:#078f45;font-size:17px;font-weight:950;line-height:1.3}"),
(".agenda-day em{margin-top:6px;color:#425b69;font-size:14px;font-style:normal;line-height:1.35}",
 ".agenda-day em{margin-top:6px;color:#3e5e6d;font-size:14px;font-weight:650;font-style:normal;line-height:1.35}"),
(".agenda-day.selected{border-color:#0d5f8a;background:#e1f1f8;box-shadow:0 0 0 3px rgba(13,95,138,.15)}",
 ".agenda-day.selected{border-color:#0876a6;background:#dff2fb;box-shadow:0 0 0 4px rgba(8,118,166,.18),0 7px 16px rgba(4,44,70,.12)}"),
(".agenda-day:disabled{opacity:.58;background:#e4eaed;cursor:not-allowed}",
 ".agenda-day:disabled{opacity:1;background:#fff3f2;border-color:#d8aaa7;color:#526a76;cursor:not-allowed;box-shadow:none}.agenda-day:disabled strong{color:#536c79}.agenda-day:disabled span{opacity:.88}.agenda-day:disabled b{color:#b54039}.agenda-day:disabled em{color:#6b7f89}"),
]
for old,new in repls: t=once(t,old,new,p)
# Cores vivas por módulo somente em dias ativos.
needle=".agenda-day:disabled{opacity:1;background:#fff3f2;border-color:#d8aaa7;color:#526a76;cursor:not-allowed;box-shadow:none}.agenda-day:disabled strong{color:#536c79}.agenda-day:disabled span{opacity:.88}.agenda-day:disabled b{color:#b54039}.agenda-day:disabled em{color:#6b7f89}"
extra=needle+".portal-agenda[data-module=\"medica\"] .agenda-day:not(:disabled){border-color:#4b98bd;background:#f7fcff}.portal-agenda[data-module=\"nutricionista\"] .agenda-day:not(:disabled),.portal-agenda[data-module=\"enfermeira\"] .agenda-day:not(:disabled){border-color:#51a976;background:#f7fff9}"
t=once(t,needle,extra,p)
write(p,t)

# 2) A camada de controle integral continua responsável por recados/campanhas,
# mas deixa de redesenhar Médica/Nutricionista. As funções antigas permanecem no arquivo como fallback histórico.
p='portal-controle-integral.js'
t=read(p)
old="function render(data){if(!data||data.ok===false)return;lastData=data;renderAlerts(data);renderLegacy('medica',moduleDays(data,'medica'));renderLegacy('nutricionista',moduleDays(data,'nutricionista'))}"
new="function render(data){if(!data||data.ok===false)return;lastData=data;renderAlerts(data)}"
t=once(t,old,new,p)
write(p,t)

# 3) Força o iPhone/Web App a baixar somente os arquivos realmente alterados.
# Odontologia, formulário, WhatsApp e demais módulos mantêm exatamente seus URLs atuais.
p='index.html'
t=read(p)
for old,new in [
 ('portal-controle-integral.js?v=20260806-desempenho-v5','portal-controle-integral.js?v=20260813-portal-v104'),
 ('agenda-enfermeira.js?v=20260812-confirmacao-reparo-push-v5','agenda-enfermeira.js?v=20260813-portal-v104'),
]:
    t=once(t,old,new,p)
write(p,t)

print('PORTAL_V104_PATCH_OK')
