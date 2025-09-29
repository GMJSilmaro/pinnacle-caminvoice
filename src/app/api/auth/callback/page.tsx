'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Paper, Title, Text, Loader, Stack, Alert } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`OAuth error: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received')
          return
        }

        // Exchange authorization code for tokens
        const response = await fetch('/api/provider/caminvoice/oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            code,
            state,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to exchange authorization code')
        }

        const data = await response.json()
        setStatus('success')
        setMessage('OAuth authorization completed successfully!')

        // Redirect back to provider setup after a short delay
        setTimeout(() => {
          router.push('/provider?tab=setup&oauth=success')
        }, 2000)

      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Paper withBorder p="xl" radius="md" style={{ maxWidth: 500, width: '100%' }}>
        <Stack gap="md" align="center">
          <Title order={2}>OAuth Callback</Title>
          
          {status === 'loading' && (
            <>
              <Loader size="lg" />
              <Text>Processing OAuth authorization...</Text>
            </>
          )}

          {status === 'success' && (
            <>
              <Alert 
                icon={<IconCheck size={16} />} 
                color="green" 
                variant="light"
                style={{ width: '100%' }}
              >
                <Text fw={500}>Success!</Text>
                <Text size="sm">{message}</Text>
                <Text size="sm" mt="xs">Redirecting you back to the setup page...</Text>
              </Alert>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert 
                icon={<IconX size={16} />} 
                color="red" 
                variant="light"
                style={{ width: '100%' }}
              >
                <Text fw={500}>Error</Text>
                <Text size="sm">{message}</Text>
              </Alert>
              <Text size="sm" c="dimmed" ta="center">
                You can close this window and try again.
              </Text>
            </>
          )}
        </Stack>
      </Paper>
    </div>
  )
}
