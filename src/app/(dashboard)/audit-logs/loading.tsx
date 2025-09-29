import PageSkeleton from "../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return <PageSkeleton withStats={false} withFilters tableColumns={5} tableRows={14} />
}

