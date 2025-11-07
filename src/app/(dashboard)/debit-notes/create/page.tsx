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
  Table,
  ActionIcon,
  Paper,
  Badge,
  Collapse,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconSend,
  IconChevronDown,
  IconChevronUp,
  IconBuilding,
  IconUser,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDisclosure } from '@mantine/hooks'
import PageLayout from '../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../utils/notifications'

// Types
interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

interface NoteForm {
  noteNumber: string
  noteType: 'CREDIT' | 'DEBIT'
  invoiceTypeCode: string
  issueDate: string
  dueDate: string
  currency: string
  customerId: string
  originalInvoiceId?: string
  reason: string
  description: string
  notes: string
  paymentTerms: string
}

// Constants
const CURRENCY_CODES = ['KHR', 'USD', 'EUR', 'THB']
const DEBIT_NOTE_TYPE_CODES = [
  { value: '383', label: '383 - Debit Note' }
]
const CREDIT_NOTE_TYPE_CODES = [
  { value: '381', label: '381 - Credit Note' }
]

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

export default function CreateDebitNotePage() {
  const router = useRouter()
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxRate: 0.1, total: 0 }
  ])
  const [supplierOpened, { toggle: toggleSupplier }] = useDisclosure(true)
  const [customerOpened, { toggle: toggleCustomer }] = useDisclosure(false)
  const [customers, setCustomers] = useState<{ value: string; label: string; taxId?: string; tin?: string; registrationNumber?: string; address?: string; city?: string; email?: string; phone?: string; country?: string; postalCode?: string}[]>([])
  const [invoices, setInvoices] = useState<{ value: string; label: string }[]>([])
  const [supplierInfo, setSupplierInfo] = useState<{ name: string; taxId: string; tin: string; registrationNumber: string; address: string; email: string; phone: string; city: string; country: string; postalCode: string }>({ name: '', taxId: '', tin: '', registrationNumber: '', address: '', email: '', phone: '', city: '', country: '', postalCode: '' })
  const [customerPanel, setCustomerPanel] = useState<{ name: string; taxId: string; tin: string; registrationNumber: string; address: string; email: string; phone: string; city: string; country: string; postalCode: string }>({ name: '', taxId: '', tin: '', registrationNumber: '', address: '', email: '', phone: '', city: '', country: '', postalCode: '' })

  const form = useForm<NoteForm>({
    initialValues: {
      noteNumber: '',
      noteType: 'DEBIT', // Default to DEBIT for this page
      invoiceTypeCode: '383', // Default to 383 for debit note
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'KHR',
      customerId: '',
      originalInvoiceId: '',
      reason: '',
      description: '',
      notes: '',
      paymentTerms: '',
    },
    validate: {
      noteNumber: (value) => (!value ? 'Note number is required' : null),
      customerId: (value) => (!value ? 'Customer is required' : null),
      reason: (value) => (!value ? 'Reason is required' : null),
      description: (value) => (!value ? 'Description is required' : null),
    }
  })

  // Load supplier/company, customers and invoices
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [companyRes, customersRes, invoicesRes] = await Promise.all([
          fetch('/api/settings/company', { credentials: 'include' }),
          fetch('/api/customers?pageSize=100', { credentials: 'include' }),
          fetch('/api/invoices?pageSize=100', { credentials: 'include' }),
        ])
        
        if (companyRes.ok) {
          const cjson = await companyRes.json()
          const c = cjson.company || {}
          if (mounted) {
            const addressParts = [c.address || ''].filter(Boolean)
            if (c.city) addressParts.push(c.city)
            const fullAddress = addressParts.join(', ')
            
            setSupplierInfo({
              name: c.companyName || '',
              taxId: c.taxId || '',
              tin: c.registrationNumber || '', // Use registrationNumber as tin
              registrationNumber: c.registrationNumber || '',
              address: fullAddress || '',
              email: c.email || '',
              phone: c.phone || '',
              city: c.city || '',
              country: c.country || 'Cambodia',
              postalCode: c.postalCode || ''
            })
          }
          // default currency from company
          if (c.currency && mounted) form.setFieldValue('currency', c.currency)
        }
        
        if (customersRes.ok) {
          const j = await customersRes.json()
          const opts = (j.customers || []).map((k: any) => {
            const addressParts = [k.address || ''].filter(Boolean)
            if (k.city) addressParts.push(k.city)
            const fullAddress = addressParts.join(', ')
            
            return {
              value: k.id,
              label: k.name,
              taxId: k.taxId || '',
              tin: k.registrationNumber || '', // Use registrationNumber as tin
              registrationNumber: k.registrationNumber || '',
              address: fullAddress || '',
              email: k.email || '',
              phone: k.phone || '',
              city: k.city || '',
              country: k.country || '',
              postalCode: k.postalCode || ''
            }
          })
          if (mounted) setCustomers(opts)
        }

        if (invoicesRes.ok) {
          const j = await invoicesRes.json()
          const opts = (j.invoices || []).map((inv: any) => ({ 
            value: inv.id, 
            label: `${inv.invoiceNumber} - ${inv.customer?.name || 'Unknown'}` 
          }))
          if (mounted) setInvoices(opts)
        }
      } catch (e) {
        console.error('Failed to load data:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.1,
      total: 0
    }
    setLineItems([...lineItems, newItem])
    showNotification.success('Added 1 Line Item', 'Line Item Added')
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
          const subtotal = updated.quantity * updated.unitPrice
          updated.total = subtotal + (subtotal * updated.taxRate)
        }
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(items => items.filter(item => item.id !== id))
      showNotification.info('Removed 1 Line Item', 'Line Item Removed')
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice
      return sum + (subtotal * item.taxRate)
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async (values: NoteForm) => {
    try {
      // Validate line items have non-zero amounts
      const hasInvalidItems = lineItems.some(item => {
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
      
      showNotification.loading.show('create-note', `Creating ${values.noteType === 'CREDIT' ? 'credit' : 'debit'} note...`)
      
      const endpoint = values.noteType === 'CREDIT' ? '/api/credit-notes' : '/api/debit-notes'
      const numberField = values.noteType === 'CREDIT' ? 'creditNoteNumber' : 'debitNoteNumber'
      
      const payload = {
        [numberField]: values.noteNumber,
        issueDate: values.issueDate,
        currency: values.currency,
        customerId: values.customerId,
        originalInvoiceId: values.originalInvoiceId || null,
        reason: values.reason,
        notes: values.notes,
        description: values.description,
        subtotal: calculateSubtotal(),
        taxAmount: calculateTax(),
        totalAmount: calculateTotal(),
        status: 'DRAFT',
      }

      const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create note')
      }

      const data = await res.json()
      
      // Save line items if note was created successfully
      if (data.success && (data.creditNote || data.debitNote)) {
        const noteId = data.creditNote?.id || data.debitNote?.id
        const lineItemEndpoint = values.noteType === 'CREDIT' 
          ? `/api/credit-notes/${noteId}/line-items`
          : `/api/debit-notes/${noteId}/line-items`

        await fetch(lineItemEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            lineItems: lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
            }))
          })
        })

        showNotification.loading.update('create-note', `${values.noteType === 'CREDIT' ? 'Credit' : 'Debit'} note created successfully`, 'success')
        router.push(`/${values.noteType === 'CREDIT' ? 'credit' : 'debit'}-notes/${noteId}/edit`)
      }
    } catch (e: any) {
      showNotification.loading.update('create-note', e?.message || 'Failed to create note', 'error')
    }
  }

  const selectedReasons = DEBIT_NOTE_REASONS

  return (
    <PageLayout
      title="Create Debit Note"
      subtitle="Create a new debit note for CamInvoice"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* Basic Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={3}>Basic Information</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Note Number"
                    placeholder={form.values.noteType === 'CREDIT' ? 'CN-2024-001' : 'DN-2024-001'}
                    required
                    {...form.getInputProps('noteNumber')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Issue Date"
                    type="date"
                    required
                    {...form.getInputProps('issueDate')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Due Date"
                    type="date"
                    required
                    {...form.getInputProps('dueDate')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Invoice Type"
                    data={DEBIT_NOTE_TYPE_CODES}
                    required
                    {...form.getInputProps('invoiceTypeCode')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Currency"
                    data={CURRENCY_CODES.map(code => ({ value: code, label: code }))}
                    required
                    {...form.getInputProps('currency')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Customer"
                    data={customers}
                    searchable
                    required
                    {...form.getInputProps('customerId')}
                    onChange={(val) => {
                      form.setFieldValue('customerId', val || '')
                      const found = customers.find(c => c.value === val)
                      if (found) {
                        // open customer panel and auto-fill
                        if (!customerOpened) toggleCustomer()
                        setCustomerPanel({ 
                          name: found.label, 
                          taxId: found.taxId || '', 
                          tin: found.tin || '', 
                          registrationNumber: found.registrationNumber || '', 
                          address: found.address || '', 
                          email: found.email || '', 
                          phone: found.phone || '', 
                          city: found.city || '', 
                          country: found.country || '', 
                          postalCode: found.postalCode || '' 
                        }) 
                      }
                    }}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* Auto-populated Supplier Section */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <IconBuilding size={20} />
                <Title order={4}>Supplier Party (Your Business)</Title>
                <Badge color="blue" variant="light">Auto-filled</Badge>
              </Group>
              <ActionIcon variant="subtle" onClick={toggleSupplier}>
                {supplierOpened ? <IconChevronUp /> : <IconChevronDown />}
              </ActionIcon>
            </Group>
            <Collapse in={supplierOpened}>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Business Name" value={supplierInfo.name} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="Member ID" value={supplierInfo.taxId} readOnly />
                </Grid.Col>
                 <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="VATTIN" value={supplierInfo.registrationNumber || supplierInfo.tin} readOnly />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput label="Address" value={supplierInfo.address} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="Email Address" value={supplierInfo.email} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}> 
                  <TextInput label="Phone Number" value={supplierInfo.phone} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="City" value={supplierInfo.city} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="Country" value={supplierInfo.country} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="Postal Code" value={supplierInfo.postalCode} readOnly />
                </Grid.Col>
              </Grid>
            </Collapse>
          </Card>

          {/* Auto-populated Customer Section */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <IconUser size={20} />
                <Title order={4}>Customer Party</Title>
                <Badge color="green" variant="light">Auto-filled from selection</Badge>
              </Group>
              <ActionIcon variant="subtle" onClick={toggleCustomer}>
                {customerOpened ? <IconChevronUp /> : <IconChevronDown />}
              </ActionIcon>
            </Group>
            <Collapse in={customerOpened}>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Customer Name" value={customerPanel.name} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="Member ID" value={customerPanel.taxId} readOnly />
                </Grid.Col>
                 <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="VATTIN" value={customerPanel.registrationNumber || customerPanel.tin} readOnly />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput label="Address" value={customerPanel.address} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}>
                  <TextInput label="Email Address" value={customerPanel.email} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 10, md: 3 }}> 
                  <TextInput label="Phone Number" value={customerPanel.phone} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="City" value={customerPanel.city} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="Country" value={customerPanel.country} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 8, md: 2 }}> 
                  <TextInput label="Postal Code" value={customerPanel.postalCode} readOnly />
                </Grid.Col>
              </Grid>
            </Collapse>
          </Card>

          {/* Reference Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={3}>Reference Information</Title>
              <Select
                label="Original Invoice (Optional)"
                placeholder="Select the related invoice"
                data={invoices}
                searchable
                clearable
                {...form.getInputProps('originalInvoiceId')}
              />
              <Select
                label="Reason"
                placeholder="Select reason"
                data={selectedReasons}
                required
                {...form.getInputProps('reason')}
              />
              <Textarea
                label="Description"
                placeholder="Detailed description of the reason for this debit note"
                rows={3}
                required
                {...form.getInputProps('description')}
              />
            </Stack>
          </Card>

          {/* Line Items Table */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Line Items</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={addLineItem}>
                Add Item
              </Button>
            </Group>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Tax Rate (%)</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lineItems.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <TextInput
                        placeholder="Product or service description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.quantity}
                        onChange={(value) => updateLineItem(item.id, 'quantity', Number(value) || 1)}
                        min={0}
                        decimalScale={2}
                        w={80}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.unitPrice}
                        onChange={(value) => updateLineItem(item.id, 'unitPrice', Number(value) || 0)}
                        min={0}
                        decimalScale={2}
                        prefix={form.values.currency + ' '}
                        w={120}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.taxRate * 100}
                        onChange={(value) => updateLineItem(item.id, 'taxRate', (Number(value) || 0) / 100)}
                        min={0}
                        max={100}
                        decimalScale={2}
                        suffix="%"
                        w={100}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{form.values.currency} {item.total.toFixed(2)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
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
                  />
                  <Textarea
                    label="Additional Notes"
                    placeholder="Any additional notes or comments"
                    {...form.getInputProps('notes')}
                    rows={3}
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text>Subtotal:</Text>
                      <Text>{form.values.currency} {calculateSubtotal().toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Tax:</Text>
                      <Text>{form.values.currency} {calculateTax().toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between" fw={700}>
                      <Text size="lg">Total:</Text>
                      <Badge size="lg" color="green">
                        +{form.values.currency} {calculateTotal().toFixed(2)}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Actions */}
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconSend size={16} />}>
              Create Debit Note
            </Button>
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}

