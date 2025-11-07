import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const provider = await prisma.provider.findFirst({ where: { isActive: true } })
    if (!provider) {
      return NextResponse.json({ success: false, error: 'No active provider found' }, { status: 404 })
    }

    const now = Date.now()
    const hasAccessToken = !!provider.accessToken
    const expiresAt = provider.tokenExpiresAt ? new Date(provider.tokenExpiresAt) : null
    const expiresInSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)) : null
    const isExpired = !expiresAt || expiresAt.getTime() <= now
    const expiringSoon = !!expiresAt && expiresAt.getTime() - now <= 60_000

    const recent = await prisma.auditLog.findMany({
      where: { action: 'CONFIGURE_PROVIDER', entityType: 'Provider' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const decorate = (d: typeof recent[number]) => ({
      id: d.id,
      createdAt: d.createdAt,
      description: d.description,
      success: !/FAILED/i.test(d.description || ''),
      metadata: d.metadata ?? null,
    })

    const recentEvents = recent.map(decorate)
    const lastEvent = recentEvents[0] || null
    const lastSuccessful = recentEvents.find((e) => e.success) || null

    return NextResponse.json({
      success: true,
      providerId: provider.id,
      hasAccessToken,
      tokenExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      expiresInSeconds,
      isExpired,
      expiringSoon,
      lastEvent,
      lastSuccessful,
      recentEvents,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load token status' }, { status: 500 })
  }
}

