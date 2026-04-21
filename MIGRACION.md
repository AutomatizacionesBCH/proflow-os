# Migración a nuevo Supabase

## Pasos

### 1. Crear el nuevo proyecto en Supabase
Ir a supabase.com → New project → anotar la URL y la anon key.

### 2. Crear el esquema completo
Dashboard del nuevo proyecto → SQL Editor → pegar y ejecutar:
```
supabase/schema_completo.sql
```
Esto crea todas las tablas, políticas RLS, triggers, índices y los 3 buckets de Storage.

### 3. Actualizar credenciales locales
Editar `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://NUEVO_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=nueva_anon_key
```

### 4. Actualizar credenciales en EasyPanel
En el servicio de ProFlow OS → Environment → cambiar las mismas dos variables → Save → Redeploy.

### 5. Re-importar datos históricos
Con las nuevas credenciales en `.env.local`, ejecutar los scripts en orden:
```bash
python3 scripts/fix_historicos.py       # importa 1384 operaciones históricas
python3 scripts/sync_telefonos.py       # asigna teléfonos a clientes
```

### 6. Verificar
- `/clientes` muestra los clientes con nombres y teléfonos
- `/operaciones` muestra operaciones con empresa y procesador
- Subir un documento de prueba en algún cliente
