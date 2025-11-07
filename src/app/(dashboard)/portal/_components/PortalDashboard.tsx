'use client'

import { useState, useEffect } from 'react'
import {
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  Button,
  Paper,
  Divider,
  SimpleGrid,
  ThemeIcon,
  Table,
  Alert,
  Title,
  Container,
} from '@mantine/core'
import {
  IconFileInvoice,
  IconUsers,
  IconCurrencyDollar,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconClock,
  IconPlus,
  IconRefresh,
  IconEye,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  pendingInvoices: number
  activeClients: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  totalAmount: number
  currency: string
  camInvoiceStatus?: string
  customer?: {
    id: string
    name: string
    email?: string
  }
}

interface DashboardData {
  stats: DashboardStats
  invoices: Invoice[]
}

export default function PortalDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/invoices?pageSize=5')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const result = await response.json()
      
      setData({
        stats: result.stats || {
          totalInvoices: 0,
          totalRevenue: 0,
          pendingInvoices: 0,
          activeClients: 0,
        },
        invoices: result.invoices || [],
      })
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Title order={1}>Dashboard</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} shadow="xs" padding="lg" radius="md" withBorder>
                <Stack gap="xs" h={120} justify="center">
                  <Text size="sm" c="dimmed">Loading...</Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error Loading Dashboard">
          <Text size="sm" mb="md">{error}</Text>
          <Button size="sm" variant="light" onClick={fetchDashboardData}>
            Try Again
          </Button>
        </Alert>
      </Container>
    )
  }

  const stats = data?.stats
  const recentInvoices = data?.invoices || []

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Paper p="xl" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2} c="white" mb="xs">
                Dashboard
              </Title>
              <Text size="sm" c="rgba(255, 255, 255, 0.9)">
                CamInvoice Management Portal
              </Text>
            </div>
            <Button
              variant="white"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchDashboardData}
              loading={refreshing}
              size="sm"
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed" fw={500}>
                  Total Invoices
                </Text>
                <ThemeIcon size={38} radius="md" color="blue" variant="light">
                  <IconFileInvoice size={22} />
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={700}>
                {stats?.totalInvoices || 0}
              </Text>
              <Text size="xs" c="dimmed">
                All time
              </Text>
            </Stack>
          </Card>

          <Card shadow="xs" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed" fw={500}>
                  Total Revenue
                </Text>
                <ThemeIcon size={38} radius="md" color="green" variant="light">
                  <IconCurrencyDollar size={22} />
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={700}>
                {stats?.totalRevenue?.toLocaleString() || 0}
              </Text>
              <Text size="xs" c="dimmed">
                KHR
              </Text>
            </Stack>
          </Card>

          <Card shadow="xs" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed" fw={500}>
                  Pending Invoices
                </Text>
                <ThemeIcon size={38} radius="md" color="orange" variant="light">
                  <IconClock size={22} />
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={700}>
                {stats?.pendingInvoices || 0}
              </Text>
              <Text size="xs" c="dimmed">
                Awaiting processing
              </Text>
            </Stack>
          </Card>

          <Card shadow="xs" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed" fw={500}>
                  Active Clients
                </Text>
                <ThemeIcon size={38} radius="md" color="violet" variant="light">
                  <IconUsers size={22} />
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={700}>
                {stats?.activeClients || 0}
              </Text>
              <Text size="xs" c="dimmed">
                With invoices
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="xs" padding="lg" radius="md" withBorder>
              <Title order={3} size="h4" mb="md">
                Quick Actions
              </Title>
              <Divider mb="md" />
              <Stack gap="sm">
                <Button
                  fullWidth
                  leftSection={<IconPlus size={18} />}
                  variant="light"
                  color="blue"
                  size="md"
                  onClick={() => router.push('/invoices')}
                >
                  Create New Invoice
                </Button>

                <Button
                  fullWidth
                  leftSection={<IconUsers size={18} />}
                  variant="light"
                  color="violet"
                  size="md"
                  onClick={() => router.push('/customers')}
                >
                  Manage Customers
                </Button>

                <Button
                  fullWidth
                  leftSection={<IconEye size={18} />}
                  variant="light"
                  color="teal"
                  size="md"
                  onClick={() => router.push('/invoices')}
                >
                  View All Invoices
                </Button>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="xs" padding="lg" radius="md" withBorder>
              <Title order={3} size="h4" mb="md">
                Recent Activity
              </Title>
              <Divider mb="md" />
              {recentInvoices.length === 0 ? (
                <Stack align="center" py="xl">
                  <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                    <IconFileInvoice size={32} />
                  </ThemeIcon>
                  <Text c="dimmed">No recent invoices</Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {recentInvoices.slice(0, 5).map((invoice) => (
                    <Paper key={invoice.id} p="sm" withBorder>
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {invoice.invoiceNumber}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {invoice.customer?.name || 'Unknown Customer'}
                          </Text>
                        </div>
                        <Badge
                          color={
                            invoice.status === 'ACCEPTED'
                              ? 'green'
                              : invoice.status === 'REJECTED'
                              ? 'red'
                              : invoice.status === 'SUBMITTED'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {invoice.status}
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Invoices Table */}
        <Card shadow="xs" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3} size="h4">
                Recent Invoices
              </Title>
              <Text size="sm" c="dimmed">
                Last 5 invoices
              </Text>
            </div>
            <Button variant="light" size="sm" onClick={() => router.push('/invoices')}>
              View All
            </Button>
          </Group>
          <Divider mb="md" />

          {recentInvoices.length === 0 ? (
            <Stack align="center" py="xl">
              <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                <IconFileInvoice size={32} />
              </ThemeIcon>
              <Text c="dimmed">No invoices yet</Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => router.push('/invoices')}
              >
                Create Your First Invoice
              </Button>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={500}>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice No.</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentInvoices.map((invoice) => (
                    <Table.Tr
                      key={invoice.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {invoice.invoiceNumber}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm">{invoice.customer?.name || 'Unknown'}</Text>
                          {invoice.customer?.email && (
                            <Text size="xs" c="dimmed">
                              {invoice.customer.email}
                            </Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {invoice.currency} {invoice.totalAmount?.toLocaleString() || 0}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            invoice.status === 'ACCEPTED'
                              ? 'green'
                              : invoice.status === 'REJECTED'
                              ? 'red'
                              : invoice.status === 'SUBMITTED'
                              ? 'blue'
                              : 'gray'
                          }
                          variant="light"
                        >
                          {invoice.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      </Stack>
    </Container>
  )
}

