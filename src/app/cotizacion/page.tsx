import { PageShell } from '@/components/layout/PageShell'
import { Cotizacion } from '@/components/cotizacion/Cotizacion'

export const metadata = {
  title: 'Cotizador — ProFlow OS',
}

export default function CotizacionPage() {
  return (
    <PageShell
      title="Cotizador"
      description="Genera cotizaciones de cambio de divisa para tus clientes"
    >
      <div className="py-4">
        <Cotizacion
          defaultOperation="USD_CLP"
          defaultMonto={1000}
          defaultSpread={0.25}
        />
      </div>
    </PageShell>
  )
}
