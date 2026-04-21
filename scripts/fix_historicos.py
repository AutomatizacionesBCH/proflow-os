"""
Corrección de operaciones históricas:
1. Elimina las operaciones con fx_rate_used=0 (las importadas antes)
2. Re-importa TODAS las 1384 filas del Excel SIN deduplicación
3. Asigna company_id = SMART GLOBAL ADVISORY en cada operación
4. Asigna processor_id real según fx_source (NMI o STRIPE)

Uso:
    python scripts/fix_historicos.py
"""

import os
import sys
import pandas as pd
from supabase import create_client, Client

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env.local')
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'OPERACIONES CON PROCESADORES.xlsx')


def cargar_env(path: str) -> dict:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env


def normalizar_rut(rut) -> str | None:
    if rut is None or (isinstance(rut, float) and pd.isna(rut)):
        return None
    rut_str = str(rut).strip()
    if rut_str.lower() in ('nan', 'none', ''):
        return None
    return rut_str.replace('.', '').replace(' ', '')


def main():
    # ── Credenciales ──────────────────────────────────────────────────────────
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
    print(f"✓ Conectado a Supabase: {url}\n")

    # ── Buscar SMART GLOBAL ADVISORY ─────────────────────────────────────────
    resp_comp = supabase.table('companies').select('id, name').execute()
    company_id = None
    company_name = None
    for c in (resp_comp.data or []):
        if 'smart' in c['name'].lower():
            company_id   = c['id']
            company_name = c['name']
            break
    if not company_id:
        print("ERROR: no se encontró ninguna empresa con 'smart' en el nombre.")
        print("  Empresas disponibles:", [c['name'] for c in (resp_comp.data or [])])
        sys.exit(1)
    print(f"✓ Empresa  : {company_name} → {company_id[:8]}...")

    # ── Buscar procesadores NMI y STRIPE ─────────────────────────────────────
    resp_proc = supabase.table('processors').select('id, name').execute()
    proc_map: dict[str, str] = {}
    for p in (resp_proc.data or []):
        name_up = p['name'].upper().strip()
        if 'NMI' in name_up:
            proc_map['NMI'] = p['id']
            print(f"✓ Procesador NMI    → {p['id'][:8]}... (nombre: {p['name']})")
        if 'STRIPE' in name_up:
            proc_map['STRIPE'] = p['id']
            print(f"✓ Procesador STRIPE → {p['id'][:8]}... (nombre: {p['name']})")

    if not proc_map:
        print("ADVERTENCIA: no se encontraron procesadores NMI ni STRIPE.")
        print("  Procesadores disponibles:", [p['name'] for p in (resp_proc.data or [])])

    # ── 1. Eliminar operaciones históricas (fx_rate_used = 0) ─────────────────
    print("\n→ Eliminando operaciones con fx_rate_used = 0 ...")
    resp_del = supabase.table('operations').delete().eq('fx_rate_used', 0).execute()
    eliminadas = len(resp_del.data or [])
    print(f"  {eliminadas} operaciones eliminadas")

    # ── 2. Cargar Excel ───────────────────────────────────────────────────────
    if not os.path.exists(EXCEL_FILE):
        print(f"ERROR: no se encontró {EXCEL_FILE}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_FILE)
    print(f"\n✓ Excel cargado: {len(df)} filas")

    requeridas = {'nombre_cliente', 'fecha', 'monto_usd', 'pagado_clp', 'procesador'}
    faltantes  = requeridas - set(df.columns)
    if faltantes:
        print(f"ERROR: columnas faltantes: {faltantes}")
        sys.exit(1)

    # ── 3. Pre-cargar clientes ────────────────────────────────────────────────
    print("→ Cargando clientes existentes...")
    clientes_por_rut:    dict[str, str] = {}
    clientes_por_nombre: dict[str, str] = {}
    pagina = 0
    while True:
        resp = supabase.table('clients').select('id, full_name, document_id') \
            .range(pagina * 1000, pagina * 1000 + 999).execute()
        lote = resp.data or []
        for c in lote:
            if c['document_id']:
                clientes_por_rut[c['document_id'].strip()] = c['id']
            clientes_por_nombre[c['full_name'].strip().upper()] = c['id']
        if len(lote) < 1000:
            break
        pagina += 1
    print(f"  {len(clientes_por_nombre)} clientes cargados")

    # ── 4. Re-importar SIN deduplicación ─────────────────────────────────────
    total           = len(df)
    insertadas      = 0
    clientes_nuevos = 0
    errores         = 0

    print(f"\n→ Importando {total} filas (sin deduplicación)...\n")

    for idx, row in df.iterrows():
        try:
            nombre = str(row.get('nombre_cliente', '') or '').strip()
            if not nombre or nombre.upper() == 'NAN':
                errores += 1
                continue

            rut   = normalizar_rut(row.get('rut'))
            email = str(row.get('email', '') or '').strip()
            email = None if email.lower() in ('nan', 'none', '') else email

            fecha_raw = row.get('fecha')
            if not isinstance(fecha_raw, str) and pd.isna(fecha_raw):
                errores += 1
                continue
            fecha_str = pd.to_datetime(fecha_raw).strftime('%Y-%m-%d')

            monto_usd  = float(row.get('monto_usd',  0) or 0)
            pagado_clp = float(row.get('pagado_clp', 0) or 0)

            procesador = str(row.get('procesador', '') or '').strip().upper()
            if not procesador or procesador == 'NAN':
                procesador = None

            # Buscar o crear cliente
            client_id = None
            if rut:
                client_id = clientes_por_rut.get(rut)
            if not client_id:
                client_id = clientes_por_nombre.get(nombre.upper())
            if not client_id:
                nuevo = {
                    'full_name':   nombre,
                    'document_id': rut or None,
                    'email':       email,
                    'tags':        [],
                }
                resp_c = supabase.table('clients').insert(nuevo).execute()
                if not resp_c.data:
                    errores += 1
                    continue
                client_id = resp_c.data[0]['id']
                clientes_nuevos += 1
                if rut:
                    clientes_por_rut[rut] = client_id
                clientes_por_nombre[nombre.upper()] = client_id

            # Resolver processor_id real desde el mapa
            processor_id = proc_map.get(procesador) if procesador else None

            operacion = {
                'client_id':         client_id,
                'company_id':        company_id,
                'processor_id':      processor_id,
                'operation_date':    fecha_str,
                'amount_usd':        monto_usd,
                'amount_clp_paid':   pagado_clp,
                'fx_source':         procesador,
                'status':            'completada',
                'fx_rate_used':      0,
                'client_payout_pct': 0,
                'processor_fee_pct': 0,
                'loan_fee_pct':      0,
                'payout_fee_pct':    0,
                'wire_fee_usd':      0,
                'receive_fee_usd':   0,
            }

            resp_o = supabase.table('operations').insert(operacion).execute()
            if resp_o.data:
                insertadas += 1
            else:
                print(f"  [ERROR] Fila {idx+2}: insert sin datos")
                errores += 1

        except Exception as e:
            print(f"  [ERROR] Fila {idx+2}: {e}")
            errores += 1

    print('\n' + '═' * 50)
    print('  RESUMEN DE CORRECCIÓN')
    print('═' * 50)
    print(f'  Eliminadas (previas)   : {eliminadas}')
    print(f'  Total filas Excel      : {total}')
    print(f'  Operaciones insertadas : {insertadas}')
    print(f'  Clientes nuevos        : {clientes_nuevos}')
    print(f'  Errores                : {errores}')
    print('═' * 50)


if __name__ == '__main__':
    main()
