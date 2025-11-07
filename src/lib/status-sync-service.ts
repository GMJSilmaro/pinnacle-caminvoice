/**
 * Status Synchronization Service
 * 
 * Handles synchronization of document status from CamInvoice API to our database.
 * Implements polling mechanism to check for status changes.
 */

import { CaminvoiceApi } from './caminvoice'
import { ensureProviderAccessToken } from './providerToken'
import { prisma } from './prisma'

export interface StatusSyncParams {
  documentId: string // Our internal document ID
  documentType: 'invoice' | 'credit-note' | 'debit-note'
  camInvoiceUuid: string // CamInvoice document UUID
}

export interface StatusSyncResult {
  success: boolean
  statusChanged: boolean
  oldStatus?: string
  newStatus?: string
  error?: string
}

/**
 * Sync status for a single document
 */
export async function syncDocumentStatus(params: StatusSyncParams): Promise<StatusSyncResult> {
  const { documentId, documentType, camInvoiceUuid } = params

  try {
    // Get current status from our database
    const currentDocument = await getCurrentDocumentStatus(documentId, documentType)
    if (!currentDocument) {
      return {
        success: false,
        statusChanged: false,
        error: 'Document not found in database',
      }
    }

    const oldStatus = currentDocument.camInvoiceStatus

    // Skip if document is already in a final state
    const finalStates = ['ACCEPTED', 'REJECTED', 'PAID']
    if (oldStatus && finalStates.includes(oldStatus)) {
      return {
        success: true,
        statusChanged: false,
        oldStatus,
        newStatus: oldStatus ? oldStatus.toString() : undefined,
      }
    }

    // Get latest status from CamInvoice API with retry logic
    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    let camInvoiceDetail
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      try {
        camInvoiceDetail = await CaminvoiceApi.getDocumentDetail({
          accessToken: tokenInfo.accessToken,
          documentId: camInvoiceUuid,
          baseUrl: tokenInfo.baseUrl,
        })
        break // Success, exit retry loop
      } catch (error: any) {
        retryCount++
        console.error(`Attempt ${retryCount} failed for document ${camInvoiceUuid}:`, error.message)

        if (retryCount > maxRetries) {
          // If all retries failed, check if it's a 404 (document not found)
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.warn(`Document ${camInvoiceUuid} not found in CamInvoice, skipping sync`)
            return {
              success: true,
              statusChanged: false,
              oldStatus: oldStatus ? oldStatus.toString() : undefined,
              newStatus: undefined,
              error: 'Document not found in CamInvoice',
            }
          }
        }
      }
    }

    const newStatus = camInvoiceDetail?.status || undefined

    // Check if status has changed
    if (oldStatus === newStatus || !newStatus) {
      return {
        success: true,
        statusChanged: false,
        oldStatus: oldStatus ? oldStatus.toString() : undefined,
        newStatus: newStatus ? newStatus.toString() : undefined,
      }
    }

    // Update status in database
    await updateDocumentStatus(documentId, documentType, {
      camInvoiceStatus: newStatus ? newStatus.toString() : undefined,
      camInvoiceStatusUpdatedAt: new Date(),
      // Update delivery status based on CamInvoice status
      deliveryStatus: newStatus ? getDeliveryStatusFromCamInvoiceStatus(newStatus) : undefined,
    })

    console.log(`Status updated for ${documentType} ${documentId}: ${oldStatus} → ${newStatus}`)

    return {
      success: true,
      statusChanged: true,
      oldStatus: oldStatus ? oldStatus.toString() : undefined,
      newStatus: newStatus ? newStatus.toString() : undefined,
    }
  } catch (error: any) {
    console.error('Status sync failed:', error)
    return {
      success: false,
      statusChanged: false,
      error: error.message || 'Status sync failed',
    }
  }
}

/**
 * Sync status using official CamInvoice polling endpoint
 */
export async function syncAllDocumentStatuses(): Promise<{
  totalProcessed: number
  successCount: number
  changedCount: number
  errors: string[]
}> {
  const results = {
    totalProcessed: 0,
    successCount: 0,
    changedCount: 0,
    errors: [] as string[],
  }

  try {
    // Get provider access token
    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    // Get last sync time from database or use a reasonable default
    const lastSyncTime = await getLastSyncTime()

    console.log(`Polling CamInvoice for updates since: ${lastSyncTime}`)

    // Use official polling endpoint
    const pollResult = await CaminvoiceApi.pollDocuments({
      accessToken: tokenInfo.accessToken,
      lastSyncedAt: lastSyncTime,
      baseUrl: tokenInfo.baseUrl,
    })

    console.log(`Polling returned ${pollResult.documents.length} document updates`)

    for (const docEvent of pollResult.documents) {
      results.totalProcessed++

      try {
        // Find the document in our database
        const document = await findDocumentByUuid(docEvent.document_id)

        if (!document) {
          console.warn(`Document ${docEvent.document_id} not found in our database`)
          results.errors.push(`Document ${docEvent.document_id} not found locally`)
          continue
        }

        // Get detailed status from individual document endpoint
        const docDetail = await CaminvoiceApi.getDocumentDetail({
          accessToken: tokenInfo.accessToken,
          documentId: docEvent.document_id,
          baseUrl: tokenInfo.baseUrl,
        })

        const newStatus = docDetail.status
        const oldStatus = document.camInvoiceStatus

        if (oldStatus !== newStatus) {
          // Update status in database
          await updateDocumentStatus(document.id, document.type, {
            camInvoiceStatus: newStatus as any,
            camInvoiceStatusUpdatedAt: new Date(),
            deliveryStatus: getDeliveryStatusFromCamInvoiceStatus(newStatus),
          })

          results.changedCount++
          console.log(`Status updated for ${document.type} ${document.id}: ${oldStatus} → ${newStatus}`)
        }

        results.successCount++
      } catch (error: any) {
        console.error(`Failed to process document ${docEvent.document_id}:`, error.message)
        results.errors.push(`${docEvent.document_id}: ${error.message}`)
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Update last sync time
    await updateLastSyncTime()

  } catch (error: any) {
    console.error('Polling sync failed:', error.message)
    results.errors.push(`Polling failed: ${error.message}`)
  }

  return results
}

/**
 * Get current document status from database
 */
async function getCurrentDocumentStatus(documentId: string, documentType: string) {
  const select = {
    id: true,
    camInvoiceStatus: true,
    camInvoiceStatusUpdatedAt: true,
    deliveryStatus: true,
  }

  switch (documentType) {
    case 'invoice':
      return await prisma.invoice.findUnique({ where: { id: documentId }, select })
    case 'credit-note':
      return await prisma.creditNote.findUnique({ where: { id: documentId }, select })
    case 'debit-note':
      return await prisma.debitNote.findUnique({ where: { id: documentId }, select })
    default:
      return null
  }
}

/**
 * Update document status in database
 */
async function updateDocumentStatus(documentId: string, documentType: string, data: any) {
  switch (documentType) {
    case 'invoice':
      return await prisma.invoice.update({ where: { id: documentId }, data })
    case 'credit-note':
      return await prisma.creditNote.update({ where: { id: documentId }, data })
    case 'debit-note':
      return await prisma.debitNote.update({ where: { id: documentId }, data })
    default:
      throw new Error(`Unknown document type: ${documentType}`)
  }
}

/**
 * Get all submitted documents that need status sync
 */
async function getSubmittedDocuments() {
  const documents: Array<{ id: string; type: string; camInvoiceUuid: string }> = []

  // Get invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      camInvoiceUuid: { not: null },
      status: { not: 'DRAFT' },
    },
    select: { id: true, camInvoiceUuid: true },
  })
  documents.push(...invoices.map(inv => ({ id: inv.id, type: 'invoice', camInvoiceUuid: inv.camInvoiceUuid! })))

  // Get credit notes
  const creditNotes = await prisma.creditNote.findMany({
    where: {
      camInvoiceUuid: { not: null },
      status: { not: 'DRAFT' },
    },
    select: { id: true, camInvoiceUuid: true },
  })
  documents.push(...creditNotes.map(cn => ({ id: cn.id, type: 'credit-note', camInvoiceUuid: cn.camInvoiceUuid! })))

  // Get debit notes
  const debitNotes = await prisma.debitNote.findMany({
    where: {
      camInvoiceUuid: { not: null },
      status: { not: 'DRAFT' },
    },
    select: { id: true, camInvoiceUuid: true },
  })
  documents.push(...debitNotes.map(dn => ({ id: dn.id, type: 'debit-note', camInvoiceUuid: dn.camInvoiceUuid! })))

  return documents
}

/**
 * Find document by CamInvoice UUID
 */
async function findDocumentByUuid(camInvoiceUuid: string) {
  // Try to find in invoices first
  const invoice = await prisma.invoice.findFirst({
    where: { camInvoiceUuid },
    select: { id: true, camInvoiceStatus: true }
  })
  if (invoice) return { ...invoice, type: 'invoice' }

  // Try credit notes
  const creditNote = await prisma.creditNote.findFirst({
    where: { camInvoiceUuid },
    select: { id: true, camInvoiceStatus: true }
  })
  if (creditNote) return { ...creditNote, type: 'creditNote' }

  // Try debit notes
  const debitNote = await prisma.debitNote.findFirst({
    where: { camInvoiceUuid },
    select: { id: true, camInvoiceStatus: true }
  })
  if (debitNote) return { ...debitNote, type: 'debitNote' }

  return null
}

/**
 * Get last sync time from database or default
 */
async function getLastSyncTime(): Promise<string> {
  // Try to get from a sync tracking table or use a reasonable default
  // For now, use 24 hours ago as default
  const defaultTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return defaultTime.toISOString()
}

/**
 * Update last sync time in database
 */
async function updateLastSyncTime(): Promise<void> {
  // TODO: Store in a sync tracking table
  // For now, this is a no-op
  console.log('Last sync time updated:', new Date().toISOString())
}

/**
 * Map CamInvoice status to our delivery status
 */
function getDeliveryStatusFromCamInvoiceStatus(camInvoiceStatus: string): string {
  switch (camInvoiceStatus) {
    case 'DELIVERED':
      return 'DELIVERED'
    case 'VALID':
    case 'ACKNOWLEDGED':
    case 'IN_PROCESS':
    case 'UNDER_QUERY':
    case 'CONDITIONALLY_ACCEPTED':
    case 'ACCEPTED':
    case 'REJECTED':
    case 'PAID':
      return 'PENDING' // These statuses don't necessarily mean delivered to customer
    default:
      return 'PENDING'
  }
}

export const StatusSyncService = {
  syncDocumentStatus,
  syncAllDocumentStatuses,
}
