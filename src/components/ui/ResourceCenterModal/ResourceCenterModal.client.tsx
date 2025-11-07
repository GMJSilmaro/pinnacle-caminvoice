"use client";

import {
  Modal,
  Grid,
  Image,
  Accordion,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Divider,
  ScrollArea,
  Paper,
  ActionIcon,
  Box,
} from "@mantine/core";
import {
  IconHelpCircle,
  IconBook2,
  IconHeadset,
  IconBellRinging,
  IconMessageChatbot,
  IconExternalLink,
} from "@tabler/icons-react";
import React from "react";

export type ResourceCenterModalProps = {
  opened: boolean;
  onClose: () => void;
};

export default function ResourceCenterModal({ opened, onClose }: ResourceCenterModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      radius="md"
      overlayProps={{ blur: 2, opacity: 0.2 }}
      title={<Text fw={700}>Pinnacle Resource Center</Text>}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Grid gutter="xl" align="flex-start">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Accordion variant="separated" radius="md" defaultValue="q1">
            <Accordion.Item value="q1">
              <Accordion.Control>What is Pinnacle e-Invoice?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Pinnacle e-Invoice integrates with Cambodia's CamInvoice platform to create, submit, and track e-invoices securely.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q2">
              <Accordion.Control>Where can I see invoice status and history?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Use the Invoices page to view submission status, history, and download PDFs with QR verification.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q3">
              <Accordion.Control>Do you support Credit/Debit notes?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Yes, the same workflow applies. Create a note from the invoice details and submit to CamInvoice.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q4">
              <Accordion.Control>How do I create and submit an invoice?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Go to Invoices → New Invoice, complete buyer and line details, then click Submit to CamInvoice. The system will generate UBL XML and handle transmission.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q5">
              <Accordion.Control>What do invoice statuses mean?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Draft: not submitted. Pending: sent to CamInvoice and awaiting processing. Accepted: approved by CamInvoice. Rejected: failed validation — open the invoice to view reason and re-submit.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q6">
              <Accordion.Control>Where can I track submission progress?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Each invoice shows a Status Timeline of submission steps (Created → Submitted → Processing → Accepted/Rejected) so you can monitor events.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q7">
              <Accordion.Control>Do generated PDFs include QR verification?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Yes. PDFs include a CamInvoice verification QR. You can download the PDF from the invoice details page once the invoice is submitted.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q9">
              <Accordion.Control>How do I configure CamInvoice API credentials?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  Provider admins store Client ID/Secret in settings. The app securely requests access tokens as needed and refreshes them automatically during submission.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="q11">
              <Accordion.Control>How are notifications used?</Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">
                  The bell icon in the header shows recent activity. System toasts also appear for submissions, acceptances, or errors to help you act quickly.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

          </Accordion>
        </Grid.Col>

        <Grid.Col span={{ base: 10, md: 5 }}>
          <Stack gap="lg">
            <Image radius="md" src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop" alt="Help" />
            <Stack gap="md">
              {/* Link Rows */}
              <Box component="a" href="/support" style={{ textDecoration: "none" }}>
                <Paper radius="md" withBorder p="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={10} wrap="nowrap">
                      <ThemeIcon variant="light" color="indigo"><IconHeadset size={18} /></ThemeIcon>
                      <div>
                        <Text fw={600}>Support & Services</Text>
                        <Text size="sm" c="dimmed">Access support resources</Text>
                      </div>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" aria-label="Open"><IconExternalLink size={18} /></ActionIcon>
                  </Group>
                </Paper>
              </Box>

              <Box component="a" href="/updates" style={{ textDecoration: "none" }}>
                <Paper radius="md" withBorder p="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={10} wrap="nowrap">
                      <ThemeIcon variant="light" color="orange"><IconBellRinging size={18} /></ThemeIcon>
                      <div>
                        <Text fw={600}>Product Updates</Text>
                        <Text size="sm" c="dimmed">Check out updates and news</Text>
                      </div>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" aria-label="Open"><IconExternalLink size={18} /></ActionIcon>
                  </Group>
                </Paper>
              </Box>

              <Box component="a" href="/feedback" style={{ textDecoration: "none" }}>
                <Paper radius="md" withBorder p="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={10} wrap="nowrap">
                      <ThemeIcon variant="light" color="pink"><IconMessageChatbot size={18} /></ThemeIcon>
                      <div>
                        <Text fw={600}>Feedback</Text>
                        <Text size="sm" c="dimmed">Have a suggestion? We'd love to hear it!</Text>
                      </div>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" aria-label="Open"><IconExternalLink size={18} /></ActionIcon>
                  </Group>
                </Paper>
              </Box>
            </Stack>
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}

