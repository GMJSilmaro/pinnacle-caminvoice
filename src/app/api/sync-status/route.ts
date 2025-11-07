import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../lib/tenant-middleware'
import { StatusSyncService } from '../../../lib/status-sync-service'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json().catch(() => ({}))
    const { documentId, documentType, camInvoiceUuid } = body

    // If specific document provided, sync just that one
    if (documentId && documentType && camInvoiceUuid) {
      const result = await StatusSyncService.syncDocumentStatus({
        documentId,
        documentType,
        camInvoiceUuid,
      })

      return NextResponse.json({
        success: result.success,
        statusChanged: result.statusChanged,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus,
        error: result.error,
      })
    }

    // Otherwise, sync all documents
    const results = await StatusSyncService.syncAllDocumentStatuses()

    return NextResponse.json({
      success: results.errors.length === 0,
      totalProcessed: results.totalProcessed,
      successCount: results.successCount,
      changedCount: results.changedCount,
      errors: results.errors,
    })
  } catch (error: any) {
    console.error('Status sync API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
