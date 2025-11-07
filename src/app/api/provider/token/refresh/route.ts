import { NextResponse } from 'next/server'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { prisma } from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const info = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })
    return NextResponse.json({ success: true, ...info, expiresAt: info.expiresAt ? new Date(info.expiresAt).toISOString() : null })
  } catch (e: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          tenantId: null,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: 'caminvoice',
          description: `CamInvoice token refresh FAILED: ${e?.message || 'unknown error'}`,
          metadata: { error: e?.message || '' } as any,
        },
      })
    } catch {}
    return NextResponse.json({ success: false, error: e?.message || 'Refresh failed' }, { status: 500 })
  }
}

