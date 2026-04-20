@AGENTS.md

# ProFlow OS — Guía de Desarrollo

Sistema operativo de negocio tipo ERP/dashboard financiero. Interfaz en español, tema oscuro profesional.

## Stack

- **Next.js 16.2.4** con App Router y Turbopack
- **React 19 + TypeScript 5**
- **Tailwind CSS 4** — usa `@import "tailwindcss"` y `@theme` en CSS. **No hay `tailwind.config.ts`**.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — credenciales en `.env.local`
- **lucide-react** para íconos, **clsx** + **tailwind-merge** para clases

## Comandos

```bash
npm run dev      # servidor en localhost:3000
npm run build    # verificar TypeScript + build de producción
npm run lint     # eslint
```

## Arquitectura de componentes

```
src/
├── app/                          # App Router — cada carpeta es una ruta
│   ├── layout.tsx                # Layout raíz: Sidebar + Header + <main>
│   ├── page.tsx                  # Redirige a /dashboard
│   ├── dashboard/page.tsx
│   ├── operaciones/
│   │   ├── page.tsx              # Server Component — lee de Supabase
│   │   └── actions.ts            # createOperation, updateOperationStatus
│   ├── clientes/
│   │   ├── page.tsx              # Server Component — lee clients + companies + processors
│   │   ├── actions.ts            # createCliente, updateCliente
│   │   └── [id]/page.tsx         # Ficha de cliente — ops history, stats, edición
│   ├── empresas/
│   │   ├── page.tsx              # Server Component — lee companies
│   │   └── actions.ts            # createEmpresa, updateEmpresa
│   ├── procesadores/
│   │   ├── page.tsx              # Server Component — lee processors + companies + ops del día
│   │   └── actions.ts            # createProcesador, updateProcesador
│   ├── caja/page.tsx             # 🔲 Datos de ejemplo
│   ├── leads/page.tsx            # 🔲 Datos de ejemplo
│   └── marketing/page.tsx        # 🔲 Datos de ejemplo
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # 'use client' — usa usePathname()
│   │   ├── SidebarItem.tsx       # 'use client' — estado activo por ruta
│   │   ├── Header.tsx            # Buscador, notificaciones, avatar
│   │   └── PageShell.tsx         # Wrapper de página: título + descripción + acción
│   ├── ui/
│   │   ├── StatCard.tsx          # KPI con valor, delta, ícono
│   │   ├── DataTable.tsx         # Tabla genérica tipada
│   │   ├── Badge.tsx             # Estados: active/inactive/pending/warning/info
│   │   ├── Card.tsx              # Contenedor base
│   │   ├── Button.tsx            # Variantes: primary/secondary/ghost/danger
│   │   └── SectionTitle.tsx      # Encabezado de sección con acción opcional
│   ├── charts/
│   │   └── PlaceholderChart.tsx  # Placeholder — reemplazar con recharts
│   ├── operaciones/
│   │   ├── OperacionesView.tsx   # 'use client' — tabla + filtros + stats
│   │   ├── OperacionForm.tsx     # 'use client' — slide-over con calculadora en tiempo real
│   │   └── OperacionStatusBadge.tsx
│   ├── clientes/
│   │   ├── ClientesView.tsx      # 'use client' — tabla + búsqueda + filtro por tag
│   │   ├── ClienteForm.tsx       # 'use client' — slide-over crear/editar, selects company/processor
│   │   ├── ClienteDetalle.tsx    # 'use client' — ficha completa + historial de ops + stats
│   │   └── ClienteTagBadge.tsx   # Badge de tag (VIP/frecuente/nuevo/riesgo/pausado)
│   ├── empresas/
│   │   ├── EmpresasView.tsx      # 'use client' — tabla + búsqueda + filtro por estado
│   │   ├── EmpresaForm.tsx       # 'use client' — slide-over crear/editar
│   │   └── EmpresaStatusBadge.tsx
│   └── procesadores/
│       ├── ProcesadoresView.tsx  # 'use client' — tabla + barra de uso diario + filtros
│       ├── ProcesadorForm.tsx    # 'use client' — slide-over crear/editar, select empresa
│       └── ProcesadorStatusBadge.tsx
│
├── config/
│   └── navigation.ts             # Fuente única de rutas + íconos del sidebar
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient — para Client Components
│   │   └── server.ts             # createServerClient — para Server Components
│   └── utils.ts                  # cn(), formatCLP(), formatUSD(), formatPct(),
│                                 # suggestPayoutPct(), calcOperation()
│
└── types/
    ├── index.ts                  # Todos los tipos del dominio (ver sección Tipos)
    └── database.types.ts         # Tipos Supabase (Row/Insert/Update por tabla)
```

## Patrones establecidos

### Página con datos de Supabase
```tsx
// Server Component — lee datos y pasa a Client Component
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MiPagina() {
  const supabase = await createClient()  // de @/lib/supabase/server
  const { data, error } = await supabase.from('tabla').select('*')
  return <MiVista initialData={data ?? []} />
}
```

### Múltiples tablas en paralelo
```tsx
const [aRes, bRes] = await Promise.all([
  supabase.from('tabla_a').select('*').order('name'),
  supabase.from('tabla_b').select('id, name').order('name'),
])
```

### Server Action
```tsx
// src/app/modulo/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearRegistro(input: InputType) {
  const supabase = await createClient()
  const { error } = await supabase.from('tabla').insert(input)
  if (error) return { success: false, error: error.message }
  revalidatePath('/modulo')
  return { success: true }
}
```

### Client Component con refresh
```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

const router = useRouter()
const [, startTransition] = useTransition()

// Después de una server action exitosa:
startTransition(() => router.refresh())
```

### Slide-over (formulario lateral)
- `fixed inset-0 z-50` overlay con `bg-black/60 backdrop-blur-sm`
- Panel `ml-auto w-full max-w-md` con `flex flex-col h-full`
- Header fijo / body `flex-1 overflow-y-auto` / footer fijo con botones
- Estado visual de status: tres botones toggle coloreados por estado (no `<select>`)

### Nueva página
1. Crear `src/app/nueva-ruta/page.tsx` con `export const dynamic = 'force-dynamic'`
2. Agregar entrada en `src/config/navigation.ts`
3. Usar `<PageShell>` como wrapper
4. Server Component + `createClient()` de server → pasar a Client Component via props

## Diseño — tokens de color

| Elemento | Clase Tailwind |
|---|---|
| Fondo de página | `bg-slate-950` |
| Sidebar / Cards | `bg-slate-900` |
| Inputs / hover | `bg-slate-800` |
| Bordes | `border-slate-800` |
| Acento / CTA | `bg-blue-600` / `text-blue-400` |
| Texto principal | `text-slate-100` |
| Texto secundario | `text-slate-400` |
| Texto mínimo | `text-slate-500` / `text-slate-600` |
| Éxito | `text-green-400` |
| Alerta | `text-amber-400` |
| Peligro | `text-red-400` |

Valores monetarios: siempre `font-mono`. Fechas: `es-CL` locale.

## Supabase — tablas y migraciones

| Migración | Archivo | Descripción |
|---|---|---|
| 001 | `001_create_operations.sql` | Tabla `operations` completa |
| 002 | `002_create_clients_companies_processors.sql` | Tablas `companies`, `processors`, `clients` (base) |
| 003 | `003_alter_companies_add_fields.sql` | Agrega `legal_name`, `status`, `notes` a `companies` |
| 004 | `004_alter_processors_add_fields.sql` | Agrega `company_id`, `status`, `daily_limit_usd`, `notes` a `processors` |

### `operations`
Campos clave: `client_id` (text), `company_id` (uuid, FK), `processor_id` (uuid, FK), `operation_date`, `amount_usd`, `fx_rate_used`, `client_payout_pct`, fees (`processor_fee_pct`, `loan_fee_pct`, `payout_fee_pct`, `wire_fee_usd`, `receive_fee_usd`), calculados (`gross_clp`, `amount_clp_paid`, `profit_clp`), `status` (pendiente/en_proceso/completada/anulada).

Lógica de cálculo centralizada en `src/lib/utils.ts → calcOperation()`.

### `companies`
Campos: `id`, `name`, `legal_name`, `status` (activo/pausado/en_riesgo, default 'activo'), `notes`, `created_at`.

### `processors`
Campos: `id`, `name`, `company_id` (FK → companies), `type`, `status` (activo/pausado/en_riesgo, default 'activo'), `daily_limit_usd`, `notes`, `created_at`.

### `clients`
Campos: `id`, `full_name`, `document_id`, `email`, `phone`, `assigned_company_id` (FK → companies), `assigned_processor_id` (FK → processors), `tags` (text[]), `notes`, `created_at`.

## Tipos del dominio (`src/types/index.ts`)

```ts
type OperationStatus = 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
type EmpresaStatus   = 'activo' | 'pausado' | 'en_riesgo'
type ProcessorStatus = 'activo' | 'pausado' | 'en_riesgo'
type ClientTag       = 'VIP' | 'frecuente' | 'nuevo' | 'riesgo' | 'pausado'

type Operation  { id, client_id, company_id, processor_id, operation_date, amount_usd, ... }
type Company    { id, name, legal_name, status, notes, created_at }
type Processor  { id, name, company_id, type, status, daily_limit_usd, notes, created_at }
type Cliente    { id, full_name, document_id, email, phone, assigned_company_id,
                  assigned_processor_id, tags, notes, created_at }
```

## Módulos implementados

| Módulo | Estado | Supabase | Notas |
|---|---|---|---|
| Dashboard | ✅ Base con KPIs | — | Placeholders, sin datos reales |
| Operaciones | ✅ Completo | ✅ `operations` | Calculadora tiempo real, filtros, estados |
| Clientes | ✅ Completo | ✅ `clients` | Lista + ficha `/clientes/[id]` + historial ops |
| Empresas | ✅ Completo | ✅ `companies` | Lista + CRUD + badges de estado |
| Procesadores | ✅ Completo | ✅ `processors` | Lista + CRUD + barra uso diario USD |
| Caja | 🔲 Datos de ejemplo | — | |
| Leads | 🔲 Datos de ejemplo | — | |
| Marketing | 🔲 Datos de ejemplo | — | |

## Próximos pasos naturales

- Conectar `client_id` en operaciones al UUID real de `clients` (hoy es text libre)
- Convertir `company_id` y `processor_id` en OperacionForm a selects con datos reales de Supabase
- Agregar vista detalle por operación (`/operaciones/[id]`)
- Construir módulo Caja conectado a Supabase
- Construir módulo Leads conectado a Supabase
- Agregar autenticación con Supabase Auth + middleware
- Reemplazar `PlaceholderChart` con `recharts` o `tremor` cuando haya datos reales
- Dashboard con KPIs reales cruzando datos de operations, clients, processors
