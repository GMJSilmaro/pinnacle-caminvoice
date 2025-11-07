import { Skeleton, Stack, SimpleGrid, Card, Grid, Paper } from '@mantine/core'
import PageLayout from '../../../components/layouts/PageLayout'

export default function Loading() {
  return (
    <PageLayout
      title="Dashboard"
      subtitle="CamInvoice Management Portal"
      showBackButton={false}
    >
      <Stack gap="xl">
        {/* Welcome Section Skeleton */}
        <Paper p="xl" radius="md" withBorder>
          <Skeleton height={60} radius="md" />
        </Paper>

        {/* Stats Cards Skeleton */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} shadow="xs" padding="lg" radius="md" withBorder>
              <Stack gap="xs">
                <Skeleton height={20} width="60%" />
                <Skeleton height={40} width="80%" />
                <Skeleton height={16} width="50%" />
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        {/* Charts Section Skeleton */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="xs" padding="lg" radius="md" withBorder>
              <Skeleton height={24} width="40%" mb="md" />
              <Skeleton height={200} radius="md" />
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="xs" padding="lg" radius="md" withBorder>
              <Skeleton height={24} width="40%" mb="md" />
              <Stack gap="sm">
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Invoices Skeleton */}
        <Card shadow="xs" padding="lg" radius="md" withBorder>
          <Skeleton height={24} width="30%" mb="md" />
          <Stack gap="sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={50} />
            ))}
          </Stack>
        </Card>

        {/* Activity Timeline Skeleton */}
        <Card shadow="xs" padding="lg" radius="md" withBorder>
          <Skeleton height={24} width="30%" mb="md" />
          <Stack gap="md">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={60} />
            ))}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  )
}

