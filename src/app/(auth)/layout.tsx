import { Box } from '@mantine/core'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box style={{ minHeight: '100vh' }}>
      {children}
    </Box>
  )
}
