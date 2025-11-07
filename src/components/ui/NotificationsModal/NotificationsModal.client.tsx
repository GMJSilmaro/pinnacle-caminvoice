"use client";

import { Box, Button, Card, Group, Modal, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotificationIcon } from "@/utils/notifications";

export type NotificationsModalProps = {
  opened: boolean;
  onClose: () => void;
};

export default function NotificationsModal({ opened, onClose }: NotificationsModalProps) {
  const notifications = useStore((s) => s.notifications);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const removeNotification = useStore((s) => s.removeNotification);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNotificationClick = (notification: { link?: string; id: string; read: boolean }) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      onClose(); // Close modal before navigation
      // Use Next.js router if available, otherwise use window.location
      if (typeof window !== 'undefined') {
        window.location.href = notification.link;
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" style={{ width: '100%' }}>
          <Title order={3}>Notifications</Title>
          {notifications.length > 0 && (
            <Button
              variant="light"
              size="xs"
              onClick={() => {
                markAllAsRead();
              }}
            >
              Mark all read
            </Button>
          )}
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ blur: 2, opacity: 0.2 }}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {notifications.length === 0 ? (
          <Box ta="center" py="xl">
            <IconBell size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
            <Text c="dimmed" size="sm">
              No notifications yet
            </Text>
            <Text c="dimmed" size="xs" mt="xs">
              You'll see notifications here when actions occur
            </Text>
          </Box>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              withBorder
              radius="md"
              p="md"
              style={{
                backgroundColor: n.read ? 'transparent' : 'var(--mantine-color-blue-0)',
                cursor: n.link ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleNotificationClick(n)}
              onMouseEnter={(e) => {
                if (n.link) {
                  e.currentTarget.style.backgroundColor = n.read 
                    ? 'var(--mantine-color-gray-0)' 
                    : 'var(--mantine-color-blue-1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = n.read 
                  ? 'transparent' 
                  : 'var(--mantine-color-blue-0)';
              }}
            >
              <Group justify="space-between" align="start" wrap="nowrap">
                <Group align="start" gap="sm" style={{ flex: 1 }}>
                  {(() => {
                    const IconComponent = getNotificationIcon(n.type);
                    return (
                      <IconComponent 
                        size={20} 
                        style={{ 
                          color: n.read ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-blue-6)',
                          flexShrink: 0,
                          marginTop: 2,
                        }} 
                      />
                    );
                  })()}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                      <Text
                        fw={n.read ? 500 : 600}
                        fz={14}
                        style={{
                          flex: 1,
                          color: n.read ? 'var(--mantine-color-gray-7)' : 'var(--mantine-color-gray-9)',
                        }}
                      >
                        {n.title}
                      </Text>
                      {!n.read && (
                        <Box
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'var(--mantine-color-blue-6)',
                            flexShrink: 0,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </Group>
                    {n.message && (
                      <Text
                        fz={12}
                        c="dimmed"
                        mt={4}
                        style={{ lineHeight: 1.5 }}
                        lineClamp={2}
                      >
                        {n.message}
                      </Text>
                    )}
                    <Group gap="xs" mt={6} wrap="nowrap">
                      {n.user?.name && (
                        <Text
                          fz={10}
                          c="dimmed"
                          style={{ opacity: 0.8 }}
                        >
                          by {n.user.name}
                        </Text>
                      )}
                      <Text
                        fz={10}
                        c="dimmed"
                        style={{ opacity: 0.7 }}
                      >
                        {new Date(n.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Group>
                  </Box>
                </Group>
                <Group gap={4} wrap="nowrap">
                  {!n.read && (
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(n.id);
                    }}
                  >
                    Remove
                  </Button>
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Modal>
  );
}

