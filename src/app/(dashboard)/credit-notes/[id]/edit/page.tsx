'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Grid,
  Alert,
  Badge,
  Loader,
  Divider,
  Paper,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconSend,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../../utils/notifications'

const CREDIT_NOTE_REASONS = [
  { value: 'Product return', label: 'Product Return' },
  { value: 'Service cancellation', label: 'Service Cancellation' },
  { value: 'Pricing error', label: 'Pricing Error' },
  { value: 'Quality issue', label: 'Quality Issue' },
  { value: 'Discount adjustment', label: 'Discount Adjustment' },
  { value: 'Other', label: 'Other' },
]

const DEBIT_NOTE_REASONS = [
  { value: 'Additional service', label: 'Additional Service' },
  { value: 'Late payment fee', label: 'Late Payment Fee' },
  { value: 'Interest charge', label: 'Interest Charge' },
  { value: 'Penalty', label: 'Penalty' },
  { value: 'Price adjustment', label: 'Price Adjustment' },
  { value: 'Other', label: 'Other' },
]

export default function EditCreditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [creditNote, setCreditNote] = useState<any>(null)
  const [customers, setCustomers] = useState<Array<{ value: string; label: string; taxId?: string }>>([])
  const [invoices, setInvoices] = useState<Array<{ value: string; label: string }>>([])
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>>([])
  const [isSavingItems, setIsSavingItems] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm({
    initialValues: {
      noteNo: '',
      customerId: '',
      originalInvoiceId: '',
      originalInvoiceNo: '',
      issueDate: '',
      reason: '',
      description: '',
      amount: 0,
      taxAmount: 0,
      currency: 'KHR',
      notes: '',
      paymentTerms: '',
    },
    validate: {
      noteNo: (value) => (!value ? 'Note number is required' : null),
      customerId: (value) => (!value ? 'Please select a customer' : null),
      issueDate: (value) => (!value ? 'Issue date is required' : null),
      reason: (value) => (!value ? 'Reason is required' : null),
      description: (value) => (!value ? 'Description is required' : null),
    },
  })

  // Load credit note data, customers, invoices, and line items
  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const [noteRes, customersRes, invoicesRes, itemsRes] = await Promise.all([
          fetch(`/api/credit-notes/${encodeURIComponent(id)}`, { credentials: 'include' }),
          fetch('/api/customers?pageSize=100', { credentials: 'include' }),
          fetch('/api/invoices?pageSize=100', { credentials: 'include' }),
          fetch(`/api/credit-notes/${encodeURIComponent(id)}/line-items`, { credentials: 'include' }),
        ])

        // Load customers and invoices first
        if (customersRes.ok) {
          const j = await customersRes.json()
          const opts = (j.customers || []).map((k: any) => ({ 
            value: k.id, 
            label: k.name,
            taxId: k.taxId,
          }))
          if (mounted) setCustomers(opts)
        }

        let invoicesList: Array<{ value: string; label: string }> = []
        if (invoicesRes.ok) {
          const j = await invoicesRes.json()
          const opts = (j.invoices || []).map((inv: any) => ({ 
            value: inv.id, 
            label: `${inv.invoiceNumber} - ${inv.customer?.name || 'Unknown'}` 
          }))
          if (mounted) setInvoices(opts)
          invoicesList = opts
        }

        if (noteRes.ok) {
          const noteData = await noteRes.json()
          if (mounted && noteData.success) {
            const note = noteData.creditNote
            setCreditNote(note)
            
            // Load original invoice number if originalInvoiceId exists
            let originalInvoiceNo = ''
            if (note.originalInvoiceId && invoicesList.length > 0) {
              const inv = invoicesList.find(inv => inv.value === note.originalInvoiceId)
              if (inv) {
                originalInvoiceNo = inv.label.split(' - ')[0]
              }
            }

            // Set form values after loading
            form.setValues({
              noteNo: note.creditNoteNumber || '',
              customerId: note.customerId || '',
              originalInvoiceId: note.originalInvoiceId || '',
              originalInvoiceNo: originalInvoiceNo,
              issueDate: note.issueDate ? new Date(note.issueDate).toISOString().slice(0, 10) : '',
              reason: note.reason || '',
              description: note.description || '',
              amount: Number(note.subtotal) || 0,
              taxAmount: Number(note.taxAmount) || 0,
              currency: note.currency || 'USD',
              notes: note.notes || '',
            })
          }
        }

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          if (mounted && itemsData.success && Array.isArray(itemsData.items)) {
            setItems(itemsData.items.map((i: any) => ({ 
              description: i.description || '', 
              quantity: Number(i.quantity) || 0, 
              unitPrice: Number(i.unitPrice) || 0, 
              taxRate: Number(i.taxRate) || 0 
            })))
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function addItem() { setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]) }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }
  function updateItem(index: number, field: keyof (typeof items)[number], value: any) { setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it)) }

  async function saveLineItems() {
    try {
      setIsSavingItems(true)
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(id)}/line-items`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include', 
        body: JSON.stringify({ lineItems: items }) 
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.success) throw new Error(body?.error || 'Failed to save line items')
      showNotification.success('Line items saved successfully')
    } catch (e: any) {
      console.error(e)
      showNotification.error(e.message || 'Failed to save line items')
    } finally {
      setIsSavingItems(false)
    }
  }

  async function submitToCamInv() {
    try {
      setIsSubmitting(true)
      
      // Validate line items before saving
      const hasInvalidItems = items.some(item => {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unitPrice) || 0
        return qty <= 0 || price <= 0
      })
      
      if (hasInvalidItems) {
        showNotification.error('Line items must have quantity and unit price greater than 0', 'Invalid Line Items')
        setIsSubmitting(false)
        return
      }
      
      const total = calculateTotal()
      if (total <= 0) {
        showNotification.error('Total amount must be greater than 0', 'Invalid Amount')
        setIsSubmitting(false)
        return
      }
      
      await saveLineItems()
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(id)}/submit`, { method: 'POST', credentials: 'include' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.success) throw new Error(body?.error || 'Submit failed')
      showNotification.success('Credit note submitted to CamInvoice successfully')
      router.push('/credit-notes')
    } catch (e: any) {
      console.error(e)
      showNotification.error(e.message || 'Failed to submit credit note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateTotal = () => {
    // Calculate from line items
    const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
    const tax = items.reduce((sum, it) => {
      const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
      return sum + line * (Number(it.taxRate) || 0)
    }, 0)
    return subtotal + tax
  }

  const handleSubmit = async (values: typeof form.values) => {
    if (!creditNote) return
    try {
      setIsSaving(true)
      
      // Validate line items have non-zero amounts
      const hasInvalidItems = items.some(item => {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unitPrice) || 0
        return qty <= 0 || price <= 0
      })
      
      if (hasInvalidItems) {
        showNotification.error('Line items must have quantity and unit price greater than 0', 'Invalid Line Items')
        return
      }
      
      const total = calculateTotal()
      if (total <= 0) {
        showNotification.error('Total amount must be greater than 0', 'Invalid Amount')
        return
      }
      
      // Find original invoice ID if originalInvoiceNo is provided
      let originalInvoiceId = form.values.originalInvoiceId
      if (!originalInvoiceId && values.originalInvoiceNo) {
        const invoice = invoices.find(inv => inv.label.startsWith(values.originalInvoiceNo))
        if (invoice) {
          originalInvoiceId = invoice.value
        }
      }

      const res = await fetch(`/api/credit-notes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          creditNoteNumber: values.noteNo,
          issueDate: values.issueDate,
          currency: values.currency,
          reason: values.reason,
          notes: values.notes,
          customerId: values.customerId,
          originalInvoiceId: originalInvoiceId || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update credit note')
      }

      showNotification.success('Credit note updated successfully')
      
      router.push(`/credit-notes/${id}`)
    } catch (error: any) {
      console.error('Failed to update credit/debit note:', error)
      showNotification.error(error.message || 'Failed to update credit note')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCustomer = customers.find(c => c.value === form.values.customerId)
  const noteType = creditNote?.type === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'

  if (loading) {
    return (
      <PageLayout title="Edit Credit Note" subtitle="Loading...">
        <Card withBorder>
          <Group justify="center" p="xl">
            <Loader size="lg" />
            <Text>Loading credit note data...</Text>
          </Group>
        </Card>
      </PageLayout>
    )
  }

  if (!creditNote) {
    return (
      <PageLayout title="Edit Credit Note" subtitle="Not Found">
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

  return (
    <PageLayout
      title={`Edit ${noteType}`}
      subtitle={`Edit ${noteType.toLowerCase()} ${creditNote.creditNoteNumber}`}
      actions={
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push(`/credit-notes/${id}`)}
        >
          Back to View
        </Button>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Status Warning */}
          {creditNote.status !== 'DRAFT' && (
            <Alert color="orange" icon={<IconInfoCircle size={16} />}>
              <Text fw={500} mb="xs">Note Status: {creditNote.status}</Text>
              <Text size="sm">
                This {noteType.toLowerCase()} has been submitted to CamInvoice. Only line items can be edited.
              </Text>
            </Alert>
          )}

          {/* Basic Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Basic Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Note Number"
                    placeholder={form.values.noteNo || 'CN-2024-001'}
                    required
                    disabled={creditNote.status !== 'DRAFT'}
                    {...form.getInputProps('noteNo')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Issue Date"
                    type="date"
                    required
                    disabled={creditNote.status !== 'DRAFT'}
                    {...form.getInputProps('issueDate')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Currency"
                    data={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'KHR', label: 'KHR - Cambodian Riel' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'THB', label: 'THB - Thai Baht' },
                    ]}
                    required
                    disabled={creditNote.status !== 'DRAFT'}
                    {...form.getInputProps('currency')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Customer"
                    data={customers}
                    searchable
                    required
                    disabled={creditNote.status !== 'DRAFT'}
                    {...form.getInputProps('customerId')}
                  />
                </Grid.Col>
              </Grid>

              {selectedCustomer && (
                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                  <Text fw={500}>{selectedCustomer.label}</Text>
                  <Text size="sm">Tax ID: {selectedCustomer.taxId}</Text>
                </Alert>
              )}
            </Stack>
          </Card>

          {/* Original Invoice Reference */}
          {/* Line Items */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Line Items</Title>
              {items.map((it, idx) => (
                <Grid key={idx} align="end">
                  <Grid.Col span={{ base: 12, md: 5 }}>
                    <TextInput label="Description" placeholder="Product or service description" value={it.description} onChange={(e) => updateItem(idx, 'description', e.currentTarget.value)} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, md: 2 }}>
                    <NumberInput label="Quantity" min={0} decimalScale={3} value={it.quantity} onChange={(v) => updateItem(idx, 'quantity', Number(v) || 0)} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, md: 2 }}>
                    <NumberInput label="Unit Price" prefix="$" decimalScale={2} fixedDecimalScale value={it.unitPrice} onChange={(v) => updateItem(idx, 'unitPrice', Number(v) || 0)} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, md: 2 }}>
                    <NumberInput label="Tax Rate" suffix=" %" decimalScale={2} fixedDecimalScale value={it.taxRate * 100} onChange={(v) => updateItem(idx, 'taxRate', (Number(v) || 0) / 100)} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, md: 1 }}>
                    <Button variant="light" color="red" onClick={() => removeItem(idx)}>Remove</Button>
                  </Grid.Col>
                </Grid>
              ))}
              <Group>
                <Button variant="light" onClick={addItem}>Add Item</Button>
                <Button loading={isSavingItems} onClick={saveLineItems}>Save Lines</Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Original Invoice Reference</Title>
              <Alert color="blue" icon={<IconInfoCircle size={16} />} mb="md">
                <Text size="sm">
                  <strong>Required:</strong> A credit note must reference an original invoice before it can be submitted to CamInvoice.
                </Text>
              </Alert>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Original Invoice (Optional)"
                    placeholder="Select the related invoice"
                    data={invoices}
                    searchable
                    clearable
                    disabled={creditNote.status !== 'DRAFT'}
                    value={form.values.originalInvoiceId}
                    onChange={(value) => {
                      form.setFieldValue('originalInvoiceId', value || '')
                      if (value) {
                        const invoice = invoices.find(inv => inv.value === value)
                        if (invoice) {
                          form.setFieldValue('originalInvoiceNo', invoice.label.split(' - ')[0])
                        }
                      }
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Reason"
                    placeholder="Select reason"
                    data={noteType === 'Credit Note' ? CREDIT_NOTE_REASONS : DEBIT_NOTE_REASONS}
                    required
                    disabled={creditNote.status !== 'DRAFT'}
                    {...form.getInputProps('reason')}
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Description"
                placeholder={creditNote?.type === 'CREDIT_NOTE' ? "Detailed description of the reason for this credit note" : "Detailed description of the reason for this debit note"}
                rows={3}
                required
                disabled={creditNote.status !== 'DRAFT'}
                {...form.getInputProps('description')}
              />
            </Stack>
          </Card>

          {/* Summary */}
          <Card withBorder>
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack gap="md">
                  <Textarea
                    label="Payment Terms"
                    placeholder="Payment terms and conditions"
                    {...form.getInputProps('paymentTerms')}
                    rows={3}
                    disabled={creditNote.status !== 'DRAFT'}
                  />
                  <Textarea
                    label="Additional Notes"
                    placeholder="Any additional notes or comments"
                    {...form.getInputProps('notes')}
                    rows={3}
                    disabled={creditNote.status !== 'DRAFT'}
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text>Subtotal:</Text>
                      <Text>{form.values.currency} {items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0).toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Tax:</Text>
                      <Text>{form.values.currency} {items.reduce((sum, it) => {
                        const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
                        return sum + line * (Number(it.taxRate) || 0)
                      }, 0).toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between" fw={700}>
                      <Text size="lg">Total:</Text>
                      <Badge size="lg" color={noteType === 'Credit Note' ? 'red' : 'green'}>
                        {noteType === 'Credit Note' ? '-' : '+'}{form.values.currency} {calculateTotal().toFixed(2)}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.push(`/credit-notes/${id}`)}>
              Cancel
            </Button>
            {creditNote.status === 'DRAFT' && (
              <>
                <Button
                  variant="light"
                  leftSection={<IconDeviceFloppy size={16} />}
                  type="submit"
                  loading={isSaving}
                >
                  Save Changes
                </Button>
                <Button
                  leftSection={<IconSend size={16} />}
                  onClick={submitToCamInv}
                  loading={isSubmitting}
                >
                  Submit to CamInvoice
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}
