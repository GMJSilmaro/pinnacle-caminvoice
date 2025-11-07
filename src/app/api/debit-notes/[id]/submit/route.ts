import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../../lib/tenant-middleware'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { CaminvoiceApi } from '../../../../../lib/caminvoice'
import { buildDebitNoteXml } from '../../../../../lib/caminvoice-xml'
import { validateDebitNotePayload } from '../../../../../lib/caminvoice-xml-schemas'
import { TAX_SCHEMES } from '../../../../../types/invoice'
import { DeliveryService } from '../../../../../lib/delivery-service'

function toFloat(n: any, d = 0) { const f = Number(n); return Number.isFinite(f) ? f : d }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const { id } = await params
    // Load debit note with tenant + customer + line items; fetch original invoice number if present
    const debit = await prisma.debitNote.findFirst({
      where: { id, ...(user.role === 'PROVIDER' ? {} : { tenantId: user.tenantId! }) },
      include: { tenant: true, customer: true, },
    })
    if (!debit) return NextResponse.json({ error: 'Debit note not found' }, { status: 404 })

    const lineItems = await prisma.debitNoteLineItem.findMany({ where: { debitNoteId: debit.id } })
    if (!lineItems.length) return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })

    // Debit Notes MUST reference an original invoice per CamInvoice requirements
    if (!debit.originalInvoiceId) {
      return NextResponse.json({ 
        error: 'Debit note must reference an original invoice. Please link this debit note to an invoice before submitting.',
        details: 'A Debit Note must contain a reference to the original Invoice ID per CamInvoice requirements.'
      }, { status: 400 })
    }

    // Fetch the original invoice
    const original = await prisma.invoice.findUnique({ 
      where: { id: debit.originalInvoiceId }, 
      select: { invoiceNumber: true, camInvoiceUuid: true, tenantId: true } 
    })

    if (!original) {
      return NextResponse.json({ 
        error: 'Original invoice not found',
        details: `The referenced invoice (ID: ${debit.originalInvoiceId}) does not exist or you do not have access to it.`
      }, { status: 404 })
    }

    // Verify access to the original invoice
    if (user.role !== 'PROVIDER' && original.tenantId !== user.tenantId) {
      return NextResponse.json({ 
        error: 'Access denied to original invoice',
        details: 'You do not have access to the referenced invoice.'
      }, { status: 403 })
    }

    const originalInvoiceNumber = original.invoiceNumber
    const originalInvoiceUuid = original.camInvoiceUuid || undefined

    if (!originalInvoiceNumber) {
      return NextResponse.json({ 
        error: 'Original invoice missing invoice number',
        details: 'The referenced invoice does not have an invoice number.'
      }, { status: 400 })
    }

    // Get provider information to use the correct endpoint ID
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
      select: { endpointId: true }
    })

    if (!provider?.endpointId) {
      return NextResponse.json({ error: 'Provider endpoint ID not configured' }, { status: 500 })
    }

    // Supplier (Tenant) - Use provider's endpoint ID for authentication
    const supplierParty = {
      party: {
        endpointId: provider.endpointId, // Must match the authenticated provider
        partyName: debit.tenant.name || 'Unknown Supplier',
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: debit.tenant.address || 'Unknown Address',
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: debit.tenant.city || 'Unknown City',
          postalZone: debit.tenant.postalCode || undefined,
          countryIdentificationCode: debit.tenant.country?.toUpperCase() === 'KH' || debit.tenant.country?.toUpperCase() === 'CAMBODIA' || !debit.tenant.country ? 'KH' : debit.tenant.country.slice(0, 2).toUpperCase(),
        },
        partyTaxScheme: {
          companyId: debit.tenant.camInvoiceMocId || debit.tenant.taxId || 'UNKNOWN',
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: debit.tenant.name || 'Unknown Supplier',
          companyId: debit.tenant.camInvoiceMocId || debit.tenant.taxId || 'UNKNOWN',
        },
        contact: undefined,
      },
    }

    // Customer Party
    const customerParty = {
      party: {
        endpointId: debit.customer.camInvoiceEndpointId || debit.customer.taxId || 'UNKNOWN',
        partyName: debit.customer.name || 'Unknown Customer',
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: debit.customer.address || 'Unknown Address',
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: debit.customer.city || 'Unknown City',
          postalZone: debit.customer.postalCode || undefined,
          countryIdentificationCode: debit.customer.country?.toUpperCase() === 'KH' || debit.customer.country?.toUpperCase() === 'CAMBODIA' || !debit.customer.country ? 'KH' : debit.customer.country.slice(0, 2).toUpperCase(),
        },
        partyTaxScheme: {
          companyId: debit.customer.taxId || debit.customer.camInvoiceEndpointId || 'UNKNOWN',
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: debit.customer.businessName || debit.customer.name || 'Unknown Customer',
          companyId: debit.customer.registrationNumber || debit.customer.taxId || debit.customer.camInvoiceEndpointId || 'UNKNOWN',
        },
        contact: (debit.customer.email || debit.customer.phone) ? {
          telephone: debit.customer.phone || undefined,
          electronicMail: debit.customer.email || undefined,
        } : undefined,
      },
    }

    // Lines -> DebitNoteLine
    const debitNoteLines = lineItems.map((li, idx) => {
      const qty = toFloat(li.quantity)
      const price = toFloat(li.unitPrice)
      const lineTotal = toFloat(li.lineTotal)
      const taxAmount = toFloat(li.taxAmount)
      const taxRatePct = toFloat(li.taxRate) * 100
      return {
        id: String(idx + 1),
        invoicedQuantity: Math.max(qty, 0.000001), // Ensure minimum quantity
        unitCode: 'none',
        lineExtensionAmount: lineTotal,
        taxTotal: {
          taxAmount: taxAmount,
          taxSubtotals: [{
            taxableAmount: Math.max(lineTotal - taxAmount, 0),
            taxAmount: taxAmount,
            taxCategory: { id: (taxRatePct > 0 ? 'S' : 'Z') as 'S' | 'Z', percent: taxRatePct, taxScheme: TAX_SCHEMES['VAT'] },
          }],
        },
        item: { name: li.description, description: li.description },
        price: { priceAmount: price },
      }
    })

    const currency = debit.currency
    const legalMonetaryTotal = {
      lineExtensionAmount: toFloat(debit.subtotal),
      taxExclusiveAmount: Math.max(toFloat(debit.totalAmount) - toFloat(debit.taxAmount), 0),
      taxInclusiveAmount: toFloat(debit.totalAmount),
      payableAmount: toFloat(debit.totalAmount),
    }
    const taxTotal = {
      taxAmount: toFloat(debit.taxAmount),
      taxSubtotals: debitNoteLines.map((li) => li.taxTotal.taxSubtotals[0]),
    }

    const payload = {
      id: debit.debitNoteNumber,
      issueDate: debit.issueDate.toISOString().slice(0, 10),
      invoiceTypeCode: '383' as const,
      documentCurrencyCode: currency,
      accountingSupplierParty: supplierParty,
      accountingCustomerParty: customerParty,
      note: debit.notes || debit.reason || undefined,
      billingReference: { invoiceId: originalInvoiceNumber, invoiceUuid: originalInvoiceUuid },
      invoiceDocumentReferences: undefined,
      taxTotal,
      legalMonetaryTotal,
      debitNoteLines,
    }

    // Validate using Zod
    try {
      validateDebitNotePayload(payload)
    } catch (err: any) {
      console.error('Debit note validation error:', err)
      console.error('UBL payload:', JSON.stringify(payload, null, 2))
      return NextResponse.json({
        error: 'Invalid debit note payload',
        details: err?.issues || err?.message,
        payload: payload // Include payload for debugging
      }, { status: 400 })
    }

    // Generate XML
    const xml = buildDebitNoteXml(payload as any)

    // Validate XML file size (10MB limit)
    const MAX_XML_SIZE = 10 * 1024 * 1024 // 10MB
    const xmlSize = Buffer.byteLength(xml, 'utf8')
    if (xmlSize > MAX_XML_SIZE) {
      return NextResponse.json(
        { 
          error: 'XML_FILE_TOO_LARGE', 
          message: `Generated XML file size (${(xmlSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of 10MB. Please reduce the number of line items or document complexity.`,
          xmlSize: xmlSize,
          maxSize: MAX_XML_SIZE
        }, 
        { status: 400 }
      )
    }

    // Validate payload size for CamInvoice API (estimate base64-encoded JSON payload)
    // Base64 encoding increases size by ~33%, and JSON wrapper adds overhead
    const xmlBase64 = Buffer.from(xml, 'utf-8').toString('base64')
    const estimatedPayloadSize = Buffer.byteLength(JSON.stringify({
      documents: [{ document_type: 'DEBIT_NOTE', document: xmlBase64 }]
    }), 'utf8')
    
    // CamInvoice API has a request size limit of 10MB
    const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024 // 10MB
    if (estimatedPayloadSize > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { 
          error: 'PAYLOAD_TOO_LARGE', 
          message: `Request payload size (${(estimatedPayloadSize / 1024 / 1024).toFixed(2)}MB) exceeds CamInvoice API limit. This debit note has ${lineItems.length} line items. Please consider splitting into multiple smaller debit notes or reducing the number of line items.`,
          payloadSize: estimatedPayloadSize,
          maxSize: MAX_PAYLOAD_SIZE,
          lineItemCount: lineItems.length,
          xmlSize: xmlSize
        }, 
        { status: 400 }
      )
    }

    // Ensure provider access token
    const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

    // Submit to CamInvoice with improved error handling
    let submitRes
    try {
      submitRes = await CaminvoiceApi.submitInvoice({ 
        accessToken: tokenInfo.accessToken, 
        invoiceXml: xml, 
        baseUrl: tokenInfo.baseUrl,
        documentType: 'DEBIT_NOTE'
      })
    } catch (apiError: any) {
      // Parse CamInvoice API error response
      const errorMessage = apiError?.message || 'Unknown error'
      
      // Check if it's a 413 error (request entity too large)
      if (errorMessage.includes('413') || errorMessage.includes('request entity too large') || errorMessage.includes('code":413')) {
        // Try to extract error details from the error message
        let errorDetails: any = {}
        try {
          // The error message might contain JSON: "CamInvoice API error 413 ... - {...}"
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            errorDetails = JSON.parse(jsonMatch[0])
          }
        } catch {
          // If parsing fails, use the raw message
        }
        
        return NextResponse.json(
          { 
            error: 'PAYLOAD_TOO_LARGE',
            message: errorDetails?.message || 'Request payload too large for CamInvoice API',
            code: 413,
            details: errorDetails,
            lineItemCount: lineItems.length,
            xmlSize: xmlSize,
            payloadSize: estimatedPayloadSize,
            suggestion: 'Please reduce the number of line items or split this debit note into multiple smaller debit notes.'
          }, 
          { status: 413 }
        )
      }
      
      // For other errors, re-throw to be caught by outer catch block
      throw apiError
    }

    // Parse the new API response format
    const validDocuments = submitRes?.valid_documents || []
    const firstValid = validDocuments[0]

    if (!firstValid) {
      const failedDocuments = submitRes?.failed_documents || []
      const failedDoc = failedDocuments[0]
      // Handle message as string or array
      let errorMessage = 'Unknown submission error'
      if (failedDoc?.message) {
        if (Array.isArray(failedDoc.message)) {
          errorMessage = failedDoc.message.join('; ')
        } else {
          errorMessage = String(failedDoc.message)
        }
      }
      console.error('Debit note submission failed:', JSON.stringify(submitRes, null, 2))
      console.error('Failed document details:', JSON.stringify(failedDoc, null, 2))
      return NextResponse.json({ 
        error: `Submission failed: ${errorMessage}`,
        details: failedDoc 
      }, { status: 400 })
    }

    const camId = firstValid.document_id
    const verificationUrl = firstValid.verification_link

    // Debug: Log the verification URL returned by CamInvoice
    console.log('CamInvoice API Response:', JSON.stringify(submitRes, null, 2))
    console.log('Verification URL from API:', verificationUrl)

    // Fix verification URL if it's localhost (sandbox environment issue)
    let finalVerificationUrl = verificationUrl
    if (verificationUrl && verificationUrl.includes('localhost')) {
      // Replace localhost with the actual CamInvoice domain
      const baseUrl = tokenInfo.baseUrl || 'https://sandbox.e-invoice.gov.kh'
      finalVerificationUrl = verificationUrl.replace(/https?:\/\/localhost:\d+/, baseUrl)
      console.log('Fixed debit note verification URL:', finalVerificationUrl)
    }

    await prisma.debitNote.update({
      where: { id: debit.id },
      data: {
        xmlContent: xml,
        camInvoiceUuid: camId,
        camInvoiceStatus: 'VALID',
        camInvoiceStatusUpdatedAt: new Date(),
        verificationUrl: finalVerificationUrl,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    })

    // Attempt automatic delivery to customer
    let deliveryResult = null
    try {
      deliveryResult = await DeliveryService.deliverDocument({
        documentId: debit.id,
        documentType: 'debit-note',
      })

      console.log('Debit note delivery result:', deliveryResult)
    } catch (deliveryError) {
      console.error('Debit note delivery failed:', deliveryError)
      // Don't fail the submission if delivery fails
    }

    return NextResponse.json({
      success: true,
      camInvoice: submitRes,
      delivery: deliveryResult
    })
  } catch (error: any) {
    console.error('Debit note submit error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

