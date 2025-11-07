"use client";

import { Box, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  // Use separate selectors to prevent unnecessary re-renders
  const notifications = useStore((s) => s.notifications);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const removeNotification = useStore((s) => s.removeNotification);
  
  const [mounted, setMounted] = useState(false);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Box p="md">
        <Title order={2} mb="md">Notifications</Title>
        <Text c="dimmed">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <Title order={2}>Notifications</Title>
        <Group>
          <Button 
            variant="light" 
            onClick={markAllAsRead} 
            disabled={notifications.length === 0}
          >
            Mark all read
          </Button>
        </Group>
      </Group>

      <Stack>
        {notifications.length === 0 ? (
          <Text c="dimmed">No notifications yet</Text>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} withBorder radius="md" p="md">
              <Group justify="space-between" align="start">
                <Group align="start">
                  <IconBell size={18} />
                  <Box>
                    <Text fw={600}>{n.title}</Text>
                    {n.message && (
                      <Text size="sm" c="dimmed">
                        {n.message}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                </Group>
                <Group gap="xs">
                  {!n.read && (
                    <Button size="xs" variant="subtle" onClick={() => markAsRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                  <Button size="xs" color="red" variant="subtle" onClick={() => removeNotification(n.id)}>
                    Remove
                  </Button>
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
}

