import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: params.id }, include: { customer: true } })
    if (!invoice) return new NextResponse('Not found', { status: 404 })

    // Try to generate proper PDF with QR if deps are available
    try {
      const [{ PDFDocument, StandardFonts, rgb }, QR] = await Promise.all([
        import('pdf-lib') as any,
        import('qrcode') as any,
      ])
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595, 842])
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const { width, height } = page.getSize()
      const draw = (text: string, x: number, y: number, size = 12) => page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) })

      // Header
      draw(`Invoice ${invoice.invoiceNumber}`, 50, height - 60, 18)
      draw(`Customer: ${invoice.customer?.name ?? ''}`, 50, height - 90)
      draw(`Total: ${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}`, 50, height - 110)

      // QR from verification URL if present
      if (invoice.verificationUrl) {
        const dataUrl: string = await QR.toDataURL(invoice.verificationUrl, { margin: 1, scale: 6 })
        const pngBase64 = dataUrl.split(',')[1]
        const pngImage = await pdfDoc.embedPng(Buffer.from(pngBase64, 'base64'))
        const pngDims = pngImage.scale(0.5)
        page.drawImage(pngImage, { x: width - pngDims.width - 50, y: height - pngDims.height - 60, width: pngDims.width, height: pngDims.height })
        draw('Scan to verify', width - 160, height - 70)
      }

      const pdfBytes = await pdfDoc.save()
      return new NextResponse(pdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"` } })
    } catch (e) {
      // Fallback minimal PDF
      const lines = [
        `Invoice: ${invoice.invoiceNumber}`,
        `Customer: ${invoice.customer?.name ?? ''}`,
        `Total: ${invoice.currency} ${invoice.totalAmount}`,
        invoice.verificationUrl ? `Verify: ${invoice.verificationUrl}` : 'No verification link yet',
      ]
      const pdf = simplePdf(lines)
      return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"` } })
    }
  } catch (e) {
    return new NextResponse('Server error', { status: 500 })
  }
}
