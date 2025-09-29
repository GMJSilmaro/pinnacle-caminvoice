"use client"

import { Card, Grid, Group, Skeleton, Stack } from "@mantine/core"

export type PageSkeletonProps = {
  withStats?: boolean
  statsCount?: number
  withFilters?: boolean
  tableColumns?: number
  tableRows?: number
}

export default function PageSkeleton({
  withStats = true,
  statsCount = 4,
  withFilters = true,
  tableColumns = 6,
  tableRows = 8,
}: PageSkeletonProps) {
  const cols = Array.from({ length: Math.max(1, Math.min(8, tableColumns)) })
  const rows = Array.from({ length: Math.max(1, Math.min(20, tableRows)) })

  return (
    <Stack gap="lg">
      {withStats && (
        <Grid>
          {Array.from({ length: statsCount }).map((_, i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder>
                <Group justify="space-between" align="center">
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Skeleton height={12} width={80} radius="sm" />
                    <Skeleton height={24} width={100} radius="sm" />
                  </Stack>
                  <Skeleton height={28} width={28} circle />
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {withFilters && (
        <Card withBorder>
          <Group gap="md">
            <Skeleton height={36} width={260} radius="md" />
            <Skeleton height={36} width={180} radius="md" />
            <Skeleton height={36} width={180} radius="md" />
          </Group>
        </Card>
      )}

      <Card withBorder>
        <Stack gap="sm">
          {/* Table header */}
          <Group gap="sm">
            {cols.map((_, i) => (
              <Skeleton key={i} height={14} width={120} radius="sm" />
            ))}
          </Group>
          {/* Rows */}
          <Stack gap={10}>
            {rows.map((_, r) => (
              <Group key={r} gap="sm" align="center">
                {cols.map((_, c) => (
                  <Skeleton key={`${r}-${c}`} height={18} width={c === 0 ? 200 : 120} radius="sm" />
                ))}
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}

