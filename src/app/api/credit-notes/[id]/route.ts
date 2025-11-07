import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  verifyAuthentication,
  AuthErrors,
  createErrorResponse,
} from '../../../../lib/tenant-middleware'
import { logAudit } from '../../../../lib/audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const { id } = await params
    const client = prisma as any
    const note = await client.creditNote.findUnique({
      where: { id },
      include: { 
        customer: true, 
        tenant: true, 
        lineItems: true,
      },
    })

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user.role !== 'PROVIDER' && user.tenantId !== note.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    // Manually fetch original invoice if exists
    let originalInvoice = null
    if (note.originalInvoiceId) {
      originalInvoice = await prisma.invoice.findUnique({
        where: { id: note.originalInvoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          camInvoiceUuid: true,
          issueDate: true,
          totalAmount: true,
          currency: true,
          status: true,
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      creditNote: {
        ...note,
        originalInvoice,
      }
    })
  } catch (error) {
    console.error('CreditNote GET by id error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json()
    const { creditNoteNumber, issueDate, currency, reason, notes, customerId, originalInvoiceId } = body || {}

    const existing = await prisma.creditNote.findUnique({ 
      where: { id }, 
      select: { tenantId: true, status: true } 
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user.role !== 'PROVIDER' && user.tenantId !== existing.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    // Only allow updates for DRAFT status
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'UPDATE_NOT_ALLOWED', message: 'Credit note can only be updated when in DRAFT status.' },
        { status: 409 }
      )
    }

    // Get line items to recalculate totals
    const lineItems = await prisma.creditNoteLineItem.findMany({ where: { creditNoteId: id } })
    const subtotal = lineItems.reduce((s, li) => s + Number(li.quantity || 0) * Number(li.unitPrice || 0), 0)
    const taxAmount = lineItems.reduce((s, li) => s + Number(li.quantity || 0) * Number(li.unitPrice || 0) * Number(li.taxRate || 0), 0)
    const totalAmount = subtotal + taxAmount

    const updated = await prisma.creditNote.update({
      where: { id },
      data: {
        creditNoteNumber: creditNoteNumber ?? undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        currency: currency ?? undefined,
        reason: reason ?? undefined,
        notes: notes ?? undefined,
        customerId: customerId ?? undefined,
        originalInvoiceId: originalInvoiceId || null,
        subtotal,
        taxAmount,
        totalAmount,
      },
    })

    await logAudit({
      userId: user.id,
      tenantId: updated.tenantId,
      action: 'UPDATE',
      entityType: 'CreditNote',
      entityId: updated.id,
      description: `Updated credit note ${updated.creditNoteNumber}`,
      request,
      metadata: { creditNoteId: updated.id },
    })

    return NextResponse.json({ success: true, id: updated.id })
  } catch (error) {
    console.error('CreditNote PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const client = prisma as any
    const note = await client.creditNote.findUnique({
      where: { id },
      select: { id: true, tenantId: true, status: true, camInvoiceUuid: true, camInvoiceStatus: true, creditNoteNumber: true },
    })
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user.role !== 'PROVIDER' && user.tenantId !== note.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    // Only allow deletion for notes that are still drafts and not submitted to CamInvoice
    const isDraft = String(note.status).toUpperCase() === 'DRAFT'
    const hasCamInvoiceSubmission = Boolean(note.camInvoiceUuid || note.camInvoiceStatus)
    if (!isDraft || hasCamInvoiceSubmission) {
      return NextResponse.json(
        { error: 'DELETE_NOT_ALLOWED', message: 'Credit note can only be deleted before submission.' },
        { status: 409 }
      )
    }

    await client.creditNote.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      tenantId: note.tenantId,
      action: 'DELETE',
      entityType: 'CreditNote',
      entityId: id,
      description: `Deleted credit note ${note.creditNoteNumber}`,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CreditNote DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

