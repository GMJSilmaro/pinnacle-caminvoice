/**
 * Document Delivery Service
 * 
 * Handles delivery of invoices, credit notes, and debit notes to customers.
 * Attempts CamInvoice delivery first, falls back to email if needed.
 */

import { CaminvoiceApi } from './caminvoice'
import { EmailService, InvoiceEmailParams } from './email-service'
import { ensureProviderAccessToken } from './providerToken'
import { prisma } from './prisma'
import { DeliveryStatus, DeliveryMethod } from '../generated/prisma'

export interface DeliveryParams {
  documentId: string // Invoice/CreditNote/DebitNote ID
  documentType: 'invoice' | 'credit-note' | 'debit-note'
  forceEmail?: boolean // Skip CamInvoice delivery and go straight to email
}

export interface DeliveryResult {
  success: boolean
  method: 'CAMINVOICE' | 'EMAIL' | 'FAILED'
  message?: string
  error?: string
  deliveryId?: string
}

/**
 * Attempt to deliver document to customer
 */
export async function deliverDocument(params: DeliveryParams): Promise<DeliveryResult> {
  const { documentId, documentType, forceEmail = false } = params

  try {
    // Get document details based on type
    const document = await getDocumentDetails(documentId, documentType)
    if (!document) {
      return {
        success: false,
        method: 'FAILED',
        error: 'Document not found',
      }
    }

    // Check if document has been submitted to CamInvoice
    if (!document.camInvoiceUuid) {
      return {
        success: false,
        method: 'FAILED',
        error: 'Document not submitted to CamInvoice yet',
      }
    }

    // Check if customer has email
    if (!document.customer.email) {
      return {
        success: false,
        method: 'FAILED',
        error: 'Customer has no email address for delivery',
      }
    }

    // Try CamInvoice delivery first (if not forced to email)
    if (!forceEmail) {
      const camInvResult = await attemptCamInvoiceDelivery(document.camInvoiceUuid)

      if (camInvResult.success) {
        // Update delivery status in database
        await updateDeliveryStatus(documentId, documentType, {
          status: 'DELIVERED',
          method: 'CAMINVOICE',
          deliveredAt: new Date(),
          deliveryError: null,
        })

        return {
          success: true,
          method: 'CAMINVOICE',
          message: 'Document delivered via CamInvoice',
        }
      }

      // CamInvoice delivery failed, log the error but continue to email fallback
      console.warn('CamInvoice delivery failed, falling back to email:', camInvResult.message)
    }

    // Fallback to email delivery
    const emailResult = await attemptEmailDelivery(document)

    if (emailResult.success) {
      // Update delivery status in database
      await updateDeliveryStatus(documentId, documentType, {
        status: 'DELIVERED',
        method: 'EMAIL',
        deliveredAt: new Date(),
        deliveryError: null,
      })

      return {
        success: true,
        method: 'EMAIL',
        message: 'Document delivered via email',
        deliveryId: 'messageId' in emailResult ? emailResult.messageId : undefined,
      }
    }

    // Both delivery methods failed
    await updateDeliveryStatus(documentId, documentType, {
      status: 'FAILED',
      method: null,
      deliveredAt: null,
      deliveryError: emailResult.error || 'All delivery methods failed',
    })

    return {
      success: false,
      method: 'FAILED',
      error: emailResult.error || 'All delivery methods failed',
    }
  } catch (error: any) {
    console.error('Delivery service error:', error)

    // Update delivery status in database
    await updateDeliveryStatus(documentId, documentType, {
      status: 'FAILED',
      method: null,
      deliveredAt: null,
      deliveryError: error.message || 'Delivery service error',
    })

    return {
      success: false,
      method: 'FAILED',
      error: error.message || 'Delivery service error',
    }
  }
}

/**
 * Attempt CamInvoice delivery using the official Send Documents API
 */
async function attemptCamInvoiceDelivery(documentUuid: string) {
  try {
    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    const result = await CaminvoiceApi.sendDocuments({
      accessToken: tokenInfo.accessToken,
      documentIds: [documentUuid],
      baseUrl: tokenInfo.baseUrl,
    })

    // Check if the document was successfully sent
    if (result.sent_documents.includes(documentUuid)) {
      return {
        success: true,
        message: 'Document sent successfully via CamInvoice network',
      }
    } else {
      // Check if it failed
      const failedDoc = result.failed_documents.find(doc => doc.document_id === documentUuid)
      return {
        success: false,
        message: failedDoc?.message || 'Document failed to send via CamInvoice',
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'CamInvoice delivery failed',
    }
  }
}

/**
 * Attempt email delivery
 */
async function attemptEmailDelivery(document: any) {
  try {
    // Get PDF buffer for attachment
    let pdfBuffer: Buffer | undefined
    try {
      const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })
      const pdfArrayBuffer = await CaminvoiceApi.downloadDocumentPdf({
        accessToken: tokenInfo.accessToken,
        documentId: document.camInvoiceUuid,
        baseUrl: tokenInfo.baseUrl,
      })
      pdfBuffer = Buffer.from(pdfArrayBuffer)
    } catch (pdfError) {
      console.warn('Could not download PDF for email attachment:', pdfError)
      // Continue without PDF attachment
    }

    const emailParams: InvoiceEmailParams = {
      customerEmail: document.customer.email,
      customerName: document.customer.name,
      invoiceNumber: document.invoiceNumber || document.creditNoteNumber || document.debitNoteNumber,
      invoiceAmount: new Intl.NumberFormat().format(Number(document.totalAmount)),
      currency: document.currency,
      issueDate: document.issueDate.toISOString().slice(0, 10),
      pdfBuffer,
      verificationUrl: document.verificationUrl,
      tenantName: document.tenant.name,
    }

    return await EmailService.sendInvoiceEmail(emailParams)
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Email delivery failed',
    }
  }
}

/**
 * Get document details with customer and tenant info
 */
async function getDocumentDetails(documentId: string, documentType: string) {
  const include = {
    customer: true,
    tenant: true,
  }

  switch (documentType) {
    case 'invoice':
      return await prisma.invoice.findUnique({
        where: { id: documentId },
        include,
      })
    case 'credit-note':
      return await prisma.creditNote.findUnique({
        where: { id: documentId },
        include,
      })
    case 'debit-note':
      return await prisma.debitNote.findUnique({
        where: { id: documentId },
        include,
      })
    default:
      return null
  }
}

/**
 * Update delivery status in database
 */
async function updateDeliveryStatus(
  documentId: string,
  documentType: string,
  status: {
    status: DeliveryStatus
    method: DeliveryMethod | null
    deliveredAt: Date | null
    deliveryError: string | null
  }
) {
  const updateData = {
    deliveryStatus: status.status,
    deliveryMethod: status.method,
    deliveredAt: status.deliveredAt,
    deliveryError: status.deliveryError,
  }

  switch (documentType) {
    case 'invoice':
      return await prisma.invoice.update({
        where: { id: documentId },
        data: updateData,
      })
    case 'credit-note':
      return await prisma.creditNote.update({
        where: { id: documentId },
        data: updateData,
      })
    case 'debit-note':
      return await prisma.debitNote.update({
        where: { id: documentId },
        data: updateData,
      })
  }
}

export const DeliveryService = {
  deliverDocument,
}
