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

// Build OAuth authorization URL (CamInvoice uses /connect)
export async function getOAuthUrl() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.clientId || !provider.redirectUrls?.length) throw new Error("Provider missing clientId or redirectUrls")
  const base = sanitizeBaseUrl(provider.baseUrl)
  const url = new URL(`${base}/connect`)
  url.searchParams.set("client_id", provider.clientId)
  url.searchParams.set("redirect_url", provider.redirectUrls[0])
  // For now we pass a simple state; consider JWT if you need verification
  const state = `state_${Date.now()}`
  url.searchParams.set("state", state)
  return { success: true, authUrl: url.toString(), state }
}

// Exchange authToken for tokens and persist to Provider
export async function exchangeAuthToken(input: { authToken: string; state?: string }) {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")

  const base = sanitizeBaseUrl(provider.baseUrl)

  // Attempt the documented endpoint with fallbacks similar to the existing API route
  const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")
  async function callTokenEndpoint(targetUrl: string) {
    return fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify({ auth_token: input.authToken }),
      redirect: "manual",
    })
  }

  let resp = await callTokenEndpoint(`${base}/api/v1/auth/authorize/connect`)
  if (resp.status === 404) resp = await callTokenEndpoint(`${base}/api/v1/authorize/connect`)
  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get("location") || "unknown"
    throw new Error(`Token endpoint redirected: ${resp.status} -> ${loc}`)
  }
  if (!resp.ok) {
    const raw = await resp.text().catch(() => "")
    throw new Error(`Token exchange failed: ${resp.status} - ${raw.slice(0, 200)}`)
  }
  const ctype = resp.headers.get("content-type") || ""
  if (!ctype.includes("application/json")) {
    const raw = await resp.text().catch(() => "")
    throw new Error(`Unexpected token response content-type: ${ctype} - ${raw.slice(0, 200)}`)
  }
  const tokenData: any = await resp.json().catch(() => null)
  const { access_token, refresh_token, expires_in } = tokenData || {}
  if (!access_token) throw new Error("No access token received")

  const tokenExpiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt,
      isConfigured: true,
      updatedAt: new Date(),
    },
  })

  // Return minimal OAuthResponse-compatible shape (no tokens echoed back)
  return { business_info: tokenData?.business_info }
}

export async function testConnection() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.accessToken) throw new Error("No access token available")

  // If token is expired, try to refresh using refresh token if present
  if (provider.tokenExpiresAt && provider.tokenExpiresAt < new Date()) {
    if (provider.refreshToken) {
      const base = sanitizeBaseUrl(provider.baseUrl)
      const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")
      const refreshResp = await fetch(`${base}/api/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
        body: JSON.stringify({ refresh_token: provider.refreshToken }),
      })
      if (refreshResp.ok) {
        const ctype = refreshResp.headers.get("content-type") || ""
        const rdata: any = ctype.includes("application/json") ? await refreshResp.json().catch(() => null) : null
        const newToken = rdata?.token
        const expireIn = Number(rdata?.expire_in || 900)
        if (newToken) {
          await prisma.provider.update({
            where: { id: provider.id },
            data: { accessToken: newToken, tokenExpiresAt: new Date(Date.now() + expireIn * 1000), updatedAt: new Date() },
          })
        } else {
          throw new Error("Failed to refresh access token: invalid response")
        }
      } else {
        const raw = await refreshResp.text().catch(() => "")
        throw new Error(`Failed to refresh access token: ${refreshResp.status} - ${raw.slice(0, 200)}`)
      }
    } else {
      throw new Error("Access token expired and no refresh token available")
    }
  }

  // Test call: profile endpoint
  const base = sanitizeBaseUrl(provider.baseUrl)
  const testResponse = await fetch(`${base}/api/v1/user/profile`, {
    method: "GET",
    headers: { Authorization: `Bearer ${provider.accessToken}`, "Content-Type": "application/json" },
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
      apiVersion: profileData.api_version || "v1",
      userProfile: {
        id: profileData.id,
        name: profileData.name || "Unknown",
        email: profileData.email,
      },
      connectionTime: new Date().toISOString(),
    },
  }
}

