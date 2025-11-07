import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../../lib/tenant-middleware'
import { DeliveryService } from '../../../../../lib/delivery-service'
import { StatusSyncService } from '../../../../../lib/status-sync-service'
import { prisma } from '../../../../../lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { forceEmail = false } = body

    // Attempt delivery
    const deliveryResult = await DeliveryService.deliverDocument({
      documentId: id,
      documentType: 'credit-note',
      forceEmail,
    })

    if (deliveryResult.success) {
      // Auto-sync status after successful delivery
      let syncResult = null
      try {
        // Get the credit note to check if it has a CamInvoice UUID
        const creditNote = await prisma.creditNote.findUnique({
          where: { id },
          select: { camInvoiceUuid: true }
        })

        if (creditNote?.camInvoiceUuid) {
          // Trigger status sync after a short delay to allow CamInvoice to process
          setTimeout(async () => {
            try {
              await StatusSyncService.syncDocumentStatus({
                documentId: id,
                documentType: 'credit-note',
                camInvoiceUuid: creditNote.camInvoiceUuid!,
              })
              console.log(`Auto-sync triggered for credit note ${id} after delivery`)
            } catch (syncError) {
              console.error(`Auto-sync failed for credit note ${id}:`, syncError)
            }
          }, 2000) // 2 second delay

          syncResult = { autoSyncTriggered: true }
        }
      } catch (syncError) {
        console.error('Failed to trigger auto-sync:', syncError)
        syncResult = { 
          autoSyncTriggered: false, 
          syncError: syncError instanceof Error ? syncError.message : String(syncError)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Credit note delivered successfully via ${deliveryResult.method}`,
        delivery: deliveryResult,
        autoSync: syncResult,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: deliveryResult.error || 'Delivery failed',
        delivery: deliveryResult,
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Manual delivery error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
