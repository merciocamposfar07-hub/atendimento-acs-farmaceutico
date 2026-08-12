#!/usr/bin/env python3
from pathlib import Path

# Corrige diretamente a função aninhada atual do OneSignal.
p=Path('agenda-enfermeira.js')
s=p.read_text(encoding='utf-8')
start=s.find('        function areaAtualDaUnidade() {')
end=s.find('\n        function estadoInscricao()',start)
if start<0 or end<0:
    raise SystemExit('Função real areaAtualDaUnidade não encontrada')
new="""        function areaAtualDaUnidade() {
          var area = '';
          try {
            if (window.PortalTacsArea && typeof window.PortalTacsArea.id === 'function') {
              area = window.PortalTacsArea.id();
            }
          } catch (erroArea) {}
          if (!area) area = window.TACS_AREA_ID || '';
          if (!area) {
            var morador = window.TACS_MORADOR_ATUAL;
            area = morador && morador.areaId || '';
          }
          area = String(area || 'JAPARANDUBA')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
          return area || 'JAPARANDUBA';
        }
"""
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')

# Faz o aplicador reconhecer que o estado desejado já foi aplicado.
p=Path('scripts/apply_publicacoes_notificacoes_multiarea_v1.py')
s=p.read_text(encoding='utf-8')
block_start=s.find("# OneSignal: usar a área oficial")
block_end=s.find("# Novo módulo entra no pacote de produção.",block_start)
if block_start<0 or block_end<0:
    raise SystemExit('Bloco OneSignal do aplicador não encontrado')
s=s[:block_start]+"# OneSignal já corrigido estruturalmente pelo fix_apply_onesignal_helper.py.\n\n"+s[block_end:]
p.write_text(s,encoding='utf-8')
