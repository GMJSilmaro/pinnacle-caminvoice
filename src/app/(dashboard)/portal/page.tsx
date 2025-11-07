import type { Metadata } from 'next'
import { Suspense } from 'react'
import PortalDashboard from './_components/PortalDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard | Pinnacle CamInvoice',
  description: 'Manage your invoices and track CamInvoice submissions',
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PortalDashboard />
    </Suspense>
  )
}
