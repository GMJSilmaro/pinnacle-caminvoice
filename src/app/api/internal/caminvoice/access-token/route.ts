import { NextResponse } from 'next/server'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { prisma } from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Allow only internal middleware calls or authenticated server calls in the future
    const isInternal = request.headers.get('x-internal-request') === 'middleware'
    if (!isInternal) {
      // We still allow in development to simplify, but you can tighten this as needed
    }

    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    return NextResponse.json({
      success: true,
      accessToken: tokenInfo.accessToken,
      baseUrl: tokenInfo.baseUrl || null,
      expiresAt: tokenInfo.expiresAt,
      refreshed: tokenInfo.refreshed,
    })
  } catch (e: any) {
    // Log failure to audit log for visibility
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          tenantId: null,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: 'caminvoice',
          description: `CamInvoice token refresh FAILED: ${e?.message || 'unknown error'}`,
        },
      })
    } catch {}
    return NextResponse.json({ success: false, error: e?.message || 'Failed to ensure access token' }, { status: 500 })
  }
}

