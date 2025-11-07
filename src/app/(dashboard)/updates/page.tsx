import PageLayout from '../../../components/layouts/PageLayout'
import UpdatesPage from './_components/UpdatesPage.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Product Updates | Pinnacle CamInvoice',
  description: 'Stay informed about the latest features and updates',
}

export default async function UpdatesPageRoute() {
  return (
    <PageLayout
      title="Product Updates"
      subtitle="Stay informed about the latest features and improvements"
      showBackButton={true}
    >
      <UpdatesPage />
    </PageLayout>
  )
}

