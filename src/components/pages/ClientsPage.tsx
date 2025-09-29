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
  Paper,
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
} from "@tabler/icons-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { showNotification } from '../../utils/notifications'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'
// import Breadcrumbs from "../navigation/Breadcrumbs"

// Customer type definition
interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  projects: number
  revenue: string
  lastContact: string
  avatar: string
  camInvId?: string // CamInv Endpoint ID (e.g., KHUID00001234)
  camInvStatus: 'registered' | 'not_registered' | 'pending' | 'unknown'
  companyNameEn?: string
  companyNameKh?: string
  tin?: string // Tax Identification Number
}

// Mock data for demonstration
const clientStats = [
  {
    title: "Total Customers",
    value: "156",
    icon: IconPlus,
    color: "blue",
    change: "+12",
  },
  {
    title: "Active Projects",
    value: "89",
    icon: IconPlus,
    color: "green",
    change: "+5",
  },
  {
    title: "New This Month",
    value: "23",
    icon: IconPlus,
    color: "orange",
    change: "+8",
  },
  {
    title: "Total Revenue",
    value: "$125K",
    icon: IconPlus,
    color: "purple",
    change: "+15%",
  },
]

const clients: Customer[] = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1 (555) 123-4567",
    status: "Active",
    projects: 5,
    revenue: "$12,500",
    lastContact: "2024-01-15",
    avatar: "AC",
    camInvId: "KHUID00001234",
    camInvStatus: "registered",
    companyNameEn: "Acme Corporation Ltd",
    companyNameKh: "អេកមី កម្ពុយទ័រ",
    tin: "K001-901234567",
  },
  {
    id: "2",
    name: "Tech Solutions Inc",
    email: "info@techsolutions.com",
    phone: "+1 (555) 987-6543",
    status: "Active",
    projects: 3,
    revenue: "$8,900",
    lastContact: "2024-01-14",
    avatar: "TS",
    camInvId: "KHUID00005678",
    camInvStatus: "registered",
    companyNameEn: "Tech Solutions Inc",
    companyNameKh: "តេក សូលុយសិន",
    tin: "K001-905678901",
  },
  {
    id: "3",
    name: "Design Studio Pro",
    email: "hello@designstudio.com",
    phone: "+1 (555) 456-7890",
    status: "Inactive",
    projects: 1,
    revenue: "$3,200",
    lastContact: "2024-01-10",
    avatar: "DS",
    camInvStatus: "not_registered",
  },
  {
    id: "4",
    name: "Marketing Plus LLC",
    email: "team@marketingplus.com",
    phone: "+1 (555) 321-0987",
    status: "Active",
    projects: 7,
    revenue: "$18,750",
    lastContact: "2024-01-16",
    avatar: "MP",
    camInvStatus: "pending",
  },
  {
    id: "5",
    name: "Global Enterprises",
    email: "contact@global.com",
    phone: "+1 (555) 654-3210",
    status: "Pending",
    projects: 0,
    revenue: "$0",
    lastContact: "2024-01-12",
    avatar: "GE",
    camInvStatus: "unknown",
  },
]

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
    accessorKey: 'projects',
    header: 'Projects',
    cell: ({ row }) => (
      <Text fw={500}>{row.original.projects}</Text>
    ),
  },
  {
    accessorKey: 'revenue',
    header: 'Revenue',
    cell: ({ row }) => (
      <Text fw={500}>{row.original.revenue}</Text>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const router = useRouter()
      return (
        <Group gap="xs">
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
          <ActionIcon
            variant="subtle"
            size="sm"
            color="red"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement delete functionality
              console.log('Delete customer:', row.original.id)
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
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

  const stickyContent = (
    <Flex wrap="wrap" gap="md">
      {clientStats.map((stat, index) => (
        <Box key={index} style={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <Box>
                <Text c="dimmed" size="sm" fw={500}>
                  {stat.title}
                </Text>
                <Text fw={700} size="xl">
                  {stat.value}
                </Text>
                <Text c="green" size="sm">
                  {stat.change} from last month
                </Text>
              </Box>
              <ActionIcon
                size="xl"
                radius="md"
                variant="light"
                color={stat.color}
              >
                <stat.icon size={24} />
              </ActionIcon>
            </Group>
          </Card>
        </Box>
      ))}
    </Flex>
  )

  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Small, cheap request just to ensure API is reachable; real data wiring can replace this
        await fetch('/api/customers?take=1', { credentials: 'include' })
      } catch (e) {
        // ignore errors; we still proceed to render with mock data
      } finally {
        if (mounted) setPageLoading(false)
      }
    })()
    return () => { mounted = false }
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
      showBackButton={false}
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

      {/* Customers Table with TanStack Table */}
      <DataTable
        columns={columns}
        data={clients}
        searchPlaceholder="Search customers..."
        onRowClick={handleRowClick}
      />
    </PageLayout>
  )
}
