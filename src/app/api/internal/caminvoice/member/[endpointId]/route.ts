import { NextResponse } from 'next/server'
import { ensureProviderAccessToken } from '../../../../../../lib/providerToken'
import { getMemberDetailByEndpoint } from '../../../../../../lib/caminvoice'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { endpointId } = await params
    if (!endpointId) {
      return NextResponse.json({ success: false, error: 'endpointId is required' }, { status: 400 })
    }

    // Acquire/refresh provider access token
    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    // Call CamInvoice Business: Get member detail
    const detail = await getMemberDetailByEndpoint({
      accessToken: tokenInfo.accessToken,
      endpointId,
      baseUrl: tokenInfo.baseUrl || undefined,
    })

    return NextResponse.json({ success: true, detail })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to get member detail' },
      { status: 500 }
    )
  }
}

