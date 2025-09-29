import PageSkeleton from "../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return <PageSkeleton withStats withFilters tableColumns={6} tableRows={12} />
}

