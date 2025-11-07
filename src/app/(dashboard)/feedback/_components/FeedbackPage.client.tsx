"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Textarea,
  Button,
  Select,
  Paper,
  Divider,
  Badge,
  Box,
  Grid,
  Alert,
} from "@mantine/core";
import {
  IconMessageChatbot,
  IconBulb,
  IconBug,
  IconHeart,
  IconThumbUp,
  IconThumbDown,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

export default function FeedbackPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    initialValues: {
      category: "",
      feedback: "",
      rating: "",
    },
    validate: {
      category: (value) => (value ? null : "Please select a category"),
      feedback: (value) => (value.length < 10 ? "Please provide more details (at least 10 characters)" : null),
      rating: (value) => (value ? null : "Please select a rating"),
    },
  });

  const feedbackCategories = [
    { value: "feature", label: "Feature Request", icon: <IconBulb size={18} />, color: "blue" },
    { value: "bug", label: "Bug Report", icon: <IconBug size={18} />, color: "red" },
    { value: "improvement", label: "Improvement Suggestion", icon: <IconThumbUp size={18} />, color: "green" },
    { value: "praise", label: "Praise & Appreciation", icon: <IconHeart size={18} />, color: "pink" },
    { value: "other", label: "Other", icon: <IconMessageChatbot size={18} />, color: "gray" },
  ];

  const ratingOptions = [
    { value: "5", label: "Excellent - 5 stars" },
    { value: "4", label: "Very Good - 4 stars" },
    { value: "3", label: "Good - 3 stars" },
    { value: "2", label: "Fair - 2 stars" },
    { value: "1", label: "Poor - 1 star" },
  ];

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    
    try {
      // Simulate API call - in production, this would be an actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Show success notification
      notifications.show({
        title: "Feedback Submitted",
        message: "Thank you for your feedback! We'll review it and get back to you if needed.",
        color: "green",
        icon: <IconCheck size={18} />,
      });
      
      setSubmitted(true);
      form.reset();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to submit feedback. Please try again.",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = feedbackCategories.find((cat) => cat.value === form.values.category);

  return (
    <Grid gutter="xl">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="xl">
          {/* Feedback Form */}
          {!submitted ? (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="lg" fw={600} mb="md">
                Share Your Feedback
              </Text>
              <Text size="sm" c="dimmed" mb="lg">
                Your feedback helps us improve Pinnacle e-Invoice. Whether you have a feature request, found a bug, or just want to share your thoughts, we're listening!
              </Text>

              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                  <Select
                    label="Category"
                    placeholder="Select a feedback category"
                    data={feedbackCategories.map((cat) => ({
                      value: cat.value,
                      label: cat.label,
                    }))}
                    {...form.getInputProps("category")}
                    required
                  />

                  <Select
                    label="Overall Rating"
                    placeholder="How would you rate your experience?"
                    data={ratingOptions}
                    {...form.getInputProps("rating")}
                    required
                  />

                  <Textarea
                    label="Your Feedback"
                    placeholder="Tell us what's on your mind... Be as detailed as possible so we can better understand your needs."
                    minRows={6}
                    {...form.getInputProps("feedback")}
                    required
                  />

                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="subtle"
                      onClick={() => form.reset()}
                      disabled={submitting}
                    >
                      Clear
                    </Button>
                    <Button type="submit" loading={submitting} leftSection={<IconMessageChatbot size={18} />}>
                      Submit Feedback
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Card>
          ) : (
            <Alert color="green" icon={<IconCheck size={18} />} title="Thank You!">
              <Text mb="md">
                Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
              </Text>
              <Button
                variant="light"
                onClick={() => {
                  setSubmitted(false);
                  form.reset();
                }}
              >
                Submit Another Feedback
              </Button>
            </Alert>
          )}

          {/* Quick Feedback */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="lg" fw={600} mb="md">
              Quick Feedback
            </Text>
            <Text size="sm" c="dimmed" mb="lg">
              Share a quick thought about your experience
            </Text>
            <Group gap="md">
              <Button
                variant="light"
                color="green"
                leftSection={<IconThumbUp size={18} />}
                onClick={() => {
                  form.setValues({
                    category: "praise",
                    rating: "5",
                    feedback: "I'm really enjoying using Pinnacle e-Invoice!",
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                I Love It!
              </Button>
              <Button
                variant="light"
                color="red"
                leftSection={<IconThumbDown size={18} />}
                onClick={() => {
                  form.setValues({
                    category: "improvement",
                    rating: "2",
                    feedback: "I think there's room for improvement in:",
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Needs Improvement
              </Button>
            </Group>
          </Card>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="lg">
          {/* Category Info */}
          {selectedCategory && (
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: `var(--mantine-color-${selectedCategory.color}-0)` }}>
              <Group gap="sm" mb="xs">
                <ThemeIcon size={24} radius="md" variant="light" color={selectedCategory.color}>
                  {selectedCategory.icon}
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {selectedCategory.label}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {selectedCategory.value === "feature" && "Suggest a new feature you'd like to see"}
                {selectedCategory.value === "bug" && "Report any issues or errors you've encountered"}
                {selectedCategory.value === "improvement" && "Share ideas on how we can make things better"}
                {selectedCategory.value === "praise" && "Let us know what you love about the product"}
                {selectedCategory.value === "other" && "Anything else you'd like to share with us"}
              </Text>
            </Paper>
          )}

          {/* Guidelines */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="md" fw={600} mb="md">
              Feedback Guidelines
            </Text>
            <Stack gap="xs">
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <ThemeIcon size={20} radius="xl" variant="light" color="blue">
                  <IconBulb size={12} />
                </ThemeIcon>
                <Text size="sm">Be specific and detailed</Text>
              </Group>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <ThemeIcon size={20} radius="xl" variant="light" color="green">
                  <IconThumbUp size={12} />
                </ThemeIcon>
                <Text size="sm">Focus on one issue or suggestion per submission</Text>
              </Group>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <ThemeIcon size={20} radius="xl" variant="light" color="orange">
                  <IconMessageChatbot size={12} />
                </ThemeIcon>
                <Text size="sm">Include steps to reproduce for bug reports</Text>
              </Group>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <ThemeIcon size={20} radius="xl" variant="light" color="violet">
                  <IconHeart size={12} />
                </ThemeIcon>
                <Text size="sm">Be respectful and constructive</Text>
              </Group>
            </Stack>
          </Card>

          {/* Stats */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="md" fw={600} mb="md">
              Community Impact
            </Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Feedback Submitted
                </Text>
                <Badge size="lg" variant="light" color="blue">
                  1,234
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Features Implemented
                </Text>
                <Badge size="lg" variant="light" color="green">
                  89
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Bugs Fixed
                </Text>
                <Badge size="lg" variant="light" color="orange">
                  156
                </Badge>
              </Group>
            </Stack>
            <Divider my="md" />
            <Text size="xs" c="dimmed" ta="center">
              Your feedback makes a difference!
            </Text>
          </Card>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

