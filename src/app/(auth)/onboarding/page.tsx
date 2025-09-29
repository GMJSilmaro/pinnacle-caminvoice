'use client'

import {
  Stepper,
  Button,
  Group,
  TextInput,
  Textarea,
  Stack,
  Title,
  Text,
  Alert,
  Card,
  Badge,
  Center,
  ThemeIcon,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { 
  IconBuilding, 
  IconPlugConnected, 
  IconCheck, 
  IconInfoCircle,
  IconExternalLink 
} from '@tabler/icons-react'

export default function OnboardingPage() {
  const [active, setActive] = useState(0)
  
  const form = useForm({
    initialValues: {
      businessName: '',
      taxId: '',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
    },
    validate: {
      businessName: (value) => (value.length < 2 ? 'Business name is required' : null),
      taxId: (value) => (value.length < 5 ? 'Valid tax ID is required' : null),
      address: (value) => (value.length < 10 ? 'Complete address is required' : null),
      contactPerson: (value) => (value.length < 2 ? 'Contact person is required' : null),
      phone: (value) => (value.length < 8 ? 'Valid phone number is required' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  })

  const nextStep = () => setActive((current) => (current < 2 ? current + 1 : current))
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current))

  const handleBusinessInfoSubmit = () => {
    const validation = form.validate()
    if (!validation.hasErrors) {
      nextStep()
    }
  }

  const handleCamInvConnect = () => {
    // TODO: Implement CamInv OAuth flow
    alert('CamInv OAuth integration will be implemented in the backend phase')
    nextStep()
  }

  const handleFinish = () => {
    // TODO: Complete onboarding and redirect to dashboard
    alert('Onboarding complete! Redirecting to dashboard...')
  }

  return (
    <Stack gap="xl">
      <div style={{ textAlign: 'center' }}>
        <Title order={2} mb="xs">
          Welcome to CamInvoice Portal
        </Title>
        <Text c="dimmed" size="sm">
          Let's get your account set up in just a few steps
        </Text>
      </div>

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
        <Stepper.Step 
          label="Business Info" 
          description="Your company details"
          icon={<IconBuilding size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert 
              icon={<IconInfoCircle size={16} />} 
              color="blue" 
              variant="light"
            >
              Please provide your business information for CamInvoice registration.
            </Alert>

            <TextInput
              label="Business Name"
              placeholder="Your Company Ltd."
              required
              {...form.getInputProps('businessName')}
            />

            <TextInput
              label="Tax ID / Business Registration Number"
              placeholder="123456789"
              required
              {...form.getInputProps('taxId')}
            />

            <Textarea
              label="Business Address"
              placeholder="Complete business address"
              required
              minRows={3}
              {...form.getInputProps('address')}
            />

            <TextInput
              label="Contact Person"
              placeholder="John Doe"
              required
              {...form.getInputProps('contactPerson')}
            />

            <TextInput
              label="Phone Number"
              placeholder="+855 12 345 678"
              required
              {...form.getInputProps('phone')}
            />

            <TextInput
              label="Email Address"
              placeholder="contact@company.com"
              required
              {...form.getInputProps('email')}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step 
          label="Connect CamInv" 
          description="Link your CamInvoice account"
          icon={<IconPlugConnected size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert 
              icon={<IconInfoCircle size={16} />} 
              color="orange" 
              variant="light"
              title="CamInvoice Integration"
            >
              Connect your business to the Cambodia e-Invoicing system to start issuing compliant invoices.
            </Alert>

            <Card withBorder>
              <Stack gap="md">
                <Group>
                  <ThemeIcon size="lg" variant="light" color="blue">
                    <IconPlugConnected size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>CamInvoice Service Provider</Text>
                    <Text size="sm" c="dimmed">
                      Official Cambodia e-Invoicing Platform
                    </Text>
                  </div>
                </Group>

                <Text size="sm">
                  By connecting to CamInvoice, you'll be able to:
                </Text>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li><Text size="sm">Issue legally compliant e-invoices</Text></li>
                  <li><Text size="sm">Automatically submit to tax authorities</Text></li>
                  <li><Text size="sm">Track invoice status in real-time</Text></li>
                  <li><Text size="sm">Generate verification QR codes</Text></li>
                </ul>

                <Button 
                  leftSection={<IconExternalLink size={16} />}
                  variant="light"
                  fullWidth
                  onClick={handleCamInvConnect}
                >
                  Connect to CamInvoice
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Stepper.Step>

        <Stepper.Step 
          label="Complete" 
          description="You're all set!"
          icon={<IconCheck size={18} />}
        >
          <Stack gap="md" mt="md" align="center">
            <ThemeIcon size={80} variant="light" color="green" radius="xl">
              <IconCheck size={40} />
            </ThemeIcon>
            
            <div style={{ textAlign: 'center' }}>
              <Title order={3} c="green">
                Setup Complete!
              </Title>
              <Text c="dimmed" mt="xs">
                Your CamInvoice Portal account is ready to use
              </Text>
            </div>

            <Card withBorder w="100%">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Business Name:</Text>
                  <Text size="sm">{form.values.businessName || 'Not provided'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Tax ID:</Text>
                  <Text size="sm">{form.values.taxId || 'Not provided'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>CamInvoice Status:</Text>
                  <Badge color="green" variant="light">Connected</Badge>
                </Group>
              </Stack>
            </Card>

            <Button 
              size="md" 
              fullWidth
              onClick={handleFinish}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={prevStep} disabled={active === 0}>
          Back
        </Button>
        
        {active < 2 && (
          <Button 
            onClick={active === 0 ? handleBusinessInfoSubmit : nextStep}
          >
            {active === 0 ? 'Continue' : 'Next step'}
          </Button>
        )}
      </Group>
    </Stack>
  )
}
