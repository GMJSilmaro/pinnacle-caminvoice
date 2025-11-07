"use client";

import {
  Card,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Badge,
  Paper,
  Divider,
  Timeline,
  Button,
  Box,
  Grid,
} from "@mantine/core";
import {
  IconBellRinging,
  IconSparkles,
  IconBug,
  IconSettings,
  IconCheck,
  IconRocket,
  IconChevronRight,
  IconRss,
} from "@tabler/icons-react";

export default function UpdatesPage() {
  // Mock update data - in production, this would come from an API
  const updates = [
    {
      id: "1",
      version: "v2.3.0",
      date: "2024-01-15",
      type: "feature",
      title: "Enhanced Invoice Templates",
      description: "New customizable invoice templates with advanced styling options",
      items: [
        "Custom logo uploads",
        "Multiple template designs",
        "PDF preview before submission",
      ],
      status: "released",
    },
    {
      id: "2",
      version: "v2.2.5",
      date: "2024-01-08",
      type: "improvement",
      title: "Performance Improvements",
      description: "Faster invoice processing and improved API response times",
      items: [
        "50% faster invoice submission",
        "Optimized database queries",
        "Improved caching mechanism",
      ],
      status: "released",
    },
    {
      id: "3",
      version: "v2.2.0",
      date: "2023-12-20",
      type: "feature",
      title: "Bulk Invoice Upload",
      description: "Upload and process multiple invoices at once using CSV import",
      items: [
        "CSV template download",
        "Batch validation",
        "Progress tracking",
      ],
      status: "released",
    },
    {
      id: "4",
      version: "v2.1.8",
      date: "2023-12-10",
      type: "fix",
      title: "Bug Fixes & Stability",
      description: "Various bug fixes and stability improvements",
      items: [
        "Fixed PDF generation issues",
        "Resolved sync status delays",
        "Improved error handling",
      ],
      status: "released",
    },
    {
      id: "5",
      version: "v2.4.0",
      date: "2024-02-01",
      type: "feature",
      title: "Advanced Reporting Dashboard",
      description: "New analytics and reporting features (Coming Soon)",
      items: [
        "Revenue analytics",
        "Invoice trends",
        "Exportable reports",
      ],
      status: "upcoming",
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <IconSparkles size={18} />;
      case "improvement":
        return <IconSettings size={18} />;
      case "fix":
        return <IconBug size={18} />;
      default:
        return <IconRocket size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "blue";
      case "improvement":
        return "green";
      case "fix":
        return "orange";
      default:
        return "gray";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const recentUpdates = updates.filter((u) => u.status === "released").slice(0, 3);
  const upcomingUpdates = updates.filter((u) => u.status === "upcoming");

  return (
    <Stack gap="xl">
      {/* Summary Cards */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="md">
              <ThemeIcon size={48} radius="md" variant="light" color="blue">
                <IconSparkles size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  Latest Version
                </Text>
                <Text size="lg" fw={700}>
                  v2.3.0
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="md">
              <ThemeIcon size={48} radius="md" variant="light" color="green">
                <IconRocket size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  This Month
                </Text>
                <Text size="lg" fw={700}>
                  3 Updates
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="md">
              <ThemeIcon size={48} radius="md" variant="light" color="orange">
                <IconBellRinging size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  Coming Soon
                </Text>
                <Text size="lg" fw={700}>
                  1 Feature
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Subscribe Section */}
      <Paper p="lg" radius="md" withBorder style={{ backgroundColor: "var(--mantine-color-blue-0)" }}>
        <Group justify="space-between" wrap="wrap">
          <Group gap="md">
            <ThemeIcon size={40} radius="md" variant="light" color="blue">
              <IconRss size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} mb={4}>
                Stay Updated
              </Text>
              <Text size="sm" c="dimmed">
                Get notified about new features and updates via email
              </Text>
            </div>
          </Group>
          <Button color="blue" leftSection={<IconBellRinging size={16} />}>
            Subscribe to Updates
          </Button>
        </Group>
      </Paper>

      <Divider />

      {/* Recent Updates */}
      <Box>
        <Text size="lg" fw={600} mb="md">
          Recent Updates
        </Text>
        <Stack gap="md">
          {recentUpdates.map((update) => (
            <Card key={update.id} shadow="xs" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Group gap="md" wrap="nowrap">
                    <ThemeIcon
                      size={40}
                      radius="md"
                      variant="light"
                      color={getTypeColor(update.type)}
                    >
                      {getTypeIcon(update.type)}
                    </ThemeIcon>
                    <div>
                      <Group gap="xs" mb={4}>
                        <Text fw={600} size="md">
                          {update.title}
                        </Text>
                        <Badge size="sm" variant="light" color={getTypeColor(update.type)}>
                          {update.type}
                        </Badge>
                        <Badge size="sm" variant="dot" color="green">
                          Released
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {update.version} • {formatDate(update.date)}
                      </Text>
                    </div>
                  </Group>
                </Group>
                <Text size="sm" c="dimmed">
                  {update.description}
                </Text>
                <Box pl={8}>
                  <Stack gap={4}>
                    {update.items.map((item, index) => (
                      <Group key={index} gap="xs" wrap="nowrap">
                        <ThemeIcon size={16} radius="xl" color="green" variant="light">
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm">{item}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* Upcoming Features */}
      {upcomingUpdates.length > 0 && (
        <>
          <Divider />
          <Box>
            <Text size="lg" fw={600} mb="md">
              Coming Soon
            </Text>
            <Stack gap="md">
              {upcomingUpdates.map((update) => (
                <Card
                  key={update.id}
                  shadow="xs"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{
                    opacity: 0.9,
                    borderStyle: "dashed",
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="md" wrap="nowrap">
                        <ThemeIcon
                          size={40}
                          radius="md"
                          variant="light"
                          color={getTypeColor(update.type)}
                        >
                          {getTypeIcon(update.type)}
                        </ThemeIcon>
                        <div>
                          <Group gap="xs" mb={4}>
                            <Text fw={600} size="md">
                              {update.title}
                            </Text>
                            <Badge size="sm" variant="light" color="orange">
                              Upcoming
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed">
                            Expected: {formatDate(update.date)}
                          </Text>
                        </div>
                      </Group>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {update.description}
                    </Text>
                    <Box pl={8}>
                      <Stack gap={4}>
                        {update.items.map((item, index) => (
                          <Group key={index} gap="xs" wrap="nowrap">
                            <ThemeIcon size={16} radius="xl" color="orange" variant="light">
                              <IconRocket size={10} />
                            </ThemeIcon>
                            <Text size="sm">{item}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* All Updates Timeline */}
      <Divider />
      <Box>
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={600}>
            Update History
          </Text>
          <Button variant="subtle" rightSection={<IconChevronRight size={16} />}>
            View Changelog
          </Button>
        </Group>
        <Card shadow="xs" padding="lg" radius="md" withBorder>
          <Timeline active={-1} bulletSize={24} lineWidth={2}>
            {updates.slice(0, 5).map((update, index) => (
              <Timeline.Item
                key={update.id}
                bullet={getTypeIcon(update.type)}
                color={getTypeColor(update.type)}
                title={update.title}
              >
                <Text size="sm" c="dimmed" mb={4}>
                  {update.description}
                </Text>
                <Text size="xs" c="dimmed">
                  {update.version} • {formatDate(update.date)}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </Box>
    </Stack>
  );
}

