'use client'

import {
  Box,
  Button,
  Flex,
  Group,
  Text,
  ActionIcon,
  Badge,
  Avatar,
  Menu,
  Modal,
  Paper,
} from "@mantine/core"
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconDownload,
  IconDots,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import PageLayout from "../layouts/PageLayout"
import PageSkeleton from "../skeletons/PageSkeleton"
import { DataTable } from '../tables/DataTable'
import StatsCard from '../ui/StatsCard'
import { IconFileInvoice, IconCurrencyDollar, IconClock, IconUsers } from '@tabler/icons-react'

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
  verificationUrl?: string | null
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
    default: return 'blue'
  }
}

export default function InvoicesPage() {
  const router = useRouter()

  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [xmlModal, setXmlModal] = useState<{ opened: boolean; content: string | null; title?: string }>({ opened: false, content: null })

  const handleRowClick = (invoice: InvoiceRow) => {
    router.push(`/invoices/${invoice.id}`)
  }

  async function fetchInvoices() {
    const res = await fetch('/api/invoices', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load invoices')
    const data = await res.json()
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    const mapped: InvoiceRow[] = (data.invoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name ?? '—',
      amount: new Intl.NumberFormat(undefined, { style: 'currency', currency: inv.currency || 'USD' }).format(Number(inv.totalAmount ?? 0)),
      status: inv.status,
      date: new Date(inv.issueDate).toISOString().slice(0, 10),
      avatar: (inv.customer?.name || '??').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase(),
      camInvUuid: inv.camInvoiceUuid || null,
      verificationUrl: inv.verificationUrl || null,
    }))
    setRows(mapped)
    setStats(data.stats)
  }

  // Column definitions for the DataTable
  const columns: ColumnDef<InvoiceRow>[] = [
    { accessorKey: 'invoiceNumber', header: 'Invoice Number', cell: ({ row }) => (<Text fw={500}>{row.original.invoiceNumber}</Text>) },
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
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => (<Text fw={500}>{row.original.amount}</Text>) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (<Badge color={getStatusColor(row.original.status)} variant="light">{row.original.status}</Badge>) },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => (<Text c="dimmed">{row.original.date}</Text>) },
    { accessorKey: 'camInvUuid', header: 'CamInv UUID', cell: ({ row }) => (<Text size="sm" c="dimmed">{row.original.camInvUuid ? row.original.camInvUuid.substring(0, 12) + '...' : 'N/A'}</Text>) },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <Menu shadow="md" width={240}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm"><IconDots size={16} /></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={16} />} onClick={() => router.push(`/invoices/${row.original.id}`)}>View Details</Menu.Item>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => router.push(`/invoices/${row.original.id}/edit`)}>Edit Invoice</Menu.Item>
            <Menu.Item leftSection={<IconDownload size={16} />} component="a" href={`/api/invoices/${row.original.id}/pdf`} target="_blank">Download PDF</Menu.Item>
            <Menu.Item onClick={() => submitToCamInv(row.original.id)}>Submit to CamInvoice</Menu.Item>
            <Menu.Item onClick={() => openXml(row.original.id)}>View XML</Menu.Item>
            {row.original.verificationUrl && (
              <Menu.Item component="a" href={row.original.verificationUrl} target="_blank">View Verification Link</Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      )
    },
  ]

  const stickyContent = (
    <Flex wrap="wrap" gap="md">
      {stats && (
        <>
          <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <StatsCard title="Total Invoices" value={String(stats.totalInvoices)} icon={<IconFileInvoice size={20} />} iconColor="blue" subtitle="from last month" trend={{ value: '', type: 'up' }} />
          </Box>
          <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <StatsCard title="Total Revenue" value={new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(stats.totalRevenue || 0))} icon={<IconCurrencyDollar size={20} />} iconColor="green" subtitle="from last month" trend={{ value: '', type: 'up' }} />
          </Box>
          <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <StatsCard title="Pending Invoices" value={String(stats.pendingInvoices)} icon={<IconClock size={20} />} iconColor="orange" subtitle="from last month" trend={{ value: '', type: 'down' }} />
          </Box>
          <Box style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <StatsCard title="Active Clients" value={String(stats.activeClients)} icon={<IconUsers size={20} />} iconColor="violet" subtitle="from last month" trend={{ value: '', type: 'up' }} />
          </Box>
        </>
      )}
    </Flex>
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
      <PageLayout title="Invoices" subtitle="Manage your invoices and track CamInvoice submissions" showBackButton={false} actions={<Group><Button variant="light" leftSection={<IconDownload size={16} />} disabled>Export</Button><Button leftSection={<IconPlus size={16} />} disabled>Create Invoice</Button></Group>}>
        <PageSkeleton withStats withFilters tableColumns={7} tableRows={12} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Invoices"
      subtitle="Manage your invoices and track CamInvoice submissions"
      showBackButton={false}
      stickyContent={stickyContent}
      actions={<Group><Button variant="light" leftSection={<IconDownload size={16} />}>Export</Button><Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/invoices/create')}>Create Invoice</Button></Group>}
    >
      <DataTable columns={columns} data={rows} searchPlaceholder="Search invoices..." onRowClick={handleRowClick} />

      <Modal opened={xmlModal.opened} onClose={() => setXmlModal({ opened: false, content: null })} title={`UBL XML - ${xmlModal.title || ''}`} size="xl">
        <Paper p="md" bg="gray.0" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {xmlModal.content || 'No XML available'}
        </Paper>
      </Modal>
    </PageLayout>
  )
}
