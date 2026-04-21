"""
Importa operaciones desde "STRIPE - CONSOLIDADO HASTA 02-03-2025.xlsx":
- Excluye filas de HERNAN VILLEGAS
- Busca cliente existente por nombre normalizado; si no existe, lo crea
- Crea operación con processor=STRIPE, company=SMART GLOBAL ADVISORY
- fx_rate_used=0, client_payout_pct=0 (datos no disponibles en el archivo)
- status='completada'

Uso:
    python scripts/importar_stripe.py
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
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'STRIPE - CONSOLIDADO HASTA 02-03-2025.xlsx')


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

    # ── Buscar empresa y procesador ───────────────────────────────────────────
    companies = supabase.table('companies').select('id, name').execute().data or []
    company_id = next((c['id'] for c in companies if 'SMART' in c['name'].upper()), None)
    if not company_id:
        print("ERROR: no se encontró empresa SMART GLOBAL ADVISORY")
        sys.exit(1)
    print(f"✓ Empresa SMART GLOBAL ADVISORY → {company_id[:8]}...")

    processors = supabase.table('processors').select('id, name').execute().data or []
    stripe_id = next((p['id'] for p in processors if 'STRIPE' in p['name'].upper()), None)
    if not stripe_id:
        print("ERROR: no se encontró procesador STRIPE")
        sys.exit(1)
    print(f"✓ Procesador STRIPE → {stripe_id[:8]}...\n")

    # ── Cargar clientes existentes ────────────────────────────────────────────
    clientes_db = supabase.table('clients').select('id, full_name, email').limit(10000).execute().data or []
    # Mapa nombre_normalizado → id
    clientes_por_nombre = {normalizar(c['full_name']): c['id'] for c in clientes_db}
    # Mapa email → id
    clientes_por_email = {c['email'].lower(): c['id'] for c in clientes_db if c.get('email')}
    print(f"→ {len(clientes_db)} clientes existentes cargados\n")

    # ── Leer Excel ────────────────────────────────────────────────────────────
    df = pd.read_excel(EXCEL_FILE)
    print(f"✓ Excel: {len(df)} filas totales")

    # Excluir HERNAN VILLEGAS
    mask_hernan = df['Customer Name'].str.upper().str.contains(
        r'\bHERNAN\b.*VILLEGAS|VILLEGAS.*\bHERNAN\b', na=False, regex=True
    )
    excluidas = mask_hernan.sum()
    df = df[~mask_hernan].reset_index(drop=True)
    print(f"→ {excluidas} filas excluidas (HERNAN VILLEGAS)")
    print(f"→ {len(df)} filas a importar\n")

    # ── Importar ──────────────────────────────────────────────────────────────
    insertadas   = 0
    clientes_new = 0
    errores      = 0

    for _, row in df.iterrows():
        nombre = str(row['Customer Name']).strip()
        email  = str(row['Customer Email']).strip().lower() if pd.notna(row['Customer Email']) else None
        amount = float(row['Amount Paid'])
        fecha  = row['Date (UTC)'].strftime('%Y-%m-%d')

        # Buscar cliente: primero por email, luego por nombre normalizado
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
            res = supabase.table('clients').insert(nuevo).execute()
            if res.data:
                client_id = res.data[0]['id']
                clientes_por_nombre[normalizar(nombre)] = client_id
                if email:
                    clientes_por_email[email] = client_id
                clientes_new += 1
            else:
                print(f"  ERROR creando cliente {nombre}")
                errores += 1
                continue

        # Insertar operación
        op = {
            'client_id':         client_id,
            'company_id':        company_id,
            'processor_id':      stripe_id,
            'operation_date':    fecha,
            'amount_usd':        amount,
            'fx_rate_used':      0,
            'fx_source':         'STRIPE',
            'client_payout_pct': 0,
            'status':            'completada',
        }
        res = supabase.table('operations').insert(op).execute()
        if res.data:
            insertadas += 1
        else:
            print(f"  ERROR insertando operación {nombre} {fecha}: {res}")
            errores += 1

    print()
    print('══════════════════════════════════════════════')
    print('  RESUMEN IMPORTACIÓN STRIPE')
    print('══════════════════════════════════════════════')
    print(f'  Excluidas (Hernan Villegas) : {excluidas}')
    print(f'  Operaciones insertadas      : {insertadas}')
    print(f'  Clientes nuevos creados     : {clientes_new}')
    print(f'  Errores                     : {errores}')
    print('══════════════════════════════════════════════')


if __name__ == '__main__':
    main()
