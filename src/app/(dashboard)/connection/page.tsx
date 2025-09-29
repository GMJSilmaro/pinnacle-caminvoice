'use client'

import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  Button,
  Alert,
} from '@mantine/core'
import {
  IconPlugConnected,
  IconShieldCheck,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react'
import PageLayout from '../../../components/layouts/PageLayout'
import MerchantConnection from '../../../components/merchant/MerchantConnection'

export default function ConnectionPage() {
  // Mock data - in real app this would come from API/database
  const isConnected = true // Change to false to see disconnected state
  const merchantInfo = {
    name: 'Pixelcare Consulting Ltd.',
    taxId: 'KH-123456789',
    endpointId: 'EP-PXC-001',
    lastConnected: '2024-01-16 14:30:25',
    tokenExpiry: '2024-02-16 14:30:25',
  }

  const connectionStats = {
    totalInvoices: 247,
    successfulSubmissions: 245,
    failedSubmissions: 2,
    lastSubmission: '2024-01-16 13:45:12',
  }

  const handleConnect = () => {
    console.log('Connecting to CamInvoice...')
    // TODO: Implement OAuth flow
  }

  const handleDisconnect = () => {
    console.log('Disconnecting from CamInvoice...')
    // TODO: Implement disconnect logic
  }

  const handleRefreshToken = () => {
    console.log('Refreshing CamInvoice tokens...')
    // TODO: Implement token refresh
  }

  return (
    <PageLayout
      title="CamInvoice Connection"
      subtitle="Manage your connection to the Cambodia e-Invoicing system"
      showBackButton={false}
    >

        {/* Connection Status Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Connection Status</Text>
                  <Badge color={isConnected ? 'green' : 'red'} variant="light">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <IconPlugConnected 
                  size={24} 
                  color={isConnected ? "var(--mantine-color-green-6)" : "var(--mantine-color-red-6)"} 
                />
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Total Invoices</Text>
                  <Text size="xl" fw={700}>{connectionStats.totalInvoices}</Text>
                </div>
                <IconShieldCheck size={24} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Success Rate</Text>
                  <Text size="xl" fw={700}>
                    {((connectionStats.successfulSubmissions / connectionStats.totalInvoices) * 100).toFixed(1)}%
                  </Text>
                </div>
                <IconShieldCheck size={24} color="var(--mantine-color-green-6)" />
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Last Submission</Text>
                  <Text size="sm" fw={500}>{connectionStats.lastSubmission}</Text>
                </div>
                <IconClock size={24} color="var(--mantine-color-violet-6)" />
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Connection Component */}
        <MerchantConnection
          isConnected={isConnected}
          merchantInfo={isConnected ? merchantInfo : undefined}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefreshToken={handleRefreshToken}
        />

        {/* Additional Information */}
        {isConnected && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder>
                <Stack gap="md">
                  <Title order={4}>Submission Statistics</Title>
                  <Group justify="space-between">
                    <Text size="sm">Successful Submissions:</Text>
                    <Badge color="green" variant="light">
                      {connectionStats.successfulSubmissions}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Failed Submissions:</Text>
                    <Badge color="red" variant="light">
                      {connectionStats.failedSubmissions}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Success Rate:</Text>
                    <Text fw={500}>
                      {((connectionStats.successfulSubmissions / connectionStats.totalInvoices) * 100).toFixed(1)}%
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder>
                <Stack gap="md">
                  <Title order={4}>Recent Activity</Title>
                  <Text size="sm" c="dimmed">
                    Last 5 CamInvoice submissions:
                  </Text>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">INV-001</Text>
                      <Badge color="green" size="sm">Success</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">INV-002</Text>
                      <Badge color="green" size="sm">Success</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">INV-003</Text>
                      <Badge color="red" size="sm">Failed</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">INV-004</Text>
                      <Badge color="green" size="sm">Success</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">INV-005</Text>
                      <Badge color="green" size="sm">Success</Badge>
                    </Group>
                  </Stack>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Alerts */}
        {connectionStats.failedSubmissions > 0 && (
          <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
            <Text fw={500} mb="xs">Attention Required</Text>
            You have {connectionStats.failedSubmissions} failed invoice submissions. 
            Please check the audit logs for details and retry if necessary.
          </Alert>
        )}
    </PageLayout>
  )
}
