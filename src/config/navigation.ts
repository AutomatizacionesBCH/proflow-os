import {
  LayoutDashboard,
  Workflow,
  Users,
  CreditCard,
  Building2,
  Wallet,
  TrendingUp,
  Megaphone,
  Calculator,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  description?: string
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Resumen general',
  },
  {
    label: 'Operaciones',
    href: '/operaciones',
    icon: Workflow,
    description: 'Flujos y transacciones',
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: Users,
    description: 'Base de clientes',
  },
  {
    label: 'Procesadores',
    href: '/procesadores',
    icon: CreditCard,
    description: 'Procesadores de pago',
  },
  {
    label: 'Empresas',
    href: '/empresas',
    icon: Building2,
    description: 'Entidades registradas',
  },
  {
    label: 'Caja',
    href: '/caja',
    icon: Wallet,
    description: 'Control de efectivo',
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: TrendingUp,
    description: 'Pipeline de prospectos',
  },
  {
    label: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    description: 'Campañas y canales',
  },
  {
    label: 'Cotizador',
    href: '/cotizacion',
    icon: Calculator,
    description: 'Generador de cotizaciones',
  },
]
