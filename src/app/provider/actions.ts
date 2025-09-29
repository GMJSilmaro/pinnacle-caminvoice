"use server"

import { prisma } from "@/lib/prisma"
import { getAccessToken } from "@/lib/caminvoice"


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

// Get access token using OAuth2 Client Credentials flow
export async function getProviderAccessToken() {
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error("Provider not configured")
  if (!provider.clientId || !provider.clientSecret) throw new Error("Provider missing clientId or clientSecret")

  const base = sanitizeBaseUrl(provider.baseUrl)

  try {
    const tokenData = await getAccessToken({
      clientId: provider.clientId,
      clientSecret: provider.clientSecret,
      baseUrl: base,
    })

    // Store the tokens in the database
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null

    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt,
        isConfigured: true,
        updatedAt: new Date(),
      },
    })

    return {
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    }
  } catch (error) {
    throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test connection using OAuth2 Client Credentials flow
export async function testConnection() {
  try {
    const result = await getProviderAccessToken()
    return {
      success: true,
      message: "Successfully connected to CamInvoice API and obtained access token",
      access_token: result.access_token ? `${result.access_token.substring(0, 20)}...` : null,
      expires_in: result.expires_in,
    }
  } catch (error) {
    throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}



