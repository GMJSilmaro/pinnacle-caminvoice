import { NextResponse } from 'next/server'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { probeToken } from '../../../../../lib/caminvoice'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const info = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })
    const probe = await probeToken({ accessToken: info.accessToken, baseUrl: info.baseUrl })
    return NextResponse.json({ success: true, token: { expiresAt: info.expiresAt }, probe })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Health check failed' }, { status: 500 })
  }
}

