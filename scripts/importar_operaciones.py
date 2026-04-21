"""
Importador de operaciones históricas desde Excel a Supabase.
Archivo fuente: OPERACIONES CON PROCESADORES.xlsx (raíz del proyecto)

Uso:
    python scripts/importar_operaciones.py
"""

import os
import re
import sys
import pandas as pd
from datetime import datetime
from supabase import create_client, Client

# ── Rutas ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env.local')
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'OPERACIONES CON PROCESADORES.xlsx')


# ── Leer .env.local ──────────────────────────────────────────────────────────
def cargar_env(path: str) -> dict:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env


# ── Normalizar RUT ───────────────────────────────────────────────────────────
def normalizar_rut(rut) -> str | None:
    """Elimina puntos y espacios. '17.590.573-1' → '17590573-1'"""
    if rut is None or (isinstance(rut, float) and pd.isna(rut)):
        return None
    rut_str = str(rut).strip()
    if rut_str.lower() in ('nan', 'none', ''):
        return None
    return rut_str.replace('.', '').replace(' ', '')


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    # 1. Credenciales
    if not os.path.exists(ENV_FILE):
        print(f"ERROR: no se encontró {ENV_FILE}")
        sys.exit(1)

    env  = cargar_env(ENV_FILE)
    url  = env.get('NEXT_PUBLIC_SUPABASE_URL')
    key  = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if not url or not key:
        print("ERROR: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local")
        sys.exit(1)

    supabase: Client = create_client(url, key)
    print(f"✓ Conectado a Supabase: {url}")

    # 2. Cargar Excel
    if not os.path.exists(EXCEL_FILE):
        print(f"ERROR: no se encontró {EXCEL_FILE}")
        sys.exit(1)

    df = pd.read_excel(EXCEL_FILE)
    print(f"✓ Excel cargado: {len(df)} filas")

    # Columnas mínimas requeridas
    requeridas = {'nombre_cliente', 'fecha', 'monto_usd', 'pagado_clp', 'procesador'}
    faltantes  = requeridas - set(df.columns)
    if faltantes:
        print(f"ERROR: columnas faltantes en el Excel: {faltantes}")
        sys.exit(1)

    # 3. Pre-cargar clientes existentes: document_id → id
    print("→ Cargando clientes existentes...")
    clientes_por_rut:    dict[str, str] = {}   # document_id → client UUID
    clientes_por_nombre: dict[str, str] = {}   # full_name normalizado → client UUID

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

    print(f"  {len(clientes_por_rut)} clientes con RUT / {len(clientes_por_nombre)} total")

    # 4. Pre-cargar operaciones existentes para deduplicación
    # Clave: (client_id, operation_date, amount_usd)
    print("→ Cargando operaciones existentes para deduplicación...")
    ops_existentes: set[tuple] = set()

    pagina = 0
    while True:
        resp = supabase.table('operations') \
            .select('client_id, operation_date, amount_usd') \
            .range(pagina * 1000, pagina * 1000 + 999).execute()
        lote = resp.data or []
        for o in lote:
            fecha_str = o['operation_date'][:10] if o['operation_date'] else ''
            ops_existentes.add((o['client_id'], fecha_str, float(o['amount_usd'])))
        if len(lote) < 1000:
            break
        pagina += 1

    print(f"  {len(ops_existentes)} operaciones ya existentes")

    # 5. Procesar filas
    total           = len(df)
    insertadas      = 0
    clientes_nuevos = 0
    duplicados      = 0
    errores         = 0

    print(f"\n→ Procesando {total} filas...\n")

    for idx, row in df.iterrows():
        try:
            nombre = str(row.get('nombre_cliente', '') or '').strip()
            if not nombre or nombre.upper() == 'NAN':
                print(f"  [SALTAR] Fila {idx+2}: nombre vacío")
                errores += 1
                continue

            rut   = normalizar_rut(row.get('rut'))
            email = str(row.get('email', '') or '').strip()
            email = None if email.lower() in ('nan', 'none', '') else email

            # ── Fecha ──────────────────────────────────────────────────────
            fecha_raw = row.get('fecha')
            if pd.isna(fecha_raw) if hasattr(fecha_raw, '__class__') and not isinstance(fecha_raw, str) else False:
                print(f"  [SALTAR] Fila {idx+2}: fecha vacía")
                errores += 1
                continue
            fecha_str = pd.to_datetime(fecha_raw).strftime('%Y-%m-%d')

            # ── Montos ─────────────────────────────────────────────────────
            monto_usd  = float(row.get('monto_usd', 0) or 0)
            pagado_clp = float(row.get('pagado_clp', 0) or 0)

            # ── Procesador → fx_source en MAYÚSCULAS ───────────────────────
            procesador = str(row.get('procesador', '') or '').strip().upper()
            if not procesador or procesador == 'NAN':
                procesador = None

            # ── Buscar o crear cliente ─────────────────────────────────────
            client_id = None

            if rut:
                client_id = clientes_por_rut.get(rut)

            if not client_id:
                # Buscar por nombre exacto (normalizado)
                client_id = clientes_por_nombre.get(nombre.upper())

            if not client_id:
                # Crear cliente nuevo
                nuevo = {
                    'full_name':   nombre,
                    'document_id': rut or None,
                    'email':       email,
                    'tags':        [],
                }
                resp_c = supabase.table('clients').insert(nuevo).execute()
                if not resp_c.data:
                    print(f"  [ERROR] Fila {idx+2}: no se pudo crear cliente '{nombre}'")
                    errores += 1
                    continue

                client_id = resp_c.data[0]['id']
                clientes_nuevos += 1

                # Actualizar caché local
                if rut:
                    clientes_por_rut[rut] = client_id
                clientes_por_nombre[nombre.upper()] = client_id

                print(f"  [NUEVO CLIENTE] {nombre} (RUT: {rut or '—'}) → {client_id[:8]}...")

            # ── Verificar duplicado ────────────────────────────────────────
            clave_dup = (client_id, fecha_str, monto_usd)
            if clave_dup in ops_existentes:
                duplicados += 1
                continue

            # ── Insertar operación ─────────────────────────────────────────
            operacion = {
                'client_id':         client_id,
                'operation_date':    fecha_str,
                'amount_usd':        monto_usd,
                'amount_clp_paid':   pagado_clp,
                'fx_source':         procesador,
                'status':            'completada',
                # Campos requeridos por el esquema — sin datos históricos
                'fx_rate_used':      0,
                'client_payout_pct': 0,
                'processor_fee_pct': 0,
                'loan_fee_pct':      0,
                'payout_fee_pct':    0,
                'wire_fee_usd':      0,
                'receive_fee_usd':   0,
            }

            resp_o = supabase.table('operations').insert(operacion).execute()
            if not resp_o.data:
                print(f"  [ERROR] Fila {idx+2}: no se pudo insertar operación")
                errores += 1
                continue

            # Registrar en caché de dedup para esta sesión
            ops_existentes.add(clave_dup)
            insertadas += 1

        except Exception as e:
            print(f"  [ERROR] Fila {idx+2}: {e}")
            errores += 1

    # 6. Resumen final
    print('\n' + '═' * 50)
    print('  RESUMEN DE IMPORTACIÓN')
    print('═' * 50)
    print(f'  Total filas procesadas : {total}')
    print(f'  Operaciones insertadas : {insertadas}')
    print(f'  Clientes nuevos creados: {clientes_nuevos}')
    print(f'  Duplicados saltados    : {duplicados}')
    print(f'  Errores                : {errores}')
    print('═' * 50)


if __name__ == '__main__':
    main()
