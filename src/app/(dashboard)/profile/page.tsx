'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  TextInput,
  PasswordInput,
  Grid,
  Avatar,
  FileInput,
  Divider,
  Alert,
  Loader,
  Center,
} from '@mantine/core'
import {
  IconUser,
  IconMail,
  IconPhone,
  IconKey,
  IconUpload,
  IconDeviceFloppy,
  IconRefresh,
  IconShieldCheck,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import PageLayout from '../../../components/layouts/PageLayout'
import { showNotification } from '../../../utils/notifications'

// Types
interface ProfileFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  const profileForm = useForm<ProfileFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      firstName: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      newPassword: (value) => {
        if (showPasswordFields && value.length > 0 && value.length < 8) {
          return 'Password must be at least 8 characters'
        }
        return null
      },
      confirmPassword: (value, values) => {
        if (showPasswordFields && value !== values.newPassword) {
          return 'Passwords do not match'
        }
        return null
      },
    },
  })

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.setValues({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '', // Phone not in user object yet
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }
  }, [user])

  const handleUpdateProfile = async (values: ProfileFormData) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showNotification.success('Profile updated successfully', 'Profile Saved')
      } else {
        showNotification.error(data.error || 'Failed to update profile', 'Update Failed')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      showNotification.error('Failed to update profile. Please try again.', 'Update Failed')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleChangePassword = async (values: ProfileFormData) => {
    if (!values.currentPassword || !values.newPassword) {
      showNotification.error('Please fill in all password fields', 'Validation Error')
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showNotification.success('Password changed successfully', 'Password Updated')
        profileForm.setFieldValue('currentPassword', '')
        profileForm.setFieldValue('newPassword', '')
        profileForm.setFieldValue('confirmPassword', '')
        setShowPasswordFields(false)
      } else {
        showNotification.error(data.error || 'Failed to change password', 'Password Change Failed')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      showNotification.error('Failed to change password. Please try again.', 'Password Change Failed')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSubmit = (values: ProfileFormData) => {
    if (showPasswordFields && values.newPassword) {
      handleChangePassword(values)
    } else {
      handleUpdateProfile(values)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading profile...</Text>
        </Stack>
      </Center>
    )
  }

  if (!user) {
    return (
      <Stack p="md">
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          <Text fw={500} mb="xs">Access Denied</Text>
          <Text size="sm">You must be logged in to view your profile.</Text>
        </Alert>
      </Stack>
    )
  }

  const headerActions = (
    <Group>
      <Button
        leftSection={<IconRefresh size={16} />}
        variant="light"
        onClick={() => {
          profileForm.reset()
          setShowPasswordFields(false)
        }}
      >
        Reset
      </Button>
      <Button
        leftSection={<IconDeviceFloppy size={16} />}
        onClick={() => profileForm.onSubmit(handleSubmit)()}
        loading={isUpdating || isChangingPassword}
      >
        Save Changes
      </Button>
    </Group>
  )

  return (
    <PageLayout
      title="My Profile"
      subtitle="Manage your account information and security settings"
      actions={headerActions}
    >
      <Stack gap="xl">
        <form onSubmit={profileForm.onSubmit(handleSubmit)}>
          <Grid>
            <Grid.Col span={12}>
              <Card withBorder>
                <Stack gap="md">
                  <Group>
                    <IconUser size={24} />
                    <Title order={3}>Profile Information</Title>
                  </Group>

                  {/* Profile Picture Section */}
                  <Group>
                    <Avatar size="xl" src={null} alt="Profile Picture">
                      {user.firstName?.[0]}{user.lastName?.[0]}
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
                      <Text size="xs" c="dimmed">
                        Recommended: Square image, at least 200x200px
                      </Text>
                    </Stack>
                  </Group>

                  <Divider />

                  {/* Basic Information */}
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="First Name"
                        placeholder="Enter first name"
                        required
                        leftSection={<IconUser size={16} />}
                        {...profileForm.getInputProps('firstName')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Last Name"
                        placeholder="Enter last name"
                        required
                        leftSection={<IconUser size={16} />}
                        {...profileForm.getInputProps('lastName')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Email Address"
                        placeholder="Enter email address"
                        required
                        leftSection={<IconMail size={16} />}
                        {...profileForm.getInputProps('email')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Phone Number"
                        placeholder="+855 12 345 678"
                        leftSection={<IconPhone size={16} />}
                        {...profileForm.getInputProps('phone')}
                      />
                    </Grid.Col>
                  </Grid>

                  <Divider />

                  {/* Account Information */}
                  <Title order={4}>Account Information</Title>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Role"
                        value={user.role === 'PROVIDER' ? 'Service Provider' : 
                               user.role === 'TENANT_ADMIN' ? 'Tenant Admin' : 'Tenant User'}
                        disabled
                        leftSection={<IconShieldCheck size={16} />}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Account Status"
                        value={user.status}
                        disabled
                        leftSection={<IconShieldCheck size={16} />}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </form>

        {/* Password Change Section */}
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Group>
                <IconKey size={24} />
                <Title order={3}>Security Settings</Title>
              </Group>
              <Button
                variant="light"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
              >
                {showPasswordFields ? 'Cancel' : 'Change Password'}
              </Button>
            </Group>

            {showPasswordFields && (
              <>
                <Alert color="blue" icon={<IconShieldCheck size={16} />}>
                  <Text size="sm">
                    Choose a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                  </Text>
                </Alert>

                <Grid>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="Current Password"
                      placeholder="Enter current password"
                      required
                      {...profileForm.getInputProps('currentPassword')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="New Password"
                      placeholder="Enter new password"
                      required
                      {...profileForm.getInputProps('newPassword')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <PasswordInput
                      label="Confirm New Password"
                      placeholder="Confirm new password"
                      required
                      {...profileForm.getInputProps('confirmPassword')}
                    />
                  </Grid.Col>
                </Grid>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </PageLayout>
  )
}
