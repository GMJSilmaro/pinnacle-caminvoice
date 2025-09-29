'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Table,
  Badge,
  ActionIcon,
  Avatar,
  TextInput,
  Select,
  Modal,
  Grid,
  Alert,
  Switch,
  PasswordInput,
  MultiSelect,
} from '@mantine/core'
import {
  IconUsers,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconSearch,
  IconFilter,
  IconMail,
  IconShield,
  IconInfoCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import PageLayout from '../layouts/PageLayout'
import PageSkeleton from '../skeletons/PageSkeleton'

// User interface
interface User {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
  tenantId: string | null
  tenantName: string
  lastLogin: string | null
  createdAt: string
  updatedAt?: string
  permissions: string[]
  phone?: string | null
  department?: string | null
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  regularUsers: number
}

const roleOptions = [
  { value: 'tenant_admin', label: 'Administrator', description: 'Full access to company features' },
  { value: 'tenant_user', label: 'User', description: 'Standard user access' },
]

const permissionOptions = [
  { value: 'CREATE_INVOICE', label: 'Create Invoices' },
  { value: 'EDIT_INVOICE', label: 'Edit Invoices' },
  { value: 'DELETE_INVOICE', label: 'Delete Invoices' },
  { value: 'MANAGE_CUSTOMERS', label: 'Manage Customers' },
  { value: 'VIEW_REPORTS', label: 'View Reports' },
  { value: 'MANAGE_USERS', label: 'Manage Users' },
]

const departmentOptions = [
  { value: 'Management', label: 'Management' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' },
  { value: 'IT', label: 'IT' },
]

function getRoleColor(role: string) {
  switch (role) {
    case 'tenant_admin': return 'red'
    case 'tenant_user': return 'blue'
    case 'provider': return 'purple'
    default: return 'gray'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'green'
    case 'inactive': return 'red'
    case 'suspended': return 'orange'
    default: return 'gray'
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, activeUsers: 0, adminUsers: 0, regularUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsers(data.users)
          setStats(data.stats)
        }
      } else {
        notifications.show({
          title: 'Error',
          message: 'Failed to load users',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load users',
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setLoading(false)
    }
  }

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    const matchesStatus = !statusFilter || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    openEditModal()
  }

  const handleCreateUser = async (userData: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          notifications.show({
            title: 'Success',
            message: 'User created successfully',
            color: 'green',
            icon: <IconCheck size={16} />,
          })
          fetchUsers() // Refresh the list
          closeAddModal()
        }
      } else {
        const errorData = await response.json()
        notifications.show({
          title: 'Error',
          message: errorData.error || 'Failed to create user',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to create user',
        color: 'red',
        icon: <IconX size={16} />,
      })
    }
  }

  if (loading) {
    return (
      <PageLayout
        title="User Management"
        subtitle="Manage employee accounts and permissions for your organization"
        showBackButton={false}
        actions={
          <Button leftSection={<IconPlus size={16} />} disabled>
            Add User
          </Button>
        }
      >
        <PageSkeleton withStats withFilters tableColumns={6} tableRows={8} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="User Management"
      subtitle="Manage employee accounts and permissions for your organization"
      showBackButton={false}
      actions={
        <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
          Add User
        </Button>
      }
    >

        {/* Stats Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Total Users</Text>
                  <Text size="xl" fw={700}>{stats.totalUsers}</Text>
                </div>
                <IconUsers size={24} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Active Users</Text>
                  <Text size="xl" fw={700} c="green">{stats.activeUsers}</Text>
                </div>
                <IconShield size={24} color="var(--mantine-color-green-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Administrators</Text>
                  <Text size="xl" fw={700} c="red">{stats.adminUsers}</Text>
                </div>
                <IconShield size={24} color="var(--mantine-color-red-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Regular Users</Text>
                  <Text size="xl" fw={700} c="blue">{stats.regularUsers}</Text>
                </div>
                <IconUsers size={24} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Filters and Actions */}
        <Card withBorder>
          <Group justify="space-between">
            <Group>
              <TextInput
                placeholder="Search users..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ minWidth: 300 }}
              />
              <Select
                placeholder="Filter by role"
                leftSection={<IconFilter size={16} />}
                data={roleOptions.map(r => ({ value: r.value, label: r.label }))}
                value={roleFilter}
                onChange={setRoleFilter}
                clearable
                style={{ minWidth: 150 }}
              />
              <Select
                placeholder="Filter by status"
                leftSection={<IconFilter size={16} />}
                data={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                style={{ minWidth: 150 }}
              />
            </Group>

          </Group>
        </Card>

        {/* Users Table */}
        <Card withBorder style={{ position: 'relative' }}>
          {/* content */}
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Team Members</Title>
              <Text size="sm" c="dimmed">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </Text>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Contact</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last Login</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar size="sm" radius="xl">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </Avatar>
                        <div>
                          <Text fw={500}>{user.name}</Text>
                          <Text size="sm" c="dimmed">{user.email}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Group gap="xs">
                          <IconMail size={14} />
                          <Text size="sm">{user.email}</Text>
                        </Group>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getRoleColor(user.role)} variant="light">
                        {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.tenantName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(user.status)} variant="light">
                        {user.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
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
          </Stack>
        </Card>

        {/* Add User Modal */}
        <Modal
          opened={addModalOpened}
          onClose={closeAddModal}
          title="Add New User"
          size="lg"
        >
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Full Name"
                  placeholder="John Doe"
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Email"
                  placeholder="john.doe@company.com"
                  type="email"
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Phone"
                  placeholder="+855 12 345 678"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Department"
                  data={departmentOptions}
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Role"
                  data={roleOptions.map(r => ({ 
                    value: r.value, 
                    label: r.label,
                    description: r.description 
                  }))}
                  required
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Active Status"
                  description="User can log in and access the system"
                  defaultChecked
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <MultiSelect
                  label="Permissions"
                  description="Select specific permissions for this user"
                  data={permissionOptions}
                  placeholder="Select permissions"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <PasswordInput
                  label="Temporary Password"
                  description="User will be required to change this on first login"
                  placeholder="Enter temporary password"
                  required
                />
              </Grid.Col>
            </Grid>

            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
              The user will receive an email invitation with login instructions and will be required to change their password on first login.
            </Alert>

            <Group justify="flex-end">
              <Button variant="default" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button onClick={closeAddModal}>
                Create User
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          opened={editModalOpened}
          onClose={closeEditModal}
          title={selectedUser ? `Edit User - ${selectedUser.name}` : 'Edit User'}
          size="lg"
        >
          {selectedUser && (
            <Stack gap="md">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Full Name"
                    defaultValue={selectedUser.name}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Email"
                    defaultValue={selectedUser.email}
                    type="email"
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Phone"
                    defaultValue={selectedUser.phone || ''}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Department"
                    data={departmentOptions}
                    defaultValue={selectedUser.department || ''}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Role"
                    data={roleOptions.map(r => ({ 
                      value: r.value, 
                      label: r.label,
                      description: r.description 
                    }))}
                    defaultValue={selectedUser.role}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Switch
                    label="Active Status"
                    description="User can log in and access the system"
                    defaultChecked={selectedUser.status === 'ACTIVE'}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <MultiSelect
                    label="Permissions"
                    description="Select specific permissions for this user"
                    data={permissionOptions}
                    defaultValue={selectedUser.permissions}
                  />
                </Grid.Col>
              </Grid>

              <Group justify="space-between">
                <Button variant="outline" color="red">
                  Reset Password
                </Button>
                <Group>
                  <Button variant="default" onClick={closeEditModal}>
                    Cancel
                  </Button>
                  <Button onClick={closeEditModal}>
                    Save Changes
                  </Button>
                </Group>
              </Group>
            </Stack>
          )}
        </Modal>
    </PageLayout>
  )
}
