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
  Tooltip,
  Stack,
  Collapse,
  Transition,
} from "@mantine/core"
import {
  IconPlus,
  IconHelp,
  IconChevronDown,
  IconFileInvoice,
  IconCurrencyDollar,
  IconClock,
  IconUsers,
  IconTrash,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { showNotification } from '../../utils/notifications'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'
import StatsCard from '../ui/StatsCard'

// Runtime types for table rows
interface NoteRow {
  id: string
  noteNumber: string
  type: 'Credit Note' | 'Debit Note'
  customerName: string
  amount: string
  status: string
  date: string
  avatar: string
  camInvUuid: string | null
  camInvoiceStatus?: string | null
  verificationUrl?: string | null
}

interface NoteStats {
  totalNotes: number
  totalCreditNotes: number
  totalDebitNotes: number
  totalAmount: number
  pendingNotes: number
}

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'DRAFT': return 'gray'
    case 'SUBMITTED': return 'blue'
    case 'ACCEPTED': return 'green'
    case 'REJECTED': return 'red'
    case 'CANCELLED': return 'gray'
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

export default function CreditDebitNotesPage() {
  const router = useRouter()

  const [rows, setRows] = useState<NoteRow[]>([])
  const [stats, setStats] = useState<NoteStats | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [xmlModal, setXmlModal] = useState<{ opened: boolean; content: string | null; title?: string }>({ opened: false, content: null })
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{ opened: boolean; loading?: boolean }>({ opened: false })

  // Help section state
  const [helpExpanded, setHelpExpanded] = useState(false)

  // Background polling state
  const [isPolling, setIsPolling] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true) // Default to enabled for automatic status updates

  // Determine the current page type from the pathname
  const [pageType, setPageType] = useState<'credit' | 'debit' | 'both'>('both')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname
      if (pathname.includes('/credit-notes')) {
        setPageType('credit')
      } else if (pathname.includes('/debit-notes')) {
        setPageType('debit')
      } else {
        setPageType('both')
      }
    }
  }, [])

  // Load help and auto-sync preferences from localStorage
  useEffect(() => {
    const expanded = localStorage.getItem('notes-help-expanded') === 'true'
    setHelpExpanded(expanded)
    const autoSync = localStorage.getItem('notes-auto-sync-enabled')
    // Default to true if not set, allow override from localStorage
    setAutoSyncEnabled(autoSync === null ? true : autoSync === 'true')
  }, [])

  // Save help preferences to localStorage
  const toggleHelp = () => {
    const newExpanded = !helpExpanded
    setHelpExpanded(newExpanded)
    localStorage.setItem('notes-help-expanded', String(newExpanded))
  }

  const handleRowClick = (note: NoteRow) => {
    if (note.type === 'Credit Note') {
      router.push(`/credit-notes/${note.id}`)
    } else {
      router.push(`/debit-notes/${note.id}`)
    }
  }

  async function fetchNotes(forceRefresh = false) {
    try {
      const fetchOptions: RequestInit = {
        credentials: 'include',
        // Add cache busting when force refreshing
        ...(forceRefresh && { cache: 'no-cache', headers: { 'Cache-Control': 'no-cache' } })
      }

      // Fetch both credit and debit notes in parallel
      const [creditRes, debitRes] = await Promise.all([
        fetch('/api/credit-notes?page=1&pageSize=100', fetchOptions),
        fetch('/api/debit-notes?page=1&pageSize=100', fetchOptions)
      ])
      
      // Check for unauthorized errors and redirect to login
      if (creditRes.status === 401 || debitRes.status === 401) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/credit-notes'
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        return
      }
      
      // Parse JSON responses with error handling
      const [creditData, debitData] = await Promise.all([
        creditRes.json().catch(() => ({ error: creditRes.statusText || 'Failed to parse response' })),
        debitRes.json().catch(() => ({ error: debitRes.statusText || 'Failed to parse response' }))
      ])

      // Check for unauthorized error messages (fallback check)
      const creditError = creditData?.error || ''
      const debitError = debitData?.error || ''
      if (creditError.toLowerCase().includes('unauthorized') || 
          debitError.toLowerCase().includes('unauthorized')) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/credit-notes'
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        return
      }

      if (!creditRes.ok || !creditData?.success) {
        throw new Error(creditData?.error || 'Failed to load credit notes')
      }

      if (!debitRes.ok || !debitData?.success) {
        throw new Error(debitData?.error || 'Failed to load debit notes')
      }

      // Map credit notes
      const creditNotes = (creditData.creditNotes || []).map((note: any) => {
        const customerName = note.customer?.name || 'N/A'
        const customerInitials = customerName !== 'N/A' 
          ? customerName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
          : 'CN'
        return {
          id: note.id,
          noteNumber: note.creditNoteNumber,
          type: 'Credit Note' as const,
          customerName,
          amount: new Intl.NumberFormat().format(Number(note.totalAmount ?? 0)),
          status: note.status,
          date: new Date(note.issueDate).toISOString().slice(0, 10),
          avatar: customerInitials,
          camInvUuid: note.camInvoiceUuid || null,
          camInvoiceStatus: note.camInvoiceStatus || null,
          verificationUrl: note.verificationUrl || null,
        }
      })

      // Map debit notes
      const debitNotes = (debitData.debitNotes || []).map((note: any) => {
        const customerName = note.customer?.name || 'N/A'
        const customerInitials = customerName !== 'N/A'
          ? customerName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
          : 'DN'
        return {
          id: note.id,
          noteNumber: note.debitNoteNumber,
          type: 'Debit Note' as const,
          customerName,
          amount: new Intl.NumberFormat().format(Number(note.totalAmount ?? 0)),
          status: note.status,
          date: new Date(note.issueDate).toISOString().slice(0, 10),
          avatar: customerInitials,
          camInvUuid: note.camInvoiceUuid || null,
          camInvoiceStatus: note.camInvoiceStatus || null,
          verificationUrl: note.verificationUrl || null,
        }
      })

      // Combine all notes
      const allNotes = [...creditNotes, ...debitNotes]
      
      // Sort by date descending
      allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setRows(allNotes)

      // Calculate stats
      const totalAmount = allNotes.reduce((sum, n) => sum + Number(n.amount.replace(/,/g, '')), 0)
      const pendingNotes = allNotes.filter(n => n.status === 'DRAFT' || n.status === 'SUBMITTED').length

      setStats({
        totalNotes: allNotes.length,
        totalCreditNotes: creditNotes.length,
        totalDebitNotes: debitNotes.length,
        totalAmount,
        pendingNotes,
      })

      setPageLoading(false)
    } catch (error: any) {
      // Check if error is unauthorized
      const errorMessage = error?.message || ''
      if (errorMessage.toLowerCase().includes('unauthorized')) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/credit-notes'
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        return
      }
      showNotification.error(errorMessage || 'Failed to load notes')
      setPageLoading(false)
    }
  }

  // Background status synchronization
  async function syncNoteStatuses() {
    if (!autoSyncEnabled) return
    if (isPolling) return // Prevent concurrent polling

    // Check if there are any notes with CamInvoice UUIDs to sync
    const notesWithUuids = rows.filter(row => row.camInvUuid)
    if (notesWithUuids.length === 0) {
      console.log('No notes with CamInvoice UUIDs found, skipping sync')
      return
    }

    try {
      setIsPolling(true)
      console.log(`Starting status sync for ${notesWithUuids.length} notes with CamInvoice UUIDs...`)

      // Prefer targeted syncs per document to reduce misses
      const syncTargets = notesWithUuids
        .filter(row => !['ACCEPTED', 'REJECTED', 'PAID'].includes(row.camInvoiceStatus || ''))
        .map(row => ({ 
          id: row.id, 
          uuid: row.camInvUuid!, 
          documentType: row.type === 'Credit Note' ? 'credit-note' : 'debit-note' as const
        }))

      if (syncTargets.length === 0) {
        console.log('No active notes to sync')
        return
      }

      const responses = await Promise.all(
        syncTargets.map(t => fetch('/api/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: t.id, 
            documentType: t.documentType, 
            camInvoiceUuid: t.uuid 
          }),
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
          await fetchNotes(true) // Force refresh to bypass cache
          console.log('Notes list refreshed after sync')
        } catch (fetchError) {
          console.error('Failed to refresh notes list after sync:', fetchError)
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
  const columns: ColumnDef<NoteRow>[] = [
    { accessorKey: 'index', header: 'No.', cell: ({ row }) => (<Text>{row.index + 1}</Text>) },
    { 
      accessorKey: 'camInvUuid', 
      header: 'CamInv UUID', 
      cell: ({ row }) => {
        const uuid = row.original.camInvUuid
        if (!uuid) return <Text size="sm" c="dimmed">—</Text>
        
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
      accessorKey: 'noteNumber', 
      header: 'Note No.', 
      cell: ({ row }) => (
        <Text fw={500}>{row.original.noteNumber}</Text>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge
          variant="light"
          color={row.original.type === 'Credit Note' ? 'green' : 'orange'}
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <Group gap="sm">
          <Avatar size="sm" radius="xl">{row.original.avatar}</Avatar>
          <Text>{row.original.customerName}</Text>
        </Group>
      ),
    },
    { 
      accessorKey: 'amount', 
      header: 'Total Amount', 
      cell: ({ row }) => (<Text fw={500}>KHR {row.original.amount}</Text>) 
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge color={getStatusColor(row.original.status)} variant="light">
          {row.original.status}
        </Badge>
      )
    },
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
    { 
      accessorKey: 'date', 
      header: 'Issue Date', 
      cell: ({ row }) => (<Text c="dimmed">{row.original.date}</Text>) 
    },
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
  ]

  const stickyContent = (
    <Stack gap="md">
      {/* Credit/Debit Notes Management Help */}
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
              Get Started with Credit & Debit Notes
            </Text>
            <Transition
              mounted={!helpExpanded}
              transition="fade"
              duration={200}
              timingFunction="ease"
            >
              {(styles) => (
                <Text size="xs" c="dimmed" style={styles}>
                  Click to view tips and guides on how to get started.
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
                      <Text size="xs" c="dimmed">Create new credit/debit notes from the <strong>Create Note</strong> button</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Click any note row for detailed information and management</Text>
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
                      <Text size="xs" c="dimmed"><strong>Credit Notes</strong> reduce amounts owed to customers</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed"><strong>Debit Notes</strong> increase amounts owed by customers</Text>
                    </Group>
                    <Group gap={4} align="flex-start">
                      <Text size="xs" c="dimmed" fw={500}>•</Text>
                      <Text size="xs" c="dimmed">Use search bar for quick note lookup</Text>
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
              <StatsCard 
                title="Total Notes" 
                value={String(stats.totalNotes)} 
                icon={<IconFileInvoice size={20} />} 
                iconColor="blue" 
                subtitle="from last month" 
                trend={{ value: '', type: 'up' }} 
              />
            </Box>
            <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <StatsCard 
                title="Credit Notes" 
                value={String(stats.totalCreditNotes)} 
                icon={<IconFileInvoice size={20} />} 
                iconColor="green" 
                subtitle="total issued" 
                trend={{ value: '', type: 'up' }} 
              />
            </Box>
            <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <StatsCard 
                title="Debit Notes" 
                value={String(stats.totalDebitNotes)} 
                icon={<IconFileInvoice size={20} />} 
                iconColor="orange" 
                subtitle="total issued" 
                trend={{ value: '', type: 'up' }} 
              />
            </Box>
            {/* <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Tooltip label="Total amount from all notes in KHR (Cambodian Riel)">
                <div>
                  <StatsCard 
                    title="Total Amount" 
                    value={new Intl.NumberFormat().format(Number(stats.totalAmount || 0))} 
                    icon={<IconCurrencyDollar size={20} />} 
                    iconColor="violet" 
                    subtitle="KHR (Cambodian Riel)" 
                    trend={{ value: '', type: 'up' }} 
                  />
                </div>
              </Tooltip>
            </Box> */}
          </>
        )}
      </Flex>
    </Stack>
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await fetchNotes()
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
        const hasActiveNotes = rows.some(row => 
          row.camInvUuid && 
          !['ACCEPTED', 'REJECTED', 'PAID'].includes(row.camInvoiceStatus || '')
        )
        if (hasActiveNotes) {
          console.log('Starting automatic status sync for active notes')
          syncNoteStatuses()
        }
      }, 5000)

      // Then poll with adaptive interval based on error count and note states
      const hasActiveNotes = rows.some(row =>
        row.camInvUuid &&
        !['ACCEPTED', 'REJECTED', 'PAID'].includes(row.camInvoiceStatus || '')
      )

      // Check if we have recently submitted notes (more frequent polling)
      const hasRecentlySubmitted = rows.some(row =>
        row.camInvUuid &&
        ['SUBMITTED', 'VALID'].includes(row.camInvoiceStatus || '')
      )

      const pollIntervalMs = hasRecentlySubmitted
        ? Math.min(15000 * Math.pow(2, consecutiveErrors), 60000) // 15s-1min for recent submissions
        : Math.min(30000 * Math.pow(2, consecutiveErrors), 300000) // 30s-5min for older submissions

      pollInterval = setInterval(() => {
        if (hasActiveNotes && !isPolling) {
          syncNoteStatuses()
        }
      }, pollIntervalMs)

      return () => {
        clearTimeout(initialTimeout)
        if (pollInterval) clearInterval(pollInterval)
      }
    }

    // Only start polling if we have notes and page is not loading
    if (!pageLoading && rows.length > 0 && autoSyncEnabled) {
      const cleanup = startPolling()
      return cleanup
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [rows, pageLoading, isPolling, consecutiveErrors, autoSyncEnabled])

  if (pageLoading) {
    return (
      <PageLayout 
        title="Credit & Debit Notes" 
        subtitle="Manage your credit and debit notes for CamInvoice" 
        showBackButton={false} 
        actions={
          <Group>
            {/* <Button leftSection={<IconPlus size={16} />} disabled>
              Create Note
            </Button> */}
          </Group>
        }
      >
        <PageSkeleton withStats withFilters tableColumns={7} tableRows={12} />
      </PageLayout>
    )
  }

  // Determine the create URL based on page type
  const createUrl = pageType === 'debit' ? '/debit-notes/create' : '/credit-notes/create'
  const createButtonText = pageType === 'debit' ? 'Create Debit Note' : pageType === 'credit' ? 'Create Credit Note' : 'Create Note'

  return (
    <PageLayout
      title="Credit & Debit Notes"
      subtitle="Manage your credit and debit notes for CamInvoice"
      showBackButton={false}
      stickyContent={stickyContent}
      actions={
        <Group>
          {/* <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => router.push(createUrl)}
          >
            {createButtonText}
          </Button> */}
        </Group>
      }
    >
      <DataTable 
        columns={columns} 
        data={rows} 
        searchPlaceholder="Search notes..." 
        onRowClick={handleRowClick} 
        isLoading={pageLoading}
        enableRowSelection={true}
        getRowId={(row) => row.id}
        onSelectionChange={setSelectedNoteIds}
      />

      {/* Bulk Delete Action Bar */}
      {selectedNoteIds.length > 0 && (
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
              {selectedNoteIds.length} note{selectedNoteIds.length !== 1 ? 's' : ''} selected
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                onClick={() => setSelectedNoteIds([])}
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

      <Modal 
        opened={xmlModal.opened} 
        onClose={() => setXmlModal({ opened: false, content: null })} 
        title={`UBL XML - ${xmlModal.title || ''}`} 
        size="xl"
      >
        <Paper p="md" bg="gray.0" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {xmlModal.content || 'No XML available'}
        </Paper>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        opened={bulkDeleteDialog.opened}
        onClose={() => setBulkDeleteDialog({ opened: false })}
        title={<Text fw={600}>Delete Selected Notes</Text>}
        centered
        overlayProps={{ blur: 2, opacity: 0.25 }}
      >
        <Stack gap="md">
          <Text size="sm">
            You are about to delete <Text span fw={600}>{selectedNoteIds.length}</Text> note{selectedNoteIds.length !== 1 ? 's' : ''}. This action cannot be undone.
            Only notes that are in DRAFT status and not submitted to CamInvoice can be deleted.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setBulkDeleteDialog({ opened: false })} disabled={bulkDeleteDialog.loading}>Cancel</Button>
            <Button
              color="red"
              loading={Boolean(bulkDeleteDialog.loading)}
              onClick={async () => {
                try {
                  setBulkDeleteDialog(prev => ({ ...prev, loading: true }))
                  
                  // Filter notes that can be deleted (only DRAFT and not submitted)
                  const notesToDelete = rows.filter(row => 
                    selectedNoteIds.includes(row.id) &&
                    row.status === 'DRAFT' &&
                    !row.camInvUuid &&
                    !row.camInvoiceStatus
                  )

                  if (notesToDelete.length === 0) {
                    showNotification.warning('No notes can be deleted. Only DRAFT notes that have not been submitted can be deleted.')
                    setBulkDeleteDialog({ opened: false })
                    setSelectedNoteIds([])
                    return
                  }

                  // Delete notes in parallel, handling both credit and debit notes
                  const deletePromises = notesToDelete.map(note => {
                    const endpoint = note.type === 'Credit Note' 
                      ? `/api/credit-notes/${note.id}` 
                      : `/api/debit-notes/${note.id}`
                    
                    return fetch(endpoint, { method: 'DELETE', credentials: 'include' })
                      .then(async (res) => {
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}))
                          return { success: false, noteId: note.id, error: data.message || data.error || 'Failed to delete' }
                        }
                        return { success: true, noteId: note.id }
                      })
                      .catch((err) => ({ success: false, noteId: note.id, error: err.message }))
                  })

                  const results = await Promise.all(deletePromises)
                  const successful = results.filter(r => r.success).length
                  const failed = results.filter(r => !r.success).length

                  if (successful > 0) {
                    showNotification.success(`Successfully deleted ${successful} note${successful !== 1 ? 's' : ''}`, 'Bulk Delete Successful', { link: '/credit-notes' })
                  }
                  if (failed > 0) {
                    showNotification.warning(`Failed to delete ${failed} note${failed !== 1 ? 's' : ''}. They may have been submitted or are not in DRAFT status.`, 'Some Deletions Failed')
                  }

                  setBulkDeleteDialog({ opened: false })
                  setSelectedNoteIds([])
                  await fetchNotes(true)
                } catch (err) {
                  console.error('Bulk delete notes error:', err)
                  setBulkDeleteDialog({ opened: false })
                  showNotification.error('Failed to delete notes')
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

