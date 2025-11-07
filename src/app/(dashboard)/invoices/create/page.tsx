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
  Collapse,
  Paper,
  Badge,
  Checkbox,
  Modal,
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
import { useAuth } from '../../../../hooks/useAuth'

// Types
interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxScheme: string
  total: number
  allowanceReason?: string
  allowanceAmount?: number
  chargeReason?: string
  chargeAmount?: number
}

interface InvoiceForm {
  invoiceNumber: string,
  issueDate: string,
  dueDate: string,
  currency: string,
  exchangeRate?: number,
  customerId: string,
  invoiceTypeCode: string,
  paymentTerms: string,
  notes: string,
  terms: string,
}

// Constants
const CURRENCY_CODES = ['KHR', 'USD', 'EUR', 'THB']
const INVOICE_TYPE_CODES = [
  { value: '388', label: '388 - Tax Invoice' },
  { value: '380', label: '380 - Commercial Invoice' }
]
const TAX_OPTIONS = [
  { value: 'VAT', label: 'VAT (10%)' },
  { value: 'SP', label: 'Specific Tax' },
  { value: 'PLT', label: 'Public Lighting Tax' },
  { value: 'AT', label: 'Accommodation Tax' }
]

export default function CleanCreateInvoicePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxScheme: 'VAT', total: 0, allowanceReason: '', allowanceAmount: 0, chargeReason: '', chargeAmount: 0 }
  ])
  const [supplierOpened, { toggle: toggleSupplier }] = useDisclosure(true)
  const [customerOpened, { toggle: toggleCustomer }] = useDisclosure(false)
  const [allowanceChargeModal, setAllowanceChargeModal] = useState<{ opened: boolean; itemId: string | null; type: 'allowance' | 'charge' | null }>({
    opened: false,
    itemId: null,
    type: null
  })
  const [allowanceChargeForm, setAllowanceChargeForm] = useState<{ reason: string; amount: number }>({
    reason: '',
    amount: 0
  })
  const [customers, setCustomers] = useState<{ value: string; label: string; taxId?: string; tin?: string; registrationNumber?: string; address?: string; city?: string; email?: string; phone?: string; country?: string; postalCode?: string}[]>([])
  const [supplierInfo, setSupplierInfo] = useState<{ name: string; taxId: string; tin: string; registrationNumber: string; address: string; email: string; phone: string; city: string; country: string; postalCode: string }>({ name: '', taxId: '', tin: '', registrationNumber: '', address: '', email: '', phone: '', city: '', country: '', postalCode: '' })

  const [customerPanel, setCustomerPanel] = useState<{ name: string; taxId: string; tin: string; registrationNumber: string; address: string; email: string; phone: string; city: string; country: string; postalCode: string }>({ name: '', taxId: '', tin: '', registrationNumber: '', address: '', email: '', phone: '', city: '', country: '', postalCode: '' })

  const form = useForm<InvoiceForm>({
    initialValues: {
      //invoiceNumber: `INV-${Date.now()}`,
      invoiceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'KHR',
      customerId: '',
      invoiceTypeCode: '388',
      paymentTerms: '',
      notes: '',
      terms: '',
    }
  })

  // Load supplier/company and customers for selection
  // Auto-fill supplier panel; customer panel updates on selection
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [companyRes, customersRes] = await Promise.all([
          fetch('/api/settings/company', { credentials: 'include' }),
          fetch('/api/customers?pageSize=100', { credentials: 'include' }),
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
      } catch (e) {
        // ignore
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
      taxScheme: 'VAT',
      total: 0,
      allowanceReason: '',
      allowanceAmount: 0,
      chargeReason: '',
      chargeAmount: 0
    }
    setLineItems([...lineItems, newItem])

    // Show success notification
    showNotification.success('Added 1 Line Item', 'Line Item Added')
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice' || field === 'allowanceAmount' || field === 'chargeAmount') {
          const baseTotal = updated.quantity * updated.unitPrice
          const allowance = updated.allowanceAmount || 0
          const charge = updated.chargeAmount || 0
          updated.total = baseTotal - allowance + charge
        }
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(items => items.filter(item => item.id !== id))

      // Show info notification
      showNotification.info('Removed 1 Line Item', 'Line Item Removed')
    }
  }

  const openAllowanceChargeModal = (itemId: string, type: 'allowance' | 'charge') => {
    const item = lineItems.find(li => li.id === itemId)
    if (item) {
      if (type === 'allowance') {
        setAllowanceChargeForm({
          reason: item.allowanceReason || '',
          amount: item.allowanceAmount || 0
        })
      } else {
        setAllowanceChargeForm({
          reason: item.chargeReason || '',
          amount: item.chargeAmount || 0
        })
      }
    }
    setAllowanceChargeModal({ opened: true, itemId, type })
  }

  const closeAllowanceChargeModal = () => {
    setAllowanceChargeModal({ opened: false, itemId: null, type: null })
    setAllowanceChargeForm({ reason: '', amount: 0 })
  }

  const saveAllowanceCharge = () => {
    if (!allowanceChargeModal.itemId || !allowanceChargeModal.type) return

    // Validate amount is greater than 0
    if (!allowanceChargeForm.amount || allowanceChargeForm.amount <= 0) {
      showNotification.error('Amount must be greater than 0', 'Invalid Amount')
      return
    }

    const itemId = allowanceChargeModal.itemId
    const type = allowanceChargeModal.type

    if (type === 'allowance') {
      updateLineItem(itemId, 'allowanceReason', allowanceChargeForm.reason)
      updateLineItem(itemId, 'allowanceAmount', allowanceChargeForm.amount)
    } else {
      updateLineItem(itemId, 'chargeReason', allowanceChargeForm.reason)
      updateLineItem(itemId, 'chargeAmount', allowanceChargeForm.amount)
    }

    closeAllowanceChargeModal()
    showNotification.success(
      `${type === 'allowance' ? 'Allowance' : 'Charge'} saved successfully`,
      'Saved'
    )
  }

  const removeAllowanceCharge = (itemId: string, type: 'allowance' | 'charge') => {
    if (type === 'allowance') {
      updateLineItem(itemId, 'allowanceReason', '')
      updateLineItem(itemId, 'allowanceAmount', 0)
    } else {
      updateLineItem(itemId, 'chargeReason', '')
      updateLineItem(itemId, 'chargeAmount', 0)
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const baseTotal = item.quantity * item.unitPrice
      const allowance = item.allowanceAmount || 0
      const charge = item.chargeAmount || 0
      return sum + baseTotal - allowance + charge
    }, 0)
  }

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const baseTotal = item.quantity * item.unitPrice
      const allowance = item.allowanceAmount || 0
      const charge = item.chargeAmount || 0
      const itemSubtotal = baseTotal - allowance + charge
      const vatItems = item.taxScheme === 'VAT' ? itemSubtotal * 0.1 : 0
      return sum + vatItems
    }, 0)
  }

  const handleSubmit = async (values: InvoiceForm) => {
    try {
      // Validate total amount is greater than 0
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const totalAmount = subtotal + tax

      if (totalAmount === 0) {
        showNotification.error('Cannot create invoice with zero amount. Please add line items with valid prices.', 'Invalid Invoice Amount')
        return
      }

      showNotification.loading.show('create-invoice', 'Creating invoice...')
      const payload = {
        invoiceNumber: values.invoiceNumber,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        currency: values.currency,
        customerId: values.customerId,
        paymentTerms: values.paymentTerms,
        notes: values.notes,
        terms: values.terms,
        lineItems: lineItems.map((li) => ({ 
          description: li.description, 
          quantity: Number(li.quantity || 0), 
          unitPrice: Number(li.unitPrice || 0), 
          taxScheme: li.taxScheme,
          allowanceReason: li.allowanceReason || undefined,
          allowanceAmount: li.allowanceAmount ? Number(li.allowanceAmount) : undefined,
          chargeReason: li.chargeReason || undefined,
          chargeAmount: li.chargeAmount ? Number(li.chargeAmount) : undefined
        })),
      }
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to create invoice')
      }
      const data = await res.json()
      showNotification.loading.update(
        'create-invoice', 
        'Invoice created successfully', 
        'success', 
        { 
          link: `/invoices/${data.id}`,
          type: 'invoice-created',
          user: user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          } : undefined,
        }
      )
      router.push(`/invoices/${data.id}`)
    } catch (e: any) {
      showNotification.loading.update('create-invoice', e?.message || 'Failed to create invoice', 'error')
    }
  }

  return (
    <PageLayout
      title="Create New Invoice"
      subtitle="Create and submit a new UBL compliant invoice to CamInvoice system"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* Invoice Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={3}>Invoice Information</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Invoice Number"
                    required
                    {...form.getInputProps('invoiceNumber')}
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
                        setCustomerPanel({ name: found.label, taxId: found.taxId || '', tin: found.tin || '', registrationNumber: found.registrationNumber || '', address: found.address || '', email: found.email || '', phone: found.phone || '', city: found.city || '', country: found.country || '', postalCode: found.postalCode || '' }) 
                      }
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Invoice Type"
                    data={INVOICE_TYPE_CODES}
                    required
                    {...form.getInputProps('invoiceTypeCode')}
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
                  <Table.Th style={{ width: '50px' }}>#</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Tax</Table.Th>
                  <Table.Th>Allowance</Table.Th>
                  <Table.Th>Charge</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lineItems.map((item, index) => {
                  const baseTotal = item.quantity * item.unitPrice
                  const allowance = item.allowanceAmount || 0
                  const charge = item.chargeAmount || 0
                  const subtotal = baseTotal - allowance + charge
                  const taxAmount = item.taxScheme === 'VAT' ? subtotal * 0.1 : 0
                  const totalWithTax = subtotal + taxAmount
                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text fw={500} size="sm" c="dimmed">
                          {index + 1}
                        </Text>
                      </Table.Td>
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
                          min={1}
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
                        <Select
                          data={TAX_OPTIONS}
                          value={item.taxScheme}
                          onChange={(value) => updateLineItem(item.id, 'taxScheme', value || 'VAT')}
                          w={120}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Checkbox
                            checked={!!(item.allowanceAmount && item.allowanceAmount > 0)}
                            onChange={(e) => {
                              if (e.currentTarget.checked) {
                                openAllowanceChargeModal(item.id, 'allowance')
                              } else {
                                removeAllowanceCharge(item.id, 'allowance')
                              }
                            }}
                            size="sm"
                          />
                          {item.allowanceAmount && item.allowanceAmount > 0 && (
                            <Group gap={4}>
                              {/* <Badge size="xs" color="gray" variant="light" title="ChargeIndicator: false">
                                false
                              </Badge> */}
                              <Text size="xs" c="dimmed" truncate>
                                {item.allowanceReason || 'No reason'}
                              </Text>
                              <Text size="xs" fw={500} c="green">
                                {form.values.currency} {item.allowanceAmount.toFixed(2)}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Checkbox
                            checked={!!(item.chargeAmount && item.chargeAmount > 0)}
                            onChange={(e) => {
                              if (e.currentTarget.checked) {
                                openAllowanceChargeModal(item.id, 'charge')
                              } else {
                                removeAllowanceCharge(item.id, 'charge')
                              }
                            }}
                            size="sm"
                          />
                          {item.chargeAmount && item.chargeAmount > 0 && (
                            <Group gap={4}>
                              {/* <Badge size="xs" color="blue" variant="light" title="ChargeIndicator: true">
                                true
                              </Badge> */}
                              <Text size="xs" c="dimmed" truncate>
                                {item.chargeReason || 'No reason'}
                              </Text>
                              <Text size="xs" fw={500} c="green">
                                {form.values.currency} {item.chargeAmount.toFixed(2)}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{form.values.currency} {totalWithTax.toFixed(2)}</Text>
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
                  )
                })}
              </Table.Tbody>
            </Table>
          </Card>

          {/* Summary */}
          <Card withBorder>
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Textarea
                  label="Payment Terms"
                  placeholder="Payment terms and conditions"
                  {...form.getInputProps('paymentTerms')}
                />
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
                      <Text>Total:</Text>
                      <Text>{form.values.currency} {(calculateSubtotal() + calculateTax()).toFixed(2)}</Text>
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
              Create Invoice
            </Button>
          </Group>
        </Stack>
      </form>

      {/* Allowance/Charge Modal */}
      <Modal
        opened={allowanceChargeModal.opened}
        onClose={closeAllowanceChargeModal}
        title={allowanceChargeModal.type === 'allowance' ? 'Add Allowance' : 'Add Charge'}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {allowanceChargeModal.type === 'allowance' 
              ? 'Allowance (ChargeIndicator: false) - Discount or reduction applied to this line item'
              : 'Charge (ChargeIndicator: true) - Additional fee applied to this line item'}
          </Text>
          
          <TextInput
            label="Reason"
            placeholder="Enter reason for allowance or charge (optional)"
            value={allowanceChargeForm.reason}
            onChange={(e) => setAllowanceChargeForm({ ...allowanceChargeForm, reason: e.target.value })}
            description="According to XML spec: AllowanceChargeReason is optional [0..n]"
          />

          <NumberInput
            label="Amount"
            placeholder="Enter amount"
            value={allowanceChargeForm.amount}
            onChange={(value) => setAllowanceChargeForm({ ...allowanceChargeForm, amount: Number(value) || 0 })}
            min={0}
            decimalScale={2}
            prefix={form.values.currency + ' '}
            required
            description="According to XML spec: Amount is mandatory [1..1]"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={closeAllowanceChargeModal}>
              Cancel
            </Button>
            <Button onClick={saveAllowanceCharge}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageLayout>
  )
}
