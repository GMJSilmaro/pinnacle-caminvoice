'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Badge,
  Grid,
  Table,
  Paper,
  Divider,
  Alert,
  Tabs,
  Timeline,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconEdit,
  IconSend,
  IconInfoCircle,
  IconExternalLink,
  IconFileText,
  IconEye,
  IconCopy,
  IconAlertCircle,
  IconDownload,
  IconCheck,
  IconQrcode,
  IconClock,
  IconLoader,
  IconX,
  IconCurrencyDollar,
} from '@tabler/icons-react'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../utils/notifications'

function getStatusColor(status: string) {
  switch (status) {
    case 'DRAFT': return 'gray'
    case 'SUBMITTED': return 'blue'
    case 'ACCEPTED': return 'green'
    case 'REJECTED': return 'red'
    case 'CANCELLED': return 'orange'
    default: return 'gray'
  }
}

function getCamInvoiceStatusColor(status: string) {
  switch (status) {
    case 'VALID': return 'green'
    case 'DELIVERED': return 'teal'
    case 'REJECTED': return 'red'
    case 'PENDING': return 'yellow'
    case 'PROCESSING': return 'blue'
    case 'PAID': return 'teal'
    default: return 'gray'
  }
}

function getTimelineItemColor(status: string) {
  switch (status) {
    case 'completed': return 'green'
    case 'in_progress': return 'orange'
    case 'pending': return 'gray'
    case 'error': return 'red'
    default: return 'gray'
  }
}

// Build a comprehensive timeline showing all workflow steps
function buildTimeline(note?: any) {
  if (!note) return [] as any[]

  const items: any[] = []

  // 1. Credit Note Created (always completed)
  items.push({
    id: 'created',
    title: 'Credit Note Created',
    description: 'Credit note draft created',
    timestamp: note.createdAt,
    status: 'completed',
    icon: IconFileText
  })

  // 2. Submitted to CamInvoice
  const isSubmitted = note.status?.toUpperCase() !== 'DRAFT'
  items.push({
    id: 'submitted',
    title: 'Submitted to CamInvoice',
    description: isSubmitted
      ? 'Submitted to CamInvoice system'
      : 'Waiting for submission to CamInvoice',
    timestamp: isSubmitted ? (note.submittedAt || note.createdAt) : undefined,
    status: isSubmitted ? 'completed' : 'pending',
    icon: IconSend,
    details: isSubmitted && note.camInvoiceUuid ? {
      uuid: note.camInvoiceUuid,
      verificationLink: note.verificationUrl
    } : undefined
  })

  // 3. CamInvoice Processing
  const hasStatus = !!note.camInvoiceStatus
  const isProcessing = isSubmitted && !hasStatus
  items.push({
    id: 'processing',
    title: 'CamInvoice Processing',
    description: isProcessing
      ? 'Processing by CamInvoice system...'
      : hasStatus
        ? 'Processed by CamInvoice system'
        : 'Waiting for CamInvoice processing',
    timestamp: hasStatus ? (note.camInvoiceStatusUpdatedAt || note.submittedAt) : undefined,
    status: isProcessing ? 'in_progress' : hasStatus ? 'completed' : 'pending',
    icon: isProcessing ? IconLoader : hasStatus ? IconCheck : IconClock
  })

  // 4. CamInvoice Validation
  if (isSubmitted) {
    const isValidated = ['VALID', 'DELIVERED', 'ACCEPTED', 'PAID'].includes(note.camInvoiceStatus || '')
    const isRejected = note.camInvoiceStatus === 'REJECTED'
    const validationStatus = isValidated ? 'completed' : isRejected ? 'error' : 'pending'
    const validationIcon = isValidated ? IconCheck : isRejected ? IconX : IconClock
    const validationDesc = isValidated
      ? `Credit note validated - Status: ${note.camInvoiceStatus}`
      : isRejected
        ? `Credit note rejected - Status: ${note.camInvoiceStatus}`
        : hasStatus
          ? `Validation pending - Status: ${note.camInvoiceStatus}`
          : 'Waiting for CamInvoice validation'

    items.push({
      id: 'validation',
      title: 'CamInvoice Validation',
      description: validationDesc,
      timestamp: hasStatus ? (note.camInvoiceStatusUpdatedAt || note.submittedAt) : undefined,
      status: validationStatus,
      icon: validationIcon,
      details: note.verificationUrl ? { verificationLink: note.verificationUrl } : undefined
    })
  }

  // 5. Customer Delivery
  const canDeliver = ['VALID', 'DELIVERED'].includes(note.camInvoiceStatus || '')
  const isDelivered = note.deliveryStatus === 'DELIVERED'
  const deliveryFailed = note.deliveryStatus === 'FAILED'
  const deliveryPending = note.deliveryStatus === 'PENDING'

  let deliveryStatus = 'pending'
  let deliveryIcon = IconClock
  let deliveryDesc = 'Waiting for CamInvoice validation before delivery'

  if (isDelivered) {
    deliveryStatus = 'completed'
    deliveryIcon = IconCheck
    deliveryDesc = `Delivered via ${note.deliveryMethod || 'unknown method'}`
  } else if (deliveryFailed) {
    deliveryStatus = 'error'
    deliveryIcon = IconX
    deliveryDesc = `Delivery failed: ${note.deliveryError || 'Unknown error'}`
  } else if (deliveryPending && canDeliver) {
    deliveryStatus = 'in_progress'
    deliveryIcon = IconLoader
    deliveryDesc = 'Pending to be delivered to customer'
  } else if (!canDeliver && isSubmitted) {
    deliveryDesc = 'Waiting for CamInvoice validation before delivery'
  }

  items.push({
    id: 'delivery',
    title: 'Customer Delivery',
    description: deliveryDesc,
    timestamp: note.deliveredAt,
    status: deliveryStatus,
    icon: deliveryIcon
  })

  return items
}

// Calculate the active step for timeline (last completed or current in-progress step)
function getActiveTimelineStep(items: any[]): number {
  let activeStep = 0

  for (let i = 0; i < items.length; i++) {
    if (items[i].status === 'completed') {
      activeStep = i
    } else if (items[i].status === 'in_progress') {
      activeStep = i
      break // Stop at first in-progress step
    } else {
      break // Stop at first pending step
    }
  }

  return activeStep
}

// Utility function to format XML with proper indentation
const formatXML = (xml: string): string => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'application/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      return xml; // Return original if parsing fails
    }

    const serializer = new XMLSerializer();
    const formatted = serializer.serializeToString(xmlDoc);

    // Add proper indentation
    let result = '';
    let indent = 0;
    const tab = '  '; // 2 spaces for indentation

    formatted.split(/>\s*</).forEach((node, index) => {
      if (index > 0) result += '<';

      if (node.match(/^\/\w/)) {
        indent--;
      }

      result += tab.repeat(Math.max(0, indent)) + node;

      if (node.match(/^<?\w[^>]*[^\/]$/)) {
        indent++;
      }

      if (index < formatted.split(/>\s*</).length - 1) {
        result += '>\n';
      }
    });

    return result;
  } catch (error) {
    // If formatting fails, return original XML
    return xml;
  }
};

export default function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [creditNote, setCreditNote] = useState<any>(null)
  const [lineItems, setLineItems] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showFormattedXML, setShowFormattedXML] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const [noteRes, itemsRes] = await Promise.all([
          fetch(`/api/credit-notes/${id}`, { credentials: 'include' }),
          fetch(`/api/credit-notes/${id}/line-items`, { credentials: 'include' }),
        ])
        
        if (noteRes.ok) {
          const noteData = await noteRes.json()
          if (mounted && noteData.success) {
            setCreditNote(noteData.creditNote)
          }
        }
        
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          if (mounted && itemsData.success) {
            setLineItems(itemsData.items || [])
          }
        }
      } catch (error) {
        console.error('Failed to load credit note:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const handleSubmit = async () => {
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/credit-notes/${id}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Reload the credit note
        const noteRes = await fetch(`/api/credit-notes/${id}`, { credentials: 'include' })
        if (noteRes.ok) {
          const noteData = await noteRes.json()
          if (noteData.success) {
            setCreditNote(noteData.creditNote)
          }
        }
        const creditNoteNumber = creditNote?.creditNoteNumber || 'Unknown'
        showNotification.success('Credit note has been submitted to CamInvoice successfully', 'Submission Successful', { link: `/credit-notes/${id}` })
      } else {
        // Show error details
        console.error('Credit note submission failed:', data)
        const errorMessage = data.error || 'Unknown error'
        const details = data.details ? ` ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}` : ''
        showNotification.error(`${errorMessage}${details}`, 'Submission Failed', { link: `/credit-notes/${id}` })
      }
    } catch (error) {
      console.error('Failed to submit credit note:', error)
      showNotification.error(error instanceof Error ? error.message : 'Unknown error', 'Submission Error', { link: `/credit-notes/${id}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Credit Note" subtitle="Loading...">
        <Card withBorder>
          <Text c="dimmed">Loading credit note...</Text>
        </Card>
      </PageLayout>
    )
  }

  if (!creditNote) {
    return (
      <PageLayout title="Credit Note" subtitle="Not Found">
        <Card withBorder>
          <Alert color="red" icon={<IconInfoCircle size={16} />}>
            Credit note not found
          </Alert>
          <Button mt="md" variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => router.push('/credit-notes')}>
            Back to Credit Notes
          </Button>
        </Card>
      </PageLayout>
    )
  }

  const isDraft = creditNote.status === 'DRAFT'
  const canEdit = isDraft
  const canSubmit = isDraft || creditNote.status === 'REJECTED'

  return (
    <PageLayout
      title={creditNote.creditNoteNumber}
      subtitle={`${creditNote.type === 'CREDIT_NOTE' ? 'Credit' : 'Debit'} Note - Created on ${new Date(creditNote.createdAt).toLocaleDateString()}`}
      badge={{
        text: creditNote.camInvoiceStatus || creditNote.status,
        color: creditNote.camInvoiceStatus 
          ? getCamInvoiceStatusColor(creditNote.camInvoiceStatus) 
          : getStatusColor(creditNote.status)
      }}
      actions={
        <>
          {canEdit && (
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={() => router.push(`/credit-notes/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          {canSubmit && (
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit to CamInvoice'}
            </Button>
          )}
        </>
      }
    >
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'overview')}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>Overview</Tabs.Tab>
          <Tabs.Tab value="timeline" leftSection={<IconClock size={16} />}>Timeline</Tabs.Tab>
          <Tabs.Tab value="xml" leftSection={<IconFileText size={16} />}>XML Data</Tabs.Tab>
          <Tabs.Tab value="pdf" leftSection={<IconQrcode size={16} />}>Official CamInvoice PDF</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                {/* Original Invoice Reference - CRITICAL */}
                {creditNote.originalInvoice && (
                  <Card withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" align="center">
                        <Title order={4}>Original Invoice Reference</Title>
                        <Badge color="blue" variant="light">Required for Submission</Badge>
                      </Group>
                      <Grid>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Invoice Number</Text>
                          <Text fw={500}>{creditNote.originalInvoice.invoiceNumber}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Issue Date</Text>
                          <Text fw={500}>{new Date(creditNote.originalInvoice.issueDate).toLocaleDateString()}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Amount</Text>
                          <Text fw={500}>{creditNote.originalInvoice.currency} {Number(creditNote.originalInvoice.totalAmount).toFixed(2)}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Status</Text>
                          <Badge color={getStatusColor(creditNote.originalInvoice.status)} variant="light">
                            {creditNote.originalInvoice.status}
                          </Badge>
                        </Grid.Col>
                        {creditNote.originalInvoice.camInvoiceUuid && (
                          <Grid.Col span={12}>
                            <Text size="sm" c="dimmed">CamInvoice UUID</Text>
                            <Text fw={500} size="sm" style={{ wordBreak: 'break-all' }}>
                              {creditNote.originalInvoice.camInvoiceUuid}
                            </Text>
                          </Grid.Col>
                        )}
                        <Grid.Col span={12}>
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconExternalLink size={14} />}
                            onClick={() => router.push(`/invoices/${creditNote.originalInvoice.id}`)}
                            fullWidth
                          >
                            View Original Invoice
                          </Button>
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  </Card>
                )}

                {!creditNote.originalInvoice && creditNote.originalInvoiceId && (
                  <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                    <Text fw={500}>Original Invoice Reference Missing</Text>
                    <Text size="sm" mt="xs">
                      This credit note references an invoice (ID: {creditNote.originalInvoiceId}) but the invoice details could not be loaded.
                      The credit note requires a valid invoice reference to be submitted to CamInvoice.
                    </Text>
                  </Alert>
                )}

                {!creditNote.originalInvoiceId && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    <Text fw={500}>Original Invoice Reference Required</Text>
                    <Text size="sm" mt="xs">
                      This credit note must be linked to an original invoice before it can be submitted to CamInvoice.
                      Please edit the credit note and link it to an invoice.
                    </Text>
                  </Alert>
                )}

                {/* Customer Information */}
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>Customer Information</Title>
                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Customer Name</Text>
                        <Text fw={500}>{creditNote.customer?.name || '—'}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Tax ID / Member ID</Text>
                        <Text fw={500}>{creditNote.customer?.taxId || '—'}</Text>
                      </Grid.Col>
                      {creditNote.customer?.registrationNumber && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">VATTIN</Text>
                          <Text fw={500}>{creditNote.customer.registrationNumber}</Text>
                        </Grid.Col>
                      )}
                      <Grid.Col span={12}>
                        <Text size="sm" c="dimmed">Email Address</Text>
                        <Text fw={500}>{creditNote.customer?.email || '—'}</Text>
                      </Grid.Col>
                      {creditNote.customer?.phone && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Phone Number</Text>
                          <Text fw={500}>{creditNote.customer.phone}</Text>
                        </Grid.Col>
                      )}
                      {creditNote.customer?.city && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">City</Text>
                          <Text fw={500}>{creditNote.customer.city}</Text>
                        </Grid.Col>
                      )}
                      {creditNote.customer?.country && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Country</Text>
                          <Text fw={500}>{creditNote.customer.country}</Text>
                        </Grid.Col>
                      )}
                      {creditNote.customer?.postalCode && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Postal Code</Text>
                          <Text fw={500}>{creditNote.customer.postalCode}</Text>
                        </Grid.Col>
                      )}
                      {creditNote.customer?.address && (
                        <Grid.Col span={12}>
                          <Text size="sm" c="dimmed">Address</Text>
                          <Text fw={500}>{creditNote.customer.address}</Text>
                        </Grid.Col>
                      )}
                    </Grid>
                  </Stack>
                </Card>

                {/* Line Items */}
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>Line Items</Title>
                    {lineItems.length > 0 ? (
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
                          {lineItems.map((item: any) => (
                            <Table.Tr key={item.id}>
                              <Table.Td>{item.description}</Table.Td>
                              <Table.Td>{Number(item.quantity).toFixed(3)}</Table.Td>
                              <Table.Td>{creditNote.currency} {Number(item.unitPrice).toFixed(2)}</Table.Td>
                              <Table.Td>{(Number(item.taxRate) * 100).toFixed(0)}%</Table.Td>
                              <Table.Td>{creditNote.currency} {Number(item.lineTotal).toFixed(2)}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed">No line items</Text>
                    )}
                  </Stack>
                </Card>

                {/* Reference Information */}
                {(creditNote.reason || creditNote.notes) && (
                  <Card withBorder>
                    <Stack gap="md">
                      <Title order={4}>Reference Information</Title>
                      {creditNote.reason && (
                        <div>
                          <Text size="sm" c="dimmed">Reason</Text>
                          <Text fw={500}>{creditNote.reason}</Text>
                        </div>
                      )}
                      {creditNote.notes && (
                        <div>
                          <Text size="sm" c="dimmed">Notes</Text>
                          <Text>{creditNote.notes}</Text>
                        </div>
                      )}
                    </Stack>
                  </Card>
                )}


                {/* Metadata */}
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>Metadata</Title>
                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Created At</Text>
                        <Text fw={500}>{new Date(creditNote.createdAt).toLocaleString()}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Updated At</Text>
                        <Text fw={500}>{new Date(creditNote.updatedAt).toLocaleString()}</Text>
                      </Grid.Col>
                      {creditNote.submittedAt && (
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Submitted At</Text>
                          <Text fw={500}>{new Date(creditNote.submittedAt).toLocaleString()}</Text>
                        </Grid.Col>
                      )}
                    </Grid>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                {/*Note Summary */}
                <Paper p="md" withBorder>
                  <Stack gap="sm">
                    <Title order={4}>Note Summary</Title>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Issue Date:</Text>
                      <Text fw={500}>{new Date(creditNote.issueDate).toLocaleDateString()}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Currency:</Text>
                      <Text fw={500}>{creditNote.currency}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Status:</Text>
                      <Badge color={getStatusColor(creditNote.status)} variant="light">
                        {creditNote.status}
                      </Badge>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Subtotal:</Text>
                      <Text fw={500}>{creditNote.currency} {Number(creditNote.subtotal).toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Tax:</Text>
                      <Text fw={500}>{creditNote.currency} {Number(creditNote.taxAmount).toFixed(2)}</Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text fw={700} size="lg">Total:</Text>
                      <Text fw={700} size="lg" c="green">
                        {creditNote.currency} {Number(creditNote.totalAmount).toFixed(2)}
                      </Text>
                    </Group>
                  </Stack>
                </Paper>

                {/* CamInvoice Information */}
                {creditNote.camInvoiceUuid && (
                  <Paper p="md" withBorder>
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Title order={4}>CamInvoice Details</Title>
                        {creditNote.camInvoiceStatus && (
                          <Badge
                            color={getCamInvoiceStatusColor(creditNote.camInvoiceStatus)}
                            variant="light"
                            size="sm"
                          >
                            {creditNote.camInvoiceStatus}
                          </Badge>
                        )}
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">UUID:</Text>
                        <Text size="sm" fw={500} style={{ wordBreak: 'break-all' }}>
                          {creditNote.camInvoiceUuid}
                        </Text>
                      </Group>
                      {creditNote.camInvoiceStatusUpdatedAt && (
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">Status Updated:</Text>
                          <Text size="sm" fw={500}>
                            {new Date(creditNote.camInvoiceStatusUpdatedAt).toLocaleString()}
                          </Text>
                        </Group>
                      )}
                      {creditNote.verificationUrl && (
                        <Button
                          variant="light"
                          size="sm"
                          leftSection={<IconExternalLink size={14} />}
                          component="a"
                          href={creditNote.verificationUrl.includes('localhost')
                            ? creditNote.verificationUrl.replace(/https?:\/\/localhost:\d+/, 'https://sandbox.e-invoice.gov.kh')
                            : creditNote.verificationUrl
                          }
                          target="_blank"
                          fullWidth
                        >
                          Verify on CamInvoice
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="timeline" pt="md">
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Credit Note Processing Timeline</Title>
              {(() => {
                const timelineItems = buildTimeline(creditNote)
                const activeStep = getActiveTimelineStep(timelineItems)

                return (
                  <Timeline active={activeStep} bulletSize={24} lineWidth={2}>
                    {timelineItems.map((item) => (
                      <Timeline.Item
                        key={item.id}
                        bullet={<item.icon size={12} />}
                        title={item.title}
                        color={getTimelineItemColor(item.status)}
                      >
                        <Text c="dimmed" size="sm">{item.description}</Text>
                        {item.timestamp && (
                          <Text size="xs" mt={4} c="dimmed">
                            {new Date(item.timestamp).toLocaleString()}
                          </Text>
                        )}
                        {item.details && (
                          <Paper p="xs" mt="xs" bg="gray.0" radius="sm">
                            <Stack gap="xs">
                              {item.details.uuid && (
                                <Text size="xs">UUID: {item.details.uuid}</Text>
                              )}
                              {item.details.verificationLink && (
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  component="a"
                                  href={item.details.verificationLink}
                                  target="_blank"
                                  leftSection={<IconExternalLink size={12} />}
                                >
                                  View Verification
                                </Button>
                              )}
                            </Stack>
                          </Paper>
                        )}
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )
              })()}
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="xml" pt="md">
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Title order={4}>UBL XML Data</Title>
                {creditNote.xmlContent && (
                  <Group gap="xs">
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setShowFormattedXML(!showFormattedXML)}
                    >
                      {showFormattedXML ? 'Raw' : 'Formatted'}
                    </Button>
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconCopy size={14} />}
                      onClick={() => {
                        navigator.clipboard.writeText(creditNote.xmlContent || '');
                      }}
                    >
                      Copy XML
                    </Button>
                  </Group>
                )}
              </Group>

              <Alert color="blue" icon={<IconAlertCircle size={16} />}>
                This is the UBL XML submitted to CamInvoice.
              </Alert>

              {creditNote.xmlContent ? (
                <Paper
                  p="md"
                  bg="gray.0"
                  style={{
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    overflow: 'auto',
                    maxHeight: '600px',
                    border: '1px solid #e9ecef',
                    borderRadius: '4px'
                  }}
                >
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: '#495057'
                  }}>
                    {showFormattedXML ? formatXML(creditNote.xmlContent) : creditNote.xmlContent}
                  </pre>
                </Paper>
              ) : (
                <Paper p="xl" bg="gray.1" ta="center">
                  <Text c="dimmed" size="sm">No XML content available yet.</Text>
                  <Text c="dimmed" size="xs" mt="xs">XML will be generated when the credit note is submitted to CamInvoice.</Text>
                </Paper>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="pdf" pt="md">
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>PDF Viewer</Title>
                {creditNote.camInvoiceUuid && (
                  <Button
                    leftSection={<IconDownload size={16} />}
                    variant="light"
                    component="a"
                    href={`/api/credit-notes/${id}/pdf`}
                    target="_blank"
                  >
                    Download PDF
                  </Button>
                )}
              </Group>

              {creditNote.camInvoiceUuid ? (
                <>
                  <Alert color="green" icon={<IconCheck size={16} />}>
                    Official PDF from CamInvoice with QR code for verification.
                  </Alert>
                  <Paper withBorder style={{ minHeight: 600, overflow: 'hidden', position: 'relative' }}>
                    <iframe
                      src={`/api/credit-notes/${id}/pdf`}
                      style={{
                        width: '100%',
                        height: '600px',
                        border: 'none',
                        borderRadius: 'var(--mantine-radius-md)',
                        display: 'block'
                      }}
                      title="Official CamInvoice PDF Preview"
                      loading="lazy"
                    />
                    {/* Fallback message for browsers that don't support PDF viewing */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      zIndex: -1
                    }}>
                      <Text c="dimmed" size="sm">
                        If PDF doesn't display, please use the Download PDF button above.
                      </Text>
                    </div>
                  </Paper>
                </>
              ) : (
                <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                  <Stack gap="sm">
                    <Text fw={500}>Credit note not submitted to CamInvoice yet</Text>
                    <Text size="sm">
                      The official PDF will be available after submitting the credit note to CamInvoice.
                      Please submit the credit note first to view the official PDF with QR code.
                    </Text>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </PageLayout>
  )
}
