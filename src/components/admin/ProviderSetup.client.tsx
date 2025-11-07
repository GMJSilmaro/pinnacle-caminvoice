'use client'
// TODO: Per STRICT_RULES, this client component should be renamed to ProviderSetup.client.tsx

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
  Code,
  Skeleton,
  Modal,
  SimpleGrid,
} from "@mantine/core";
import {
  IconShieldCheck,
  IconKey,
  IconDatabase,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { showNotification } from "../../utils/notifications";
import {
  loadProviderConfig,
  saveProviderConfig,
  configureRedirectUrls as configureRedirectUrlsAction,
  getOAuthUrl,
  exchangeAuthToken,
  testConnection as testConnectionAction,
  revokeProviderAccess,
} from "@/app/provider/actions";

interface ProviderSetupProps {
  isSetup?: boolean;
  onSetupComplete?: () => void;
  onRevokeComplete?: () => void;
}

interface BusinessInfo {
  endpoint_id?: string;
  company_name_en?: string;
  company_name_kh?: string;
  tin?: string;
  moc_id?: string;
}

interface OAuthResponse {
  access_token?: string;
  refresh_token?: string;
  business_info?: BusinessInfo;
  success?: boolean;
}

export default function ProviderSetup({
  isSetup = false,
  onSetupComplete,
  onRevokeComplete,
}: ProviderSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      const res: any = await revokeProviderAccess();
      if (res?.success) {
        showNotification.success(
          "Provider access has been revoked. Tokens cleared and status updated.",
          "Access Revoked"
        );
        // Close confirm modal, exit edit mode, and let parent refresh stats/UI
        setConfirmRevokeOpen(false);
        setEditing(false);
        onRevokeComplete?.();
      } else {
        showNotification.error(
          res?.error || "Failed to revoke provider access.",
          "Revoke Failed"
        );
      }
    } catch (err: any) {
      showNotification.error(
        err?.message || "Failed to revoke provider access.",
        "Revoke Failed"
      );
    } finally {
      setRevoking(false);
    }
  }

  const [editing, setEditing] = useState(false);

  const [configureLoading, setConfigureLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [isRedirectConfigured, setIsRedirectConfigured] = useState(false);
  const [isOAuthAuthorized, setIsOAuthAuthorized] = useState(false);
  const [isConnectionTested, setIsConnectionTested] = useState(false);
  const [oauthResponse, setOauthResponse] = useState<OAuthResponse | null>(
    null
  );

  const [configLoading, setConfigLoading] = useState(true);

  // Load existing provider configuration
  useEffect(() => {
    const initLoad = async () => {
      try {
        const result: any = await loadProviderConfig();

        if (result?.success) {
          const data = result;
          if (data.success && data.provider) {
            // Update form with existing values
            form.setValues({
              clientId: data.provider.clientId,
              clientSecret: data.provider.clientSecret,
              baseUrl: data.provider.baseUrl,
              description: data.provider.description,
              redirectUrls: data.provider.redirectUrls,
            });

            // Update setup states based on existing configuration
            if (
              data.provider.redirectUrls &&
              data.provider.redirectUrls.length > 0
            ) {
              setIsRedirectConfigured(true);
            }
            if (data.provider.isConnectedToCamInv) {
              setIsOAuthAuthorized(true);
              setIsConnectionTested(true);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load provider config:", error);
      } finally {
        setConfigLoading(false);
      }
    };

    initLoad();
  }, []);

  const form = useForm({
    initialValues: {
      clientId: "",
      clientSecret: "",
      baseUrl: "https://sb-merchant.e-invoice.gov.kh",
      description: "",
      redirectUrls: ["http://localhost:3001/auth/callback"],
    },
    validate: {
      clientId: (value) => (value.length < 1 ? "Client ID is required" : null),
      clientSecret: (value) =>
        value.length < 1 ? "Client Secret is required" : null,
      baseUrl: (value) => (!value ? "Base URL is required" : null),
    },
  });

  // Step-specific validation functions
  const validateStep1 = () => {
    const errors: any = {};
    if (!form.values.clientId || form.values.clientId.length < 1) {
      errors.clientId = "Client ID is required";
    }
    if (!form.values.clientSecret || form.values.clientSecret.length < 1) {
      errors.clientSecret = "Client Secret is required";
    }
    if (!form.values.baseUrl) {
      errors.baseUrl = "Base URL is required";
    }
    return errors;
  };

  // Client-side URL validation helpers for CamInvoice redirect URLs
  const validatePublicHttpsUrlClient = (raw: string): string | null => {
    if (!raw || typeof raw !== "string") return "URL is required";
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return "Must be a valid absolute URL";
    }
    if (url.protocol !== "https:") return "Must start with https://";
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1")
      return "Localhost/127.0.0.1 not allowed";
    const isIPv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    if (isIPv4) return "IP addresses are not allowed; use a domain with TLD";
    const hasTld =
      hostname.includes(".") && (hostname.split(".").pop() || "").length >= 2;
    if (!hasTld) return "Domain must include a TLD (e.g., .com, .app)";
    return null;
  };

  const validateRedirectUrlsClient = (urls: string[]) => {
    const errors: any = {};
    if (!urls || urls.length === 0 || !urls[0]) {
      errors.redirectUrls = "At least one redirect URL is required";
      return errors;
    }
    urls.forEach((u, i) => {
      const err = validatePublicHttpsUrlClient(u);
      if (err) errors[`redirectUrls.${i}`] = err;
    });
    return errors;
  };

  const validateStep2 = () => {
    return validateRedirectUrlsClient(form.values.redirectUrls);
  };

  const testConfigureRedirectUrls = async () => {
    setConfigureLoading(true);
    try {
      // Client-side validation to prevent CamInvoice 422s
      const step2Errors = validateRedirectUrlsClient(form.values.redirectUrls);
      if (Object.keys(step2Errors).length) {
        form.setErrors(step2Errors);
        showNotification.error(
          "Redirect URL(s) must be public HTTPS domains with a real TLD (no http, no localhost/127.0.0.1). Use a tunnel like Cloudflare Tunnel or ngrok.",
          "Validation Error"
        );
        setConfigureLoading(false);
        return;
      }

      // First save the provider configuration
      await saveProviderConfig({
        clientId: form.values.clientId,
        clientSecret: form.values.clientSecret,
        baseUrl: form.values.baseUrl,
        description: form.values.description,
        redirectUrls: form.values.redirectUrls,
      });

      // Then configure redirect URLs via server action
      const result = await configureRedirectUrlsAction({
        redirectUrls: form.values.redirectUrls,
      });

      setIsRedirectConfigured(true);

      if (result.warning) {
        showNotification.warning(
          result.warning + " You can still try OAuth authorization.",
          "Configuration Warning"
        );
      } else {
        showNotification.success(
          "Redirect URLs have been successfully configured with CamInvoice. You can now proceed with OAuth authorization.",
          "URLs Configured"
        );
      }
    } catch (error) {
      console.error("Failed to configure redirect URLs:", error);
      setIsRedirectConfigured(false);
      showNotification.error(
        error instanceof Error
          ? error.message
          : "Failed to configure redirect URLs. Please check your credentials.",
        "Configuration Failed"
      );
    } finally {
      setConfigureLoading(false);
    }
  };

  const testConnection = async () => {
    if (!isOAuthAuthorized) {
      showNotification.error(
        'Please complete OAuth authorization first by clicking "Get Access Token".',
        "Authorization Required"
      );
      return;
    }

    setTestLoading(true);
    try {
      const data = await testConnectionAction();

      setIsConnectionTested(true);
      showNotification.success(
        data.message ||
          "Connection to CamInvoice API successful. Your access token is valid.",
        "Connection Test Passed"
      );
    } catch (error) {
      console.error("Connection test failed:", error);
      setIsConnectionTested(false);
      showNotification.error(
        error instanceof Error
          ? error.message
          : "Connection test failed. Please verify your access token is valid.",
        "Connection Failed"
      );
    } finally {
      setTestLoading(false);
    }
  };

  const handleOAuthAuthorization = async () => {
    if (!isRedirectConfigured) {
      showNotification.warning(
        "Redirect URLs have not been configured via API, but OAuth authorization may still work. Proceeding...",
        "Configuration Warning"
      );
    }

    try {
      // Get OAuth authorization URL via server action
      const { authUrl, state } = await getOAuthUrl();

      // Prepare listener BEFORE opening popup to avoid race conditions
      const here = window.location.origin;
      // Allow messages from our app's origins, accounting for proxies and port variations
      const allowedOrigins = new Set<string>();
      const addOrigin = (o: string) => {
        try {
          allowedOrigins.add(new URL(o).origin);
        } catch {}
      };

      // Current origin
      addOrigin(here);

      // Normalize localhost/127.0.0.1 variants
      if (here.includes("://localhost:"))
        addOrigin(here.replace("://localhost:", "://127.0.0.1:"));
      if (here.includes("://127.0.0.1:"))
        addOrigin(here.replace("://127.0.0.1:", "://localhost:"));

      // Add with/without default TLS port and common dev port 3000
      try {
        const u = new URL(here);
        if (u.protocol === "https:") {
          // If running behind a proxy (no explicit port), also allow :3000 and :443
          if (!u.port || u.port === "443") {
            addOrigin(`${u.protocol}//${u.hostname}:3000`);
            addOrigin(`${u.protocol}//${u.hostname}:443`);
          }
          // If explicitly on :3000, also allow portless and :443
          if (u.port === "3000") {
            addOrigin(`${u.protocol}//${u.hostname}`);
            addOrigin(`${u.protocol}//${u.hostname}:443`);
          }
        }
      } catch {}

      // Include any configured redirect URL origins (from provider settings)
      try {
        (form.values?.redirectUrls || []).forEach((url) => addOrigin(url));
      } catch {}

      // Accept messages from our app origin(s) and from the configured redirect URL origins
      const redirectOrigins = (form.values.redirectUrls || [])
        .map((u) => {
          try {
            return new URL(u).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];
      redirectOrigins.forEach((o) => allowedOrigins.add(o));

      const authTokenPromise = new Promise<{
        authToken: string;
        state?: string;
      } | null>((resolve) => {
        const handler = (event: MessageEvent) => {
          try {
            if (!allowedOrigins.has(event.origin)) return;
            const data = event.data as any;
            if (
              data?.source === "caminvoice-oauth" &&
              typeof data?.authToken === "string"
            ) {
              window.removeEventListener("message", handler);
              resolve({ authToken: data.authToken, state: data.state });
            }
          } catch {}
        };
        window.addEventListener("message", handler);
        // Fallback timeout (90s) to allow user interaction on CamInvoice
        setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(null);
        }, 90000);
      });

      // Open OAuth URL in new window (after listener is attached)
      const authWindow = window.open(authUrl, "_blank", "width=600,height=700");

      const result = await authTokenPromise;

      const tokenToUse = result?.authToken;
      if (!tokenToUse) {
        authWindow?.close();
        throw new Error(
          "Authorization was not completed. No authToken received."
        );
      }

      // Exchange authToken for tokens
      const tokenData = await exchangeAuthToken({
        authToken: tokenToUse,
        state: result?.state || state,
      });

      setIsOAuthAuthorized(true);
      setOauthResponse(tokenData);
      showNotification.success(
        "OAuth authorization completed successfully. You can now test the connection.",
        "Authorization Complete"
      );
      authWindow?.close();
    } catch (error) {
      console.error("OAuth authorization failed:", error);
      showNotification.error(
        error instanceof Error
          ? error.message
          : "Failed to start OAuth authorization",
        "Authorization Failed"
      );
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    try {
      await saveProviderConfig({
        clientId: values.clientId,
        clientSecret: values.clientSecret,
        baseUrl: values.baseUrl,
        description: values.description,
        redirectUrls: values.redirectUrls,
      });

      showNotification.success(
        "CamInvoice Service Provider configuration has been saved successfully. You can now manage tenant connections.",
        "Provider Setup Complete"
      );
      onSetupComplete?.();
      setEditing(false);
    } catch (error) {
      console.error("Failed to save provider settings:", error);
      showNotification.error(
        "Failed to save provider configuration. Please check your settings and try again.",
        "Setup Failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (configLoading) {
    return (
      <Card withBorder>
        <Stack gap="md">
          <Skeleton height={22} />
          <Skeleton height={22} />
          <Skeleton height={220} />
        </Stack>
      </Card>
    );
  }

  if (isSetup && !editing) {
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
            <Badge
              color="green"
              variant="light"
              leftSection={<IconCheck size={14} />}
            >
              Configured
            </Badge>
          </Group>

          <Alert color="green" icon={<IconShieldCheck size={16} />}>
            Your service provider credentials are securely stored and encrypted.
            All merchant tokens will be encrypted using your configured
            encryption key.
          </Alert>

          <Group>
            <Button
              variant="light"
              leftSection={<IconEye size={16} />}
              onClick={() => setViewOpen(true)}
            >
              View Configuration
            </Button>
            <Button
              variant="outline"
              color="orange"
              onClick={() => setEditing(true)}
            >
              Update Settings
            </Button>
          </Group>

          <Button
            color="red"
            variant="light"
            loading={revoking}
            onClick={() => setConfirmRevokeOpen(true)}
          >
            Revoke Access
          </Button>

          <Modal
            opened={viewOpen}
            onClose={() => setViewOpen(false)}
            title="Provider Configuration"
            size="lg"
          >
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                The client secret is masked for safety. Use "Update Settings" to
                modify values.
              </Text>
              <Code block>
                {JSON.stringify(
                  {
                    clientId: form.values.clientId,
                    clientSecret: form.values.clientSecret
                      ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      : "",
                    baseUrl: form.values.baseUrl,
                    description: form.values.description,
                    redirectUrls: form.values.redirectUrls,
                  },
                  null,
                  2
                )}
              </Code>
            </Stack>
          </Modal>
        </Stack>

        <Modal
          opened={confirmRevokeOpen}
          onClose={() => setConfirmRevokeOpen(false)}
          title="Confirm Revocation"
          size="sm"
        >
          <Stack gap="md">
            <Text>
              This will disconnect your provider integration and revoke access
              for all tenants. You can reconfigure later. Do you want to
              proceed?
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setConfirmRevokeOpen(false)}
              >
                Cancel
              </Button>
              <Button color="red" loading={revoking} onClick={handleRevoke}>
                Revoke
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Card>
    );
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
          <Text fw={500} mb="xs">
            Important Note:
          </Text>
          This is a <strong>one-time setup</strong> as advised by the Cambodia
          Government. Only Service Providers can configure these settings, but
          they can be used globally by all end users.
        </Alert>

        {/* Lead-style status grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <Card withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600}>Redirect URLs</Text>
                <Text size="xs" c="dimmed">
                  OAuth whitelist configured
                </Text>
              </div>
              <Badge
                color={isRedirectConfigured ? "green" : "gray"}
                variant="light"
              >
                {isRedirectConfigured ? "Configured" : "Pending"}
              </Badge>
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600}>OAuth</Text>
                <Text size="xs" c="dimmed">
                  Authorization status
                </Text>
              </div>
              <Badge
                color={isOAuthAuthorized ? "green" : "gray"}
                variant="light"
              >
                {isOAuthAuthorized ? "Authorized" : "Required"}
              </Badge>
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600}>API Connection</Text>
                <Text size="xs" c="dimmed">
                  Connectivity check
                </Text>
              </div>
              <Badge
                color={isConnectionTested ? "green" : "gray"}
                variant="light"
              >
                {isConnectionTested ? "OK" : "Pending"}
              </Badge>
            </Group>
          </Card>
        </SimpleGrid>

        <Stepper
          active={currentStep}
          onStepClick={setCurrentStep}
          allowNextStepsSelect={false}
        >
          <Stepper.Step
            label="Provider Credentials"
            description="CamInvoice API credentials"
            icon={<IconKey size={18} />}
          >
            <Stack gap="md" mt="md">
              <TextInput
                label="Client ID *"
                description="Your CamInvoice Service Provider Client ID"
                required
                {...form.getInputProps("clientId")}
              />

              <PasswordInput
                label="Client Secret *"
                description="Your CamInvoice Service Provider Client Secret"
                required
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <IconEyeOff size={16} />
                    ) : (
                      <IconEye size={16} />
                    )}
                  </ActionIcon>
                }
                visible={showSecrets}
                {...form.getInputProps("clientSecret")}
              />

              <TextInput
                label="Base URL *"
                description="CamInvoice API Base URL"
                required
                {...form.getInputProps("baseUrl")}
              />

              <Textarea
                label="Description"
                description="Optional description for this configuration"
                placeholder="Production CamInvoice Service Provider setup"
                minRows={3}
                {...form.getInputProps("description")}
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
                  <strong>OAuth Configuration:</strong> Configure the redirect
                  URLs that CamInvoice will use to redirect users back to your
                  application after authentication.
                </Text>
              </Alert>

              <div>
                <Text size="sm" fw={500} mb="xs">
                  Redirect URLs *
                </Text>
                <Text size="xs" c="dimmed" mb="md">
                  These URLs will be whitelisted in CamInvoice for OAuth
                  redirects. Users will be redirected to these URLs after
                  successful authentication.
                </Text>

                {form.values.redirectUrls.map((url, index) => (
                  <Group key={index} mb="sm">
                    <TextInput
                      style={{ flex: 1 }}
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...form.values.redirectUrls];
                        newUrls[index] = e.target.value;
                        form.setFieldValue("redirectUrls", newUrls);
                      }}
                      error={form.errors[`redirectUrls.${index}`]}
                    />
                    {form.values.redirectUrls.length > 1 && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => {
                          const newUrls = form.values.redirectUrls.filter(
                            (_, i) => i !== index
                          );
                          form.setFieldValue("redirectUrls", newUrls);
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
                    form.setFieldValue("redirectUrls", [
                      ...form.values.redirectUrls,
                      "",
                    ]);
                  }}
                >
                  Add Another URL
                </Button>
              </div>

              <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  CamInvoice only accepts{" "}
                  <strong>public HTTPS URLs with a real domain</strong>.
                  Localhost or HTTP URLs will be rejected (422). During
                  development, use a tunnel:
                  <br />• Cloudflare Tunnel:
                  https://your-subdomain.trycloudflare.com/auth/callback
                  <br />• ngrok:
                  https://your-subdomain.ngrok-free.app/auth/callback
                  <br />
                  Make sure the path matches <Code>/auth/callback</Code>.
                </Text>
              </Alert>
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
                  <strong>Testing Configuration:</strong> We'll now test your
                  credentials and configure the redirect URLs with CamInvoice to
                  complete the setup.
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
                      {isRedirectConfigured
                        ? "✓ URLs Configured"
                        : "Configure URLs"}
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
                      {isConnectionTested
                        ? "✓ Connection Tested"
                        : "Test Connection"}
                    </Button>
                  </Group>
                  <Text
                    size="sm"
                    c={
                      isConnectionTested
                        ? "green"
                        : isOAuthAuthorized
                        ? "dimmed"
                        : "red"
                    }
                  >
                    {isConnectionTested
                      ? "✓ API connection successful"
                      : isOAuthAuthorized
                      ? "Validate credentials and API connectivity"
                      : "⚠️ OAuth authorization required first"}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder bg="gray.0">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={500} size="sm">
                      OAuth Authorization:
                    </Text>
                    <Button
                      size="sm"
                      variant={isOAuthAuthorized ? "filled" : "outline"}
                      color={isOAuthAuthorized ? "green" : "blue"}
                      onClick={handleOAuthAuthorization}
                      disabled={
                        !form.values.clientId || !form.values.clientSecret
                      }
                    >
                      {isOAuthAuthorized
                        ? "✓ Authorized"
                        : "Authorize with CamInvoice"}
                    </Button>
                  </Group>
                  <Divider />
                  <Text size="xs" c={isOAuthAuthorized ? "green" : "dimmed"}>
                    {isOAuthAuthorized
                      ? "✓ OAuth authorization completed successfully. You can now test the connection."
                      : "Click 'Authorize with CamInvoice' to complete OAuth flow and get access/refresh tokens. (Redirect URL configuration is optional)"}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder bg="green.0">
                <Stack gap="sm">
                  <Text fw={500} size="sm">
                    CamInvoice OAuth2 Authorization Code Flow:
                  </Text>
                  <Divider />
                  <Text size="sm">
                    1. <strong>Configure Redirect URLs</strong> → POST
                    /api/v1/configure/configure-redirect-url
                    <br />
                    2. <strong>Generate Connect Link</strong> → User clicks link
                    → Redirected to CamInvoice
                    <br />
                    3. <strong>User Authorization</strong> → User authorizes →
                    Redirected back with authToken
                    <br />
                    4. <strong>Token Exchange</strong> → POST
                    /api/v1/auth/authorize/connect → Get access/refresh tokens
                  </Text>
                </Stack>
              </Card>

              {oauthResponse && (
                <Card withBorder bg="blue.0">
                  <Stack gap="sm">
                    <Text fw={500} size="sm">
                      OAuth Response Data:
                    </Text>
                    <Divider />

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Access Token:
                      </Text>
                      {oauthResponse?.access_token ? (
                        <Code>
                          {String(oauthResponse.access_token).substring(0, 20)}
                          ...
                        </Code>
                      ) : (
                        <Text size="xs" c="dimmed">
                          N/A
                        </Text>
                      )}
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Refresh Token:
                      </Text>
                      {oauthResponse?.refresh_token ? (
                        <Code>
                          {String(oauthResponse.refresh_token).substring(0, 20)}
                          ...
                        </Code>
                      ) : (
                        <Text size="xs" c="dimmed">
                          N/A
                        </Text>
                      )}
                    </Group>

                    <Text fw={500} size="sm" mt="md">
                      Business Information:
                    </Text>
                    <Divider />

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Endpoint ID:
                      </Text>
                      <Text size="sm" ff="monospace">
                        {oauthResponse?.business_info?.endpoint_id ?? "—"}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Company (EN):
                      </Text>
                      <Text size="sm">
                        {oauthResponse?.business_info?.company_name_en ?? "—"}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        Company (KH):
                      </Text>
                      <Text size="sm">
                        {oauthResponse?.business_info?.company_name_kh ?? "—"}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        TIN:
                      </Text>
                      <Text size="sm" ff="monospace">
                        {oauthResponse?.business_info?.tin ?? "—"}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        MOC ID:
                      </Text>
                      <Text size="sm" ff="monospace">
                        {oauthResponse?.business_info?.moc_id ?? "—"}
                      </Text>
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

          <Group>
            {currentStep < 2 && (
              <Button
                onClick={() => {
                  if (currentStep === 0) {
                    const step1Errors = validateStep1();
                    if (Object.keys(step1Errors).length === 0) {
                      setCurrentStep(currentStep + 1);
                      showNotification.info(
                        "Provider credentials validated. Configure security keys.",
                        "Step 1 Complete"
                      );
                    } else {
                      form.setErrors(step1Errors);
                      showNotification.error(
                        "Please fill in all required fields correctly.",
                        "Validation Error"
                      );
                    }
                  } else if (currentStep === 1) {
                    const step2Errors = validateStep2();
                    if (Object.keys(step2Errors).length === 0) {
                      setCurrentStep(currentStep + 1);
                      showNotification.info(
                        "Redirect URLs validated. Review your settings.",
                        "Step 2 Complete"
                      );
                    } else {
                      form.setErrors(step2Errors);
                      showNotification.error(
                        "Please configure valid redirect URLs.",
                        "Validation Error"
                      );
                    }
                  }
                }}
              >
                Next
              </Button>
            )}
            {isSetup && (
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
