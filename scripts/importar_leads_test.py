"""
Importa 2500 leads de prueba desde PROFLOW_LEADS_TEST_DATA.xlsx a Supabase.

- Usa los UUIDs del archivo para que sean trazables
- Upsert en batches de 100 (idempotente: se puede correr varias veces)
- Campos extra (ciudad, document_id, monto, sentiment, intent) → raw_payload
- Marca todos como TEST_DATA=true en raw_payload

Uso:
    python scripts/importar_leads_test.py
"""

import os
import sys
import math
import pandas as pd
from datetime import datetime

# ── Cargar variables de entorno ───────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env.local')
EXCEL_FILE   = os.path.join(PROJECT_ROOT, 'PROFLOW_LEADS_TEST_DATA.xlsx')

def cargar_env(path: str) -> dict:
    env = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = cargar_env(ENV_FILE)
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('ERROR: No se encontraron NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print('ERROR: Instala supabase con: pip install supabase')
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Helpers ───────────────────────────────────────────────────────────────────

def v(val):
    """Convierte NaN / None a None."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def fmt_dt(val) -> str | None:
    """datetime de Excel → string ISO."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    s = str(val).strip()
    return s if s else None

def to_int(val) -> int | None:
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None

# ── Leer Excel ────────────────────────────────────────────────────────────────

print(f'Leyendo {EXCEL_FILE}...')
df = pd.read_excel(EXCEL_FILE, engine='openpyxl', dtype=str)

# Convertir columnas numéricas y de fecha
df['heat_score']          = pd.to_numeric(df['heat_score'],          errors='coerce')
df['monto_estimado_usd']  = pd.to_numeric(df['monto_estimado_usd'],  errors='coerce')
df['last_interaction_at'] = pd.to_datetime(df['last_interaction_at'], errors='coerce')
df['created_at']          = pd.to_datetime(df['created_at'],          errors='coerce')

print(f'Filas leídas: {len(df)}')

# ── Construir registros ───────────────────────────────────────────────────────

records = []
for _, row in df.iterrows():
    # Campos extra que no existen en leads → van a raw_payload
    raw_payload = {
        'test_data':          True,
        'ciudad':             v(row.get('ciudad')),
        'document_id':        v(row.get('document_id')),
        'monto_estimado_usd': v(row.get('monto_estimado_usd')),
        'sentiment':          v(row.get('sentiment')),
        'intent_level':       v(row.get('intent_level')),
        'raw_payload_source': v(row.get('raw_payload_source')),
    }
    # Limpiar None del payload
    raw_payload = {k: val for k, val in raw_payload.items() if val is not None and val != 'nan'}

    lead_id   = v(row.get('id'))
    full_name = v(row.get('full_name'))
    if not lead_id or not full_name:
        continue

    notes_val = v(row.get('notes'))
    if isinstance(notes_val, str) and notes_val.lower() in ('nan', 'none', ''):
        notes_val = None

    # stage: validar que sea uno de los 9 stages permitidos
    VALID_STAGES = {'new','contacted','qualified','docs_pending','ready_to_schedule',
                    'ready_to_operate','operated','dormant','lost'}
    stage_val = v(row.get('stage'))
    if stage_val not in VALID_STAGES:
        stage_val = 'new'

    # priority_label
    VALID_PRIORITY = {'hot','warm','follow_up','cold'}
    priority_val = v(row.get('priority_label'))
    if priority_val not in VALID_PRIORITY:
        priority_val = 'cold'

    # Limpiar teléfono — quitar 'nan'
    phone_val    = v(row.get('phone'))
    whatsapp_val = v(row.get('whatsapp'))
    email_val    = v(row.get('email'))
    if isinstance(phone_val,    str) and phone_val.lower()    in ('nan','none',''): phone_val    = None
    if isinstance(whatsapp_val, str) and whatsapp_val.lower() in ('nan','none',''): whatsapp_val = None
    if isinstance(email_val,    str) and email_val.lower()    in ('nan','none',''): email_val    = None

    rec = {
        'id':                str(lead_id),
        'full_name':         str(full_name),
        'phone':             phone_val,
        'whatsapp':          whatsapp_val,
        'email':             email_val,
        'source_platform':   v(row.get('source_platform')) or 'otro',
        'source_channel':    v(row.get('source_channel'))  or 'otro',
        'campaign_name':     v(row.get('campaign_name')),
        'stage':             stage_val,
        'heat_score':        to_int(row.get('heat_score')),
        'priority_label':    priority_val,
        'assigned_to':       v(row.get('assigned_to')),
        'last_interaction_at': fmt_dt(row.get('last_interaction_at')),
        'created_at':        fmt_dt(row.get('created_at')),
        'notes':             notes_val,
        'raw_payload':       raw_payload,
    }

    # LinkedIn / X si vienen en el archivo
    linkedin_val = v(row.get('linkedin_profile'))
    x_handle_val = v(row.get('x_handle'))
    if isinstance(linkedin_val, str) and linkedin_val.lower() not in ('nan','none',''): rec['linkedin_profile'] = linkedin_val
    if isinstance(x_handle_val, str) and x_handle_val.lower() not in ('nan','none',''): rec['x_handle'] = x_handle_val

    records.append(rec)

print(f'Registros válidos a importar: {len(records)}')

# ── Upsert en batches ─────────────────────────────────────────────────────────

BATCH_SIZE  = 100
total_ok    = 0
total_error = 0

print(f'\nInsertando en batches de {BATCH_SIZE}...')

for i in range(0, len(records), BATCH_SIZE):
    batch = records[i : i + BATCH_SIZE]
    try:
        result = supabase.table('leads').upsert(batch, on_conflict='id').execute()
        total_ok += len(batch)
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f'  Batch {batch_num}/{total_batches}: {len(batch)} leads -> OK ({total_ok}/{len(records)})')
    except Exception as e:
        total_error += len(batch)
        print(f'  Batch {i // BATCH_SIZE + 1} ERROR: {e}')

# ── Resumen ───────────────────────────────────────────────────────────────────

print()
print('=' * 50)
print(f'IMPORTACIÓN COMPLETADA')
print(f'  Insertados/actualizados: {total_ok}')
print(f'  Errores:                 {total_error}')
print()

# Distribución por stage
from collections import Counter
stages    = Counter(r['stage'] for r in records)
platforms = Counter(r['source_platform'] for r in records)
priority  = Counter(r['priority_label'] for r in records)

print('Distribución stages:')
for k, cnt in stages.most_common():
    print(f'  {k:<25} {cnt}')

print('\nDistribución plataformas:')
for k, cnt in platforms.most_common():
    print(f'  {k:<25} {cnt}')

print('\nDistribución prioridad:')
for k, cnt in priority.most_common():
    print(f'  {k:<25} {cnt}')
