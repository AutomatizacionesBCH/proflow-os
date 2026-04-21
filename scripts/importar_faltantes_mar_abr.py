"""
Importa operaciones desde "OPERACIONES FALTANTES MAR ABR.xlsx":
- Busca cliente por RUT (document_id), luego por nombre normalizado; crea si no existe
- Procesador: NMI, Empresa: SMART GLOBAL ADVISORY
- amount_usd = columna USD, operation_date = columna Fecha (DD/MM/YYYY)
- fx_rate_used=0, client_payout_pct=0, status='completada'

Uso:
    python scripts/importar_faltantes_mar_abr.py
"""

import os
import sys
import re
import unicodedata
import pandas as pd
from supabase import create_client, Client

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env.local')
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'OPERACIONES FALTANTES MAR ABR.xlsx')


def cargar_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env


def normalizar_rut(rut):
    if not rut or str(rut).strip().lower() in ('nan', 'none', ''):
        return None
    return str(rut).strip().replace('.', '').replace(' ', '')


def normalizar_nombre(texto):
    if not texto:
        return ''
    texto = unicodedata.normalize('NFD', str(texto))
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', texto).strip().upper()


def main():
    if not os.path.exists(ENV_FILE):
        print(f"ERROR: no se encontró {ENV_FILE}")
        sys.exit(1)

    env = cargar_env(ENV_FILE)
    url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url or not key:
        print("ERROR: faltan credenciales en .env.local")
        sys.exit(1)

    supabase: Client = create_client(url, key)
    print(f"✓ Conectado: {url}\n")

    # ── Empresa y procesador ──────────────────────────────────────────────────
    companies = supabase.table('companies').select('id, name').execute().data or []
    company_id = next((c['id'] for c in companies if 'SMART' in c['name'].upper()), None)
    if not company_id:
        print("ERROR: no se encontró empresa SMART GLOBAL ADVISORY")
        sys.exit(1)
    print(f"✓ Empresa SMART GLOBAL ADVISORY → {company_id[:8]}...")

    processors = supabase.table('processors').select('id, name').execute().data or []
    nmi_id = next((p['id'] for p in processors if 'NMI' in p['name'].upper()), None)
    if not nmi_id:
        print("ERROR: no se encontró procesador NMI")
        sys.exit(1)
    print(f"✓ Procesador NMI → {nmi_id[:8]}...\n")

    # ── Clientes existentes ───────────────────────────────────────────────────
    clientes_db = supabase.table('clients').select('id, full_name, document_id').limit(10000).execute().data or []
    clientes_por_rut    = {c['document_id']: c['id'] for c in clientes_db if c.get('document_id')}
    clientes_por_nombre = {normalizar_nombre(c['full_name']): c['id'] for c in clientes_db}
    print(f"→ {len(clientes_db)} clientes existentes cargados ({len(clientes_por_rut)} con RUT)\n")

    # ── Leer Excel ────────────────────────────────────────────────────────────
    df = pd.read_excel(EXCEL_FILE)
    print(f"✓ Excel: {len(df)} filas a importar\n")

    insertadas   = 0
    clientes_new = 0
    errores      = 0

    for _, row in df.iterrows():
        nombre = str(row['Nombre Destino/Origen']).strip()
        rut    = normalizar_rut(row.get('Rut Origen/Destino'))
        amount = float(row['USD'])
        fecha  = pd.to_datetime(row['Fecha'], dayfirst=True).strftime('%Y-%m-%d')

        # Buscar cliente: RUT → nombre normalizado
        client_id = None
        if rut and rut in clientes_por_rut:
            client_id = clientes_por_rut[rut]
        elif normalizar_nombre(nombre) in clientes_por_nombre:
            client_id = clientes_por_nombre[normalizar_nombre(nombre)]

        # Crear cliente si no existe
        if not client_id:
            nuevo = {'full_name': nombre.upper()}
            if rut:
                nuevo['document_id'] = rut
            res = supabase.table('clients').insert(nuevo).execute()
            if res.data:
                client_id = res.data[0]['id']
                clientes_por_nombre[normalizar_nombre(nombre)] = client_id
                if rut:
                    clientes_por_rut[rut] = client_id
                clientes_new += 1
            else:
                print(f"  ERROR creando cliente {nombre}")
                errores += 1
                continue

        # Insertar operación
        op = {
            'client_id':         client_id,
            'company_id':        company_id,
            'processor_id':      nmi_id,
            'operation_date':    fecha,
            'amount_usd':        amount,
            'fx_rate_used':      0,
            'fx_source':         'NMI',
            'client_payout_pct': 0,
            'status':            'completada',
        }
        res = supabase.table('operations').insert(op).execute()
        if res.data:
            insertadas += 1
        else:
            print(f"  ERROR insertando operación {nombre} {fecha}")
            errores += 1

    print()
    print('══════════════════════════════════════════════')
    print('  RESUMEN IMPORTACIÓN FALTANTES MAR/ABR')
    print('══════════════════════════════════════════════')
    print(f'  Operaciones insertadas      : {insertadas}')
    print(f'  Clientes nuevos creados     : {clientes_new}')
    print(f'  Errores                     : {errores}')
    print('══════════════════════════════════════════════')


if __name__ == '__main__':
    main()
