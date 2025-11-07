"use client";

import {
  Grid,
  Card,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Button,
  Paper,
  Divider,
  Badge,
  Box,
} from "@mantine/core";
import {
  IconHeadset,
  IconMail,
  IconPhone,
  IconClock,
  IconMessageCircle,
  IconBook,
  IconVideo,
  IconFileText,
  IconChevronRight,
  IconExternalLink,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();

  const supportChannels = [
    {
      icon: <IconHeadset size={24} />,
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      color: "blue",
      available: true,
      action: "Start Chat",
    },
    {
      icon: <IconMail size={24} />,
      title: "Email Support",
      description: "support@pinnacle.com",
      color: "green",
      available: true,
      action: "Send Email",
      href: "mailto:support@pinnacle.com",
    },
    {
      icon: <IconPhone size={24} />,
      title: "Phone Support",
      description: "+855 1234 5678",
      color: "violet",
      available: true,
      action: "Call Now",
      href: "tel:+85512345678",
    },
    {
      icon: <IconMessageCircle size={24} />,
      title: "Community Forum",
      description: "Ask questions and share knowledge",
      color: "orange",
      available: true,
      action: "Visit Forum",
    },
  ];

  const resources = [
    {
      icon: <IconBook size={20} />,
      title: "Knowledge Base",
      description: "Browse articles and tutorials",
      count: "150+ articles",
    },
    {
      icon: <IconVideo size={20} />,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      count: "25 videos",
    },
    {
      icon: <IconFileText size={20} />,
      title: "Documentation",
      description: "Complete API and user documentation",
      count: "Full docs",
    },
  ];

  const faqCategories = [
    {
      title: "Getting Started",
      count: 12,
      onClick: () => {
        // Could navigate to a FAQ page
        console.log("Navigate to Getting Started FAQs");
      },
    },
    {
      title: "Invoice Management",
      count: 18,
      onClick: () => {
        console.log("Navigate to Invoice Management FAQs");
      },
    },
    {
      title: "CamInvoice Integration",
      count: 15,
      onClick: () => {
        console.log("Navigate to Integration FAQs");
      },
    },
    {
      title: "Billing & Payments",
      count: 8,
      onClick: () => {
        console.log("Navigate to Billing FAQs");
      },
    },
  ];

  return (
    <Stack gap="xl">
      {/* Support Channels */}
      <Box>
        <Text size="lg" fw={600} mb="md">
          Contact Support
        </Text>
        <Text size="sm" c="dimmed" mb="lg">
          Choose the best way to reach us. Our team is available 24/7 to help you.
        </Text>
        <Grid gutter="md">
          {supportChannels.map((channel, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <ThemeIcon size={48} radius="md" variant="light" color={channel.color}>
                      {channel.icon}
                    </ThemeIcon>
                    {channel.available && (
                      <Badge color="green" variant="light" size="sm">
                        Available
                      </Badge>
                    )}
                  </Group>
                  <div>
                    <Text fw={600} size="md" mb={4}>
                      {channel.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {channel.description}
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    color={channel.color}
                    fullWidth
                    rightSection={<IconChevronRight size={16} />}
                    onClick={() => {
                      if (channel.href) {
                        window.location.href = channel.href;
                      } else {
                        console.log(`Action: ${channel.action}`);
                      }
                    }}
                  >
                    {channel.action}
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Box>

      <Divider />

      {/* Support Hours */}
      <Paper p="lg" radius="md" withBorder style={{ backgroundColor: "var(--mantine-color-blue-0)" }}>
        <Group gap="md">
          <ThemeIcon size={40} radius="md" variant="light" color="blue">
            <IconClock size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text fw={600} mb={4}>
              Support Hours
            </Text>
            <Text size="sm" c="dimmed">
              Our support team is available 24/7 via live chat and email. Phone support is available Monday - Friday, 8:00 AM - 6:00 PM (GMT+7).
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Resources */}
      <Box>
        <Text size="lg" fw={600} mb="md">
          Learning Resources
        </Text>
        <Text size="sm" c="dimmed" mb="lg">
          Explore our comprehensive resources to help you get the most out of Pinnacle e-Invoice.
        </Text>
        <Grid gutter="md">
          {resources.map((resource, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 4 }}>
              <Card
                shadow="xs"
                padding="lg"
                radius="md"
                withBorder
                style={{ cursor: "pointer", transition: "transform 0.2s" }}
                onClick={() => {
                  console.log(`Navigate to ${resource.title}`);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon size={40} radius="md" variant="light" color="gray">
                    {resource.icon}
                  </ThemeIcon>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="sm" mb={4}>
                      {resource.title}
                    </Text>
                    <Text size="xs" c="dimmed" mb={4}>
                      {resource.description}
                    </Text>
                    <Badge size="xs" variant="dot" color="blue">
                      {resource.count}
                    </Badge>
                  </div>
                  <IconChevronRight size={18} style={{ color: "var(--mantine-color-dimmed)" }} />
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Box>

      <Divider />

      {/* FAQ Categories */}
      <Box>
        <Group justify="space-between" mb="md">
          <div>
            <Text size="lg" fw={600}>
              Frequently Asked Questions
            </Text>
            <Text size="sm" c="dimmed">
              Browse answers to common questions by category
            </Text>
          </div>
          <Button
            variant="subtle"
            rightSection={<IconExternalLink size={16} />}
            onClick={() => router.push("/")}
          >
            View All FAQs
          </Button>
        </Group>
        <Grid gutter="md">
          {faqCategories.map((category, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6 }}>
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ cursor: "pointer", transition: "all 0.2s" }}
                onClick={category.onClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Group justify="space-between">
                  <Text fw={500}>{category.title}</Text>
                  <Group gap="xs">
                    <Badge size="sm" variant="light" color="gray">
                      {category.count}
                    </Badge>
                    <IconChevronRight size={16} style={{ color: "var(--mantine-color-dimmed)" }} />
                  </Group>
                </Group>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      </Box>
    </Stack>
  );
}

