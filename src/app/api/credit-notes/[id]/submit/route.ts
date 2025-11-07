import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../../lib/tenant-middleware'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { CaminvoiceApi } from '../../../../../lib/caminvoice'
import { buildCreditNoteXml } from '../../../../../lib/caminvoice-xml'
import { validateCreditNotePayload } from '../../../../../lib/caminvoice-xml-schemas'
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
    // Load credit note with tenant + customer + line items; fetch original invoice number if present
    const credit = await prisma.creditNote.findFirst({
      where: { id, ...(user.role === 'PROVIDER' ? {} : { tenantId: user.tenantId! }) },
      include: { tenant: true, customer: true, },
    })
    if (!credit) return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })

    const lineItems = await prisma.creditNoteLineItem.findMany({ where: { creditNoteId: credit.id } })
    if (!lineItems.length) return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })

    // Credit Notes REQUIRE a reference to the original Invoice ID
    let originalInvoiceNumber: string | undefined
    let originalInvoiceUuid: string | undefined
    if (credit.originalInvoiceId) {
      const original = await prisma.invoice.findUnique({ where: { id: credit.originalInvoiceId }, select: { invoiceNumber: true, camInvoiceUuid: true, tenantId: true } })
      if (original && (user.role === 'PROVIDER' || original.tenantId === user.tenantId)) {
        originalInvoiceNumber = original.invoiceNumber
        originalInvoiceUuid = original.camInvoiceUuid || undefined
      }
    }

    // BillingReference is mandatory for Credit Notes according to CamInvoice validation
    if (!originalInvoiceNumber) {
      return NextResponse.json({ 
        error: 'Credit Note requires a reference to the original Invoice. Please link this credit note to an invoice before submission.',
        details: 'A Credit Note must contain a reference to the original Invoice ID in the BillingReference element.'
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
        endpointId: provider.endpointId?.trim() || 'UNKNOWN', // Must match the authenticated provider
        partyName: (credit.tenant.name?.trim() || 'Unknown Supplier'),
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: (credit.tenant.address?.trim() || 'Unknown Address'),
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: (credit.tenant.city?.trim() || 'Unknown City'),
          postalZone: credit.tenant.postalCode?.trim() || undefined,
          countryIdentificationCode: (() => {
            const country = credit.tenant.country?.toUpperCase() || ''
            if (country === 'KH' || country === 'CAMBODIA' || country.startsWith('KH')) return 'KH'
            return country.slice(0, 2) || 'KH'
          })(),
        },
        partyTaxScheme: {
          companyId: (credit.tenant.camInvoiceMocId?.trim() || credit.tenant.taxId?.trim() || 'UNKNOWN'),
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: (credit.tenant.name?.trim() || 'Unknown Supplier'),
          companyId: (credit.tenant.camInvoiceMocId?.trim() || credit.tenant.taxId?.trim() || 'UNKNOWN'),
        },
        contact: undefined,
      },
    }

    // Customer Party
    const customerParty = {
      party: {
        endpointId: (credit.customer.camInvoiceEndpointId?.trim() || credit.customer.taxId?.trim() || 'UNKNOWN'),
        partyName: (credit.customer.name?.trim() || 'Unknown Customer'),
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: (credit.customer.address?.trim() || 'Unknown Address'),
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: (credit.customer.city?.trim() || 'Unknown City'),
          postalZone: credit.customer.postalCode?.trim() || undefined,
          countryIdentificationCode: (() => {
            const country = credit.customer.country?.toUpperCase() || ''
            if (country === 'KH' || country === 'CAMBODIA' || country.startsWith('KH')) return 'KH'
            return country.slice(0, 2) || 'KH'
          })(),
        },
        partyTaxScheme: {
          companyId: (credit.customer.taxId?.trim() || credit.customer.camInvoiceEndpointId?.trim() || 'UNKNOWN'),
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: (credit.customer.businessName?.trim() || credit.customer.name?.trim() || 'Unknown Customer'),
          companyId: (credit.customer.registrationNumber?.trim() || credit.customer.taxId?.trim() || credit.customer.camInvoiceEndpointId?.trim() || 'UNKNOWN'),
        },
        contact: (credit.customer.email || credit.customer.phone) ? {
          telephone: credit.customer.phone || undefined,
          electronicMail: credit.customer.email || undefined,
        } : undefined,
      },
    }

    // Lines -> CreditNoteLine
    const creditNoteLines = lineItems.map((li, idx) => {
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
        item: { name: li.description || 'Unknown Item', description: li.description || 'Unknown Item' },
        price: { priceAmount: price },
      }
    })

    const currency = credit.currency
    const legalMonetaryTotal = {
      lineExtensionAmount: toFloat(credit.subtotal),
      taxExclusiveAmount: Math.max(toFloat(credit.totalAmount) - toFloat(credit.taxAmount), 0),
      taxInclusiveAmount: toFloat(credit.totalAmount),
      payableAmount: toFloat(credit.totalAmount),
    }
    const taxTotal = {
      taxAmount: toFloat(credit.taxAmount),
      taxSubtotals: creditNoteLines.map((li) => li.taxTotal.taxSubtotals[0]),
    }

    const payload = {
      id: credit.creditNoteNumber,
      issueDate: credit.issueDate.toISOString().slice(0, 10),
      invoiceTypeCode: '381' as const,
      documentCurrencyCode: currency,
      accountingSupplierParty: supplierParty,
      accountingCustomerParty: customerParty,
      note: credit.notes || credit.reason || undefined,
      billingReference: { invoiceId: originalInvoiceNumber, invoiceUuid: originalInvoiceUuid }, // Required for Credit Notes
      invoiceDocumentReferences: undefined,
      taxTotal,
      legalMonetaryTotal,
      creditNoteLines,
    }

    // Validate using Zod
    try {
      validateCreditNotePayload(payload)
    } catch (err: any) {
      console.error('Credit note validation error:', err)
      console.error('UBL payload:', JSON.stringify(payload, null, 2))
      return NextResponse.json({
        error: 'Invalid credit note payload',
        details: err?.issues || err?.message,
        payload: payload // Include payload for debugging
      }, { status: 400 })
    }

    // Generate XML
    const xml = buildCreditNoteXml(payload as any)
    
    // Debug: Log the generated XML (first 2000 chars)
    console.log('Generated Credit Note XML (first 2000 chars):', xml.substring(0, 2000))
    console.log('Generated Credit Note XML length:', xml.length)

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
      documents: [{ document_type: 'CREDIT_NOTE', document: xmlBase64 }]
    }), 'utf8')
    
    // CamInvoice API has a request size limit of 10MB
    const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024 // 10MB
    if (estimatedPayloadSize > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { 
          error: 'PAYLOAD_TOO_LARGE', 
          message: `Request payload size (${(estimatedPayloadSize / 1024 / 1024).toFixed(2)}MB) exceeds CamInvoice API limit. This credit note has ${lineItems.length} line items. Please consider splitting into multiple smaller credit notes or reducing the number of line items.`,
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
        documentType: 'CREDIT_NOTE'
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
            suggestion: 'Please reduce the number of line items or split this credit note into multiple smaller credit notes.'
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
      console.error('Credit note submission failed:', JSON.stringify(submitRes, null, 2))
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
      console.log('Fixed credit note verification URL:', finalVerificationUrl)
    }

    await prisma.creditNote.update({
      where: { id: credit.id },
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
        documentId: credit.id,
        documentType: 'credit-note',
      })

      console.log('Credit note delivery result:', deliveryResult)
    } catch (deliveryError) {
      console.error('Credit note delivery failed:', deliveryError)
      // Don't fail the submission if delivery fails
    }

    return NextResponse.json({
      success: true,
      camInvoice: submitRes,
      delivery: deliveryResult
    })
  } catch (error: any) {
    console.error('Credit note submit error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

