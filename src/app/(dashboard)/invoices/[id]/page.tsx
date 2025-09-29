'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Badge,
  ActionIcon,
  Tabs,
  Timeline,
  Grid,
  Paper,
  Divider,
  Table,
  Alert,
  Modal,
  TextInput,
  Textarea,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconEdit,
  IconDownload,
  IconSend,
  IconEye,
  IconFileText,
  IconQrcode,
  IconCheck,
  IconClock,
  IconX,
  IconAlertCircle,
  IconExternalLink,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDisclosure } from '@mantine/hooks'
import PageLayout from '../../../../components/layouts/PageLayout'

interface LoadedInvoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string | null
  currency: string
  status: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  camInvoiceUuid?: string | null
  verificationUrl?: string | null
  notes?: string | null
  createdAt: string
  submittedAt?: string | null
  customer?: { id: string; name: string; taxId?: string | null; address?: string | null; city?: string | null } | null
  lineItems: { id: string; description: string; quantity: any; unitPrice: any; taxRate: any; taxAmount: any; lineTotal: any }[]
  xmlContent?: string | null
}

// Build a simple timeline from invoice fields
function buildTimeline(inv?: LoadedInvoice | null) {
  if (!inv) return [] as any[]
  const items: any[] = []
  items.push({ id: 'created', title: 'Invoice Created', description: 'Invoice draft created', timestamp: inv.createdAt, status: 'completed', icon: IconFileText })
  if (inv.status?.toUpperCase() !== 'DRAFT') {
    items.push({ id: 'submitted', title: 'Submitted to CamInvoice', description: 'Submitted to CamInvoice system', timestamp: inv.submittedAt || inv.createdAt, status: 'completed', icon: IconSend, details: { uuid: inv.camInvoiceUuid, verificationLink: inv.verificationUrl } })
  }
  // Additional statuses could be appended if we persist more timestamps
  return items
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

function getTimelineItemColor(status: string) {
  switch (status) {
    case 'completed': return 'green'
    case 'in_progress': return 'orange'
    case 'pending': return 'gray'
    case 'failed': return 'red'
    default: return 'gray'
  }
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const [activeTab, setActiveTab] = useState('overview')
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)
  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) {
        const data = await res.json()
        if (mounted) setInvoice(data.invoice)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const handleResend = async () => {
    try {
      await fetch('/api/invoices/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId: id }) })
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) setInvoice((await res.json()).invoice)
    } catch (error) {
      console.error('Failed to submit invoice:', error)
    }
  }

  const handleAcceptReject = async (action: 'accept' | 'reject') => {
    try {
      // TODO: Implement accept/reject functionality
      console.log(`${action}ing invoice`)
    } catch (error) {
      console.error(`Failed to ${action} invoice:`, error)
    }
  }

  if (!invoice) {
    return (
      <PageLayout title="Invoice" subtitle="Loading..." showBackButton={false}>
        <Card withBorder>
          <Text c="dimmed">Loading invoice...</Text>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={invoice.invoiceNumber}
      subtitle={`Created on ${new Date(invoice.createdAt).toLocaleDateString()}`}
      badge={{ text: invoice.status, color: getStatusColor(invoice.status) }}
      actions={
        <>
          <Button variant="light" leftSection={<IconDownload size={16} />} component="a" href={`/api/invoices/${id}/pdf`} target="_blank">Download PDF</Button>
          <Button variant="light" leftSection={<IconEdit size={16} />} onClick={openEditModal}>Edit</Button>
          <Button leftSection={<IconSend size={16} />} onClick={handleResend}>Submit to CamInvoice</Button>
        </>
      }
    >

        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'overview')}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>Overview</Tabs.Tab>
            <Tabs.Tab value="timeline" leftSection={<IconClock size={16} />}>Timeline</Tabs.Tab>
            <Tabs.Tab value="xml" leftSection={<IconFileText size={16} />}>XML Data</Tabs.Tab>
            <Tabs.Tab value="pdf" leftSection={<IconQrcode size={16} />}>PDF Preview</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack gap="md">
                  {/* Customer Information */}
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>Customer Information</Title>
                      <Grid>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Customer Name</Text>
                          <Text fw={500}>{invoice.customer?.name || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Tax ID</Text>
                          <Text fw={500}>{(invoice.customer as any)?.taxId || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <Text size="sm" c="dimmed">Address</Text>
                          <Text fw={500}>{(invoice.customer as any)?.address || '—'}</Text>
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  </Card>

                  {/* Line Items */}
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>Line Items</Title>
                      <Table striped>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Qty</Table.Th>
                            <Table.Th>Unit Price</Table.Th>
                            <Table.Th>Tax %</Table.Th>
                            <Table.Th>Amount</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {invoice.lineItems.map((item) => (
                            <Table.Tr key={item.id}>
                              <Table.Td>{item.description}</Table.Td>
                              <Table.Td>{Number(item.quantity).toString()}</Table.Td>
                              <Table.Td>{invoice.currency} {Number(item.unitPrice).toFixed(2)}</Table.Td>
                              <Table.Td>{(Number(item.taxRate) * 100).toFixed(0)}%</Table.Td>
                              <Table.Td>{invoice.currency} {Number(item.lineTotal).toFixed(2)}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Stack>
                  </Card>

                  {/* Notes */}
                  {invoice.notes && (
                    <Card withBorder>
                      <Stack gap="md">
                        <Title order={4}>Notes</Title>
                        <Text>{invoice.notes}</Text>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="md">
                  {/* Invoice Summary */}
                  <Paper p="md" withBorder>
                    <Stack gap="sm">
                      <Title order={4}>Invoice Summary</Title>
                      <Group justify="space-between">
                        <Text>Issue Date:</Text>
                        <Text fw={500}>{invoice.issueDate}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text>Due Date:</Text>
                        <Text fw={500}>{invoice.dueDate || '—'}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text>Currency:</Text>
                        <Text fw={500}>{invoice.currency}</Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text>Subtotal:</Text>
                        <Text fw={500}>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text>Tax:</Text>
                        <Text fw={500}>{invoice.currency} {Number(invoice.taxAmount).toFixed(2)}</Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text fw={700} size="lg">Total:</Text>
                        <Text fw={700} size="lg">{invoice.currency} {Number(invoice.totalAmount).toFixed(2)}</Text>
                      </Group>
                    </Stack>
                  </Paper>

                  {/* CamInvoice Information */}
                  {invoice.camInvoiceUuid && (
                    <Paper p="md" withBorder>
                      <Stack gap="sm">
                        <Title order={4}>CamInvoice Details</Title>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">UUID:</Text>
                          <Text size="sm" fw={500}>{invoice.camInvoiceUuid}</Text>
                        </Group>
                        {invoice.verificationUrl && (
                          <Button variant="light" size="sm" leftSection={<IconExternalLink size={14} />} component="a" href={invoice.verificationUrl} target="_blank">
                            Verify on CamInvoice
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  )}

                  {/* Quick Actions */}
                  <Paper p="md" withBorder>
                    <Stack gap="sm">
                      <Title order={4}>Quick Actions</Title>
                      <Button variant="light" size="sm" color="green" onClick={() => handleAcceptReject('accept')}>
                        Accept Invoice
                      </Button>
                      <Button variant="light" size="sm" color="red" onClick={() => handleAcceptReject('reject')}>
                        Reject Invoice
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="timeline" pt="md">
            <Card withBorder>
              <Stack gap="md">
                <Title order={4}>Invoice Processing Timeline</Title>
                <Timeline active={0} bulletSize={24} lineWidth={2}>
                  {buildTimeline(invoice).map((item) => (
                    <Timeline.Item key={item.id} bullet={<item.icon size={12} />} title={item.title} color={getTimelineItemColor(item.status)}>
                      <Text c="dimmed" size="sm">{item.description}</Text>
                      {item.timestamp && (
                        <Text size="xs" mt={4} c="dimmed">{new Date(item.timestamp).toLocaleString()}</Text>
                      )}
                      {item.details && (
                        <Paper p="xs" mt="xs" bg="gray.0" radius="sm">
                          <Stack gap="xs">
                            {item.details.uuid && (<Text size="xs">UUID: {item.details.uuid}</Text>)}
                            {item.details.verificationLink && (
                              <Button size="xs" variant="subtle" component="a" href={item.details.verificationLink} target="_blank" leftSection={<IconExternalLink size={12} />}>View Verification</Button>
                            )}
                          </Stack>
                        </Paper>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="xml" pt="md">
            <Card withBorder>
              <Stack gap="md">
                <Title order={4}>UBL XML Data</Title>
                <Alert color="blue" icon={<IconAlertCircle size={16} />}>This is the UBL XML submitted to CamInvoice.</Alert>
                <Paper p="md" bg="gray.0" style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  <Text>{invoice.xmlContent || 'No XML available yet.'}</Text>
                </Paper>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="pdf" pt="md">
            <Card withBorder>
              <Stack gap="md">
                <Title order={4}>PDF Preview</Title>
                <Alert color="blue" icon={<IconAlertCircle size={16} />}>
                  PDF preview with QR code for verification will be displayed here.
                </Alert>
                <Paper p="xl" bg="gray.0" ta="center" style={{ minHeight: 400 }}>
                  <Stack gap="md" align="center">
                    <IconQrcode size={64} color="var(--mantine-color-gray-6)" />
                    <Text c="dimmed">PDF Preview will be rendered here</Text>
                    <Button leftSection={<IconDownload size={16} />}>
                      Download PDF
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>

        {/* Edit Modal - Redirect to full edit page */}
        <Modal
          opened={editModalOpened}
          onClose={closeEditModal}
          title="Edit Invoice"
          size="sm"
        >
          <Stack gap="md">
            <Alert color="blue" icon={<IconAlertCircle size={16} />}>
              <Text fw={500} mb="xs">Full Edit Mode</Text>
              <Text size="sm">
                For comprehensive invoice editing with all fields, line items, and calculations,
                you'll be redirected to the full edit page.
              </Text>
            </Alert>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  closeEditModal()
                  router.push(`/invoices/${id}/edit`)
                }}
              >
                Open Full Editor
              </Button>
            </Group>
          </Stack>
        </Modal>
    </PageLayout>
  )
}
