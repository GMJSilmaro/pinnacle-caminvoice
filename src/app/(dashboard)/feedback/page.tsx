import PageLayout from '../../../components/layouts/PageLayout'
import FeedbackPage from './_components/FeedbackPage.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feedback | Pinnacle CamInvoice',
  description: 'Share your feedback and suggestions to help us improve',
}

export default async function FeedbackPageRoute() {
  return (
    <PageLayout
      title="Feedback"
      subtitle="We'd love to hear from you! Share your thoughts and suggestions"
      showBackButton={true}
    >
      <FeedbackPage />
    </PageLayout>
  )
}

