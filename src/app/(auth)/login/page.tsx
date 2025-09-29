'use client'

import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Checkbox,
  Alert,
  Group,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertCircle } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { showNotification } from '../../../utils/notifications'
import classes from './AuthenticationImage.module.css'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectPath = searchParams.get('redirect') || '/portal'

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const targetPath = user.role === 'PROVIDER' ? '/provider' : '/portal'
      router.push(redirectPath.startsWith('/login') ? targetPath : redirectPath)
    }
  }, [user, loading, router, redirectPath])

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
    },
  })

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await login(values.email, values.password)

      if (result.success) {
        showNotification.success('Welcome back!', 'Login Successful')
        // Redirect will be handled by useEffect
      } else {
        setError(result.error || 'Login failed')
        showNotification.error(result.error || 'Login failed', 'Authentication Error')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      showNotification.error('An unexpected error occurred', 'Login Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Title order={3}>Loading...</Title>
      </Paper>
    )
  }

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.form} radius={0}>
        <Title order={2} className={classes.title}>
          Welcome back
        </Title>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" title="Login failed" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Email address" placeholder="you@example.com" size="md" radius="md" required {...form.getInputProps('email')} />
            <PasswordInput label="Password" placeholder="Your password" mt="md" size="md" radius="md" required {...form.getInputProps('password')} />
            <Checkbox label="Remember me" mt="xl" size="md" {...form.getInputProps('rememberMe', { type: 'checkbox' })} />
            <Button type="submit" fullWidth mt="xl" size="md" radius="md" loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
          </Stack>
        </form>

        <Text ta="center" mt="md">
          Don't have an account?{' '}
          <Anchor component={Link} href="/register" fw={500}>
            Create account
          </Anchor>
        </Text>
        <Group justify="center" mt="sm">
          <Anchor component={Link} href="#" size="sm">
            Forgot password?
          </Anchor>
        </Group>
      </Paper>
    </div>
  )
}
