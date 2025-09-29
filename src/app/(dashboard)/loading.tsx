import PageSkeleton from "../../components/skeletons/PageSkeleton"

export default function Loading() {
  // Generic dashboard skeleton used during route transitions/data loading
  return <PageSkeleton withStats withFilters tableColumns={6} tableRows={10} />
}

