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
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../../hooks/useAuth'
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
  { value: 'TENANT_ADMIN', label: 'Administrator', description: 'Full access to company features' },
  { value: 'TENANT_USER', label: 'User', description: 'Standard user access' },
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
  switch (role.toLowerCase()) {
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
  const { user: currentUser, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, activeUsers: 0, adminUsers: 0, regularUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)

  // Check if current user can manage users (Tenant Admin or Provider)
  const canManageUsers = currentUser && (currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'PROVIDER')

  // Add User Form
  const addForm = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      role: '',
      status: true,
      permissions: [] as string[],
      password: '',
    },
    validate: {
      firstName: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      role: (value) => (!value ? 'Role is required' : null),
      department: (value) => (!value ? 'Department is required' : null),
      password: (value) => (value.length < 8 ? 'Password must be at least 8 characters' : null),
    },
  })

  // Edit User Form
  const editForm = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      role: '',
      status: true,
      permissions: [] as string[],
    },
    validate: {
      firstName: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      role: (value) => (!value ? 'Role is required' : null),
      department: (value) => (!value ? 'Department is required' : null),
    },
  })

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



  const handleCreateUser = async (values: typeof addForm.values) => {
    try {
      setSubmitting(true)
      const userData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        password: values.password,
        // Optional fields
        ...(values.phone && { phone: values.phone }),
        ...(values.department && { department: values.department }),
      }

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
          addForm.reset()
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    editForm.setValues({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
      role: user.role.toUpperCase(),
      status: user.status.toLowerCase() === 'active',
      permissions: user.permissions || [],
    })
    openEditModal()
  }

  const handleUpdateUser = async (values: typeof editForm.values) => {
    if (!selectedUser) return

    try {
      setSubmitting(true)
      const userData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        status: values.status ? 'ACTIVE' : 'INACTIVE',
        // Optional fields
        ...(values.phone && { phone: values.phone }),
        ...(values.department && { department: values.department }),
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
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
            message: 'User updated successfully',
            color: 'green',
            icon: <IconCheck size={16} />,
          })
          fetchUsers() // Refresh the list
          closeEditModal()
        }
      } else {
        const errorData = await response.json()
        notifications.show({
          title: 'Error',
          message: errorData.error || 'Failed to update user',
          color: 'red',
          icon: <IconX size={16} />,
        })
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to update user',
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading) {
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

  // Show access denied if user doesn't have permission
  if (!canManageUsers) {
    return (
      <PageLayout
        title="User Management"
        subtitle="Manage employee accounts and permissions for your organization"
        showBackButton={false}
      >
        <Alert color="red" icon={<IconInfoCircle size={16} />}>
          <Text fw={500} mb="xs">Access Denied</Text>
          <Text size="sm">
            You do not have permission to manage users. Only tenant administrators can access this feature.
          </Text>
        </Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="User Management"
      subtitle="Manage employee accounts and permissions for your organization"
      showBackButton={false}
      actions={
        canManageUsers ? (
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add User
          </Button>
        ) : null
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
                          {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
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
                      {canManageUsers ? (
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
                      ) : (
                        <Text size="sm" c="dimmed">No actions available</Text>
                      )}
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
          <form onSubmit={addForm.onSubmit(handleCreateUser)}>
            <Stack gap="md">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="First Name"
                    placeholder="John"
                    required
                    {...addForm.getInputProps('firstName')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Last Name"
                    placeholder="Doe"
                    required
                    {...addForm.getInputProps('lastName')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Email"
                    placeholder="john.doe@company.com"
                    type="email"
                    required
                    {...addForm.getInputProps('email')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Phone"
                    placeholder="+855 12 345 678"
                    {...addForm.getInputProps('phone')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Department"
                    data={departmentOptions}
                    required
                    {...addForm.getInputProps('department')}
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
                    {...addForm.getInputProps('role')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Switch
                    label="Active Status"
                    description="User can log in and access the system"
                    {...addForm.getInputProps('status', { type: 'checkbox' })}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <MultiSelect
                    label="Permissions"
                    description="Select specific permissions for this user"
                    data={permissionOptions}
                    placeholder="Select permissions"
                    {...addForm.getInputProps('permissions')}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <PasswordInput
                    label="Temporary Password"
                    description="User will be required to change this on first login"
                    placeholder="Enter temporary password"
                    required
                    {...addForm.getInputProps('password')}
                  />
                </Grid.Col>
              </Grid>

              <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                The user will receive an email invitation with login instructions and will be required to change their password on first login.
              </Alert>

              <Group justify="flex-end">
                <Button variant="default" onClick={closeAddModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Create User
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          opened={editModalOpened}
          onClose={closeEditModal}
          title={selectedUser ? `Edit User - ${selectedUser.name}` : 'Edit User'}
          size="lg"
        >
          {selectedUser && (
            <form onSubmit={editForm.onSubmit(handleUpdateUser)}>
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      label="First Name"
                      required
                      {...editForm.getInputProps('firstName')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Last Name"
                      required
                      {...editForm.getInputProps('lastName')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Email"
                      type="email"
                      required
                      {...editForm.getInputProps('email')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Phone"
                      {...editForm.getInputProps('phone')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Department"
                      data={departmentOptions}
                      required
                      {...editForm.getInputProps('department')}
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
                      {...editForm.getInputProps('role')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Switch
                      label="Active Status"
                      description="User can log in and access the system"
                      {...editForm.getInputProps('status', { type: 'checkbox' })}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <MultiSelect
                      label="Permissions"
                      description="Select specific permissions for this user"
                      data={permissionOptions}
                      {...editForm.getInputProps('permissions')}
                    />
                  </Grid.Col>
                </Grid>

                <Group justify="space-between">
                  <Button variant="outline" color="red" disabled={submitting}>
                    Reset Password
                  </Button>
                  <Group>
                    <Button variant="default" onClick={closeEditModal} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={submitting}>
                      Save Changes
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </form>
          )}
        </Modal>
    </PageLayout>
  )
}
