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
│   │   └── actions.ts            # Server Actions (createOperation, updateOperationStatus)
│   ├── clientes/page.tsx
│   ├── procesadores/page.tsx
│   ├── empresas/page.tsx
│   ├── caja/page.tsx
│   ├── leads/page.tsx
│   └── marketing/page.tsx
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
│   └── operaciones/
│       ├── OperacionesView.tsx   # 'use client' — tabla + filtros + stats
│       ├── OperacionForm.tsx     # 'use client' — slide-over con calculadora en tiempo real
│       └── OperacionStatusBadge.tsx  # Badge para estados de operación
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
    ├── index.ts                  # Status, OperationStatus, Operation, Lead, etc.
    └── database.types.ts         # Tipos Supabase (Row/Insert/Update por tabla)
```

## Patrones establecidos

### Página con datos de Supabase
```tsx
// Server Component — lee datos y pasa a Client Component
export default async function MiPagina() {
  const supabase = await createClient()  // de @/lib/supabase/server
  const { data, error } = await supabase.from('tabla').select('*')
  return <MiVista initialData={data ?? []} />
}
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

### Nueva página
1. Crear `src/app/nueva-ruta/page.tsx`
2. Agregar entrada en `src/config/navigation.ts`
3. Usar `<PageShell>` como wrapper
4. Para datos: Server Component + `createClient()` de server

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

## Supabase — tablas existentes

### `operations`
Migración: `supabase/migrations/001_create_operations.sql`

Campos clave: `client_id`, `amount_usd`, `fx_rate_used`, `client_payout_pct`, fees (`processor_fee_pct`, `loan_fee_pct`, `payout_fee_pct`, `wire_fee_usd`, `receive_fee_usd`), calculados (`gross_clp`, `amount_clp_paid`, `profit_clp`), `status` (pendiente/en_proceso/completada/anulada).

Lógica de cálculo centralizada en `src/lib/utils.ts → calcOperation()`.

## Módulos implementados

| Módulo | Estado | Supabase |
|---|---|---|
| Dashboard | ✅ Base con KPIs y placeholders | — |
| Operaciones | ✅ Completo | ✅ tabla `operations` |
| Clientes | 🔲 Datos de ejemplo | — |
| Procesadores | 🔲 Datos de ejemplo | — |
| Empresas | 🔲 Datos de ejemplo | — |
| Caja | 🔲 Datos de ejemplo | — |
| Leads | 🔲 Datos de ejemplo | — |
| Marketing | 🔲 Datos de ejemplo | — |

## Próximos pasos naturales

- Conectar módulos de Clientes, Empresas, Procesadores a Supabase (misma estructura que Operaciones)
- Reemplazar `PlaceholderChart` con `recharts` o `tremor` cuando haya datos reales
- Agregar autenticación con Supabase Auth + middleware
- Convertir los campos `client_id`, `company_id`, `processor_id` en selects con datos reales
- Agregar vista detalle por operación (`/operaciones/[id]`)
