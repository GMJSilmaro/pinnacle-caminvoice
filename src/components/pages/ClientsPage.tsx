import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Badge,
  ActionIcon,
  Table,
  Avatar,
  TextInput,
  Select,
} from "@mantine/core"
import {
  IconPlus,
  IconSearch,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconFilter
} from "@tabler/icons-react"
// import Breadcrumbs from "../navigation/Breadcrumbs"

// Mock data for demonstration
const clientStats = [
  {
    title: "Total Clients",
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

const clients = [
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

export default function ClientsPage() {
  return (
    <Stack gap="xl">
      {/* <Breadcrumbs /> */}
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Title order={2}>Clients</Title>
          <Text c="dimmed" size="sm">
            Manage your client relationships and contacts
          </Text>
        </Box>
        <Group>
          <Button leftSection={<IconFilter size={16} />} variant="light">
            Filter
          </Button>
          <Button leftSection={<IconPlus size={16} />}>
            Add Client
          </Button>
        </Group>
      </Flex>

      {/* Stats Cards */}
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

      {/* Search and Filters */}
      <Card padding="lg" radius="md" withBorder>
        <Flex wrap="wrap" gap="md">
          <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <TextInput
              placeholder="Search clients..."
              leftSection={<IconSearch size={16} />}
            />
          </Box>
          <Box style={{ flex: '1 1 150px', minWidth: '150px' }}>
            <Select
              placeholder="Status"
              data={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "pending", label: "Pending" },
              ]}
            />
          </Box>
          <Box style={{ flex: '1 1 150px', minWidth: '150px' }}>
            <Select
              placeholder="Sort by"
              data={[
                { value: "name", label: "Name" },
                { value: "revenue", label: "Revenue" },
                { value: "projects", label: "Projects" },
                { value: "lastContact", label: "Last Contact" },
              ]}
            />
          </Box>
        </Flex>
      </Card>

      {/* Clients Table */}
      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>All Clients</Title>
          <Text c="dimmed" size="sm">
            {clients.length} clients total
          </Text>
        </Group>
        
        <Stack gap="md">
          {/* Table Header */}
          <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
            <Text fw={600} size="sm">Client</Text>
            <Text fw={600} size="sm">Contact</Text>
            <Text fw={600} size="sm">Status</Text>
            <Text fw={600} size="sm">Projects</Text>
            <Text fw={600} size="sm">Revenue</Text>
            <Text fw={600} size="sm">Actions</Text>
          </Group>

          {/* Table Rows */}
          {clients.map((client) => (
            <Card key={client.id} padding="md" radius="md" withBorder>
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <Avatar size="sm" radius="xl">
                    {client.avatar}
                  </Avatar>
                  <Box>
                    <Text fw={500}>{client.name}</Text>
                    <Text size="xs" c="dimmed">ID: {client.id}</Text>
                  </Box>
                </Group>

                <Stack gap={2}>
                  <Group gap="xs">
                    <IconMail size={12} />
                    <Text size="sm">{client.email}</Text>
                  </Group>
                  <Group gap="xs">
                    <IconPhone size={12} />
                    <Text size="sm">{client.phone}</Text>
                  </Group>
                </Stack>

                <Badge color={getStatusColor(client.status)} variant="light">
                  {client.status}
                </Badge>

                <Text fw={500}>{client.projects}</Text>
                <Text fw={500}>{client.revenue}</Text>

                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm">
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" size="sm">
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" size="sm" color="red">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Card>
    </Stack>
  )
}
