import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { logAudit } from '../../../../lib/audit'

// CamInvoice webhook endpoint for receiving official event updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('CamInvoice webhook received:', JSON.stringify(body, null, 2))

    // Validate webhook payload structure according to official docs
    if (!body.type || !body.document_id) {
      console.error('Invalid webhook payload:', body)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { type, document_id, endpoint_id, status } = body

    // Find the document by CamInvoice UUID
    const invoice = await prisma.invoice.findFirst({
      where: { camInvoiceUuid: document_id },
      include: { tenant: true }
    })

    const creditNote = !invoice ? await prisma.creditNote.findFirst({
      where: { camInvoiceUuid: document_id },
      include: { tenant: true }
    }) : null

    const debitNote = !invoice && !creditNote ? await prisma.debitNote.findFirst({
      where: { camInvoiceUuid: document_id },
      include: { tenant: true }
    }) : null

    const document = invoice || creditNote || debitNote
    if (!document) {
      console.error('Document not found for CamInvoice UUID:', document_id)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Handle different event types according to official documentation
    let updateData: any = {}
    let mappedStatus: string | null = null

    switch (type) {
      case 'DOCUMENT.DELIVERED':
        mappedStatus = 'DELIVERED'
        updateData = {
          camInvoiceStatus: 'DELIVERED',
          camInvoiceStatusUpdatedAt: new Date(),
        }
        break

      case 'DOCUMENT.RECEIVED':
        // This event is for receivers, but we might want to log it
        console.log(`Document ${document_id} was received by customer`)
        break

      case 'DOCUMENT.STATUS_UPDATED':
        if (!status) {
          console.error('Status missing in STATUS_UPDATED event:', body)
          return NextResponse.json({ error: 'Status required for STATUS_UPDATED event' }, { status: 400 })
        }

        // Map CamInvoice status to our enum values
        const validStatuses = ['VALID', 'DELIVERED', 'ACKNOWLEDGED', 'IN_PROCESS', 'UNDER_QUERY', 'CONDITIONALLY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'PAID']
        mappedStatus = validStatuses.includes(status) ? status : null

        if (!mappedStatus) {
          console.error('Invalid status received:', status)
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        updateData = {
          camInvoiceStatus: mappedStatus as any,
          camInvoiceStatusUpdatedAt: new Date(),
        }
        break

      case 'ENTITY.REVOKED':
        // Handle entity revocation - this affects the entire connection
        console.log(`Entity ${endpoint_id} was revoked`)
        // TODO: Handle entity revocation logic
        return NextResponse.json({ success: true, message: 'Entity revocation noted' })

      default:
        console.warn(`Unknown event type: ${type}`)
        return NextResponse.json({ success: true, message: 'Event type not handled' })
    }

    // Skip if no update needed (e.g., DOCUMENT.RECEIVED event)
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'Event processed, no update needed' })
    }

    if (invoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: updateData
      })
    } else if (creditNote) {
      await prisma.creditNote.update({
        where: { id: creditNote.id },
        data: updateData
      })
    } else if (debitNote) {
      await prisma.debitNote.update({
        where: { id: debitNote.id },
        data: updateData
      })
    }

    // Log the webhook event
    await logAudit({
      tenantId: document.tenantId,
      userId: null, // System event
      action: 'WEBHOOK_RECEIVED',
      entityType: invoice ? 'Invoice' : creditNote ? 'CreditNote' : 'DebitNote',
      entityId: document.id,
      description: `CamInvoice webhook received: ${type} for document ${document_id}${mappedStatus ? ` (status: ${mappedStatus})` : ''}`,
      metadata: {
        camInvoiceUuid: document_id,
        oldStatus: document.camInvoiceStatus,
        newStatus: mappedStatus,
        eventType: type,
        timestamp: new Date().toISOString()
      }
    })

    console.log(`Document ${document.id} status updated from ${document.camInvoiceStatus} to ${mappedStatus}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully',
      documentId: document.id,
      oldStatus: document.camInvoiceStatus,
      newStatus: mappedStatus
    })

  } catch (error) {
    console.error('CamInvoice webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle webhook verification (if CamInvoice requires it)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    // Return the challenge for webhook verification
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({ message: 'CamInvoice webhook endpoint' })
}
