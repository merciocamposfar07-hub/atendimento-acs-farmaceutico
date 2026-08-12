#!/usr/bin/env python3
from pathlib import Path
p=Path('teste-v1/painel-recados-campanhas-v1.html')
s=p.read_text(encoding='utf-8')
old="Entre como administrador ou TACS da área. A conexão já está sendo preparada em segundo plano."
new="Digite o PIN administrativo ou entre como TACS da área. A conexão já está sendo preparada em segundo plano."
if old not in s and new not in s:raise SystemExit('Mensagem inicial do painel não encontrada')
if old in s:s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
