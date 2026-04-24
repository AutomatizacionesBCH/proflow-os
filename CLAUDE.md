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
- **OpenAI API** (gpt-4o) — motor de los 3 agentes IA. Key en `OPENAI_API_KEY` en `.env.local`

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
│   ├── layout.tsx                        # Layout raíz: Sidebar + Header + <main>
│   ├── page.tsx                          # Redirige a /dashboard
│   ├── dashboard/
│   │   ├── page.tsx                      # Server Component — KPIs + tablas + Revenue Agent section
│   │   └── revenue-agent-actions.ts      # runRevenueAgentAction() → inserta en revenue_analyses
│   ├── operaciones/
│   │   ├── page.tsx                      # Server Component — lee operations
│   │   ├── actions.ts                    # createOperation, updateOperation, deleteOperation,
│   │   │                                 # updateOperationStatus, ensureCliente
│   │   └── contractActions.ts            # generateContract — rellena DOCX + convierte a PDF
│   ├── clientes/
│   │   ├── page.tsx                      # Server Component — lee clients + companies + processors
│   │   ├── actions.ts                    # createCliente, updateCliente
│   │   └── [id]/page.tsx                 # Ficha de cliente — historial ops + stats + docs
│   ├── empresas/
│   │   ├── page.tsx                      # Server Component — lee companies
│   │   └── actions.ts                    # createEmpresa, updateEmpresa
│   ├── procesadores/
│   │   ├── page.tsx                      # Server Component — lee processors + companies + ops del día
│   │   └── actions.ts                    # createProcesador, updateProcesador
│   ├── caja/
│   │   ├── page.tsx                      # Server Component — lee cash_positions
│   │   └── actions.ts                    # createCashPosition, updateCashPosition
│   ├── leads/
│   │   ├── page.tsx                      # Server Component — lee leads + cuenta closing opportunities
│   │   ├── actions.ts                    # createLead, updateLead, convertLead, recalculateAllLeads
│   │   └── sales-agent-actions.ts        # analyzeSalesAction(leadId), analyzeAllWarmLeadsAction()
│   ├── marketing/
│   │   ├── page.tsx                      # Server Component — lee 10 tablas en paralelo + revenue
│   │   ├── actions.ts                    # createMarketingSpend, updateMarketingSpend, deleteMarketingSpend
│   │   ├── agent-actions.ts              # runMarketingAgentAction(), discardProposalAction(), markProposalCreatedAction()
│   │   └── attribution-actions.ts        # calculateAttributionMetrics() — atribución first-touch
│   ├── recomendaciones/
│   │   ├── page.tsx                      # Server Component — agrega las 4 fuentes de recomendaciones
│   │   └── actions.ts                    # approveRecommendationAction(), dismissRecommendationAction(),
│   │                                     # approveAllUrgentAction(), runAllAgentsAction()
│   └── api/
│       └── webhooks/
│           └── vambe/route.ts            # POST — recibe eventos stage.changed de Vambe
│                                         # Auth: ?token=VAMBE_WEBHOOK_SECRET en URL
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                   # 'use client' — usa usePathname()
│   │   ├── SidebarItem.tsx               # 'use client' — estado activo por ruta
│   │   ├── Header.tsx                    # Buscador, notificaciones, avatar
│   │   └── PageShell.tsx                 # Wrapper: título + descripción + acción opcional
│   ├── ui/
│   │   ├── StatCard.tsx, DataTable.tsx, Badge.tsx, Card.tsx, Button.tsx, SectionTitle.tsx
│   │   └── TableScroll.tsx               # Wrapper para tablas con scroll horizontal
│   ├── dashboard/
│   │   └── RevenueAgentView.tsx          # 'use client' — sección "Análisis Estratégico" del Revenue Agent
│   ├── operaciones/
│   │   ├── OperacionesView.tsx, OperacionForm.tsx, OperacionStatusBadge.tsx
│   ├── clientes/
│   │   ├── ClientesView.tsx, ClienteForm.tsx, ClienteDetalle.tsx
│   │   ├── ClienteDocumentos.tsx, ClienteTagBadge.tsx
│   ├── empresas/
│   │   ├── EmpresasView.tsx, EmpresaForm.tsx, EmpresaStatusBadge.tsx
│   ├── procesadores/
│   │   ├── ProcesadoresView.tsx, ProcesadorForm.tsx, ProcesadorStatusBadge.tsx
│   ├── caja/
│   │   ├── CajaView.tsx, CajaForm.tsx
│   ├── leads/
│   │   ├── LeadsView.tsx         # KPIs hot/warm/follow_up/cold + KPI "Oportunidades de cierre hoy" (Sales Agent)
│   │   ├── LeadDetailPanel.tsx   # Panel lateral con sección "Estrategia de cierre" (Sales Agent)
│   │   ├── LeadForm.tsx, LeadStatusBadge.tsx, LeadChannelBadge.tsx
│   ├── marketing/
│   │   ├── MarketingView.tsx     # 7 tabs: Propuestas IA / Audiencias / Campañas / Mensajes /
│   │   │                         # Analítica / Atribución Real / Análisis de Negocio (Revenue)
│   │   ├── PropuestasView.tsx    # Marketing Intelligence Agent — propuestas de campaña
│   │   ├── AudienciasView.tsx, CampanasView.tsx, CampanaForm.tsx
│   │   ├── MensajesView.tsx, AnaliticaView.tsx, AtribucionView.tsx
│   └── recomendaciones/
│       └── RecomendacionesView.tsx  # Centro unificado: agrega las 4 fuentes, approve/dismiss, run all
│
├── config/
│   └── navigation.ts             # Sidebar: Dashboard/Operaciones/Clientes/Procesadores/Empresas/
│                                 # Caja/Leads/Marketing/Playbooks/Recomendaciones (Lightbulb)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient — para Client Components
│   │   └── server.ts             # createServerClient — para Server Components
│   ├── utils.ts                  # cn(), formatCLP(), formatUSD(), formatPct(),
│   │                             # suggestPayoutPct(), calcOperation(),
│   │                             # formatRutForStorage(), formatRutForDisplay(), validateRut()
│   ├── lead-agent.ts             # calculateLeadScore(lead) → { heat_score, priority_label,
│   │                             # assigned_to_recommendation, next_action }
│   └── agents/
│       ├── sales-agent.ts        # analyzeSalesOpportunity(leadId) → SalesAnalysis (gpt-4o)
│       │                         # Estrategia de cierre, objeción, mensaje, canal, confianza 0-100
│       ├── marketing-intelligence-agent.ts  # analyzeAndProposeCampaigns() → MarketingProposal[]
│       │                                    # 15 queries paralelas, propone audiencias + copy
│       └── revenue-agent.ts      # analyzeRevenue() → RevenueAnalysis (gpt-4o)
│                                 # 8 queries paralelas: ops/empresas/procesadores/clientes/caja/
│                                 # marketing/leads/atribución → resumen + oportunidades + riesgos +
│                                 # recomendaciones + rendimiento por canal
│
└── types/
    ├── index.ts                  # Tipos del dominio core (re-exporta desde leads-marketing.types)
    ├── leads-marketing.types.ts  # Lead, LeadStage (9), LeadPriority, LeadType,
    │                             # LeadEvent, Audience, Campaign, CampaignMessage, Integration
    ├── agent.types.ts            # AIRecommendation, SavedRecommendation, RecSummary,
    │                             # BehaviorSignal, SalesAnalysis, SavedSalesAnalysis,
    │                             # MarketingProposal, SavedMarketingProposal,
    │                             # RevenueRecommendation, RevenueChannelPerformance,
    │                             # RevenueAnalysis, SavedRevenueAnalysis
    └── database.types.ts         # ⚠️ DESACTUALIZADO — usar `as any` en tablas nuevas
```

## Patrones establecidos

### Página con datos de Supabase
```tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MiPagina() {
  const supabase = await createClient()  // de @/lib/supabase/server
  const db = supabase as any             // para tablas sin tipos
  const { data, error } = await supabase.from('tabla').select('*')
  return <MiVista initialData={data ?? []} />
}
```

### Múltiples tablas en paralelo
```tsx
const [aRes, bRes] = await Promise.all([
  supabase.from('tabla_a').select('*').order('name'),
  (supabase as any).from('tabla_nueva').select('id, name').order('name'),
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

### Llamada a OpenAI (gpt-4o) — patrón de los agentes
```ts
// Siempre en módulo servidor — NO importar desde Client Components
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({ model: 'gpt-4o', max_tokens: 2000, messages: [...] }),
})
const data = await res.json()
const text: string = data.choices?.[0]?.message?.content ?? ''
// Extraer JSON de la respuesta
const json = text.match(/\{[\s\S]*\}/)?.[0] ?? text
return JSON.parse(json)
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

### Lookup de nombres via mapas (Operaciones)
`client_id`, `company_id`, `processor_id` son `text` sin FK — PostgREST no hace joins.
```tsx
const clientMap    = Object.fromEntries(clientsRes.data.map(c => [c.id, c.full_name]))
const companyMap   = Object.fromEntries(companiesRes.data.map(c => [c.id, c.name]))
const processorMap = Object.fromEntries(processorsRes.data.map(p => [p.id, p.name]))
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

Colores por agente IA:
- Lead Intelligence → azul (`text-blue-400`, `bg-blue-900/40`)
- Sales Agent → naranja (`text-orange-400`, `bg-orange-900/40`)
- Marketing Intelligence → morado (`text-violet-400`, `bg-violet-900/40`)
- Revenue Agent → verde esmeralda (`text-emerald-400`, `bg-emerald-900/40`)

Valores monetarios: siempre `font-mono`. Fechas: `es-CL` locale.

## Supabase — tablas y migraciones

El esquema consolidado está en `supabase/schema_completo.sql` (usar para migrar a nuevo proyecto).

| Migración | Archivo | Descripción |
|---|---|---|
| 001 | `001_create_operations.sql` | Tabla `operations` completa |
| 002 | `002_create_clients_companies_processors.sql` | Tablas `companies`, `processors`, `clients` |
| 003 | `003_alter_companies_add_fields.sql` | Agrega `legal_name`, `status`, `notes` a `companies` |
| 004 | `004_alter_processors_add_fields.sql` | Agrega `company_id`, `status`, `daily_limit_usd`, `notes` a `processors` |
| 005 | `005_create_cash_positions.sql` | Tabla `cash_positions` |
| 006 | `006_create_leads.sql` | Tabla `leads` (esquema original, reemplazado por 009) |
| 007 | `007_create_marketing_spend.sql` | Tabla `marketing_spend` |
| 008 | `008_alter_operations_add_contract_and_storage.sql` | Agrega `contract_url` a `operations`, crea buckets Storage |
| 009 | `009_leads_marketing_extension.sql` | Reemplaza `leads` con esquema CRM completo + `lead_events`, `audiences`, `campaigns`, `campaign_messages`, `integrations` |
| 010 | `010_lead_agent_columns.sql` | Agrega `heat_score`, `priority_label`, `assigned_to_recommendation`, `next_action` a `leads` |
| 011 | `011_marketing_module.sql` | Tablas del módulo Marketing completo |
| 012 | `012_marketing_data_hub.sql` | Extensiones del hub de datos de Marketing |
| 013 | `013_attribution_truth.sql` | Tabla `attribution_truth` — atribución first-touch por canal |
| 014 | `014_behavior_tracking.sql` | Tabla `user_behavior_signals` — 22 tipos de señal de comportamiento |
| 015 | `015_playbooks.sql` | Tablas `playbooks`, `playbook_steps`, `playbook_assignments` + 5 playbooks semilla |
| 016 | `016_marketing_recommendations.sql` | Tabla `marketing_recommendations` — recomendaciones del Lead Intelligence Agent |
| 017 | `017_sales_analyses.sql` | Tabla `sales_analyses` — estrategias de cierre del Sales Agent por lead |
| 018 | `018_marketing_proposals.sql` | Tabla `marketing_proposals` — propuestas del Marketing Intelligence Agent |
| 019 | `019_revenue_analyses.sql` | Tabla `revenue_analyses` — análisis estratégicos del Revenue Agent (JSONB) |
| 020 | `020_recommendations_center.sql` | ALTER `marketing_recommendations` + `sales_analyses` — agrega status/priority/metadata para el Centro de Recomendaciones |

### `operations`
`client_id` (**text**, sin FK), `company_id`, `processor_id`, `operation_date`, `amount_usd`, `fx_rate_used`, `client_payout_pct`, fees, calculados (`gross_clp`, `amount_clp_paid`, `profit_clp`), `status` (pendiente/en_proceso/completada/anulada), `contract_url`.

> `client_id`, `company_id`, `processor_id` son `text` sin FK — no hay joins automáticos. Cargar tablas en paralelo y pasar mapas como props.

### `leads`
Esquema CRM completo (migración 009 + 010 + 020):
- **Origen:** `external_source_id`, `source_platform`, `source_channel`, `campaign_name`
- **Contacto:** `full_name`, `phone`, `whatsapp`, `email`, `linkedin_profile`, `x_handle`
- **Clasificación:** `stage` (new/contacted/qualified/docs_pending/ready_to_schedule/ready_to_operate/operated/dormant/lost), `heat_score` (0-100), `priority_label` (hot/warm/follow_up/cold), `lead_type`, `lead_status_reason`
- **Gestión:** `assigned_to`, `assigned_to_recommendation`, `last_interaction_at`, `next_action`, `next_action_due_at`
- **Conversión:** `converted_to_client_id` (FK → clients, nullable)
- **Extras:** `notes`, `raw_payload` (jsonb), `created_at`, `updated_at`

**Lead Agent (`src/lib/lead-agent.ts`):**
- `calculateLeadScore(lead)` → heat_score, priority_label, assigned_to_recommendation, next_action
- `recalculateAllLeads()` en actions.ts — actualiza todos los leads en batches de 100
- Umbrales: hot ≥60, warm ≥40, follow_up ≥20, cold <20

**Vambe webhook:**
- Endpoint: `/api/webhooks/vambe?token=VAMBE_WEBHOOK_SECRET`
- Deduplica por teléfono. Etapas target: Interesados, Ganados, Sobrecupos, Clientes +5000 USD

### `marketing_recommendations`
Tabla del Lead Intelligence Agent (migración 016 + 020):
`id`, `lead_id`, `lead_name`, `heat_score`, `priority_label`, `lead_type`, `assigned_to_recommendation`, `next_best_action`, `reasoning`, `urgency`, `suggested_message`, `viewed_at`, `agent_name`, `priority`, `title`, `status` (pendiente/aprobada/descartada), `approved_at`, `dismissed_reason`, `metadata_json`, `created_at`

### `sales_analyses`
Tabla del Sales Agent (migración 017 + 020):
`id`, `lead_id`, `lead_name`, `closing_strategy`, `main_objection`, `objection_response`, `suggested_message`, `best_channel`, `best_time`, `confidence_score` (0-100), `urgency_reason`, `assigned_to`, `status` (pendiente/aprobada/descartada), `created_at`

### `marketing_proposals`
Tabla del Marketing Intelligence Agent (migración 018):
`id`, `audience_name`, `audience_description`, `estimated_size`, `campaign_objective`, `suggested_channel`, `suggested_copy`, `expected_impact`, `priority`, `reasoning`, `status` (pending/created/discarded), `created_at`

### `revenue_analyses`
Tabla del Revenue Agent (migración 019):
`id`, `analysis_data` (jsonb — contiene business_summary, top_opportunities[], top_risks[], recommendations[], channel_performance[]), `created_at`

### `marketing_spend`
`id`, `date`, `channel` (Meta/TikTok/LinkedIn/Twitter/X/referido/otro), `amount_clp`, `notes`, `created_at`.

## Agentes IA

Los 3 agentes usan **gpt-4o** vía llamada HTTP directa a OpenAI. Se llaman siempre desde Server Components o Server Actions — nunca desde el cliente.

### Sales Agent (`src/lib/agents/sales-agent.ts`)
- Input: `leadId` → busca el lead + eventos + señales en Supabase
- Output: `SalesAnalysis` — closing_strategy, main_objection, objection_response, suggested_message, best_channel, best_time, confidence_score (0-100), urgency_reason, assigned_to
- UI: botón "Estrategia de cierre" en `LeadDetailPanel` (panel lateral de leads)
- KPI: "Oportunidades de cierre hoy" en `LeadsView` (confidence >= 60 hoy)
- Acción masiva: `analyzeAllWarmLeadsAction()` — top 10 leads hot/warm

### Marketing Intelligence Agent (`src/lib/agents/marketing-intelligence-agent.ts`)
- Input: 15 queries paralelas (leads por prioridad, clientes VIP/frecuentes dormidos, gasto, audiencias, campañas, operaciones)
- Output: `MarketingProposal[]` — propuestas de campaña con audiencia + copy + canal + impacto
- UI: tab "Propuestas IA" en `/marketing`
- Acciones: Crear campaña (pre-rellena CampanaForm) | Descartar

### Revenue Agent (`src/lib/agents/revenue-agent.ts`)
- Input: 8 queries paralelas (ops 90d, empresas, procesadores, clientes, caja, marketing_spend, leads, attribution_truth)
- Output: `RevenueAnalysis` — business_summary, top_opportunities[], top_risks[], recommendations[], channel_performance[]
- UI: sección "Análisis Estratégico" en `/dashboard` + tab "Análisis de Negocio" en `/marketing`

### Centro de Recomendaciones (`/recomendaciones`)
Agrega las 4 fuentes en una vista unificada:
- `marketing_recommendations` → Lead Intelligence (azul)
- `sales_analyses` → Sales Agent (naranja)
- `marketing_proposals` → Marketing Intelligence (morado)
- `revenue_analyses.analysis_data.recommendations[]` → Revenue Agent (verde)

Acciones globales: "Aprobar urgentes", "Ejecutar todos los agentes" (Revenue + Marketing + Sales top 5 en paralelo)

## Supabase Storage — buckets

| Bucket | Acceso | Estructura |
|---|---|---|
| `documentos-clientes` | Público | `clientes/[client_id]/[timestamp]_[nombre]` |
| `contratos` | Público | `contratos/[operation_id]/[nombre].docx` y `.pdf` |
| `documentos-operaciones` | Público | reservado para documentos adjuntos por operación |

## Tipos del dominio

```ts
// src/types/index.ts (dominio core)
type OperationStatus  = 'pendiente' | 'en_proceso' | 'completada' | 'anulada'
type LeadStage        = 'new' | 'contacted' | 'qualified' | 'docs_pending' |
                        'ready_to_schedule' | 'ready_to_operate' | 'operated' | 'dormant' | 'lost'
type LeadPriority     = 'hot' | 'warm' | 'follow_up' | 'cold'
type LeadType         = 'vip' | 'spot' | 'new' | 'dormant' | 'high_potential' | 'trust_issue' | 'unclear'

// src/types/agent.types.ts (agentes IA — importable desde server y client)
type SalesAnalysis, SavedSalesAnalysis
type MarketingProposal, SavedMarketingProposal
type RevenueAnalysis, SavedRevenueAnalysis
type RevenueRecommendation, RevenueChannelPerformance
type AIRecommendation, SavedRecommendation, RecSummary
type BehaviorSignal
```

## Módulos implementados

| Módulo | Estado | Tabla(s) Supabase | Notas |
|---|---|---|---|
| Dashboard | ✅ | múltiples | KPIs reales + Revenue Agent section al fondo |
| Operaciones | ✅ | `operations` | Calculadora, RUT lookup, contrato DOCX+PDF |
| Clientes | ✅ | `clients` | Ficha `/clientes/[id]`, historial ops, panel docs |
| Empresas | ✅ | `companies` | CRUD completo |
| Procesadores | ✅ | `processors` | Barra uso diario USD |
| Caja | ✅ | `cash_positions` | Posición actual + historial |
| Leads | ✅ | `leads` | Lead Agent scoring + Sales Agent ("Estrategia de cierre") + KPI oportunidades cierre + Vambe webhook + 4,776 leads (2,276 Vambe + 2,500 test) |
| Marketing | ✅ | múltiples | 7 tabs: Propuestas IA / Audiencias / Campañas / Mensajes / Analítica / Atribución Real / Análisis de Negocio |
| Documentos | ✅ | Storage | Gestión archivos por cliente |
| Behavior Tracking | ✅ | `user_behavior_signals` | Timeline señales en fichas lead/cliente |
| Playbooks | ✅ | `playbooks`, `playbook_steps`, `playbook_assignments` | 5 playbooks semilla, asignación con progreso |
| Sales Agent | ✅ | `sales_analyses` | Estrategia de cierre por lead (gpt-4o), confidence score |
| Marketing Intelligence Agent | ✅ | `marketing_proposals` | Propuestas de campaña con copy, audience, canal |
| Revenue Agent | ✅ | `revenue_analyses` | Análisis estratégico completo del negocio |
| Centro de Recomendaciones | ✅ | múltiples | `/recomendaciones` — vista unificada de todos los agentes |

## Scripts de datos (`scripts/`)

| Script | Descripción |
|---|---|
| `importar_operaciones.py` | Importa operaciones históricas desde Excel |
| `fix_historicos.py` | Borra ops con `fx_rate_used=0` y re-importa con empresa/procesador reales |
| `sync_telefonos.py` | Sincroniza teléfonos desde `CLIENTES LCC - BASE LIMPIA.xlsx` |
| `importar_2_marzo_atras.py` | Importa operaciones históricas anteriores al 2 de marzo |
| `importar_vambe_leads.py` | Importó 2,275 contactos de Vambe a la tabla `leads` |
| `update_vambe_emails.py` | Actualizó emails de los 127 contactos Vambe que tenían email |
| `importar_leads_test.py` | Importa `PROFLOW_LEADS_TEST_DATA.xlsx` — 2,500 leads de prueba con upsert por UUID |

Todos leen credenciales de `.env.local`. Requieren: `pip install supabase pandas openpyxl`

## Variables de entorno requeridas (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=           ← requerida para los 3 agentes IA
VAMBE_WEBHOOK_SECRET=     ← requerida para el webhook de Vambe
```

## Próximos pasos planeados

- Convertir `company_id` y `processor_id` en OperacionForm a selects reales desde Supabase
- Vista detalle por operación (`/operaciones/[id]`)
- Autenticación con Supabase Auth + middleware
- Importador CSV para historial Stripe y NMI
- Integraciones automáticas con Meta Ads
- Reemplazar `PlaceholderChart` con recharts cuando se necesite gráfico real
- Regenerar `database.types.ts` desde Supabase CLI (actualmente desactualizado — todas las tablas nuevas usan `as any`)
- Conectar agentes a activaciones reales (WhatsApp/email) cuando haya credenciales de proveedor
