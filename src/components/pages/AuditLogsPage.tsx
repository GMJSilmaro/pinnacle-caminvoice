'use client'

import {
  Box,
  Button,
  Card,
  Flex,
  Stack,
  Group,
  Text,
  Title,
  Badge,
  Avatar,
  ActionIcon,
  Paper,
  Menu,
  Grid,
} from "@mantine/core"
import {
  IconDownload,
  IconEye,
  IconUser,
  IconFileText,
  IconSettings,
  IconTrash,
  IconEdit,
  IconFilter,
  IconLogin,
  IconShield,
  IconDots,
} from "@tabler/icons-react"
import { type ColumnDef } from '@tanstack/react-table'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'
import StatsCard from '../ui/StatsCard'
// import Breadcrumbs from "../navigation/Breadcrumbs"

// Audit log interface for TypeScript
interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  ip: string
  status: string
  details: string
  type: string
  avatar: string
  userAgent?: string
  duration?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Mock data for demonstration
const auditStats = [
  {
    title: "Total Events",
    value: "2,847",
    icon: IconFileText,
    color: "blue",
    change: "+156 today",
    description: "All system activities",
  },
  {
    title: "User Actions",
    value: "1,923",
    icon: IconUser,
    color: "green",
    change: "+89 today",
    description: "User-initiated activities",
  },
  {
    title: "System Events",
    value: "924",
    icon: IconSettings,
    color: "orange",
    change: "+67 today",
    description: "Automated system processes",
  },
  {
    title: "Security Events",
    value: "45",
    icon: IconShield,
    color: "red",
    change: "+12 today",
    description: "Security-related activities",
  },
  {
    title: "Failed Actions",
    value: "23",
    icon: IconTrash,
    color: "red",
    change: "+3 today",
    description: "Failed operations",
  },
  {
    title: "API Calls",
    value: "1,456",
    icon: IconFileText,
    color: "violet",
    change: "+234 today",
    description: "External API interactions",
  },
]

const auditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-01-16 14:30:25",
    user: "John Doe",
    action: "Invoice Created",
    resource: "INV-2024-001",
    ip: "192.168.1.100",
    status: "Success",
    details: "Created invoice for Acme Corp worth $2,500.00",
    type: "CREATE",
    avatar: "JD",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    duration: 1250,
    severity: "low",
  },
  {
    id: "2",
    timestamp: "2024-01-16 14:28:15",
    user: "System",
    action: "CamInvoice Submission",
    resource: "INV-2024-001",
    ip: "127.0.0.1",
    status: "Success",
    details: "Invoice successfully submitted to CamInvoice system",
    type: "INTEGRATION",
    avatar: "SY",
    duration: 3200,
    severity: "medium",
  },
  {
    id: "3",
    timestamp: "2024-01-16 14:25:12",
    user: "Jane Smith",
    action: "User Login",
    resource: "Authentication",
    ip: "192.168.1.101",
    status: "Success",
    details: "Successful login attempt from Chrome browser",
    type: "AUTH",
    avatar: "JS",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    duration: 850,
    severity: "low",
  },
  {
    id: "4",
    timestamp: "2024-01-16 14:22:45",
    user: "Mike Johnson",
    action: "Customer Updated",
    resource: "CUST-001",
    ip: "192.168.1.102",
    status: "Success",
    details: "Updated customer CamInvoice endpoint configuration",
    type: "UPDATE",
    avatar: "MJ",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    duration: 950,
    severity: "low",
  },
  {
    id: "5",
    timestamp: "2024-01-16 14:20:33",
    user: "System",
    action: "Failed Login Attempt",
    resource: "Authentication",
    ip: "203.144.75.22",
    status: "Failed",
    details: "Multiple failed login attempts detected from suspicious IP",
    type: "SECURITY",
    avatar: "SY",
    duration: 0,
    severity: "high",
  },
  {
    id: "6",
    timestamp: "2024-01-16 14:18:10",
    user: "Admin",
    action: "User Role Changed",
    resource: "USER-005",
    ip: "192.168.1.1",
    status: "Success",
    details: "Changed user role from 'User' to 'Admin'",
    type: "PERMISSION",
    avatar: "AD",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    duration: 750,
    severity: "high",
  },
  {
    id: "7",
    timestamp: "2024-01-16 14:15:33",
    user: "System",
    action: "Database Backup",
    resource: "Database",
    ip: "127.0.0.1",
    status: "Success",
    details: "Automated daily database backup completed successfully",
    type: "SYSTEM",
    avatar: "SY",
    duration: 45000,
    severity: "low",
  },
  {
    id: "8",
    timestamp: "2024-01-16 14:12:18",
    user: "Sarah Wilson",
    action: "Credit Note Created",
    resource: "CN-2024-001",
    ip: "192.168.1.105",
    status: "Success",
    details: "Created credit note for returned items worth $150.00",
    type: "CREATE",
    avatar: "SW",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    duration: 1100,
    severity: "low",
  },
  {
    id: "9",
    timestamp: "2024-01-16 14:10:45",
    user: "System",
    action: "CamInvoice Webhook",
    resource: "INV-2024-002",
    ip: "203.176.178.44",
    status: "Success",
    details: "Received invoice acceptance notification from CamInvoice",
    type: "WEBHOOK",
    avatar: "SY",
    duration: 320,
    severity: "medium",
  },
  {
    id: "10",
    timestamp: "2024-01-16 14:08:22",
    user: "Tom Chen",
    action: "Invoice Deleted",
    resource: "INV-2024-003",
    ip: "192.168.1.103",
    status: "Success",
    details: "Deleted draft invoice INV-2024-003",
    type: "DELETE",
    avatar: "TC",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    duration: 650,
    severity: "medium",
  },
  {
    id: "11",
    timestamp: "2024-01-16 14:05:15",
    user: "System",
    action: "API Rate Limit Exceeded",
    resource: "CamInvoice API",
    ip: "127.0.0.1",
    status: "Warning",
    details: "API rate limit exceeded for CamInvoice integration",
    type: "API",
    avatar: "SY",
    duration: 0,
    severity: "medium",
  },
  {
    id: "12",
    timestamp: "2024-01-16 14:02:33",
    user: "Lisa Park",
    action: "Export Data",
    resource: "Invoice Report",
    ip: "192.168.1.104",
    status: "Success",
    details: "Exported monthly invoice report (245 records)",
    type: "EXPORT",
    avatar: "LP",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    duration: 2800,
    severity: "low",
  },
]

const recentActivity = [
  {
    time: "2 minutes ago",
    action: "Invoice INV-001 created",
    user: "John Doe",
    icon: IconFileText,
    color: "blue",
  },
  {
    time: "5 minutes ago",
    action: "User logged in",
    user: "Jane Smith",
    icon: IconLogin,
    color: "green",
  },
  {
    time: "10 minutes ago",
    action: "Client profile updated",
    user: "Mike Johnson",
    icon: IconEdit,
    color: "orange",
  },
  {
    time: "15 minutes ago",
    action: "System backup completed",
    user: "System",
    icon: IconShield,
    color: "purple",
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case "Success":
      return "green"
    case "Failed":
      return "red"
    case "Warning":
      return "yellow"
    default:
      return "gray"
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "CREATE":
      return "blue"
    case "UPDATE":
      return "orange"
    case "DELETE":
      return "red"
    case "AUTH":
      return "green"
    case "SYSTEM":
      return "purple"
    case "CONFIG":
      return "cyan"
    case "INTEGRATION":
      return "teal"
    case "SECURITY":
      return "red"
    case "PERMISSION":
      return "pink"
    case "WEBHOOK":
      return "indigo"
    case "API":
      return "violet"
    case "EXPORT":
      return "lime"
    default:
      return "gray"
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "low":
      return "green"
    case "medium":
      return "yellow"
    case "high":
      return "orange"
    case "critical":
      return "red"
    default:
      return "gray"
  }
}

export default function AuditLogsPage() {
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await fetch('/api/auth/session', { credentials: 'include' })
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setPageLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleRowClick = (log: AuditLog) => {
    // Handle row click - could open a modal with details
    console.log('Audit log clicked:', log)
  }

  // Column definitions for the DataTable
  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {new Date(row.original.timestamp).toLocaleDateString()}
          </Text>
          <Text size="xs" c="dimmed">
            {new Date(row.original.timestamp).toLocaleTimeString()}
          </Text>
        </Stack>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <Group gap="sm">
          <Avatar size="sm" radius="xl" color={row.original.user === 'System' ? 'blue' : 'gray'}>
            {row.original.avatar}
          </Avatar>
          <Stack gap={2}>
            <Text size="sm" fw={500}>{row.original.user}</Text>
            <Text size="xs" c="dimmed">{row.original.ip}</Text>
          </Stack>
        </Group>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Stack gap={4}>
          <Group gap="xs">
            <Badge color={getTypeColor(row.original.type)} variant="light" size="xs">
              {row.original.type}
            </Badge>
            <Badge
              color={getSeverityColor(row.original.severity)}
              variant="dot"
              size="xs"
            >
              {row.original.severity}
            </Badge>
          </Group>
          <Text size="sm" fw={500}>{row.original.action}</Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {row.original.details}
          </Text>
        </Stack>
      ),
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ row }) => (
        <Stack gap={2}>
          <Text size="sm" fw={500}>{row.original.resource}</Text>
          {row.original.duration && (
            <Text size="xs" c="dimmed">
              {row.original.duration}ms
            </Text>
          )}
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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Menu shadow="md" width={250}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEye size={16} />}
              onClick={() => handleRowClick(row.original)}
            >
              View Full Details
            </Menu.Item>
            <Menu.Item
              leftSection={<IconUser size={16} />}
              onClick={() => {/* Handle view user */}}
            >
              View User Activity
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileText size={16} />}
              onClick={() => {/* Handle view resource */}}
            >
              View Resource
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ]

  const stickyContent = (
    <Grid>
      {auditStats.map((stat, index) => (
        <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4, lg: 2 }}>
          <StatsCard
            title={stat.title}
            value={stat.value}
            icon={<stat.icon size={20} />}
            iconColor={stat.color}
            subtitle={stat.description}
            trend={{
              value: stat.change,
              type: stat.change.startsWith("+") ? "up" : "down"
            }}
            size="sm"
          />
        </Grid.Col>
      ))}
    </Grid>
  )

  if (pageLoading) {
    return (
      <PageLayout
        title="Audit Logs"
        subtitle="Monitor system activities and user actions"
        showBackButton={false}
        actions={
          <Group>
            <Button leftSection={<IconFilter size={16} />} variant="light" disabled>
              Filter
            </Button>
            <Button leftSection={<IconDownload size={16} />} disabled>
              Export Logs
            </Button>
          </Group>
        }
      >
        <PageSkeleton withStats tableColumns={5} tableRows={14} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Audit Logs"
      subtitle="Monitor system activities and user actions"
      showBackButton={false}
      stickyContent={stickyContent}
      actions={
        <Group>
          <Button leftSection={<IconFilter size={16} />} variant="light">
            Filter
          </Button>
          <Button leftSection={<IconDownload size={16} />}>
            Export Logs
          </Button>
        </Group>
      }
    >

      <Flex direction={{ base: 'column', lg: 'row' }} gap="md">
        <Box style={{ flex: '1 1 70%' }}>
          {/* Audit Logs Table */}
          <DataTable
            columns={columns}
            data={auditLogs}
            searchPlaceholder="Search audit logs..."
            onRowClick={handleRowClick}
          />
        </Box>

        <Box style={{ flex: '1 1 30%', minWidth: '300px' }}>
          {/* Recent Activity Timeline */}
          <Paper p="lg" radius="md" withBorder>
            <Title order={4} mb="md">Recent Activity</Title>
            <Stack gap="md">
              {recentActivity.map((activity, index) => (
                <Card key={index} padding="sm" radius="md" withBorder>
                  <Group gap="sm" align="flex-start">
                    <ActionIcon
                      size="sm"
                      radius="xl"
                      variant="light"
                      color={activity.color}
                    >
                      <activity.icon size={12} />
                    </ActionIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{activity.action}</Text>
                      <Text c="dimmed" size="sm">
                        by {activity.user}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {activity.time}
                      </Text>
                    </Box>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Flex>
    </PageLayout>
  )
}
