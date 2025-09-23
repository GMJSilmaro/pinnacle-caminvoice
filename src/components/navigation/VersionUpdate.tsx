"use client"
import {
  Box,
  Button,
  Card,
  Flex,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core"
import {
  IconDownload,
  IconX,
  IconSparkles,
} from "@tabler/icons-react"
import { useState } from "react"

interface VersionUpdateProps {
  isCollapsed?: boolean
}

export default function VersionUpdate({ isCollapsed = false }: VersionUpdateProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  if (isCollapsed) {
    return (
      <Tooltip
        label="Version Update Available"
        position="right"
        transitionProps={{ transition: "rotate-right" }}
      >
        <ActionIcon
          size="lg"
          radius="md"
          variant="gradient"
          gradient={{ from: "orange", to: "yellow" }}
          onClick={() => setIsVisible(false)}
        >
          <IconDownload size={18} />
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Card
      padding="md"
      radius="md"
      style={{
        background: "linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)",
        color: "white",
        position: "relative",
      }}
    >
      <ActionIcon
        size="sm"
        variant="subtle"
        color="white"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
        }}
        onClick={() => setIsVisible(false)}
      >
        <IconX size={12} />
      </ActionIcon>

      <Stack gap="sm" align="center">
        <Flex align="center" gap="xs">
          <ActionIcon size="sm" variant="white" color="orange">
            <IconDownload size={14} />
          </ActionIcon>
          <Text fw={600} size="sm">
            Version Update
          </Text>
        </Flex>

        <Box ta="center">
          <Text size="xs" opacity={0.9}>
            Current: v2.1.4
          </Text>
          <Flex align="center" justify="center" gap="xs" mt={2}>
            <Text size="xs" opacity={0.9}>
              Latest: v2.2.0 Available
            </Text>
            <Badge
              size="xs"
              variant="white"
              color="orange"
              leftSection={<IconSparkles size={10} />}
            >
              NEW FEATURES
            </Badge>
          </Flex>
        </Box>

        <Button
          size="xs"
          variant="white"
          color="orange"
          fullWidth
          radius="sm"
          fw={500}
        >
          View Changes
        </Button>
      </Stack>
    </Card>
  )
}
