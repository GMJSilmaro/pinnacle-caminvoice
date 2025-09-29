'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Badge,
  Avatar,
  Grid,
  Tabs,
  Table,
  ActionIcon,
  Paper,
  Progress,
  Alert,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconEdit,
  IconMail,
  IconPhone,
  IconMapPin,
  IconShieldCheck,
  IconShieldX,
  IconFileText,
  IconCreditCard,
  IconEye,
  IconDownload,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../components/layouts/PageLayout'

// Mock customer data
const mockCustomer = {
  id: 'cust-001',
  name: 'ABC Corporation',
  businessName: 'ABC Corp Ltd',
  taxId: 'TAX001',
  email: 'admin@abccorp.com',
  phone: '+855 12 345 678',
  address: '123 Main St, Phnom Penh',
  city: 'Phnom Penh',
  country: 'Cambodia',
  postalCode: '12000',
  status: 'active',
  camInvRegistered: true,
  camInvEndpointId: 'EP001',
  notes: 'Premium customer with excellent payment history',
  paymentTerms: 30,
  creditLimit: 50000,
  preferredCurrency: 'USD',
  createdAt: '2024-01-01',
  lastInvoiceDate: '2024-01-15',
  totalInvoices: 12,
  totalRevenue: 45000,
  outstandingAmount: 2500,
}

// Mock invoice history
const mockInvoices = [
  {
    id: 'INV-001',
    invoiceNumber: 'INV-2024-001',
    amount: '$2,500.00',
    status: 'paid',
    date: '2024-01-15',
    dueDate: '2024-02-15',
  },
  {
    id: 'INV-002',
    invoiceNumber: 'INV-2024-002',
    amount: '$1,800.00',
    status: 'pending',
    date: '2024-01-10',
    dueDate: '2024-02-10',
  },
  {
    id: 'INV-003',
    invoiceNumber: 'INV-2024-003',
    amount: '$3,200.00',
    status: 'overdue',
    date: '2023-12-15',
    dueDate: '2024-01-15',
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'green'
    case 'inactive': return 'gray'
    case 'suspended': return 'red'
    default: return 'gray'
  }
}

function getInvoiceStatusColor(status: string) {
  switch (status) {
    case 'paid': return 'green'
    case 'pending': return 'yellow'
    case 'overdue': return 'red'
    case 'draft': return 'gray'
    default: return 'gray'
  }
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <PageLayout
      title={mockCustomer.name}
      subtitle={`Customer ID: ${mockCustomer.id}`}
      actions={
        <Group>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push('/customers')}
          >
            Back to Customers
          </Button>
          <Button
            leftSection={<IconEdit size={16} />}
            onClick={() => router.push(`/customers/${params.id}/edit`)}
          >
            Edit Customer
          </Button>
        </Group>
      }
    >
      <Stack gap="xl">
        {/* Customer Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Total Invoices</Text>
                <Text size="xl" fw={700}>{mockCustomer.totalInvoices}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Total Revenue</Text>
                <Text size="xl" fw={700} c="green">${mockCustomer.totalRevenue.toLocaleString()}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Outstanding</Text>
                <Text size="xl" fw={700} c="orange">${mockCustomer.outstandingAmount.toLocaleString()}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Credit Utilization</Text>
                <Text size="xl" fw={700}>
                  {((mockCustomer.outstandingAmount / mockCustomer.creditLimit) * 100).toFixed(1)}%
                </Text>
                <Progress 
                  value={(mockCustomer.outstandingAmount / mockCustomer.creditLimit) * 100} 
                  color="blue" 
                  size="sm" 
                />
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="invoices" leftSection={<IconFileText size={16} />}>
              Invoice History
            </Tabs.Tab>
            <Tabs.Tab value="payments" leftSection={<IconCreditCard size={16} />}>
              Payment History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="md" mt="md">
              <Grid>
                {/* Basic Information */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder>
                    <Stack gap="md">
                      <Group>
                        <Avatar size="lg" radius="xl">
                          {mockCustomer.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={500} size="lg">{mockCustomer.name}</Text>
                          <Text c="dimmed">{mockCustomer.businessName}</Text>
                          <Badge color={getStatusColor(mockCustomer.status)} variant="light" mt="xs">
                            {mockCustomer.status}
                          </Badge>
                        </div>
                      </Group>

                      <Stack gap="sm">
                        <Group gap="sm">
                          <IconMail size={16} />
                          <Text size="sm">{mockCustomer.email}</Text>
                        </Group>
                        <Group gap="sm">
                          <IconPhone size={16} />
                          <Text size="sm">{mockCustomer.phone}</Text>
                        </Group>
                        <Group gap="sm">
                          <IconMapPin size={16} />
                          <Text size="sm">
                            {mockCustomer.address}, {mockCustomer.city}, {mockCustomer.country}
                          </Text>
                        </Group>
                      </Stack>

                      <Stack gap="xs">
                        <Text fw={500}>Tax ID</Text>
                        <Text size="sm" c="dimmed">{mockCustomer.taxId}</Text>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid.Col>

                {/* CamInvoice Status */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>CamInvoice Integration</Title>
                      
                      <Alert 
                        color={mockCustomer.camInvRegistered ? "green" : "orange"}
                        icon={mockCustomer.camInvRegistered ? <IconShieldCheck size={16} /> : <IconShieldX size={16} />}
                      >
                        <Text fw={500} mb="xs">
                          {mockCustomer.camInvRegistered ? 'Registered' : 'Not Registered'}
                        </Text>
                        <Text size="sm">
                          {mockCustomer.camInvRegistered 
                            ? 'This customer can receive e-invoices through CamInvoice system.'
                            : 'This customer requires manual invoice delivery.'
                          }
                        </Text>
                      </Alert>

                      {mockCustomer.camInvRegistered && (
                        <Stack gap="xs">
                          <Text fw={500}>Endpoint ID</Text>
                          <Text size="sm" c="dimmed">{mockCustomer.camInvEndpointId}</Text>
                        </Stack>
                      )}

                      <Stack gap="xs">
                        <Text fw={500}>Preferred Currency</Text>
                        <Text size="sm" c="dimmed">{mockCustomer.preferredCurrency}</Text>
                      </Stack>

                      <Stack gap="xs">
                        <Text fw={500}>Payment Terms</Text>
                        <Text size="sm" c="dimmed">{mockCustomer.paymentTerms} days</Text>
                      </Stack>

                      <Stack gap="xs">
                        <Text fw={500}>Credit Limit</Text>
                        <Text size="sm" c="dimmed">${mockCustomer.creditLimit.toLocaleString()}</Text>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>

              {/* Notes */}
              {mockCustomer.notes && (
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>Notes</Title>
                    <Text size="sm">{mockCustomer.notes}</Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="invoices">
            <Card withBorder mt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>Invoice History</Title>
                  <Button
                    leftSection={<IconFileText size={16} />}
                    onClick={() => router.push('/invoices/create')}
                  >
                    Create Invoice
                  </Button>
                </Group>

                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invoice Number</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Issue Date</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {mockInvoices.map((invoice) => (
                      <Table.Tr key={invoice.id}>
                        <Table.Td>
                          <Text fw={500}>{invoice.invoiceNumber}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{invoice.amount}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getInvoiceStatusColor(invoice.status)} variant="light">
                            {invoice.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed">{invoice.date}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed">{invoice.dueDate}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" size="sm">
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="payments">
            <Card withBorder mt="md">
              <Stack gap="md">
                <Title order={4}>Payment History</Title>
                <Text c="dimmed">Payment history will be displayed here.</Text>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </PageLayout>
  )
}
