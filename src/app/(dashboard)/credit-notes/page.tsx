'use client'

import {
  Container,
  Title,
  Button,
  Badge,
  Group,
  Stack,
  Text,
  ActionIcon,
  Menu,
} from '@mantine/core'
import {
  IconPlus,
  IconDots,
  IconEye,
  IconDownload,
  IconSend,
  IconFileText,
} from '@tabler/icons-react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../../../components/tables/DataTable'
import PageLayout from '../../../components/layouts/PageLayout'

// Mock data for credit/debit notes
interface CreditNote {
  id: number
  noteNo: string
  type: 'Credit Note' | 'Debit Note'
  customer: string
  amount: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  date: string
  uuid: string | null
}

const mockCreditNotes: CreditNote[] = [
  {
    id: 1,
    noteNo: 'CN-001',
    type: 'Credit Note',
    customer: 'ABC Corporation',
    amount: 150.00,
    status: 'sent',
    date: '2024-01-15',
    uuid: 'cam-cn-uuid-001',
  },
  {
    id: 2,
    noteNo: 'DN-001',
    type: 'Debit Note',
    customer: 'XYZ Limited',
    amount: 75.50,
    status: 'draft',
    date: '2024-01-14',
    uuid: null,
  },
  {
    id: 3,
    noteNo: 'CN-002',
    type: 'Credit Note',
    customer: 'DEF Industries',
    amount: 200.00,
    status: 'accepted',
    date: '2024-01-13',
    uuid: 'cam-cn-uuid-002',
  },
  {
    id: 4,
    noteNo: 'CN-003',
    type: 'Credit Note',
    customer: 'GHI Enterprises',
    amount: 320.75,
    status: 'rejected',
    date: '2024-01-12',
    uuid: 'cam-cn-uuid-003',
  },
  {
    id: 5,
    noteNo: 'DN-002',
    type: 'Debit Note',
    customer: 'JKL Solutions',
    amount: 89.25,
    status: 'draft',
    date: '2024-01-11',
    uuid: null,
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'gray'
    case 'sent': return 'blue'
    case 'accepted': return 'green'
    case 'rejected': return 'red'
    default: return 'gray'
  }
}

export default function CreditNotesPage() {
  const columns: ColumnDef<CreditNote>[] = [
    {
      accessorKey: 'noteNo',
      header: 'Note No.',
      cell: ({ row }) => (
        <Text fw={500}>{row.getValue('noteNo')}</Text>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge
          variant="light"
          color={row.getValue('type') === 'Credit Note' ? 'green' : 'orange'}
        >
          {row.getValue('type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <Text>${(row.getValue('amount') as number).toFixed(2)}</Text>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge color={getStatusColor(status)} variant="light">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
    },
    {
      accessorKey: 'uuid',
      header: 'CamInv UUID',
      cell: ({ row }) => {
        const uuid = row.getValue('uuid') as string | null
        return uuid ? (
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
            {uuid.substring(0, 12)}...
          </Text>
        ) : (
          <Text size="xs" c="dimmed">—</Text>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const note = row.original
        return (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEye size={14} />}>
                View Details
              </Menu.Item>
              <Menu.Item leftSection={<IconFileText size={14} />}>
                View XML
              </Menu.Item>
              <Menu.Item leftSection={<IconDownload size={14} />}>
                Download PDF
              </Menu.Item>
              {note.status === 'draft' && (
                <Menu.Item leftSection={<IconSend size={14} />}>
                  Submit to CamInv
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )
      },
    },
  ]

  const handleRowClick = (note: CreditNote) => {
    console.log('Clicked note:', note)
    // TODO: Navigate to note details page
  }

  return (
    <PageLayout
      title="Credit & Debit Notes"
      subtitle="Manage your credit and debit notes for CamInvoice"
      showBackButton={false}
      actions={
        <Button leftSection={<IconPlus size={16} />}>
          Create Note
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={mockCreditNotes}
        searchPlaceholder="Search notes..."
        onRowClick={handleRowClick}
      />
    </PageLayout>
  )
}
