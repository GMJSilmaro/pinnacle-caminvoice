'use client'

import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Avatar,
  Alert,
  Tooltip,
  Modal,
  Paper,
  Checkbox,
} from "@mantine/core"
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconFilter,
  IconShieldCheck,
  IconShieldX,
  IconClock,
  IconQuestionMark,
  IconRefresh,
  IconUsers,
  IconFileInvoice,
  IconCalendarEvent,
  IconCurrencyDollar,
  IconInfoCircle,
  IconBulb,
  IconHelp,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from "@tabler/icons-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { showNotification } from '../../utils/notifications'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'

// Customer type definition
interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  invoices: number
  revenue: number
  currency?: string
  lastContact: string
  avatar: string
  camInvId?: string // CamInv Endpoint ID (e.g., KHUID00001234)
  camInvStatus: 'registered' | 'not_registered' | 'pending' | 'unknown'
  companyNameEn?: string
  companyNameKh?: string
  tin?: string // Tax Identification Number
}

// API response type (subset)
interface ApiCustomer {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  camInvoiceStatus?: string
  address: string
  city: string
  country: string
  createdAt: string
}

function getStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "green"
    case "Inactive":
      return "red"
    case "Pending":
      return "yellow"
    default:
      return "gray"
  }
}

function getCamInvStatusColor(status: string) {
  switch (status) {
    case "registered":
      return "green"
    case "not_registered":
      return "red"
    case "pending":
      return "yellow"
    case "unknown":
      return "gray"
    default:
      return "gray"
  }
}

function getCamInvStatusLabel(status: string) {
  switch (status) {
    case "registered":
      return "CamInv Registered"
    case "not_registered":
      return "Not Registered"
    case "pending":
      return "Registration Pending"
    case "unknown":
      return "Status Unknown"
    default:
      return "Unknown"
  }
}

// Column definitions for TanStack Table
const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Customer',
    cell: ({ row }) => (
      <Group gap="sm">
        <Avatar size="sm" radius="xl">
          {row.original.avatar}
        </Avatar>
        <Box>
          <Text fw={500}>{row.original.name}</Text>
          <Text size="xs" c="dimmed">ID: {row.original.id}</Text>
        </Box>
      </Group>
    ),
  },
  {
    accessorKey: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <Stack gap={2}>
        <Group gap="xs">
          <IconMail size={12} />
          <Text size="sm">{row.original.email}</Text>
        </Group>
        <Group gap="xs">
          <IconPhone size={12} />
          <Text size="sm">{row.original.phone}</Text>
        </Group>
      </Stack>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge color={getStatusColor(row.original.status)} variant="light">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'camInvStatus',
    header: 'CamInv Status',
    cell: ({ row }) => {
      const status = row.original.camInvStatus
      const getIcon = () => {
        switch (status) {
          case 'registered':
            return <IconShieldCheck size={14} />
          case 'not_registered':
            return <IconShieldX size={14} />
          case 'pending':
            return <IconClock size={14} />
          default:
            return <IconQuestionMark size={14} />
        }
      }

      return (
        <Group gap="xs">
          <Badge
            color={getCamInvStatusColor(status)}
            variant="light"
            leftSection={getIcon()}
          >
            {getCamInvStatusLabel(status)}
          </Badge>
          {row.original.camInvId && (
            <Text size="xs" c="dimmed">
              {row.original.camInvId}
            </Text>
          )}
        </Group>
      )
    },
  },
  {
    accessorKey: 'invoices',
    header: 'Invoices',
    cell: ({ row }) => (
      <Text fw={500}>{row.original.invoices}</Text>
    ),
  },
  // Revenue column removed per request
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const router = useRouter()
      return (
        <Group gap="xs">
          <Tooltip label="View customer details">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/customers/${row.original.id}`)
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Edit customer information">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/customers/${row.original.id}/edit`)
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refresh CamInvoice registration status">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="blue"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Implement CamInv registration check
                console.log('Check CamInv registration for:', row.original.name)
                showNotification.info(`Checking CamInv registration for ${row.original.name}...`)
              }}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete customer (cannot be undone)">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="red"
              onClick={async (e) => {
                e.stopPropagation()
                const id = row.original.id
                const ok = window.confirm(`Delete customer ${row.original.name}? This cannot be undone.`)
                if (!ok) return
                try {
                  const res = await fetch(`/api/customers/${id}`, { method: 'DELETE', credentials: 'include' })
                  const body = await res.json().catch(() => ({}))
                  if (!res.ok) throw new Error(body.error || 'Failed to delete customer')
                  showNotification.success('Customer deleted')
                  window.dispatchEvent(new CustomEvent('customers:refresh'))
                } catch (err: any) {
                  showNotification.error(err?.message || 'Failed to delete customer')
                }
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )
    },
  },
]

export default function ClientsPage() {
  const router = useRouter()

  // Handle row click to navigate to customer details
  const handleRowClick = (client: Customer) => {
    router.push(`/customers/${client.id}`)
  }

  const [stats, setStats] = useState({ totalCustomers: 0, newThisMonth: 0, activeInvoices: 0, totalRevenue: 0 })

  // Help section state
  const [helpExpanded, setHelpExpanded] = useState(false)
  const [helpDismissed, setHelpDismissed] = useState(false)

  // Load help preferences from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('customers-help-dismissed') === 'true'
    const expanded = localStorage.getItem('customers-help-expanded') === 'true'
    setHelpDismissed(dismissed)
    setHelpExpanded(expanded && !dismissed)
  }, [])

  // Save help preferences to localStorage
  const toggleHelp = () => {
    const newExpanded = !helpExpanded
    setHelpExpanded(newExpanded)
    localStorage.setItem('customers-help-expanded', String(newExpanded))
  }

  const dismissHelp = () => {
    setHelpDismissed(true)
    setHelpExpanded(false)
    localStorage.setItem('customers-help-dismissed', 'true')
  }


  const statsCards = [
    { title: 'Total Customers', value: String(stats.totalCustomers), icon: IconUsers, color: 'blue' as const },
    { title: 'Total Invoices', value: stats.activeInvoices ? String(stats.activeInvoices) : '—', icon: IconFileInvoice, color: 'green' as const },
    { title: 'New This Month', value: String(stats.newThisMonth), icon: IconCalendarEvent, color: 'orange' as const },
    { title: 'Total Revenue', value: stats.totalRevenue ? new Intl.NumberFormat().format(stats.totalRevenue) : '—', icon: IconCurrencyDollar, color: 'purple' as const },
  ]

  const stickyContent = (
    <Flex wrap="wrap" gap="md">
      {statsCards.map((stat, index) => (
        <Box key={index} style={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <Box>
                <Group gap="xs" align="center">
                  <Text c="dimmed" size="sm" fw={500}>
                    {stat.title}
                  </Text>
                  {stat.title === 'Total Revenue' && (
                    <Tooltip label="Revenue amounts are displayed in KHR (Cambodian Riel)">
                      <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
                    </Tooltip>
                  )}
                </Group>
                <Text fw={700} size="xl">
                  {stat.value}
                </Text>
              </Box>
              <ActionIcon size="xl" radius="md" variant="light" color={stat.color}>
                <stat.icon size={24} />
              </ActionIcon>
            </Group>
          </Card>
        </Box>
      ))}
    </Flex>
  )

  const [pageLoading, setPageLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [currencyCode, setCurrencyCode] = useState<string>('KHR')

  async function loadCustomers() {
    try {
      const res = await fetch('/api/customers?page=1&pageSize=100', { credentials: 'include' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to load customers')
      const data = body as { customers: (ApiCustomer & { invoiceCount?: number; totalRevenue?: number })[]; total?: number; currency?: string }
      const mapped: Customer[] = (data.customers || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email || '-',
        phone: c.phone || '-',
        status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
        invoices: typeof (c as any).invoiceCount === 'number' ? (c as any).invoiceCount : 0,
        revenue: Number((c as any).totalRevenue || 0),
        currency: (data.currency || 'KHR'),
        lastContact: new Date(c.createdAt).toLocaleDateString(),
        avatar: (c.name?.split(' ').map(p=>p[0]).join('').slice(0,2) || 'CU').toUpperCase(),
        camInvStatus: ((c as any).camInvoiceStatus as any) || 'unknown',
      }))
      setCustomers(mapped)
      if (data.currency) setCurrencyCode(data.currency)

      const total = typeof (data as any).total === 'number' ? (data as any).total : mapped.length
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
      const newThisMonth = (data.customers || []).reduce((acc, c) => acc + (new Date(c.createdAt) >= monthStart ? 1 : 0), 0)
      setStats({ totalCustomers: total, newThisMonth, activeInvoices: 0, totalRevenue: 0 })
    } catch (e: any) {
      showNotification.error(e?.message || 'Failed to load customers')
    }
  }

  useEffect(() => {
    let mounted = true
    loadCustomers().finally(() => mounted && setPageLoading(false))

    const onRefresh = () => loadCustomers()
    window.addEventListener('customers:refresh', onRefresh)
    return () => { mounted = false; window.removeEventListener('customers:refresh', onRefresh) }
  }, [])

  if (pageLoading) {
    return (
      <PageLayout
        title="Customers"
        subtitle="Manage your customer relationships and contacts"
        showBackButton={false}
        actions={
          <Group>
            <Button leftSection={<IconFilter size={16} />} variant="light" disabled>
              Filter
            </Button>
            <Button leftSection={<IconPlus size={16} />} disabled>
              Add Customer
            </Button>
          </Group>
        }
      >
        <PageSkeleton withStats withFilters tableColumns={6} tableRows={10} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Customers"
      subtitle="Manage your customer relationships and contacts"
      showBackButton={true}
      stickyContent={stickyContent}
      actions={
        <Group>
          <Button leftSection={<IconFilter size={16} />} variant="light">
            Filter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push('/customers/create')}
          >
            Add Customer
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Compact Help Section */}
        {!helpDismissed && (
          <Paper withBorder p="xs" radius="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
            <Group justify="space-between" align="center">
              <Group gap="xs" align="center">
                <IconHelp size={16} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text size="sm" fw={500} c="blue.7">
                  Customer Management Help
                </Text>
                {!helpExpanded && (
                  <Text size="xs" c="dimmed">
                    Click to view tips and guides
                  </Text>
                )}
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={toggleHelp}
                  aria-label={helpExpanded ? "Collapse help" : "Expand help"}
                >
                  {helpExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={dismissHelp}
                  aria-label="Dismiss help"
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            </Group>

            {helpExpanded && (
              <Stack gap="xs" mt="xs" pl="md">
                <Box>
                  <Text size="xs" fw={500} c="blue.7" mb={2}>Management Guide:</Text>
                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                    • Click any customer row for detailed information and profile management<br />
                    • Check <strong>CamInv Status</strong> column for Cambodia e-invoice registration<br />
                    • Use refresh icon <IconRefresh size={12} style={{ display: 'inline' }} /> to update CamInvoice status<br />
                    • Revenue displayed in KHR (Cambodian Riel) format
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" fw={500} c="orange.7" mb={2}>Quick Tips:</Text>
                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                    • "CamInv Registered" customers can receive e-invoices<br />
                    • Use search bar for quick customer lookup<br />
                    • Export data via filter options for reporting
                  </Text>
                </Box>
              </Stack>
            )}
          </Paper>
        )}

        {/* Customers Table with TanStack Table */}
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Search customers..."
          onRowClick={handleRowClick}
        />
      </Stack>
    </PageLayout>
  )
}
