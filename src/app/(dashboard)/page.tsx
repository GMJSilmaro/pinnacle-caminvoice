'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { Center, Loader, Stack, Text } from '@mantine/core'

export default function DashboardHome() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on user role
      if (user.role === 'PROVIDER') {
        router.push('/provider')
      } else {
        router.push('/portal')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading dashboard...</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Center h="50vh">
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text>Redirecting...</Text>
      </Stack>
    </Center>
  )
}
