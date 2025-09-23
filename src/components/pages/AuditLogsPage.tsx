import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Avatar,
  TextInput,
  Select,
  ActionIcon,
  Paper,
} from "@mantine/core"
import {
  IconSearch,
  IconDownload,
  IconFilter,
  IconEye,
  IconUser,
  IconFileText,
  IconSettings,
  IconTrash,
  IconEdit,
  IconLogin,
  IconLogout,
  IconShield,
} from "@tabler/icons-react"
// import Breadcrumbs from "../navigation/Breadcrumbs"

// Mock data for demonstration
const auditStats = [
  {
    title: "Total Events",
    value: "2,847",
    icon: IconFileText,
    color: "blue",
    change: "+156",
  },
  {
    title: "User Actions",
    value: "1,923",
    icon: IconUser,
    color: "green",
    change: "+89",
  },
  {
    title: "System Events",
    value: "924",
    icon: IconSettings,
    color: "orange",
    change: "+67",
  },
  {
    title: "Security Events",
    value: "45",
    icon: IconShield,
    color: "red",
    change: "+12",
  },
]

const auditLogs = [
  {
    id: "1",
    timestamp: "2024-01-16 14:30:25",
    user: "John Doe",
    action: "Invoice Created",
    resource: "INV-001",
    ip: "192.168.1.100",
    status: "Success",
    details: "Created invoice for Acme Corp",
    type: "CREATE",
    avatar: "JD",
  },
  {
    id: "2",
    timestamp: "2024-01-16 14:25:12",
    user: "Jane Smith",
    action: "User Login",
    resource: "Authentication",
    ip: "192.168.1.101",
    status: "Success",
    details: "Successful login attempt",
    type: "AUTH",
    avatar: "JS",
  },
  {
    id: "3",
    timestamp: "2024-01-16 14:20:45",
    user: "Mike Johnson",
    action: "Client Updated",
    resource: "CLIENT-123",
    ip: "192.168.1.102",
    status: "Success",
    details: "Updated client information",
    type: "UPDATE",
    avatar: "MJ",
  },
  {
    id: "4",
    timestamp: "2024-01-16 14:15:33",
    user: "System",
    action: "Backup Created",
    resource: "Database",
    ip: "127.0.0.1",
    status: "Success",
    details: "Automated database backup",
    type: "SYSTEM",
    avatar: "SY",
  },
  {
    id: "5",
    timestamp: "2024-01-16 14:10:18",
    user: "Admin",
    action: "Settings Changed",
    resource: "System Config",
    ip: "192.168.1.1",
    status: "Success",
    details: "Updated system configuration",
    type: "CONFIG",
    avatar: "AD",
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
    default:
      return "gray"
  }
}

export default function AuditLogsPage() {
  return (
    <Stack gap="xl">
      {/* <Breadcrumbs /> */}
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Title order={2}>Audit Logs</Title>
          <Text c="dimmed" size="sm">
            Monitor system activities and user actions
          </Text>
        </Box>
        <Group>
          <Button leftSection={<IconFilter size={16} />} variant="light">
            Filter
          </Button>
          <Button leftSection={<IconDownload size={16} />}>
            Export Logs
          </Button>
        </Group>
      </Flex>

      {/* Stats Cards */}
      <Flex wrap="wrap" gap="md">
        {auditStats.map((stat, index) => (
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
                    {stat.change} today
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

      <Flex direction={{ base: 'column', lg: 'row' }} gap="md">
        <Box style={{ flex: '1 1 70%' }}>
          {/* Search and Filters */}
          <Card padding="lg" radius="md" withBorder mb="md">
            <Flex wrap="wrap" gap="md">
              <Box style={{ flex: '1 1 300px', minWidth: '200px' }}>
                <TextInput
                  placeholder="Search logs..."
                  leftSection={<IconSearch size={16} />}
                />
              </Box>
              <Box style={{ flex: '1 1 150px', minWidth: '150px' }}>
                <Select
                  placeholder="Action Type"
                  data={[
                    { value: "all", label: "All Types" },
                    { value: "create", label: "Create" },
                    { value: "update", label: "Update" },
                    { value: "delete", label: "Delete" },
                    { value: "auth", label: "Authentication" },
                    { value: "system", label: "System" },
                  ]}
                />
              </Box>
              <Box style={{ flex: '1 1 150px', minWidth: '150px' }}>
                <Select
                  placeholder="Status"
                  data={[
                    { value: "all", label: "All Status" },
                    { value: "success", label: "Success" },
                    { value: "failed", label: "Failed" },
                    { value: "warning", label: "Warning" },
                  ]}
                />
              </Box>
              <Box style={{ flex: '1 1 150px', minWidth: '150px' }}>
                <Select
                  placeholder="Time Range"
                  data={[
                    { value: "today", label: "Today" },
                    { value: "week", label: "This Week" },
                    { value: "month", label: "This Month" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
              </Box>
            </Flex>
          </Card>

          {/* Audit Logs Table */}
          <Card padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Audit Logs</Title>
              <Text c="dimmed" size="sm">
                {auditLogs.length} events found
              </Text>
            </Group>
            
            <Stack gap="md">
              {/* Table Header */}
              <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                <Text fw={600} size="sm">Timestamp</Text>
                <Text fw={600} size="sm">User</Text>
                <Text fw={600} size="sm">Action</Text>
                <Text fw={600} size="sm">Status</Text>
                <Text fw={600} size="sm">Actions</Text>
              </Group>

              {/* Table Rows */}
              {auditLogs.map((log) => (
                <Card key={log.id} padding="md" radius="md" withBorder>
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">{log.timestamp}</Text>

                    <Group gap="sm">
                      <Avatar size="sm" radius="xl">
                        {log.avatar}
                      </Avatar>
                      <Text size="sm">{log.user}</Text>
                    </Group>

                    <Group gap="xs">
                      <Badge color={getTypeColor(log.type)} variant="light" size="xs">
                        {log.type}
                      </Badge>
                      <Text size="sm">{log.action}</Text>
                    </Group>

                    <Badge color={getStatusColor(log.status)} variant="light">
                      {log.status}
                    </Badge>

                    <ActionIcon variant="subtle" size="sm">
                      <IconEye size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Card>
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
    </Stack>
  )
}
