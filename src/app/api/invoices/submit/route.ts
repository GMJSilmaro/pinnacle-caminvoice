import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { logAudit } from '../../../../lib/audit'
import { generateUblInvoice } from '../../../../components/ubl/generateUblInvoice'
import { UBLInvoice, TAX_SCHEMES } from '../../../../types/invoice'

function toISODate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
}

function decimalToNumber(d: any): number {
  if (d === null || d === undefined) return 0
  const n = typeof d === 'string' ? parseFloat(d) : Number(d)
  return Number.isFinite(n) ? n : 0
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 })
    }

    // Load invoice with relations
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: true,
        customer: true,
        lineItems: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Validate required data
    if (!invoice.tenant) {
      return NextResponse.json({ error: 'Invoice tenant not found' }, { status: 400 })
    }
    if (!invoice.customer) {
      return NextResponse.json({ error: 'Invoice customer not found' }, { status: 400 })
    }
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      return NextResponse.json({ error: 'Invoice has no line items' }, { status: 400 })
    }

    // Build UBL data structure
    const supplier = invoice.tenant
    const customer = invoice.customer

    const supplierParty: UBLInvoice['accountingSupplierParty'] = {
      party: {
        endpointId: supplier.camInvoiceEndpointId || '',
        partyName: supplier.businessName,
        postalAddress: {
          streetName: supplier.address,
          cityName: supplier.city,
          countryIdentificationCode: 'KH',
        },
        partyTaxScheme: {
          companyId: supplier.taxId,
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: supplier.businessName,
          companyId: supplier.registrationNumber || supplier.taxId,
        },
        contact: {
          telephone: supplier.phone || undefined,
          electronicMail: supplier.email || undefined,
        },
      },
    }

    const customerParty: UBLInvoice['accountingCustomerParty'] = {
      party: {
        endpointId: customer.camInvoiceEndpointId || '',
        partyName: customer.name,
        postalAddress: {
          streetName: customer.address,
          cityName: customer.city,
          countryIdentificationCode: customer.country || 'KH',
        },
        partyTaxScheme: {
          companyId: customer.taxId || customer.registrationNumber || 'UNKNOWN',
          taxScheme: TAX_SCHEMES['VAT'],
        },
        partyLegalEntity: {
          registrationName: customer.businessName || customer.name,
          companyId: customer.registrationNumber || customer.taxId || 'UNKNOWN',
        },
        contact: {
          telephone: customer.phone || undefined,
          electronicMail: customer.email || undefined,
        },
      },
    }

    const lineItems = invoice.lineItems.map((li, idx) => ({
      id: String(idx + 1),
      invoicedQuantity: decimalToNumber(li.quantity),
      unitCode: 'none',
      lineExtensionAmount: decimalToNumber(li.lineTotal),
      taxTotal: {
        taxAmount: decimalToNumber(li.taxAmount),
        taxSubtotals: [{
          taxableAmount: decimalToNumber(li.lineTotal) - decimalToNumber(li.taxAmount),
          taxAmount: decimalToNumber(li.taxAmount),
          taxCategory: {
            id: 'S',
            percent: Math.round(decimalToNumber(li.taxRate) * 10000) / 100, // e.g., 0.1 -> 10
            taxScheme: TAX_SCHEMES['VAT']
          }
        }]
      },
      item: { name: li.description, description: li.description },
      price: { priceAmount: decimalToNumber(li.unitPrice) },
    }))

    const ublData: UBLInvoice = {
      id: invoice.invoiceNumber,
      issueDate: toISODate(invoice.issueDate),
      dueDate: invoice.dueDate ? toISODate(invoice.dueDate) : undefined,
      invoiceTypeCode: '388',
      documentCurrencyCode: invoice.currency,
      accountingSupplierParty: supplierParty,
      accountingCustomerParty: customerParty,
      taxTotal: {
        taxAmount: decimalToNumber(invoice.taxAmount),
        taxSubtotals: [{
          taxableAmount: decimalToNumber(invoice.subtotal),
          taxAmount: decimalToNumber(invoice.taxAmount),
          taxCategory: {
            id: 'S',
            percent: supplier.taxRate ?? 10,
            taxScheme: TAX_SCHEMES['VAT']
          }
        }]
      },
      legalMonetaryTotal: {
        lineExtensionAmount: decimalToNumber(invoice.subtotal),
        taxExclusiveAmount: decimalToNumber(invoice.subtotal),
        taxInclusiveAmount: decimalToNumber(invoice.totalAmount),
        payableAmount: decimalToNumber(invoice.totalAmount),
      },
      invoiceLines: lineItems,
    }

    const xml = generateUblInvoice(ublData)
    if (!xml || xml.trim().length === 0) {
      return NextResponse.json({ error: 'Failed to generate UBL XML' }, { status: 500 })
    }
    const xmlB64 = Buffer.from(xml, 'utf8').toString('base64')

    // Get provider configuration (access token + base url)
    let provider = await prisma.provider.findFirst({})
    if (!provider) {
      // For development, create a basic provider configuration
      if (process.env.NODE_ENV === 'development') {
        provider = await prisma.provider.create({
          data: {
            name: 'Development CamInvoice Provider',
            clientId: 'dev-client-id',
            clientSecret: 'dev-client-secret',
            baseUrl: 'https://api.caminvoice.gov.kh',
            accessToken: 'dev-access-token',
            isConfigured: true,
            isActive: true,
          },
        })
      } else {
        return NextResponse.json({ error: 'No provider configuration found. Please configure the CamInvoice provider first.' }, { status: 500 })
      }
    }
    if (!provider.accessToken) {
      return NextResponse.json({ error: 'Provider access token missing. Please authenticate with CamInvoice.' }, { status: 500 })
    }
    if (!provider.baseUrl) {
      return NextResponse.json({ error: 'Provider base URL missing. Please configure the CamInvoice API URL.' }, { status: 500 })
    }
    if (provider.tokenExpiresAt && provider.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Access token expired. Please re-authenticate with CamInvoice.' }, { status: 401 })
    }

    // Submit to CamInvoice (or simulate in development)
    let data: any
    let firstValid: any

    if (process.env.NODE_ENV === 'development') {
      // Simulate successful submission for development
      data = {
        valid_documents: [
          {
            document_id: `dev-uuid-${Date.now()}`,
            verification_link: `https://verify.caminvoice.gov.kh/dev-${Date.now()}`,
            status: 'SUBMITTED'
          }
        ]
      }
      firstValid = data.valid_documents[0]
    } else {
      // Real API call for production
      const submitUrl = `${provider.baseUrl.replace(/\/$/, '')}/api/v1/document`
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: [
            { document_type: 'INVOICE', document: xmlB64 }
          ]
        })
      })

      data = await res.json().catch(() => ({}))
      if (!res.ok) {
        await logAudit({
          action: 'SUBMIT_INVOICE',
          entityType: 'Invoice',
          entityId: invoice.id,
          description: `Submit failed: ${res.status}`,
          metadata: { response: data },
        })
        return NextResponse.json({ error: 'Submit failed', details: data }, { status: res.status })
      }

      firstValid = Array.isArray(data.valid_documents) && data.valid_documents.length > 0
        ? data.valid_documents[0] : null

      if (!firstValid) {
        await logAudit({
          action: 'SUBMIT_INVOICE',
          entityType: 'Invoice',
          entityId: invoice.id,
          description: 'Submit response without valid_documents',
          metadata: data,
        })
        return NextResponse.json({ error: 'No valid documents returned', details: data }, { status: 422 })
      }
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        camInvoiceUuid: firstValid.document_id,
        verificationUrl: firstValid.verification_link,
        camInvoiceStatus: 'SUBMITTED',
        xmlContent: xml,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      select: { id: true, camInvoiceUuid: true, verificationUrl: true, status: true }
    })

    await logAudit({
      action: 'SUBMIT_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: 'Submitted invoice to CamInvoice',
      metadata: { uuid: updated.camInvoiceUuid, verificationUrl: updated.verificationUrl },
    })

    return NextResponse.json({ success: true, invoice: updated })
  } catch (error) {
    console.error('Submit invoice error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

