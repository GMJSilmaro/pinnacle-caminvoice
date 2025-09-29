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
  country: string
  notes: string
  // CamInv related fields
  camInvId: string
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
      country: 'Cambodia',
      notes: '',
      // CamInv related fields
      camInvId: '',
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

  const handleSubmit = (values: ClientFormData) => {
    // TODO: Implement actual client creation logic
    console.log('Creating client:', values)

    showNotification.success('Client created successfully!')

    // Navigate back to clients list
    router.push('/customers')
  }

  const handleCheckCamInv = () => {
    const camInvId = form.values.camInvId
    if (!camInvId) {
      showNotification.warning('Please enter a CamInv ID to check registration status')
      return
    }

    // TODO: Implement actual CamInv API check
    showNotification.info(`Checking CamInv registration for ID: ${camInvId}...`)

    // Mock response after 2 seconds
    setTimeout(() => {
      showNotification.success('Customer is registered with CamInvoice!')
      // Auto-fill form with mock data
      form.setValues({
        ...form.values,
        companyNameEn: 'Sample Company Ltd',
        companyNameKh: 'ក្រុមហ៊ុនគំរូ',
        tin: 'K001-901234567'
      })
    }, 2000)
  }

  return (
    <PageLayout
      title="Add New Customer"
      subtitle="Create a new customer profile"
      // actions={
      //   <Button
      //     variant="light"
      //     leftSection={<IconArrowLeft size={16} />}
      //     onClick={() => router.push('/customers')}
      //   >
      //     Back to Clients
      //   </Button>
      // }
    >
      <Card withBorder p="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
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
                      { value: 'Pending', label: 'Pending' },
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
                      description="Leave empty if not registered with CamInvoice"
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
                    label="Tax Identification Number (TIN)"
                    placeholder="K001-901234567"
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
