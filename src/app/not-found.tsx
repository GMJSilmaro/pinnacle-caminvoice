import { Button, Container, Group, Image, Text, Title } from '@mantine/core'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Container size={620} my={80}>
      <div style={{ position: 'relative' }}>
        <Image
          src="https://ui.mantine.dev/_next/static/media/not-found-image.38b1a2a1.svg"
          alt="Not found"
        />
      </div>
      <Title order={2} ta="center" mt="md">
        Nothing to see here
      </Title>
      <Text c="dimmed" ta="center" size="sm" mt="sm">
        The page you are trying to open does not exist. You may have mistyped the address, or the page has been moved to another URL.
      </Text>
      <Group justify="center" mt="lg">
        <Button component={Link} href="/" variant="default" size="md">
          Take me back to home page
        </Button>
      </Group>
    </Container>
  )
}

