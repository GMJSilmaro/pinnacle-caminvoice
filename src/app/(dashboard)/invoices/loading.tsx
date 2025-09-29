import PageSkeleton from "../../../components/skeletons/PageSkeleton"

export default function Loading() {
  return <PageSkeleton withStats withFilters tableColumns={7} tableRows={12} />
}

