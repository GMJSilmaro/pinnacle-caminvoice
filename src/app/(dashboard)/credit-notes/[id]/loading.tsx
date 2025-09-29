import PageSkeleton from "../../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return <PageSkeleton withStats={false} withFilters={false} tableColumns={3} tableRows={10} />
}

