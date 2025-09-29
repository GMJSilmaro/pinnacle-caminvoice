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
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconSend,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../../components/layouts/PageLayout'

// Mock data for customers
const mockCustomers = [
  { value: 'cust-001', label: 'ABC Corporation', taxId: 'TAX001' },
  { value: 'cust-002', label: 'XYZ Trading Ltd', taxId: 'TAX002' },
  { value: 'cust-003', label: 'Tech Solutions Co', taxId: 'TAX003' },
]

// Mock credit note data
const mockCreditNote = {
  id: 'CN-001',
  noteNo: 'CN-2024-001',
  type: 'Credit Note' as 'Credit Note' | 'Debit Note',
  customerId: 'cust-001',
  originalInvoiceId: 'INV-2024-001',
  originalInvoiceNo: 'INV-2024-001',
  issueDate: '2024-01-20',
  reason: 'Product return',
  description: 'Returned defective items from Invoice INV-2024-001',
  amount: 500,
  taxAmount: 50,
  totalAmount: 550,
  currency: 'USD',
  status: 'draft',
  notes: 'Customer returned items due to quality issues',
}

export default function EditCreditNotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [noteType, setNoteType] = useState<'Credit Note' | 'Debit Note'>(mockCreditNote.type)

  const form = useForm({
    initialValues: {
      noteNo: mockCreditNote.noteNo,
      customerId: mockCreditNote.customerId,
      originalInvoiceId: mockCreditNote.originalInvoiceId,
      originalInvoiceNo: mockCreditNote.originalInvoiceNo,
      issueDate: mockCreditNote.issueDate,
      reason: mockCreditNote.reason,
      description: mockCreditNote.description,
      amount: mockCreditNote.amount,
      taxAmount: mockCreditNote.taxAmount,
      currency: mockCreditNote.currency,
      notes: mockCreditNote.notes,
    },
    validate: {
      noteNo: (value) => (!value ? 'Note number is required' : null),
      customerId: (value) => (!value ? 'Please select a customer' : null),
      originalInvoiceNo: (value) => (!value ? 'Original invoice number is required' : null),
      issueDate: (value) => (!value ? 'Issue date is required' : null),
      reason: (value) => (!value ? 'Reason is required' : null),
      description: (value) => (!value ? 'Description is required' : null),
      amount: (value) => (value <= 0 ? 'Amount must be greater than 0' : null),
    },
  })

  const calculateTotal = () => {
    return form.values.amount + form.values.taxAmount
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // TODO: Implement server action to update credit/debit note
      const noteData = {
        ...values,
        type: noteType,
        totalAmount: calculateTotal(),
        status: mockCreditNote.status,
        id: params.id,
      }
      
      console.log('Updating credit/debit note:', noteData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect back to credit notes list
      router.push('/credit-notes')
    } catch (error) {
      console.error('Failed to update credit/debit note:', error)
    }
  }

  const selectedCustomer = mockCustomers.find(c => c.value === form.values.customerId)

  return (
    <PageLayout
      title={`Edit ${noteType}`}
      subtitle={`Edit ${noteType.toLowerCase()} ${mockCreditNote.noteNo}`}
      actions={
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push('/credit-notes')}
        >
          Back to Credit Notes
        </Button>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Status Warning */}
          {mockCreditNote.status !== 'draft' && (
            <Alert color="orange" icon={<IconInfoCircle size={16} />}>
              <Text fw={500} mb="xs">Note Status: {mockCreditNote.status}</Text>
              <Text size="sm">
                This {noteType.toLowerCase()} has been submitted to CamInvoice. Changes may require resubmission.
              </Text>
            </Alert>
          )}

          {/* Note Type Selection */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Note Type</Title>
              <Select
                label="Type"
                data={[
                  { value: 'Credit Note', label: 'Credit Note (Refund/Return)' },
                  { value: 'Debit Note', label: 'Debit Note (Additional Charge)' },
                ]}
                value={noteType}
                onChange={(value) => setNoteType(value as 'Credit Note' | 'Debit Note')}
              />
              <Text size="sm" c="dimmed">
                {noteType === 'Credit Note' 
                  ? 'Use credit notes for refunds, returns, or corrections that reduce the amount owed.'
                  : 'Use debit notes for additional charges, penalties, or corrections that increase the amount owed.'
                }
              </Text>
            </Stack>
          </Card>

          {/* Basic Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Basic Information</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Note Number"
                    placeholder="CN-2024-001"
                    required
                    {...form.getInputProps('noteNo')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Issue Date"
                    type="date"
                    required
                    {...form.getInputProps('issueDate')}
                  />
                </Grid.Col>
              </Grid>

              <Select
                label="Customer"
                placeholder="Select a customer"
                data={mockCustomers}
                required
                searchable
                {...form.getInputProps('customerId')}
              />

              {selectedCustomer && (
                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                  <Text fw={500}>{selectedCustomer.label}</Text>
                  <Text size="sm">Tax ID: {selectedCustomer.taxId}</Text>
                </Alert>
              )}
            </Stack>
          </Card>

          {/* Original Invoice Reference */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Original Invoice Reference</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Original Invoice Number"
                    placeholder="INV-2024-001"
                    required
                    {...form.getInputProps('originalInvoiceNo')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Reason"
                    placeholder="Select reason"
                    data={
                      noteType === 'Credit Note' 
                        ? [
                            { value: 'Product return', label: 'Product Return' },
                            { value: 'Service cancellation', label: 'Service Cancellation' },
                            { value: 'Pricing error', label: 'Pricing Error' },
                            { value: 'Quality issue', label: 'Quality Issue' },
                            { value: 'Discount adjustment', label: 'Discount Adjustment' },
                            { value: 'Other', label: 'Other' },
                          ]
                        : [
                            { value: 'Additional service', label: 'Additional Service' },
                            { value: 'Late payment fee', label: 'Late Payment Fee' },
                            { value: 'Interest charge', label: 'Interest Charge' },
                            { value: 'Penalty', label: 'Penalty' },
                            { value: 'Price adjustment', label: 'Price Adjustment' },
                            { value: 'Other', label: 'Other' },
                          ]
                    }
                    required
                    {...form.getInputProps('reason')}
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Description"
                placeholder="Detailed description of the reason for this note"
                rows={3}
                required
                {...form.getInputProps('description')}
              />
            </Stack>
          </Card>

          {/* Amount Details */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Amount Details</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <NumberInput
                    label="Amount"
                    placeholder="0.00"
                    required
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="$"
                    {...form.getInputProps('amount')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <NumberInput
                    label="Tax Amount"
                    placeholder="0.00"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="$"
                    {...form.getInputProps('taxAmount')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Currency"
                    data={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'KHR', label: 'KHR - Cambodian Riel' },
                    ]}
                    {...form.getInputProps('currency')}
                  />
                </Grid.Col>
              </Grid>

              {/* Total Display */}
              <Group justify="flex-end">
                <Stack gap="xs" align="flex-end">
                  <Group gap="xl">
                    <Text fw={700} size="lg">Total Amount:</Text>
                    <Badge size="lg" color={noteType === 'Credit Note' ? 'red' : 'green'}>
                      {noteType === 'Credit Note' ? '-' : '+'}${calculateTotal().toFixed(2)}
                    </Badge>
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
                placeholder="Additional notes for this credit/debit note"
                rows={3}
                {...form.getInputProps('notes')}
              />
            </Stack>
          </Card>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.push('/credit-notes')}>
              Cancel
            </Button>
            <Button
              variant="light"
              leftSection={<IconDeviceFloppy size={16} />}
              type="submit"
            >
              Save Changes
            </Button>
            {mockCreditNote.status === 'draft' && (
              <Button
                leftSection={<IconSend size={16} />}
                type="submit"
              >
                Save & Submit to CamInvoice
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}
