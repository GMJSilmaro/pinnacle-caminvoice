"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, Group, Text, Button, Stack, Badge, Tooltip, Loader, Alert } from '@mantine/core'
import { IconRefresh, IconHeartbeat, IconAlertTriangle } from '@tabler/icons-react'

interface TokenEvent {
  id: string
  createdAt: string
  description: string
  success: boolean
  metadata?: any
}

interface TokenStatus {
  success: boolean
  providerId?: string
  hasAccessToken?: boolean
  tokenExpiresAt?: string | null
  expiresInSeconds?: number | null
  isExpired?: boolean
  expiringSoon?: boolean
  lastEvent?: TokenEvent | null
  lastSuccessful?: TokenEvent | null
  recentEvents?: TokenEvent[]
  error?: string
}

export default function ProviderTokenMonitor() {
  const [status, setStatus] = useState<TokenStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [health, setHealth] = useState<{ ok: boolean; outcome: string; status: number; message: string } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [attemptedForExpiry, setAttemptedForExpiry] = useState<string | null>(null)

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/provider/token/status', { cache: 'no-store' })
      const json = await res.json()
      setStatus(json)
      if (json.tokenExpiresAt) {
        const ms = new Date(json.tokenExpiresAt).getTime() - Date.now()
        setSecondsLeft(Math.max(0, Math.floor(ms / 1000)))
      } else {
        setSecondsLeft(null)
      }
      // Reset auto-refresh attempt marker when expiry changes
      const expiryKey = json.tokenExpiresAt ? String(json.tokenExpiresAt) : 'none'
      setAttemptedForExpiry((prev) => (prev === expiryKey ? prev : null))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // 1s countdown ticker
  useEffect(() => {
    if (!status?.tokenExpiresAt) return
    const id = setInterval(() => {
      const ms = new Date(status.tokenExpiresAt!).getTime() - Date.now()
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [status?.tokenExpiresAt])

  // Light polling of status so middleware can run and auto-refresh when needed
  useEffect(() => {
    if (secondsLeft == null) return
    const freq = secondsLeft <= 120 ? 5000 : 15000 // poll faster as we get close
    const id = setInterval(() => {
      loadStatus()
    }, freq)
    return () => clearInterval(id)
  }, [secondsLeft])

  // Trigger auto-refresh proactively via internal endpoint when within 60s
  useEffect(() => {
    if (secondsLeft == null || !status?.tokenExpiresAt) return
    if (secondsLeft > 60) return

    const expiryKey = status.tokenExpiresAt
    if (attemptedForExpiry === expiryKey) return // already attempted for this expiry

    // Mark attempted first to avoid duplicate calls on rapid re-renders
    setAttemptedForExpiry(expiryKey)

    fetch('/api/internal/caminvoice/access-token', {
      method: 'GET',
      headers: { 'x-internal-request': 'monitor' },
      cache: 'no-store',
    })
      .then(() => loadStatus())
      .catch(() => {})
  }, [secondsLeft, status?.tokenExpiresAt])

  const expiryLabel = useMemo(() => {
    if (!status?.tokenExpiresAt) return 'Unknown'
    return new Date(status.tokenExpiresAt).toLocaleString()
  }, [status?.tokenExpiresAt])

  async function manualRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/provider/token/refresh', { method: 'POST' })
      await loadStatus()
    } finally {
      setRefreshing(false)
    }
  }

  async function runHealthCheck() {
    setHealth(null)
    const res = await fetch('/api/provider/token/health', { cache: 'no-store' })
    const j = await res.json()
    if (j.success) setHealth(j.probe)
    else setHealth({ ok: false, outcome: 'unknown', status: 0, message: j.error || 'Health check failed' })
  }

  if (loading && !status) return <Loader size="sm" />
  if (!status?.success) return <Alert color="red" icon={<IconAlertTriangle size={16} />}>{status?.error || 'Unable to load token status'}</Alert>

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>CamInvoice Access Token</Text>
          <Badge color={status.isExpired ? 'red' : status.expiringSoon ? 'orange' : 'green'}>
            {status.isExpired ? 'Expired' : status.expiringSoon ? 'Expiring soon' : 'Valid'}
          </Badge>
        </Group>

        <Group gap="md">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">Expires at</Text>
            <Text>{expiryLabel}</Text>
          </Stack>
          <Stack gap={2}>
            <Text size="sm" c="dimmed">Countdown</Text>
            <Text>{secondsLeft != null ? `${secondsLeft}s` : 'n/a'}</Text>
          </Stack>
          <Stack gap={2}>
            <Text size="sm" c="dimmed">Last refresh</Text>
            <Text>{status.lastSuccessful ? new Date(status.lastSuccessful.createdAt).toLocaleString() : 'No record'}</Text>
          </Stack>
          <Tooltip label="Attempt a refresh now (debug)">
            <Button leftSection={<IconRefresh size={16} />} loading={refreshing} onClick={manualRefresh} variant="light">Refresh Token Now</Button>
          </Tooltip>
          <Tooltip label="Call CamInvoice with bearer token to verify">
            <Button leftSection={<IconHeartbeat size={16} />} onClick={runHealthCheck} variant="light">Health Check</Button>
          </Tooltip>
        </Group>

        {status.lastEvent && (
          <Alert color={status.lastEvent.success ? 'green' : 'red'}>
            <Group justify="space-between">
              <Text size="sm">Last event: {new Date(status.lastEvent.createdAt).toLocaleString()}</Text>
              <Badge color={status.lastEvent.success ? 'green' : 'red'}>{status.lastEvent.success ? 'SUCCESS' : 'FAILURE'}</Badge>
            </Group>
            <Text size="sm">{status.lastEvent.description}</Text>
          </Alert>
        )}

        {health && (
          <Alert color={health.ok ? 'green' : 'red'} icon={<IconHeartbeat size={16} />}>
            Token probe: {health.outcome} (status {health.status}) - {health.message}
          </Alert>
        )}
      </Stack>
    </Card>
  )
}

