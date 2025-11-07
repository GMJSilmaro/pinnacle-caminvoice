import { prisma } from './prisma'
import { authTokenWithRefresh } from './caminvoice'

// In‑process dedupe + backoff to avoid refresh storms
declare global {
  // eslint-disable-next-line no-var
  var __caminvRefreshPromise: Promise<any> | null | undefined
  // eslint-disable-next-line no-var
  var __caminvLastRefreshFailureAt: number | undefined
}

/**
 * Ensures we have a valid CamInvoice provider access token.
 * - Refreshes when token is missing/expired or when within early window
 * - Also refreshes when >80% of observed lifetime has elapsed (approx using updatedAt)
 * - Dedupes concurrent refreshes and applies short backoff on failures
 */
export async function ensureProviderAccessToken(options?: { earlyRefreshSeconds?: number }) {
  const earlyRefreshSeconds = options?.earlyRefreshSeconds ?? 60
  const now = Date.now()

  // Get active provider configuration
  const provider = await prisma.provider.findFirst({ where: { isActive: true } })
  if (!provider) throw new Error('No active provider configuration found')

  const baseUrl = provider.baseUrl || undefined
  const expiresAt = provider.tokenExpiresAt ? new Date(provider.tokenExpiresAt).getTime() : 0

  // Approximate issuedAt using updatedAt when token fields are set
  const updatedAtMs = provider.updatedAt ? new Date(provider.updatedAt).getTime() : 0
  const observedTtlMs = expiresAt && updatedAtMs && expiresAt > updatedAtMs ? (expiresAt - updatedAtMs) : 0
  const eightyPctMs = observedTtlMs ? Math.floor(observedTtlMs * 0.8) : 0
  const passedSinceUpdateMs = updatedAtMs ? (now - updatedAtMs) : 0

  const withinEarlyWindow = !expiresAt || (expiresAt - now) <= earlyRefreshSeconds * 1000
  const beyondEightyPct = eightyPctMs > 0 && passedSinceUpdateMs >= eightyPctMs
  const needsRefresh = !provider.accessToken || withinEarlyWindow || beyondEightyPct

  if (!needsRefresh) {
    return {
      accessToken: provider.accessToken!,
      baseUrl,
      expiresAt: provider.tokenExpiresAt ?? null,
      refreshed: false,
    }
  }

  // Backoff on recent failures (30s)
  const lastFail = globalThis.__caminvLastRefreshFailureAt
  if (lastFail && now - lastFail < 30_000) {
    if (provider.accessToken) {
      return {
        accessToken: provider.accessToken,
        baseUrl,
        expiresAt: provider.tokenExpiresAt ?? null,
        refreshed: false,
      }
    }
    throw new Error('Recent token refresh failure; backing off briefly')
  }

  if (!provider.refreshToken) {
    throw new Error('Provider refresh token is missing; cannot refresh CamInvoice access token')
  }

  // Dedupe concurrent refreshes
  if (!globalThis.__caminvRefreshPromise) {
    globalThis.__caminvRefreshPromise = (async () => {
      // Refresh via authentication endpoint
      const token = await authTokenWithRefresh({
        baseUrl,
        clientId: provider.clientId,
        clientSecret: provider.clientSecret,
        refreshToken: provider.refreshToken!,
      })

      const newExpiresAt = new Date(now + ((token.expires_in ?? 900) - 30) * 1000) // refresh ~30s early

      const updated = await prisma.provider.update({
        where: { id: provider.id },
        data: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token ?? provider.refreshToken!,
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      })

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: null,
          tenantId: null,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: updated.id,
          description: 'CamInvoice access token refreshed automatically by system',
          metadata: { expires_at: newExpiresAt.toISOString() } as any,
        },
      })

      return {
        accessToken: updated.accessToken!,
        baseUrl,
        expiresAt: updated.tokenExpiresAt ?? null,
        refreshed: true,
      }
    })().catch((err) => {
      globalThis.__caminvLastRefreshFailureAt = Date.now()
      throw err
    }).finally(() => {
      // Clear promise after completion for next attempt
      setTimeout(() => { globalThis.__caminvRefreshPromise = null }, 0)
    })
  }

  // Await the in-flight refresh result
  return globalThis.__caminvRefreshPromise!
}

