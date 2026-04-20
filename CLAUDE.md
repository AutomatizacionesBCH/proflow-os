@AGENTS.md
@PROJECT_RULES.md

# ProFlow OS — Guía de Desarrollo

Sistema operativo de negocio tipo ERP/dashboard financiero para La Caja Chica.
Interfaz en español, tema oscuro profesional.

## Stack

- **Next.js 16.2.4** con App Router y Turbopack
- **React 19 + TypeScript 5**
- **Tailwind CSS 4** — usa `@import "tailwindcss"` y `@theme` en CSS. **No hay `tailwind.config.ts`**.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — credenciales en `.env.local`
- **lucide-react** para íconos, **clsx** + **tailwind-merge** para clases
- **docxtemplater + pizzip** — relleno de plantillas Word en el servidor
- **LibreOffice** (instalado via nixpacks.toml) — conversión DOCX → PDF en el servidor

## Comandos

```bash
npm run dev      # servidor en localhost:3000
npm run build    # verificar TypeScript + build de producción
npm run lint     # eslint
```

## Arquitectura de componentes

```
src/
├── app/
│   ├── layout.tsx                # Layout raíz: Sidebar + Header + <main>
│   ├── page.tsx                  # Redirige a /dashboard
│   ├── dashboard/page.tsx        # Server Component — KPIs reales + tablas desde Supabase
│   ├── operaciones/
│   │   ├── page.tsx              # Server Component — lee operations
│   │   ├── actions.ts            # createOperation, updateOperation, deleteOperation,
│   │   │                         # updateOperationStatus, ensureCliente
│   │   └── contractActions.ts    # generateContract — rellena DOCX + convierte a PDF
│   │                             # con LibreOffice, sube a bucket "contratos"
│   ├── clientes/
│   │   ├── page.tsx              # Server Component — lee clients + companies + processors
│   │   ├── actions.ts            # createCliente, updateCliente
│   │   └── [id]/page.tsx         # Ficha de cliente — historial ops + stats + docs
│   ├── empresas/
│   │   ├── page.tsx              # Server Component — lee companies
│   │   └── actions.ts            # createEmpresa, updateEmpresa
│   ├── procesadores/
│   │   ├── page.tsx              # Server Component — lee processors + companies + ops del día
│   │   └── actions.ts            # createProcesador, updateProcesador
│   ├── caja/
│   │   ├── page.tsx              # Server Component — lee cash_positions
│   │   └── actions.ts            # createCashPosition, updateCashPosition
│   ├── leads/
│   │   ├── page.tsx              # Server Component — lee leads
│   │   └── actions.ts            # createLead, updateLead, convertLead
│   └── marketing/
│       ├── page.tsx              # Server Component — lee marketing_spend
│       └── actions.ts            # createMarketingSpend, updateMarketingSpend, deleteMarketingSpend
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # 'use client' — usa usePathname()
│   │   ├── SidebarItem.tsx       # 'use client' — estado activo por ruta
│   │   ├── Header.tsx            # Buscador, notificaciones, avatar
│   │   └── PageShell.tsx         # Wrapper: título + descripción + acción opcional
│   ├── ui/
│   │   ├── StatCard.tsx          # KPI con valor, delta, ícono
│   │   ├── DataTable.tsx         # Tabla genérica tipada
│   │   ├── Badge.tsx             # Estados: active/inactive/pending/warning/info
│   │   ├── Card.tsx              # Contenedor base
│   │   ├── Button.tsx            # Variantes: primary/secondary/ghost/danger
│   │   └── SectionTitle.tsx      # Encabezado de sección con acción opcional
│   ├── charts/
│   │   └── PlaceholderChart.tsx  # Placeholder — reemplazar con recharts si se necesita
│   ├── operaciones/
│   │   ├── OperacionesView.tsx   # 'use client' — tabla + filtros + stats
│   │   ├── OperacionForm.tsx     # 'use client' — slide-over con calculadora en tiempo real,
│   │   │                         # lookup de cliente por RUT, creación automática de cliente,
│   │   │                         # subida de documentos, generación de contrato DOCX+PDF
│   │   └── OperacionStatusBadge.tsx
│   ├── clientes/
│   │   ├── ClientesView.tsx      # 'use client' — tabla + búsqueda + filtro por tag +
│   │   │                         # panel de documentos por cliente (botón "Docs" por fila)
│   │   ├── ClienteForm.tsx       # 'use client' — slide-over crear/editar (normaliza RUT)
│   │   ├── ClienteDetalle.tsx    # 'use client' — ficha completa + historial + stats + docs
│   │   ├── ClienteDocumentos.tsx # 'use client' — gestor de documentos: subida, listado
│   │   │                         # agrupado por fecha, contratos, preview imágenes
│   │   └── ClienteTagBadge.tsx
│   ├── empresas/
│   │   ├── EmpresasView.tsx      # 'use client' — tabla + búsqueda + filtro estado
│   │   ├── EmpresaForm.tsx       # 'use client' — slide-over crear/editar
│   │   └── EmpresaStatusBadge.tsx
│   ├── procesadores/
│   │   ├── ProcesadoresView.tsx  # 'use client' — tabla + barra uso diario + filtros
│   │   ├── ProcesadorForm.tsx    # 'use client' — slide-over crear/editar, select empresa
│   │   └── ProcesadorStatusBadge.tsx
│   ├── caja/
│   │   ├── CajaView.tsx          # 'use client' — caja actual + capacidad estimada + historial
│   │   └── CajaForm.tsx          # 'use client' — slide-over registrar/editar posición
│   ├── leads/
│   │   ├── LeadsView.tsx         # 'use client' — tabla + filtros estado/canal + KPIs
│   │   ├── LeadForm.tsx          # 'use client' — slide-over crear/editar
│   │   ├── LeadStatusBadge.tsx
│   │   └── LeadChannelBadge.tsx
│   └── marketing/
│       ├── MarketingView.tsx     # 'use client' — KPIs + barras por canal + tabla histórica
│       └── MarketingForm.tsx     # 'use client' — slide-over registrar/editar gasto
│
├── config/
│   └── navigation.ts             # Fuente única de rutas + íconos del sidebar
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient — para Client Components
│   │   └── server.ts             # createServerClient — para Server Components
│   └── utils.ts                  # cn(), formatCLP(), formatUSD(), formatPct(),
│                                 # suggestPayoutPct(), calcOperation(),
│                                 # formatRutForStorage(), formatRutForDisplay(), validateRut()
│
└── types/
    ├── index.ts                  # Todos los tipos del dominio
    └── database.types.ts         # Tipos Supabase (Row/Insert/Update por tabla)
```

## Patrones establecidos

### Página con datos de Supabase
```tsx
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
const router = useRouter()
const [, startTransition] = useTransition()
startTransition(() => router.refresh())
```

### Slide-over (formulario lateral)
- `fixed inset-0 z-50` overlay con `bg-black/60 backdrop-blur-sm`
- Panel `ml-auto w-full max-w-md` con `flex flex-col h-full`
- Header fijo / body `flex-1 overflow-y-auto` / footer fijo con botones
- Estado visual de status: botones toggle coloreados por estado (no `<select>`)

### Modal centrado
- `fixed inset-0 z-50 flex items-center justify-center p-4`
- Overlay `absolute inset-0 bg-black/60 backdrop-blur-sm` con onClick para cerrar
- Panel `relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]`

### Nueva página
1. Crear `src/app/nueva-ruta/page.tsx` con `export const dynamic = 'force-dynamic'`
2. Agregar entrada en `src/config/navigation.ts`
3. Usar `<PageShell>` como wrapper
4. Server Component + `createClient()` de server → pasar a Client Component via props

### RUT chileno
```ts
import { formatRutForStorage, formatRutForDisplay, validateRut } from '@/lib/utils'

formatRutForStorage('17.590.573-1')  // → '17590573-1'  (para guardar en DB)
formatRutForDisplay('17590573-1')    // → '17.590.573-1' (para mostrar / contrato)
validateRut('17590573-1')            // → true
```
- Siempre guardar en Supabase SIN puntos (solo guión): `17590573-1`
- Mostrar al usuario CON puntos: `17.590.573-1`
- La búsqueda normaliza antes de comparar

### Supabase Storage (client-side)
```ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Subir archivo
await supabase.storage.from('documentos-clientes')
  .upload(`clientes/${clientId}/${Date.now()}_${safeName}`, file, { upsert: false })

// URL pública
const { data } = supabase.storage.from('documentos-clientes')
  .getPublicUrl(`clientes/${clientId}/${filename}`)

// Listar carpeta
const { data: files } = await supabase.storage.from('documentos-clientes')
  .list(`clientes/${clientId}`)
```

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
| 002 | `002_create_clients_companies_processors.sql` | Tablas `companies`, `processors`, `clients` |
| 003 | `003_alter_companies_add_fields.sql` | Agrega `legal_name`, `status`, `notes` a `companies` |
| 004 | `004_alter_processors_add_fields.sql` | Agrega `company_id`, `status`, `daily_limit_usd`, `notes` a `processors` |
| 005 | `005_create_cash_positions.sql` | Tabla `cash_positions` |
| 006 | `006_create_leads.sql` | Tabla `leads` |
| 007 | `007_create_marketing_spend.sql` | Tabla `marketing_spend` |

### `operations`
`client_id` (uuid FK → clients.id), `company_id` (uuid FK), `processor_id` (uuid FK), `operation_date`, `amount_usd`, `fx_rate_used`, `client_payout_pct`, fees (`processor_fee_pct`, `loan_fee_pct`, `payout_fee_pct`, `wire_fee_usd`, `receive_fee_usd`), calculados (`gross_clp`, `amount_clp_paid`, `profit_clp`), `status` (pendiente/en_proceso/completada/anulada), `contract_url`.
Lógica de cálculo centralizada en `src/lib/utils.ts → calcOperation()`.
Al crear una operación nueva se busca el cliente por RUT (`ensureCliente`): si no existe se crea automáticamente.

### `companies`
`id`, `name`, `legal_name`, `status` (activo/pausado/en_riesgo), `notes`, `created_at`.

### `processors`
`id`, `name`, `company_id` (FK → companies), `type`, `status` (activo/pausado/en_riesgo), `daily_limit_usd`, `notes`, `created_at`.

### `clients`
`id`, `full_name`, `document_id` (RUT sin puntos, ej: `17590573-1`), `email`, `phone`, `assigned_company_id` (FK), `assigned_processor_id` (FK), `tags` (text[]), `notes`, `created_at`.

### `cash_positions`
`id`, `date`, `available_clp`, `notes`, `created_at`.

### `leads`
`id`, `full_name`, `phone`, `source_channel` (Meta/TikTok/LinkedIn/Twitter/X/referido/otro), `campaign_name`, `status` (nuevo/contactado/en_seguimiento/convertido/perdido), `converted_to_client` (bool), `client_id` (FK nullable), `notes`, `created_at`.

### `marketing_spend`
`id`, `date`, `channel` (Meta/TikTok/LinkedIn/Twitter/X/referido/otro), `amount_clp`, `notes`, `created_at`.

## Supabase Storage — buckets

| Bucket | Acceso | Estructura de rutas |
|---|---|---|
| `documentos-clientes` | Público | `clientes/[client_id]/[timestamp]_[nombre]` |
| `contratos` | Público | `contratos/[operation_id]/[nombre].docx` y `.pdf` |

- Límite por archivo: 10 MB
- Formatos permitidos: JPG, PNG, PDF, Word (.docx)
- Los contratos se generan con `contractActions.ts` (docxtemplater + LibreOffice headless)
- La plantilla Word está en `public/contrato_template.docx`, delimitadores `[` y `]`

## Tipos del dominio (`src/types/index.ts`)

```ts
type OperationStatus  = 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
type EmpresaStatus    = 'activo' | 'pausado' | 'en_riesgo'
type ProcessorStatus  = 'activo' | 'pausado' | 'en_riesgo'
type ClientTag        = 'VIP' | 'frecuente' | 'nuevo' | 'riesgo' | 'pausado'
type LeadStatus       = 'nuevo' | 'contactado' | 'en_seguimiento' | 'convertido' | 'perdido'
type LeadChannel      = 'Meta' | 'TikTok' | 'LinkedIn' | 'Twitter/X' | 'referido' | 'otro'
type MarketingChannel = 'Meta' | 'TikTok' | 'LinkedIn' | 'Twitter/X' | 'referido' | 'otro'

type Operation       { id, client_id, company_id, processor_id, operation_date, amount_usd, ... }
type Company         { id, name, legal_name, status, notes, created_at }
type Processor       { id, name, company_id, type, status, daily_limit_usd, notes, created_at }
type Cliente         { id, full_name, document_id, email, phone, assigned_company_id,
                       assigned_processor_id, tags, notes, created_at }
type CashPosition    { id, date, available_clp, notes, created_at }
type Lead            { id, full_name, phone, source_channel, campaign_name, status,
                       converted_to_client, client_id, notes, created_at }
type MarketingSpend  { id, date, channel, amount_clp, notes, created_at }
```

## Módulos implementados

| Módulo | Estado | Tabla Supabase | Notas |
|---|---|---|---|
| Dashboard | ✅ Completo | múltiples | KPIs reales, últimas ops, caja, procesadores, leads por canal |
| Operaciones | ✅ Completo | `operations` | Calculadora tiempo real, filtros, estados, RUT lookup + auto-create cliente, subida docs, generación contrato DOCX+PDF |
| Clientes | ✅ Completo | `clients` | Lista + ficha `/clientes/[id]` + historial ops + panel de docs desde lista |
| Empresas | ✅ Completo | `companies` | Lista + CRUD + badges de estado |
| Procesadores | ✅ Completo | `processors` | Lista + CRUD + barra uso diario USD |
| Caja | ✅ Completo | `cash_positions` | Caja actual + estimado capacidad + historial |
| Leads | ✅ Completo | `leads` | Pipeline + filtros dual + convertir a cliente |
| Marketing | ✅ Completo | `marketing_spend` | Gasto por canal + barras visuales + historial |
| Documentos | ✅ Completo | Storage | Gestión de archivos por cliente, agrupados por fecha, con contratos integrados |

## Próximos pasos planeados

- Convertir `company_id` y `processor_id` en OperacionForm a selects reales desde Supabase
- Vista detalle por operación (`/operaciones/[id]`)
- Autenticación con Supabase Auth + middleware
- Importador CSV para historial Stripe y NMI
- Integraciones automáticas con Meta Ads
- Reemplazar `PlaceholderChart` con recharts cuando se necesite gráfico real
