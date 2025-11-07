'use client'

import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  ActionIcon,
  Avatar,
  Grid,
  Paper,
  Progress,
  Modal,
  Alert,
  Tabs,
  NumberInput,
  Switch,
  Menu,
  TextInput,
  Select,
  PasswordInput,
  Divider,
  Checkbox,
} from '@mantine/core'
import {
  IconUsers,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconShieldCheck,
  IconShieldX,
  IconChartBar,
  IconSettings,
  IconInfoCircle,
  IconExternalLink,
  IconDots,
} from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../tables/DataTable'
import { showNotification } from '../../utils/notifications'

// Tenant interface for TypeScript
interface Tenant {
  id: string
  name: string
  businessName: string
  taxId: string
  email: string
  phone: string
  address: string
  status: string
  createdAt: string
  stats: {
    totalInvoices: number
    totalCustomers: number
    submittedInvoices: number
    acceptedInvoices: number
    rejectedInvoices: number
    monthlyRevenue: number
  }
  users: number
  activeUsers: number
  isConnectedToCamInv: boolean
}

// Empty initial state - will be populated from API
const initialTenants: Tenant[] = []

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'green'
    case 'suspended': return 'red'
    case 'pending': return 'orange'
    case 'inactive': return 'gray'
    default: return 'gray'
  }
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'Active'
    case 'suspended': return 'Suspended'
    case 'pending': return 'Pending'
    case 'inactive': return 'Inactive'
    default: return status
  }
}



export default function TenantManagement() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false)
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  const [isCreating, setIsCreating] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const [isValidatingTaxpayer, setIsValidatingTaxpayer] = useState(false);

  // Form for adding new tenant
  const addTenantForm = useForm({
    initialValues: {
      // Company Information
      companyName: "",
      taxId: "",
      registrationNumber: "",
      website: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Cambodia",
      phone: "",
      email: "",

      // Admin User Account
      createAdminAccount: true,
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
    validate: {
      companyName: (value) =>
        value.length < 2 ? "Company name is required" : null,
      taxId: (value) => (value.length < 5 ? "Endpoint ID is required" : null),
      address: (value) => (value.length < 5 ? "Address is required" : null),
      city: (value) => (value.length < 2 ? "City is required" : null),
      phone: (value) => (value.length < 8 ? "Phone number is required" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),

      // Admin account validation (only if creating account)
      adminFirstName: (value, values) =>
        values.createAdminAccount && value.length < 2
          ? "First name is required"
          : null,
      adminLastName: (value, values) =>
        values.createAdminAccount && value.length < 2
          ? "Last name is required"
          : null,
      adminEmail: (value, values) =>
        values.createAdminAccount && !/^\S+@\S+$/.test(value)
          ? "Invalid email"
          : null,
      adminPassword: (value, values) =>
        values.createAdminAccount && value.length < 8
          ? "Password must be at least 8 characters"
          : null,
      confirmPassword: (value, values) =>
        values.createAdminAccount && value !== values.adminPassword
          ? "Passwords do not match"
          : null,
    },
  });

  // Fetch tenants data
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch("/api/provider/tenants", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTenants(data.tenants);
          }
        } else {
          console.error("Failed to fetch tenants:", response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch tenants:", error);
      } finally {
        setTenantsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const refreshTenants = async () => {
    setTenantsLoading(true);
    try {
      const response = await fetch("/api/provider/tenants", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTenants(data.tenants);
        }
      }
    } catch (error) {
      console.error("Failed to refresh tenants:", error);
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActiveTab("overview");
    openDetailModal();
  };

  const handleRowClick = (tenant: Tenant) => {
    handleViewTenant(tenant);
  };

  const handleSaveTenantSettings = () => {
    showNotification.success(
      "Tenant settings updated successfully",
      "Settings Saved"
    );
    closeDetailModal();
  };

  const handleSuspendTenant = () => {
    if (selectedTenant) {
      handleToggleStatus(selectedTenant.id, "suspended");
    }
  };

  const handleToggleStatus = async (tenantId: string, newStatus?: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const targetStatus =
      newStatus ||
      (tenant.status.toLowerCase() === "active" ? "suspended" : "active");

    setUpdatingStatus(tenantId);
    try {
      const response = await fetch(`/api/provider/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: targetStatus }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local state
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, status: targetStatus } : t
          )
        );

        // Update selected tenant if it's the one being updated
        if (selectedTenant?.id === tenantId) {
          setSelectedTenant((prev) =>
            prev ? { ...prev, status: targetStatus } : null
          );
        }

        showNotification.success(
          `Tenant status updated to ${getStatusLabel(targetStatus)}`,
          "Status Updated"
        );

        // Close modal if suspending
        if (targetStatus === "suspended") {
          closeDetailModal();
        }
      } else {
        showNotification.error(
          data.error || "Failed to update tenant status",
          "Update Failed"
        );
      }
    } catch (error) {
      console.error("Failed to update tenant status:", error);
      showNotification.error(
        "Failed to update tenant status. Please try again.",
        "Update Failed"
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCreateTenant = async (values: typeof addTenantForm.values) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/provider/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification.success(
          `Tenant "${values.companyName}" created successfully${
            values.createAdminAccount ? " with admin account" : ""
          }`,
          "Tenant Created"
        );

        if (values.createAdminAccount && data.adminUser) {
          showNotification.info(
            `Admin account created: ${data.adminUser.email}`,
            "Admin Account Ready"
          );
        }

        addTenantForm.reset();
        closeAddModal();

        // Refresh tenant list
        await refreshTenants();
      } else {
        // Surface CamInvoice taxpayer validation error to the form for better UX
        if (response.status === 422) {
          addTenantForm.setFieldError(
            "taxId",
            data.error || "Taxpayer validation failed with CamInvoice"
          );
        }
        showNotification.error(
          data.error || "Failed to create tenant",
          "Creation Failed"
        );
      }
    } catch (error) {
      console.error("Failed to create tenant:", error);
      showNotification.error(
        "Failed to create tenant. Please try again.",
        "Creation Failed"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleValidateTaxpayer = async () => {
    const { companyName, taxId, registrationNumber } = addTenantForm.values;
    if (!taxId) {
      addTenantForm.setFieldError(
        "taxId",
        "Endpoint ID is required for validation"
      );
      return;
    }
    setIsValidatingTaxpayer(true);
    try {
      const res = await fetch("/api/provider/tenants?mode=validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName,
          taxId,
          registrationNumber,
          validateOnly: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.validation) {
        if (data.validation.is_valid) {
          addTenantForm.clearFieldError("taxId");
          showNotification.success(
            "Taxpayer validated successfully",
            "Taxpayer Valid"
          );
        } else {
          addTenantForm.setFieldError(
            "taxId",
            "Taxpayer validation failed with CamInvoice"
          );
          showNotification.error(
            "Taxpayer validation failed with CamInvoice",
            "Validation Failed"
          );
        }
      } else {
        const msg =
          data?.error || "Unable to validate taxpayer. Please try again.";
        addTenantForm.setFieldError("taxId", msg);
        showNotification.error(msg, "Validation Error");
      }
    } catch (e) {
      showNotification.error(
        "Validation request failed. Check your network and try again.",
        "Validation Error"
      );
    } finally {
      setIsValidatingTaxpayer(false);
    }
  };

  // Column definitions for the DataTable
  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: "name",
      header: "Tenant",
      cell: ({ row }) => (
        <Group gap="sm">
          <Avatar size="sm" radius="xl">
            {row.original.name.substring(0, 2).toUpperCase()}
          </Avatar>
          <div>
            <Text fw={500}>{row.original.name}</Text>
            <Text size="sm" c="dimmed">
              {row.original.businessName}
            </Text>
          </div>
        </Group>
      ),
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <Text size="sm">{row.original.email}</Text>
          <Text size="xs" c="dimmed">
            {row.original.phone}
          </Text>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          color={getStatusColor(row.original.status)}
          variant="light"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            handleToggleStatus(row.original.id);
          }}
          title="Click to toggle status"
        >
          {updatingStatus === row.original.id
            ? "..."
            : getStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "stats.totalInvoices",
      header: "Invoices",
      cell: ({ row }) => (
        <Text fw={500}>{row.original.stats.totalInvoices}</Text>
      ),
    },
    {
      accessorKey: "users",
      header: "Users",
      cell: ({ row }) => <Text fw={500}>{row.original.users}</Text>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEye size={16} />}
              onClick={() => handleViewTenant(row.original)}
            >
              View Details
            </Menu.Item>
            <Menu.Item
              leftSection={<IconEdit size={16} />}
              onClick={() => {
                /* Handle edit */
              }}
            >
              Edit Tenant
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              onClick={() => {
                /* Handle settings */
              }}
            >
              Settings
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ];

  const totalStats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(
      (t: Tenant) => t.status.toLowerCase() === "active"
    ).length,
    totalInvoices: tenants.reduce(
      (sum: number, t: Tenant) => sum + t.stats.totalInvoices,
      0
    ),
    totalRevenue: tenants.reduce(
      (sum: number, t: Tenant) => sum + t.stats.monthlyRevenue,
      0
    ),
  };

  return (
    <Stack gap="xl">
      {/* Actions */}
      <Card withBorder>
        <Group justify="space-between">
          <Title order={4}>Tenant Accounts</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Tenant
          </Button>
        </Group>
      </Card>

      {/* Tenants Table */}
      <DataTable
        columns={columns}
        data={tenants}
        searchPlaceholder="Search tenants..."
        onRowClick={handleRowClick}
        isLoading={tenantsLoading}
      />

      {/* Tenant Detail Modal */}
      <Modal
        opened={detailModalOpened}
        onClose={closeDetailModal}
        title={
          selectedTenant
            ? `${selectedTenant.name} - Tenant Details`
            : "Tenant Details"
        }
        size="xl"
      >
        {selectedTenant && (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab
                value="overview"
                leftSection={<IconInfoCircle size={16} />}
              >
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
                Statistics
              </Tabs.Tab>
              <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
                Users
              </Tabs.Tab>
              <Tabs.Tab
                value="settings"
                leftSection={<IconSettings size={16} />}
              >
                Settings
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">
                      Business Name
                    </Text>
                    <Text fw={500}>{selectedTenant.businessName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">
                      Endpoint ID
                    </Text>
                    <Text fw={500}>{selectedTenant.taxId}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">
                      Email
                    </Text>
                    <Text fw={500}>{selectedTenant.email}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">
                      Phone
                    </Text>
                    <Text fw={500}>{selectedTenant.phone}</Text>
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Text size="sm" c="dimmed">
                      Address
                    </Text>
                    <Text fw={500}>{selectedTenant.address}</Text>
                  </Grid.Col>
                </Grid>

                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                  <Text fw={500} mb="xs">
                    CamInvoice Integration
                  </Text>
                  <Text size="sm">
                    This tenant uses the global CamInvoice connection managed by
                    the service provider. No individual OAuth setup required.
                  </Text>
                </Alert>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="stats" pt="md">
              <Grid>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed">
                        Total Invoices
                      </Text>
                      <Text size="xl" fw={700}>
                        {selectedTenant.stats.totalInvoices}
                      </Text>
                      <Progress
                        value={
                          (selectedTenant.stats.submittedInvoices /
                            selectedTenant.stats.totalInvoices) *
                          100
                        }
                        color="blue"
                        size="sm"
                      />
                      <Text size="xs" c="dimmed">
                        {selectedTenant.stats.submittedInvoices} submitted to
                        CamInvoice
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Paper p="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed">
                        Acceptance Rate
                      </Text>
                      <Text size="xl" fw={700} c="green">
                        {selectedTenant.stats.submittedInvoices > 0
                          ? Math.round(
                              (selectedTenant.stats.acceptedInvoices /
                                selectedTenant.stats.submittedInvoices) *
                                100
                            )
                          : 0}
                        %
                      </Text>
                      <Progress
                        value={
                          selectedTenant.stats.submittedInvoices > 0
                            ? (selectedTenant.stats.acceptedInvoices /
                                selectedTenant.stats.submittedInvoices) *
                              100
                            : 0
                        }
                        color="green"
                        size="sm"
                      />
                      <Text size="xs" c="dimmed">
                        {selectedTenant.stats.acceptedInvoices} accepted,{" "}
                        {selectedTenant.stats.rejectedInvoices} rejected
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="users" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={500}>User Management</Text>
                  {/* <Button size="sm" leftSection={<IconPlus size={14} />}>
                    Add User
                  </Button> */}
                </Group>
                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                  This tenant has {selectedTenant.users} active users. User
                  management functionality will be implemented here.
                </Alert>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="settings" pt="md">
              <Stack gap="md">
                <Text fw={500}>Tenant Settings</Text>
                <Switch
                  label="Active Status"
                  description="Enable or disable this tenant account"
                  checked={selectedTenant.status.toLowerCase() === "active"}
                  onChange={(event) => {
                    const newStatus = event.currentTarget.checked
                      ? "active"
                      : "suspended";
                    handleToggleStatus(selectedTenant.id, newStatus);
                  }}
                  disabled={updatingStatus === selectedTenant.id}
                />
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    color="red"
                    onClick={handleSuspendTenant}
                  >
                    Suspend Tenant
                  </Button>
                  <Button onClick={handleSaveTenantSettings}>
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}
      </Modal>

      {/* Add Tenant Modal */}
      <Modal
        opened={addModalOpened}
        onClose={closeAddModal}
        title="Add New Tenant"
        size="xl"
      >
        <form onSubmit={addTenantForm.onSubmit(handleCreateTenant)}>
          <Stack gap="md">
            {/* Company Information Section */}
            <div>
              <Text fw={500} mb="md">
                Company Information
              </Text>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Company Name"
                    placeholder="ABC Corporation Ltd"
                    required
                    {...addTenantForm.getInputProps("companyName")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Endpoint ID (CamInvoice ID)"
                    placeholder="KHU... e.g., KHUJD00001234"
                    description="Enter your CamInvoice endpoint_id (member ID)"
                    required
                    {...addTenantForm.getInputProps("taxId")}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    mt="xs"
                    onClick={handleValidateTaxpayer}
                    loading={isValidatingTaxpayer}
                  >
                    Validate taxpayer
                  </Button>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="VATTIN"
                    placeholder="REG123456789"
                    {...addTenantForm.getInputProps("registrationNumber")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Website"
                    placeholder="https://abccorp.com"
                    {...addTenantForm.getInputProps("website")}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Address"
                    placeholder="123 Business Street, Phnom Penh"
                    required
                    {...addTenantForm.getInputProps("address")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="City"
                    placeholder="Phnom Penh"
                    required
                    {...addTenantForm.getInputProps("city")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Postal Code"
                    placeholder="12000"
                    {...addTenantForm.getInputProps("postalCode")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Country"
                    placeholder="Select country"
                    data={[
                      { value: "Cambodia", label: "Cambodia" },
                      { value: "Thailand", label: "Thailand" },
                      { value: "Vietnam", label: "Vietnam" },
                      { value: "Singapore", label: "Singapore" },
                    ]}
                    required
                    {...addTenantForm.getInputProps("country")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Phone"
                    placeholder="+855 12 345 678"
                    required
                    {...addTenantForm.getInputProps("phone")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Company Email"
                    placeholder="contact@abccorp.com"
                    type="email"
                    required
                    {...addTenantForm.getInputProps("email")}
                  />
                </Grid.Col>
              </Grid>
            </div>

            <Divider />

            {/* Admin Account Section */}
            <div>
              <Checkbox
                label="Create admin user account for this tenant"
                description="This will create a tenant administrator account that can manage the company's invoices and users"
                {...addTenantForm.getInputProps("createAdminAccount", {
                  type: "checkbox",
                })}
                mb="md"
              />

              {addTenantForm.values.createAdminAccount && (
                <Stack gap="md">
                  <Text fw={500} size="sm" c="dimmed">
                    Admin Account Details
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="First Name"
                        placeholder="John"
                        required
                        {...addTenantForm.getInputProps("adminFirstName")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Last Name"
                        placeholder="Smith"
                        required
                        {...addTenantForm.getInputProps("adminLastName")}
                      />
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <TextInput
                        label="Admin Email"
                        placeholder="admin@abccorp.com"
                        type="email"
                        required
                        description="This will be used to login to the system"
                        {...addTenantForm.getInputProps("adminEmail")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <PasswordInput
                        label="Password"
                        placeholder="Create a strong password"
                        required
                        description="Minimum 8 characters"
                        {...addTenantForm.getInputProps("adminPassword")}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <PasswordInput
                        label="Confirm Password"
                        placeholder="Confirm the password"
                        required
                        description="Minimum 8 characters"
                        {...addTenantForm.getInputProps("confirmPassword")}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              )}
            </div>

            <Group justify="flex-end" pt="md">
              <Button
                variant="default"
                onClick={closeAddModal}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isCreating}>
                {isCreating ? "Creating..." : "Create Tenant"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
