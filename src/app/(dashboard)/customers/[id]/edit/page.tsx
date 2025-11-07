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
  Textarea,
  Grid,
  Alert,
  Switch,
  Badge,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconInfoCircle,
  IconShieldCheck,
  IconShieldX,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { showNotification } from '../../../../../utils/notifications'
import PageLayout from '../../../../../components/layouts/PageLayout'

// Mock customer data
const mockCustomer = {
  id: 'cust-001',
  name: 'ABC Corporation',
  businessName: 'ABC Corp Ltd',
  taxId: 'TAX001',
  email: 'admin@abccorp.com',
  phone: '+855 12 345 678',
  address: '123 Main St, Phnom Penh',
  city: 'Phnom Penh',
  country: 'Cambodia',
  postalCode: '12000',
  status: 'active',
  camInvRegistered: true,
  camInvEndpointId: 'EP001',
  notes: 'Premium customer with excellent payment history',
  paymentTerms: 30,
  creditLimit: 50000,
  preferredCurrency: 'USD',
}

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''

  const [camInvRegistered, setCamInvRegistered] = useState(mockCustomer.camInvRegistered)

  const form = useForm({
    initialValues: {
      name: mockCustomer.name,
      businessName: mockCustomer.businessName,
      taxId: mockCustomer.taxId,
      email: mockCustomer.email,
      phone: mockCustomer.phone,
      address: mockCustomer.address,
      city: mockCustomer.city,
      country: mockCustomer.country,
      postalCode: mockCustomer.postalCode,
      status: mockCustomer.status,
      camInvEndpointId: mockCustomer.camInvEndpointId,
      notes: mockCustomer.notes,
      paymentTerms: mockCustomer.paymentTerms,
      creditLimit: mockCustomer.creditLimit,
      preferredCurrency: mockCustomer.preferredCurrency,
    },
    validate: {
      name: (value) => (!value ? 'Customer name is required' : null),
      businessName: (value) => (!value ? 'Business name is required' : null),
      taxId: (value) => (!value ? 'Tax ID is required' : null),
      email: (value) => {
        if (!value) return 'Email is required'
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email format'
        return null
      },
      phone: (value) => (!value ? 'Phone number is required' : null),
      address: (value) => (!value ? 'Address is required' : null),
    },
  })
  // Load customer details
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/customers/${id}`, { credentials: 'include' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Failed to load customer')
        const c = (body as any).customer || {}
        form.setValues({
          name: c.name || '',
          businessName: c.businessName || c.name || '',
          taxId: c.taxId || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || '',
          country: c.country || 'Cambodia',
          postalCode: c.postalCode || '',
          status: (c.status === 'INACTIVE' ? 'inactive' : 'active'),
          camInvEndpointId: c.camInvEndpointId || '',
          notes: c.notes || '',
          paymentTerms: c.paymentTerms || 30,
          creditLimit: c.creditLimit || 0,
          preferredCurrency: c.preferredCurrency || 'USD',
        })
        setCamInvRegistered(Boolean(c.camInvEndpointId))
      } catch (err: any) {
        showNotification.error(err?.message || 'Failed to load customer')
      }
    })()
    return () => { mounted = false }
  }, [id])


  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        status: values.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : values.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        address: values.address,
        city: values.city,
        country: values.country,
      }
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update customer')
      showNotification.success('Customer updated successfully')
      router.push(`/customers/${id}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('customers:refresh'))
      }
    } catch (error: any) {
      showNotification.error(error?.message || 'Failed to update customer')
    }
  }

  return (
    <PageLayout
      title="Edit Customer"
      subtitle={`Edit customer ${mockCustomer.name}`}
      actions={
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push(`/customers/${id}`)}
        >
          Back to Customer
        </Button>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* CamInvoice Status */}
          <Alert
            color={camInvRegistered ? "green" : "orange"}
            icon={camInvRegistered ? <IconShieldCheck size={16} /> : <IconShieldX size={16} />}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500} mb="xs">
                  CamInvoice Registration Status
                </Text>
                <Text size="sm">
                  {camInvRegistered
                    ? 'This customer is registered with CamInvoice and can receive e-invoices.'
                    : 'This customer is not registered with CamInvoice. Manual invoice delivery required.'
                  }
                </Text>
              </div>
              <Badge color={camInvRegistered ? "green" : "orange"} variant="light">
                {camInvRegistered ? "Registered" : "Not Registered"}
              </Badge>
            </Group>
          </Alert>

          {/* Basic Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Basic Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Customer Name"
                    placeholder="ABC Corporation"
                    required
                    {...form.getInputProps('name')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Business Name"
                    placeholder="ABC Corp Ltd"
                    required
                    {...form.getInputProps('businessName')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Tax ID"
                    placeholder="TAX001"
                    required
                    {...form.getInputProps('taxId')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Status"
                    data={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                    {...form.getInputProps('status')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* Contact Information */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Contact Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Email Address"
                    placeholder="admin@abccorp.com"
                    type="email"
                    required
                    {...form.getInputProps('email')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Phone Number"
                    placeholder="+855 12 345 678"
                    required
                    {...form.getInputProps('phone')}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Address"
                    placeholder="123 Main St"
                    required
                    {...form.getInputProps('address')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="City"
                    placeholder="Phnom Penh"
                    {...form.getInputProps('city')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Country"
                    data={[
                      { value: 'Cambodia', label: 'Cambodia' },
                      { value: 'Thailand', label: 'Thailand' },
                      { value: 'Vietnam', label: 'Vietnam' },
                      { value: 'Singapore', label: 'Singapore' },
                    ]}
                    {...form.getInputProps('country')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Postal Code"
                    placeholder="12000"
                    {...form.getInputProps('postalCode')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>

          {/* CamInvoice Settings */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>CamInvoice Settings</Title>

              <Switch
                label="Registered with CamInvoice"
                description="Enable this if the customer is registered with the Cambodia e-Invoicing system"
                checked={camInvRegistered}
                onChange={(event) => setCamInvRegistered(event.currentTarget.checked)}
              />

              {camInvRegistered && (
                <TextInput
                  label="CamInvoice Endpoint ID"
                  placeholder="EP001"
                  description="The customer's endpoint ID in the CamInvoice system"
                  {...form.getInputProps('camInvEndpointId')}
                />
              )}
            </Stack>
          </Card>

          {/* Business Settings */}
          <Card withBorder>
            <Stack gap="md">
              <Title order={4}>Business Settings</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Preferred Currency"
                    data={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'KHR', label: 'KHR - Cambodian Riel' },
                    ]}
                    {...form.getInputProps('preferredCurrency')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Payment Terms (Days)"
                    placeholder="30"
                    type="number"
                    {...form.getInputProps('paymentTerms')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Credit Limit"
                    placeholder="50000"
                    type="number"
                    {...form.getInputProps('creditLimit')}
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                label="Notes"
                placeholder="Additional notes about this customer"
                rows={3}
                {...form.getInputProps('notes')}
              />
            </Stack>
          </Card>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.push(`/customers/${params.id}`)}>
              Cancel
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              type="submit"
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </PageLayout>
  )
}
