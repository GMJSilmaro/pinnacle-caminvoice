import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../lib/tenant-middleware'
import { logAudit } from '../../../../lib/audit'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, tenant: true, lineItems: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = await verifyAuthentication(_request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }
    if (user.role !== 'PROVIDER' && user.tenantId !== invoice.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('Invoice detail GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json()
    const { invoiceNumber, issueDate, dueDate, currency, notes, customerId, lineItems } = body || {}

    const existing = await prisma.invoice.findUnique({ where: { id }, select: { tenantId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user.role !== 'PROVIDER' && user.tenantId !== existing.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    // Compute totals
    const subtotal = (lineItems || []).reduce((s: number, li: any) => s + Number(li.quantity || 0) * Number(li.unitPrice || 0), 0)
    const taxAmount = (lineItems || []).reduce((s: number, li: any) => s + Number(li.quantity || 0) * Number(li.unitPrice || 0) * Number(li.taxRate || 0) / 100, 0)
    const totalAmount = subtotal + taxAmount

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: invoiceNumber ?? undefined,
          issueDate: issueDate ? new Date(issueDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          currency: currency ?? undefined,
          notes: notes ?? undefined,
          customerId: customerId ?? undefined,
          subtotal, taxAmount, totalAmount,
        },
      })
      // Replace line items
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
      if (Array.isArray(lineItems) && lineItems.length) {
        await tx.invoiceLineItem.createMany({
          data: lineItems.map((li: any) => ({
            invoiceId: id,
            description: li.description,
            quantity: Number(li.quantity || 0),
            unitPrice: Number(li.unitPrice || 0),
            lineTotal: Number(li.quantity || 0) * Number(li.unitPrice || 0),
            taxRate: Number(li.taxRate || 0) / 100, // stored as decimal in schema
            taxAmount: Number(li.quantity || 0) * Number(li.unitPrice || 0) * Number(li.taxRate || 0) / 100,
          }))
        })
      }
      return inv
    })

    await logAudit({
      userId: user.id,
      tenantId: updated.tenantId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: updated.id,
      description: `Updated invoice ${updated.invoiceNumber}`,
      request,
      metadata: { invoiceId: updated.id },
    })

    return NextResponse.json({ success: true, id: updated.id })
  } catch (error) {
    console.error('Invoice PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

