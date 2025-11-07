import PageLayout from '../../../components/layouts/PageLayout'
import SupportPage from './_components/SupportPage.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & Services | Pinnacle CamInvoice',
  description: 'Get help and access support resources for Pinnacle e-Invoice',
}

export default async function SupportPageRoute() {
  return (
    <PageLayout
      title="Support & Services"
      subtitle="Get the help you need, when you need it"
      showBackButton={true}
    >
      <SupportPage />
    </PageLayout>
  )
}

