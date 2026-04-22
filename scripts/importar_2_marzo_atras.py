"""
Importa operaciones desde "OPERACIONES 2 DE MARZO HACIA ATRAS.xlsx".

Estructura del Excel: FECHA, NOMBRE, EMAIL, TELEFONO, MONTO, PROCESADOR
- Procesadores soportados: STRIPE, NMI
- Empresa: SMART GLOBAL ADVISORY (unica activa)
- Match cliente: email -> nombre normalizado -> crea nuevo
- Si el cliente nuevo trae telefono se guarda
- fx_rate_used=0, client_payout_pct=0 (datos no disponibles en el archivo)
- status='completada'

Uso:
    python scripts/importar_2_marzo_atras.py
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
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'OPERACIONES 2 DE MARZO HACIA ATRAS.xlsx')


def cargar_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env


def normalizar(texto):
    if not texto:
        return ''
    texto = unicodedata.normalize('NFD', str(texto))
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', texto).strip().upper()


def normalizar_telefono(tel):
    if tel is None or (isinstance(tel, float) and pd.isna(tel)):
        return None
    s = re.sub(r'\D', '', str(tel))
    return s or None


def main():
    if not os.path.exists(ENV_FILE):
        print(f"ERROR: no se encontro {ENV_FILE}")
        sys.exit(1)
    if not os.path.exists(EXCEL_FILE):
        print(f"ERROR: no se encontro {EXCEL_FILE}")
        sys.exit(1)

    env = cargar_env(ENV_FILE)
    url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    # Preferir service_role para bypass de RLS y mejor manejo
    key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url or not key:
        print("ERROR: faltan credenciales en .env.local")
        sys.exit(1)

    supabase: Client = create_client(url, key)
    print(f"OK Conectado: {url}\n")

    # Empresa
    companies = supabase.table('companies').select('id, name').execute().data or []
    company_id = next((c['id'] for c in companies if 'SMART' in c['name'].upper()), None)
    if not company_id:
        print("ERROR: no se encontro empresa SMART GLOBAL ADVISORY")
        sys.exit(1)
    print(f"OK Empresa SMART GLOBAL ADVISORY -> {company_id[:8]}...")

    # Procesadores
    processors = supabase.table('processors').select('id, name').execute().data or []
    proc_map = {}
    for p in processors:
        n = p['name'].upper()
        if 'STRIPE' in n:
            proc_map['STRIPE'] = p['id']
        if 'NMI' in n:
            proc_map['NMI'] = p['id']
    if 'STRIPE' not in proc_map or 'NMI' not in proc_map:
        print(f"ERROR: faltan procesadores. Encontrados: {list(proc_map.keys())}")
        sys.exit(1)
    print(f"OK Procesador STRIPE -> {proc_map['STRIPE'][:8]}...")
    print(f"OK Procesador NMI    -> {proc_map['NMI'][:8]}...\n")

    # Clientes existentes
    clientes_db = supabase.table('clients').select('id, full_name, email, phone').limit(10000).execute().data or []
    clientes_por_nombre = {normalizar(c['full_name']): c['id'] for c in clientes_db}
    clientes_por_email  = {c['email'].lower(): c['id'] for c in clientes_db if c.get('email')}
    print(f"-> {len(clientes_db)} clientes existentes cargados\n")

    # Excel
    df = pd.read_excel(EXCEL_FILE)
    df = df.dropna(how='all').reset_index(drop=True)
    print(f"OK Excel: {len(df)} filas a procesar\n")

    insertadas    = 0
    clientes_new  = 0
    errores       = 0
    saltadas_proc = 0

    for idx, row in df.iterrows():
        fecha_raw = row['FECHA']
        nombre    = str(row['NOMBRE']).strip() if pd.notna(row['NOMBRE']) else None
        email     = str(row['EMAIL']).strip().lower() if pd.notna(row['EMAIL']) else None
        telefono  = normalizar_telefono(row['TELEFONO'])
        monto     = float(row['MONTO']) if pd.notna(row['MONTO']) else 0.0
        proc_name = str(row['PROCESADOR']).strip().upper() if pd.notna(row['PROCESADOR']) else None

        if not nombre or not fecha_raw or not proc_name:
            print(f"  fila {idx+2}: faltan datos (nombre/fecha/procesador), saltada")
            errores += 1
            continue

        if proc_name not in proc_map:
            print(f"  fila {idx+2}: procesador desconocido '{proc_name}', saltada")
            saltadas_proc += 1
            continue

        fecha = pd.to_datetime(fecha_raw).strftime('%Y-%m-%d')

        # Match cliente
        client_id = None
        if email and email in clientes_por_email:
            client_id = clientes_por_email[email]
        elif normalizar(nombre) in clientes_por_nombre:
            client_id = clientes_por_nombre[normalizar(nombre)]

        # Crear cliente si no existe
        if not client_id:
            nuevo = {'full_name': nombre.upper()}
            if email:
                nuevo['email'] = email
            if telefono:
                nuevo['phone'] = telefono
            res = supabase.table('clients').insert(nuevo).execute()
            if res.data:
                client_id = res.data[0]['id']
                clientes_por_nombre[normalizar(nombre)] = client_id
                if email:
                    clientes_por_email[email] = client_id
                clientes_new += 1
            else:
                print(f"  fila {idx+2}: ERROR creando cliente {nombre}")
                errores += 1
                continue

        op = {
            'client_id':         client_id,
            'company_id':        company_id,
            'processor_id':      proc_map[proc_name],
            'operation_date':    fecha,
            'amount_usd':        monto,
            'fx_rate_used':      0,
            'fx_source':         proc_name,
            'client_payout_pct': 0,
            'status':            'completada',
        }
        res = supabase.table('operations').insert(op).execute()
        if res.data:
            insertadas += 1
        else:
            print(f"  fila {idx+2}: ERROR insertando op {nombre} {fecha}: {res}")
            errores += 1

    print()
    print('==============================================')
    print('  RESUMEN IMPORTACION 2 DE MARZO HACIA ATRAS')
    print('==============================================')
    print(f'  Filas en Excel              : {len(df)}')
    print(f'  Operaciones insertadas      : {insertadas}')
    print(f'  Clientes nuevos creados     : {clientes_new}')
    print(f'  Saltadas (procesador desc.) : {saltadas_proc}')
    print(f'  Errores                     : {errores}')
    print('==============================================')


if __name__ == '__main__':
    main()
