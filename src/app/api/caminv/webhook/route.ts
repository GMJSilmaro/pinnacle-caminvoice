import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { logAudit } from '../../../../lib/audit'

// TODO: Verify signature if CamInv provides one (e.g., HMAC header)

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    let payload: any = null
    try {
      payload = JSON.parse(raw)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const documentId: string | undefined = payload?.document_id || payload?.uuid
    const status: string | undefined = payload?.status || payload?.document_status

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document_id' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findFirst({ where: { camInvoiceUuid: documentId } })
    if (!invoice) {
      // Log but do not fail; we may be out of sync
      await logAudit({
        action: 'UPDATE',
        entityType: 'Invoice',
        description: `Webhook for unknown document ${documentId}`,
        metadata: payload,
      })
      return NextResponse.json({ ok: true })
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        camInvoiceStatus: status || undefined,
        status: status === 'ACCEPTED' ? 'ACCEPTED' : status === 'REJECTED' ? 'REJECTED' : invoice.status,
        updatedAt: new Date(),
      },
      select: { id: true, status: true, camInvoiceStatus: true }
    })

    await logAudit({
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: updated.id,
      description: `Webhook updated status to ${updated.status}`,
      metadata: payload,
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

