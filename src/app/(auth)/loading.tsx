import PageSkeleton from "../../components/skeletons/PageSkeleton"

export default function Loading() {
  // Simple auth skeleton: no stats/filters, a small table-like placeholder
  return <PageSkeleton withStats={false} withFilters={false} tableColumns={3} tableRows={4} />
}

