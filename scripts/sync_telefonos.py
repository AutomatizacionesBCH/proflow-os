"""
Sincroniza teléfonos desde 'CLIENTES LCC - BASE LIMPIA.xlsx' a Supabase.

Lógica:
  1. Match por RUT (normalizado sin puntos)
  2. Si no hay match por RUT, intenta por nombre (normalizado)
  3. Si el cliente no existe, lo crea
  4. Siempre asigna el teléfono (y el email si el cliente no tenía)

Uso:
    python scripts/sync_telefonos.py
"""

import os
import sys
import unicodedata
import pandas as pd
from supabase import create_client, Client

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env.local')
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'CLIENTES LCC - BASE LIMPIA.xlsx')


# ── Utilidades ────────────────────────────────────────────────────────────────

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
    """'17.590.573-1' → '17590573-1'"""
    if rut is None or (isinstance(rut, float) and pd.isna(rut)):
        return None
    s = str(rut).strip()
    if s.lower() in ('nan', 'none', ''):
        return None
    return s.replace('.', '').replace(' ', '').upper()


def normalizar_nombre(nombre: str) -> str:
    """Mayúsculas, sin tildes, sin espacios dobles."""
    nfkd = unicodedata.normalize('NFKD', nombre)
    ascii_str = ''.join(c for c in nfkd if not unicodedata.combining(c))
    return ' '.join(ascii_str.upper().split())


def formatear_telefono(tel) -> str | None:
    """5.697336e+10 → '56973360000'"""
    if tel is None or (isinstance(tel, float) and pd.isna(tel)):
        return None
    try:
        return str(int(float(tel)))
    except (ValueError, TypeError):
        s = str(tel).strip()
        return s if s and s.lower() not in ('nan', 'none', '') else None


def nombre_tokens(nombre: str) -> set:
    """Divide en palabras para comparación parcial."""
    return set(normalizar_nombre(nombre).split())


def nombres_similares(a: str, b: str) -> bool:
    """True si comparten al menos 2 tokens (palabras del nombre)."""
    ta = nombre_tokens(a)
    tb = nombre_tokens(b)
    # Ignora palabras cortas que son artículos comunes
    stop = {'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'E'}
    ta -= stop
    tb -= stop
    return len(ta & tb) >= 2


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not os.path.exists(ENV_FILE):
        print(f"ERROR: no se encontró {ENV_FILE}")
        sys.exit(1)

    env = cargar_env(ENV_FILE)
    url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    supabase: Client = create_client(url, key)
    print(f"✓ Conectado: {url}\n")

    # ── Cargar Excel ──────────────────────────────────────────────────────────
    df = pd.read_excel(EXCEL_FILE)
    print(f"✓ Excel: {len(df)} filas\n")

    # ── Cargar todos los clientes de Supabase ─────────────────────────────────
    print("→ Cargando clientes desde Supabase...")
    todos: list[dict] = []
    pagina = 0
    while True:
        resp = supabase.table('clients') \
            .select('id, full_name, document_id, phone, email') \
            .range(pagina * 1000, pagina * 1000 + 999).execute()
        lote = resp.data or []
        todos.extend(lote)
        if len(lote) < 1000:
            break
        pagina += 1

    # Índices para búsqueda rápida
    por_rut:    dict[str, dict] = {}
    por_nombre: dict[str, dict] = {}   # nombre_norm → cliente
    for c in todos:
        rut_norm = normalizar_rut(c['document_id'])
        if rut_norm:
            por_rut[rut_norm] = c
        nombre_norm = normalizar_nombre(c['full_name'])
        por_nombre[nombre_norm] = c

    print(f"  {len(todos)} clientes cargados ({len(por_rut)} con RUT)\n")

    # ── Procesar cada fila del Excel ──────────────────────────────────────────
    actualizados    = 0
    creados         = 0
    sin_telefono    = 0
    match_rut       = 0
    match_nombre    = 0
    no_match        = 0

    log_nombre_match: list[str] = []

    for idx, row in df.iterrows():
        nombre_excel = str(row.get('nombre', '') or '').strip()
        rut_excel    = normalizar_rut(row.get('rut'))
        tel_excel    = formatear_telefono(row.get('telefono'))
        email_excel  = str(row.get('email', '') or '').strip()
        email_excel  = None if email_excel.lower() in ('nan', 'none', '') else email_excel

        if not nombre_excel or nombre_excel.upper() == 'NAN':
            continue

        if not tel_excel:
            sin_telefono += 1
            continue

        cliente = None
        metodo  = None

        # 1. Match por RUT
        if rut_excel:
            cliente = por_rut.get(rut_excel)
            if cliente:
                metodo = 'rut'
                match_rut += 1

        # 2. Match por nombre exacto normalizado
        if not cliente:
            nombre_norm = normalizar_nombre(nombre_excel)
            cliente = por_nombre.get(nombre_norm)
            if cliente:
                metodo = 'nombre_exacto'
                match_nombre += 1

        # 3. Match por tokens (al menos 2 palabras en común)
        if not cliente:
            for nombre_db, c in por_nombre.items():
                if nombres_similares(nombre_excel, nombre_db):
                    cliente = c
                    metodo  = 'nombre_parcial'
                    match_nombre += 1
                    log_nombre_match.append(
                        f"  '{nombre_excel}' ↔ '{c['full_name']}'"
                    )
                    break

        # 4. No encontrado → crear
        if not cliente:
            no_match += 1
            nuevo = {
                'full_name':   nombre_excel,
                'document_id': rut_excel or None,
                'phone':       tel_excel,
                'email':       email_excel,
                'tags':        [],
            }
            resp_c = supabase.table('clients').insert(nuevo).execute()
            if resp_c.data:
                creados += 1
                new_id = resp_c.data[0]['id']
                # Actualizar índices locales
                if rut_excel:
                    por_rut[rut_excel] = resp_c.data[0]
                por_nombre[normalizar_nombre(nombre_excel)] = resp_c.data[0]
                print(f"  [NUEVO] {nombre_excel} (RUT: {rut_excel or '—'}) → {new_id[:8]}...")
            continue

        # 5. Actualizar teléfono (y email si faltaba)
        update: dict = {'phone': tel_excel}
        if email_excel and not cliente.get('email'):
            update['email'] = email_excel
        # Si el RUT del Excel no estaba en la DB, aprovecha de actualizarlo
        if rut_excel and not cliente.get('document_id'):
            update['document_id'] = rut_excel

        resp_u = supabase.table('clients').update(update).eq('id', cliente['id']).execute()
        if resp_u.data:
            actualizados += 1

    # ── Resumen ───────────────────────────────────────────────────────────────
    print('\n' + '═' * 55)
    print('  RESUMEN SINCRONIZACIÓN TELÉFONOS')
    print('═' * 55)
    print(f'  Total filas Excel          : {len(df)}')
    print(f'  Match por RUT              : {match_rut}')
    print(f'  Match por nombre           : {match_nombre}')
    print(f'  No encontrados (creados)   : {creados}')
    print(f'  Sin teléfono en Excel      : {sin_telefono}')
    print(f'  Clientes actualizados      : {actualizados}')
    print('═' * 55)

    if log_nombre_match:
        print(f'\n  Matches por nombre parcial ({len(log_nombre_match)}):')
        for ln in log_nombre_match[:30]:
            print(ln)
        if len(log_nombre_match) > 30:
            print(f'  ... y {len(log_nombre_match) - 30} más')


if __name__ == '__main__':
    main()
