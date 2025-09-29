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

// Configure redirect URLs with CamInvoice API (whitelist URLs before OAuth can work)
export async function configureRedirectUrls(params: { redirectUrls: string[] }) {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.clientId || !provider.clientSecret) throw new Error("Provider missing clientId or clientSecret")

  const base = sanitizeBaseUrl(provider.baseUrl)
  const configEndpoint = `${base}/api/v1/configure/configure-redirect-url`

  // Debug logging
  console.log("🔧 Configuring Redirect URLs:")
  console.log("  Endpoint:", configEndpoint)
  console.log("  Redirect URLs:", params.redirectUrls)

  // Configure redirect URLs with CamInvoice API according to documentation
  const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")

  try {
    const configResponse = await fetch(configEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basic}`
      },
      body: JSON.stringify({
        white_list_redirect_urls: params.redirectUrls
      }),
    })

    console.log("  Response Status:", configResponse.status)
    console.log("  Response Headers:", Object.fromEntries(configResponse.headers.entries()))

    if (!configResponse.ok) {
      const raw = await configResponse.text().catch(() => "")
      console.log("  Error Response Body:", raw.slice(0, 500))
      throw new Error(`Failed to configure redirect URLs: ${configResponse.status} - ${raw.slice(0, 200)}`)
    }

    const responseData = await configResponse.json().catch(() => ({}))
    console.log("✅ Redirect URLs configured successfully:", responseData)

    // Update database after successful API call
    await prisma.provider.update({
      where: { id: provider.id },
      data: { redirectUrls: params.redirectUrls, updatedAt: new Date() },
    })

    return { success: true, data: responseData }

  } catch (error) {
    console.error("❌ Redirect URL configuration error:", error)
    throw error
  }
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
  const tokenEndpoint = `${base}/api/v1/auth/authorize/connect`

  // Debug logging
  console.log("🔍 OAuth Token Exchange Debug:")
  console.log("  Provider Base URL:", provider.baseUrl)
  console.log("  Sanitized Base URL:", base)
  console.log("  Token Endpoint:", tokenEndpoint)
  console.log("  Auth Token:", input.authToken?.substring(0, 20) + "...")

  // Step 3: Token Request according to CamInvoice documentation
  const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")

  try {
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basic}`
      },
      body: JSON.stringify({
        auth_token: input.authToken
      }),
    })

    console.log("  Response Status:", tokenResponse.status)
    console.log("  Response Headers:", Object.fromEntries(tokenResponse.headers.entries()))

    if (!tokenResponse.ok) {
      const raw = await tokenResponse.text().catch(() => "")
      console.log("  Error Response Body:", raw.slice(0, 500))

      // Try alternative endpoints if 404
      if (tokenResponse.status === 404) {
        console.log("🔄 Trying alternative endpoints...")

        // Try without /auth/ prefix
        const altEndpoint1 = `${base}/api/v1/authorize/connect`
        console.log("  Trying:", altEndpoint1)

        const altResponse1 = await fetch(altEndpoint1, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${basic}`
          },
          body: JSON.stringify({
            auth_token: input.authToken
          }),
        })

        if (altResponse1.ok) {
          console.log("✅ Alternative endpoint 1 worked!")
          const tokenData = await altResponse1.json()
          return await processTokenResponse(tokenData, provider)
        }

        // Try with /oauth/ prefix
        const altEndpoint2 = `${base}/oauth/token`
        console.log("  Trying:", altEndpoint2)

        const altResponse2 = await fetch(altEndpoint2, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${basic}`
          },
          body: JSON.stringify({
            auth_token: input.authToken
          }),
        })

        if (altResponse2.ok) {
          console.log("✅ Alternative endpoint 2 worked!")
          const tokenData = await altResponse2.json()
          return await processTokenResponse(tokenData, provider)
        }
      }

      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${raw.slice(0, 200)}`)
    }

    const tokenData: any = await tokenResponse.json()
    return await processTokenResponse(tokenData, provider)

  } catch (error) {
    console.error("❌ Token exchange error:", error)
    throw error
  }
}

// Helper function to process token response
async function processTokenResponse(tokenData: any, provider: any) {
  const { access_token, refresh_token, business_info } = tokenData || {}

  if (!access_token) {
    throw new Error("No access token received from CamInvoice")
  }

  console.log("✅ Token exchange successful!")
  console.log("  Access Token:", access_token?.substring(0, 20) + "...")
  console.log("  Refresh Token:", refresh_token ? refresh_token.substring(0, 20) + "..." : "None")
  console.log("  Business Info:", business_info ? "Present" : "None")

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



