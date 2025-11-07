import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { ensureProviderAccessToken } from '../../../../../lib/providerToken'
import { CaminvoiceApi } from '../../../../../lib/caminvoice'

// Minimal PDF generator (no external deps). Fallback when pdf-lib/qrcode are unavailable.
function simplePdf(textLines: string[]): Uint8Array {
  const font = 'BT /F1 12 Tf 50 750 Td 14 TL '
  const content = textLines.map((l, i) => (i === 0 ? `(${l}) Tj` : `T* (${l}) Tj`)).join(' ')
  const stream = `${font}${content}`
  const streamLen = stream.length
  const objects: string[] = []
  let offset = 0
  const xref: number[] = []
  function add(obj: string) { xref.push(offset); objects.push(obj + '\n'); offset += (obj + '\n').length }

  add('%PDF-1.4')
  add('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj')
  add('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj')
  add('3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj')
  add(`4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream endobj`)
  add('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj')
  const xrefStart = offset
  let xrefTable = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n'
  for (const off of xref) xrefTable += (off.toString().padStart(10, '0') + ' 00000 n \n')
  const trailer = `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  const pdfStr = objects.join('') + xrefTable + trailer
  return new TextEncoder().encode(pdfStr)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        camInvoiceUuid: true,
        customer: { select: { name: true } }
      }
    })

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    // Check if invoice has been submitted to CamInvoice
    if (!invoice.camInvoiceUuid) {
      return new NextResponse('Invoice not submitted to CamInvoice yet', { status: 400 })
    }

    try {
      // Get provider access token
      const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })

      // Download official PDF from CamInvoice
      const pdfBuffer = await CaminvoiceApi.downloadDocumentPdf({
        accessToken: tokenInfo.accessToken,
        documentId: invoice.camInvoiceUuid,
        baseUrl: tokenInfo.baseUrl
      })

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      })
    } catch (error: any) {
      console.error('Failed to download PDF from CamInvoice:', error)

      // Fallback to simple PDF if CamInvoice API fails
      const lines = [
        `Invoice: ${invoice.invoiceNumber}`,
        `Customer: ${invoice.customer?.name ?? 'Unknown'}`,
        `Status: Submitted to CamInvoice`,
        `Document ID: ${invoice.camInvoiceUuid}`,
        '',
        'Official PDF download failed.',
        'Please try again or contact support.'
      ]
      const pdf = simplePdf(lines)
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${invoice.invoiceNumber}-fallback.pdf"`
        }
      })
    }
  } catch (e) {
    console.error('PDF route error:', e)
    return new NextResponse('Server error', { status: 500 })
  }
}
