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
  Modal,
  Drawer,
  Select,
  TextInput,
} from "@mantine/core";
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
  IconClock,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import PageLayout from "../layouts/PageLayout";
import PageSkeleton from "../skeletons/PageSkeleton";
import { DataTable } from "../tables/DataTable";
import StatsCard from "../ui/StatsCard";
import { useEffect, useState } from "react";
import { showNotification } from "../../utils/notifications";

// Audit log interface for TypeScript
interface AuditLog {
  id: string
  timestamp: string
  user: string
  userId: string | null
  action: string
  actionType: string
  resource: string
  entityId: string | null
  ip: string
  status: string
  details: string
  type: string
  avatar: string
  userAgent?: string
  duration?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: any
}

interface AuditStatistic {
  value: number
  todayChange: number
}

interface AuditStatistics {
  totalEvents: AuditStatistic
  userActions: AuditStatistic
  systemEvents: AuditStatistic
  securityEvents: AuditStatistic
  failedActions: AuditStatistic
  apiCalls: AuditStatistic
}

interface RecentActivity {
  time: string
  action: string
  user: string
  actionType: string
}

interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  statistics: AuditStatistics
  recentActivity: RecentActivity[]
}

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

// Helper function to get icon for action type
function getIconForActionType(actionType: string) {
  switch (actionType) {
    case 'CREATE':
      return IconFileText
    case 'UPDATE':
      return IconEdit
    case 'DELETE':
      return IconTrash
    case 'LOGIN':
    case 'LOGOUT':
      return IconLogin
    case 'CONFIGURE_PROVIDER':
    case 'CREATE_TENANT':
    case 'SUSPEND_TENANT':
    case 'ACTIVATE_TENANT':
      return IconShield
    default:
      return IconSettings
  }
}

// Helper function to get color for action type
function getColorForActionType(actionType: string): string {
  switch (actionType) {
    case 'CREATE':
      return 'blue'
    case 'UPDATE':
      return 'orange'
    case 'DELETE':
      return 'red'
    case 'LOGIN':
    case 'LOGOUT':
      return 'green'
    case 'CONFIGURE_PROVIDER':
    case 'CREATE_TENANT':
    case 'SUSPEND_TENANT':
    case 'ACTIVATE_TENANT':
      return 'purple'
    default:
      return 'gray'
  }
}

export default function AuditLogsPage() {
  const [pageLoading, setPageLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  const fetchAuditLogs = async (appliedFilters?: typeof filters) => {
    try {
      const filterParams = appliedFilters || filters
      const params = new URLSearchParams()
      
      if (filterParams.action) params.append('action', filterParams.action)
      if (filterParams.entityType) params.append('entityType', filterParams.entityType)
      if (filterParams.startDate) params.append('startDate', filterParams.startDate)
      if (filterParams.endDate) params.append('endDate', filterParams.endDate)

      const response = await fetch(`/api/audit-logs?${params.toString()}`, { 
        credentials: 'include' 
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data: AuditLogsResponse = await response.json()
      setAuditLogs(data.logs)
      setStatistics(data.statistics)
      setRecentActivity(data.recentActivity)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      showNotification.error('Failed to fetch audit logs')
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const applyFilters = () => {
    setPageLoading(true)
    fetchAuditLogs(filters)
    setFilterDrawerOpen(false)
    showNotification.info('Audit logs filtered successfully', 'Filters Applied')
  }

  const clearFilters = () => {
    const emptyFilters = {
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    }
    setFilters(emptyFilters)
    setPageLoading(true)
    fetchAuditLogs(emptyFilters)
    setFilterDrawerOpen(false)
    showNotification.info('All filters have been removed', 'Filters Cleared')
  }

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailsModalOpen(true)
  }

  const handleExport = async () => {
    try {
      showNotification.info('Preparing audit logs export', 'Exporting...')

      const response = await fetch('/api/audit-logs', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      const data: AuditLogsResponse = await response.json()
      
      // Convert to CSV
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status', 'Details']
      const csvRows = [
        headers.join(','),
        ...data.logs.map(log => [
          log.timestamp,
          log.user,
          log.action,
          log.resource,
          log.ip,
          log.status,
          `"${log.details.replace(/"/g, '""')}"` // Escape quotes in details
        ].join(','))
      ]
      
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showNotification.success('Audit logs exported successfully')
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      showNotification.error('Failed to export audit logs')
    }
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

  const auditStats = statistics ? [
    {
      title: "Total Events",
      value: statistics.totalEvents.value.toLocaleString(),
      icon: IconFileText,
      color: "blue",
      change: `+${statistics.totalEvents.todayChange} today`,
      description: "All system activities",
    },
    {
      title: "User Actions",
      value: statistics.userActions.value.toLocaleString(),
      icon: IconUser,
      color: "green",
      change: `+${statistics.userActions.todayChange} today`,
      description: "User-initiated activities",
    },
    {
      title: "System Events",
      value: statistics.systemEvents.value.toLocaleString(),
      icon: IconSettings,
      color: "orange",
      change: `+${statistics.systemEvents.todayChange} today`,
      description: "Automated system processes",
    },
    {
      title: "Security Events",
      value: statistics.securityEvents.value.toLocaleString(),
      icon: IconShield,
      color: "red",
      change: `+${statistics.securityEvents.todayChange} today`,
      description: "Security-related activities",
    },
    {
      title: "Failed Actions",
      value: statistics.failedActions.value.toLocaleString(),
      icon: IconTrash,
      color: "red",
      change: `+${statistics.failedActions.todayChange} today`,
      description: "Failed operations",
    },
    {
      title: "API Calls",
      value: statistics.apiCalls.value.toLocaleString(),
      icon: IconFileText,
      color: "violet",
      change: `+${statistics.apiCalls.todayChange} today`,
      description: "External API interactions",
    },
  ] : []

  const stickyContent = statistics ? (
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
  ) : null

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
    <>
      {/* Filter Drawer */}
      <Drawer
        opened={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Filter Audit Logs"
        position="right"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Action Type"
            placeholder="Select action type"
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value || '' })}
            data={[
              { value: '', label: 'All Actions' },
              { value: 'CREATE', label: 'Create' },
              { value: 'UPDATE', label: 'Update' },
              { value: 'DELETE', label: 'Delete' },
              { value: 'LOGIN', label: 'Login' },
              { value: 'LOGOUT', label: 'Logout' },
              { value: 'SUBMIT_INVOICE', label: 'Submit Invoice' },
              { value: 'APPROVE_INVOICE', label: 'Approve Invoice' },
              { value: 'REJECT_INVOICE', label: 'Reject Invoice' },
              { value: 'CONFIGURE_PROVIDER', label: 'Configure Provider' },
              { value: 'CREATE_TENANT', label: 'Create Tenant' },
              { value: 'SUSPEND_TENANT', label: 'Suspend Tenant' },
              { value: 'ACTIVATE_TENANT', label: 'Activate Tenant' },
              { value: 'WEBHOOK_RECEIVED', label: 'Webhook Received' },
              { value: 'SYNC_INVOICES', label: 'Sync Invoices' },
            ]}
            clearable
          />

          <TextInput
            label="Entity Type"
            placeholder="e.g., Invoice, User, Customer"
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.currentTarget.value })}
          />

          <TextInput
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.currentTarget.value })}
          />

          <TextInput
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.currentTarget.value })}
          />

          <Group justify="space-between" mt="md">
            <Button variant="subtle" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </Group>
        </Stack>
      </Drawer>

      {/* Details Modal */}
      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <Stack gap="md">
            <Group>
              <Avatar size="lg" radius="xl" color={selectedLog.user === 'System' ? 'blue' : 'gray'}>
                {selectedLog.avatar}
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text size="lg" fw={600}>{selectedLog.user}</Text>
                <Text size="sm" c="dimmed">{selectedLog.ip}</Text>
              </Box>
              <Badge color={getStatusColor(selectedLog.status)} variant="light">
                {selectedLog.status}
              </Badge>
            </Group>

            <Box>
              <Text size="sm" c="dimmed" mb={4}>Action</Text>
              <Group gap="xs">
                <Badge color={getTypeColor(selectedLog.type)} variant="light">
                  {selectedLog.type}
                </Badge>
                <Badge color={getSeverityColor(selectedLog.severity)} variant="dot">
                  {selectedLog.severity}
                </Badge>
                <Text size="sm" fw={500}>{selectedLog.action}</Text>
              </Group>
            </Box>

            <Box>
              <Text size="sm" c="dimmed" mb={4}>Resource</Text>
              <Text size="sm">{selectedLog.resource}</Text>
              {selectedLog.entityId && (
                <Text size="xs" c="dimmed">ID: {selectedLog.entityId}</Text>
              )}
            </Box>

            <Box>
              <Text size="sm" c="dimmed" mb={4}>Description</Text>
              <Text size="sm">{selectedLog.details}</Text>
            </Box>

            <Box>
              <Text size="sm" c="dimmed" mb={4}>Timestamp</Text>
              <Text size="sm">
                {new Date(selectedLog.timestamp).toLocaleString()}
              </Text>
            </Box>

            {selectedLog.userAgent && (
              <Box>
                <Text size="sm" c="dimmed" mb={4}>User Agent</Text>
                <Text size="xs" style={{ wordBreak: 'break-all' }}>
                  {selectedLog.userAgent}
                </Text>
              </Box>
            )}

            {selectedLog.metadata && (
              <Box>
                <Text size="sm" c="dimmed" mb={4}>Metadata</Text>
                <Paper p="sm" bg="gray.0" style={{ overflowX: 'auto' }}>
                  <Text size="xs" component="pre" style={{ margin: 0 }}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </Text>
                </Paper>
              </Box>
            )}
          </Stack>
        )}
      </Modal>

      <PageLayout
        title="Audit Logs"
        subtitle="Monitor system activities and user actions"
        showBackButton={false}
        stickyContent={stickyContent}
        actions={
          <Group>
            <Button 
              leftSection={<IconFilter size={16} />} 
              variant="light"
              onClick={() => setFilterDrawerOpen(true)}
            >
              Filter
            </Button>
            <Button leftSection={<IconDownload size={16} />} onClick={handleExport}>
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
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => {
                  const ActivityIcon = getIconForActionType(activity.actionType)
                  const color = getColorForActionType(activity.actionType)
                  return (
                    <Card key={index} padding="sm" radius="md" withBorder>
                      <Group gap="sm" align="flex-start">
                        <ActionIcon
                          size="sm"
                          radius="xl"
                          variant="light"
                          color={color}
                        >
                          <ActivityIcon size={12} />
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
                  )
                })
              ) : (
                <Text c="dimmed" size="sm" ta="center">
                  No recent activity
                </Text>
              )}
            </Stack>
          </Paper>
        </Box>
      </Flex>
      </PageLayout>
    </>
  )
}
