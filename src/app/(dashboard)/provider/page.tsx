'use client'

import {
  Text,
  Stack,
  Tabs,
  Group,
  Button,
  Grid,
  Alert,
  Loader,
  Center,
} from '@mantine/core'
import {
  IconShieldCheck,
  IconUsers,
  IconSettings,
  IconChartBar,
  IconDatabase,
  IconKey,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import ProviderSetup from '../../../components/admin/ProviderSetup.client'
import TenantManagement from '../../../components/admin/TenantManagement'
import PageLayout from '../../../components/layouts/PageLayout'
import StatsCard from '../../../components/ui/StatsCard'
import ContentCard from '../../../components/ui/ContentCard'

interface ProviderStats {
  totalTenants: number
  activeTenants: number
  monthlyInvoices: number
  monthlyRevenue: number
  connectedTenants: number
  totalInvoices: number
  acceptedInvoices: number
  rejectedInvoices: number
  providerConnected: boolean
  monthlyInvoiceGrowth: number
  monthlyRevenueGrowth: number
}

export default function ProviderPage() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<ProviderStats>({
    totalTenants: 0,
    activeTenants: 0,
    monthlyInvoices: 0,
    monthlyRevenue: 0,
    connectedTenants: 0,
    totalInvoices: 0,
    acceptedInvoices: 0,
    rejectedInvoices: 0,
    providerConnected: false,
    monthlyInvoiceGrowth: 0,
    monthlyRevenueGrowth: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch provider statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/provider/stats', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats({
              totalTenants: data.stats.totalTenants,
              activeTenants: data.stats.activeTenants,
              monthlyInvoices: data.stats.monthlyInvoices,
              monthlyRevenue: data.stats.monthlyRevenue,
              connectedTenants: data.stats.connectedTenants,
              totalInvoices: data.stats.totalInvoices,
              acceptedInvoices: data.stats.acceptedInvoices,
              rejectedInvoices: data.stats.rejectedInvoices,
              providerConnected: data.stats.providerConnected,
              monthlyInvoiceGrowth: data.stats.monthlyInvoiceGrowth,
              monthlyRevenueGrowth: data.stats.monthlyRevenueGrowth,
            })
          }
        } else {
          console.error('Failed to fetch provider stats:', response.statusText)
        }
      } catch (error) {
        console.error('Failed to fetch provider stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    if (user?.role === 'PROVIDER') {
      fetchStats()
    }
  }, [user])

  // Show loading state
  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading provider dashboard...</Text>
        </Stack>
      </Center>
    )
  }

  // Role-based access control
  if (!user || user.role !== 'PROVIDER') {
    return (
      <Stack p="md">
        <Alert color="red" icon={<IconShieldCheck size={16} />}>
          <Text fw={500} mb="xs">Access Denied</Text>
          <Text size="sm">
            You do not have permission to access the Service Provider Administration panel.
            Only users with the 'PROVIDER' role can access this area.
          </Text>
        </Alert>
      </Stack>
    )
  }

  const stickyContent = (
    <Stack gap="md">
      {/* Provider Access Notice */}
      <Alert color="blue" icon={<IconInfoCircle size={16} />}>
        <Text fw={500} mb="xs">Service Provider Access</Text>
        <Text size="sm">
          Welcome, {user.firstName} {user.lastName}. This administration panel is restricted to Service Provider personnel only.
          All actions performed here affect the entire CamInvoice integration for all tenants.
        </Text>
      </Alert>

      {/* Quick Stats */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Tenants"
            value={statsLoading ? '...' : stats.totalTenants.toString()}
            icon={<IconUsers size={20} />}
            iconColor="blue"
            subtitle="Registered merchants"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Active Tenants"
            value={statsLoading ? '...' : stats.activeTenants.toString()}
            icon={<IconDatabase size={20} />}
            iconColor="green"
            subtitle="Active merchants"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Invoices"
            value={statsLoading ? '...' : stats.totalInvoices.toLocaleString()}
            icon={<IconChartBar size={20} />}
            iconColor="teal"
            subtitle="All time"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Monthly Revenue"
            value={statsLoading ? '...' : `$${stats.monthlyRevenue.toLocaleString()}`}
            icon={<IconChartBar size={20} />}
            iconColor="violet"
            subtitle="This month"
            trend={stats.monthlyRevenueGrowth !== 0 ? {
              value: `${stats.monthlyRevenueGrowth > 0 ? '+' : ''}${stats.monthlyRevenueGrowth.toFixed(1)}%`,
              type: stats.monthlyRevenueGrowth > 0 ? "up" : "down"
            } : undefined}
          />
        </Grid.Col>
      </Grid>

      {/* Additional Stats Row */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Connected Tenants"
            value={statsLoading ? '...' : stats.connectedTenants.toString()}
            icon={<IconDatabase size={20} />}
            iconColor="green"
            subtitle="CamInvoice connected"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Accepted Invoices"
            value={statsLoading ? '...' : stats.acceptedInvoices.toLocaleString()}
            icon={<IconShieldCheck size={20} />}
            iconColor="teal"
            subtitle="Successfully processed"
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Monthly Invoices"
            value={statsLoading ? '...' : stats.monthlyInvoices.toLocaleString()}
            icon={<IconChartBar size={20} />}
            iconColor="blue"
            subtitle="This month"
            trend={stats.monthlyInvoiceGrowth !== 0 ? {
              value: `${stats.monthlyInvoiceGrowth > 0 ? '+' : ''}${stats.monthlyInvoiceGrowth.toFixed(1)}%`,
              type: stats.monthlyInvoiceGrowth > 0 ? "up" : "down"
            } : undefined}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Provider Status"
            value={statsLoading ? '...' : (stats.providerConnected ? 'Connected' : 'Setup Required')}
            icon={<IconShieldCheck size={20} />}
            iconColor={stats.providerConnected ? 'green' : 'orange'}
            subtitle="CamInvoice integration"
          />
        </Grid.Col>
      </Grid>
    </Stack>
  )

  return (
    <PageLayout
      title="Service Provider Administration"
      subtitle="Manage CamInvoice service provider settings and tenant accounts"
      showBackButton={false}
      stickyContent={stickyContent}
    >
      <Stack gap="xl">
        <Tabs defaultValue="provider" variant="outline">
          {/* Tabs List */}
          <Tabs.List>
            <Tabs.Tab value="provider" leftSection={<IconKey size={16} />}>
              Provider Setup
            </Tabs.Tab>
            <Tabs.Tab value="tenants" leftSection={<IconUsers size={16} />}>
              Tenant Management
            </Tabs.Tab>
            <Tabs.Tab value="system" leftSection={<IconSettings size={16} />}>
              System Settings
            </Tabs.Tab>
            <Tabs.Tab value="monitoring" leftSection={<IconChartBar size={16} />}>
              Monitoring
            </Tabs.Tab>
          </Tabs.List>

        {/* Tab Panels */}
        <Tabs.Panel value="provider" pt="md">
          <ProviderSetup
            isSetup={stats.providerConnected}
            onSetupComplete={() => {
              // Refresh stats after setup completion
              setStats(prev => ({ ...prev, providerConnected: true }))
              console.log('Provider setup completed')
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="tenants" pt="md">
          <TenantManagement />
        </Tabs.Panel>

        <Tabs.Panel value="system" pt="md">
          <ContentCard title="System Settings">
            <Stack gap="md">
              <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                System configuration options for the CamInvoice integration will be implemented here.
                This includes webhook settings, API rate limits, and global system preferences.
              </Alert>
              <Group>
                <Button variant="light">
                  Configure Webhooks
                </Button>
                <Button variant="light">
                  API Settings
                </Button>
                <Button variant="light">
                  System Logs
                </Button>
              </Group>
            </Stack>
          </ContentCard>
        </Tabs.Panel>

        <Tabs.Panel value="monitoring" pt="md">
          <ContentCard title="System Monitoring">
            <Stack gap="md">
              <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                System health monitoring, performance metrics, and CamInvoice API status will be displayed here.
                This includes real-time statistics, error rates, and system uptime.
              </Alert>
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <StatsCard
                    title="API Status"
                    value="Online"
                    iconColor="green"
                    subtitle="CamInv connection"
                    size="sm"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <StatsCard
                    title="Response Time"
                    value="245ms"
                    iconColor="blue"
                    subtitle="Average latency"
                    size="sm"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <StatsCard
                    title="Error Rate"
                    value="0.02%"
                    iconColor="orange"
                    subtitle="Last 24 hours"
                    size="sm"
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </ContentCard>
        </Tabs.Panel>
        </Tabs>
      </Stack>
    </PageLayout>
  )
}
