import PageLayout from "../../../../components/layouts/PageLayout"
import PageSkeleton from "../../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return (
    <PageLayout
      title="Create Credit Note"
      subtitle="Create a new credit note for CamInvoice"
    >
      <PageSkeleton tableColumns={6} tableRows={8} withFilters={false} />
    </PageLayout>
  )
}

