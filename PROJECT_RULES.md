# ProFlow OS — Reglas y Visión del Proyecto

## Qué es este sistema
ProFlow OS es el sistema maestro de operaciones de La Caja Chica. 
Centraliza operaciones, clientes, empresas, procesadores, caja, leads y marketing.

## Regla principal
Una sola versión viva. Un solo repositorio. Una sola base de datos.
No se crean copias paralelas ni versiones separadas.

## Stack técnico
- Next.js con App Router
- TypeScript
- Tailwind CSS
- Supabase (base de datos)
- Vercel (deployment)
- GitHub (repositorio: AutomatizacionesBCH/proflow-os)

## Módulos del sistema
1. Dashboard — resumen ejecutivo en tiempo real
2. Operaciones — gestión de transacciones con calculadora de utilidad
3. Clientes — CRM con ficha, tags e historial
4. Empresas — registro y control de empresas
5. Procesadores — control de procesadores con límite diario
6. Caja — registro de posición de caja disponible
7. Leads — pipeline de prospectos por canal
8. Marketing — control de gasto publicitario por canal

## Reglas de negocio
- Tipo de cambio: ingreso manual, usar el menor entre dólar observado y Bloomberg
- Payout sugerido al cliente: <$1000=78%, $1000-2499=79%, $2500-4999=80%, $5000+=81%
- Cada cliente debe tener empresa y procesador asignado
- Cada operación debe vincular cliente + empresa + procesador
- Fórmula de utilidad: gross_clp - processor_fee - loan_fee - payout_fee - wire_fee - receive_fee - client_payout = profit_clp

## Canales de leads
Meta, TikTok, LinkedIn, Twitter/X, referido, otro

## Estados de leads
nuevo, contactado, en_seguimiento, convertido, perdido

## Tags de clientes
VIP, frecuente, nuevo, riesgo, pausado

## Colaboradores
- Alberto (desarrollador principal)
- Andrés (colaborador)

## Cómo contribuir
1. Trabajar siempre sobre la rama main
2. Hacer git pull antes de empezar
3. Hacer git push al terminar cada módulo
4. No crear ramas paralelas sin coordinación

## Próximos pasos planeados
- Sistema de autenticación
- Importador CSV para historial Stripe y NMI
- Documentos por cliente (Supabase Storage)
- Integraciones automáticas con Meta Ads
