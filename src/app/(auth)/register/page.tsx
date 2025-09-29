'use client'

import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Checkbox,
  Alert,
  Grid,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconInfoCircle, IconAlertCircle } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { showNotification } from '../../../utils/notifications'

export default function RegisterPage() {
  const router = useRouter()
  const { register, user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const targetPath = user.role === 'PROVIDER' ? '/provider' : '/portal'
      router.push(targetPath)
    }
  }, [user, loading, router])

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      agreeToTerms: false,
    },
    validate: {
      firstName: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length < 8 ? 'Password must be at least 8 characters' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords do not match' : null,
      companyName: (value) => (value.length < 2 ? 'Company name is required' : null),
      agreeToTerms: (value) => (!value ? 'You must agree to the terms and conditions' : null),
    },
  })

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        companyName: values.companyName,
        role: 'TENANT_ADMIN', // New registrations are tenant admins
      })

      if (result.success) {
        showNotification.success('Account created successfully! Welcome to CamInvoice Portal.', 'Registration Successful')
        router.push('/onboarding') // Redirect to onboarding
      } else {
        setError(result.error || 'Registration failed')
        showNotification.error(result.error || 'Registration failed', 'Registration Error')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      showNotification.error('An unexpected error occurred', 'Registration Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Stack gap="md" align="center">
        <Title order={2}>Loading...</Title>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <div style={{ textAlign: 'center' }}>
        <Title order={2} mb="xs">
          Create Account
        </Title>
        <Text c="dimmed" size="sm">
          Join CamInvoice Portal to manage your e-invoicing
        </Text>
      </div>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          title="Registration Failed"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="First Name"
                placeholder="John"
                required
                {...form.getInputProps('firstName')}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Last Name"
                placeholder="Doe"
                required
                {...form.getInputProps('lastName')}
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Company Name"
            placeholder="Your Company Ltd."
            required
            {...form.getInputProps('companyName')}
          />

          <TextInput
            label="Email Address"
            placeholder="your@company.com"
            required
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Create a strong password"
            required
            {...form.getInputProps('password')}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            {...form.getInputProps('confirmPassword')}
          />

          <Checkbox
            label={
              <Text size="sm">
                I agree to the{' '}
                <Anchor href="#" size="sm">
                  Terms of Service
                </Anchor>{' '}
                and{' '}
                <Anchor href="#" size="sm">
                  Privacy Policy
                </Anchor>
              </Text>
            }
            required
            {...form.getInputProps('agreeToTerms', { type: 'checkbox' })}
          />

          <Button
            type="submit"
            fullWidth
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Stack>
      </form>

      <Text size="sm" c="dimmed" ta="center">
        Already have an account?{' '}
        <Anchor component={Link} href="/login" fw={500}>
          Sign in
        </Anchor>
      </Text>
    </Stack>
  )
}
