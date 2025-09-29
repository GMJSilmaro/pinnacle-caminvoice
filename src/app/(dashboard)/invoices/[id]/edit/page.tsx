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
  Divider,
  ActionIcon,
  Table,
  Alert,
  Paper,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconSend,
  IconGavel,
  IconInfoCircle,
  IconArrowLeft,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PageLayout from '../../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../../utils/notifications'
import { useLoadingProgress } from '../../../../../hooks/useNavigationProgress'

interface CustomerOpt { value: string; label: string; taxId?: string; address?: string }

interface InvoiceLineItem {
  id: string
  productId: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  amount: number
}

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [status, setStatus] = useState<string>('DRAFT')
  const { startLoading, completeLoading } = useLoadingProgress()

  const form = useForm({
    initialValues: {
      customerId: '',
      invoiceNumber: '',
      issueDate: '',
      dueDate: '',
      currency: 'USD',
      notes: '',
      terms: '',
    },
    validate: {
      customerId: (value) => (!value ? 'Please select a customer' : null),
      invoiceNumber: (value) => (!value ? 'Invoice number is required' : null),
      issueDate: (value) => (!value ? 'Issue date is required' : null),
      dueDate: (value) => (!value ? 'Due date is required' : null),
    },
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [invRes, custRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch('/api/customers?pageSize=100')
      ])
      if (custRes.ok) {
        const c = await custRes.json()
        if (mounted) setCustomers((c.items || c.data || []).map((x: any) => ({ value: x.id, label: x.name, taxId: x.taxId, address: x.address })))
      }
      if (invRes.ok) {
        const invData = await invRes.json()
        const inv = invData.invoice
        if (mounted && inv) {
          setStatus(inv.status)
          form.setValues({
            customerId: inv.customerId,
            invoiceNumber: inv.invoiceNumber,
            issueDate: inv.issueDate?.slice(0, 10) || '',
            dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
            currency: inv.currency || 'USD',
            notes: inv.notes || '',
            terms: '',
          })
          setLineItems(
            (inv.lineItems || []).map((li: any) => ({
              id: li.id,
              productId: '',
              description: li.description,
              quantity: Number(li.quantity || 0),
              unitPrice: Number(li.unitPrice || 0),
              taxRate: Number(li.taxRate || 0) * 100, // convert decimal to %
              amount: Number(li.lineTotal || 0) + Number(li.taxAmount || 0),
            }))
          )
        }
      }
    })()
    return () => { mounted = false }
  }, [id])

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedItems = [...lineItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate amount
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const item = updatedItems[index]
      const subtotal = item.quantity * item.unitPrice
      const tax = subtotal * (item.taxRate / 100)
      updatedItems[index].amount = subtotal + tax
    }
    
    setLineItems(updatedItems)
  }

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 10,
      amount: 0,
    }
    setLineItems([...lineItems, newItem])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const totalTax = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0)
    const total = subtotal + totalTax
    return { subtotal, totalTax, total }
  }

  const { subtotal, totalTax, total } = calculateTotals()

  const handleSubmit = async (values: typeof form.values) => {
    try {
      startLoading()
      showNotification.loading.show('updating-invoice', 'Updating invoice...')

      const payload = {
        ...values,
        customerId: values.customerId,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate,
        })),
      }

      const resp = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) throw new Error('Failed to update')

      showNotification.loading.update('updating-invoice', 'Invoice updated successfully!', 'success')
      completeLoading()
      router.push(`/invoices/${id}`)
    } catch (error) {
      console.error('Failed to update invoice:', error)
      showNotification.loading.update('updating-invoice', 'Failed to update invoice. Please try again.', 'error')
      completeLoading()
    }
  }

  const selectedCustomer = customers.find(c => c.value === form.values.customerId)

  return (
    <PageLayout
      title="Edit Invoice"
      subtitle={`Edit invoice ${form.values.invoiceNumber || ''}`}
      actions={
        <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => router.push(`/invoices/${id}`)}>
          Back to Invoice
        </Button>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Status Warning */}
          {status !== 'DRAFT' && (
            <Alert color="orange" icon={<IconInfoCircle size={16} />}>
              <Text fw={500} mb="xs">Invoice Status: {status}</Text>
              <Text size="sm">This invoice has been submitted to CamInvoice. Changes may require resubmission.</Text>
            </Alert>
          )}

          {/* Invoice Details */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Invoice Information</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Invoice Number" placeholder="INV-001" required {...form.getInputProps('invoiceNumber')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <TextInput label="Issue Date" type="date" required {...form.getInputProps('issueDate')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <TextInput label="Due Date" type="date" required {...form.getInputProps('dueDate')} />
                </Grid.Col>
              </Grid>

              <Select label="Customer" placeholder="Select a customer" data={customers} required searchable {...form.getInputProps('customerId')} />

              {selectedCustomer && (
                <Paper p="md" bg="gray.0" radius="md">
                  <Stack gap="xs">
                    <Text fw={500}>{selectedCustomer.label}</Text>
                    <Text size="sm" c="dimmed">Tax ID: {selectedCustomer.taxId || '\u2014'}</Text>
                    <Text size="sm" c="dimmed">{selectedCustomer.address || '\u2014'}</Text>
                  </Stack>
                </Paper>
              )}

              <Select label="Currency" data={[{ value: 'USD', label: 'USD - US Dollar' }, { value: 'KHR', label: 'KHR - Cambodian Riel' }]} {...form.getInputProps('currency')} />
            </Stack>
          </Card>

          {/* Line Items */}
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Line Items</Title>
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="light"
                  onClick={addLineItem}
                >
                  Add Item
                </Button>
              </Group>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Unit Price</Table.Th>
                    <Table.Th>Tax %</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lineItems.map((item, index) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <TextInput
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          required
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.quantity}
                          onChange={(value) => updateLineItem(index, 'quantity', value || 1)}
                          min={1}
                          w={80}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.unitPrice}
                          onChange={(value) => updateLineItem(index, 'unitPrice', value || 0)}
                          min={0}
                          decimalScale={2}
                          fixedDecimalScale
                          prefix="$"
                          w={120}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.taxRate}
                          onChange={(value) => updateLineItem(index, 'taxRate', value || 0)}
                          min={0}
                          max={100}
                          suffix="%"
                          w={80}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>${item.amount.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {/* Totals */}
              <Group justify="flex-end">
                <Stack gap="xs" align="flex-end">
                  <Group gap="xl">
                    <Text>Subtotal:</Text>
                    <Text fw={500}>${subtotal.toFixed(2)}</Text>
                  </Group>
                  <Group gap="xl">
                    <Text>Tax:</Text>
                    <Text fw={500}>${totalTax.toFixed(2)}</Text>
                  </Group>
                  <Divider w={200} />
                  <Group gap="xl">
                    <Text fw={700} size="lg">Total:</Text>
                    <Text fw={700} size="lg">${total.toFixed(2)}</Text>
                  </Group>
                </Stack>
              </Group>
            </Stack>
          </Card>

          {/* Additional Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Additional Information</Title>
              <Textarea
                label="Notes"
                placeholder="Additional notes for this invoice"
                rows={3}
                {...form.getInputProps('notes')}
              />
              <Textarea
                label="Terms & Conditions"
                placeholder="Payment terms and conditions"
                rows={2}
                {...form.getInputProps('terms')}
              />
            </Stack>
          </Card>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.push(`/invoices/${id}`)}>
              Cancel
            </Button>
            <Button
              variant="light"
              leftSection={<IconGavel size={16} />}
              type="submit"
            >
              Save Changes
            </Button>
            {status === 'DRAFT' && (
              <Button leftSection={<IconSend size={16} />} type="submit">
                Save & Submit to CamInvoice
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}
