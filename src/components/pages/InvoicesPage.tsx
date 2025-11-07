'use client'

import {
  Box,
  Button,
  Flex,
  Group,
  Text,
  Badge,
  Avatar,
  Modal,
  Paper,
  Checkbox,
  Switch,
  Tooltip,
  Stack,
  Collapse,
  Transition,
} from "@mantine/core"
import {
  IconPlus,
  IconDownload,
  IconHelp,
  IconChevronDown,
  IconFileInvoice,
  IconCurrencyDollar,
  IconClock,
  IconUsers,
  IconRefresh,
  IconUpload,
  IconTrash
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { showNotification } from '../../utils/notifications'
import { useAuth } from '../../hooks/useAuth'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'
import StatsCard from '../ui/StatsCard'

// Runtime types for table rows
interface InvoiceRow {
  id: string
  invoiceNumber: string
  customerName: string
  amount: string
  status: string
  date: string
  avatar: string
  camInvUuid: string | null
  camInvoiceStatus?: string | null
  verificationUrl?: string | null
  deliveryStatus: string
  deliveryMethod?: string | null
  deliveredAt?: string | null
  customerEmail?: string | null
  customerEndpointId?: string | null
}

interface InvoiceStats {
  totalInvoices: number
  totalRevenue: number
  pendingInvoices: number
  activeClients: number
}

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'DRAFT': return 'gray'
    case 'SUBMITTED': return 'blue'
    case 'ACCEPTED': return 'green'
    case 'REJECTED': return 'red'
    default: return 'gray'
  }
}

function getCamInvoiceStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'VALID': return 'green'
    case 'DELIVERED': return 'orange'
    case 'ACKNOWLEDGED': return 'cyan'
    case 'IN_PROCESS': return 'yellow'
    case 'UNDER_QUERY': return 'orange'
    case 'CONDITIONALLY_ACCEPTED': return 'lime'
    case 'ACCEPTED': return 'green'
    case 'REJECTED': return 'red'
    case 'PAID': return 'teal'
    default: return 'gray'
  }
}

function getDeliveryStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'PENDING': return 'orange'
    case 'DELIVERED': return 'green'
    case 'FAILED': return 'red'
    case 'NOT_APPLICABLE': return 'gray'
    default: return 'gray'
  }
}

function getDeliveryStatusText(status: string, method?: string | null) {
  const statusText = status?.toUpperCase()
  if (statusText === 'DELIVERED' && method) {
    return `${statusText} (${method})`
  }
  return statusText || 'PENDING'
}

export default function InvoicesPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [xmlModal, setXmlModal] = useState<{ opened: boolean; content: string | null; title?: string }>({ opened: false, content: null })
  const [deleteDialog, setDeleteDialog] = useState<{ opened: boolean; invoice?: InvoiceRow; loading?: boolean }>({ opened: false })
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{ opened: boolean; loading?: boolean }>({ opened: false })

  // Help section state
  const [helpExpanded, setHelpExpanded] = useState(false)

  // Background polling state
  const [isPolling, setIsPolling] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [tablePagination, setTablePagination] = useState<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 10 })

  // Load help preferences from localStorage
  useEffect(() => {
    const expanded = localStorage.getItem('invoices-help-expanded') === 'true'
    setHelpExpanded(expanded)
    const autoSync = localStorage.getItem('invoices-auto-sync-enabled')
    setAutoSyncEnabled(autoSync === 'true')
  }, [])

  // Save help preferences to localStorage
  const toggleHelp = () => {
    const newExpanded = !helpExpanded
    setHelpExpanded(newExpanded)
    localStorage.setItem('invoices-help-expanded', String(newExpanded))
  }

  const handleRowClick = (invoice: InvoiceRow) => {
    router.push(`/invoices/${invoice.id}`)
  }

  async function fetchInvoices(forceRefresh = false) {
    const fetchOptions: RequestInit = {
      credentials: 'include',
      // Add cache busting when force refreshing
      ...(forceRefresh && { cache: 'no-cache', headers: { 'Cache-Control': 'no-cache' } })
    }

    // Fetch a larger page size so client-side pagination/search in DataTable has the full set
    const res = await fetch('/api/invoices?page=1&pageSize=1000', fetchOptions)
    if (!res.ok) throw new Error('Failed to load invoices')
    const data = await res.json()
    const mapped: InvoiceRow[] = (data.invoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name ?? '—',
      amount: new Intl.NumberFormat().format(Number(inv.totalAmount ?? 0)),
      status: inv.status,
      date: new Date(inv.issueDate).toISOString().slice(0, 10),
      avatar: (inv.customer?.name || '??').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase(),
      camInvUuid: inv.camInvoiceUuid || null,
      camInvoiceStatus: inv.camInvoiceStatus || null,
      verificationUrl: inv.verificationUrl || null,
      deliveryStatus: inv.deliveryStatus || 'PENDING',
      deliveryMethod: inv.deliveryMethod || null,
      deliveredAt: inv.deliveredAt ? new Date(inv.deliveredAt).toISOString().slice(0, 10) : null,
      customerEmail: inv.customer?.email || null,
      customerEndpointId: inv.customer?.camInvoiceEndpointId || null,
    }))
    setRows(mapped)
    // Clamp page index if needed after refresh
    const total = mapped.length
    const pageCount = Math.max(1, Math.ceil(total / tablePagination.pageSize))
    if (tablePagination.pageIndex > pageCount - 1) {
      setTablePagination(prev => ({ ...prev, pageIndex: pageCount - 1 }))
    }
    setStats(data.stats)
    setPageLoading(false)
  }

  // Background status synchronization
  async function syncInvoiceStatuses() {
    if (!autoSyncEnabled) return
    if (isPolling) return // Prevent concurrent polling

    // Check if there are any invoices with CamInvoice UUIDs to sync
    const invoicesWithUuids = rows.filter(row => row.camInvUuid)
    if (invoicesWithUuids.length === 0) {
      console.log('No invoices with CamInvoice UUIDs found, skipping sync')
      return
    }

    try {
      setIsPolling(true)
      console.log(`Starting status sync for ${invoicesWithUuids.length} invoices with CamInvoice UUIDs...`)

      // Prefer targeted syncs per document to reduce misses
      const syncTargets = invoicesWithUuids
        .filter(row => !['ACCEPTED','REJECTED','PAID'].includes(row.camInvoiceStatus || ''))
        .map(row => ({ id: row.id, uuid: row.camInvUuid! }))

      if (syncTargets.length === 0) {
        console.log('No active invoices to sync')
        return
      }

      const responses = await Promise.all(
        syncTargets.map(t => fetch('/api/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: t.id, documentType: 'invoice', camInvoiceUuid: t.uuid }),
          credentials: 'include'
        }))
      )

      const payloads = await Promise.all(responses.map(async r => ({ ok: r.ok, body: (await r.json().catch(() => ({}))) })))
      const okCount = payloads.filter(p => p.ok).length
      const anyChanged = payloads.some(p => p.ok && p.body?.statusChanged)
      console.log(`Per-document sync completed: ${okCount}/${responses.length} succeeded`)

      if (anyChanged) {
        // Refresh only if any status actually changed
        try {
          await fetchInvoices(true) // Force refresh to bypass cache
          console.log('Invoice list refreshed after sync')
        } catch (fetchError) {
          console.error('Failed to refresh invoice list after sync:', fetchError)
        }
      }

      setLastSyncTime(new Date())
      setConsecutiveErrors(0) // Reset error counter on success
    } catch (error) {
      console.error('Status sync failed:', error)

      // Check if it's a provider configuration issue
      if (error instanceof Error && error.message.includes('No active provider configuration found')) {
        console.error('❌ Provider not configured. Please set up CamInvoice provider credentials at /provider')
      }

      setConsecutiveErrors(prev => prev + 1)
    } finally {
      setIsPolling(false)
    }
  }

  // Column definitions for the DataTable
  const columns: ColumnDef<InvoiceRow>[] = [
    // { accessorKey: 'checkbox', header: '', cell: ({ row }) => (<Checkbox onChange={(e) => console.log(e.target.checked)} />) },
    { accessorKey: 'index', header: 'No.', cell: ({ row }) => (<Text>{row.index + 1}</Text>) },
    { 
      accessorKey: 'camInvUuid', 
      header: 'CamInv UUID', 
      cell: ({ row }) => {
        const uuid = row.original.camInvUuid
        if (!uuid) return <Text size="sm" c="dimmed">N/A</Text>
        
        return (
          <Tooltip label={uuid} withArrow>
            <Text 
              size="sm" 
              c="dimmed" 
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(uuid)
                showNotification.success('UUID copied to clipboard')
              }}
            >
              {uuid.substring(0, 12)}...
            </Text>
          </Tooltip>
        )
      }
    },
    { 
      accessorKey: 'invoiceNumber', 
      header: 'Invoice No.', 
      cell: ({ row }) => (
          <Text 
            fw={500} 
          >
            {row.original.invoiceNumber}
          </Text>
      )
    },
    {
      accessorKey: 'customerName',
      header: 'Client',
      cell: ({ row }) => (
        <Group gap="sm">
          <Avatar size="sm" radius="xl">{row.original.avatar}</Avatar>
          <Text>{row.original.customerName}</Text>
        </Group>
      ),
    },
    { accessorKey: 'amount', header: 'Total Amount', cell: ({ row }) => (<Text fw={500}>KHR {row.original.amount}</Text>) },
    // { accessorKey: 'status', header: 'Status', cell: ({ row }) => (<Badge color={getStatusColor(row.original.status)} variant="light">{row.original.status}</Badge>) },
    {
      accessorKey: 'camInvoiceStatus',
      header: 'CamInvoice Status',
      cell: ({ row }) => {
        const status = row.original.camInvoiceStatus
        if (!status) {
          return <Badge color="blue" variant="light" size="sm">Ready to Submit</Badge>
        }
        return <Badge color={getCamInvoiceStatusColor(status)} variant="light" size="sm">{status}</Badge>
      }
    },
    { accessorKey: 'date', header: 'Issue Date', cell: ({ row }) => (<Text c="dimmed">{row.original.date}</Text>) },
    {
      accessorKey: 'verificationUrl',
      header: 'Verification Link',
      cell: ({ row }) => (
        row.original.verificationUrl ? (
          <Badge color="green" variant="light" size="sm">Available</Badge>
        ) : (
          <Badge color="gray" variant="light" size="sm">N/A</Badge>
        )
      )
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: ({ row }) => {
        const readyToSubmit = !row.original.camInvoiceStatus // our UI shows Ready to Submit when this is empty
        return (
          <Group gap="xs" justify="flex-end" onClick={(e) => e.stopPropagation()}>
            <Tooltip label={readyToSubmit ? 'Delete invoice' : 'Cannot delete after submission'}>
              <div>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  disabled={!readyToSubmit}
                  onClick={() => {
                    if (!readyToSubmit) return
                    setDeleteDialog({ opened: true, invoice: row.original, loading: false })
                  }}
                >
                  Delete
                </Button>
              </div>
            </Tooltip>
          </Group>
        )
      }
    },

]

  const stickyContent = (
    <Stack gap="md">
      {/* Invoice Management Help - positioned below header */}
      <Paper
        withBorder
        p="xs"
        radius="md"
        style={{
          backgroundColor: 'var(--mantine-color-blue-0)',
          transition: 'all 0.2s ease',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.01)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <Group
          justify="space-between"
          align="center"
          onClick={toggleHelp}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          aria-label={helpExpanded ? "Collapse help" : "Expand help"}
        >
          <Group gap="xs" align="center">
            <IconHelp size={16} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text size="sm" fw={500} c="blue.7">
              Get Started with Invoices
            </Text>
            <Transition
              mounted={!helpExpanded}
              transition="fade"
              duration={200}
              timingFunction="ease"
            >
              {(styles) => (
                <Text size="xs" c="dimmed" style={styles}>
                  Click to view tips and guides on how to get started with invoices.
                </Text>
              )}
            </Transition>
          </Group>
          <Group gap="xs" align="center">
            <div
              style={{
                transform: helpExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconChevronDown size={16} color="var(--mantine-color-blue-6)" />
            </div>
          </Group>
        </Group>

        <Collapse in={helpExpanded} transitionDuration={300} transitionTimingFunction="ease">
          <Stack gap="xs" mt="xs" pl="md">
            <Transition
              mounted={helpExpanded}
              transition="slide-down"
              duration={400}
              timingFunction="ease"
            >
              {(styles) => (
                <Box style={styles}>
                  <Text size="xs" fw={500} c="blue.7" mb={2}>📋 Guide:</Text>
                  <Stack gap={4}>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Create new invoices from the <strong>Create Invoice</strong> button</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Click any invoice row for detailed information and management</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Use <strong>CamInv UUID</strong> column to track Cambodia e-invoice submissions</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Click truncated UUIDs to copy full UUID to clipboard</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Check <strong>Verification Link</strong> column for QR code availability</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Monitor <strong>Delivery Status</strong> to track customer delivery progress</Text>
                    </Group>
                  </Stack>
                </Box>
              )}
            </Transition>
            <Transition
              mounted={helpExpanded}
              transition="slide-down"
              duration={500}
              timingFunction="ease"
            >
              {(styles) => (
                <Box style={styles}>
                  <Text size="xs" fw={500} c="orange.7" mb={2}>💡 Quick Tips:</Text>
                  <Stack gap={4}>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed"><strong>"SUBMITTED"</strong> invoices sent to CamInvoice system</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed"><strong>"ACCEPTED"</strong> invoices are approved and legally valid e-invoices</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Use search bar for quick invoice lookup</Text>
                    </Group>
                    
                  </Stack>
                </Box>
              )}
            </Transition>
          </Stack>
        </Collapse>
      </Paper>

      {/* Stats Cards */}
      <Flex wrap="wrap" gap="md">
        {stats && (
          <>
            <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <StatsCard title="Total Invoices" value={String(stats.totalInvoices)} icon={<IconFileInvoice size={20} />} iconColor="blue" subtitle="from last month" trend={{ value: '', type: 'up' }} />
            </Box>
            {/* <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Tooltip label="Revenue amounts are displayed in KHR (Cambodian Riel)">
                <div>
                  <StatsCard title="Total Revenue" value={new Intl.NumberFormat().format(Number(stats.totalRevenue || 0))} icon={<IconCurrencyDollar size={20} />} iconColor="green" subtitle="KHR (Cambodian Riel)" trend={{ value: '', type: 'up' }} />
                </div>
              </Tooltip>
            </Box> */}
            <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <StatsCard title="Pending Invoices" value={String(stats.pendingInvoices)} icon={<IconClock size={20} />} iconColor="orange" subtitle="from last month" trend={{ value: '', type: 'down' }} />
            </Box>
            <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <StatsCard title="Active Clients" value={String(stats.activeClients)} icon={<IconUsers size={20} />} iconColor="violet" subtitle="from last month" trend={{ value: '', type: 'up' }} />
            </Box>
          </>
        )}
      </Flex>
    </Stack>
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await fetchInvoices()
      } finally {
        if (mounted) setPageLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Background polling for status updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      // Initial sync after 5 seconds
      const initialTimeout = setTimeout(() => {
        const hasActiveInvoices = rows.some(row => row.camInvUuid && !['ACCEPTED', 'REJECTED', 'PAID'].includes(row.camInvoiceStatus || ''))
        if (hasActiveInvoices) {
          console.log('Starting automatic status sync for active invoices')
          syncInvoiceStatuses()
        }
      }, 5000)

      // Then poll with adaptive interval based on error count and invoice states
      const hasActiveInvoices = rows.some(row =>
        row.camInvUuid &&
        !['ACCEPTED', 'REJECTED', 'PAID'].includes(row.camInvoiceStatus || '')
      )

      // Check if we have recently submitted invoices (more frequent polling)
      const hasRecentlySubmitted = rows.some(row =>
        row.camInvUuid &&
        ['SUBMITTED', 'VALID'].includes(row.camInvoiceStatus || '')
      )

      const pollIntervalMs = hasRecentlySubmitted
        ? Math.min(15000 * Math.pow(2, consecutiveErrors), 60000) // 15s-1min for recent submissions
        : Math.min(30000 * Math.pow(2, consecutiveErrors), 300000) // 30s-5min for older submissions

      pollInterval = setInterval(() => {
        if (hasActiveInvoices && !isPolling) {
          syncInvoiceStatuses()
        }
      }, pollIntervalMs)

      return () => {
        clearTimeout(initialTimeout)
        if (pollInterval) clearInterval(pollInterval)
      }
    }

    // Only start polling if we have invoices and page is not loading
    if (!pageLoading && rows.length > 0 && autoSyncEnabled) {
      const cleanup = startPolling()
      return cleanup
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [rows, pageLoading, isPolling, consecutiveErrors, autoSyncEnabled])

  async function openXml(id: string) {
    const res = await fetch(`/api/invoices/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setXmlModal({ opened: true, content: data.invoice?.xmlContent || '', title: data.invoice?.invoiceNumber })
  }

  async function submitToCamInv(id: string) {
    const res = await fetch('/api/invoices/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: id }) })
    if (res.ok) await fetchInvoices()
  }

  if (pageLoading) {
    return (
      <PageLayout title="Invoices" subtitle="Manage your invoices and track CamInvoice submissions" showBackButton={false} actions={<Group></Group>}>
        <PageSkeleton withStats withFilters tableColumns={7} tableRows={12} />
      </PageLayout>
    )
  }

  // Create dynamic subtitle with polling status
  const getSubtitle = () => {
    let subtitle = "Manage your invoices and track CamInvoice submissions"
    return subtitle
  }

  return (
    <PageLayout
      title="Invoices"
      subtitle={getSubtitle()}
      showBackButton={false}
      stickyContent={stickyContent}
      actions={
        <Group>
          {/* <Stack gap={2} align="flex-end">
            <Group gap={8} align="center">
              <Switch size="xs" checked={autoSyncEnabled} onChange={(e) => {
                const enabled = e.currentTarget.checked
                setAutoSyncEnabled(enabled)
                localStorage.setItem('invoices-auto-sync-enabled', String(enabled))
              }} />
              <Text size="xs" c="dimmed">Auto-sync</Text>
            </Group>
          </Stack>
          <Button 
            leftSection={<IconUpload size={16} />} 
            variant="light"
            onClick={() => router.push('/invoices/bulk-upload')}
          >
            Bulk Upload
          </Button>
          <Button leftSection={<IconPlus size={16} padding-right={8}/>} onClick={() => router.push('/invoices/create')}>Create Invoice</Button> */}
        </Group>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search invoices..."
        onRowClick={handleRowClick}
        isLoading={pageLoading}
        pageIndex={tablePagination.pageIndex}
        pageSize={tablePagination.pageSize}
        onPaginationChange={(p) => setTablePagination(p)}
        enableRowSelection={true}
        getRowId={(row) => row.id}
        onSelectionChange={setSelectedInvoiceIds}
      />

      {/* Bulk Delete Action Bar */}
      {selectedInvoiceIds.length > 0 && (
        <Paper
          p="md"
          withBorder
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            backgroundColor: 'var(--mantine-color-body)',
          }}
        >
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              {selectedInvoiceIds.length} invoice{selectedInvoiceIds.length !== 1 ? 's' : ''} selected
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                onClick={() => setSelectedInvoiceIds([])}
              >
                Clear Selection
              </Button>
              <Button
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={() => setBulkDeleteDialog({ opened: true, loading: false })}
              >
                Delete Selected
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Modal opened={xmlModal.opened} onClose={() => setXmlModal({ opened: false, content: null })} title={`UBL XML - ${xmlModal.title || ''}`} size="xl">
        <Paper p="md" bg="gray.0" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {xmlModal.content || 'No XML available'}
        </Paper>
      </Modal>

      <Modal
        opened={deleteDialog.opened}
        onClose={() => setDeleteDialog({ opened: false })}
        title={<Text fw={600}>Delete Invoice</Text>}
        centered
        overlayProps={{ blur: 2, opacity: 0.25 }}
      >
        <Stack gap="md">
          <Text size="sm">
            You are about to delete invoice <Text span fw={600}>{deleteDialog.invoice?.invoiceNumber}</Text>. This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setDeleteDialog({ opened: false })} disabled={deleteDialog.loading}>Cancel</Button>
            <Button color="red" loading={Boolean(deleteDialog.loading)}
              onClick={async () => {
                if (!deleteDialog.invoice) return
                try {
                  setDeleteDialog(prev => ({ ...prev, loading: true }))
                  const res = await fetch(`/api/invoices/${deleteDialog.invoice.id}`, { method: 'DELETE', credentials: 'include' })
                  if (res.ok) {
                    showNotification.success(
                      `Invoice ${deleteDialog.invoice.invoiceNumber} has been deleted`, 
                      'Invoice Deleted', 
                      { 
                        link: '/invoices',
                        type: 'invoice-deleted',
                        user: user ? {
                          id: user.id,
                          name: `${user.firstName} ${user.lastName}`,
                          email: user.email,
                        } : undefined,
                      }
                    )
                    setDeleteDialog({ opened: false })
                    await fetchInvoices(true)
                  } else {
                    let msg = 'Failed to delete invoice'
                    try {
                      const data = await res.json()
                      msg = data.message || data.error || msg
                    } catch {}
                    setDeleteDialog({ opened: false })
                    if (res.status === 409) {
                      showNotification.warning(msg, 'Cannot Delete Invoice')
                    } else {
                      showNotification.error(msg, 'Delete Failed')
                    }
                  }
                } catch (err) {
                  console.error('Delete invoice error:', err)
                  setDeleteDialog({ opened: false })
                  showNotification.error('Failed to delete invoice')
                }
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        opened={bulkDeleteDialog.opened}
        onClose={() => setBulkDeleteDialog({ opened: false })}
        title={<Text fw={600}>Delete Selected Invoices</Text>}
        centered
        overlayProps={{ blur: 2, opacity: 0.25 }}
      >
        <Stack gap="md">
          <Text size="sm">
            You are about to delete <Text span fw={600}>{selectedInvoiceIds.length}</Text> invoice{selectedInvoiceIds.length !== 1 ? 's' : ''}. This action cannot be undone.
            Only invoices that are in DRAFT status and not submitted to CamInvoice can be deleted.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setBulkDeleteDialog({ opened: false })} disabled={bulkDeleteDialog.loading}>Cancel</Button>
            <Button
              color="red"
              loading={Boolean(bulkDeleteDialog.loading)}
              onClick={async () => {
                try {
                  setBulkDeleteDialog(prev => ({ ...prev, loading: true }))
                  
                  // Filter invoices that can be deleted (only DRAFT and not submitted)
                  const invoicesToDelete = rows.filter(row => 
                    selectedInvoiceIds.includes(row.id) &&
                    row.status === 'DRAFT' &&
                    !row.camInvUuid &&
                    !row.camInvoiceStatus
                  )

                  if (invoicesToDelete.length === 0) {
                    showNotification.warning('No invoices can be deleted. Only DRAFT invoices that have not been submitted can be deleted.')
                    setBulkDeleteDialog({ opened: false })
                    setSelectedInvoiceIds([])
                    return
                  }

                  // Delete invoices in parallel
                  const deletePromises = invoicesToDelete.map(invoice =>
                    fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE', credentials: 'include' })
                      .then(async (res) => {
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}))
                          return { success: false, invoiceId: invoice.id, error: data.message || data.error || 'Failed to delete' }
                        }
                        return { success: true, invoiceId: invoice.id }
                      })
                      .catch((err) => ({ success: false, invoiceId: invoice.id, error: err instanceof Error ? err.message : String(err) }))
                  )

                  const results = await Promise.all(deletePromises)
                  const successful = results.filter(r => r.success).length
                  const failed = results.filter(r => !r.success).length

                  if (successful > 0) {
                    showNotification.success(`Successfully deleted ${successful} invoice${successful !== 1 ? 's' : ''}`, 'Bulk Delete Successful', { link: '/invoices' })
                  }
                  if (failed > 0) {
                    showNotification.warning(`Failed to delete ${failed} invoice${failed !== 1 ? 's' : ''}. They may have been submitted or are not in DRAFT status.`, 'Some Deletions Failed')
                  }

                  setBulkDeleteDialog({ opened: false })
                  setSelectedInvoiceIds([])
                  await fetchInvoices(true)
                } catch (err) {
                  console.error('Bulk delete invoices error:', err)
                  setBulkDeleteDialog({ opened: false })
                  showNotification.error('Failed to delete invoices')
                }
              }}
            >
              Delete Selected
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageLayout>
  )
}
