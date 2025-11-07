'use client'

import {
  Card,
  TextInput,
  Button,
  Group,
  Stack,
  Select,
  Textarea,
  Grid,
  Title,
  Text,
  Alert,
  ActionIcon,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconArrowLeft, IconRefresh, IconInfoCircle } from '@tabler/icons-react'
import { showNotification } from '../../../../utils/notifications'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../components/layouts/PageLayout'

interface ClientFormData {
  name: string
  email: string
  phone: string
  status: string
  address: string
  city: string
  postalCode: string
  country: string
  notes: string
  businessName: string
  businessNameKh: string
  businessType: string
  businessAddress: string
  businessCity: string
  businessPostalCode: string
  businessCountry: string
  businessWebsite: string
  businessEmail: string
  businessPhone: string
  registrationNumber: string
  // CamInv related fields
  camInvId: string
  camInvoiceEndpointId: string
  companyNameEn: string
  companyNameKh: string
  tin: string
}

export default function CreateClientPage() {
  const router = useRouter()

  const form = useForm<ClientFormData>({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      status: 'Active',
      address: '',
      city: '',
      postalCode: '',
      country: 'Cambodia',
      notes: '',
      businessName: '',
      businessNameKh: '',
      businessType: '',
      businessAddress: '',
      businessCity: '',
      businessCountry: '',
      businessPostalCode: '',
      businessWebsite: '',
      businessEmail: '',
      businessPhone: '',
      registrationNumber: '',
      // CamInv related fields
      camInvId: '',
      camInvoiceEndpointId: '',
      companyNameEn: '',
      companyNameKh: '',
      tin: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      phone: (value) => (value.length < 8 ? 'Phone number must be at least 8 digits' : null),
    },
  })

  const handleSubmit = async (values: ClientFormData) => {
    try {
      const payload = {
        name: values.name,
        businessName: values.companyNameEn || undefined,
        companyNameKh: values.companyNameKh || undefined,
        camInvoiceEndpointId: values.camInvoiceEndpointId || values.camInvId || undefined,
        // taxId should be the CamInvoice endpointId (KHUID...)
        taxId: values.camInvoiceEndpointId || values.camInvId || undefined,
        // registrationNumber should store VATTIN/TIN per your rule
        registrationNumber: values.registrationNumber || values.tin || undefined,
        email: values.email,
        phone: values.phone,
        status: values.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        address: values.address || 'N/A',
        city: values.city || 'Phnom Penh',
        postalCode: values.postalCode || undefined,
        country: values.country || 'Cambodia',
      }
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to create customer')
      showNotification.success('Customer created successfully!')
      router.push('/customers')
      // signal list to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('customers:refresh'))
      }
    } catch (err: any) {
      showNotification.error(err?.message || 'Failed to create customer')
    }
  }

  const handleCheckCamInv = async () => {
    const camInvId = form.values.camInvId
    if (!camInvId) {
      showNotification.warning('Please enter a CamInv ID to check registration status')
      return
    }

    try {
      showNotification.info(`Checking CamInv registration for ID: ${camInvId}...`)
      const res = await fetch(`/api/internal/caminvoice/member/${encodeURIComponent(camInvId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.success) throw new Error(body?.error || 'Verification failed')

      const detail = body.detail || {}
      // Flexible fallback mapping because API fields may vary
      const mapped = {
        endpointId: detail.endpoint_id || detail.endpointId,
        nameEn: detail.company_name_en || detail.endpoint_name || '',
        nameKh: detail.company_name_kh || '',
        tin: detail.tin || detail.vat_tin || '',
        // registrationNumber in our DB should store VATTIN/TIN per your rule
        registrationNumberFromApi: detail.tin || detail.vat_tin || '',
        address: detail.address || detail.street || detail.street_name || '',
        city: detail.city || detail.city_name || '',
        postalCode: detail.postal_code || detail.postalZone || detail.postal_zone || '',
      }

      form.setValues({
        ...form.values,
        companyNameEn: mapped.nameEn || form.values.companyNameEn,
        companyNameKh: mapped.nameKh || form.values.companyNameKh,
        tin: mapped.tin || form.values.tin,
        camInvId: mapped.endpointId || form.values.camInvId,
        camInvoiceEndpointId: mapped.endpointId || form.values.camInvoiceEndpointId,
        name: form.values.name || mapped.nameEn || form.values.name,
        address: form.values.address || mapped.address || form.values.address,
        city: form.values.city || mapped.city || form.values.city,
        postalCode: form.values.postalCode || mapped.postalCode || form.values.postalCode,
        registrationNumber: form.values.registrationNumber || mapped.registrationNumberFromApi || form.values.registrationNumber,
      })
      showNotification.success('Customer is registered with CamInvoice!')
    } catch (err: any) {
      showNotification.error(err?.message || 'Failed to verify CamInvoice registration')
    }
  }

  return (
    <PageLayout
      title="Add New Customer"
      subtitle="Create a new customer profile"
    >
      <Card withBorder p="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <div>
              <Title order={3} mb="md">CamInvoice Registration</Title>
              <Alert
                icon={<IconInfoCircle size={16} />}
                title="CamInvoice Integration"
                color="blue"
                mb="md"
              >
                Enter the customer's CamInv ID to check their registration status with the Cambodia e-Invoicing system.
                This helps identify whether the customer can receive electronic invoices.
              </Alert>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Group align="end" gap="xs">
                    <TextInput
                      label="CamInv ID (Endpoint ID)"
                      placeholder="KHUID00001234"
                      description="Leave empty if not registered with CamInvoice."
                      style={{ flex: 1 }}
                      {...form.getInputProps('camInvId')}
                    />
                    <Button
                      variant="light"
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleCheckCamInv}
                      disabled={!form.values.camInvId}
                    >
                      Check
                    </Button>
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="VATTIN (TIN)"
                    placeholder="K001-901234567"
                    description="Auto-populated if registered with CamInvoice."
                    {...form.getInputProps('tin')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Company Name (English)"
                    placeholder="Official company name in English"
                    {...form.getInputProps('companyNameEn')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Company Name (Khmer)"
                    placeholder="ឈ្មោះក្រុមហ៊ុនជាភាសាខ្មែរ"
                    {...form.getInputProps('companyNameKh')}
                  />
                </Grid.Col>
              </Grid>
            </div>
            <div>
              <Title order={3} mb="md">Basic Information</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Customer Name"
                    placeholder="Enter customer name"
                    required
                    {...form.getInputProps('name')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Email Address"
                    placeholder="customer@example.com"
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
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Status"
                    data={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' },
                    ]}
                    {...form.getInputProps('status')}
                  />
                </Grid.Col>
              </Grid>
            </div>

            <div>
              <Title order={3} mb="md">Address Information</Title>
              <Grid>
                <Grid.Col span={12}>
                  <TextInput
                    label="Address"
                    placeholder="Street address"
                    {...form.getInputProps('address')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="City"
                    placeholder="Phnom Penh"
                    {...form.getInputProps('city')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Postal Code"
                    placeholder="12000"
                    {...form.getInputProps('postalCode')}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
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
              </Grid>
            </div>
            
            <div>
              <Title order={3} mb="md">Additional Information</Title>
              <Textarea
                label="Notes"
                placeholder="Additional notes about the client..."
                rows={4}
                {...form.getInputProps('notes')}
              />
            </div>


            <Group justify="flex-end" mt="xl">
              <Button
                variant="light"
                onClick={() => router.push('/customers')}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Customer
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </PageLayout>
  )
}
