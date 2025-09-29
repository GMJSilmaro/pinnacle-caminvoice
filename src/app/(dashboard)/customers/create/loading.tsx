import PageSkeleton from "../../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return <PageSkeleton withStats={false} withFilters={false} tableColumns={2} tableRows={10} />
}

