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
  Badge,
  Collapse,
  MultiSelect,
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconSend,
  IconGavel,
  IconInfoCircle,
  IconCalculator,
  IconBuilding,
  IconUser,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDisclosure } from '@mantine/hooks'
import PageLayout from '../../../../components/layouts/PageLayout'
import {
  InvoiceFormData,
  InvoiceLineFormItem,
  AllowanceChargeFormItem,
  Party,
  CURRENCY_CODES,
  UNIT_CODES,
  INVOICE_TYPE_CODES,
  TAX_SCHEMES,
  DEFAULT_TAX_RATES
} from '../../../../types/invoice'
import {
  createEmptyLineItem,
  createEmptyAllowanceCharge,
  updateLineItemCalculations,
  calculateDocumentTaxTotals,
  calculateLegalMonetaryTotal,
  formatCurrency,
  isExchangeRateRequired,
  getTaxBreakdownSummary
} from '../../../../utils/invoiceCalculations'

// Mock data for customers
const mockCustomers = [
  { value: 'cust-001', label: 'ABC Corporation', taxId: 'TAX001', address: '123 Main St, Phnom Penh' },
  { value: 'cust-002', label: 'XYZ Trading Ltd', taxId: 'TAX002', address: '456 Business Ave, Siem Reap' },
  { value: 'cust-003', label: 'Tech Solutions Co', taxId: 'TAX003', address: '789 Tech Park, Phnom Penh' },
  { value: 'cust-004', label: 'Global Imports', taxId: 'TAX004', address: '321 Trade Center, Battambang' },
]

// Mock supplier data (would come from tenant settings)
const mockSupplierParty: Partial<Party> = {
  endpointId: 'KHUID00001234',
  partyName: 'Your Business Name',
  postalAddress: {
    streetName: 'Main Street',
    cityName: 'Phnom Penh',
    countryIdentificationCode: 'KH'
  },
  partyTaxScheme: {
    companyId: 'K008-0000001',
    taxScheme: { id: 'VAT', name: 'Value Added Tax', description: 'Standard VAT' }
  },
  partyLegalEntity: {
    registrationName: 'Your Business Legal Name',
    companyId: '0005000001'
  },
  contact: {
    telephone: '+855 12 345 678',
    electronicMail: 'contact@yourbusiness.com'
  }
}

// Mock customer party data (would be selected from customers)
const mockCustomerParty: Partial<Party> = {
  endpointId: '',
  partyName: '',
  postalAddress: {
    streetName: '',
    cityName: '',
    countryIdentificationCode: 'KH'
  },
  partyTaxScheme: {
    companyId: '',
    taxScheme: { id: 'VAT', name: 'Value Added Tax', description: 'Standard VAT' }
  },
  partyLegalEntity: {
    registrationName: '',
    companyId: ''
  },
  contact: {
    telephone: '',
    electronicMail: ''
  }
}

export default function EnhancedCreateInvoicePage() {
  const router = useRouter()
  
  // State for line items with enhanced tax support
  const [lineItems, setLineItems] = useState<InvoiceLineFormItem[]>([
    createEmptyLineItem()
  ])
  
  // State for allowance/charge items
  const [allowanceCharges, setAllowanceCharges] = useState<AllowanceChargeFormItem[]>([])
  
  // State for party details
  const [supplierParty, setSupplierParty] = useState<Partial<Party>>(mockSupplierParty)
  const [customerParty, setCustomerParty] = useState<Partial<Party>>(mockCustomerParty)

  const form = useForm<InvoiceFormData>({
    initialValues: {
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      currency: 'USD',
      exchangeRate: undefined,
      customerId: '',
      lineItems: [],
      allowanceCharges: [],
      paymentTermsNote: 'Payment due within 30 days',
      notes: '',
      terms: 'Payment due within 30 days',
    },
    validate: {
      customerId: (value) => (!value ? 'Please select a customer' : null),
      invoiceNumber: (value) => (!value ? 'Invoice number is required' : null),
      issueDate: (value) => (!value ? 'Issue date is required' : null),
      dueDate: (value) => (!value ? 'Due date is required' : null),
      currency: (value) => (!value ? 'Currency is required' : null),
      exchangeRate: (value, values) => {
        if (isExchangeRateRequired(values.currency) && !value) {
          return 'Exchange rate is required for non-KHR currencies'
        }
        return null
      },
    },
  })

  const addLineItem = () => {
    setLineItems([...lineItems, createEmptyLineItem()])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const updateLineItem = (updatedItem: InvoiceLineFormItem) => {
    const recalculatedItem = updateLineItemCalculations(updatedItem)
    setLineItems(lineItems.map(item => 
      item.id === updatedItem.id ? recalculatedItem : item
    ))
  }

  const addAllowanceCharge = () => {
    setAllowanceCharges([...allowanceCharges, createEmptyAllowanceCharge()])
  }

  const removeAllowanceCharge = (id: string) => {
    setAllowanceCharges(allowanceCharges.filter(item => item.id !== id))
  }

  const updateAllowanceCharge = (id: string, field: keyof AllowanceChargeFormItem, value: any) => {
    setAllowanceCharges(allowanceCharges.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Calculate totals using the new calculation utilities
  const documentTaxTotals = calculateDocumentTaxTotals(lineItems, allowanceCharges)
  const legalMonetaryTotals = calculateLegalMonetaryTotal(lineItems, allowanceCharges)
  const taxBreakdown = getTaxBreakdownSummary(documentTaxTotals)

  const handleCustomerChange = (customerId: string | null) => {
    if (!customerId) return

    form.setFieldValue('customerId', customerId)

    // Auto-populate customer party details based on selection
    const selectedCustomer = mockCustomers.find(c => c.value === customerId)
    if (selectedCustomer) {
      setCustomerParty({
        ...mockCustomerParty,
        partyName: selectedCustomer.label,
        partyTaxScheme: {
          ...mockCustomerParty.partyTaxScheme!,
          companyId: selectedCustomer.taxId
        },
        postalAddress: {
          ...mockCustomerParty.postalAddress!,
          streetName: selectedCustomer.address.split(',')[0] || '',
          cityName: selectedCustomer.address.split(',')[1]?.trim() || ''
        }
      })
    }
  }

  const handleCurrencyChange = (currency: string | null) => {
    if (!currency) return

    form.setFieldValue('currency', currency)

    // Clear exchange rate if switching to KHR
    if (currency === 'KHR') {
      form.setFieldValue('exchangeRate', undefined)
    }

    // Note: Line item amounts don't need to be converted as they represent
    // the same value in the new currency. The currency symbol will update automatically
    // in the display components through the form.values.currency prop
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // TODO: Implement server action to create invoice
      const invoiceData = {
        ...values,
        lineItems,
        allowanceCharges,
        supplierParty,
        customerParty,
        documentTaxTotals,
        legalMonetaryTotals,
        status: 'draft',
      }
      
      console.log('Creating UBL invoice:', invoiceData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to invoice list or detail page
      router.push('/invoices')
    } catch (error) {
      console.error('Failed to create invoice:', error)
    }
  }

  const selectedCustomer = mockCustomers.find(c => c.value === form.values.customerId)

  return (
    <PageLayout
      title="Create New Invoice"
      subtitle="Create and submit a new UBL-compliant invoice to CamInvoice system"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Invoice Header Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Invoice Information</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Invoice Number"
                    placeholder="INV-001"
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
              </Grid>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Currency"
                    placeholder="Select currency"
                    data={CURRENCY_CODES.map(code => ({ value: code, label: code }))}
                    required
                    value={form.values.currency}
                    onChange={handleCurrencyChange}
                  />
                </Grid.Col>
                {isExchangeRateRequired(form.values.currency) && (
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                      label="Exchange Rate to KHR"
                      placeholder="4000"
                      description="Required for non-KHR currencies"
                      min={0}
                      decimalScale={4}
                      required
                      {...form.getInputProps('exchangeRate')}
                    />
                  </Grid.Col>
                )}
              </Grid>

              <Select
                label="Customer"
                placeholder="Select a customer"
                data={mockCustomers}
                required
                searchable
                value={form.values.customerId}
                onChange={handleCustomerChange}
              />

              <TextInput
                label="Invoice Type Code"
                value={INVOICE_TYPE_CODES.STANDARD}
                readOnly
                description="Standard invoice type for CamInv"
              />
            </Stack>
          </Card>

          {/* Supplier Party Details */}
          <PartyDetailsForm
            title="Supplier Party (Your Business)"
            party={supplierParty}
            onChange={setSupplierParty}
            readOnly={true}
            isSupplier={true}
          />

          {/* Customer Party Details */}
          {form.values.customerId && (
            <PartyDetailsForm
              title="Customer Party"
              party={customerParty}
              onChange={setCustomerParty}
              readOnly={false}
              isSupplier={false}
            />
          )}

          {/* Line Items Section */}
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

              <Stack gap="lg">
                {lineItems.map((item, index) => (
                  <Paper key={item.id} p="md" withBorder>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text fw={500}>Item #{index + 1}</Text>
                        {lineItems.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>

                      <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Item Name"
                            placeholder="Product or service name"
                            value={item.name}
                            onChange={(e) => updateLineItem({ ...item, name: e.target.value })}
                            required
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <TextInput
                            label="Description"
                            placeholder="Detailed description"
                            value={item.description}
                            onChange={(e) => updateLineItem({ ...item, description: e.target.value })}
                            required
                          />
                        </Grid.Col>
                      </Grid>

                      <Grid>
                        <Grid.Col span={{ base: 12, md: 3 }}>
                          <NumberInput
                            label="Quantity"
                            value={item.quantity}
                            onChange={(value) => updateLineItem({ ...item, quantity: Number(value) || 1 })}
                            min={1}
                            required
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 3 }}>
                          <Select
                            label="Unit"
                            data={UNIT_CODES}
                            value={item.unitCode}
                            onChange={(value) => updateLineItem({ ...item, unitCode: value || 'none' })}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 3 }}>
                          <NumberInput
                            label="Unit Price"
                            value={item.unitPrice}
                            onChange={(value) => updateLineItem({ ...item, unitPrice: Number(value) || 0 })}
                            min={0}
                            decimalScale={2}
                            prefix={form.values.currency + ' '}
                            required
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 3 }}>
                          <NumberInput
                            label="Line Total"
                            value={item.lineExtensionAmount}
                            readOnly
                            decimalScale={2}
                            prefix={form.values.currency + ' '}
                          />
                        </Grid.Col>
                      </Grid>

                      {/* Tax Selector Component */}
                      <TaxSelector
                        lineItem={item}
                        onChange={updateLineItem}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Card>

          {/* Allowance/Charge Section */}
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Document Level Allowances & Charges</Title>
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="light"
                  onClick={addAllowanceCharge}
                >
                  Add Allowance/Charge
                </Button>
              </Group>

              {allowanceCharges.length > 0 && (
                <Stack gap="md">
                  {allowanceCharges.map((item) => (
                    <Paper key={item.id} p="md" withBorder>
                      <Grid>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <Select
                            label="Type"
                            data={[
                              { value: 'false', label: 'Allowance' },
                              { value: 'true', label: 'Charge' }
                            ]}
                            value={item.isCharge.toString()}
                            onChange={(value) => updateAllowanceCharge(item.id, 'isCharge', value === 'true')}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <TextInput
                            label="Reason"
                            placeholder="Discount, shipping, etc."
                            value={item.reason}
                            onChange={(e) => updateAllowanceCharge(item.id, 'reason', e.target.value)}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 3 }}>
                          <NumberInput
                            label="Amount"
                            value={item.amount}
                            onChange={(value) => updateAllowanceCharge(item.id, 'amount', Number(value) || 0)}
                            min={0}
                            decimalScale={2}
                            prefix={form.values.currency + ' '}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 2 }}>
                          <Group mt="xl">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => removeAllowanceCharge(item.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Grid.Col>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Payment Terms */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Payment Terms</Title>
              <Textarea
                label="Payment Terms Note"
                placeholder="Payment due within 30 days"
                rows={3}
                {...form.getInputProps('paymentTermsNote')}
              />
            </Stack>
          </Card>

          {/* Invoice Totals */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>
                <Group gap="xs">
                  <IconCalculator size={20} />
                  Invoice Totals
                </Group>
              </Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text>Line Extension Amount:</Text>
                      <Text fw={500}>
                        {formatCurrency(legalMonetaryTotals.lineExtensionAmount, form.values.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Tax Exclusive Amount:</Text>
                      <Text fw={500}>
                        {formatCurrency(legalMonetaryTotals.taxExclusiveAmount, form.values.currency)}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Total Tax Amount:</Text>
                      <Text fw={500} c="blue">
                        {formatCurrency(documentTaxTotals.taxAmount, form.values.currency)}
                      </Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text fw={600} size="lg">Payable Amount:</Text>
                      <Text fw={600} size="lg" c="green">
                        {formatCurrency(legalMonetaryTotals.payableAmount, form.values.currency)}
                      </Text>
                    </Group>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text fw={500} mb="xs">Tax Breakdown:</Text>
                    {taxBreakdown.map((tax, index) => (
                      <Group key={index} justify="space-between">
                        <Text size="sm">{tax.taxScheme} ({tax.percent}%):</Text>
                        <Text size="sm" fw={500}>
                          {formatCurrency(tax.taxAmount, form.values.currency)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* Additional Notes */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Additional Information</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Textarea
                    label="Notes"
                    placeholder="Additional notes for this invoice"
                    rows={4}
                    {...form.getInputProps('notes')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Textarea
                    label="Terms & Conditions"
                    placeholder="Terms and conditions"
                    rows={4}
                    {...form.getInputProps('terms')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* CamInvoice Integration Info */}
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            <Text fw={500} mb="xs">CamInvoice Integration</Text>
            <Text size="sm">
              This invoice will be submitted to the Cambodia e-Invoicing system (CamInvoice)
              as a UBL-compliant XML document for official validation and digital signature.
              All mandatory fields according to UBL 2.1 Invoice schema are included.
            </Text>
          </Alert>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              variant="light"
              leftSection={<IconGavel size={16} />}
              type="submit"
            >
              Save as Draft
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              type="submit"
            >
              Create & Submit to CamInvoice
            </Button>
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}
