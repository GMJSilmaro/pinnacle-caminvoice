import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  Stack,
  Text,
  Title,
  ActionIcon,
} from "@mantine/core"
import {
  IconPlus,
} from "@tabler/icons-react"
// import Breadcrumbs from "../navigation/Breadcrumbs"

// Mock data for demonstration
const invoiceStats = [
  {
    title: "Total Invoices",
    value: "1,234",
    icon: IconPlus,
    color: "blue",
    change: "+12%",
  },
  {
    title: "Total Revenue",
    value: "$45,678",
    icon: IconPlus,
    color: "green",
    change: "+8%",
  },
  {
    title: "Pending Invoices",
    value: "23",
    icon: IconPlus,
    color: "orange",
    change: "-5%",
  },
  {
    title: "Active Clients",
    value: "156",
    icon: IconPlus,
    color: "purple",
    change: "+3%",
  },
]

const recentInvoices = [
  {
    id: "INV-001",
    client: "Acme Corp",
    amount: "$2,500.00",
    status: "Paid",
    date: "2024-01-15",
    avatar: "AC",
  },
  {
    id: "INV-002",
    client: "Tech Solutions",
    amount: "$1,800.00",
    status: "Pending",
    date: "2024-01-14",
    avatar: "TS",
  },
  {
    id: "INV-003",
    client: "Design Studio",
    amount: "$3,200.00",
    status: "Overdue",
    date: "2024-01-10",
    avatar: "DS",
  },
  {
    id: "INV-004",
    client: "Marketing Plus",
    amount: "$950.00",
    status: "Draft",
    date: "2024-01-12",
    avatar: "MP",
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case "Paid":
      return "green"
    case "Pending":
      return "yellow"
    case "Overdue":
      return "red"
    case "Draft":
      return "gray"
    default:
      return "blue"
  }
}

export default function InvoicesPage() {
  return (
    <Stack gap="xl">
      {/* <Breadcrumbs /> */}
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Title order={2}>Invoices</Title>
          <Text c="dimmed" size="sm">
            Manage your invoices and track payments
          </Text>
        </Box>
        <Group>
          <Button variant="light">
            Export
          </Button>
          <Button>
            Create Invoice
          </Button>
        </Group>
      </Flex>

      {/* Stats Cards */}
      <Flex wrap="wrap" gap="md">
        {invoiceStats.map((stat, index) => (
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
                  <Text c={stat.change.startsWith("+") ? "green" : "red"} size="sm">
                    {stat.change} from last month
                  </Text>
                </Box>
                <ActionIcon
                  size="xl"
                  radius="md"
                  variant="light"
                  color={stat.color}
                >
                  <IconPlus size={24} />
                </ActionIcon>
              </Group>
            </Card>
          </Box>
        ))}
      </Flex>

      {/* Recent Invoices Table */}
      {/* <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Recent Invoices</Title>
          <Button variant="light" size="sm">
            View All
          </Button>
        </Group>
        
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentInvoices.map((invoice) => (
              <Table.Tr key={invoice.id}>
                <Table.Td>
                  <Text fw={500}>{invoice.id}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Avatar size="sm" radius="xl">
                      {invoice.avatar}
                    </Avatar>
                    <Text>{invoice.client}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{invoice.amount}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(invoice.status)} variant="light">
                    {invoice.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text c="dimmed">{invoice.date}</Text>
                </Table.Td>
                <Table.Td>
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
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card> */}

      {/* Quick Actions
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="md" withBorder>
            <Title order={4} mb="md">Payment Status</Title>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm">Paid Invoices</Text>
                <Text size="sm" fw={500}>78%</Text>
              </Group>
              <Progress value={78} color="green" />
              
              <Group justify="space-between">
                <Text size="sm">Pending Invoices</Text>
                <Text size="sm" fw={500}>15%</Text>
              </Group>
              <Progress value={15} color="yellow" />
              
              <Group justify="space-between">
                <Text size="sm">Overdue Invoices</Text>
                <Text size="sm" fw={500}>7%</Text>
              </Group>
              <Progress value={7} color="red" />
            </Stack>
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="lg" radius="md" withBorder>
            <Title order={4} mb="md">Quick Actions</Title>
            <Stack gap="sm">
              <Button fullWidth variant="light" leftSection={<IconPlus size={16} />}>
                Create New Invoice
              </Button>
              <Button fullWidth variant="light" leftSection={<IconDownload size={16} />}>
                Download Reports
              </Button>
              <Button fullWidth variant="light" leftSection={<IconPlus size={16} />}>
                Manage Clients
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid> */}
    </Stack>
  )
}
