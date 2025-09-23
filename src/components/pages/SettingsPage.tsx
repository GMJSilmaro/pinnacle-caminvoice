import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  GridCol,
  Group,
  Stack,
  Text,
  Title,
  Switch,
  TextInput,
  Select,
  Textarea,
  Divider,
  Avatar,
  FileInput,
  PasswordInput,
  NumberInput,
  ColorInput,
  Tabs,
  TabsList,
  TabsTab,
  TabsPanel,
} from "@mantine/core"
import {
  IconUser,
  IconBell,
  IconShield,
  IconPalette,
  IconDatabase,
  IconMail,
  IconUpload,
  IconDeviceFloppy,
  IconRefresh,
} from "@tabler/icons-react"
// import Breadcrumbs from "../navigation/Breadcrumbs"

export default function SettingsPage() {
  return (
    <Stack gap="xl">
      {/* <Breadcrumbs /> */}
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Title order={2}>Settings</Title>
          <Text c="dimmed" size="sm">
            Manage your account and application preferences
          </Text>
        </Box>
        <Group>
          <Button leftSection={<IconRefresh size={16} />} variant="light">
            Reset to Default
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />}>
            Save Changes
          </Button>
        </Group>
      </Flex>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" orientation="horizontal">
        <TabsList>
          <TabsTab value="profile" leftSection={<IconUser size={16} />}>
            Profile
          </TabsTab>
          <TabsTab value="notifications" leftSection={<IconBell size={16} />}>
            Notifications
          </TabsTab>
          <TabsTab value="security" leftSection={<IconShield size={16} />}>
            Security
          </TabsTab>
          <TabsTab value="appearance" leftSection={<IconPalette size={16} />}>
            Appearance
          </TabsTab>
          <TabsTab value="system" leftSection={<IconDatabase size={16} />}>
            System
          </TabsTab>
        </TabsList>

        {/* Profile Settings */}
        <TabsPanel value="profile" pt="xl">
          <Grid>
            <GridCol span={{ base: 12, md: 8 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={3} mb="md">Profile Information</Title>

                <Stack gap="md">
                  <Group>
                    <Avatar size="xl" src={null} alt="Profile Picture">
                      PD
                    </Avatar>
                    <Stack gap="xs">
                      <Text fw={500}>Profile Picture</Text>
                      <Group gap="xs">
                        <FileInput
                          placeholder="Choose file"
                          accept="image/*"
                          size="sm"
                          style={{ flex: 1 }}
                        />
                        <Button size="sm" variant="light" leftSection={<IconUpload size={14} />}>
                          Upload
                        </Button>
                      </Group>
                    </Stack>
                  </Group>

                  <Divider />

                  <Grid>
                    <GridCol span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="First Name"
                        placeholder="Enter first name"
                        defaultValue="Pixelcare"
                      />
                    </GridCol>
                    <GridCol span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Last Name"
                        placeholder="Enter last name"
                        defaultValue="Dev"
                      />
                    </GridCol>
                  </Grid>

                  <TextInput
                    label="Email Address"
                    placeholder="Enter email"
                    defaultValue="dev@pixelcare.com"
                    leftSection={<IconMail size={16} />}
                  />

                  <TextInput
                    label="Job Title"
                    placeholder="Enter job title"
                    defaultValue="Frontend Developer"
                  />

                  <Textarea
                    label="Bio"
                    placeholder="Tell us about yourself"
                    rows={3}
                    defaultValue="Passionate frontend developer with expertise in React and modern web technologies."
                  />

                  <Grid>
                    <GridCol span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Phone Number"
                        placeholder="Enter phone number"
                        defaultValue="+1 (555) 123-4567"
                      />
                    </GridCol>
                    <GridCol span={{ base: 12, md: 6 }}>
                      <Select
                        label="Time Zone"
                        placeholder="Select time zone"
                        defaultValue="utc-5"
                        data={[
                          { value: "utc-8", label: "Pacific Time (UTC-8)" },
                          { value: "utc-7", label: "Mountain Time (UTC-7)" },
                          { value: "utc-6", label: "Central Time (UTC-6)" },
                          { value: "utc-5", label: "Eastern Time (UTC-5)" },
                        ]}
                      />
                    </GridCol>
                  </Grid>
                </Stack>
              </Card>
            </GridCol>

            <GridCol span={{ base: 12, md: 4 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Account Status</Title>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm">Account Type</Text>
                    <Text size="sm" fw={500}>Premium</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Member Since</Text>
                    <Text size="sm" fw={500}>Jan 2024</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Last Login</Text>
                    <Text size="sm" fw={500}>Today</Text>
                  </Group>
                  <Divider />
                  <Button variant="light" fullWidth>
                    View Account Details
                  </Button>
                </Stack>
              </Card>
            </GridCol>
          </Grid>
        </TabsPanel>

        {/* Notifications Settings */}
        <TabsPanel value="notifications" pt="xl">
          <Card padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Notification Preferences</Title>
            
            <Stack gap="lg">
              <Box>
                <Text fw={500} mb="sm">Email Notifications</Text>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm">Invoice Updates</Text>
                      <Text size="xs" c="dimmed">Get notified when invoices are paid or overdue</Text>
                    </Box>
                    <Switch defaultChecked />
                  </Group>
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm">New Client Registration</Text>
                      <Text size="xs" c="dimmed">Receive alerts for new client signups</Text>
                    </Box>
                    <Switch defaultChecked />
                  </Group>
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm">System Updates</Text>
                      <Text size="xs" c="dimmed">Important system maintenance notifications</Text>
                    </Box>
                    <Switch />
                  </Group>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Text fw={500} mb="sm">Push Notifications</Text>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm">Real-time Alerts</Text>
                      <Text size="xs" c="dimmed">Instant notifications for urgent matters</Text>
                    </Box>
                    <Switch defaultChecked />
                  </Group>
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm">Daily Summary</Text>
                      <Text size="xs" c="dimmed">Daily digest of activities and updates</Text>
                    </Box>
                    <Switch defaultChecked />
                  </Group>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Text fw={500} mb="sm">Notification Frequency</Text>
                <Select
                  placeholder="Select frequency"
                  defaultValue="immediate"
                  data={[
                    { value: "immediate", label: "Immediate" },
                    { value: "hourly", label: "Hourly Digest" },
                    { value: "daily", label: "Daily Digest" },
                    { value: "weekly", label: "Weekly Summary" },
                  ]}
                />
              </Box>
            </Stack>
          </Card>
        </TabsPanel>

        {/* Security Settings */}
        <TabsPanel value="security" pt="xl">
          <Grid>
            <GridCol span={{ base: 12, md: 6 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Change Password</Title>
                <Stack gap="md">
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter current password"
                  />
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter new password"
                  />
                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                  />
                  <Button>Update Password</Button>
                </Stack>
              </Card>
            </GridCol>

            <GridCol span={{ base: 12, md: 6 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Two-Factor Authentication</Title>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={500}>Enable 2FA</Text>
                      <Text size="xs" c="dimmed">Add an extra layer of security</Text>
                    </Box>
                    <Switch />
                  </Group>
                  <Button variant="light" disabled>
                    Configure 2FA
                  </Button>
                </Stack>
              </Card>
            </GridCol>

            <GridCol span={12}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Active Sessions</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={500}>Current Session</Text>
                      <Text size="xs" c="dimmed">Chrome on Windows • 192.168.1.100</Text>
                    </Box>
                    <Text size="xs" c="green">Active</Text>
                  </Group>
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={500}>Mobile App</Text>
                      <Text size="xs" c="dimmed">iOS App • Last seen 2 hours ago</Text>
                    </Box>
                    <Button size="xs" variant="light" color="red">
                      Revoke
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </GridCol>
          </Grid>
        </TabsPanel>

        {/* Appearance Settings */}
        <TabsPanel value="appearance" pt="xl">
          <Card padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Appearance Settings</Title>
            
            <Stack gap="lg">
              <Group justify="space-between">
                <Box>
                  <Text fw={500}>Dark Mode</Text>
                  <Text size="sm" c="dimmed">Toggle between light and dark themes</Text>
                </Box>
                <Switch />
              </Group>

              <Divider />

              <Box>
                <Text fw={500} mb="sm">Theme Color</Text>
                <ColorInput
                  placeholder="Pick a color"
                  defaultValue="#228be6"
                />
              </Box>

              <Divider />

              <Box>
                <Text fw={500} mb="sm">Language</Text>
                <Select
                  placeholder="Select language"
                  defaultValue="en"
                  data={[
                    { value: "en", label: "English" },
                    { value: "es", label: "Spanish" },
                    { value: "fr", label: "French" },
                    { value: "de", label: "German" },
                  ]}
                />
              </Box>

              <Divider />

              <Box>
                <Text fw={500} mb="sm">Sidebar Behavior</Text>
                <Select
                  placeholder="Select behavior"
                  defaultValue="auto"
                  data={[
                    { value: "auto", label: "Auto Collapse" },
                    { value: "always", label: "Always Expanded" },
                    { value: "never", label: "Always Collapsed" },
                  ]}
                />
              </Box>
            </Stack>
          </Card>
        </TabsPanel>

        {/* System Settings */}
        <TabsPanel value="system" pt="xl">
          <Grid>
            <GridCol span={{ base: 12, md: 6 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Data Management</Title>
                <Stack gap="md">
                  <Button variant="light" fullWidth>
                    Export Data
                  </Button>
                  <Button variant="light" fullWidth>
                    Import Data
                  </Button>
                  <Button color="red" variant="light" fullWidth>
                    Clear Cache
                  </Button>
                </Stack>
              </Card>
            </GridCol>

            <GridCol span={{ base: 12, md: 6 }}>
              <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">System Information</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm">Version</Text>
                    <Text size="sm" fw={500}>v2.1.4</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Last Update</Text>
                    <Text size="sm" fw={500}>Jan 15, 2024</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Database Size</Text>
                    <Text size="sm" fw={500}>2.3 GB</Text>
                  </Group>
                </Stack>
              </Card>
            </GridCol>
          </Grid>
        </TabsPanel>
      </Tabs>
    </Stack>
  )
}
