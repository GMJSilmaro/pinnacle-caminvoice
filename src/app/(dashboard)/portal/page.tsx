'use client'

import {
  Text,
  Stack,
  Grid,
  Alert,
  Center,
  Loader,
} from '@mantine/core'
import {
  IconInfoCircle,
  IconUsers,
  IconFileInvoice,
  IconChartBar,
  IconDatabase,
} from '@tabler/icons-react'
import { useAuth } from '../../../hooks/useAuth'
import PageLayout from '../../../components/layouts/PageLayout'
import StatsCard from '../../../components/ui/StatsCard'

export default function PortalPage() {
  const { user, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading portal...</Text>
        </Stack>
      </Center>
    )
  }

  // Role-based access control
  if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'TENANT_USER')) {
    return (
      <Stack p="md">
        <Alert color="red" icon={<IconInfoCircle size={16} />}>
          <Text fw={500} mb="xs">Access Denied</Text>
          <Text size="sm">
            You do not have permission to access the Tenant Portal.
            Only tenant users can access this area.
          </Text>
        </Alert>
      </Stack>
    )
  }

  const stickyContent = (
    <Stack gap="md">
      {/* Welcome Message */}
      <Alert color="blue" icon={<IconInfoCircle size={16} />}>
        {/* <Text fw={500} mb="xs">Welcome to CamInvoice Portal</Text> */}
        <Text size="sm">
          Welcome, {user.firstName} {user.lastName}! You are logged in as a {user.role.replace('_', ' ').toLowerCase()} 
          {user.tenant && ` for ${user.tenant.name}`}.
        </Text>
      </Alert>

      {/* Quick Stats */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Invoices"
            value="24"
            icon={<IconFileInvoice size={20} />}
            iconColor="blue"
            subtitle="This month"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Submitted"
            value="18"
            icon={<IconDatabase size={20} />}
            iconColor="green"
            subtitle="To CamInvoice"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Accepted"
            value="16"
            icon={<IconChartBar size={20} />}
            iconColor="teal"
            subtitle="Approved invoices"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Team Members"
            value="3"
            icon={<IconUsers size={20} />}
            iconColor="violet"
            subtitle="Active users"
          />
        </Grid.Col>
      </Grid>
    </Stack>
  )

  return (
    <PageLayout
      title="Tenant Portal"
      subtitle={`${user.tenant?.name || 'Your Company'} - CamInvoice Management`}
      showBackButton={false}
      stickyContent={stickyContent}
    >
      <Stack gap="xl">
        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          <Text fw={500} mb="xs">Portal Under Development</Text>
          <Text size="sm">
            The tenant portal is currently under development. This will include invoice management, 
            customer management, reporting, and CamInvoice integration features.
          </Text>
        </Alert>

        {user.tenant && (
          <Alert color="green" icon={<IconInfoCircle size={16} />}>
            <Text fw={500} mb="xs">Tenant Information</Text>
            <Text size="sm">
              <strong>Company:</strong> {user.tenant.businessName}<br />
              <strong>Tax ID:</strong> {user.tenant.taxId}<br />
              <strong>Status:</strong> {user.tenant.status}<br />
              <strong>CamInvoice Connected:</strong> {user.tenant.isConnectedToCamInv ? 'Yes' : 'No'}
            </Text>
          </Alert>
        )}
      </Stack>
    </PageLayout>
  )
}
