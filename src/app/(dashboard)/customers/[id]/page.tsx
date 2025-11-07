import { use } from 'react'
import CustomerDetailPage from '../../../../components/pages/CustomerDetailPage.client'

export const metadata = {
  title: 'Customer Details - CamInvoice',
  description: 'View customer details',
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CustomerDetailPage id={id} />
}

