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
  taxScheme: string
  total: number
}

interface InvoiceForm {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency: string
  exchangeRate?: number
  customerId: string
  invoiceTypeCode: string
  paymentTerms: string
}

// Constants
const CURRENCY_CODES = ['USD', 'KHR', 'EUR', 'THB']
const INVOICE_TYPE_CODES = [
  { value: '388', label: '388 - Tax Invoice' },
  { value: '751', label: '751 - Invoice Information for Accounting' }
]
const TAX_OPTIONS = [
  { value: 'VAT', label: 'VAT (10%)' },
  { value: 'SP', label: 'Specific Tax' },
  { value: 'PLT', label: 'Public Lighting Tax' },
  { value: 'AT', label: 'Accommodation Tax' }
]

export default function CleanCreateInvoicePage() {
  const router = useRouter()
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxScheme: 'VAT', total: 0 }
  ])
  const [supplierOpened, { toggle: toggleSupplier }] = useDisclosure(false)
  const [customerOpened, { toggle: toggleCustomer }] = useDisclosure(false)
  const [customers, setCustomers] = useState<{ value: string; label: string; taxId?: string; address?: string; city?: string }[]>([])
  const [supplierInfo, setSupplierInfo] = useState<{ name: string; taxId: string; address: string }>({ name: '', taxId: '', address: '' })

  const [customerPanel, setCustomerPanel] = useState<{ name: string; taxId: string; address: string }>({ name: '', taxId: '', address: '' })

  const form = useForm<InvoiceForm>({
    initialValues: {
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'USD',
      customerId: '',
      invoiceTypeCode: '388',
      paymentTerms: 'Net 30 days'
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
          if (mounted) setSupplierInfo({ name: c.companyName || '', taxId: c.taxId || '', address: `${c.address || ''}${c.city ? ', ' + c.city : ''}` })
          // default currency from company
          if (c.currency && mounted) form.setFieldValue('currency', c.currency)
        }
        if (customersRes.ok) {
          const j = await customersRes.json()
          const opts = (j.customers || []).map((k: any) => ({ value: k.id, label: k.name, taxId: k.taxId, address: `${k.address}${k.city ? ', ' + k.city : ''}` }))
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
      total: 0
    }
    setLineItems([...lineItems, newItem])

    // Show success notification
    showNotification.success('Added 1 Line Item', 'Line Item Added')
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice
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

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTax = () => {
    return lineItems.reduce((sum, item) => {
      const vatItems = item.taxScheme === 'VAT' ? item.total * 0.1 : 0
      return sum + vatItems
    }, 0)
  }

  const handleSubmit = async (values: InvoiceForm) => {
    try {
      showNotification.loading.show('create-invoice', 'Creating invoice...')
      const payload = {
        invoiceNumber: values.invoiceNumber,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        currency: values.currency,
        customerId: values.customerId,
        paymentTerms: values.paymentTerms,
        lineItems: lineItems.map((li) => ({ description: li.description, quantity: Number(li.quantity || 0), unitPrice: Number(li.unitPrice || 0), taxScheme: li.taxScheme })),
      }
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to create invoice')
      const data = await res.json()
      showNotification.loading.update('create-invoice', 'Invoice created successfully', 'success')
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
                        setCustomerPanel({ name: found.label, taxId: found.taxId || '', address: found.address || '' })
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
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Tax ID" value={supplierInfo.taxId} readOnly />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput label="Address" value={supplierInfo.address} readOnly />
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
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Tax ID" value={customerPanel.taxId} readOnly />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput label="Address" value={customerPanel.address} readOnly />
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
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Tax</Table.Th>
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
    </PageLayout>
  )
}
