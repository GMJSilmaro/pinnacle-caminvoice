'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  TextInput,
  Select,
  Textarea,
  Grid,
  Tabs,
  Avatar,
  FileInput,
  Divider,
  Switch,
  Badge,
  Paper,
  Box,
  NumberInput,
} from '@mantine/core'
import {
  IconUser,
  IconBuilding,
  IconBell,
  IconShield,
  IconPalette,
  IconDatabase,
  IconDeviceFloppy,
  IconRefresh,
  IconUpload,
  IconKey,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCurrencyDollar,
  IconFileText,
  IconSettings,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import PageLayout from '../../../components/layouts/PageLayout'
import PageSkeleton from '../../../components/skeletons/PageSkeleton'
import { showNotification } from '../../../utils/notifications'

// Types
interface CompanyProfile {
  companyName: string
  taxId: string
  registrationNumber: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
  website: string
  currency: string
  taxRate: number
  invoicePrefix: string
  invoiceNumberStart: number
}

interface UserProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  timezone: string
}

interface NotificationSettings {
  emailInvoices: boolean
  camInvoiceUpdates: boolean
  systemMaintenance: boolean
  weeklySummary: boolean
  marketingEmails: boolean
  securityAlerts: boolean
}

interface SystemSettings {
  language: string
  dateFormat: string
  timeFormat: string
  currency: string
  timezone: string
}

// Mock data
const mockCompanyProfile: CompanyProfile = {
  companyName: 'Your Business Name',
  taxId: 'KHUJ000001234',
  registrationNumber: 'REG123456789',
  address: '123 Business Street',
  city: 'Phnom Penh',
  postalCode: '12000',
  country: 'Cambodia',
  phone: '+855 12 345 678',
  email: 'contact@yourbusiness.com',
  website: 'https://yourbusiness.com',
  currency: 'USD',
  taxRate: 10,
  invoicePrefix: 'INV',
  invoiceNumberStart: 1000,
}

const mockUserProfile: UserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@yourbusiness.com',
  phone: '+855 12 345 678',
  role: 'Admin',
  timezone: 'Asia/Phnom_Penh',
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'KHR', label: 'Cambodian Riel (KHR)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'THB', label: 'Thai Baht (THB)' },
]

const COUNTRY_OPTIONS = [
  { value: 'Cambodia', label: 'Cambodia' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Vietnam', label: 'Vietnam' },
  { value: 'Singapore', label: 'Singapore' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Phnom_Penh', label: 'Cambodia Time (UTC+7)' },
  { value: 'Asia/Bangkok', label: 'Thailand Time (UTC+7)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam Time (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (UTC+8)' },
]

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<string | null>('company')
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailInvoices: true,
    camInvoiceUpdates: true,
    systemMaintenance: true,
    weeklySummary: false,
    marketingEmails: false,
    securityAlerts: true,
  })

  const companyForm = useForm<CompanyProfile>({
    initialValues: mockCompanyProfile,
  })

  // Load settings on component mount
  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Load company profile
      const companyResponse = await fetch('/api/settings/company', {
        credentials: 'include',
      })

      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        if (companyData.success && companyData.company) {
          companyForm.setValues(companyData.company)
        }
      }

      // Load notification settings
      const notificationResponse = await fetch('/api/settings/notifications', {
        credentials: 'include',
      })

      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json()
        if (notificationData.success && notificationData.settings) {
          setNotifications(notificationData.settings)
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCompany = async (values: CompanyProfile) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showNotification.success('Company profile updated successfully', 'Settings Saved')
      } else {
        showNotification.error(data.error || 'Failed to save company profile', 'Save Failed')
      }
    } catch (error) {
      console.error('Failed to save company profile:', error)
      showNotification.error('Failed to save company profile. Please try again.', 'Save Failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showNotification.success('Notification preferences updated successfully', 'Settings Saved')
      } else {
        showNotification.error(data.error || 'Failed to save notification preferences', 'Save Failed')
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      showNotification.error('Failed to save notification preferences. Please try again.', 'Save Failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const handleResetToDefault = () => {
    if (activeTab === 'company') {
      companyForm.setValues(mockCompanyProfile)
    } else if (activeTab === 'notifications') {
      setNotifications({
        emailInvoices: true,
        camInvoiceUpdates: true,
        systemMaintenance: true,
        weeklySummary: false,
        marketingEmails: false,
        securityAlerts: true,
      })
    }
    showNotification.info('Settings reset to default values', 'Reset Complete')
  }

  const headerActions = (
    <Group>
      <Button
        leftSection={<IconRefresh size={16} />}
        variant="light"
        onClick={handleResetToDefault}
      >
        Reset to Default
      </Button>
      <Button
        leftSection={<IconDeviceFloppy size={16} />}
        onClick={() => {
          if (activeTab === 'company') {
            handleSaveCompany(companyForm.values)
          } else if (activeTab === 'notifications') {
            handleSaveNotifications()
          }
        }}
        loading={isLoading}
      >
        Save Changes
      </Button>
    </Group>
  )

  if (loading || isLoading || !user) {
    return (
      <PageLayout
        title="Settings"
        subtitle="Manage your company profile, user settings, and system preferences"
        actions={
          <Group>
            <Button leftSection={<IconRefresh size={16} />} variant="light" disabled>
              Reset to Default
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} disabled>
              Save Changes
            </Button>
          </Group>
        }
      >
        <PageSkeleton withStats={false} withFilters={false} tableColumns={2} tableRows={12} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your company profile, user settings, and system preferences"
      actions={headerActions}
    >
      <Stack gap="xl">

        {/* Settings Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="company" leftSection={<IconBuilding size={16} />}>
              Company Profile
            </Tabs.Tab>
            <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
              Notifications
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
              Security
            </Tabs.Tab>
            <Tabs.Tab value="system" leftSection={<IconSettings size={16} />}>
              System
            </Tabs.Tab>
          </Tabs.List>

          {/* Company Profile Tab */}
          <Tabs.Panel value="company" pt="xl">
            <form onSubmit={companyForm.onSubmit(handleSaveCompany)}>
              <Grid>
                <Grid.Col span={12}>
                  <Card withBorder>
                    <Stack gap="md">
                      <Group>
                        <IconBuilding size={24} />
                        <Title order={3}>Company Information</Title>
                        <Badge color="blue" variant="light">Required for CamInvoice</Badge>
                      </Group>
                      
                      <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Company Name"
                            placeholder="Enter company name"
                            required
                            {...companyForm.getInputProps('companyName')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Tax ID"
                            placeholder="Enter tax identification number"
                            required
                            {...companyForm.getInputProps('taxId')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Registration Number"
                            placeholder="Enter business registration number"
                            {...companyForm.getInputProps('registrationNumber')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Website"
                            placeholder="https://yourcompany.com"
                            {...companyForm.getInputProps('website')}
                          />
                        </Grid.Col>
                      </Grid>

                      <Divider />

                      <Title order={4}>Contact Information</Title>
                      <Grid>
                        <Grid.Col span={12}>
                          <TextInput
                            label="Address"
                            placeholder="Enter business address"
                            required
                            {...companyForm.getInputProps('address')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="City"
                            placeholder="Enter city"
                            required
                            {...companyForm.getInputProps('city')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="Postal Code"
                            placeholder="Enter postal code"
                            {...companyForm.getInputProps('postalCode')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <Select
                            label="Country"
                            placeholder="Select country"
                            data={COUNTRY_OPTIONS}
                            required
                            {...companyForm.getInputProps('country')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Phone"
                            placeholder="+855 12 345 678"
                            leftSection={<IconPhone size={16} />}
                            {...companyForm.getInputProps('phone')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Email"
                            placeholder="contact@company.com"
                            leftSection={<IconMail size={16} />}
                            required
                            {...companyForm.getInputProps('email')}
                          />
                        </Grid.Col>
                      </Grid>

                      <Divider />

                      <Title order={4}>Invoice Configuration</Title>
                      <Grid>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <Select
                            label="Default Currency"
                            placeholder="Select currency"
                            data={CURRENCY_OPTIONS}
                            required
                            {...companyForm.getInputProps('currency')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <NumberInput
                            label="Default Tax Rate (%)"
                            placeholder="10"
                            min={0}
                            max={100}
                            decimalScale={2}
                            {...companyForm.getInputProps('taxRate')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="Invoice Prefix"
                            placeholder="INV"
                            {...companyForm.getInputProps('invoicePrefix')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <NumberInput
                            label="Invoice Number Start"
                            placeholder="1000"
                            min={1}
                            {...companyForm.getInputProps('invoiceNumberStart')}
                          />
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>
            </form>
          </Tabs.Panel>

          {/* Other tabs can be added here */}
          <Tabs.Panel value="notifications" pt="xl">
            <Card withBorder>
              <Stack gap="md">
                <Title order={3}>Notification Preferences</Title>
                <Text size="sm" c="dimmed">Choose what notifications you want to receive</Text>
                
                <Stack gap="sm">
                  <Switch
                    label="Email notifications for new invoices"
                    description="Receive email when invoices are created or updated"
                    checked={notifications.emailInvoices}
                    onChange={(event) => handleNotificationChange('emailInvoices', event.currentTarget.checked)}
                  />
                  <Switch
                    label="CamInvoice status updates"
                    description="Get notified when invoice status changes in CamInvoice"
                    checked={notifications.camInvoiceUpdates}
                    onChange={(event) => handleNotificationChange('camInvoiceUpdates', event.currentTarget.checked)}
                  />
                  <Switch
                    label="System maintenance alerts"
                    description="Receive notifications about scheduled maintenance"
                    checked={notifications.systemMaintenance}
                    onChange={(event) => handleNotificationChange('systemMaintenance', event.currentTarget.checked)}
                  />
                  <Switch
                    label="Weekly summary reports"
                    description="Get weekly email summaries of your invoice activity"
                    checked={notifications.weeklySummary}
                    onChange={(event) => handleNotificationChange('weeklySummary', event.currentTarget.checked)}
                  />
                  <Switch
                    label="Marketing emails"
                    description="Receive promotional emails and product updates"
                    checked={notifications.marketingEmails}
                    onChange={(event) => handleNotificationChange('marketingEmails', event.currentTarget.checked)}
                  />
                  <Switch
                    label="Security alerts"
                    description="Get notified about important security events"
                    checked={notifications.securityAlerts}
                    onChange={(event) => handleNotificationChange('securityAlerts', event.currentTarget.checked)}
                  />
                </Stack>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="security" pt="xl">
            <Grid>
              <Grid.Col span={12}>
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={3}>Security Settings</Title>
                    <Text size="sm" c="dimmed">Manage your account security and access</Text>

                    <Group>
                      <Button
                        leftSection={<IconKey size={16} />}
                        variant="light"
                        component="a"
                        href="/profile"
                      >
                        Change Password
                      </Button>
                      <Button leftSection={<IconShield size={16} />} variant="light" disabled>
                        Enable Two-Factor Authentication
                      </Button>
                    </Group>

                    <Divider />

                    <Title order={4}>Account Information</Title>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Account ID"
                          value={user?.id || ''}
                          disabled
                          description="Your unique account identifier"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Account Created"
                          value={user ? new Date(user.createdAt || '').toLocaleDateString() : ''}
                          disabled
                          description="When your account was created"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Last Login"
                          value="Today"
                          disabled
                          description="Your last login time"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Active Sessions"
                          value="1"
                          disabled
                          description="Number of active login sessions"
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="system" pt="xl">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>System Information</Title>
                    <Group justify="space-between">
                      <Text size="sm">Application Version</Text>
                      <Text size="sm" fw={500}>v1.0.0-beta</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Last Update</Text>
                      <Text size="sm" fw={500}>{new Date().toLocaleDateString()}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Environment</Text>
                      <Badge color="orange" variant="light">Development</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Database Status</Text>
                      <Badge color="green" variant="light">Connected</Badge>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>CamInvoice Integration</Title>
                    <Group justify="space-between">
                      <Text size="sm">API Status</Text>
                      <Badge color="green" variant="light">Online</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">API Version</Text>
                      <Text size="sm" fw={500}>v2.1</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Last Sync</Text>
                      <Text size="sm" fw={500}>2 minutes ago</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Provider Status</Text>
                      <Badge color={user?.role === 'PROVIDER' ? 'green' : 'blue'} variant="light">
                        {user?.role === 'PROVIDER' ? 'Active Provider' : 'Tenant User'}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={12}>
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>System Preferences</Title>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Select
                          label="Language"
                          data={[
                            { value: 'en', label: 'English' },
                            { value: 'km', label: 'Khmer (ភាសាខ្មែរ)' },
                            { value: 'th', label: 'Thai (ไทย)' },
                          ]}
                          defaultValue="en"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Select
                          label="Date Format"
                          data={[
                            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                          ]}
                          defaultValue="MM/DD/YYYY"
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <Select
                          label="Time Format"
                          data={[
                            { value: '12h', label: '12 Hour (AM/PM)' },
                            { value: '24h', label: '24 Hour' },
                          ]}
                          defaultValue="12h"
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </PageLayout>
  )
}
