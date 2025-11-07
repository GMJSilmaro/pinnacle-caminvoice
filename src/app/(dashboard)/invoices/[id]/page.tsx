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
  Menu,
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
  IconMail,
  IconCopy,
  IconCurrencyDollar,
  IconLoader,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDisclosure } from '@mantine/hooks'
import { showNotification } from '../../../../utils/notifications'
import { useAuth } from '../../../../hooks/useAuth'
import PageLayout from '../../../../components/layouts/PageLayout'

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
  camInvoiceStatus?: string | null
  camInvoiceStatusUpdatedAt?: string | null
  verificationUrl?: string | null
  deliveryStatus?: string | null
  deliveryMethod?: string | null
  deliveredAt?: string | null
  deliveryError?: string | null
  notes?: string | null
  terms?: string | null
  createdAt: string
  submittedAt?: string | null
  customer?: { id: string; name: string; taxId?: string | null; address?: string | null; city?: string | null; country?: string | null; postalCode?: string | null; email?: string | null; phone?: string | null; camInvoiceEndpointId?: string | null; } | null
  lineItems: { id: string; description: string; quantity: any; unitPrice: any; taxRate: any; taxAmount: any; lineTotal: any }[]
  xmlContent?: string | null
}

// Build a comprehensive timeline showing all workflow steps
function buildTimeline(inv?: LoadedInvoice | null) {
  if (!inv) return [] as any[]

  const items: any[] = []

  // 1. Invoice Created (always completed)
  items.push({
    id: 'created',
    title: 'Invoice Created',
    description: 'Invoice draft created',
    timestamp: inv.createdAt,
    status: 'completed',
    icon: IconFileText
  })

  // 2. Submitted to CamInvoice
  const isSubmitted = inv.status?.toUpperCase() !== 'DRAFT'
  items.push({
    id: 'submitted',
    title: 'Submitted to CamInvoice',
    description: isSubmitted
      ? 'Submitted to CamInvoice system'
      : 'Waiting for submission to CamInvoice',
    timestamp: isSubmitted ? (inv.submittedAt || inv.createdAt) : undefined,
    status: isSubmitted ? 'completed' : 'pending',
    icon: IconSend,
    details: isSubmitted && inv.camInvoiceUuid ? {
      uuid: inv.camInvoiceUuid,
      verificationLink: inv.verificationUrl
    } : undefined
  })

  // 3. CamInvoice Processing
  const hasStatus = !!inv.camInvoiceStatus
  const isProcessing = isSubmitted && !hasStatus
  items.push({
    id: 'processing',
    title: 'CamInvoice Processing',
    description: isProcessing
      ? 'Processing by CamInvoice system...'
      : hasStatus
        ? 'Processed by CamInvoice system'
        : 'Waiting for CamInvoice processing',
    timestamp: hasStatus ? (inv.camInvoiceStatusUpdatedAt || inv.submittedAt) : undefined,
    status: isProcessing ? 'in_progress' : hasStatus ? 'completed' : 'pending',
    icon: isProcessing ? IconLoader : hasStatus ? IconCheck : IconClock
  })

  // 4. CamInvoice Validation
  if (isSubmitted) {
    const isValidated = ['VALID', 'DELIVERED', 'ACCEPTED', 'PAID'].includes(inv.camInvoiceStatus || '')
    const isRejected = inv.camInvoiceStatus === 'REJECTED'
    const validationStatus = isValidated ? 'completed' : isRejected ? 'error' : 'pending'
    const validationIcon = isValidated ? IconCheck : isRejected ? IconX : IconClock
    const validationDesc = isValidated
      ? `Invoice validated - Status: ${inv.camInvoiceStatus}`
      : isRejected
        ? `Invoice rejected - Status: ${inv.camInvoiceStatus}`
        : hasStatus
          ? `Validation pending - Status: ${inv.camInvoiceStatus}`
          : 'Waiting for CamInvoice validation'

    items.push({
      id: 'validation',
      title: 'CamInvoice Validation',
      description: validationDesc,
      timestamp: hasStatus ? (inv.camInvoiceStatusUpdatedAt || inv.submittedAt) : undefined,
      status: validationStatus,
      icon: validationIcon,
      details: inv.verificationUrl ? { verificationLink: inv.verificationUrl } : undefined
    })
  }

  // 5. Customer Delivery
  const canDeliver = ['VALID', 'DELIVERED'].includes(inv.camInvoiceStatus || '')
  const isDelivered = inv.deliveryStatus === 'DELIVERED'
  const deliveryFailed = inv.deliveryStatus === 'FAILED'
  const deliveryPending = inv.deliveryStatus === 'PENDING'

  let deliveryStatus = 'pending'
  let deliveryIcon = IconClock
  let deliveryDesc = 'Waiting for CamInvoice validation before delivery'

  if (isDelivered) {
    deliveryStatus = 'completed'
    deliveryIcon = IconCheck
    deliveryDesc = `Delivered via ${inv.deliveryMethod || 'unknown method'}`
  } else if (deliveryFailed) {
    deliveryStatus = 'error'
    deliveryIcon = IconX
    deliveryDesc = `Delivery failed: ${inv.deliveryError || 'Unknown error'}`
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
    timestamp: inv.deliveredAt,
    status: deliveryStatus,
    icon: deliveryIcon
  })

  // 6. Payment Received (optional - only show if delivered or paid status)
  if (isDelivered || inv.camInvoiceStatus === 'PAID') {
    const isPaid = inv.camInvoiceStatus === 'PAID'
    items.push({
      id: 'payment',
      title: 'Payment Received',
      description: isPaid
        ? 'Payment received from customer'
        : 'Waiting for customer payment',
      timestamp: undefined, // No payment timestamp available in current interface
      status: isPaid ? 'completed' : 'pending',
      icon: isPaid ? IconCurrencyDollar : IconClock
    })
  }

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

function getTimelineItemColor(status: string) {
  switch (status) {
    case 'completed': return 'green'
    case 'in_progress': return 'orange'
    case 'pending': return 'gray'
    case 'error': return 'red'
    default: return 'gray'
  }
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

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const id = (params?.id as string) || ''
  const [activeTab, setActiveTab] = useState('overview')
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)
  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDelivering, setIsDelivering] = useState(false)
  const [showFormattedXML, setShowFormattedXML] = useState(true)

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
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      const submitRes = await fetch(`/api/invoices/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!submitRes.ok) {
        const errorData = await submitRes.json().catch(() => ({}))
        console.error('Submission error:', errorData)
        
        // Handle specific error types with better messages
        if (errorData.error === 'PAYLOAD_TOO_LARGE' || submitRes.status === 413) {
          const lineItemCount = errorData.lineItemCount || 'unknown'
          const payloadSize = errorData.payloadSize ? `${(errorData.payloadSize / 1024 / 1024).toFixed(2)}MB` : 'unknown'
          const suggestion = errorData.suggestion || 'Please reduce the number of line items or split this invoice into multiple smaller invoices.'
          
          // Check if payload is within limit but still rejected
          const payloadSizeMB = errorData.payloadSize ? errorData.payloadSize / 1024 / 1024 : 0
          const isPayloadWithinLimit = payloadSizeMB < 10
          
          const errorMessage = isPayloadWithinLimit
            ? `CamInvoice API rejected this invoice (${lineItemCount} line items, ${payloadSize} payload size). This may be due to the number of line items exceeding CamInvoice's limits. ${suggestion}`
            : `Invoice is too large to submit (${lineItemCount} line items, ${payloadSize} payload size). ${suggestion}`
          
          throw new Error(errorMessage)
        }
        
        const errorMessage = errorData.message || errorData.error || 'Submission failed'
        const details = errorData.details ? ` Details: ${JSON.stringify(errorData.details)}` : ''
        throw new Error(errorMessage + details)
      }

      // Refresh invoice data
      const res = await fetch(`/api/invoices/${id}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data.invoice)
      }

      // Show success notification
      const invoiceNumber = invoice?.invoiceNumber || 'Unknown'
      showNotification.camInvoice.submitted(
        invoiceNumber, 
        id,
        user ? {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        } : undefined
      )
    } catch (error) {
      console.error('Failed to submit invoice:', error)
      // Show error notification
      showNotification.error(
        error instanceof Error ? error.message : 'Failed to submit invoice',
        'Submission Failed',
        { link: `/invoices/${id}` }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelivery = async (forceEmail = false) => {
    // Check if already delivered
    if (invoice?.deliveryStatus === 'DELIVERED') {
      showNotification.info('This invoice has already been delivered to the customer', 'Already Delivered', { link: `/invoices/${id}` })
      return
    }

    try {
      setIsDelivering(true)
      const deliveryRes = await fetch(`/api/invoices/${id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEmail })
      })

      const result = await deliveryRes.json()

      if (result.success) {
        // Refresh invoice data to get updated delivery status
        const res = await fetch(`/api/invoices/${id}`)
        if (res.ok) {
          const data = await res.json()
          setInvoice(data.invoice)
        }

        // Show success notification
        showNotification.success(
          result.message || 'Invoice has been delivered successfully',
          'Delivery Successful',
          { link: `/invoices/${id}` }
        )
      } else {
        // Show error notification
        showNotification.error(
          result.error || 'Failed to deliver invoice',
          'Delivery Failed',
          { link: `/invoices/${id}` }
        )
      }
    } catch (error) {
      console.error('Delivery error:', error)
      // Show network error notification
      showNotification.error(
        'Failed to connect to server. Please try again.',
        'Network Error',
        { link: `/invoices/${id}` }
      )
    } finally {
      setIsDelivering(false)
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
      badge={{
        text: invoice.camInvoiceStatus || invoice.status,
        color: invoice.camInvoiceStatus ? getCamInvoiceStatusColor(invoice.camInvoiceStatus) : getStatusColor(invoice.status)
      }}
      actions={
        <>
          {/* Edit Button - Only show for DRAFT invoices */}
          {invoice.status === 'DRAFT' && (
            <Button variant="light" leftSection={<IconEdit size={16} />} onClick={openEditModal}>Edit</Button>
          )}
          {invoice.status === 'DRAFT' || invoice.status === 'REJECTED' ? (
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleResend}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit to CamInvoice'}
            </Button>
          ) : invoice.status === 'SUBMITTED' ? (
            <Button
              leftSection={<IconCheck size={16} />}
              disabled={true}
              variant="light"
              color="green"
            >
              Submitted
            </Button>
          ) : invoice.status === 'ACCEPTED' ? (
            <Button
              leftSection={<IconCheck size={16} />}
              disabled={true}
              variant="light"
              color="green"
            >
              Accepted
            </Button>
          ) : invoice.status === 'CANCELLED' ? (
            <Button
              leftSection={<IconX size={16} />}
              disabled={true}
              variant="light"
              color="red"
            >
              Cancelled
            </Button>
          ) : (
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleResend}
              loading={isSubmitting}
              disabled={isSubmitting}
              variant="light"
            >
              {isSubmitting ? 'Resubmitting...' : 'Resubmit to CamInvoice'}
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
                          <Text size="sm" c="dimmed">Member ID</Text>
                          <Text fw={500}>{(invoice.customer as any)?.taxId || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">VATTIN</Text>
                          <Text fw={500}>{(invoice.customer as any)?.registrationNumber || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <Text size="sm" c="dimmed">Email Address</Text>
                          <Text fw={500}>{(invoice.customer as any)?.email || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Phone Number</Text>
                          <Text fw={500}>{(invoice.customer as any)?.phone || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">City</Text>
                          <Text fw={500}>{(invoice.customer as any)?.city || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Country</Text>
                          <Text fw={500}>{(invoice.customer as any)?.country || '—'}</Text>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Text size="sm" c="dimmed">Postal Code</Text>
                          <Text fw={500}>{(invoice.customer as any)?.postalCode || '—'}</Text>
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
                        <Title order={4}>Payment terms</Title>
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
                        <Group justify="space-between" align="center">
                          <Title order={4}>CamInvoice Details</Title>
                          {invoice.camInvoiceStatus && (
                            <Badge
                              color={getCamInvoiceStatusColor(invoice.camInvoiceStatus)}
                              variant="light"
                              size="sm"
                            >
                              {invoice.camInvoiceStatus}
                            </Badge>
                          )}
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">UUID:</Text>
                          <Text size="sm" fw={500}>{invoice.camInvoiceUuid}</Text>
                        </Group>
                        {invoice.verificationUrl && (
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconExternalLink size={14} />}
                            component="a"
                            href={invoice.verificationUrl.includes('localhost')
                              ? invoice.verificationUrl.replace(/https?:\/\/localhost:\d+/, 'https://sandbox.e-invoice.gov.kh')
                              : invoice.verificationUrl
                            }
                            target="_blank"
                          >
                            Verify on CamInvoice
                          </Button>
                        )}

                        {/* Delivery Actions - Show if invoice is VALID/DELIVERED in CamInvoice and customer has email */}
                        {['VALID', 'DELIVERED'].includes(invoice.camInvoiceStatus || '') &&
                         invoice.customer?.email && (
                          <Stack gap="sm">
                            <Text size="xs" c="dimmed" fw={500}>Customer Delivery</Text>
                            <Menu shadow="md" width={280}>
                              <Menu.Target>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftSection={<IconSend size={14} />}
                                  loading={isDelivering}
                                  disabled={isDelivering || invoice.deliveryStatus === 'DELIVERED'}
                                  fullWidth
                                >
                                  {isDelivering
                                    ? 'Delivering...'
                                    : invoice.deliveryStatus === 'DELIVERED'
                                      ? 'Already Delivered'
                                      : 'Deliver to Customer'
                                  }
                                </Button>
                              </Menu.Target>

                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconSend size={14} />}
                                  onClick={() => handleDelivery(false)}
                                  disabled={invoice.deliveryStatus === 'DELIVERED'}
                                >
                                  CamInvoice Delivery
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconMail size={14} />}
                                  onClick={() => handleDelivery(true)}
                                  color="orange"
                                  disabled={invoice.deliveryStatus === 'DELIVERED'}
                                >
                                  Email Delivery - (Optional)
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  )}

                  {/* Quick Actions 
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
                  </Paper>*/}
                </Stack>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="timeline" pt="md">
            <Card withBorder>
              <Stack gap="md">
                <Title order={4}>Invoice Processing Timeline</Title>
                {(() => {
                  const timelineItems = buildTimeline(invoice)
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
                  {invoice.xmlContent && (
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
                          navigator.clipboard.writeText(invoice.xmlContent || '');
                          // You could add a notification here
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

                {invoice.xmlContent ? (
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
                      {showFormattedXML ? formatXML(invoice.xmlContent) : invoice.xmlContent}
                    </pre>
                  </Paper>
                ) : (
                  <Paper p="xl" bg="gray.1" ta="center">
                    <Text c="dimmed" size="sm">No XML content available yet.</Text>
                    <Text c="dimmed" size="xs" mt="xs">XML will be generated when the invoice is submitted to CamInvoice.</Text>
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
                  {invoice.camInvoiceUuid && (
                    <Button
                      leftSection={<IconDownload size={16} />}
                      variant="light"
                      component="a"
                      href={`/api/invoices/${id}/pdf`}
                      target="_blank"
                    >
                      Download PDF
                    </Button>
                  )}
                </Group>

                {invoice.camInvoiceUuid ? (
                  <>
                    <Alert color="green" icon={<IconCheck size={16} />}>
                      Official PDF from CamInvoice with QR code for verification.
                    </Alert>
                    <Paper withBorder style={{ minHeight: 600, overflow: 'hidden', position: 'relative' }}>
                      <iframe
                        src={`/api/invoices/${id}/pdf`}
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
                      <Text fw={500}>Invoice not submitted to CamInvoice yet</Text>
                      <Text size="sm">
                        The official PDF will be available after submitting the invoice to CamInvoice.
                        Please submit the invoice first to view the official PDF with QR code.
                      </Text>
                    </Stack>
                  </Alert>
                )}
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
