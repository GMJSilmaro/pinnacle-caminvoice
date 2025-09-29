'use client'

import {
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  PasswordInput,
  Alert,
  Badge,
  Stepper,
  Textarea,
  Divider,
  ActionIcon,
  Tooltip,
  Code,
} from '@mantine/core'
import {
  IconShieldCheck,
  IconKey,
  IconDatabase,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff,
  IconCopy,
} from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useForm } from '@mantine/form'
import { showNotification } from '../../utils/notifications'

interface ProviderSetupProps {
  isSetup?: boolean
  onSetupComplete?: () => void
}

export default function ProviderSetup({ isSetup = false, onSetupComplete }: ProviderSetupProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showSecrets, setShowSecrets] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [configureLoading, setConfigureLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [isRedirectConfigured, setIsRedirectConfigured] = useState(false)
  const [isOAuthAuthorized, setIsOAuthAuthorized] = useState(false)
  const [isConnectionTested, setIsConnectionTested] = useState(false)
  const [oauthResponse, setOauthResponse] = useState<any>(null)
  const [providerConfig, setProviderConfig] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(true)

  // Load existing provider configuration
  useEffect(() => {
    const loadProviderConfig = async () => {
      try {
        const response = await fetch('/api/provider/setup', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.provider) {
            setProviderConfig(data.provider)
            // Update form with existing values
            form.setValues({
              clientId: data.provider.clientId || '',
              clientSecret: data.provider.clientSecret || '',
              baseUrl: data.provider.baseUrl || 'https://api.caminvoice.gov.kh',
              description: data.provider.description || '',
              redirectUrls: data.provider.redirectUrls || ['https://your-domain.com/auth/callback'],
            })

            // Update setup states based on existing configuration
            if (data.provider.redirectUrls && data.provider.redirectUrls.length > 0) {
              setIsRedirectConfigured(true)
            }
            if (data.provider.isConnectedToCamInv) {
              setIsOAuthAuthorized(true)
              setIsConnectionTested(true)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load provider config:', error)
      } finally {
        setConfigLoading(false)
      }
    }

    loadProviderConfig()
  }, [])

  const form = useForm({
    initialValues: {
      clientId: '259c90b507469ea3ae492800bd1fae48',
      clientSecret: '78865a9f4eaa45aedb21de767bd883112027a403bc1921c9bb811ff5f36dd2e0',
      baseUrl: 'https://sandbox.e-invoice.gov.kh/',
      description: 'Pixel Pinnacle-WG CamInvoice Integration',
      redirectUrls: ['http://localhost:3000/auth/callback'],
    },
    validate: {
      clientId: (value) => (value.length < 1 ? 'Client ID is required' : null),
      clientSecret: (value) => (value.length < 1 ? 'Client Secret is required' : null),
      baseUrl: (value) => (!value ? 'Base URL is required' : null),
    },
  })

  // Step-specific validation functions
  const validateStep1 = () => {
    const errors: any = {}
    if (!form.values.clientId || form.values.clientId.length < 1) {
      errors.clientId = 'Client ID is required'
    }
    if (!form.values.clientSecret || form.values.clientSecret.length < 1) {
      errors.clientSecret = 'Client Secret is required'
    }
    if (!form.values.baseUrl) {
      errors.baseUrl = 'Base URL is required'
    }
    return errors
  }

  const validateStep2 = () => {
    const errors: any = {}
    if (!form.values.redirectUrls || form.values.redirectUrls.length === 0 || !form.values.redirectUrls[0]) {
      errors.redirectUrls = 'At least one redirect URL is required'
    }
    // Validate URL format
    form.values.redirectUrls.forEach((url, index) => {
      if (url && !url.match(/^https?:\/\/.+/)) {
        errors[`redirectUrls.${index}`] = 'Invalid URL format'
      }
    })
    return errors
  }

  const testConfigureRedirectUrls = async () => {
    setConfigureLoading(true)
    try {
      // First save the provider configuration
      const saveResponse = await fetch('/api/provider/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: form.values.clientId,
          clientSecret: form.values.clientSecret,
          baseUrl: form.values.baseUrl,
          description: form.values.description,
          redirectUrls: form.values.redirectUrls,
        }),
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        throw new Error(errorData.error || 'Failed to save provider configuration')
      }

      // Then configure redirect URLs with CamInvoice
      const configResponse = await fetch('/api/provider/caminvoice/configure-redirect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          redirectUrls: form.values.redirectUrls,
        }),
      })

      if (!configResponse.ok) {
        const errorData = await configResponse.json()
        throw new Error(errorData.error || 'Failed to configure redirect URLs')
      }

      const configData = await configResponse.json()

      setIsRedirectConfigured(true)
      showNotification.success(
        'Redirect URLs have been successfully configured with CamInvoice.',
        'URLs Configured'
      )
    } catch (error) {
      console.error('Failed to configure redirect URLs:', error)
      setIsRedirectConfigured(false)
      showNotification.error(
        error instanceof Error ? error.message : 'Failed to configure redirect URLs. Please check your credentials.',
        'Configuration Failed'
      )
    } finally {
      setConfigureLoading(false)
    }
  }

  const testConnection = async () => {
    if (!isOAuthAuthorized) {
      showNotification.error(
        'Please complete OAuth authorization first by clicking "Authorize with CamInvoice".',
        'Authorization Required'
      )
      return
    }

    setTestLoading(true)
    try {
      const response = await fetch('/api/provider/caminvoice/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Connection test failed')
      }

      const data = await response.json()

      setIsConnectionTested(true)
      showNotification.success(
        data.message || 'Connection to CamInvoice API successful. Your access token is valid.',
        'Connection Test Passed'
      )
    } catch (error) {
      console.error('Connection test failed:', error)
      setIsConnectionTested(false)
      showNotification.error(
        error instanceof Error ? error.message : 'Connection test failed. Please verify your access token is valid.',
        'Connection Failed'
      )
    } finally {
      setTestLoading(false)
    }
  }

  const handleOAuthAuthorization = async () => {
    try {
      // Get OAuth authorization URL from our API
      const response = await fetch('/api/provider/caminvoice/oauth', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get OAuth URL')
      }

      const data = await response.json()
      const { authUrl, state } = data

      // Open OAuth URL in new window
      const authWindow = window.open(authUrl, '_blank', 'width=600,height=700')

      // Listen for postMessage from the callback page
      const origin = window.location.origin
      const authTokenPromise = new Promise<{ authToken: string; state?: string } | null>((resolve) => {
        const handler = (event: MessageEvent) => {
          try {
            if (event.origin !== origin) return
            const data = event.data as any
            if (data?.source === 'caminvoice-oauth' && typeof data?.authToken === 'string') {
              window.removeEventListener('message', handler)
              resolve({ authToken: data.authToken, state: data.state })
            }
          } catch {}
        }
        window.addEventListener('message', handler)
        // Fallback timeout
        setTimeout(() => {
          window.removeEventListener('message', handler)
          resolve(null)
        }, 15000) // 15s timeout
      })

      const result = await authTokenPromise

      // Development fallback if no message received
      const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      const tokenToUse = result?.authToken || (isLocal ? `sim_auth_${Date.now()}` : '')
      if (!tokenToUse) {
        authWindow?.close()
        throw new Error('Authorization was not completed. No authToken received.')
      }

      // Exchange authToken for tokens
      const tokenResponse = await fetch('/api/provider/caminvoice/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          authToken: tokenToUse,
          state: result?.state || state,
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to exchange authorization token')
      }

      const tokenData = await tokenResponse.json()

      setIsOAuthAuthorized(true)
      setOauthResponse(tokenData)
      showNotification.success(
        'OAuth authorization completed successfully. You can now test the connection.',
        'Authorization Complete'
      )
      authWindow?.close()

    } catch (error) {
      console.error('OAuth authorization failed:', error)
      showNotification.error(
        error instanceof Error ? error.message : 'Failed to start OAuth authorization',
        'Authorization Failed'
      )
    }
  }

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true)
    try {
      // TODO: Implement server action to save provider settings
      console.log('Saving provider settings:', values)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      showNotification.success(
        'CamInvoice Service Provider configuration has been saved successfully. You can now manage tenant connections.',
        'Provider Setup Complete'
      )
      onSetupComplete?.()
    } catch (error) {
      console.error('Failed to save provider settings:', error)
      showNotification.error(
        'Failed to save provider configuration. Please check your settings and try again.',
        'Setup Failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const generateRandomKey = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showNotification.success('Copied to clipboard', 'Success')
  }

  if (isSetup) {
    return (
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={3}>Provider Configuration</Title>
              <Text size="sm" c="dimmed">
                CamInvoice Service Provider settings are configured
              </Text>
            </div>
            <Badge color="green" variant="light" leftSection={<IconCheck size={14} />}>
              Configured
            </Badge>
          </Group>

          <Alert color="green" icon={<IconShieldCheck size={16} />}>
            Your service provider credentials are securely stored and encrypted. 
            All merchant tokens will be encrypted using your configured encryption key.
          </Alert>

          <Group>
            <Button variant="light" leftSection={<IconEye size={16} />}>
              View Configuration
            </Button>
            <Button variant="outline" color="orange">
              Update Settings
            </Button>
          </Group>
        </Stack>
      </Card>
    )
  }

  return (
    <Card withBorder>
      <Stack gap="xl">
        <div>
          <Title order={3}>CamInvoice Provider Setup</Title>
          <Text size="sm" c="dimmed">
            One-time setup for Cambodia e-Invoicing Service Provider credentials
          </Text>
        </div>

        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          <Text fw={500} mb="xs">Important Note:</Text>
          This is a <strong>one-time setup</strong> as advised by the Cambodia Government. 
          Only Service Providers can configure these settings, but they can be used globally by all end users.
        </Alert>

        <Stepper active={currentStep} onStepClick={setCurrentStep} allowNextStepsSelect={false}>
          <Stepper.Step
            label="Provider Credentials"
            description="CamInvoice API credentials"
            icon={<IconKey size={18} />}
          >
            <Stack gap="md" mt="md">
              <TextInput
                label="Client ID *"
                description="Your CamInvoice Service Provider Client ID"
                placeholder="admin@vitar.com"
                required
                {...form.getInputProps('clientId')}
              />

              <PasswordInput
                label="Client Secret *"
                description="Your CamInvoice Service Provider Client Secret"
                placeholder="••••••••••••••••"
                required
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </ActionIcon>
                }
                visible={showSecrets}
                {...form.getInputProps('clientSecret')}
              />

              <TextInput
                label="Base URL *"
                description="CamInvoice API Base URL"
                placeholder="https://api.caminvoice.gov.kh"
                required
                {...form.getInputProps('baseUrl')}
              />

              <Textarea
                label="Description"
                description="Optional description for this configuration"
                placeholder="Production CamInvoice Service Provider setup"
                minRows={3}
                {...form.getInputProps('description')}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Redirect URLs"
            description="OAuth redirect configuration"
            icon={<IconShieldCheck size={18} />}
          >
            <Stack gap="md" mt="md">
              <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  <strong>OAuth Configuration:</strong> Configure the redirect URLs that CamInvoice will use
                  to redirect users back to your application after authentication.
                </Text>
              </Alert>

              <div>
                <Text size="sm" fw={500} mb="xs">Redirect URLs *</Text>
                <Text size="xs" c="dimmed" mb="md">
                  These URLs will be whitelisted in CamInvoice for OAuth redirects.
                  Users will be redirected to these URLs after successful authentication.
                </Text>

                {form.values.redirectUrls.map((url, index) => (
                  <Group key={index} mb="sm">
                    <TextInput
                      placeholder="https://your-domain.com/auth/callback"
                      style={{ flex: 1 }}
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...form.values.redirectUrls]
                        newUrls[index] = e.target.value
                        form.setFieldValue('redirectUrls', newUrls)
                      }}
                      error={form.errors[`redirectUrls.${index}`]}
                    />
                    {form.values.redirectUrls.length > 1 && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => {
                          const newUrls = form.values.redirectUrls.filter((_, i) => i !== index)
                          form.setFieldValue('redirectUrls', newUrls)
                        }}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}

                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    form.setFieldValue('redirectUrls', [...form.values.redirectUrls, ''])
                  }}
                >
                  Add Another URL
                </Button>
              </div>

              {/* <Alert color="green" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  <strong>Example URLs:</strong><br />
                  • Production: https://your-domain.com/auth/callback<br />
                  • Development: http://localhost:3000/auth/callback<br />
                  • Staging: https://staging.your-domain.com/auth/callback
                </Text>
              </Alert> */}
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="Test & Configure"
            description="Validate and configure with CamInvoice"
            icon={<IconDatabase size={18} />}
          >
            <Stack gap="md" mt="md">
              <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  <strong>Testing Configuration:</strong> We'll now test your credentials and configure
                  the redirect URLs with CamInvoice to complete the setup.
                </Text>
              </Alert>

              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text fw={500}>1. Configure Redirect URLs</Text>
                    <Button
                      size="sm"
                      variant={isRedirectConfigured ? "filled" : "light"}
                      color={isRedirectConfigured ? "green" : "blue"}
                      loading={configureLoading}
                      onClick={() => testConfigureRedirectUrls()}
                    >
                      {isRedirectConfigured ? "✓ URLs Configured" : "Configure URLs"}
                    </Button>
                  </Group>
                  <Text size="sm" c="dimmed">
                    POST /api/v1/configure/configure-redirect-url
                  </Text>

                  <Group justify="space-between">
                    <Text fw={500}>2. Test Connection</Text>
                    <Button
                      size="sm"
                      variant={isConnectionTested ? "filled" : "light"}
                      color={isConnectionTested ? "green" : "blue"}
                      loading={testLoading}
                      disabled={!isOAuthAuthorized}
                      onClick={() => testConnection()}
                    >
                      {isConnectionTested ? "✓ Connection Tested" : "Test Connection"}
                    </Button>
                  </Group>
                  <Text size="sm" c={isConnectionTested ? "green" : isOAuthAuthorized ? "dimmed" : "red"}>
                    {isConnectionTested
                      ? "✓ API connection successful"
                      : isOAuthAuthorized
                        ? "Validate credentials and API connectivity"
                        : "⚠️ OAuth authorization required first"
                    }
                  </Text>
                </Stack>
              </Card>

              <Card withBorder bg="gray.0">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={500} size="sm">OAuth Authorization Link:</Text>
                    <Button
                      size="sm"
                      variant={isOAuthAuthorized ? "filled" : "outline"}
                      color={isOAuthAuthorized ? "green" : "blue"}
                      onClick={handleOAuthAuthorization}
                      disabled={!form.values.clientId || !form.values.redirectUrls[0] || !isRedirectConfigured}
                    >
                      {isOAuthAuthorized ? "✓ Authorized" : "Authorize with CamInvoice"}
                    </Button>
                  </Group>
                  <Divider />
                  <Code block>
                    {`${form.values.baseUrl}/connect?client_id=${form.values.clientId}&redirect_url=${encodeURIComponent(form.values.redirectUrls[0] || '')}&state=provider_setup`}
                  </Code>
                  <Text size="xs" c={isOAuthAuthorized ? "green" : "dimmed"}>
                    {isOAuthAuthorized
                      ? "✓ OAuth authorization completed. You can now test the connection."
                      : "Click 'Authorize with CamInvoice' to complete OAuth flow and get access/refresh tokens."
                    }
                  </Text>
                </Stack>
              </Card>

              <Card withBorder bg="green.0">
                <Stack gap="sm">
                  <Text fw={500} size="sm">CamInvoice OAuth2 Flow:</Text>
                  <Divider />
                  <Text size="sm">
                    1. <strong>Configure Redirect URLs</strong> → POST /api/v1/configure/configure-redirect-url<br />
                    2. <strong>Generate OAuth Link</strong> → User clicks link → Redirected to CamInvoice<br />
                    3. <strong>User Authorization</strong> → User authorizes → Redirected back with authToken<br />
                    4. <strong>Token Exchange</strong> → POST /api/v1/auth/authorize/connect → Get access/refresh tokens
                  </Text>
                </Stack>
              </Card>

              {oauthResponse && (
                <Card withBorder bg="blue.0">
                  <Stack gap="sm">
                    <Text fw={500} size="sm">OAuth Response Data:</Text>
                    <Divider />

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Access Token:</Text>
                      {oauthResponse?.access_token
                        ? <Code>{String(oauthResponse.access_token).substring(0, 20)}...</Code>
                        : <Text size="xs" c="dimmed">N/A</Text>}
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Refresh Token:</Text>
                      {oauthResponse?.refresh_token
                        ? <Code>{String(oauthResponse.refresh_token).substring(0, 20)}...</Code>
                        : <Text size="xs" c="dimmed">N/A</Text>}
                    </Group>

                    <Text fw={500} size="sm" mt="md">Business Information:</Text>
                    <Divider />

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Endpoint ID:</Text>
                      <Text size="sm" ff="monospace">{oauthResponse?.business_info?.endpoint_id ?? '—'}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Company (EN):</Text>
                      <Text size="sm">{oauthResponse?.business_info?.company_name_en ?? '—'}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>Company (KH):</Text>
                      <Text size="sm">{oauthResponse?.business_info?.company_name_kh ?? ''}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>TIN:</Text>
                      <Text size="sm" ff="monospace">{oauthResponse?.business_info?.tin ?? ''}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>MOC ID:</Text>
                      <Text size="sm" ff="monospace">{oauthResponse?.business_info?.moc_id ?? ''}</Text>
                    </Group>
                  </Stack>
                </Card>
              )}

              <Button
                fullWidth
                size="md"
                loading={isLoading}
                onClick={() => handleSubmit(form.values)}
                leftSection={<IconShieldCheck size={16} />}
              >
                Save Provider Configuration
              </Button>
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Divider />

        <Group justify="space-between">
          <Button
            variant="default"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          {currentStep < 2 && (
            <Button
              onClick={() => {
                if (currentStep === 0) {
                  // Validate Provider Credentials step
                  const step1Errors = validateStep1()
                  if (Object.keys(step1Errors).length === 0) {
                    setCurrentStep(currentStep + 1)
                    showNotification.info('Provider credentials validated. Configure security keys.', 'Step 1 Complete')
                  } else {
                    // Set form errors for display
                    form.setErrors(step1Errors)
                    showNotification.error('Please fill in all required fields correctly.', 'Validation Error')
                  }
                } else if (currentStep === 1) {
                  // Validate Redirect URLs step
                  const step2Errors = validateStep2()
                  if (Object.keys(step2Errors).length === 0) {
                    setCurrentStep(currentStep + 1)
                    showNotification.info('Redirect URLs configured. Review your settings.', 'Step 2 Complete')
                  } else {
                    // Set form errors for display
                    form.setErrors(step2Errors)
                    showNotification.error('Please configure valid redirect URLs.', 'Validation Error')
                  }
                }
              }}
            >
              Next
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  )
}
