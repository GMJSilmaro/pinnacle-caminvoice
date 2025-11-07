"use client"

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
  Paper,
  Progress,
  Alert,
} from "@mantine/core"
import {
  IconArrowLeft,
  IconEdit,
  IconMail,
  IconPhone,
  IconMapPin,
  IconShieldX,
  IconFileText,
  IconCreditCard,
  IconInfoCircle,
  IconShieldCheck,
} from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import PageLayout from "../layouts/PageLayout"
import { DataTable } from "../tables/DataTable"
import { type ColumnDef } from "@tanstack/react-table"

interface CustomerDto {
  id: string
  tenantId: string
  name: string
  businessName?: string | null
  taxId?: string | null
  registrationNumber?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  address: string
  city: string
  postalCode?: string | null
  country: string
  status: "ACTIVE" | "INACTIVE"
  camInvoiceEndpointId?: string | null
  camInvoiceStatus?: string | null
  createdAt: string
  updatedAt: string
}

interface Props {
  id: string
}

interface Aggregates {
  totalInvoices: number
  totalRevenue: number
  outstanding: number
}

function formatCurrency(amount: number) {
  return (Number(amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


function getStatusColor(status: string) {
  const s = (status || "").toUpperCase()
  switch (s) {
    case "ACTIVE": return "green"
    case "INACTIVE": return "gray"
    default: return "gray"
  }
}

function getInvoiceStatusColor(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'DRAFT':
      return 'gray'
    case 'SUBMITTED':
      return 'blue'
    case 'ACCEPTED':
      return 'green'
    case 'REJECTED':
      return 'red'
    default:
      return 'gray'
  }
}

export default function CustomerDetailPage({ id }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [customer, setCustomer] = useState<CustomerDto | null>(null)
  const [aggregates, setAggregates] = useState<Aggregates>({ totalInvoices: 0, totalRevenue: 0, outstanding: 0 })
  const [invoiceRows, setInvoiceRows] = useState<any[]>([])
  // Treat as registered only if explicitly marked so in our DB status
  const isCamInvRegistered = (customer?.camInvoiceStatus || '').toLowerCase() === 'registered'
  const endpointId = customer?.camInvoiceEndpointId || customer?.taxId || ''

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/customers/${id}`, { credentials: "include" })
        if (!res.ok) {
          setCustomer(null)
          return
        }
        const text = await res.text()
        const data = text ? JSON.parse(text) : {}
        if (mounted) {
          setCustomer(data.customer || null)
          if (data.aggregates) {
            setAggregates({
              totalInvoices: Number(data.aggregates.totalInvoices || 0),
              totalRevenue: Number(data.aggregates.totalRevenue || 0),
              outstanding: Number(data.aggregates.outstanding || 0),
            })
          }
        }
      } catch {
        if (mounted) setCustomer(null)
      }
    })()
    return () => { mounted = false }

  }, [id])

  // Load invoices for this customer when Invoices tab opens
  useEffect(() => {
    if (activeTab !== 'invoices' || !id) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/invoices?page=1&pageSize=100&customerId=${encodeURIComponent(id)}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const rows = (data.invoices || []).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(inv.totalAmount || 0),
          status: inv.status,
          issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : '',
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
        }))
        if (mounted) setInvoiceRows(rows)
      } catch {}
    })()
    return () => { mounted = false }
  }, [activeTab, id])

  type InvoiceRow = { id: string; invoiceNumber: string; amount: number; status: string; issueDate: string; dueDate: string }
  const columns: ColumnDef<InvoiceRow>[] = [
    { accessorKey: 'invoiceNumber', header: 'Invoice Number', cell: ({ row }) => (<Text fw={500}>{row.original.invoiceNumber}</Text>) },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => (<Text>{new Intl.NumberFormat('en-US').format(row.original.amount)}</Text>) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (<Badge color={getInvoiceStatusColor(row.original.status)} variant="light" size="sm">{row.original.status}</Badge>) },
    { accessorKey: 'issueDate', header: 'Issue Date', cell: ({ row }) => (<Text c="dimmed">{row.original.issueDate}</Text>) },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (<Button size="xs" variant="light" onClick={() => router.push(`/invoices/${row.original.id}`)}>View</Button>) },
  ]

  return (
    <PageLayout
      title={customer?.name || "Customer"}
      subtitle={`Customer ID: ${id}`}
      actions={
        <Group>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push("/customers")}
          >
            Back to Customers
          </Button>
          <Button
            leftSection={<IconEdit size={16} />}
            onClick={() => router.push(`/customers/${id}/edit`)}
          >
            Edit Customer
          </Button>
        </Group>
      }
    >
      <Stack gap="xl">
        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Total Invoices</Text>
                <Text size="xl" fw={700}>{aggregates.totalInvoices.toLocaleString()}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Total Revenue</Text>
                <Text size="xl" fw={700} c="green">{formatCurrency(aggregates.totalRevenue)}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Outstanding</Text>
                <Text size="xl" fw={700} c="orange">{formatCurrency(aggregates.outstanding)}</Text>
              </Stack>
            </Paper>
          </Grid.Col>
          {/* <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Credit Utilization</Text>
                <Text size="xl" fw={700}>{"—"}</Text>
                <Progress value={0} color="blue" size="sm" />
              </Stack>
            </Paper>
          </Grid.Col> */}
        </Grid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "overview")}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>Overview</Tabs.Tab>
            <Tabs.Tab value="invoices" leftSection={<IconFileText size={16} />}>Invoice History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="md" mt="md">
              <Grid>
                {/* Basic Info */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder>
                    <Stack gap="md">
                      <Group>
                        <Avatar size="lg" radius="xl">
                          {(customer?.name || "CU").substring(0, 2).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={500} size="lg">{customer?.name || "—"}</Text>
                          <Text c="dimmed">{customer?.businessName || customer?.name || "—"}</Text>
                          <Badge color={getStatusColor(customer?.status || "")} variant="light" mt="xs">
                            {customer?.status || "—"}
                          </Badge>
                        </div>
                      </Group>

                      <Stack gap="sm">
                        <Group gap="sm">
                          <IconMail size={16} />
                          <Text size="sm">{customer?.email || "—"}</Text>
                        </Group>
                        <Group gap="sm">
                          <IconPhone size={16} />
                          <Text size="sm">{customer?.phone || "—"}</Text>
                        </Group>
                        <Group gap="sm">
                          <IconMapPin size={16} />
                          <Text size="sm">
                            {customer?.address || "—"}{customer?.city ? `, ${customer.city}` : ""}{customer?.country ? `, ${customer.country}` : ""}
                          </Text>
                        </Group>
                      </Stack>

                      <Stack gap="xs">
                        <Text fw={500}>Endpoint ID</Text>
                        <Text size="sm" c="dimmed">{endpointId || "—"}</Text>

                        <Text fw={500}>VATTIN</Text>
                        <Text size="sm" c="dimmed">{customer?.registrationNumber || "—"}</Text>
                      </Stack>

                    </Stack>
                  </Card>
                </Grid.Col>

                {/* CamInvoice Status */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>CamInvoice Status</Title>

                      <Alert color={isCamInvRegistered ? "green" : "orange"} icon={isCamInvRegistered ? <IconShieldCheck size={16} /> : <IconShieldX size={16} />}>
                        <Text fw={500} mb="xs">{isCamInvRegistered ? "Registered" : "Not Registered"}</Text>
                        <Text size="sm">{isCamInvRegistered ? "This customer is registered with CamInvoice and can receive e-invoices." : "This customer is not registered with CamInvoice. Manual invoice delivery required."}</Text>
                      </Alert>

                      {/* <Stack gap="xs">
                        <Text fw={500}>Preferred Currency</Text>
                        <Text size="sm" c="dimmed">{"—"}</Text>
                      </Stack>

                      <Stack gap="xs">
                        <Text fw={500}>Payment Terms</Text>
                        <Text size="sm" c="dimmed">{"—"}</Text>
                      </Stack> */}

                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="invoices">
            <Card withBorder mt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>Invoice History</Title>
                  <Button leftSection={<IconFileText size={16} />} onClick={() => router.push("/invoices/create")}>Create Invoice</Button>
                </Group>

                <DataTable columns={columns} data={invoiceRows as any} searchPlaceholder="Search invoices..." />
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

