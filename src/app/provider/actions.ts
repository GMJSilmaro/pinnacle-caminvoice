"use server"

import { prisma } from "@/lib/prisma"


// Utilities
function sanitizeBaseUrl(url: string | null | undefined) {
  if (!url) return ""
  return url.replace(/\/+$/, "")
}

export async function loadProviderConfig() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) {
    return { success: true, provider: null }
  }
  return {
    success: true,
    provider: {
      id: provider.id,
      name: provider.name,
      description: provider.description ?? "",
      clientId: provider.clientId,
      clientSecret: provider.clientSecret, // NOTE: keep server-only in real apps; exposed here because client component expects it today
      baseUrl: provider.baseUrl,
      redirectUrls: provider.redirectUrls || [],
      isConnectedToCamInv: !!(provider.isConfigured && provider.accessToken),
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    },
  }
}

export async function saveProviderConfig(input: {
  clientId: string
  clientSecret: string
  baseUrl: string
  description?: string
  redirectUrls: string[]
}) {
  const baseUrl = sanitizeBaseUrl(input.baseUrl)

  // Upsert by clientId to avoid duplicates
  const existing = await prisma.provider.findFirst({ where: { clientId: input.clientId } })
  const provider = existing
    ? await prisma.provider.update({
        where: { id: existing.id },
        data: {
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          baseUrl,
          description: input.description || null,
          redirectUrls: input.redirectUrls,
          updatedAt: new Date(),
        },
      })
    : await prisma.provider.create({
        data: {
          name: "CamInvoice Service Provider",
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          baseUrl,
          description: input.description || null,
          redirectUrls: input.redirectUrls,
          isConfigured: false,
          isActive: true,
        },
      })

  return { success: true, providerId: provider.id }
}

// Configure redirect URLs with CamInvoice (DB update + TODO: remote call when confirmed)
export async function configureRedirectUrls(params: { redirectUrls: string[] }) {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")

  await prisma.provider.update({
    where: { id: provider.id },
    data: { redirectUrls: params.redirectUrls, updatedAt: new Date() },
  })

  // TODO: If official endpoint exists, call it here with provider credentials
  // e.g., await fetch(`${base}/api/v1/configure/configure-redirect-url`, ...)

  return { success: true }
}

// Generate OAuth authorization URL (CamInvoice Authorization Code flow)
export async function getOAuthUrl() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.clientId || !provider.redirectUrls?.length) throw new Error("Provider missing clientId or redirectUrls")

  const base = sanitizeBaseUrl(provider.baseUrl)
  const redirectUrl = provider.redirectUrls[0]
  const state = `provider_setup_${Date.now()}`

  // Step 1: Generate Connect Link according to CamInvoice documentation
  const authUrl = `${base}/connect?client_id=${encodeURIComponent(provider.clientId)}&redirect_url=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`

  return {
    success: true,
    authUrl,
    state
  }
}

// Exchange authToken for access/refresh tokens (CamInvoice Authorization Code flow)
export async function exchangeAuthToken(input: { authToken: string; state?: string }) {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")

  const base = sanitizeBaseUrl(provider.baseUrl)

  // Step 3: Token Request according to CamInvoice documentation
  const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")

  const tokenResponse = await fetch(`${base}/api/v1/auth/authorize/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${basic}`
    },
    body: JSON.stringify({
      auth_token: input.authToken
    }),
  })

  if (!tokenResponse.ok) {
    const raw = await tokenResponse.text().catch(() => "")
    throw new Error(`Token exchange failed: ${tokenResponse.status} - ${raw.slice(0, 200)}`)
  }

  const tokenData: any = await tokenResponse.json()
  const { access_token, refresh_token, business_info } = tokenData || {}

  if (!access_token) {
    throw new Error("No access token received from CamInvoice")
  }

  // Store the tokens and business info in the database
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: null, // CamInvoice doesn't provide expires_in in this flow
      isConfigured: true,
      updatedAt: new Date(),
    },
  })

  return {
    success: true,
    access_token,
    refresh_token,
    business_info,
  }
}

// Test connection using existing access token
export async function testConnection() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.accessToken) throw new Error("No access token available. Please complete OAuth authorization first.")

  const base = sanitizeBaseUrl(provider.baseUrl)

  try {
    // Test the connection by making a simple API call (you can adjust this endpoint based on CamInvoice API)
    const testResponse = await fetch(`${base}/api/v1/user/profile`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${provider.accessToken}`,
        "Content-Type": "application/json"
      },
    })

    if (!testResponse.ok) {
      const raw = await testResponse.text().catch(() => "")
      throw new Error(`API test failed: ${testResponse.status} - ${raw.slice(0, 200)}`)
    }

    const profileData = await testResponse.json().catch(() => ({}))

    return {
      success: true,
      message: "Connection to CamInvoice API successful",
      data: {
        status: "connected",
        userProfile: profileData,
        connectionTime: new Date().toISOString(),
      },
    }
  } catch (error) {
    throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}



