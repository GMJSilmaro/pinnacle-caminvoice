'use client'

import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Alert,
  Badge,
  ThemeIcon,
  Timeline,
  Code,
  Divider,
} from '@mantine/core'
import {
  IconPlugConnected,
  IconShieldCheck,
  IconExternalLink,
  IconCheck,
  IconX,
  IconClock,
  IconKey,
  IconDatabase,
  IconRefresh,
} from '@tabler/icons-react'
import { useState } from 'react'

interface MerchantConnectionProps {
  isConnected?: boolean
  merchantInfo?: {
    name: string
    taxId: string
    endpointId?: string
    lastConnected?: string
    tokenExpiry?: string
  }
  onConnect?: () => void
  onDisconnect?: () => void
  onRefreshToken?: () => void
}

export default function MerchantConnection({
  isConnected = false,
  merchantInfo,
  onConnect,
  onDisconnect,
  onRefreshToken,
}: MerchantConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // TODO: Implement OAuth flow
      console.log('Starting CamInvoice OAuth flow...')
      
      // Simulate OAuth redirect
      const authUrl = `https://auth.caminvoice.gov.kh/oauth/authorize?client_id=your_client_id&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&scope=invoice_management`
      
      // In real implementation, this would redirect to CamInvoice OAuth
      window.open(authUrl, '_blank', 'width=600,height=700')
      
      onConnect?.()
    } catch (error) {
      console.error('Failed to connect to CamInvoice:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    try {
      // TODO: Implement token refresh
      console.log('Refreshing CamInvoice tokens...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      onRefreshToken?.()
    } catch (error) {
      console.error('Failed to refresh tokens:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isConnected && merchantInfo) {
    return (
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>CamInvoice Connection</Title>
              <Text size="sm" c="dimmed">
                Your merchant account is connected to CamInvoice
              </Text>
            </div>
            <Badge color="green" variant="light" leftSection={<IconCheck size={14} />}>
              Connected
            </Badge>
          </Group>

          <Alert color="green" icon={<IconShieldCheck size={16} />}>
            Your merchant account is successfully linked to the Cambodia e-Invoicing system. 
            You can now issue compliant e-invoices.
          </Alert>

          <Card withBorder bg="gray.0">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Business Name:</Text>
                <Text size="sm">{merchantInfo.name}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={500}>Tax ID:</Text>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>{merchantInfo.taxId}</Text>
              </Group>
              {merchantInfo.endpointId && (
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Endpoint ID:</Text>
                  <Code size="sm">{merchantInfo.endpointId}</Code>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" fw={500}>Last Connected:</Text>
                <Text size="sm" c="dimmed">{merchantInfo.lastConnected}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={500}>Token Expires:</Text>
                <Text size="sm" c="dimmed">{merchantInfo.tokenExpiry}</Text>
              </Group>
            </Stack>
          </Card>

          <Group>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              loading={isRefreshing}
              onClick={handleRefreshToken}
            >
              Refresh Tokens
            </Button>
            <Button
              variant="outline"
              color="red"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </Group>
        </Stack>
      </Card>
    )
  }

  return (
    <Card withBorder>
      <Stack gap="md">
        <div>
          <Title order={4}>Connect to CamInvoice</Title>
          <Text size="sm" c="dimmed">
            Link your merchant account with the Cambodia e-Invoicing system
          </Text>
        </div>

        <Alert color="blue" icon={<IconPlugConnected size={16} />}>
          To issue compliant e-invoices in Cambodia, you need to connect your merchant account 
          with the official CamInvoice system.
        </Alert>

        <Timeline active={-1} bulletSize={24} lineWidth={2}>
          <Timeline.Item
            bullet={<IconKey size={12} />}
            title="OAuth Authentication"
          >
            <Text c="dimmed" size="sm">
              Securely authenticate with your CamInvoice merchant account
            </Text>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconDatabase size={12} />}
            title="Token Storage"
          >
            <Text c="dimmed" size="sm">
              Access and refresh tokens will be encrypted and stored securely
            </Text>
          </Timeline.Item>

          <Timeline.Item
            bullet={<IconShieldCheck size={12} />}
            title="Ready to Invoice"
          >
            <Text c="dimmed" size="sm">
              Start issuing compliant e-invoices with automatic CamInvoice submission
            </Text>
          </Timeline.Item>
        </Timeline>

        <Divider />

        <Stack gap="sm">
          <Text size="sm" fw={500}>What happens when you connect:</Text>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li><Text size="sm">Secure OAuth2 authentication with CamInvoice</Text></li>
            <li><Text size="sm">Encrypted storage of access and refresh tokens</Text></li>
            <li><Text size="sm">Automatic invoice submission to tax authorities</Text></li>
            <li><Text size="sm">Real-time status updates and verification</Text></li>
            <li><Text size="sm">QR code generation for invoice verification</Text></li>
          </ul>
        </Stack>

        <Button
          fullWidth
          size="md"
          leftSection={<IconExternalLink size={16} />}
          loading={isConnecting}
          onClick={handleConnect}
        >
          Connect to CamInvoice
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          You will be redirected to the official CamInvoice authentication page
        </Text>
      </Stack>
    </Card>
  )
}
