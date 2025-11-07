"use client";

import {
  Box,
  Burger,
  Button,
  Divider,
  Flex,
  Group,
  Menu,
  Text,
  rem,
  ActionIcon,
  Indicator,
} from "@mantine/core";
import {
  IconLogout2,
  IconUserCircle,
  IconHelpCircle,
  IconBell,
  IconSettings,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState } from "react";
import { useStore } from "../../store/useStore";
import classes from "./styles/Header.module.css";
import ResourceCenterModal from "../ui/ResourceCenterModal/ResourceCenterModal.client";
import NotificationsModal from "../ui/NotificationsModal/NotificationsModal.client";
import { getNotificationIcon } from "../../utils/notifications";

interface Props {
  opened: boolean;
  toggle: () => void;
}

export default function Header({ opened, toggle }: Props) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [resourceOpen, setResourceOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const notifications = useStore((s) => s.notifications);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const addNotification = useStore((s) => s.addNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Debug: Log notifications count (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Notifications in store:', notifications.length, 'Unread:', unreadCount);
    }
  }, [notifications, unreadCount]);
  // Prevent React hydration mismatches by rendering only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  if (!mounted) return null;

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "Loading...";
    return `${user.firstName} ${user.lastName}`;
  };

  const getUserRole = () => {
    if (!user) return "Loading...";

    switch (user.role) {
      case "PROVIDER":
        return "Service Provider";
      case "TENANT_ADMIN":
        return "Tenant Admin";
      case "TENANT_USER":
        return "Tenant User";
      default:
        return user.role;
    }
  };

  return (
    <Box className={classes.root} w="100%" h="100%">
      <Box className={classes.wrapper} w="100%" h="100%">
        {/* Left brand section */}
        <Flex align="center" gap={8} className={classes.brand}>
          <img
              src="/PXCLogo.svg"
              alt="PXC Logo"
              width={180}
              height={150}
              style={{ display: 'block' }}
            />
          <Box component="span" className={classes.beta}>
            Early Access v1.0
          </Box>
        </Flex>

        {/* Middle placeholder (reserved for search/global actions) */}
        <Box />

        {/* Right actions */}
        <Flex h="100%" align="center" gap={8} className={classes.right}>
          {/* Test Notification Button (Development Only) */}
          {/* {process.env.NODE_ENV === 'development' && (
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                const { addTestNotification } = require('../../utils/notifications');
                addTestNotification();
              }}
              title="Add Test Notification"
            >
              Test
            </Button>
          )}
           */}
          {/* Notifications */}
          <Menu shadow="md" width={280}>
            <Menu.Target>
              <Indicator
                disabled={unreadCount === 0}
                label={unreadCount}
                size={16}
              >
                <ActionIcon variant="subtle" aria-label="Notifications">
                  <IconBell style={{ width: rem(16), height: rem(16) }} />
                </ActionIcon>
              </Indicator>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Notifications</Menu.Label>
              {notifications.length === 0 ? (
                <Menu.Item disabled>No notifications yet</Menu.Item>
              ) : (
                <>
                  {notifications.slice(0, 5).map((n) => {
                    const IconComponent = getNotificationIcon(n.type);
                    return (
                      <Menu.Item
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          if (n.link) router.push(n.link);
                        }}
                        leftSection={
                          <IconComponent 
                            size={18} 
                            style={{ 
                              color: n.read ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-blue-6)',
                              flexShrink: 0,
                            }} 
                          />
                        }
                        style={{
                          backgroundColor: n.read ? 'transparent' : 'var(--mantine-color-blue-0)',
                          padding: rem(10),
                        }}
                      >
                        <Box style={{ width: '100%' }}>
                          <Group justify="space-between" align="flex-start" gap="xs">
                            <Text 
                              fw={n.read ? 500 : 600} 
                              fz={13} 
                              lh={1.2}
                              c={n.read ? 'dimmed' : 'dark'}
                              style={{ flex: 1 }}
                            >
                              {n.title}
                            </Text>
                            {!n.read && (
                              <Box
                                style={{
                                  width: rem(6),
                                  height: rem(6),
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--mantine-color-blue-6)',
                                  flexShrink: 0,
                                  marginTop: rem(4),
                                }}
                              />
                            )}
                          </Group>
                          {n.message && (
                            <Text 
                              fz={12} 
                              c="dimmed" 
                              lineClamp={2}
                              mt={rem(4)}
                              style={{ lineHeight: 1.4 }}
                            >
                              {n.message}
                            </Text>
                          )}
                          <Group gap="xs" mt={rem(4)}>
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
                      </Menu.Item>
                    );
                  })}
                  <Divider my={4} />
                  {unreadCount > 0 && (
                    <Menu.Item onClick={() => markAllAsRead()}>
                      Mark all as read ({unreadCount})
                    </Menu.Item>
                  )}
                  <Menu.Item onClick={() => setNotificationsModalOpen(true)}>
                    View all notifications ({notifications.length})
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>

          {/* Quick Help opens Resource Center */}
          <Button
            variant="light"
            size="xs"
            leftSection={
              <IconHelpCircle style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() => setResourceOpen(true)}
          >
            Help
          </Button>

          <Divider orientation="vertical" h={24} />

          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Button
                px={8}
                variant="subtle"
                className={classes.profileButton}
                disabled={loading}
              >
                <Flex align="center" gap={6}>
                  <Flex direction="column" align="start">
                    <Text
                      className={classes.profileName}
                      fz={14}
                      lh={1.1}
                      fw={600}
                      lts={-0.3}
                    >
                      {getUserDisplayName()}
                    </Text>
                    <Text fz={12} fw={500} lts={-0.3} c="dimmed" lh={1.1}>
                      {getUserRole()}
                    </Text>
                  </Flex>
                </Flex>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>User Management</Menu.Label>
              <Menu.Item
                leftSection={
                  <IconUserCircle style={{ width: rem(14), height: rem(14) }} />
                }
                component="a"
                href="/profile"
              >
                My Profile
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Pinnacle Resource Center</Menu.Label>
              <Menu.Item
                leftSection={
                  <IconHelpCircle style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => setResourceOpen(true)}
              >
                Help & Guide
              </Menu.Item>
              <Menu.Item
                leftSection={
                  <IconSettings style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => router.push('/settings')}
              >
                Settings
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Account</Menu.Label>
              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout2 style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={handleLogout}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <ResourceCenterModal
            opened={resourceOpen}
            onClose={() => setResourceOpen(false)}
          />

          <NotificationsModal
            opened={notificationsModalOpen}
            onClose={() => setNotificationsModalOpen(false)}
          />
        </Flex>
      </Box>
    </Box>
  );
}
