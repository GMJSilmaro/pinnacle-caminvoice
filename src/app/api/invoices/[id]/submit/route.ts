import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../../lib/tenant-middleware'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { CaminvoiceApi } from '../../../../../lib/caminvoice'
import { buildInvoiceXml } from '../../../../../lib/caminvoice-xml'
import { validateInvoicePayload } from '../../../../../lib/caminvoice-xml-schemas'
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
    // Load invoice with customer + tenant + lines
    const invoice = await prisma.invoice.findFirst({
      where: { id, ...(user.role === 'PROVIDER' ? {} : { tenantId: user.tenantId! }) },
      include: {
        tenant: true,
        customer: true,
        lineItems: true,
      },
    })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // Basic validation
    if (!invoice.invoiceNumber) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 })
    }
    if (!invoice.issueDate) {
      return NextResponse.json({ error: 'Issue date is required' }, { status: 400 })
    }

    // Get provider information first to use the correct endpoint ID
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
      select: { endpointId: true }
    })

    if (!provider?.endpointId) {
      return NextResponse.json({ error: 'Provider endpoint ID not configured' }, { status: 500 })
    }

    // Map DB entities to UBL structure
    const currency = invoice.currency || 'USD'

    // Supplier (Tenant) - Use provider's endpoint ID for authentication
    const supplierParty = {
      party: {
        endpointId: provider.endpointId, // Must match the authenticated provider
        partyName: invoice.tenant.name || 'Unknown Supplier',
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: invoice.tenant.address || 'Unknown Address',
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: invoice.tenant.city || 'Unknown City',
          postalZone: invoice.tenant.postalCode || undefined,
          countryIdentificationCode: invoice.tenant.country?.toUpperCase() === 'KH' || invoice.tenant.country?.toUpperCase() === 'CAMBODIA' || !invoice.tenant.country ? 'KH' : invoice.tenant.country.slice(0, 2).toUpperCase(),
        },
        partyTaxScheme: {
          companyId: invoice.tenant.camInvoiceMocId || invoice.tenant.taxId || 'UNKNOWN',
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: invoice.tenant.name || 'Unknown Supplier',
          companyId: invoice.tenant.camInvoiceMocId || invoice.tenant.taxId || 'UNKNOWN',
        },
        contact: undefined,
      },
    }

    // Customer Party
    const customerParty = {
      party: {
        endpointId: invoice.customer.camInvoiceEndpointId || invoice.customer.taxId || 'UNKNOWN',
        partyName: invoice.customer.name || 'Unknown Customer',
        postalAddress: {
          floor: undefined,
          room: undefined,
          streetName: invoice.customer.address || 'Unknown Address',
          additionalStreetName: undefined,
          buildingName: undefined,
          cityName: invoice.customer.city || 'Unknown City',
          postalZone: invoice.customer.postalCode || undefined,
          countryIdentificationCode: invoice.customer.country?.toUpperCase() === 'KH' || invoice.customer.country?.toUpperCase() === 'CAMBODIA' || !invoice.customer.country ? 'KH' : invoice.customer.country.slice(0, 2).toUpperCase(),
        },
        partyTaxScheme: {
          companyId: invoice.customer.taxId || invoice.customer.camInvoiceEndpointId || 'UNKNOWN',
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: invoice.customer.businessName || invoice.customer.name || 'Unknown Customer',
          companyId: invoice.customer.registrationNumber || invoice.customer.taxId || invoice.customer.camInvoiceEndpointId || 'UNKNOWN',
        },
        contact: (invoice.customer.email || invoice.customer.phone) ? {
          telephone: invoice.customer.phone || undefined,
          electronicMail: invoice.customer.email || undefined,
        } : undefined,
      },
    }

    // Lines
    const invoiceLines = invoice.lineItems.map((li, idx) => {
      const qty = toFloat(li.quantity)
      const price = toFloat(li.unitPrice)
      const lineTotal = toFloat(li.lineTotal)
      const taxAmount = toFloat(li.taxAmount)
      const taxRatePct = toFloat(li.taxRate) * 100
      
      // Build allowanceCharges array with proper chargeIndicator
      // According to XML spec: chargeIndicator = true for charge, false for allowance
      // See: https://developer.e-invoice.gov.kh/invoice-structure/invoice/allowance-charge
      const allowanceCharges: Array<{ chargeIndicator: boolean; allowanceChargeReason: string; amount: number }> = []
      
      // Check if line item has allowance/charge data
      // Note: Currently allowance/charge data is not stored in DB schema
      // TODO: Add allowance/charge fields to InvoiceLineItem schema or store as JSON metadata
      const liAny = li as any
      
      // Allowance: chargeIndicator = false (discount/reduction)
      if (liAny.allowanceAmount && Number(liAny.allowanceAmount) > 0) {
        allowanceCharges.push({
          chargeIndicator: false, // false = allowance (discount)
          allowanceChargeReason: liAny.allowanceReason || 'Allowance',
          amount: Number(liAny.allowanceAmount)
        })
      }
      
      // Charge: chargeIndicator = true (additional fee)
      if (liAny.chargeAmount && Number(liAny.chargeAmount) > 0) {
        allowanceCharges.push({
          chargeIndicator: true, // true = charge (additional fee)
          allowanceChargeReason: liAny.chargeReason || 'Charge',
          amount: Number(liAny.chargeAmount)
        })
      }
      
      return {
        id: String(idx + 1),
        invoicedQuantity: Math.max(qty, 0.000001), // Ensure minimum quantity
        unitCode: 'none',
        lineExtensionAmount: lineTotal,
        allowanceCharges: allowanceCharges.length > 0 ? allowanceCharges : undefined,
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

    // Ensure we have at least one line item
    if (invoiceLines.length === 0) {
      return NextResponse.json({ error: 'Invoice must have at least one line item' }, { status: 400 })
    }

    // Totals
    const legalMonetaryTotal = {
      lineExtensionAmount: toFloat(invoice.subtotal),
      taxExclusiveAmount: Math.max(toFloat(invoice.totalAmount) - toFloat(invoice.taxAmount), 0),
      taxInclusiveAmount: toFloat(invoice.totalAmount),
      payableAmount: toFloat(invoice.totalAmount),
      allowanceTotalAmount: undefined,
      chargeTotalAmount: undefined,
      prepaidAmount: undefined,
    }

    const taxTotal = {
      taxAmount: toFloat(invoice.taxAmount),
      taxSubtotals: invoiceLines.map((li) => li.taxTotal.taxSubtotals[0]),
    }

    // Build UBL Invoice payload (defaults to 388 unless client passes typeCode)
    const { searchParams } = new URL(request.url)
    const typeCode = (searchParams.get('typeCode') || '388') as '380' | '388'

    const ubl = {
      id: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined,
      invoiceTypeCode: typeCode,
      documentCurrencyCode: currency,
      accountingSupplierParty: supplierParty,
      accountingCustomerParty: customerParty,
      taxTotal,
      legalMonetaryTotal,
      invoiceLines,
    }

    // Validate using Zod
    try {
      validateInvoicePayload(ubl)
    } catch (err: any) {
      console.error('Invoice validation error:', err)
      console.error('UBL payload:', JSON.stringify(ubl, null, 2))
      return NextResponse.json({
        error: 'Invalid invoice payload',
        details: err?.issues || err?.message,
        payload: ubl // Include payload for debugging
      }, { status: 400 })
    }

    // Generate XML
    const xml = buildInvoiceXml(ubl)

    // Validate XML file size (10MB limit)
    const MAX_XML_SIZE = 10 * 1024 * 1024 // 10MB
    const xmlSize = Buffer.byteLength(xml, 'utf8')
    if (xmlSize > MAX_XML_SIZE) {
      return NextResponse.json(
        { 
          error: 'XML_FILE_TOO_LARGE', 
          message: `Generated XML file size (${(xmlSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of 10MB. Please reduce the number of line items or invoice complexity.`,
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
      documents: [{ document_type: 'INVOICE', document: xmlBase64 }]
    }), 'utf8')
    
    // CamInvoice API has a request size limit of 10MB
    const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024 // 10MB
    if (estimatedPayloadSize > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { 
          error: 'PAYLOAD_TOO_LARGE', 
          message: `Request payload size (${(estimatedPayloadSize / 1024 / 1024).toFixed(2)}MB) exceeds CamInvoice API limit. This invoice has ${invoice.lineItems.length} line items. Please consider splitting into multiple smaller invoices or reducing the number of line items.`,
          payloadSize: estimatedPayloadSize,
          maxSize: MAX_PAYLOAD_SIZE,
          lineItemCount: invoice.lineItems.length,
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
      submitRes = await CaminvoiceApi.submitInvoice({ accessToken: tokenInfo.accessToken, invoiceXml: xml, baseUrl: tokenInfo.baseUrl })
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
        
        // Determine if it's actually a payload size issue or something else
        const payloadSizeMB = estimatedPayloadSize / 1024 / 1024
        const isPayloadWithinLimit = payloadSizeMB < 10
        
        // If payload is within limit but CamInvoice still returns 413, it might be a line item count limit
        const errorMsg = isPayloadWithinLimit 
          ? `CamInvoice API rejected this invoice. This may be due to the number of line items (${invoice.lineItems.length}) exceeding CamInvoice's limits, or other API constraints.`
          : errorDetails?.message || 'Request payload too large for CamInvoice API'
        
        return NextResponse.json(
          { 
            error: 'PAYLOAD_TOO_LARGE',
            message: errorMsg,
            code: 413,
            details: errorDetails,
            lineItemCount: invoice.lineItems.length,
            xmlSize: xmlSize,
            payloadSize: estimatedPayloadSize,
            suggestion: isPayloadWithinLimit 
              ? `Please reduce the number of line items (currently ${invoice.lineItems.length}) or split this invoice into multiple smaller invoices.`
              : 'Please reduce the number of line items or split this invoice into multiple smaller invoices.'
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
      const errorMessage = failedDocuments[0]?.message || 'Unknown submission error'
      return NextResponse.json({ error: `Submission failed: ${errorMessage}` }, { status: 400 })
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
      console.log('Fixed verification URL:', finalVerificationUrl)
    }

    // Persist XML and CamInvoice identifiers
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        xmlContent: xml,
        camInvoiceUuid: camId,
        camInvoiceStatus: 'VALID', // Initial status when successfully submitted to CamInvoice
        camInvoiceStatusUpdatedAt: new Date(),
        verificationUrl: finalVerificationUrl,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    // Attempt automatic delivery to customer
    let deliveryResult = null
    try {
      deliveryResult = await DeliveryService.deliverDocument({
        documentId: invoice.id,
        documentType: 'invoice',
      })

      console.log('Invoice delivery result:', deliveryResult)
    } catch (deliveryError) {
      console.error('Invoice delivery failed:', deliveryError)
      // Don't fail the submission if delivery fails
    }

    return NextResponse.json({
      success: true,
      camInvoice: submitRes,
      delivery: deliveryResult
    })
  } catch (error: any) {
    console.error('Invoice submit error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

