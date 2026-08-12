#!/usr/bin/env python3
from pathlib import Path
p=Path('scripts/apply_publicacoes_notificacoes_multiarea_v1.py')
s=p.read_text(encoding='utf-8')
old="""var area = String(morador && morador.areaId || 'JAPARANDUBA')
      .trim()
      .toUpperCase()"""
new="""var area = String(morador && morador.areaId || 'JAPARANDUBA')
      .toUpperCase()"""
if old in s:s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
